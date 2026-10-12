import { FastifyInstance } from 'fastify';
import { StatsService } from '@services/statsService';

export async function statsRoutes(fastify: FastifyInstance) {
  const statsService = new StatsService(fastify);

  fastify.get('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            totalAttempts: { type: 'integer' },
            correctAttempts: { type: 'integer' },
            accuracyPercent: { type: 'number' },
            totalXp: { type: 'integer' },
            currentStreak: { type: 'integer' },
            longestStreak: { type: 'integer' },
            dailyCompletions: { type: 'integer' },
            hintsUsed: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const stats = await statsService.getStats(userId);
    return reply.send(stats);
  });
}