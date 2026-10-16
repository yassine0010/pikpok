import { buildApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

async function main(): Promise<void> {
  const app = await buildApp();

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      await pool.end();
      app.log.info('Shutdown complete.');
      process.exit(0);
    } catch (error) {
      app.log.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    app.log.error(reason, 'Unhandled promise rejection');
  });

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`PikPok API listening on http://${config.host}:${config.port}`);
}

main().catch((error: unknown) => {
  console.error('Failed to start PikPok API:', error);
  process.exit(1);
});
