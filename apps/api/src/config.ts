import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load apps/api/.env (works from src/ under tsx and from dist/ after build),
// then fall back to .env in the current working directory. Existing
// process.env values always win, so tests can override DATABASE_URL.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
dotenv.config();

function str(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function int(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  }
  return parsed;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

/**
 * Package root (apps/api): src/ under tsx, dist/ after build — same trick the
 * dotenv block uses with `new URL('../.env', ...)`.
 */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Filesystem paths from env, falling back to package-relative defaults
 * (`../../final_puzzles` and `./public/puzzles` relative to apps/api).
 */
function resolvablePath(key: string, fallbackRelative: string): string {
  const raw = process.env[key];
  const value = raw !== undefined && raw !== '' ? raw : fallbackRelative;
  return path.isAbsolute(value) ? value : path.resolve(packageRoot, value);
}

export const config = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: int('API_PORT', 3000),
  host: str('API_HOST', '0.0.0.0'),
  databaseUrl: str('DATABASE_URL'),
  jwtSecret: str('JWT_SECRET'),
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),
  logLevel: str('LOG_LEVEL', 'info'),
  // M5 puzzle feed: JSON question bank source and the static image dir
  // @fastify/static serves at /puzzles/images/.
  puzzlesSourceDir: resolvablePath('PUZZLES_SOURCE_DIR', '../../final_puzzles'),
  puzzlesPublicDir: resolvablePath('PUZZLES_PUBLIC_DIR', './public/puzzles'),
} as const;

export type Config = typeof config;
