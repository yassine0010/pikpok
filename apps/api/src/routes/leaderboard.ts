import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LeaderboardService } from '@services/leaderboardService';

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export async function leaderboardRoutes(fastify: FastifyInstance) {
  const leaderboardService = new LeaderboardService(fastify);

  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rank: { type: 'integer' },
                  displayName: { type: 'string' },
                  totalXp: { type: 'integer' },
                  currentStreak: { type: 'integer' }
                }
              }
            },
            currentUser: {
              type: 'object',
              properties: {
                rank: { type: 'integer' },
                displayName: { type: 'string' },
                totalXp: { type: 'integer' },
                currentStreak: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { limit } = leaderboardQuerySchema.parse(request.query);
    const userId = (request as any).userId;

    const result = await leaderboardService.getLeaderboard(limit, userId);
    return reply.send(result);
  });
}