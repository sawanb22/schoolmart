import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Items Last Write Wins (no optimistic locking)', () => {
  let adminToken: string;
  let pageId: number;
  let testItemId: number;

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const page = await prisma.page.create({
      data: {
        title: 'Locking Test Hub',
        slug: 'locking-test-hub',
        contentModel: 'structured',
        pageData: {},
        version: 1,
        published: true,
      },
    });
    pageId = page.id;

    const item = await prisma.pageItem.create({
      data: {
        pageId,
        collection: 'cards',
        title: 'Concurrent Target Item',
        slug: 'concurrent-target-item',
        summary: 'Initial state',
        sortOrder: 0,
        published: true,
        data: {},
        detail: {},
        version: 1,
      },
    });
    testItemId = item.id;
  }, 60000);

  it('accepts PATCH with a stale version (200) and applies the change', async () => {
    const res = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 99999, // Stale/mismatched version is ignored
        title: 'Stale Edit',
      });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
    expect(res.body.id).toBe(testItemId);
    expect(res.body.title).toBe('Stale Edit');
    expect(res.body.version).toBe(2);

    const dbItem = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(dbItem?.title).toBe('Stale Edit');
    expect(dbItem?.version).toBe(2);
  });

  it('accepts PATCH without a version field', async () => {
    const res = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No Version Edit' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('No Version Edit');
    expect(res.body.version).toBe(3);
  });

  it('handles concurrent PATCHes: both succeed (200) and the item version counts both writes', async () => {
    const before = await prisma.pageItem.findUnique({ where: { id: testItemId } });

    const req1 = request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: before!.version, title: 'Writer 1' });

    const req2 = request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: before!.version, title: 'Writer 2' });

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const current = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(['Writer 1', 'Writer 2']).toContain(current?.title);
    expect(current?.version).toBe(before!.version + 2);
  });

  it('returns 404 when patching an item that is not on the page', async () => {
    const res = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/999999`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: 1, title: 'Nope' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('item_not_found');
  });

  it('accepts DELETE with a stale version (204) and deletes the item', async () => {
    const res = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${testItemId}?version=1`) // current version is higher
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const dbItem = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(dbItem).toBeNull();
  });

  it('returns 404 when deleting an item that no longer exists', async () => {
    const res = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('item_not_found');
  });
});
