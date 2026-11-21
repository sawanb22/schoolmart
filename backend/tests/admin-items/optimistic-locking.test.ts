import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Items Optimistic Concurrency Locking', () => {
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

  it('rejects PATCH with stale version returning 409 and current state', async () => {
    const res = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 99999, // Stale/mismatched version
        title: 'Stale Edit',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('version_conflict');
    expect(res.body).toHaveProperty('current');
    expect(res.body.current.id).toBe(testItemId);
    expect(res.body.current.version).toBe(1);
    expect(res.body.current.title).toBe('Concurrent Target Item');
    expect(res.body.current).toHaveProperty('card');

    // Confirm DB is unchanged
    const dbItem = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(dbItem?.title).toBe('Concurrent Target Item');
    expect(dbItem?.version).toBe(1);
  });

  it('handles concurrent PATCHes with the same version: exactly one succeeds (200) and one conflicts (409)', async () => {
    // Both requests use the current version (1)
    const req1 = request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 1,
        title: 'Winner 1',
      });

    const req2 = request(app)
      .patch(`/api/admin/pages/${pageId}/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 1,
        title: 'Winner 2',
      });

    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status].sort();

    // Exactly one 200 and one 409
    expect(statuses).toEqual([200, 409]);

    const winner = res1.status === 200 ? res1 : res2;
    const loser = res1.status === 409 ? res1 : res2;

    expect(winner.body.version).toBe(2);
    expect(loser.body.error).toBe('version_conflict');
    expect(loser.body.current.version).toBe(2);

    // Verify DB version is now 2
    const current = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(current?.version).toBe(2);
  });

  it('rejects DELETE with a stale version returning 409 and current state', async () => {
    const res = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${testItemId}?version=1`) // current version is 2
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('version_conflict');
    expect(res.body.current.version).toBe(2);

    // Verify item still exists in database
    const dbItem = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(dbItem).not.toBeNull();
  });

  it('allows DELETE with matching version returning 204', async () => {
    const res = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${testItemId}?version=2`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const dbItem = await prisma.pageItem.findUnique({ where: { id: testItemId } });
    expect(dbItem).toBeNull();
  });
});
