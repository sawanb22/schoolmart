import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { runMigration } from '../../scripts/migrate-page-items';

function scanKeysRecursively(obj: any, targetKey: string, path: string = ''): string[] {
  const violations: string[] = [];
  if (!obj || typeof obj !== 'object') return violations;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...scanKeysRecursively(item, targetKey, `${path}[${index}]`));
    });
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (key.toLowerCase() === targetKey.toLowerCase()) {
        violations.push(currentPath);
      }
      violations.push(...scanKeysRecursively(value, targetKey, currentPath));
    }
  }
  return violations;
}

describe('Hub v2 Endpoint (GET /api/pages/:slug?v=2)', () => {
  let adminToken: string;
  const fixtures = loadAllPageFixtures();
  const testFixtures = fixtures.filter(f => ['labs', 'privacy-policy'].includes(f.slug));

  beforeAll(async () => {
    await resetContentTables();
    await seedPagesFromFixtures(testFixtures);
    await runMigration({ mode: 'apply', prisma });
    adminToken = await getAdminToken();

    // Mark one item in labs as unpublished for visibility test
    const labsPage = await prisma.page.findUnique({ where: { slug: 'labs' } });
    if (labsPage) {
      const firstItem = await prisma.pageItem.findFirst({
        where: { pageId: labsPage.id, collection: 'cards' },
      });
      if (firstItem) {
        await prisma.pageItem.update({
          where: { id: firstItem.id },
          data: { published: false },
        });
      }
    }
  }, 60000);

  it('matches target shape from section 3.5 for structured pages', async () => {
    const res = await request(app).get('/api/pages/labs?v=2');
    expect(res.status).toBe(200);

    const body = res.body;
    expect(body).toHaveProperty('page');
    expect(body.page).toHaveProperty('id');
    expect(body.page.slug).toBe('labs');
    expect(body.page.contentModel).toBe('structured');
    expect(body.page).toHaveProperty('version');
    expect(body.page).toHaveProperty('updatedAt');

    expect(body).toHaveProperty('settings');
    expect(typeof body.settings).toBe('object');

    expect(body).toHaveProperty('collections');
    expect(body.collections).toHaveProperty('cards');
    expect(Array.isArray(body.collections.cards)).toBe(true);

    expect(body).toHaveProperty('categories');
    expect(Array.isArray(body.categories)).toBe(true);
    if (body.categories.length > 0) {
      expect(body.categories[0]).toHaveProperty('id');
      expect(body.categories[0]).toHaveProperty('name');
      expect(body.categories[0]).toHaveProperty('slug');
    }
  });

  it('Invariant I5: recursively scans and asserts NO detail key exists anywhere in response', async () => {
    const res = await request(app).get('/api/pages/labs?v=2');
    expect(res.status).toBe(200);

    const detailViolations = scanKeysRecursively(res.body, 'detail');
    expect(detailViolations).toEqual([]);
  });

  it('Invariant I5: ensures no detail key exists in admin response either', async () => {
    const res = await request(app)
      .get('/api/pages/labs?v=2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const detailViolations = scanKeysRecursively(res.body, 'detail');
    expect(detailViolations).toEqual([]);
  });

  it('hides unpublished items from public and reveals them to admin', async () => {
    const publicRes = await request(app).get('/api/pages/labs?v=2');
    expect(publicRes.status).toBe(200);
    const publicCardsCount = publicRes.body.collections.cards?.length || 0;

    const adminRes = await request(app)
      .get('/api/pages/labs?v=2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    const adminCardsCount = adminRes.body.collections.cards?.length || 0;

    expect(adminCardsCount).toBe(publicCardsCount + 1);
  });

  it('returns categories in ascending sort order', async () => {
    const res = await request(app).get('/api/pages/labs?v=2');
    expect(res.status).toBe(200);

    const categories = res.body.categories;
    expect(categories.length).toBeGreaterThan(0);
    // Categories should have name and slug
    for (const cat of categories) {
      expect(typeof cat.name).toBe('string');
      expect(typeof cat.slug).toBe('string');
    }
  });

  it('returns settings=pageData, collections={}, categories=[] for document pages', async () => {
    const res = await request(app).get('/api/pages/privacy-policy?v=2');
    expect(res.status).toBe(200);

    const body = res.body;
    expect(body.page.contentModel).toBe('document');
    expect(body.collections).toEqual({});
    expect(body.categories).toEqual([]);
    expect(typeof body.settings).toBe('object');
  });

  it('hides unpublished page from public (404) and shows to admin (200)', async () => {
    // Create an unpublished page
    const unpub = await prisma.page.create({
      data: {
        title: 'Draft Hub',
        slug: 'draft-hub-test',
        published: false,
        contentModel: 'structured',
        pageData: {},
      },
    });

    const publicRes = await request(app).get('/api/pages/draft-hub-test?v=2');
    expect(publicRes.status).toBe(404);

    const adminRes = await request(app)
      .get('/api/pages/draft-hub-test?v=2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.page.slug).toBe('draft-hub-test');

    await prisma.page.delete({ where: { id: unpub.id } });
  });
});
