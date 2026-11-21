import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { runMigration } from '../../scripts/migrate-page-items';
import { parsePageData } from '../../src/lib/page-data';

describe('Legacy Write Adapter (PUT /api/pages/:id)', () => {
  let adminToken: string;
  const fixtures = loadAllPageFixtures();
  const labsFixture = fixtures.filter(f => f.slug === 'labs');

  beforeAll(async () => {
    adminToken = await getAdminToken();
  }, 30000);

  beforeEach(async () => {
    await resetContentTables();
    await seedPagesFromFixtures(labsFixture);
    await runMigration({ mode: 'apply', pages: ['labs'], prisma });
  }, 30000);

  it('PUT full legacy blob preserves unchanged item IDs, creates new item, deletes removed item', async () => {
    const labsPage = await prisma.page.findUnique({
      where: { slug: 'labs' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(labsPage).toBeDefined();
    const initialItems = labsPage!.items;
    expect(initialItems.length).toBeGreaterThan(1);

    const keptItem = initialItems[0];
    const removedItem = initialItems[1];

    // Fetch current legacy representation
    const getRes = await request(app)
      .get(`/api/pages/${labsPage!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);

    const legacyBlob = JSON.parse(getRes.body.pageData);
    expect(Array.isArray(legacyBlob.cards)).toBe(true);

    // Modify cards: keep first card, remove second card, add a brand new card
    const updatedCards = [
      legacyBlob.cards[0], // kept
      {
        title: 'Brand New Innovation Hub',
        slug: 'brand-new-innovation-hub',
        description: 'New lab created via legacy write adapter',
        image: '/uploads/new-lab.png',
        categories: ['Innovation'],
      },
    ];
    legacyBlob.cards = updatedCards;

    // Send PUT with modified legacy blob
    const putRes = await request(app)
      .put(`/api/pages/${labsPage!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: labsPage!.title,
        slug: labsPage!.slug,
        pageData: legacyBlob,
        version: labsPage!.version,
      });
    expect(putRes.status).toBe(200);

    // Verify database state
    const afterItems = await prisma.pageItem.findMany({
      where: { pageId: labsPage!.id },
      orderBy: { sortOrder: 'asc' },
    });
    expect(afterItems.length).toBe(2);

    // 1. Kept item retains its original ID
    const foundKept = afterItems.find(it => it.slug === keptItem.slug);
    expect(foundKept).toBeDefined();
    expect(foundKept!.id).toBe(keptItem.id);

    // 2. Removed item is deleted
    const foundRemoved = afterItems.find(it => it.id === removedItem.id);
    expect(foundRemoved).toBeUndefined();

    // 3. New item is created
    const foundNew = afterItems.find(it => it.slug === 'brand-new-innovation-hub');
    expect(foundNew).toBeDefined();
    expect(foundNew!.title).toBe('Brand New Innovation Hub');

    // Page version incremented
    expect(putRes.body.version).toBe(labsPage!.version + 1);
  });

  it('PUT with settings only leaves items completely untouched', async () => {
    const labsPage = await prisma.page.findUnique({
      where: { slug: 'labs' },
      include: { items: true },
    });
    const beforeItems = labsPage!.items;

    // Send PUT with settings only (hero subtitle changed, no cards or collections)
    const settingsOnly = {
      hero: {
        title: 'Updated Hero Title',
        subtitle: 'Changed via settings-only write',
      },
      customSettingKey: 'active',
    };

    const putRes = await request(app)
      .put(`/api/pages/${labsPage!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pageData: settingsOnly,
        version: labsPage!.version,
      });
    expect(putRes.status).toBe(200);

    // Items in database should be identical in count and IDs
    const afterItems = await prisma.pageItem.findMany({
      where: { pageId: labsPage!.id },
    });
    expect(afterItems.length).toBe(beforeItems.length);
    expect(new Set(afterItems.map(i => i.id))).toEqual(new Set(beforeItems.map(i => i.id)));

    // Settings in page.pageData updated
    const updatedPage = await prisma.page.findUnique({ where: { id: labsPage!.id } });
    const savedSettings = parsePageData(updatedPage!.pageData);
    expect((savedSettings.hero as any)?.title).toBe('Updated Hero Title');
    expect(savedSettings.customSettingKey).toBe('active');
  });

  it('version mismatch returns HTTP 409 version_conflict with current page', async () => {
    const labsPage = await prisma.page.findUnique({ where: { slug: 'labs' } });
    const staleVersion = labsPage!.version - 1; // deliberate mismatch

    const res = await request(app)
      .put(`/api/pages/${labsPage!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Conflicting Edit',
        version: staleVersion,
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'version_conflict');
    expect(res.body).toHaveProperty('current');
    expect(res.body.current.version).toBe(labsPage!.version);
    expect(res.body.current.slug).toBe('labs');
  });

  it('every successful write increments page version', async () => {
    const labsPage = await prisma.page.findUnique({ where: { slug: 'labs' } });
    const initialVersion = labsPage!.version;

    const res1 = await request(app)
      .put(`/api/pages/${labsPage!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Title 1',
        version: initialVersion,
      });
    expect(res1.status).toBe(200);
    expect(res1.body.version).toBe(initialVersion + 1);

    const res2 = await request(app)
      .put(`/api/pages/${labsPage!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Title 2',
        version: res1.body.version,
      });
    expect(res2.status).toBe(200);
    expect(res2.body.version).toBe(initialVersion + 2);
  });
});
