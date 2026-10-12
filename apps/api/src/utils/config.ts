import 'dotenv/config';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 3000),
  host: process.env.API_HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'info',

  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://pikpok:pikpok@localhost:5432/pikpok'
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379'
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    issuer: 'pikpok-local',
    audience: 'pikpok-client'
  },

  app: {
    timeZone: process.env.APP_TIME_ZONE ?? 'UTC',
    recentPuzzleWindow: Number(process.env.RECENT_PUZZLE_WINDOW ?? 100),
    queueReservationTtlSeconds: Number(process.env.QUEUE_RESERVATION_TTL_SECONDS ?? 600)
  },

  rotation: {
    enabled: process.env.ROTATION_ENABLED === 'true',
    intervalMinutes: Number(process.env.ROTATION_INTERVAL_MINUTES ?? 60)
  },

  archive: {
    path: process.env.ARCHIVE_PATH ?? './.local/archive'
  }
} as const;

export type Config = typeof config;