import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AnswerService } from '@services/answerService';

const answerSchema = z.object({
  interactionId: z.string().uuid(),
  puzzleId: z.string().min(1),
  contentVersion: z.number().int().positive(),
  submittedAnswer: z.string().min(1).max(200),
  elapsedTimeMs: z.number().int().nonnegative().optional(),
  staticHintsUsed: z.number().int().min(0).max(3).optional()
});

export async function answerRoutes(fastify: FastifyInstance) {
  const answerService = new AnswerService(fastify);

  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['interactionId', 'puzzleId', 'contentVersion', 'submittedAnswer'],
        properties: {
          interactionId: { type: 'string', format: 'uuid' },
          puzzleId: { type: 'string' },
          contentVersion: { type: 'integer', minimum: 1 },
          submittedAnswer: { type: 'string', minLength: 1, maxLength: 200 },
          elapsedTimeMs: { type: 'integer', minimum: 0 },
          staticHintsUsed: { type: 'integer', minimum: 0, maximum: 3 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            interactionId: { type: 'string' },
            puzzleId: { type: 'string' },
            result: { type: 'string', enum: ['correct', 'incorrect'] },
            xpAwarded: { type: 'integer' },
            currentStreak: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = answerSchema.parse(request.body);
    const userId = (request as any).userId;

    const result = await answerService.submitAnswer(userId, data);
    return reply.send(result);
  });
}