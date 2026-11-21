import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Items & Categories Reordering', () => {
  let adminToken: string;
  let pageId: number;
  let itemIds: number[] = [];
  let categoryIds: number[] = [];

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const page = await prisma.page.create({
      data: {
        title: 'Reorder Test Hub',
        slug: 'reorder-test-hub',
        contentModel: 'structured',
        pageData: {},
        version: 1,
        published: true,
      },
    });
    pageId = page.id;

    // Create 3 items in 'cards'
    for (let i = 0; i < 3; i++) {
      const it = await prisma.pageItem.create({
        data: {
          pageId,
          collection: 'cards',
          title: `Item ${i + 1}`,
          slug: `item-${i + 1}`,
          sortOrder: i,
          published: true,
          data: {},
          detail: {},
          version: 1,
        },
      });
      itemIds.push(it.id);
    }

    // Create 3 categories
    for (let i = 0; i < 3; i++) {
      const cat = await prisma.pageCategory.create({
        data: {
          pageId,
          name: `Category ${i + 1}`,
          slug: `category-${i + 1}`,
          sortOrder: i,
        },
      });
      categoryIds.push(cat.id);
    }
  }, 60000);

  it('reorders items and ensures contiguous 0..n-1 sortOrder', async () => {
    // Reverse the order: [itemIds[2], itemIds[1], itemIds[0]]
    const reversedIds = [itemIds[2], itemIds[1], itemIds[0]];

    const res = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        orderedIds: reversedIds,
      });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);

    const dbItems = await prisma.pageItem.findMany({
      where: { pageId, collection: 'cards' },
      orderBy: { sortOrder: 'asc' },
    });

    expect(dbItems.map(it => it.id)).toEqual(reversedIds);
    expect(dbItems.map(it => it.sortOrder)).toEqual([0, 1, 2]);
  });

  it('rejects item reorder with invalid ID sets (missing or duplicate IDs) returning 400', async () => {
    // Missing one ID
    const resMissing = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        orderedIds: [itemIds[0], itemIds[1]],
      });
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error).toBe('invalid_ordered_ids');

    // Duplicate ID
    const resDuplicate = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        orderedIds: [itemIds[0], itemIds[0], itemIds[1]],
      });
    expect(resDuplicate.status).toBe(400);

    // Foreign ID not belonging to page
    const resForeign = await request(app)
      .put(`/api/admin/pages/${pageId}/items/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        orderedIds: [itemIds[0], itemIds[1], 99999],
      });
    expect(resForeign.status).toBe(400);
  });

  it('reorders categories and ensures contiguous 0..n-1 sortOrder', async () => {
    // Reorder categories: [categoryIds[1], categoryIds[2], categoryIds[0]]
    const newOrder = [categoryIds[1], categoryIds[2], categoryIds[0]];

    const res = await request(app)
      .put(`/api/admin/pages/${pageId}/categories/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderedIds: newOrder,
      });

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(3);

    const dbCategories = await prisma.pageCategory.findMany({
      where: { pageId },
      orderBy: { sortOrder: 'asc' },
    });

    expect(dbCategories.map(c => c.id)).toEqual(newOrder);
    expect(dbCategories.map(c => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it('rejects category reorder with missing or foreign IDs returning 400', async () => {
    const resMissing = await request(app)
      .put(`/api/admin/pages/${pageId}/categories/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderedIds: [categoryIds[0]],
      });
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error).toBe('invalid_ordered_ids');

    const resForeign = await request(app)
      .put(`/api/admin/pages/${pageId}/categories/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderedIds: [categoryIds[0], categoryIds[1], 88888],
      });
    expect(resForeign.status).toBe(400);
  });
});
