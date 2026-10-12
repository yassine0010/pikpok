import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { config } from '@utils/config';

export async function registerPlugins(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false
  });

  await fastify.register(fastifyCors, {
    origin: config.nodeEnv === 'development' ? true : false,
    credentials: true
  });

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  await fastify.register(fastifyJwt as any, {
    secret: config.jwt.secret,
    sign: {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: config.jwt.expiresIn
    },
    verify: {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    }
  });

  fastify.decorate('config', config);
}

declare module 'fastify' {
  interface FastifyInstance {
    config: typeof config;
  }
}