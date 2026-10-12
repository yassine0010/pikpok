import { FastifyInstance } from 'fastify';
import { prisma } from '@services/prisma';
import Redis from 'ioredis';
import { config } from '@utils/config';
import { v4 as uuidv4 } from 'uuid';

interface FeedPuzzle {
  id: string;
  contentVersion: number;
  type: string;
  domain: string;
  difficultyRating: number;
  content: any;
  staticHints: any[];
}

interface FeedBatch {
  puzzles: FeedPuzzle[];
  nextBatchRequiredAt: number;
}

interface SkipResult {
  interactionId: string;
  puzzleId: string;
  result: 'skipped';
  xpAwarded: 0;
}

interface DifficultyCandidate {
  puzzleId: string;
  contentVersion: number;
  difficultyRating: number;
  domain: string;
  audienceCategories: string[];
}

interface DifficultySelectionRequest {
  userId: string;
  audienceCategory: 'CHILDREN' | 'TEENS';
  batchSize: number;
  candidates: DifficultyCandidate[];
  recentPuzzleIds: string[];
  recentAttemptOutcomes: Array<{
    puzzleId: string;
    result: 'correct' | 'incorrect' | 'skipped';
    occurredAt: string;
  }>;
  catalogGeneration: number;
}

interface DifficultySelectionResponse {
  selectionId: string;
  userId: string;
  orderedPuzzleIds: string[];
  selectionGeneration?: string;
  expiresAt?: string;
}

export class QueueService {
  private redis: Redis;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true
    });
    this.redis.on('error', (err) => fastify.log.error({ err }, 'Redis connection error'));
  }

  async connect() {
    if (this.redis.status === 'wait') {
      await this.redis.connect();
    }
  }

  async getNextBatch(userId: string, size: number): Promise<FeedBatch> {
    await this.connect();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { audienceCategory: true } });
    if (!user) throw new Error('User not found');

    const readyKey = `queue:${userId}:ready`;
    const metaKey = `queue:${userId}:meta`;
    const recentKey = `recent:${userId}`;

    const queueMeta = await this.redis.hgetall(metaKey);
    const catalogState = await prisma.catalogState.findUnique({ where: { id: 'catalog' } });
    const currentGeneration = catalogState?.catalogGeneration ?? 1;

    if (queueMeta.catalogGeneration !== String(currentGeneration)) {
      await this.refreshQueueGeneration(userId, currentGeneration);
    }

    const readyCount = await this.redis.llen(readyKey);
    if (readyCount < size) {
      await this.refillQueue(userId, user.audienceCategory, size);
    }

    const requestId = uuidv4();
    const processingKey = `queue:${userId}:processing:${requestId}`;

    const reserved = await this.redis.eval(
      RESERVE_SCRIPT,
      2,
      readyKey,
      processingKey,
      size,
      config.app.queueReservationTtlSeconds
    ) as string[];

    if (reserved.length === 0) {
      await this.refillQueue(userId, user.audienceCategory, size);
      const retryReserved = await this.redis.eval(
        RESERVE_SCRIPT,
        2,
        readyKey,
        processingKey,
        size,
        config.app.queueReservationTtlSeconds
      ) as string[];
      if (retryReserved.length === 0) {
        return { puzzles: [], nextBatchRequiredAt: 2 };
      }
      return this.loadPuzzlesAndCleanup(userId, retryReserved, processingKey, recentKey, size);
    }

    return this.loadPuzzlesAndCleanup(userId, reserved, processingKey, recentKey, size);
  }

  private async loadPuzzlesAndCleanup(
    userId: string,
    reserved: string[],
    processingKey: string,
    recentKey: string,
    size: number
  ): Promise<FeedBatch> {
    const puzzles = await prisma.puzzle.findMany({
      where: { id: { in: reserved } },
      select: {
        id: true,
        contentVersion: true,
        type: true,
        domain: true,
        difficultyRating: true,
        content: true,
        staticHints: true
      }
    });

    const foundIds = new Set(puzzles.map(p => p.id));
    const missingIds = reserved.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      await this.redis.lrem(processingKey, 0, ...missingIds);
    }

    const orderedPuzzles = reserved
      .filter(id => foundIds.has(id))
      .map(id => puzzles.find(p => p.id === id)!)
      .filter(Boolean);

    await this.redis.del(processingKey);
    await this.redis.zadd(recentKey, ...orderedPuzzles.flatMap((p, i) => [Date.now() + i, p.id]));
    await this.redis.zremrangebyrank(recentKey, 0, -(config.app.recentPuzzleWindow + 1));

    return {
      puzzles: orderedPuzzles,
      nextBatchRequiredAt: Math.max(2, size - orderedPuzzles.length)
    };
  }

  private async refillQueue(userId: string, audienceCategory: 'CHILDREN' | 'TEENS', size: number) {
    const readyKey = `queue:${userId}:ready`;
    const recentKey = `recent:${userId}`;

    const categoryMaxAge = audienceCategory === 'CHILDREN' ? 12 : 17;
    const categoryMinAge = audienceCategory === 'CHILDREN' ? 0 : 13;

    const recentIds = await this.redis.zrange(recentKey, 0, -1);
    const recentIdSet = new Set(recentIds);

    const candidates = await prisma.puzzle.findMany({
      where: {
        audienceCategories: { has: audienceCategory },
        ageFloor: { lte: categoryMaxAge },
        ageCeiling: { gte: categoryMinAge },
        id: { notIn: Array.from(recentIdSet) }
      },
      take: size * 3,
      select: {
        id: true,
        contentVersion: true,
        type: true,
        domain: true,
        difficultyRating: true,
        audienceCategories: true
      }
    });

    if (candidates.length === 0) {
      const fallbackCandidates = await prisma.puzzle.findMany({
        where: {
          audienceCategories: { has: audienceCategory },
          ageFloor: { lte: categoryMaxAge },
          ageCeiling: { gte: categoryMinAge }
        },
        take: size,
        select: {
          id: true,
          contentVersion: true,
          type: true,
          domain: true,
          difficultyRating: true,
          audienceCategories: true
        }
      });
      await this.redis.rpush(readyKey, ...fallbackCandidates.map(c => c.id));
      return;
    }

    let orderedIds: string[];

    try {
      const difficultyRequest: DifficultySelectionRequest = {
        userId,
        audienceCategory,
        batchSize: size,
        candidates: candidates.map(c => ({
          puzzleId: c.id,
          contentVersion: c.contentVersion,
          difficultyRating: c.difficultyRating,
          domain: c.domain,
          audienceCategories: c.audienceCategories
        })),
        recentPuzzleIds: recentIds.slice(-config.app.recentPuzzleWindow),
        recentAttemptOutcomes: [],
        catalogGeneration: (await prisma.catalogState.findUnique({ where: { id: 'catalog' } }))?.catalogGeneration ?? 1
      };

      const response = await this.callDifficultyAdapter(difficultyRequest);
      orderedIds = response.orderedPuzzleIds;
    } catch (error) {
      this.fastify.log.warn({ err: error }, 'Difficulty adapter failed, using fallback');
      orderedIds = candidates.slice(0, size).map(c => c.id);
    }

    await this.redis.rpush(readyKey, ...orderedIds);
  }

  private async callDifficultyAdapter(request: DifficultySelectionRequest): Promise<DifficultySelectionResponse> {
    return {
      selectionId: uuidv4(),
      userId: request.userId,
      orderedPuzzleIds: request.candidates.slice(0, request.batchSize).map(c => c.puzzleId)
    };
  }

  private async refreshQueueGeneration(userId: string, catalogGeneration: number) {
    const readyKey = `queue:${userId}:ready`;
    const metaKey = `queue:${userId}:meta`;
    const recentKey = `recent:${userId}`;

    const currentIds = await this.redis.lrange(readyKey, 0, -1);
    const recentIds = await this.redis.zrange(recentKey, 0, -1);
    const recentSet = new Set(recentIds);

    const validIds = currentIds.filter(id => !recentSet.has(id));

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { audienceCategory: true } });
    if (user) {
      const categoryMaxAge = user.audienceCategory === 'CHILDREN' ? 12 : 17;
      const categoryMinAge = user.audienceCategory === 'CHILDREN' ? 0 : 13;

      const candidates = await prisma.puzzle.findMany({
        where: {
          id: { in: validIds },
          audienceCategories: { has: user.audienceCategory },
          ageFloor: { lte: categoryMaxAge },
          ageCeiling: { gte: categoryMinAge }
        },
        select: { id: true }
      });

      const eligibleIds = new Set(candidates.map(c => c.id));
      const finalIds = validIds.filter(id => eligibleIds.has(id));

      await this.redis.del(readyKey);
      if (finalIds.length > 0) {
        await this.redis.rpush(readyKey, ...finalIds);
      }
    }

    await this.redis.hset(metaKey, 'catalogGeneration', String(catalogGeneration));
  }

  async skipPuzzle(userId: string, data: { interactionId: string; puzzleId: string; contentVersion: number }): Promise<SkipResult> {
    await this.connect();

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: data.puzzleId },
      select: { contentVersion: true }
    });

    if (!puzzle) {
      throw new Error('PUZZLE_NOT_FOUND');
    }

    if (puzzle.contentVersion !== data.contentVersion) {
      throw Object.assign(new Error('Content expired'), {
        code: 'PUZZLE_CONTENT_EXPIRED',
        currentContentVersion: puzzle.contentVersion
      });
    }

    await prisma.attempt.create({
      data: {
        id: data.interactionId,
        userId,
        puzzleId: data.puzzleId,
        contentVersionAtAttempt: data.contentVersion,
        result: 'SKIPPED',
        xpAwarded: 0
      }
    });

    return {
      interactionId: data.interactionId,
      puzzleId: data.puzzleId,
      result: 'skipped',
      xpAwarded: 0
    };
  }
}

const RESERVE_SCRIPT = `
local readyKey = KEYS[1]
local processingKey = KEYS[2]
local requested = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local reserved = {}

for i = 1, requested do
  local puzzleId = redis.call('LPOP', readyKey)
  if not puzzleId then break end
  table.insert(reserved, puzzleId)
end

if #reserved > 0 then
  redis.call('RPUSH', processingKey, unpack(reserved))
  redis.call('EXPIRE', processingKey, ttl)
end

return reserved
`;