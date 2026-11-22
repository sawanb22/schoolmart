import dns from 'dns';
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

import { Server } from 'http';
import app from './app';
import prisma from './lib/prisma';
import { logger } from './lib/logger';
import { solutionsIndexService, stopSolutionsIndexer } from './services/solutions-finder';
import { bootstrapPages } from './services/bootstrap-pages';
import { cancelPendingSitemapSync } from './services/sitemap.service';

const PORT = process.env.PORT || 3001;

let isShuttingDown = false;

export interface ShutdownOptions {
  exit?: boolean;
  timeoutMs?: number;
}

/**
 * Gracefully shuts down the HTTP server, stops background timers,
 * cancels pending debounced writes, and disconnects the database client.
 * Enforces idempotency and a 10s force-exit timeout.
 */
export async function shutdown(server?: Server, options: ShutdownOptions = {}): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring duplicate signal.');
    return;
  }
  isShuttingDown = true;
  logger.info('Initiating graceful shutdown...');

  const timeoutMs = options.timeoutMs ?? 10000;
  let forceTimer: NodeJS.Timeout | null = null;
  if (options.exit !== false) {
    forceTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded (10s), forcing process termination.');
      process.exit(1);
    }, timeoutMs);
    if (forceTimer.unref) forceTimer.unref();
  }

  try {
    // 1. Stop accepting new HTTP connections
    if (server && server.listening) {
      await new Promise<void>((resolve) => {
        server.close((err) => {
          if (err) logger.error({ err }, 'Error closing HTTP server');
          resolve();
        });
      });
      logger.info('HTTP server closed.');
    }

    // 2. Stop solutions indexer background timer
    stopSolutionsIndexer();
    logger.info('Solutions indexer timers stopped.');

    // 3. Cancel pending sitemap sync
    cancelPendingSitemapSync();
    logger.info('Pending sitemap timers cancelled.');

    // 4. Disconnect Prisma
    await prisma.$disconnect();
    logger.info('Prisma client disconnected cleanly.');
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown sequence');
  } finally {
    if (forceTimer) clearTimeout(forceTimer);
    if (options.exit !== false) {
      process.exit(0);
    }
  }
}

/**
 * Configures process signal traps (SIGTERM, SIGINT) for graceful shutdown.
 */
export function setupGracefulShutdown(server: Server): void {
  const handler = (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown.`);
    shutdown(server).catch((err) => {
      logger.error({ err }, 'Unhandled error in graceful shutdown');
      process.exit(1);
    });
  };

  process.once('SIGTERM', () => handler('SIGTERM'));
  process.once('SIGINT', () => handler('SIGINT'));
}

export async function startServer(): Promise<Server> {
  try {
    const result = await bootstrapPages();
    logger.info(`✓ Bootstrapped pages: ${result.created.length} created, ${result.updated.length} updated`);
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap pages on boot');
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`SchoolMart Backend running on port ${PORT}`);
    solutionsIndexService.rebuild().then(() => {
      solutionsIndexService.startNightlySync(3, 0);
      logger.info(`✓ Solutions Index initialized (${solutionsIndexService.getCards().length} cards, v:${solutionsIndexService.getVersion()})`);
    }).catch((err: any) => {
      logger.error({ err }, 'Failed to initialize solutions index on boot');
    });
  });

  setupGracefulShutdown(server);
  return server;
}

// Reset shutdown state helper for testing
export function _resetShutdownStateForTesting(): void {
  isShuttingDown = false;
}

// Check if run directly or as the application entrypoint
const isMain =
  Boolean(require.main) &&
  (require.main === module ||
    require.main?.filename?.endsWith('server.js') ||
    require.main?.filename?.endsWith('server.ts') ||
    require.main?.filename?.endsWith('index.js') ||
    require.main?.filename?.endsWith('index.ts'));

if (isMain) {
  startServer();
}

export default startServer;
