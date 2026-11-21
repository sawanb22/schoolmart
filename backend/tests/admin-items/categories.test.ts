import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Categories Management & Item Link Integrity', () => {
  let adminToken: string;
  let pageId: number;

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const page = await prisma.page.create({
      data: {
        title: 'Sports & Athletics Hub',
        slug: 'sports-and-athletics',
        contentModel: 'structured',
        pageData: {},
        version: 1,
        published: true,
      },
    });
    pageId = page.id;
  }, 60000);

  it('creates categories via POST /:pageId/categories and auto-slugifies', async () => {
    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Indoor Sports',
      });

    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe('Indoor Sports');
    expect(res.body.category.slug).toBe('indoor-sports');
    expect(res.body.category.sortOrder).toBe(0);
    expect(res.body.category.itemCount).toBe(0);

    // Duplicate name rejected with 409
    const dupRes = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Indoor Sports',
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toBe('slug_taken');
  });

  it('auto-creates category when assigning a new category name on item creation', async () => {
    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Synthetic Turf Ground',
        categories: ['Outdoor Fields'], // Not created beforehand!
      });

    expect(res.status).toBe(201);
    expect(res.body.categories).toEqual(['Outdoor Fields']);

    // Check category was auto-created in DB
    const autoCat = await prisma.pageCategory.findUnique({
      where: {
        pageId_slug: { pageId, slug: 'outdoor-fields' },
      },
    });
    expect(autoCat).not.toBeNull();
    expect(autoCat?.name).toBe('Outdoor Fields');
  });

  it('renames a category via PATCH and preserves existing item links', async () => {
    // 1. Get the 'Outdoor Fields' category
    const cat = await prisma.pageCategory.findUnique({
      where: { pageId_slug: { pageId, slug: 'outdoor-fields' } },
    });
    expect(cat).not.toBeNull();

    // 2. Rename category from 'Outdoor Fields' to 'Outdoor Athletics'
    const renameRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/categories/${cat!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Outdoor Athletics',
      });

    expect(renameRes.status).toBe(200);
    expect(renameRes.body.category.name).toBe('Outdoor Athletics');
    expect(renameRes.body.category.slug).toBe('outdoor-athletics');

    // 3. Verify item links are preserved: item GET returns new category name
    const itemsRes = await request(app)
      .get(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`);

    const item = itemsRes.body.items.find((it: any) => it.title === 'Synthetic Turf Ground');
    expect(item).toBeDefined();
    expect(item.categories).toEqual(['Outdoor Athletics']);
  });

  it('deletes a category via DELETE and cascades links while keeping items intact', async () => {
    // 1. Create a category 'Water Sports' and an item linked to it
    const catRes = await request(app)
      .post(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Water Sports' });
    const catId = catRes.body.category.id;

    const itemRes = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Olympic Swimming Pool',
        categories: ['Water Sports'],
      });
    const itemId = itemRes.body.id;

    // Verify join exists
    const joinsBefore = await prisma.pageItemCategory.findMany({
      where: { itemId, categoryId: catId },
    });
    expect(joinsBefore).toHaveLength(1);

    // 2. Delete the category
    const delRes = await request(app)
      .delete(`/api/admin/pages/${pageId}/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(204);

    // 3. Verify category is deleted
    const catAfter = await prisma.pageCategory.findUnique({ where: { id: catId } });
    expect(catAfter).toBeNull();

    // 4. Verify join is deleted
    const joinsAfter = await prisma.pageItemCategory.findMany({
      where: { itemId, categoryId: catId },
    });
    expect(joinsAfter).toHaveLength(0);

    // 5. Verify the item still exists!
    const itemAfter = await prisma.pageItem.findUnique({ where: { id: itemId } });
    expect(itemAfter).not.toBeNull();
    expect(itemAfter?.title).toBe('Olympic Swimming Pool');
  });

  it('lists categories with correct itemCount', async () => {
    const listRes = await request(app)
      .get(`/api/admin/pages/${pageId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.categories)).toBe(true);

    const outdoorCat = listRes.body.categories.find((c: any) => c.slug === 'outdoor-athletics');
    expect(outdoorCat).toBeDefined();
    expect(outdoorCat.itemCount).toBe(1); // 'Synthetic Turf Ground' is linked to it
  });
});
