import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '../../src/lib/prisma';
import {
  afterContentWrite,
  cancelPendingSolutionsRebuild,
} from '../../src/services/page-content/after-content-write';
import { solutionsIndexService } from '../../src/services/solutions-finder';

describe('Solutions Index Debouncing (afterContentWrite)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cancelPendingSolutionsRebuild();
  });

  afterEach(() => {
    cancelPendingSolutionsRebuild();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces 5 writes within 1 second into exactly 1 rebuild after 2000ms', async () => {
    // Spy on rebuild and mock Prisma CmsState upsert to avoid actual DB latency in fake-timer loop
    const rebuildSpy = vi.spyOn(solutionsIndexService, 'rebuild').mockResolvedValue();
    vi.spyOn(prisma.cmsState, 'upsert').mockResolvedValue({
      id: 1,
      version: 2,
      updatedAt: new Date(),
    } as any);

    // Call afterContentWrite 5 times with 150ms intervals (total ~600ms <= 1000ms)
    for (let i = 1; i <= 5; i++) {
      await afterContentWrite({ reason: `batch-mutation-${i}` });
      if (i < 5) {
        vi.advanceTimersByTime(150);
      }
    }

    // Immediately after the 5 writes (approx 600ms elapsed), no rebuild should have fired
    expect(rebuildSpy).not.toHaveBeenCalled();

    // Advance 1900ms from the 5th write (debounce timer is 2000ms)
    vi.advanceTimersByTime(1900);
    expect(rebuildSpy).not.toHaveBeenCalled();

    // Advance 100ms more (reaching 2000ms after the 5th write)
    vi.advanceTimersByTime(100);
    expect(rebuildSpy).toHaveBeenCalledTimes(1);

    // Advance an additional 5000ms to verify no stray/duplicate timer firings
    vi.advanceTimersByTime(5000);
    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });

  it('cancelPendingSolutionsRebuild cancels any scheduled rebuild', async () => {
    const rebuildSpy = vi.spyOn(solutionsIndexService, 'rebuild').mockResolvedValue();
    vi.spyOn(prisma.cmsState, 'upsert').mockResolvedValue({
      id: 1,
      version: 2,
      updatedAt: new Date(),
    } as any);

    await afterContentWrite({ reason: 'write-to-cancel' });
    vi.advanceTimersByTime(500);

    cancelPendingSolutionsRebuild();

    vi.advanceTimersByTime(3000);
    expect(rebuildSpy).not.toHaveBeenCalled();
  });
});
