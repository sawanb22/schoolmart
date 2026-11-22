import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { solutionsIndexService } from '../../src/services/solutions-finder';

describe('Solutions Index Freshness & ensureFresh()', () => {
  let virtualTime = 100000;

  beforeAll(async () => {
    await resetContentTables();
    await prisma.page.create({
      data: {
        slug: 'stem-labs',
        title: 'STEM Labs',
        published: true,
      },
    });
    await prisma.searchCard.create({
      data: {
        cardSlug: 'stem-labs--robotics',
        targetSlug: 'stem-labs',
        categorySlug: 'ai-tech',
        title: 'Robotics Lab Setup',
        summary: 'Turnkey robotics lab setup for schools',
        inclusions: ['Robotics kits', 'Workstations', 'Trainer curriculum'],
        priority: 10,
        active: true,
      },
    });
  });

  beforeEach(async () => {
    virtualTime = 100000;
    solutionsIndexService.setClock(() => virtualTime);
    solutionsIndexService.resetFreshnessMemo();

    // Ensure CmsState is at version 1
    await prisma.cmsState.upsert({
      where: { id: 1 },
      create: { id: 1, version: 1 },
      update: { version: 1 },
    });

    // Initial compile
    await solutionsIndexService.rebuild();
  });

  afterEach(() => {
    solutionsIndexService.setClock(() => Date.now());
    solutionsIndexService.resetFreshnessMemo();
    vi.restoreAllMocks();
  });

  it('serves search without rebuilding when CmsState.version has not changed', async () => {
    expect(solutionsIndexService.getLastCmsVersion()).toBe(1);

    const rebuildSpy = vi.spyOn(solutionsIndexService, 'rebuild');

    const res = await request(app).get('/api/solutions-finder/search?q=stem');
    expect(res.status).toBe(200);
    expect(rebuildSpy).not.toHaveBeenCalled();

    // Repeated call within 5s window
    virtualTime += 2000;
    const res2 = await request(app).get('/api/solutions-finder/search?q=stem');
    expect(res2.status).toBe(200);
    expect(rebuildSpy).not.toHaveBeenCalled();
  });

  it('triggers index rebuild on search request after CmsState.version is bumped in SQL and memo window expires', async () => {
    expect(solutionsIndexService.getLastCmsVersion()).toBe(1);

    // Initial search to seed the 5s memo window
    const res1 = await request(app).get('/api/solutions-finder/search?q=lab');
    expect(res1.status).toBe(200);

    // Bump cmsstate.version in SQL directly (simulating another process / Passenger worker)
    await prisma.$executeRawUnsafe('UPDATE "cmsstate" SET "version" = 5 WHERE "id" = 1;');

    const rebuildSpy = vi.spyOn(solutionsIndexService, 'rebuild');

    // Immediate request within 5s memo window should NOT query DB or rebuild
    virtualTime += 2000; // only 2s elapsed
    const res2 = await request(app).get('/api/solutions-finder/search?q=lab');
    expect(res2.status).toBe(200);
    expect(rebuildSpy).not.toHaveBeenCalled();
    expect(solutionsIndexService.getLastCmsVersion()).toBe(1);

    // Advance clock past the 5s memo window (6s total elapsed)
    virtualTime += 4000; // now 6s elapsed
    const res3 = await request(app).get('/api/solutions-finder/search?q=lab');
    expect(res3.status).toBe(200);

    // Rebuild MUST have been triggered by ensureFresh()
    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    expect(solutionsIndexService.getLastCmsVersion()).toBe(5);

    // Subsequent search within next 5s window does not rebuild again
    virtualTime += 1000;
    const res4 = await request(app).get('/api/solutions-finder/search?q=lab');
    expect(res4.status).toBe(200);
    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });
});
