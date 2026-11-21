import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Item & Category CMS Write Hooks (CmsState Version Increment)', () => {
  let adminToken: string;
  let pageId: number;

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const page = await prisma.page.create({
      data: {
        title: 'Hook Test Hub',
        slug: 'hook-test-hub',
        contentModel: 'structured',
        pageData: {},
        version: 1,
        published: true,
      },
    });
    pageId = page.id;
  }, 60000);

  async function getCmsVersion(): Promise<number> {
    const state = await prisma.cmsState.findUnique({ where: { id: 1 } });
    return state?.version ?? 0;
  }

  it('POST /:pageId/items bumps CmsState.version by exactly 1', async () => {
    const vBefore = await getCmsVersion();

    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Hook Item 1',
      });
    expect(res.status).toBe(201);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('PATCH /:pageId/items/:itemId bumps CmsState.version by exactly 1', async () => {
    const item = await prisma.pageItem.findFirst({ where: { pageId } });
    expect(item).not.toBeNull();

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${item!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: item!.version,
        title: 'Hook Item 1 Updated',
      });
    expect(res.status).toBe(200);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('PUT /:pageId/items/reorder bumps CmsState.version by exactly 1', async () => {
    // Add second item so we can reorder
    await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Hook Item 2',
      });

    const items = await prisma.pageItem.findMany({ where: { pageId, collection: 'cards' } });
    const orderedIds = [items[1].id, items[0].id];

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        orderedIds,
      });
    expect(res.status).toBe(200);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('DELETE /:pageId/items/:itemId bumps CmsState.version by exactly 1', async () => {
    const items = await prisma.pageItem.findMany({ where: { pageId } });
    const targetItem = items[0];

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .delete(`/api/admin/pages/${pageId}/items/${targetItem.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('POST /:pageId/categories bumps CmsState.version by exactly 1', async () => {
    const vBefore = await getCmsVersion();

    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hook Category' });
    expect(res.status).toBe(201);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('PATCH /:pageId/categories/:id bumps CmsState.version by exactly 1', async () => {
    const cat = await prisma.pageCategory.findFirst({ where: { pageId } });
    expect(cat).not.toBeNull();

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .patch(`/api/admin/pages/${pageId}/categories/${cat!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hook Category Renamed' });
    expect(res.status).toBe(200);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('DELETE /:pageId/categories/:id bumps CmsState.version by exactly 1', async () => {
    const cat = await prisma.pageCategory.findFirst({ where: { pageId } });
    expect(cat).not.toBeNull();

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .delete(`/api/admin/pages/${pageId}/categories/${cat!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });
});
