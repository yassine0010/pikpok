import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@utils/config';

const PUBLIC_ROUTES = [
  { method: 'GET', url: '/health' },
  { method: 'POST', url: '/auth/signup' },
  { method: 'POST', url: '/auth/login' }
];

function isPublicRoute(method: string, url: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && (route.url === url || url.startsWith(route.url + '/'))
  );
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (isPublicRoute(request.method, request.url)) {
    return;
  }

  try {
    await request.jwtVerify();
    const userId = request.user?.sub;

    if (!userId) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload'
        }
      });
    }

    (request as any).userId = userId;
  } catch (err) {
    request.log.warn({ err }, 'JWT verification failed');
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing, invalid, or expired token'
      }
    });
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}