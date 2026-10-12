import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QueueService } from '@services/queueService';

const feedQuerySchema = z.object({
  size: z.coerce.number().int().min(1).max(10).default(5)
});

const skipSchema = z.object({
  interactionId: z.string().uuid(),
  puzzleId: z.string().min(1),
  contentVersion: z.number().int().positive()
});

export async function feedRoutes(fastify: FastifyInstance) {
  const queueService = new QueueService(fastify);

  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: { size: { type: 'integer', minimum: 1, maximum: 10, default: 5 } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            puzzles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  contentVersion: { type: 'integer' },
                  type: { type: 'string' },
                  domain: { type: 'string' },
                  difficultyRating: { type: 'number' },
                  content: { type: 'object' },
                  staticHints: { type: 'array' }
                }
              }
            },
            nextBatchRequiredAt: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { size } = feedQuerySchema.parse(request.query);
    const userId = (request as any).userId;

    const batch = await queueService.getNextBatch(userId, size);
    return reply.send(batch);
  });

  fastify.post('/skip', {
    schema: {
      body: {
        type: 'object',
        required: ['interactionId', 'puzzleId', 'contentVersion'],
        properties: {
          interactionId: { type: 'string', format: 'uuid' },
          puzzleId: { type: 'string' },
          contentVersion: { type: 'integer', minimum: 1 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            interactionId: { type: 'string' },
            puzzleId: { type: 'string' },
            result: { type: 'string', enum: ['skipped'] },
            xpAwarded: { type: 'integer', const: 0 }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = skipSchema.parse(request.body);
    const userId = (request as any).userId;

    const result = await queueService.skipPuzzle(userId, data);
    return reply.send(result);
  });
}