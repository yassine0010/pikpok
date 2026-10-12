import { FastifyInstance } from 'fastify';
import { prisma } from '@services/prisma';

interface UserStats {
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercent: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  dailyCompletions: number;
  hintsUsed: number;
}

export class StatsService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getStats(userId: string): Promise<UserStats> {
    const stats = await prisma.userStats.findUnique({ where: { userId } });

    if (!stats) {
      return {
        totalAttempts: 0,
        correctAttempts: 0,
        accuracyPercent: 0,
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        dailyCompletions: 0,
        hintsUsed: 0
      };
    }

    const accuracyPercent = stats.totalAttempts > 0
      ? Math.round((stats.correctAttempts / stats.totalAttempts) * 10000) / 100
      : 0;

    return {
      totalAttempts: stats.totalAttempts,
      correctAttempts: stats.correctAttempts,
      accuracyPercent,
      totalXp: stats.totalXp,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      dailyCompletions: stats.dailyCompletions,
      hintsUsed: stats.hintsUsed
    };
  }
}