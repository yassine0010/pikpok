/**
 * Vitest setup: point every test at the dedicated `pikpok_test` database and
 * make sure its migrations are applied before any test file imports the app.
 *
 * Env is set BEFORE the config module is loaded, and dotenv never overrides
 * existing process.env values, so the test database wins over apps/api/.env.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pikpok:pikpok@localhost:5432/pikpok_test';

const { pool } = await import('../src/db/pool.js');
const { runMigrations } = await import('../src/db/migrate.js');

await runMigrations(pool);

// Start each run from a clean users table so tests are order-independent.
await pool.query('DELETE FROM users');
