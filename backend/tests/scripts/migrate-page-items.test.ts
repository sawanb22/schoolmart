import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { seedPagesFromFixtures, loadPageFixture } from '../helpers/seed-fixtures';
import { runMigration } from '../../scripts/migrate-page-items';

describe('Page Items Migration Script (migrate-page-items.ts)', () => {
  beforeAll(async () => {
    await resetContentTables();
    const testSlugs = [
      'colleges-universities-for-sale',
      'labs',
      'sports-infra',
      'privacy-policy',
      'edge-category-mix',
      'edge-duplicate-titles',
      'edge-no-card-slugs',
      'edge-faq-no-title',
      'edge-featured-duplicate',
      'guide-50-global-resources-for-school-excellence',
    ];
    const fixtures = testSlugs.map(slug => loadPageFixture(slug));
    await seedPagesFromFixtures(fixtures);
  }, 60000);

  it('dry run writes zero changes to the database', async () => {
    const pageCountBefore = await prisma.page.count();
    const itemCountBefore = await prisma.pageItem.count();
    const categoryCountBefore = await prisma.pageCategory.count();
    const revisionCountBefore = await prisma.pageRevision.count();
    const cmsStateBefore = await prisma.cmsState.findUnique({ where: { id: 1 } });

    const report = await runMigration({ mode: 'dry-run', prisma });

    expect(report.mode).toBe('dry-run');
    expect(report.totals.errors).toBe(0);
    expect(report.totals.structured).toBeGreaterThan(0);

    const pageCountAfter = await prisma.page.count();
    const itemCountAfter = await prisma.pageItem.count();
    const categoryCountAfter = await prisma.pageCategory.count();
    const revisionCountAfter = await prisma.pageRevision.count();
    const cmsStateAfter = await prisma.cmsState.findUnique({ where: { id: 1 } });

    expect(pageCountAfter).toBe(pageCountBefore);
    expect(itemCountAfter).toBe(itemCountBefore);
    expect(categoryCountAfter).toBe(categoryCountBefore);
    expect(revisionCountAfter).toBe(revisionCountBefore);
    expect(cmsStateAfter?.version).toBe(cmsStateBefore?.version);
  }, 30000);

  it('--apply on fixtures yields expected item and category counts and updates contentModel', async () => {
    const cmsStateBefore = await prisma.cmsState.findUnique({ where: { id: 1 } });
    const initialVersion = cmsStateBefore?.version ?? 1;

    const report = await runMigration({ mode: 'apply', prisma });

    expect(report.mode).toBe('apply');
    expect(report.totals.errors).toBe(0);
    expect(report.totals.structured).toBeGreaterThan(0);
    expect(report.totals.items).toBeGreaterThan(0);

    const itemCount = await prisma.pageItem.count();
    const categoryCount = await prisma.pageCategory.count();
    const revisionCount = await prisma.pageRevision.count();
    const cmsStateAfter = await prisma.cmsState.findUnique({ where: { id: 1 } });

    expect(itemCount).toBe(report.totals.items);
    expect(categoryCount).toBe(report.totals.categories);
    expect(revisionCount).toBe(report.totals.structured);
    expect(cmsStateAfter?.version).toBeGreaterThan(initialVersion);

    // Verify structured page contentModel
    const structuredPage = await prisma.page.findUnique({
      where: { slug: 'colleges-universities-for-sale' },
      include: { items: true },
    });
    expect(structuredPage).not.toBeNull();
    expect(structuredPage?.contentModel).toBe('structured');
    expect(structuredPage?.items.length).toBe(3);
  }, 90000);

  it('idempotence: second --apply run causes zero mutations (same IDs, versions, and counts)', async () => {
    // 1. Snapshot state after first apply
    const beforeItems = await prisma.pageItem.findMany({
      orderBy: { id: 'asc' },
    });
    const beforeCategories = await prisma.pageCategory.findMany({
      orderBy: { id: 'asc' },
    });
    const beforePageItemCategories = await prisma.pageItemCategory.findMany({
      orderBy: [{ itemId: 'asc' }, { categoryId: 'asc' }],
    });
    const beforePages = await prisma.page.findMany({
      where: { contentModel: 'structured' },
      orderBy: { id: 'asc' },
    });

    // 2. Run --apply a second time (without --force, structured pages skipped)
    const secondReport = await runMigration({ mode: 'apply', prisma });
    expect(secondReport.totals.errors).toBe(0);

    // 3. Snapshot state after second apply
    const afterItems = await prisma.pageItem.findMany({
      orderBy: { id: 'asc' },
    });
    const afterCategories = await prisma.pageCategory.findMany({
      orderBy: { id: 'asc' },
    });
    const afterPageItemCategories = await prisma.pageItemCategory.findMany({
      orderBy: [{ itemId: 'asc' }, { categoryId: 'asc' }],
    });
    const afterPages = await prisma.page.findMany({
      where: { contentModel: 'structured' },
      orderBy: { id: 'asc' },
    });

    // 4. Assert perfect identity
    expect(afterItems.length).toBe(beforeItems.length);
    for (let i = 0; i < beforeItems.length; i++) {
      expect(afterItems[i].id).toBe(beforeItems[i].id);
      expect(afterItems[i].version).toBe(beforeItems[i].version);
      expect(afterItems[i].slug).toBe(beforeItems[i].slug);
      expect(afterItems[i].title).toBe(beforeItems[i].title);
    }

    expect(afterCategories.length).toBe(beforeCategories.length);
    for (let i = 0; i < beforeCategories.length; i++) {
      expect(afterCategories[i].id).toBe(beforeCategories[i].id);
      expect(afterCategories[i].slug).toBe(beforeCategories[i].slug);
      expect(afterCategories[i].name).toBe(beforeCategories[i].name);
    }

    expect(afterPageItemCategories.length).toBe(beforePageItemCategories.length);
    for (let i = 0; i < beforePageItemCategories.length; i++) {
      expect(afterPageItemCategories[i].itemId).toBe(beforePageItemCategories[i].itemId);
      expect(afterPageItemCategories[i].categoryId).toBe(beforePageItemCategories[i].categoryId);
      expect(afterPageItemCategories[i].sortOrder).toBe(beforePageItemCategories[i].sortOrder);
    }

    for (let i = 0; i < beforePages.length; i++) {
      expect(afterPages[i].version).toBe(beforePages[i].version);
    }
  }, 90000);

  it('pre-migration revision snapshots exist with original document pageData', async () => {
    const structuredPages = await prisma.page.findMany({
      where: { contentModel: 'structured' },
    });

    expect(structuredPages.length).toBeGreaterThan(0);

    for (const page of structuredPages) {
      const revision = await prisma.pageRevision.findFirst({
        where: { pageId: page.id, reason: 'pre-migration' },
        orderBy: { id: 'desc' },
      });

      expect(revision).not.toBeNull();
      expect(revision?.reason).toBe('pre-migration');

      const snapshot = revision?.snapshot as any;
      expect(snapshot).toBeDefined();
      expect(snapshot.contentModel).toBe('document');
      expect(snapshot.pageData).toBeDefined();
      expect(typeof snapshot.pageData).toBe('object');
    }
  }, 30000);

  it('--force re-runs from revision snapshot and yields consistent results', async () => {
    const itemsBefore = await prisma.pageItem.count();
    const categoriesBefore = await prisma.pageCategory.count();

    const forceReport = await runMigration({ mode: 'apply', force: true, prisma });
    expect(forceReport.totals.errors).toBe(0);

    const itemsAfter = await prisma.pageItem.count();
    const categoriesAfter = await prisma.pageCategory.count();

    expect(itemsAfter).toBe(itemsBefore);
    expect(categoriesAfter).toBe(categoriesBefore);
  }, 90000);

  it('document pages remain untouched with zero items and zero categories', async () => {
    const documentPages = await prisma.page.findMany({
      where: {
        slug: { in: ['privacy-policy', 'guide-50-global-resources-for-school-excellence'] },
      },
      include: {
        items: true,
        categories: true,
      },
    });

    expect(documentPages.length).toBeGreaterThan(0);

    for (const page of documentPages) {
      expect(page.contentModel).toBe('document');
      expect(page.items.length).toBe(0);
      expect(page.categories.length).toBe(0);
    }
  }, 30000);
});
