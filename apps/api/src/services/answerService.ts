import { FastifyInstance } from 'fastify';
import { prisma } from '@services/prisma';
import { config } from '@utils/config';
import { VerifierRegistry } from '@utils/verifiers';

interface AnswerInput {
  interactionId: string;
  puzzleId: string;
  contentVersion: number;
  submittedAnswer: string;
  elapsedTimeMs?: number;
  staticHintsUsed?: number;
}

interface AnswerResult {
  interactionId: string;
  puzzleId: string;
  result: 'correct' | 'incorrect';
  xpAwarded: number;
  currentStreak: number;
}

export class AnswerService {
  private fastify: FastifyInstance;
  private verifierRegistry: VerifierRegistry;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.verifierRegistry = new VerifierRegistry();
  }

  async submitAnswer(userId: string, input: AnswerInput): Promise<AnswerResult> {
    return await prisma.$transaction(async (tx) => {
      const existingAttempt = await tx.attempt.findUnique({
        where: { id: input.interactionId }
      });

      if (existingAttempt) {
        if (
          existingAttempt.userId === userId &&
          existingAttempt.puzzleId === input.puzzleId &&
          existingAttempt.contentVersionAtAttempt === input.contentVersion
        ) {
          return this.formatResponse(existingAttempt);
        }
        throw Object.assign(new Error('Idempotency conflict'), { code: 'IDEMPOTENCY_CONFLICT' });
      }

      const puzzle = await tx.puzzle.findUnique({
        where: { id: input.puzzleId },
        select: { id: true, contentVersion: true, type: true, content: true, verification: true, domain: true }
      });

      if (!puzzle) {
        throw Object.assign(new Error('Puzzle not found'), { code: 'PUZZLE_NOT_FOUND' });
      }

      if (puzzle.contentVersion !== input.contentVersion) {
        throw Object.assign(new Error('Content expired'), {
          code: 'PUZZLE_CONTENT_EXPIRED',
          currentContentVersion: puzzle.contentVersion
        });
      }

      let result: 'correct' | 'incorrect';
      try {
        result = this.verifierRegistry.verify(
          {
            id: puzzle.id,
            type: puzzle.type as any,
            contentVersion: puzzle.contentVersion,
            content: puzzle.content,
            verification: puzzle.verification
          },
          input.submittedAnswer
        ).result;
      } catch (error) {
        if ((error as Error).message === 'VERIFIER_NOT_CONFIGURED') {
          throw Object.assign(new Error('No verifier configured'), { code: 'VERIFIER_NOT_CONFIGURED' });
        }
        throw error;
      }

      const xpAwarded = result === 'correct' ? 10 : 0;

      const attempt = await tx.attempt.create({
        data: {
          id: input.interactionId,
          userId,
          puzzleId: input.puzzleId,
          contentVersionAtAttempt: input.contentVersion,
          result: result === 'correct' ? 'CORRECT' : 'INCORRECT',
          submittedAnswer: input.submittedAnswer,
          xpAwarded,
          elapsedTimeMs: input.elapsedTimeMs,
          staticHintsUsed: input.staticHintsUsed ?? 0
        }
      });

      const userStats = await tx.userStats.upsert({
        where: { userId },
        update: {
          totalAttempts: { increment: 1 },
          correctAttempts: { increment: result === 'correct' ? 1 : 0 },
          totalXp: { increment: xpAwarded }
        },
        create: {
          userId,
          totalAttempts: 1,
          correctAttempts: result === 'correct' ? 1 : 0,
          totalXp: xpAwarded
        }
      });

      let currentStreak = userStats.currentStreak;
      let longestStreak = userStats.longestStreak;
      let dailyCompletions = userStats.dailyCompletions;
      let lastStreakDate = userStats.lastStreakDate;

      if (result === 'correct') {
        const tz = config.app.timeZone;
        const now = new Date();
        const today = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        today.setHours(0, 0, 0, 0);

        const lastDate = lastStreakDate ? new Date(lastStreakDate.toLocaleString('en-US', { timeZone: tz })) : null;
        if (lastDate) {
          lastDate.setHours(0, 0, 0, 0);
        }

        if (!lastDate || lastDate < today) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          if (lastDate && lastDate.getTime() === yesterday.getTime()) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }

          dailyCompletions += 1;
          lastStreakDate = today;

          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }

          await tx.userStats.update({
            where: { userId },
            data: {
              currentStreak,
              longestStreak,
              dailyCompletions,
              lastStreakDate: today
            }
          });
        }
      }

      await tx.outboxEvent.create({
        data: {
          eventId: input.interactionId,
          aggregateType: 'attempt',
          aggregateId: input.puzzleId,
          eventType: 'difficulty.outcome',
          payload: {
            userId,
            puzzleId: input.puzzleId,
            contentVersion: input.contentVersion,
            domain: puzzle.domain,
            result,
            elapsedTimeMs: input.elapsedTimeMs,
            staticHintsUsed: input.staticHintsUsed,
            submittedAt: new Date().toISOString()
          },
          status: 'PENDING',
          availableAt: new Date()
        }
      });

      return {
        interactionId: input.interactionId,
        puzzleId: input.puzzleId,
        result,
        xpAwarded,
        currentStreak
      };
    });
  }

  private formatResponse(attempt: any): AnswerResult {
    return {
      interactionId: attempt.id,
      puzzleId: attempt.puzzleId,
      result: attempt.result === 'CORRECT' ? 'correct' : 'incorrect',
      xpAwarded: attempt.xpAwarded,
      currentStreak: 0
    };
  }
}