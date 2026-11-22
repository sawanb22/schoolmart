import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

async function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    if (timer.unref) timer.unref();
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Liveness probe: returns 200 immediately without touching database or external services.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: verifies database connectivity and CMS state within a 2-second timeout.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 2000);
    const cmsState = await withTimeout(
      prisma.cmsState.findFirst({ select: { version: true } }),
      2000
    );

    res.status(200).json({
      status: 'ready',
      db: 'ok',
      cmsVersion: cmsState?.version ?? 1,
    });
  } catch (err) {
    logger.warn({ err }, 'Readiness check failed');
    res.status(503).json({
      status: 'not_ready',
      db: 'error',
    });
  }
});

export { router as healthRoutes };
export default router;
