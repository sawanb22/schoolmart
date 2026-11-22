import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from 'http';
import { shutdown, _resetShutdownStateForTesting } from '../../src/server';
import prisma from '../../src/lib/prisma';
import * as solutionsModule from '../../src/services/solutions-finder';
import * as sitemapModule from '../../src/services/sitemap.service';

describe('Graceful Shutdown (T17)', () => {
  beforeEach(() => {
    _resetShutdownStateForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    _resetShutdownStateForTesting();
    vi.restoreAllMocks();
  });

  it('executes graceful shutdown sequence: closes server, stops timers, disconnects Prisma', async () => {
    const executionOrder: string[] = [];

    const mockServer = {
      listening: true,
      close: vi.fn((cb?: (err?: Error) => void) => {
        executionOrder.push('server.close');
        if (cb) cb();
        return mockServer;
      }),
    } as unknown as Server;

    const stopIndexerSpy = vi.spyOn(solutionsModule, 'stopSolutionsIndexer').mockImplementation(() => {
      executionOrder.push('stopSolutionsIndexer');
    });

    const cancelSitemapSpy = vi.spyOn(sitemapModule, 'cancelPendingSitemapSync').mockImplementation(() => {
      executionOrder.push('cancelPendingSitemapSync');
    });

    const prismaDisconnectSpy = vi.spyOn(prisma, '$disconnect').mockImplementation(async () => {
      executionOrder.push('prisma.$disconnect');
    });

    await shutdown(mockServer, { exit: false });

    expect(mockServer.close).toHaveBeenCalledTimes(1);
    expect(stopIndexerSpy).toHaveBeenCalledTimes(1);
    expect(cancelSitemapSpy).toHaveBeenCalledTimes(1);
    expect(prismaDisconnectSpy).toHaveBeenCalledTimes(1);

    expect(executionOrder).toEqual([
      'server.close',
      'stopSolutionsIndexer',
      'cancelPendingSitemapSync',
      'prisma.$disconnect',
    ]);
  });

  it('enforces idempotency: repeated shutdown invocations do not duplicate cleanup', async () => {
    const mockServer = {
      listening: true,
      close: vi.fn((cb?: (err?: Error) => void) => {
        if (cb) cb();
        return mockServer;
      }),
    } as unknown as Server;

    vi.spyOn(solutionsModule, 'stopSolutionsIndexer').mockImplementation(() => {});
    vi.spyOn(sitemapModule, 'cancelPendingSitemapSync').mockImplementation(() => {});
    const prismaDisconnectSpy = vi.spyOn(prisma, '$disconnect').mockImplementation(async () => {});

    // First call
    await shutdown(mockServer, { exit: false });
    // Duplicate second call
    await shutdown(mockServer, { exit: false });

    expect(mockServer.close).toHaveBeenCalledTimes(1);
    expect(prismaDisconnectSpy).toHaveBeenCalledTimes(1);
  });
});
