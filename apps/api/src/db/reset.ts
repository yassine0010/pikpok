import { pool } from './pool.js';
import { runMigrations } from './migrate.js';

/**
 * Drops and recreates the `public` schema on the configured database, then
 * re-applies all migrations. Destructive — use on dev/test databases only.
 */
async function main(): Promise<void> {
  console.log('Resetting schema on the configured database...');
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.query('GRANT ALL ON SCHEMA public TO PUBLIC');
  const applied = await runMigrations(pool);
  console.log(applied.length > 0 ? `Applied: ${applied.join(', ')}` : 'No migrations found.');
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
