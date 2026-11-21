import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('CMS Strict Structured Writes & Detail Payload Drop', () => {
  let adminToken: string;
  let structuredPageId: number;
  let documentPageId: number;
  let originalStrictFlag: string | undefined;

  beforeAll(async () => {
    originalStrictFlag = process.env.CMS_STRICT_STRUCTURED_WRITES;
    delete process.env.CMS_STRICT_STRUCTURED_WRITES; // default is strict mode

    await resetContentTables();
    adminToken = await getAdminToken();

    // 1. Create a structured page (slug: 'labs')
    const structuredPage = await prisma.page.create({
      data: {
        title: 'Science & Tech Labs',
        slug: 'labs',
        contentModel: 'structured',
        template: 'hub',
        pageData: { heroTitle: 'Labs Hub' },
        version: 1,
        published: true,
      },
    });
    structuredPageId = structuredPage.id;

    // Add an item to labs with detail content
    await prisma.pageItem.create({
      data: {
        pageId: structuredPageId,
        collection: 'cards',
        title: 'Physics Lab',
        slug: 'physics-lab',
        summary: 'Advanced physics lab',
        sortOrder: 0,
        published: true,
        data: {},
        detail: {
          useCustomDetail: true,
          detailContent: '<h3>Detailed equipment list and safety specs</h3>',
        },
        version: 1,
      },
    });

    // 2. Create a document page (slug: 'about-us')
    const documentPage = await prisma.page.create({
      data: {
        title: 'About Us',
        slug: 'about-us',
        contentModel: 'document',
        template: 'about',
        pageData: { intro: 'Welcome to CampusMart' },
        version: 1,
        published: true,
      },
    });
    documentPageId = documentPage.id;
  }, 60000);

  afterAll(() => {
    process.env.CMS_STRICT_STRUCTURED_WRITES = originalStrictFlag;
  });

  it('rejects PUT /api/pages/:id with cards on structured page with HTTP 400 and collections_not_allowed', async () => {
    const res = await request(app)
      .put(`/api/pages/${structuredPageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Science & Tech Labs Updated',
        pageData: {
          heroTitle: 'Labs Hub',
          cards: [{ title: 'Attempted Inline Card', slug: 'attempted-card' }],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('collections_not_allowed');
    expect(res.body.keys).toContain('cards');
  });

  it('rejects POST /api/pages with cards on structured template with HTTP 400 and collections_not_allowed', async () => {
    const res = await request(app)
      .post('/api/pages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Hub Page',
        slug: 'new-hub-page',
        template: 'hub',
        pageData: {
          cards: [{ title: 'New Card', slug: 'new-card' }],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('collections_not_allowed');
    expect(res.body.keys).toContain('cards');
  });

  it('allows settings-only PUT /api/pages/:id on structured page and increments version', async () => {
    const pageBefore = await prisma.page.findUnique({ where: { id: structuredPageId } });
    const initialVersion = pageBefore!.version;

    const res = await request(app)
      .put(`/api/pages/${structuredPageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Science & Tech Labs Header Updated',
        version: initialVersion,
        pageData: {
          heroTitle: 'New Hero Title for Labs',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(initialVersion + 1);

    const pageAfter = await prisma.page.findUnique({ where: { id: structuredPageId } });
    expect(pageAfter!.version).toBe(initialVersion + 1);
    expect((pageAfter!.pageData as any).heroTitle).toBe('New Hero Title for Labs');
  });

  it('allows PUT /api/pages/:id with cards on document page with HTTP 200', async () => {
    const docBefore = await prisma.page.findUnique({ where: { id: documentPageId } });

    const res = await request(app)
      .put(`/api/pages/${documentPageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'About Us Updated',
        version: docBefore!.version,
        pageData: {
          intro: 'Welcome to CampusMart updated',
          cards: [{ title: 'Team member', role: 'Engineer' }],
        },
      });

    expect(res.status).toBe(200);
    const docAfter = await prisma.page.findUnique({ where: { id: documentPageId } });
    expect(docAfter!.contentModel).toBe('document');
    expect(Array.isArray((docAfter!.pageData as any).cards)).toBe(true);
  });

  it('allows PUT /api/pages/:id with cards when CMS_STRICT_STRUCTURED_WRITES is false (rollback flag)', async () => {
    process.env.CMS_STRICT_STRUCTURED_WRITES = 'false';

    try {
      const pageBefore = await prisma.page.findUnique({ where: { id: structuredPageId } });

      const res = await request(app)
        .put(`/api/pages/${structuredPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Science & Tech Labs',
          version: pageBefore!.version,
          pageData: {
            heroTitle: 'New Hero Title for Labs',
            cards: [
              {
                title: 'Physics Lab',
                slug: 'physics-lab',
                description: 'Advanced physics lab updated via adapter',
                useCustomDetail: true,
                detailContent: '<h3>Detailed equipment list and safety specs</h3>',
              },
            ],
          },
        });

      expect(res.status).toBe(200);
    } finally {
      delete process.env.CMS_STRICT_STRUCTURED_WRITES;
    }
  });

  it('drops detail fields on public GET /api/pages/labs while retaining detail on admin GET', async () => {
    // 1. Public GET request (no auth token)
    const publicRes = await request(app).get('/api/pages/labs');
    expect(publicRes.status).toBe(200);

    const publicPageData = typeof publicRes.body.pageData === 'string'
      ? JSON.parse(publicRes.body.pageData)
      : publicRes.body.pageData;

    expect(Array.isArray(publicPageData.cards)).toBe(true);
    expect(publicPageData.cards.length).toBeGreaterThan(0);
    const publicCard = publicPageData.cards.find((c: any) => c.slug === 'physics-lab');
    expect(publicCard).toBeDefined();
    // In DETAIL_DROPPED pages, public card should NOT have detailContent or useCustomDetail
    expect(publicCard.detailContent).toBeUndefined();
    expect(publicCard.useCustomDetail).toBeUndefined();

    // 2. Admin GET request (with Bearer token)
    const adminRes = await request(app)
      .get('/api/pages/labs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);

    const adminPageData = typeof adminRes.body.pageData === 'string'
      ? JSON.parse(adminRes.body.pageData)
      : adminRes.body.pageData;

    expect(Array.isArray(adminPageData.cards)).toBe(true);
    const adminCard = adminPageData.cards.find((c: any) => c.slug === 'physics-lab');
    expect(adminCard).toBeDefined();
    // Admin request SHOULD include detail fields
    expect(adminCard.detailContent).toBe('<h3>Detailed equipment list and safety specs</h3>');
    expect(adminCard.useCustomDetail).toBe(true);
  });
});
