import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { runMigration } from '../../scripts/migrate-page-items';

describe('Hub Item Endpoint (GET /api/pages/:slug/items/:itemSlug)', () => {
  let adminToken: string;
  const fixtures = loadAllPageFixtures();
  const testFixtures = fixtures.filter(f => ['labs', 'sports-infra'].includes(f.slug));

  beforeAll(async () => {
    await resetContentTables();
    await seedPagesFromFixtures(testFixtures);
    await runMigration({ mode: 'apply', prisma });
    adminToken = await getAdminToken();

    // 1. Create a redirect in SlugRedirect
    await prisma.slugRedirect.create({
      data: {
        fromPath: '/labs/old-composite-lab',
        toPath: '/labs/composite-skill-lab',
      },
    });

    // 2. Mark one specific item as unpublished
    const sportsPage = await prisma.page.findUnique({ where: { slug: 'sports-infra' } });
    if (sportsPage) {
      const firstSportItem = await prisma.pageItem.findFirst({
        where: { pageId: sportsPage.id },
      });
      if (firstSportItem) {
        await prisma.pageItem.update({
          where: { id: firstSportItem.id },
          data: { published: false },
        });
      }
    }
  }, 60000);

  it('resolves item by exact slug match', async () => {
    const labsPage = await prisma.page.findUnique({
      where: { slug: 'labs' },
      include: { items: true },
    });
    const targetItem = labsPage?.items[0];
    expect(targetItem).toBeDefined();

    const res = await request(app).get(`/api/pages/labs/items/${targetItem!.slug}`);
    expect(res.status).toBe(200);

    const body = res.body;
    expect(body).toHaveProperty('hub');
    expect(body.hub.slug).toBe('labs');
    expect(body.hub).toHaveProperty('title');
    expect(body.hub).toHaveProperty('template');
    expect(body.hub).toHaveProperty('heroImage');
    expect(body.hub).toHaveProperty('cta');
    expect(body.hub.cta).toHaveProperty('ctaTitle');

    expect(body).toHaveProperty('item');
    expect(body.item.id).toBe(targetItem!.id);
    expect(body.item.slug).toBe(targetItem!.slug);
    expect(body.item).toHaveProperty('detail');
    expect(body.item).toHaveProperty('version');
    expect(body.item).toHaveProperty('updatedAt');
  });

  it('resolves item via SlugRedirect and returns redirectTo', async () => {
    const res = await request(app).get('/api/pages/labs/items/old-composite-lab');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirectTo: '/labs/composite-skill-lab' });
  });

  it('resolves item via fallback to title-slug', async () => {
    // Create an item with a custom slug that differs from its title-slug
    const labsPage = await prisma.page.findUnique({ where: { slug: 'labs' } });
    const fallbackItem = await prisma.pageItem.create({
      data: {
        pageId: labsPage!.id,
        collection: 'cards',
        slug: 'custom-unique-code-123',
        title: 'Super Advanced Robotics Lab',
        summary: 'Robotics lab summary',
        published: true,
      },
    });

    // Request using slugified title: 'super-advanced-robotics-lab'
    const res = await request(app).get('/api/pages/labs/items/super-advanced-robotics-lab');
    expect(res.status).toBe(200);
    expect(res.body.item.id).toBe(fallbackItem.id);
    expect(res.body.item.slug).toBe('custom-unique-code-123');

    await prisma.pageItem.delete({ where: { id: fallbackItem.id } });
  });

  it('resolves item via fallback to href leaf segment', async () => {
    const labsPage = await prisma.page.findUnique({ where: { slug: 'labs' } });
    const hrefItem = await prisma.pageItem.create({
      data: {
        pageId: labsPage!.id,
        collection: 'cards',
        slug: 'href-mismatch-slug',
        title: 'Arbitrary Title Here',
        href: '/labs/special-href-target',
        published: true,
      },
    });

    // Request using leaf of href: 'special-href-target'
    const res = await request(app).get('/api/pages/labs/items/special-href-target');
    expect(res.status).toBe(200);
    expect(res.body.item.id).toBe(hrefItem.id);

    await prisma.pageItem.delete({ where: { id: hrefItem.id } });
  });

  it('hides unpublished item from public (404) and allows admin (200)', async () => {
    const sportsPage = await prisma.page.findUnique({ where: { slug: 'sports-infra' } });
    const unpubItem = await prisma.pageItem.findFirst({
      where: { pageId: sportsPage!.id, published: false },
    });
    expect(unpubItem).toBeDefined();

    const publicRes = await request(app).get(`/api/pages/sports-infra/items/${unpubItem!.slug}`);
    expect(publicRes.status).toBe(404);
    expect(publicRes.body).toEqual({ error: 'not_found' });

    const adminRes = await request(app)
      .get(`/api/pages/sports-infra/items/${unpubItem!.slug}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.item.id).toBe(unpubItem!.id);
  });

  it('returns 404 for unknown hub or missing item', async () => {
    const unknownHubRes = await request(app).get('/api/pages/nonexistent-hub/items/any-slug');
    expect(unknownHubRes.status).toBe(404);
    expect(unknownHubRes.body).toEqual({ error: 'not_found' });

    const missingItemRes = await request(app).get('/api/pages/labs/items/nonexistent-item-xyz');
    expect(missingItemRes.status).toBe(404);
    expect(missingItemRes.body).toEqual({ error: 'not_found' });
  });

  it('resolves aliases correctly (e.g. /sports/items/:itemSlug -> /sports-infra)', async () => {
    const sportsPage = await prisma.page.findUnique({
      where: { slug: 'sports-infra' },
      include: { items: { where: { published: true } } },
    });
    const pubItem = sportsPage?.items[0];
    expect(pubItem).toBeDefined();

    // Request via alias 'sports'
    const res = await request(app).get(`/api/pages/sports/items/${pubItem!.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.hub.slug).toBe('sports-infra');
    expect(res.body.item.id).toBe(pubItem!.id);
  });
});
