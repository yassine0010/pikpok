import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Pool } from 'pg';
import { pool } from './pool.js';

const SQL_DIR = fileURLToPath(new URL('../../sql', import.meta.url));

/**
 * Tiny migration runner: applies every `sql/*.sql` file that has not been
 * recorded in the `migrations` table yet, each inside its own transaction.
 * No ORM — plain SQL files only.
 */
export async function runMigrations(targetPool: Pool = pool): Promise<string[]> {
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(SQL_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied: string[] = [];

  for (const file of files) {
    const client = await targetPool.connect();
    try {
      await client.query('BEGIN');
      // INSERT first: if it conflicts, the migration already ran. Recording
      // before executing means a failed file rolls back its own record too.
      const { rowCount } = await client.query(
        'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [file],
      );
      if (rowCount === 1) {
        const sql = await readFile(path.join(SQL_DIR, file), 'utf8');
        await client.query(sql);
        applied.push(file);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
    } finally {
      client.release();
    }
  }

  return applied;
}

const isCli =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  runMigrations()
    .then((applied) => {
      if (applied.length === 0) {
        console.log('Migrations: nothing to apply, database is up to date.');
      } else {
        console.log(`Migrations applied: ${applied.join(', ')}`);
      }
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
