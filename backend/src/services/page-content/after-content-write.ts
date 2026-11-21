import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { bumpCmsVersion } from '../cms-cache';
import { solutionsIndexService } from '../solutions-finder';

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
 * 1. Atomically bumps CmsState.version by 1 (Invariant I6).
 * 2. Debounces solutions index rebuild by 2000 ms.
 */
export async function afterContentWrite(params: AfterContentWriteParams, tx?: Prisma.TransactionClient): Promise<void> {
  try {
    await bumpCmsVersion(tx);
  } catch (err) {
    console.error('[afterContentWrite] Failed to bump CmsState version:', err);
    throw err;
  }

  // Schedule debounced search index rebuild
  scheduleSolutionsIndexRebuild(2000);
}

export default afterContentWrite;
