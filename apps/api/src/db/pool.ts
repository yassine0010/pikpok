import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

/** Singleton connection pool, shared by every route. */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (error) => {
  // Never let a background pool error crash the process silently.
  console.error('Unexpected idle client error in pg pool:', error);
});
