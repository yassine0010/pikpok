import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProfileService } from '@services/profileService';

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(30)
});

export async function profileRoutes(fastify: FastifyInstance) {
  const profileService = new ProfileService(fastify);

  fastify.get('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            displayName: { type: 'string' },
            audienceCategory: { type: 'string', enum: ['CHILDREN', 'TEENS'] },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const profile = await profileService.getProfile(userId);
    return reply.send(profile);
  });

  fastify.patch('/', {
    schema: {
      body: {
        type: 'object',
        required: ['displayName'],
        properties: { displayName: { type: 'string', minLength: 2, maxLength: 30 } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            displayName: { type: 'string' },
            audienceCategory: { type: 'string' },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = updateProfileSchema.parse(request.body);
    const userId = (request as any).userId;

    const profile = await profileService.updateProfile(userId, data.displayName);
    return reply.send(profile);
  });
}