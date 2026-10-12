import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('ioredis', () => {
  const mRedis = {
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    status: 'ready',
    eval: vi.fn().mockResolvedValue([]),
    llen: vi.fn().mockResolvedValue(0),
    lrange: vi.fn().mockResolvedValue([]),
    rpush: vi.fn().mockResolvedValue(0),
    del: vi.fn().mockResolvedValue(0),
    lrem: vi.fn().mockResolvedValue(0),
    zadd: vi.fn().mockResolvedValue(0),
    zremrangebyrank: vi.fn().mockResolvedValue(0),
    zrange: vi.fn().mockResolvedValue([]),
    hgetall: vi.fn().mockResolvedValue({}),
    hset: vi.fn().mockResolvedValue(0)
  };
  return { default: vi.fn(() => mRedis) };
});

vi.mock('@prisma/client', () => {
  const mPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    puzzle: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    attempt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn()
    },
    userStats: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    hintUsage: { create: vi.fn() },
    outboxEvent: { create: vi.fn() },
    catalogState: { findUnique: vi.fn() },
    $transaction: vi.fn((fn) => fn(mPrisma))
  };
  return { PrismaClient: vi.fn(() => mPrisma) };
});

beforeAll(() => {});

afterAll(() => {});

beforeEach(() => {
  vi.clearAllMocks();
});