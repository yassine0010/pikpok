import { FastifyInstance } from 'fastify';
import { prisma } from '@services/prisma';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalXp: number;
  currentStreak: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUser?: LeaderboardEntry;
}

export class LeaderboardService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getLeaderboard(limit: number, currentUserId: string): Promise<LeaderboardResponse> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        stats: { select: { totalXp: true, currentStreak: true } }
      },
      orderBy: { stats: { totalXp: 'desc' } },
      take: limit
    });

    const entries: LeaderboardEntry[] = users.map((user, index) => ({
      rank: index + 1,
      displayName: user.displayName,
      totalXp: user.stats?.totalXp ?? 0,
      currentStreak: user.stats?.currentStreak ?? 0
    }));

    let currentUser: LeaderboardEntry | undefined;
    const currentUserIndex = users.findIndex(u => u.id === currentUserId);
    if (currentUserIndex >= 0) {
      currentUser = entries[currentUserIndex];
    } else if (users.length > 0) {
      const currentUserData = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { displayName: true, stats: { select: { totalXp: true, currentStreak: true } } }
      });
      if (currentUserData) {
        const rank = await prisma.user.count({
          where: { stats: { totalXp: { gt: currentUserData.stats?.totalXp ?? 0 } } }
        }) + 1;
        currentUser = {
          rank,
          displayName: currentUserData.displayName,
          totalXp: currentUserData.stats?.totalXp ?? 0,
          currentStreak: currentUserData.stats?.currentStreak ?? 0
        };
      }
    }

    return { entries, currentUser };
  }
}