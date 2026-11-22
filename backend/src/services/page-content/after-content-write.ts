import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { bumpCmsVersion } from '../cms-cache';
import { solutionsIndexService } from '../solutions-finder';
import { REVISIONS_KEPT_PER_PAGE } from './constants';
import { scheduleSitemapSync, cancelPendingSitemapSync } from '../sitemap.service';

export { scheduleSitemapSync, cancelPendingSitemapSync };

export interface AfterContentWriteParams {
  pageId?: number;
  reason: string;
  authorId?: number | null;
  /** Plain-English description for the activity log, e.g. `Added card "X"`. */
  summary?: string;
}

const REASON_DESCRIPTIONS: Record<string, string> = {
  'settings': 'Edited page settings',
  'item-create': 'Added a card',
  'item-update': 'Edited a card',
  'item-delete': 'Deleted a card',
  'reorder': 'Reordered cards',
  'category': 'Added a category',
  'category-create': 'Added a category',
  'category-update': 'Edited a category',
  'category-delete': 'Deleted a category',
  'category-reorder': 'Reordered categories',
  'restore': 'Restored an older version',
  'pre-migration': 'Moved to the new card system',
  'page-create': 'Created page',
  'page-delete': 'Deleted page',
  'legacy-adapter-update': 'Edited page settings',
};

/** Friendly fallback text for a revision `reason` when no summary was stored. */
export function describeRevisionReason(reason: string): string {
  return Object.prototype.hasOwnProperty.call(REASON_DESCRIPTIONS, reason)
    ? REASON_DESCRIPTIONS[reason]
    : 'Updated the page';
}

let rebuildTimer: NodeJS.Timeout | null = null;

export function cancelPendingSolutionsRebuild(): void {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }
}

export function scheduleSolutionsIndexRebuild(delayMs = 2000): void {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    solutionsIndexService.rebuild().catch(err => {
      logger.error({ err }, '[SolutionsIndex] Debounced rebuild error');
    });
  }, delayMs);
  if (rebuildTimer && typeof rebuildTimer.unref === 'function') {
    rebuildTimer.unref();
  }
}

/**
 * Global write hook called after every CMS mutation:
 * 1. Appends a read-only activity log row (PageRevision with snapshot { summary }) when params.pageId is present.
 *    No page, item or category content is copied.
 * 2. Prunes the log to the newest REVISIONS_KEPT_PER_PAGE (20) rows per page.
 * 3. Atomically bumps CmsState.version by 1 (Invariant I6).
 * 4. Debounces solutions index rebuild by 2000 ms.
 */
export async function afterContentWrite(params: AfterContentWriteParams, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx || prisma;

  if (params.pageId) {
    try {
      const page = await client.page.findUnique({
        where: { id: params.pageId },
      });

      if (page) {
        // Activity log row only: a short summary, no copy of the page content.
        const summary = params.summary?.trim() || describeRevisionReason(params.reason);

        await client.pageRevision.create({
          data: {
            pageId: params.pageId,
            version: page.version,
            reason: params.reason,
            authorId: params.authorId ?? null,
            snapshot: { summary } as Prisma.InputJsonValue,
          },
        });

        // Pruning: keep only the newest REVISIONS_KEPT_PER_PAGE rows for this page.
        const revisions = await client.pageRevision.findMany({
          where: { pageId: params.pageId },
          select: { id: true },
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        });

        if (revisions.length > REVISIONS_KEPT_PER_PAGE) {
          const idsToDelete = revisions
            .slice(REVISIONS_KEPT_PER_PAGE)
            .map(r => r.id);

          await client.pageRevision.deleteMany({
            where: {
              id: { in: idsToDelete },
            },
          });
        }
      }
    } catch (err) {
      logger.error({ err }, '[afterContentWrite] Failed to create or prune page revision snapshot');
      throw err;
    }
  }

  try {
    await bumpCmsVersion(tx);
  } catch (err) {
    logger.error({ err }, '[afterContentWrite] Failed to bump CmsState version');
    throw err;
  }

  // Schedule debounced search index rebuild
  scheduleSolutionsIndexRebuild(2000);

  // Schedule debounced atomic sitemap file sync if SITEMAP_WRITE_PATH is configured
  if (process.env.SITEMAP_WRITE_PATH) {
    scheduleSitemapSync(10000);
  }
}

export default afterContentWrite;
