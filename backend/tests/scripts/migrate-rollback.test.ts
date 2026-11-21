import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { runMigration } from '../../scripts/migrate-page-items';
import { parsePageData } from '../../src/lib/page-data';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';

describe('Migration Rollback (--rollback)', () => {
  const allFixtures = loadAllPageFixtures();
  const testFixtures = allFixtures.filter(f =>
    ['colleges-universities-for-sale', 'labs', 'sports-infra', 'privacy-policy', 'edge-category-mix'].includes(f.slug)
  );

  beforeEach(async () => {
    await resetContentTables();
  });

  it('restores original document state and deep-equal pageData after --apply and --rollback', async () => {
    // 1. Seed fixtures
    await seedPagesFromFixtures(testFixtures);

    // Save initial state
    const originalPages = await prisma.page.findMany({
      where: { slug: { in: testFixtures.map(f => f.slug) } },
    });
    const originalPageDataMap = new Map<string, any>();
    for (const p of originalPages) {
      originalPageDataMap.set(p.slug, parsePageData(p.pageData));
    }

    const initialCmsState = await prisma.cmsState.findUnique({ where: { id: 1 } });
    const initialCmsVersion = initialCmsState?.version || 1;

    // 2. Apply migration
    const applyReport = await runMigration({ mode: 'apply', prisma });
    expect(applyReport.totals.errors).toBe(0);

    const structuredPagesAfterApply = await prisma.page.findMany({
      where: { contentModel: 'structured' },
    });
    expect(structuredPagesAfterApply.length).toBeGreaterThan(0);

    const itemsCountAfterApply = await prisma.pageItem.count();
    expect(itemsCountAfterApply).toBeGreaterThan(0);

    const categoriesCountAfterApply = await prisma.pageCategory.count();
    expect(categoriesCountAfterApply).toBeGreaterThan(0);

    // 3. Rollback migration
    const rollbackReport = await runMigration({ mode: 'rollback', prisma });
    expect(rollbackReport.totals.errors).toBe(0);

    // 4. Verification
    // All pages must now have contentModel === 'document'
    const pagesAfterRollback = await prisma.page.findMany({
      where: { slug: { in: testFixtures.map(f => f.slug) } },
    });

    for (const p of pagesAfterRollback) {
      expect(p.contentModel).toBe('document');
      const expectedOriginal = originalPageDataMap.get(p.slug);
      const restored = parsePageData(p.pageData);
      expect(restored).toEqual(expectedOriginal);
    }

    // Zero items, categories, or join rows remaining
    const remainingItems = await prisma.pageItem.count();
    expect(remainingItems).toBe(0);

    const remainingCategories = await prisma.pageCategory.count();
    expect(remainingCategories).toBe(0);

    const remainingLinks = await prisma.pageItemCategory.count();
    expect(remainingLinks).toBe(0);

    // CmsState version was bumped
    const finalCmsState = await prisma.cmsState.findUnique({ where: { id: 1 } });
    expect(finalCmsState?.version).toBeGreaterThan(initialCmsVersion);
  });

  it('supports single-page rollback via pages option', async () => {
    await seedPagesFromFixtures(testFixtures);

    const originalLabs = testFixtures.find(f => f.slug === 'labs')!;
    const originalLabsPageData = parsePageData(originalLabs.pageData);

    // Apply migration
    await runMigration({ mode: 'apply', prisma });

    // Rollback ONLY labs
    const rollbackReport = await runMigration({
      mode: 'rollback',
      pages: ['labs'],
      prisma,
    });
    expect(rollbackReport.totals.errors).toBe(0);

    const labsPage = await prisma.page.findUnique({ where: { slug: 'labs' } });
    expect(labsPage?.contentModel).toBe('document');
    expect(parsePageData(labsPage?.pageData)).toEqual(originalLabsPageData);

    // Items for labs should be deleted
    const labsItems = await prisma.pageItem.count({ where: { pageId: labsPage!.id } });
    expect(labsItems).toBe(0);

    // Other structured pages (e.g. sports-infra) should still be structured
    const sportsPage = await prisma.page.findUnique({ where: { slug: 'sports-infra' } });
    expect(sportsPage?.contentModel).toBe('structured');
    const sportsItems = await prisma.pageItem.count({ where: { pageId: sportsPage!.id } });
    expect(sportsItems).toBeGreaterThan(0);
  });
});
