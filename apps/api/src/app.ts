import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import { ApiError } from './errors.js';
import { registerAuth } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { profileRoutes } from './routes/profile.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
  }
}

export interface BuildAppOptions {
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const logger =
    options.logger ?? (!config.isTest && config.nodeEnv !== 'test');

  const app = Fastify({
    logger: logger
      ? {
          level: config.logLevel,
          transport:
            config.nodeEnv === 'production' ? undefined : {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
            },
        }
      : false,
    trustProxy: true,
    bodyLimit: 64 * 1024,
  });

  // Security + platform plugins.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    global: true,
    max: config.isProd ? 300 : 10_000,
    timeWindow: '1 minute',
  });
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  // Consistent JSON errors: `{ error: { code, message, details? } }`.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      const body: ErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      };
      return reply.code(error.statusCode).send(body);
    }

    // Fastify errors (rate limit, body parser, jwt, ...) carry statusCode/message.
    const fastifyError = error as { statusCode?: number; message?: string };
    const status =
      typeof fastifyError.statusCode === 'number' &&
      fastifyError.statusCode >= 400 &&
      fastifyError.statusCode < 600
        ? fastifyError.statusCode
        : 500;

    if (status >= 500) {
      request.log.error(error, 'Unhandled request error');
    }

    const body: ErrorBody = {
      error: {
        code: statusToCode(status),
        // Never leak internals for 5xx.
        message: status >= 500 ? 'Internal server error' : fastifyError.message ?? 'Request failed',
      },
    };
    return reply.code(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ErrorBody = {
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
    };
    return reply.code(404).send(body);
  });

  // Global auth hook (public allowlist) — registered before the routes.
  registerAuth(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(profileRoutes);
  // Requires auth by default (not on the public allowlist).
  await app.register(leaderboardRoutes);

  await app.ready();
  return app;
}
