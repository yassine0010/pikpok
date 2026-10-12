import Fastify from 'fastify';
import { pathToFileURL } from 'node:url';
import { config } from '@utils/config';
import { registerPlugins } from '@utils/plugins';
import { registerRoutes } from '@routes/index';
import { errorHandler } from '@middleware/errorHandler';
import { authMiddleware } from '@middleware/auth';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss Z' }
      } : undefined
    },
    ajv: {
      customOptions: {
        strict: true,
        allErrors: true,
        removeAdditional: 'all'
      }
    }
  });

  fastify.setErrorHandler(errorHandler);
  fastify.addHook('onRequest', authMiddleware);

  await registerPlugins(fastify);
  await registerRoutes(fastify);

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: config.port, host: config.host });
    server.log.info(`Server listening on ${config.host}:${config.port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}

export { buildServer, start };