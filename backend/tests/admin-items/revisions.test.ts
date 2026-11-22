import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import {
  afterContentWrite,
  describeRevisionReason,
} from '../../src/services/page-content/after-content-write';
import { REVISIONS_KEPT_PER_PAGE } from '../../src/services/page-content/constants';

async function latestRevision(pageId: number) {
  return prisma.pageRevision.findFirst({
    where: { pageId },
    orderBy: { id: 'desc' },
  });
}

describe('Admin Page Activity Log (read-only revisions)', () => {
  let adminToken: string;
  let adminId: number;
  let adminName: string;
  let pageId: number;
  const pageSlug = 'labs';

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const admin = await prisma.user.findUnique({ where: { email: 'admin@schoolmart.in' } });
    adminId = admin!.id;
    adminName = admin!.name;

    const page = await prisma.page.create({
      data: {
        title: 'Science & Tech Labs',
        slug: pageSlug,
        contentModel: 'structured',
        template: 'hub',
        pageData: {
          heroTitle: 'Advanced Science Labs',
          heroSubtitle: 'Next-gen school laboratories',
        },
        version: 1,
        published: true,
      },
    });
    pageId = page.id;
  }, 60000);

  it('1. writes a log row per write type with the right reason and plain-English summary only', async () => {
    const expectLog = async (reason: string, summary: string) => {
      const rev = await latestRevision(pageId);
      expect(rev).not.toBeNull();
      expect(rev?.reason).toBe(reason);
      expect(rev?.authorId).toBe(adminId);
      // Snapshot is only { summary }: no page/items/categories/settings copies
      expect(rev?.snapshot).toEqual({ summary });
    };

    // Item create
    const createItemRes = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Physics Lab',
        slug: 'physics-lab',
        summary: 'State of the art physics experimental lab',
      });
    expect(createItemRes.status).toBe(201);
    const createdItemId = createItemRes.body.id;
    await expectLog('item-create', 'Added card "Physics Lab"');

    // Item update
    const updateItemRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: createItemRes.body.version, title: 'Modern Physics Lab' });
    expect(updateItemRes.status).toBe(200);
    await expectLog('item-update', 'Edited card "Modern Physics Lab"');

    // Item unpublish / publish (published-only PATCH)
    const unpublishRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ published: false });
    expect(unpublishRes.status).toBe(200);
    await expectLog('item-update', 'Unpublished card "Modern Physics Lab"');

    const publishRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ published: true });
    expect(publishRes.status).toBe(200);
    await expectLog('item-update', 'Published card "Modern Physics Lab"');

    // Category create
    const createCatRes = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'STEM Equipment' });
    expect(createCatRes.status).toBe(201);
    const createdCatId = createCatRes.body.category.id;
    await expectLog('category-create', 'Added category "STEM Equipment"');

    // Category rename
    const updateCatRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Advanced STEM Equipment' });
    expect(updateCatRes.status).toBe(200);
    await expectLog('category-update', 'Renamed category "STEM Equipment" to "Advanced STEM Equipment"');

    // Category edit without rename
    const sortCatRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sortOrder: 0 });
    expect(sortCatRes.status).toBe(200);
    await expectLog('category-update', 'Edited category "Advanced STEM Equipment"');

    // Reorder items (add a second item first)
    const item2Res = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ collection: 'cards', title: 'Chemistry Lab', slug: 'chemistry-lab' });
    expect(item2Res.status).toBe(201);
    const item2Id = item2Res.body.id;

    const reorderItemsRes = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ collection: 'cards', orderedIds: [item2Id, createdItemId] });
    expect(reorderItemsRes.status).toBe(200);
    await expectLog('reorder', 'Reordered cards');

    // Reorder categories (add a second category first)
    const cat2Res = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Robotics' });
    expect(cat2Res.status).toBe(201);
    const cat2Id = cat2Res.body.category.id;

    const reorderCatsRes = await request(app)
      .put(`/api/admin/pages/${pageId}/categories/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderedIds: [cat2Id, createdCatId] });
    expect(reorderCatsRes.status).toBe(200);
    await expectLog('category-reorder', 'Reordered categories');

    // Item delete
    const deleteItemRes = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${item2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteItemRes.status).toBe(204);
    await expectLog('item-delete', 'Deleted card "Chemistry Lab"');

    // Category delete
    const deleteCatRes = await request(app)
      .delete(`/api/admin/pages/${pageId}/categories/${cat2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteCatRes.status).toBe(204);
    await expectLog('category-delete', 'Deleted category "Robotics"');

    // Settings update on structured page
    const settingsRes = await request(app)
      .put(`/api/pages/${pageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pageData: { heroTitle: 'Updated Science Labs' } });
    expect(settingsRes.status).toBe(200);
    await expectLog('settings', 'Edited page settings');
  });

  it('2. GET /revisions returns summary and authorName, newest first, without pre-migration rows', async () => {
    await prisma.pageRevision.create({
      data: {
        pageId,
        version: 1,
        reason: 'pre-migration',
        snapshot: { contentModel: 'document', pageData: {} },
        createdAt: new Date(Date.now() + 60_000), // newest, must still be hidden
      },
    });

    const res = await request(app)
      .get(`/api/admin/pages/${pageId}/revisions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.revisions)).toBe(true);
    expect(res.body.revisions.length).toBeGreaterThan(0);
    expect(res.body.revisions.length).toBeLessThanOrEqual(REVISIONS_KEPT_PER_PAGE);

    const first = res.body.revisions[0];
    expect(Object.keys(first).sort()).toEqual(
      ['authorId', 'authorName', 'createdAt', 'id', 'reason', 'summary'].sort()
    );
    expect(first.reason).toBe('settings');
    expect(first.summary).toBe('Edited page settings');
    expect(first.authorId).toBe(adminId);
    expect(first.authorName).toBe(adminName);

    expect(res.body.revisions.some((r: any) => r.reason === 'pre-migration')).toBe(false);

    for (let i = 1; i < res.body.revisions.length; i++) {
      const prev = new Date(res.body.revisions[i - 1].createdAt).getTime();
      const curr = new Date(res.body.revisions[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('3. GET /revisions falls back to a friendly summary and System/Unknown admin names', async () => {
    const page = await prisma.page.create({
      data: {
        title: 'Fallback Page',
        slug: 'fallback-page',
        contentModel: 'structured',
        version: 1,
        published: true,
      },
    });

    // Old-style full snapshot with no summary, written by the system
    await prisma.pageRevision.create({
      data: { pageId: page.id, version: 1, reason: 'item-update', snapshot: { items: [] }, authorId: null },
    });
    // Author that no longer exists
    await prisma.pageRevision.create({
      data: { pageId: page.id, version: 2, reason: 'category-reorder', snapshot: {}, authorId: 424242 },
    });

    const res = await request(app)
      .get(`/api/admin/pages/${page.id}/revisions`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.revisions).toHaveLength(2);

    const [newer, older] = res.body.revisions;
    expect(newer.summary).toBe('Reordered categories');
    expect(newer.authorName).toBe('Unknown admin');
    expect(older.summary).toBe('Edited a card');
    expect(older.authorName).toBe('System');
  });

  it('4. keeps exactly 20 log rows per page (newest kept) and no longer spares pre-migration rows', async () => {
    expect(REVISIONS_KEPT_PER_PAGE).toBe(20);

    const testPage = await prisma.page.create({
      data: {
        title: 'Pruning Test Page',
        slug: 'prune-test-page',
        contentModel: 'structured',
        version: 1,
        published: true,
      },
    });

    // 2 oldest rows are pre-migration; they must be pruned like any other row
    for (let i = 1; i <= 2; i++) {
      await prisma.pageRevision.create({
        data: {
          pageId: testPage.id,
          version: 1,
          reason: 'pre-migration',
          snapshot: { test: `pre-migration-${i}` },
        },
      });
    }

    for (let i = 1; i <= 25; i++) {
      await afterContentWrite({
        pageId: testPage.id,
        reason: 'item-update',
        summary: `Change ${i}`,
      });
    }

    const rows = await prisma.pageRevision.findMany({
      where: { pageId: testPage.id },
      orderBy: { id: 'asc' },
    });

    expect(rows).toHaveLength(REVISIONS_KEPT_PER_PAGE);
    expect(rows.some(r => r.reason === 'pre-migration')).toBe(false);

    const summaries = rows.map(r => (r.snapshot as any).summary);
    expect(summaries[0]).toBe('Change 6');
    expect(summaries[summaries.length - 1]).toBe('Change 25');
    expect(summaries).not.toContain('Change 5');

    // Pruning is per page: another page's log is untouched
    const otherPageRows = await prisma.pageRevision.count({ where: { pageId } });
    expect(otherPageRows).toBeGreaterThan(0);
  });

  it('5. afterContentWrite without a summary stores the friendly text for the reason', async () => {
    const page = await prisma.page.create({
      data: { title: 'Summary Default', slug: 'summary-default', contentModel: 'structured', version: 1, published: true },
    });

    await afterContentWrite({ pageId: page.id, reason: 'item-create', authorId: adminId });
    const rev = await latestRevision(page.id);
    expect(rev?.snapshot).toEqual({ summary: 'Added a card' });
  });

  it('6. describeRevisionReason covers every reason string used by the code', () => {
    const expected: Record<string, string> = {
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
      'something-else': 'Updated the page',
      'constructor': 'Updated the page',
    };
    for (const [reason, text] of Object.entries(expected)) {
      expect(describeRevisionReason(reason)).toBe(text);
    }
  });

  it('7. the restore endpoint no longer exists (404) and changes nothing', async () => {
    const rev = await latestRevision(pageId);
    expect(rev).not.toBeNull();
    const itemsBefore = await prisma.pageItem.count({ where: { pageId } });

    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/revisions/${rev!.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: 1 });

    expect(res.status).toBe(404);
    expect(await prisma.pageItem.count({ where: { pageId } })).toBe(itemsBefore);
  });
});
