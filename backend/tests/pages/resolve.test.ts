import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Path Resolution Endpoint (GET /api/pages/resolve)', () => {
  let adminToken: string;

  beforeEach(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    // 1. Exact page: labs
    const labsPage = await prisma.page.create({
      data: {
        title: 'Labs & Innovation',
        slug: 'labs',
        template: 'hub',
        contentModel: 'structured',
        published: true,
        pageData: { hero: { title: 'Labs Hero' } },
        items: {
          create: [
            {
              slug: 'chemistry-lab',
              collection: 'cards',
              title: 'Chemistry Laboratory',
              summary: 'Modern chemistry equipment',
              published: true,
              sortOrder: 0,
            },
            {
              slug: 'physics-lab-legacy',
              collection: 'cards',
              title: 'Physics Lab Title',
              summary: 'Physics equipment',
              href: '/labs/physics-lab-leaf',
              published: true,
              sortOrder: 1,
            },
            {
              slug: 'draft-item',
              collection: 'cards',
              title: 'Draft Lab Item',
              published: false,
              sortOrder: 2,
            },
          ],
        },
      },
    });

    // 2. Prefixes
    await prisma.page.createMany({
      data: [
        {
          title: '50 Global Resources',
          slug: 'guide-50-resources',
          template: 'article',
          contentModel: 'document',
          published: true,
          pageData: { title: '50 Global Resources' },
        },
        {
          title: 'Eco Innovation',
          slug: 'environment-green',
          template: 'article',
          contentModel: 'document',
          published: true,
          pageData: { title: 'Eco Innovation' },
        },
        {
          title: 'Lab Kit Guide',
          slug: 'resource-lab-kit',
          template: 'article',
          contentModel: 'document',
          published: true,
          pageData: { title: 'Lab Kit Guide' },
        },
      ],
    });

    // 3. Aliases: sports-infra & sell-on-campusmart
    await prisma.page.createMany({
      data: [
        {
          title: 'Sports Infrastructure',
          slug: 'sports-infra',
          template: 'hub',
          contentModel: 'structured',
          published: true,
          pageData: { hero: { title: 'Sports Infra' } },
        },
        {
          title: 'Sell On CampusMart',
          slug: 'sell-on-campusmart',
          template: 'document',
          contentModel: 'document',
          published: true,
          pageData: { title: 'Vendor Onboarding' },
        },
      ],
    });

    // 4. Standalone two-segment pages: stem-robotics (h-i) & privacy-policy (i)
    await prisma.page.createMany({
      data: [
        {
          title: 'STEM Robotics',
          slug: 'stem-robotics',
          template: 'article',
          contentModel: 'document',
          published: true,
          pageData: { title: 'Robotics' },
        },
        {
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          template: 'document',
          contentModel: 'document',
          published: true,
          pageData: { title: 'Privacy' },
        },
      ],
    });

    // 5. Unpublished page
    await prisma.page.create({
      data: {
        title: 'Draft Secret Page',
        slug: 'draft-secret',
        template: 'document',
        contentModel: 'document',
        published: false,
        pageData: { title: 'Secret' },
      },
    });

    // 6. Redirects (single-segment and two-segment)
    await prisma.slugRedirect.createMany({
      data: [
        {
          fromPath: '/old-about',
          toPath: '/about',
        },
        {
          fromPath: '/labs/old-chem',
          toPath: '/labs/chemistry-lab',
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Resolves single-segment exact page', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/labs');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('page');
    expect(res.body.slug).toBe('labs');
    expect(res.body.template).toBe('hub');
    expect(res.body.contentModel).toBe('structured');
    expect(res.body.page).toBeDefined();
    expect(res.body.page.slug).toBe('labs');
  });

  it('Resolves single-segment prefixes (guide-, environment-, resource-)', async () => {
    // guide-
    const resGuide = await request(app).get('/api/pages/resolve?path=/50-resources');
    expect(resGuide.status).toBe(200);
    expect(resGuide.body.type).toBe('page');
    expect(resGuide.body.slug).toBe('guide-50-resources');

    // environment-
    const resEnv = await request(app).get('/api/pages/resolve?path=/green');
    expect(resEnv.status).toBe(200);
    expect(resEnv.body.type).toBe('page');
    expect(resEnv.body.slug).toBe('environment-green');

    // resource-
    const resRes = await request(app).get('/api/pages/resolve?path=/lab-kit');
    expect(resRes.status).toBe(200);
    expect(resRes.body.type).toBe('page');
    expect(resRes.body.slug).toBe('resource-lab-kit');
  });

  it('Resolves single-segment aliases (sports <-> sports-infra, sell-on-schoolmart <-> sell-on-campusmart)', async () => {
    const resSports = await request(app).get('/api/pages/resolve?path=/sports');
    expect(resSports.status).toBe(200);
    expect(resSports.body.type).toBe('page');
    expect(resSports.body.slug).toBe('sports-infra');

    const resSell = await request(app).get('/api/pages/resolve?path=/sell-on-schoolmart');
    expect(resSell.status).toBe(200);
    expect(resSell.body.type).toBe('page');
    expect(resSell.body.slug).toBe('sell-on-campusmart');
  });

  it('Resolves single-segment redirect', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/old-about');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('redirect');
    expect(res.body.redirectTo).toBe('/about');
  });

  it('Resolves /p/<slug> with leading /p/ stripped', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/p/labs');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('page');
    expect(res.body.slug).toBe('labs');
  });

  it('Unpublished page is 404 not_found for public, but resolves for admin', async () => {
    const publicRes = await request(app).get('/api/pages/resolve?path=/draft-secret');
    expect(publicRes.status).toBe(404);
    expect(publicRes.body.type).toBe('not_found');

    const adminRes = await request(app)
      .get('/api/pages/resolve?path=/draft-secret')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.type).toBe('page');
    expect(adminRes.body.slug).toBe('draft-secret');
  });

  it('Resolves two-segment standalone h-i page', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/stem/robotics');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('page');
    expect(res.body.slug).toBe('stem-robotics');
  });

  it('Resolves two-segment standalone i page (UniversalArticleDetail behaviour)', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/legal/privacy-policy');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('page');
    expect(res.body.slug).toBe('privacy-policy');
  });

  it('Resolves two-segment hub item (exact and fallback leaf match)', async () => {
    // Exact slug match
    const resExact = await request(app).get('/api/pages/resolve?path=/labs/chemistry-lab');
    expect(resExact.status).toBe(200);
    expect(resExact.body.type).toBe('item');
    expect(resExact.body.hubSlug).toBe('labs');
    expect(resExact.body.itemSlug).toBe('chemistry-lab');
    expect(resExact.body.hubTemplate).toBe('hub');

    // Fallback match on href leaf
    const resLeaf = await request(app).get('/api/pages/resolve?path=/labs/physics-lab-leaf');
    expect(resLeaf.status).toBe(200);
    expect(resLeaf.body.type).toBe('item');
    expect(resLeaf.body.hubSlug).toBe('labs');
    expect(resLeaf.body.itemSlug).toBe('physics-lab-legacy');
  });

  it('Returns itemSlug: null when hub exists but item is not found', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/labs/unknown-lab-gadget');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('item');
    expect(res.body.hubSlug).toBe('labs');
    expect(res.body.itemSlug).toBeNull();
    expect(res.body.hubTemplate).toBe('hub');
  });

  it('Resolves two-segment redirect', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/labs/old-chem');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('redirect');
    expect(res.body.redirectTo).toBe('/labs/chemistry-lab');
  });

  it('Completely unknown path returns 404 not_found', async () => {
    const res = await request(app).get('/api/pages/resolve?path=/nonexistent/nowhere');
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('not_found');
  });

  it('Asserts database query count is <= 3 per resolution', async () => {
    let queryCount = 0;

    const spyPageFindMany = vi.spyOn(prisma.page, 'findMany');
    const spyPageFindUnique = vi.spyOn(prisma.page, 'findUnique');
    const spyRedirectFindUnique = vi.spyOn(prisma.slugRedirect, 'findUnique');
    const spyRedirectFindFirst = vi.spyOn(prisma.slugRedirect, 'findFirst');
    const spyItemFindMany = vi.spyOn(prisma.pageItem, 'findMany');
    const spyItemFindUnique = vi.spyOn(prisma.pageItem, 'findUnique');

    const testPaths = [
      '/labs',
      '/50-resources',
      '/sports',
      '/old-about',
      '/p/labs',
      '/stem/robotics',
      '/legal/privacy-policy',
      '/labs/chemistry-lab',
      '/labs/unknown-gadget',
      '/labs/old-chem',
      '/completely/unknown/route',
    ];

    for (const p of testPaths) {
      spyPageFindMany.mockClear();
      spyPageFindUnique.mockClear();
      spyRedirectFindUnique.mockClear();
      spyRedirectFindFirst.mockClear();
      spyItemFindMany.mockClear();
      spyItemFindUnique.mockClear();

      const res = await request(app).get(`/api/pages/resolve?path=${encodeURIComponent(p)}`);
      expect([200, 404]).toContain(res.status);

      const totalQueries =
        spyPageFindMany.mock.calls.length +
        spyPageFindUnique.mock.calls.length +
        spyRedirectFindUnique.mock.calls.length +
        spyRedirectFindFirst.mock.calls.length +
        spyItemFindMany.mock.calls.length +
        spyItemFindUnique.mock.calls.length;

      expect(totalQueries).toBeLessThanOrEqual(3);
    }
  });
});
