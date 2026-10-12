import { FastifyInstance } from 'fastify';
import { prisma } from '@services/prisma';

interface HintResult {
  puzzleId: string;
  contentVersion: number;
  hint: { tier: number; type: string; content: string };
}

export class HintService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getHint(userId: string, puzzleId: string, contentVersion: number, tier: 1 | 2 | 3): Promise<HintResult> {
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { contentVersion: true, staticHints: true }
    });

    if (!puzzle) {
      throw Object.assign(new Error('Puzzle not found'), { code: 'PUZZLE_NOT_FOUND' });
    }

    if (puzzle.contentVersion !== contentVersion) {
      throw Object.assign(new Error('Content expired'), {
        code: 'PUZZLE_CONTENT_EXPIRED',
        currentContentVersion: puzzle.contentVersion
      });
    }

    const hints = puzzle.staticHints as Array<{ tier: number; type: string; content: string }>;
    const hint = hints.find(h => h.tier === tier);

    if (!hint) {
      throw Object.assign(new Error('Hint tier not found'), { code: 'SCOPE_NOT_FOUND' });
    }

    await prisma.hintUsage.create({
      data: {
        userId,
        puzzleId,
        contentVersion,
        hintTier: tier,
        hintType: hint.type
      }
    });

    await prisma.userStats.update({
      where: { userId },
      data: { hintsUsed: { increment: 1 } }
    });

    return {
      puzzleId,
      contentVersion,
      hint
    };
  }
}