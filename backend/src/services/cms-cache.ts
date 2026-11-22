import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

export interface CmsCacheEntry {
  version: number;
  etag: string;
  body: any;
  contentType: string;
}

export const cmsLruCache = new LRUCache<string, CmsCacheEntry>({
  max: 500,
});

let memoizedVersion: number | null = null;
let lastVersionFetchedAt = 0;
let customClock: (() => number) | null = null;

export function setCmsClock(clock: (() => number) | null): void {
  customClock = clock;
}

export function resetCmsVersionCache(): void {
  memoizedVersion = null;
  lastVersionFetchedAt = 0;
}

/**
 * Returns current CmsState.version from database (singleton id: 1).
 * Memoized in-process for 1000 ms.
 * Supports clock injection for deterministic testing.
 */
export async function getCmsVersion(options?: { clock?: () => number }): Promise<number> {
  const clock = options?.clock || customClock || Date.now;
  const now = clock();

  if (memoizedVersion !== null && now - lastVersionFetchedAt < 1000) {
    return memoizedVersion;
  }

  try {
    const state = await prisma.cmsState.findUnique({
      where: { id: 1 },
      select: { version: true },
    });

    const version = state?.version ?? 1;
    memoizedVersion = version;
    lastVersionFetchedAt = now;
    return version;
  } catch (err) {
    if (memoizedVersion !== null) {
      logger.warn({ err }, '[cms-cache] Failed to fetch CmsState from DB, using memoized version');
      return memoizedVersion;
    }
    throw err;
  }
}

/**
 * Updates CmsState singleton, atomically incrementing version: { increment: 1 }.
 * Updates in-process memoization immediately.
 */
export async function bumpCmsVersion(tx?: Prisma.TransactionClient): Promise<number> {
  const client = tx || prisma;
  const state = await client.cmsState.upsert({
    where: { id: 1 },
    create: { id: 1, version: 2 },
    update: { version: { increment: 1 } },
    select: { version: true },
  });

  const clock = customClock || Date.now;
  memoizedVersion = state.version;
  lastVersionFetchedAt = clock();

  return state.version;
}

/**
 * Computes deterministic weak ETag for CMS route:
 * W/"cms-<version>-<sha1(originalUrl).slice(0, 12)>"
 */
export function computeCmsEtag(version: number, originalUrl: string): string {
  const urlHash = crypto.createHash('sha1').update(originalUrl).digest('hex').slice(0, 12);
  return `W/"cms-${version}-${urlHash}"`;
}

/**
 * Checks if client's If-None-Match header matches the expected ETag.
 */
export function matchesIfNoneMatch(ifNoneMatchHeader: string | undefined, currentEtag: string): boolean {
  if (!ifNoneMatchHeader) return false;
  const trimmed = ifNoneMatchHeader.trim();
  if (trimmed === '*') return true;
  const rawCurrent = currentEtag.replace(/^W\//, '');
  const tokens = trimmed.split(',').map((t) => t.trim());
  return tokens.some((token) => token === currentEtag || token.replace(/^W\//, '') === rawCurrent);
}

/**
 * Public CMS response cache middleware factory.
 * Ties cache freshness to database CmsState.version across all Passenger workers.
 */
export function publicCmsCache() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const version = await getCmsVersion();
      const cacheKey = req.originalUrl || req.url;
      const etag = computeCmsEtag(version, cacheKey);

      res.setHeader('Cache-Control', 'public, no-cache');
      res.removeHeader('Pragma');
      res.removeHeader('Expires');
      res.setHeader('ETag', etag);

      const hasAuth = Boolean(req.headers.authorization);

      if (!hasAuth) {
        // 1. If-None-Match check: respond 304 with no body and zero database queries
        if (matchesIfNoneMatch(req.headers['if-none-match'], etag)) {
          res.status(304).end();
          return;
        }

        // 2. In-process LRU cache check
        const cached = cmsLruCache.get(cacheKey);
        if (cached && cached.version === version) {
          if (cached.contentType) {
            res.setHeader('Content-Type', cached.contentType);
          }
          res.send(cached.body);
          return;
        }
      }

      // Intercept res.send to capture body for LRU cache (only for status 200 without auth)
      const originalSend = res.send.bind(res);
      res.send = (body: any) => {
        if (res.statusCode === 200 && !hasAuth) {
          const contentType = (res.getHeader('Content-Type') as string) || 'application/json; charset=utf-8';
          cmsLruCache.set(cacheKey, {
            version,
            etag,
            body,
            contentType,
          });
        }
        return originalSend(body);
      };

      next();
    } catch (err) {
      logger.error({ err }, '[publicCmsCache] Error in cache middleware');
      next(err);
    }
  };
}

export default publicCmsCache;
