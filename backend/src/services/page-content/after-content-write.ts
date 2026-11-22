import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { bumpCmsVersion } from '../cms-cache';
import { solutionsIndexService } from '../solutions-finder';
import { parsePageData } from '../../lib/page-data';
import { REVISIONS_KEPT_PER_PAGE } from './constants';
import { scheduleSitemapSync, cancelPendingSitemapSync } from '../sitemap.service';

export { scheduleSitemapSync, cancelPendingSitemapSync };

export interface AfterContentWriteParams {
  pageId?: number;
  reason: string;
  authorId?: number | null;
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
      console.error('[SolutionsIndex] Debounced rebuild error:', err);
    });
  }, delayMs);
  if (rebuildTimer && typeof rebuildTimer.unref === 'function') {
    rebuildTimer.unref();
  }
}

/**
 * Global write hook called after every CMS mutation:
 * 1. Writes an automatic PageRevision snapshot when params.pageId is present.
 * 2. Prunes oldest revisions beyond REVISIONS_KEPT_PER_PAGE (30), strictly preserving 'pre-migration' snapshots.
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
        const [categories, items] = await Promise.all([
          client.pageCategory.findMany({
            where: { pageId: params.pageId },
            orderBy: { sortOrder: 'asc' },
          }),
          client.pageItem.findMany({
            where: { pageId: params.pageId },
            orderBy: [{ collection: 'asc' }, { sortOrder: 'asc' }],
            include: {
              categories: {
                include: { category: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          }),
        ]);

        const snapshot = {
          page: {
            title: page.title,
            slug: page.slug,
            template: page.template,
            published: page.published,
            contentModel: page.contentModel,
          },
          settings: parsePageData(page.pageData),
          items: items.map(item => ({
            id: item.id,
            collection: item.collection,
            sortOrder: item.sortOrder,
            title: item.title,
            slug: item.slug,
            summary: item.summary,
            imageUrl: item.imageUrl,
            href: item.href,
            badge: item.badge,
            data: item.data,
            detail: item.detail,
            published: item.published,
            version: item.version,
            categories: item.categories.map(c => c.category?.name).filter((name): name is string => Boolean(name)),
          })),
          categories: categories.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            sortOrder: c.sortOrder,
          })),
        };

        await client.pageRevision.create({
          data: {
            pageId: params.pageId,
            version: page.version,
            reason: params.reason,
            authorId: params.authorId ?? null,
            snapshot: snapshot as Prisma.InputJsonValue,
          },
        });

        // Pruning: Keep newest REVISIONS_KEPT_PER_PAGE non-pre-migration revisions.
        // Never delete pre-migration revisions.
        const nonMigrationRevisions = await client.pageRevision.findMany({
          where: {
            pageId: params.pageId,
            reason: { not: 'pre-migration' },
          },
          select: { id: true },
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        });

        if (nonMigrationRevisions.length > REVISIONS_KEPT_PER_PAGE) {
          const idsToDelete = nonMigrationRevisions
            .slice(REVISIONS_KEPT_PER_PAGE)
            .map(r => r.id);

          if (idsToDelete.length > 0) {
            await client.pageRevision.deleteMany({
              where: {
                id: { in: idsToDelete },
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('[afterContentWrite] Failed to create or prune page revision snapshot:', err);
      throw err;
    }
  }

  try {
    await bumpCmsVersion(tx);
  } catch (err) {
    console.error('[afterContentWrite] Failed to bump CmsState version:', err);
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
