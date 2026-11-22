import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import {
  cmsLruCache,
  setCmsClock,
  resetCmsVersionCache,
} from '../../src/services/cms-cache';

describe('HTTP Caching & Multi-Process Synchronization', () => {
  let adminToken: string;

  beforeEach(async () => {
    await resetContentTables();
    resetCmsVersionCache();
    setCmsClock(null);
    cmsLruCache.clear();
    adminToken = await getAdminToken();

    await prisma.page.create({
      data: {
        title: 'Labs Hub Page',
        slug: 'labs',
        template: 'hub',
        published: true,
        pageData: {
          hero: { title: 'Welcome to Labs' },
        },
      },
    });
  });

  afterEach(() => {
    setCmsClock(null);
    resetCmsVersionCache();
    cmsLruCache.clear();
    vi.restoreAllMocks();
  });

  it('First GET returns 200 with an ETag and cache-control: public, no-cache', async () => {
    const res = await request(app).get('/api/pages/labs');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, no-cache');
    expect(res.headers['etag']).toBeDefined();
    expect(res.headers['etag']).toMatch(/^W\/"cms-\d+-[a-f0-9]{12}"$/);
    expect(res.headers['pragma']).toBeUndefined();
    expect(res.headers['expires']).toBeUndefined();
  });

  it('Second GET with matching If-None-Match returns 304 with empty body', async () => {
    const res1 = await request(app).get('/api/pages/labs');
    expect(res1.status).toBe(200);
    const etag = res1.headers['etag'];
    expect(etag).toBeDefined();

    const res2 = await request(app)
      .get('/api/pages/labs')
      .set('If-None-Match', etag);

    expect(res2.status).toBe(304);
    expect(res2.text).toBe('');
  });

  it('After an admin mutation, a GET with old ETag returns 200 with new content', async () => {
    const res1 = await request(app).get('/api/pages/labs');
    expect(res1.status).toBe(200);
    const oldEtag = res1.headers['etag'];

    // Admin updates the page
    const updateRes = await request(app)
      .put('/api/content')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        home_hero_title: 'Updated Global Title',
      });
    expect(updateRes.status).toBe(200);

    // GET with old ETag should return 200 with new ETag
    const res2 = await request(app)
      .get('/api/pages/labs')
      .set('If-None-Match', oldEtag);

    expect(res2.status).toBe(200);
    expect(res2.headers['etag']).not.toBe(oldEtag);
  });

  it('Multi-process simulation: raw SQL bump of cmsstate.version + clock advance > 1000ms serves fresh content', async () => {
    let simulatedNow = 1_000_000;
    setCmsClock(() => simulatedNow);

    const res1 = await request(app).get('/api/pages/labs');
    expect(res1.status).toBe(200);
    const initialEtag = res1.headers['etag'];

    // Simulate another worker process bumping version in the shared database
    await prisma.$executeRawUnsafe('UPDATE cmsstate SET version = version + 1 WHERE id = 1');

    // Advance clock by less than 1000ms: memoized version is still used
    simulatedNow += 500;
    const resWithinMemo = await request(app)
      .get('/api/pages/labs')
      .set('If-None-Match', initialEtag);
    expect(resWithinMemo.status).toBe(304);

    // Advance clock by > 1000ms: memoization expires, reading fresh version from DB
    simulatedNow += 600; // Total 1100ms > 1000ms
    const resAfterExpiry = await request(app)
      .get('/api/pages/labs')
      .set('If-None-Match', initialEtag);

    expect(resAfterExpiry.status).toBe(200);
    expect(resAfterExpiry.headers['etag']).not.toBe(initialEtag);
  });

  it('Requests with an Authorization header bypass LRU cache (spy on it)', async () => {
    const spyGet = vi.spyOn(cmsLruCache, 'get');
    const spySet = vi.spyOn(cmsLruCache, 'set');

    const res = await request(app)
      .get('/api/pages/labs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, no-cache');
    expect(res.headers['etag']).toBeDefined();
    expect(spyGet).not.toHaveBeenCalled();
    expect(spySet).not.toHaveBeenCalled();
  });

  it('Non-CMS routes (/api/auth/*, /api/admin/*, /api/wishlist) strictly return Cache-Control: no-store', async () => {
    const authRes = await request(app).get('/api/auth/csrf');
    expect(authRes.headers['cache-control']).toContain('no-store');

    const adminRes = await request(app)
      .get('/api/admin/pages')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.headers['cache-control']).toContain('no-store');

    const wishlistRes = await request(app).get('/api/wishlist');
    expect(wishlistRes.headers['cache-control']).toContain('no-store');
  });
});
