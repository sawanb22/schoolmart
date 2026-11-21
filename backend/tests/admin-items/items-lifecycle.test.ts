import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Items Lifecycle (CRUD & Card Representation)', () => {
  let adminToken: string;
  let structuredPageId: number;
  let documentPageId: number;

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    // Create a structured page
    const structuredPage = await prisma.page.create({
      data: {
        title: 'Innovation Hub',
        slug: 'innovation-hub',
        contentModel: 'structured',
        pageData: { hero: { title: 'Innovation' } },
        version: 1,
        published: true,
      },
    });
    structuredPageId = structuredPage.id;

    // Create a document page
    const documentPage = await prisma.page.create({
      data: {
        title: 'Terms of Use',
        slug: 'terms-of-use',
        contentModel: 'document',
        pageData: { body: 'Document body' },
        version: 1,
        published: true,
      },
    });
    documentPageId = documentPage.id;
  }, 60000);

  it('creates an item with explicit fields and returns 201 ItemFull with card', async () => {
    const res = await request(app)
      .post(`/api/admin/pages/${structuredPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Robotics Workshop Suite',
        slug: 'robotics-workshop-suite',
        summary: 'Comprehensive hands-on robotics equipment',
        imageUrl: '/uploads/robotics-suite.png',
        href: '/labs/robotics-workshop-suite',
        badge: 'Featured',
        categories: ['STEM', 'Robotics'],
        data: { equipmentCount: 24, difficulty: 'advanced' },
        detail: {
          detailContent: '<p>Standard robotics workshop specifications.</p>',
          deliverables: ['Robotic Arm', 'Sensor Kit'],
        },
        published: true,
      });

    expect(res.status).toBe(201);
    const item = res.body;
    expect(item).toHaveProperty('id');
    expect(item.title).toBe('Robotics Workshop Suite');
    expect(item.slug).toBe('robotics-workshop-suite');
    expect(item.collection).toBe('cards');
    expect(item.summary).toBe('Comprehensive hands-on robotics equipment');
    expect(item.imageUrl).toBe('/uploads/robotics-suite.png');
    expect(item.badge).toBe('Featured');
    expect(item.categories).toEqual(['STEM', 'Robotics']);
    expect(item.version).toBe(1);
    expect(item.published).toBe(true);
    expect(item.data.equipmentCount).toBe(24);
    expect(item.detail.detailContent).toBe('<p>Standard robotics workshop specifications.</p>');

    // Check embedded legacy card object
    expect(item).toHaveProperty('card');
    expect(item.card.title).toBe('Robotics Workshop Suite');
    expect(item.card.description).toBe('Comprehensive hands-on robotics equipment');
    expect(item.card.image).toBe('/uploads/robotics-suite.png');
    expect(item.card.categories).toEqual(['STEM', 'Robotics']);
    expect(item.card.detailContent).toBe('<p>Standard robotics workshop specifications.</p>');
    expect(item.card.equipmentCount).toBe(24);
  });

  it('creates an item using a legacy card input and splits it properly', async () => {
    const res = await request(app)
      .post(`/api/admin/pages/${structuredPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        card: {
          title: '3D Prototyping Station',
          description: 'High-precision dual extruder 3D printing lab',
          image: '/uploads/3d-station.png',
          href: '/labs/3d-station',
          categories: ['Prototyping'],
          detailContent: '<p>Complete rapid prototyping setup.</p>',
          software: 'Cura / PrusaSlicer',
        },
      });

    expect(res.status).toBe(201);
    const item = res.body;
    expect(item.title).toBe('3D Prototyping Station');
    expect(item.slug).toBe('3d-prototyping-station');
    expect(item.summary).toBe('High-precision dual extruder 3D printing lab');
    expect(item.imageUrl).toBe('/uploads/3d-station.png');
    expect(item.categories).toEqual(['Prototyping']);
    expect(item.detail.detailContent).toBe('<p>Complete rapid prototyping setup.</p>');
    expect(item.data.software).toBe('Cura / PrusaSlicer');
    expect(item.card.title).toBe('3D Prototyping Station');
    expect(item.card.description).toBe('High-precision dual extruder 3D printing lab');
  });

  it('returns 400 page_not_structured when attempting to add item to document page', async () => {
    const res = await request(app)
      .post(`/api/admin/pages/${documentPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Disallowed Item',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('page_not_structured');
  });

  it('lists items with ?format=card and preserves round-trip fidelity', async () => {
    const res = await request(app)
      .get(`/api/admin/pages/${structuredPageId}/items?format=card`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);

    for (const item of res.body.items) {
      expect(item).toHaveProperty('card');
      expect(item.card).toBeTypeOf('object');
      expect(item.card.title).toBe(item.title);
      expect(item.card.description).toBe(item.summary);
      expect(item.card.image).toBe(item.imageUrl);
      expect(item.card.categories).toEqual(item.categories);
    }
  });

  it('lists items without format=card and excludes the card property', async () => {
    const res = await request(app)
      .get(`/api/admin/pages/${structuredPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    for (const item of res.body.items) {
      expect(item.card).toBeUndefined();
    }
  });

  it('filters items by ?collection=', async () => {
    // Add an item in faqs collection
    await request(app)
      .post(`/api/admin/pages/${structuredPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'faqs',
        title: 'How to book a lab session?',
        data: { answer: '<p>Contact the administrator.</p>' },
      });

    const resFaqs = await request(app)
      .get(`/api/admin/pages/${structuredPageId}/items?collection=faqs`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resFaqs.status).toBe(200);
    expect(resFaqs.body.items.length).toBe(1);
    expect(resFaqs.body.items[0].collection).toBe('faqs');

    const resCards = await request(app)
      .get(`/api/admin/pages/${structuredPageId}/items?collection=cards`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCards.status).toBe(200);
    expect(resCards.body.items.every((it: any) => it.collection === 'cards')).toBe(true);
  });

  it('patches item fields and updates version', async () => {
    const itemsRes = await request(app)
      .get(`/api/admin/pages/${structuredPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`);
    const targetItem = itemsRes.body.items[0];

    const patchRes = await request(app)
      .patch(`/api/admin/pages/${structuredPageId}/items/${targetItem.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: targetItem.version,
        title: `${targetItem.title} (Updated)`,
        summary: 'Updated summary field',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.title).toBe(`${targetItem.title} (Updated)`);
    expect(patchRes.body.summary).toBe('Updated summary field');
    expect(patchRes.body.version).toBe(targetItem.version + 1);
    expect(patchRes.body.card.title).toBe(`${targetItem.title} (Updated)`);
  });

  it('deletes an item and returns 204', async () => {
    // Create an item to delete
    const createRes = await request(app)
      .post(`/api/admin/pages/${structuredPageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Temporary Item To Delete',
      });
    expect(createRes.status).toBe(201);
    const itemToDelete = createRes.body;

    const deleteRes = await request(app)
      .delete(`/api/admin/pages/${structuredPageId}/items/${itemToDelete.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);

    // Verify item is gone
    const checkRes = await prisma.pageItem.findUnique({
      where: { id: itemToDelete.id },
    });
    expect(checkRes).toBeNull();
  });

  it('returns 404 when targeting a non-existent page or item', async () => {
    const nonExistentPage = await request(app)
      .get('/api/admin/pages/999999/items')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(nonExistentPage.status).toBe(404);

    const nonExistentItem = await request(app)
      .patch(`/api/admin/pages/${structuredPageId}/items/999999`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: 1, title: 'Non-existent' });
    expect(nonExistentItem.status).toBe(404);
  });
});
