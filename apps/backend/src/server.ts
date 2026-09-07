import { app } from './app';
import { env } from './config/env';
import { disconnectDatabase } from './db/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`Nona backend listening on port ${env.PORT} (${env.DATABASE_MODE} database)`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
