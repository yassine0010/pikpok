import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { feedRoutes } from './feed';
import { answerRoutes } from './answer';
import { hintRoutes } from './hints';
import { statsRoutes } from './stats';
import { leaderboardRoutes } from './leaderboard';
import { profileRoutes } from './profile';

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({ status: 'ok' }));

  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(feedRoutes, { prefix: '/feed' });
  await fastify.register(answerRoutes, { prefix: '/answer' });
  await fastify.register(hintRoutes, { prefix: '/hints' });
  await fastify.register(statsRoutes, { prefix: '/stats' });
  await fastify.register(leaderboardRoutes, { prefix: '/leaderboard' });
  await fastify.register(profileRoutes, { prefix: '/profile' });
}