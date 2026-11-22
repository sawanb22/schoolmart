import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('Admin Items Slugs & Automated Redirects', () => {
  let adminToken: string;
  let pageId: number;
  const hubSlug = 'science-labs';

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const page = await prisma.page.create({
      data: {
        title: 'Science Labs Hub',
        slug: hubSlug,
        contentModel: 'structured',
        pageData: {},
        version: 1,
        published: true,
      },
    });
    pageId = page.id;
  }, 60000);

  it('rejects duplicate item slug on creation with 409 slug_taken', async () => {
    // 1. Create first item
    const res1 = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Physics Lab',
        slug: 'physics-lab',
      });
    expect(res1.status).toBe(201);

    // 2. Try to create duplicate slug on same page
    const res2 = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Another Physics Lab',
        slug: 'physics-lab',
      });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('slug_taken');
  });

  it('rejects slug modification to an already existing slug with 409 slug_taken', async () => {
    // Create second item
    const resChemistry = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Chemistry Lab',
        slug: 'chemistry-lab',
      });
    expect(resChemistry.status).toBe(201);
    const chemistryId = resChemistry.body.id;

    // Attempt to rename chemistry-lab to physics-lab
    const patchRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${chemistryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 1,
        slug: 'physics-lab',
      });

    expect(patchRes.status).toBe(409);
    expect(patchRes.body.error).toBe('slug_taken');
  });

  it('creates a SlugRedirect when item slug changes, and public endpoint returns { redirectTo }', async () => {
    // Create item with slug 'biology-setup'
    const createRes = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Biology Setup',
        slug: 'biology-setup',
      });
    expect(createRes.status).toBe(201);
    const itemId = createRes.body.id;

    // Update slug from 'biology-setup' to 'advanced-biology-setup'
    const patchRes = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: 1,
        slug: 'advanced-biology-setup',
      });
    expect(patchRes.status).toBe(200);

    // Check SlugRedirect in DB
    const redirect = await prisma.slugRedirect.findUnique({
      where: { fromPath: `/${hubSlug}/biology-setup` },
    });
    expect(redirect).not.toBeNull();
    expect(redirect?.toPath).toBe(`/${hubSlug}/advanced-biology-setup`);

    // Verify public item GET returns { redirectTo }
    const publicRes = await request(app).get(`/api/pages/${hubSlug}/items/biology-setup`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body).toHaveProperty('redirectTo');
    expect(publicRes.body.redirectTo).toBe(`/${hubSlug}/advanced-biology-setup`);
  });

  it('eliminates redirect loops when renamed A -> B then B -> A', async () => {
    // 1. Create item with slug 'alpha'
    const createRes = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Alpha Item',
        slug: 'alpha',
      });
    expect(createRes.status).toBe(201);
    const itemId = createRes.body.id;
    let version = createRes.body.version;

    // 2. Rename A -> B
    const patch1 = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version,
        slug: 'beta',
      });
    expect(patch1.status).toBe(200);
    version = patch1.body.version;

    // Verify redirect from /science-labs/alpha -> /science-labs/beta
    const redirA = await prisma.slugRedirect.findUnique({
      where: { fromPath: `/${hubSlug}/alpha` },
    });
    expect(redirA?.toPath).toBe(`/${hubSlug}/beta`);

    // 3. Rename B -> A
    const patch2 = await request(app)
      .patch(`/api/admin/pages/${pageId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version,
        slug: 'alpha',
      });
    expect(patch2.status).toBe(200);

    // 4. Verify no loop exists:
    // The redirect from /science-labs/alpha must NO LONGER exist because alpha is now the live item!
    const redirAAfter = await prisma.slugRedirect.findUnique({
      where: { fromPath: `/${hubSlug}/alpha` },
    });
    expect(redirAAfter).toBeNull();

    // A redirect from /science-labs/beta to /science-labs/alpha should exist
    const redirB = await prisma.slugRedirect.findUnique({
      where: { fromPath: `/${hubSlug}/beta` },
    });
    expect(redirB?.toPath).toBe(`/${hubSlug}/alpha`);

    // Public GET for /alpha must resolve directly to the item (not a redirect!)
    const publicAlpha = await request(app).get(`/api/pages/${hubSlug}/items/alpha`);
    expect(publicAlpha.status).toBe(200);
    expect(publicAlpha.body).toHaveProperty('item');
    expect(publicAlpha.body.item.slug).toBe('alpha');
    expect(publicAlpha.body.redirectTo).toBeUndefined();

    // Public GET for /beta must redirect to /alpha
    const publicBeta = await request(app).get(`/api/pages/${hubSlug}/items/beta`);
    expect(publicBeta.status).toBe(200);
    expect(publicBeta.body.redirectTo).toBe(`/${hubSlug}/alpha`);
  });
});
