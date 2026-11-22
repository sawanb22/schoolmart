import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import { afterContentWrite } from '../../src/services/page-content/after-content-write';
import { REVISIONS_KEPT_PER_PAGE } from '../../src/services/page-content/constants';

describe('Admin Page Revisions & Restore (T13)', () => {
  let adminToken: string;
  let pageId: number;
  const pageSlug = 'labs';

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

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

  it('1. records a revision for each CMS write type with correct reason and snapshot', async () => {
    // 1a. Item Create
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

    let rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev).not.toBeNull();
    expect(rev?.reason).toBe('item-create');
    let snap: any = rev?.snapshot;
    expect(snap.items).toHaveLength(1);
    expect(snap.items[0].id).toBe(createdItemId);
    expect(snap.items[0].slug).toBe('physics-lab');

    // 1b. Item Update
    const updateItemRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: createItemRes.body.version,
        title: 'Modern Physics Lab',
      });
    expect(updateItemRes.status).toBe(200);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('item-update');
    snap = rev?.snapshot;
    expect(snap.items[0].title).toBe('Modern Physics Lab');

    // 1c. Category Create
    const createCatRes = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'STEM Equipment',
      });
    expect(createCatRes.status).toBe(201);
    const createdCatId = createCatRes.body.category.id;

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('category-create');
    snap = rev?.snapshot;
    expect(snap.categories.some((c: any) => c.id === createdCatId)).toBe(true);

    // 1d. Category Update
    const updateCatRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/categories/${createdCatId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Advanced STEM Equipment',
      });
    expect(updateCatRes.status).toBe(200);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('category-update');
    snap = rev?.snapshot;
    expect(snap.categories.some((c: any) => c.name === 'Advanced STEM Equipment')).toBe(true);

    // 1e. Reorder Items (Add second item first)
    const item2Res = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Chemistry Lab',
        slug: 'chemistry-lab',
      });
    expect(item2Res.status).toBe(201);
    const item2Id = item2Res.body.id;

    const reorderItemsRes = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        orderedIds: [item2Id, createdItemId],
      });
    expect(reorderItemsRes.status).toBe(200);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('reorder');

    // 1f. Reorder Categories (Add second category first)
    const cat2Res = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Robotics',
      });
    expect(cat2Res.status).toBe(201);
    const cat2Id = cat2Res.body.category.id;

    const reorderCatsRes = await request(app)
      .put(`/api/admin/pages/${pageId}/categories/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderedIds: [cat2Id, createdCatId],
      });
    expect(reorderCatsRes.status).toBe(200);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('category-reorder');

    // 1g. Item Delete
    const deleteItemRes = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${item2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteItemRes.status).toBe(204);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('item-delete');

    // 1h. Category Delete
    const deleteCatRes = await request(app)
      .delete(`/api/admin/pages/${pageId}/categories/${cat2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteCatRes.status).toBe(204);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('category-delete');

    // 1i. Settings Update on structured page
    const settingsRes = await request(app)
      .put(`/api/pages/${pageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pageData: {
          heroTitle: 'Updated Science Labs',
        },
      });
    expect(settingsRes.status).toBe(200);

    rev = await prisma.pageRevision.findFirst({
      where: { pageId },
      orderBy: { id: 'desc' },
    });
    expect(rev?.reason).toBe('settings');
  });

  it('2. GET /api/admin/pages/:pageId/revisions returns revisions ordered desc', async () => {
    const res = await request(app)
      .get(`/api/admin/pages/${pageId}/revisions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.revisions).toBeDefined();
    expect(Array.isArray(res.body.revisions)).toBe(true);
    expect(res.body.revisions.length).toBeGreaterThan(0);

    const first = res.body.revisions[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('version');
    expect(first).toHaveProperty('reason');
    expect(first).toHaveProperty('authorId');
    expect(first).toHaveProperty('createdAt');

    // Ensure sorted newest first
    for (let i = 1; i < res.body.revisions.length; i++) {
      const prev = new Date(res.body.revisions[i - 1].createdAt).getTime();
      const curr = new Date(res.body.revisions[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('3. prunes oldest revisions beyond 30 while strictly preserving pre-migration revisions', async () => {
    const testPage = await prisma.page.create({
      data: {
        title: 'Pruning Test Page',
        slug: 'prune-test-page',
        contentModel: 'structured',
        version: 1,
        published: true,
      },
    });

    // Create 2 pre-migration revisions
    const preMig1 = await prisma.pageRevision.create({
      data: {
        pageId: testPage.id,
        version: 1,
        reason: 'pre-migration',
        snapshot: { test: 'pre-migration-1' },
      },
    });
    const preMig2 = await prisma.pageRevision.create({
      data: {
        pageId: testPage.id,
        version: 1,
        reason: 'pre-migration',
        snapshot: { test: 'pre-migration-2' },
      },
    });

    // Write 35 normal revisions using afterContentWrite
    for (let i = 1; i <= 35; i++) {
      await afterContentWrite({
        pageId: testPage.id,
        reason: `item-update-${i}`,
      });
    }

    const allRevisions = await prisma.pageRevision.findMany({
      where: { pageId: testPage.id },
      orderBy: { id: 'asc' },
    });

    const preMigrationKept = allRevisions.filter(r => r.reason === 'pre-migration');
    const normalKept = allRevisions.filter(r => r.reason !== 'pre-migration');

    // Exactly REVISIONS_KEPT_PER_PAGE (30) normal revisions kept
    expect(normalKept).toHaveLength(REVISIONS_KEPT_PER_PAGE);

    // Both pre-migration revisions are strictly preserved
    expect(preMigrationKept).toHaveLength(2);
    expect(preMigrationKept.map(r => r.id)).toContain(preMig1.id);
    expect(preMigrationKept.map(r => r.id)).toContain(preMig2.id);

    // The oldest normal revisions (1..5) were pruned, while newest (6..35) remain
    expect(normalKept.some(r => r.reason === 'item-update-1')).toBe(false);
    expect(normalKept.some(r => r.reason === 'item-update-5')).toBe(false);
    expect(normalKept.some(r => r.reason === 'item-update-35')).toBe(true);
  });

  it('4. restore brings back deleted items with identical original IDs, slugs, and categories', async () => {
    // Create dedicated restore test page
    const page = await prisma.page.create({
      data: {
        title: 'Restore Target Hub',
        slug: 'restore-target-hub',
        contentModel: 'structured',
        version: 1,
        published: true,
        pageData: { heroTitle: 'Original Hero' },
      },
    });

    // Create item & category
    const catRes = await request(app)
      .post(`/api/admin/pages/${page.id}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Robotics Category' });
    expect(catRes.status).toBe(201);
    const catId = catRes.body.category.id;

    const itemRes = await request(app)
      .post(`/api/admin/pages/${page.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Microscopy Station',
        slug: 'microscopy-station',
        summary: 'High-res electron microscope',
        categories: ['Robotics Category'],
      });
    expect(itemRes.status).toBe(201);
    const itemId = itemRes.body.id;

    // Snapshot revision should now be created
    const revBeforeDelete = await prisma.pageRevision.findFirst({
      where: { pageId: page.id, reason: 'item-create' },
      orderBy: { id: 'desc' },
    });
    expect(revBeforeDelete).not.toBeNull();
    const revId = revBeforeDelete!.id;

    // Delete item and category
    const delItem = await request(app)
      .delete(`/api/admin/pages/${page.id}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delItem.status).toBe(204);

    const delCat = await request(app)
      .delete(`/api/admin/pages/${page.id}/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delCat.status).toBe(204);

    // Verify they are gone
    expect(await prisma.pageItem.findUnique({ where: { id: itemId } })).toBeNull();
    expect(await prisma.pageCategory.findUnique({ where: { id: catId } })).toBeNull();

    // Current page version has incremented after deletes
    const currentPage = await prisma.page.findUnique({ where: { id: page.id } });
    expect(currentPage).not.toBeNull();

    // Call restore endpoint
    const restoreRes = await request(app)
      .post(`/api/admin/pages/${page.id}/revisions/${revId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: currentPage!.version });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.page.id).toBe(page.id);
    expect(restoreRes.body.restoredRevisionId).toBe(revId);

    // Verify item and category were restored with IDENTICAL IDs and slugs
    const restoredItem = await prisma.pageItem.findUnique({
      where: { id: itemId },
      include: { categories: { include: { category: true } } },
    });
    expect(restoredItem).not.toBeNull();
    expect(restoredItem?.id).toBe(itemId);
    expect(restoredItem?.slug).toBe('microscopy-station');
    expect(restoredItem?.title).toBe('Microscopy Station');
    expect(restoredItem?.categories).toHaveLength(1);
    expect(restoredItem?.categories[0].category.id).toBe(catId);
    expect(restoredItem?.categories[0].category.name).toBe('Robotics Category');

    // 5. Public route works cleanly after restore
    const publicItemRes = await request(app).get(`/api/pages/restore-target-hub/items/microscopy-station`);
    expect(publicItemRes.status).toBe(200);
    expect(publicItemRes.body.item.title).toBe('Microscopy Station');

    // 6. Restored items have version bumped: stale PATCH returns 409
    const stalePatchRes = await request(app)
      .patch(`/api/admin/pages/${page.id}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 1, // Stale version (pre-restore version was 1, restored version is higher)
        title: 'Conflicting Patch',
      });
    expect(stalePatchRes.status).toBe(409);
    expect(stalePatchRes.body.error).toBe('version_conflict');

    // 7. Postgres sequences healthy: subsequent item creation gets non-colliding ID
    const newItemRes = await request(app)
      .post(`/api/admin/pages/${page.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'New Chemistry Station',
        slug: 'new-chem-station',
      });
    expect(newItemRes.status).toBe(201);
    expect(newItemRes.body.id).toBeGreaterThan(itemId);

    // Also verify category sequence health
    const newCatRes = await request(app)
      .post(`/api/admin/pages/${page.id}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Biology Category',
      });
    expect(newCatRes.status).toBe(201);
    expect(newCatRes.body.category.id).toBeGreaterThan(catId);
  });

  it('8. restore with stale page version returns HTTP 409 version_conflict', async () => {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    expect(page).not.toBeNull();

    const revisions = await prisma.pageRevision.findMany({
      where: { pageId },
      take: 1,
    });
    expect(revisions.length).toBeGreaterThan(0);
    const targetRevId = revisions[0].id;

    // Send stale version
    const staleVersion = page!.version + 999;
    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/revisions/${targetRevId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: staleVersion });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('version_conflict');
    expect(res.body.current).toBe(page!.version);
  });
});
