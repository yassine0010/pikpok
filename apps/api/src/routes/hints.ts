import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HintService } from '@services/hintService';

const hintQuerySchema = z.object({
  contentVersion: z.coerce.number().int().positive(),
  tier: z.coerce.number().int().min(1).max(3)
});

export async function hintRoutes(fastify: FastifyInstance) {
  const hintService = new HintService(fastify);

  fastify.get('/:puzzleId', {
    schema: {
      params: {
        type: 'object',
        required: ['puzzleId'],
        properties: { puzzleId: { type: 'string' } }
      },
      querystring: {
        type: 'object',
        required: ['contentVersion', 'tier'],
        properties: {
          contentVersion: { type: 'integer', minimum: 1 },
          tier: { type: 'integer', minimum: 1, maximum: 3 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            puzzleId: { type: 'string' },
            contentVersion: { type: 'integer' },
            hint: {
              type: 'object',
              properties: {
                tier: { type: 'integer' },
                type: { type: 'string' },
                content: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { puzzleId } = request.params as { puzzleId: string };
    const query = hintQuerySchema.parse(request.query);
    const userId = (request as any).userId;

    const result = await hintService.getHint(userId, puzzleId, query.contentVersion, query.tier as 1 | 2 | 3);
    return reply.send(result);
  });
}