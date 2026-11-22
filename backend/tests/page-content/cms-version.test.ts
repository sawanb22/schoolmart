import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';

describe('CMS State Version Invariant I6 (Every write bumps CmsState.version by 1)', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  beforeEach(async () => {
    await resetContentTables();
  });

  async function getCmsVersion(): Promise<number> {
    const state = await prisma.cmsState.findUnique({ where: { id: 1 } });
    return state?.version || 1;
  }

  it('POST /api/pages bumps cmsstate.version by exactly 1', async () => {
    const vBefore = await getCmsVersion();

    const res = await request(app)
      .post('/api/pages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Page Version Test',
        slug: 'new-page-v-test',
        pageData: { hero: { title: 'Hello' } },
      });
    expect(res.status).toBe(201);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('PUT /api/pages/:id bumps cmsstate.version by exactly 1', async () => {
    const page = await prisma.page.create({
      data: {
        title: 'Initial Title',
        slug: 'put-page-v-test',
        pageData: {},
      },
    });

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .put(`/api/pages/${page.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Updated Title',
      });
    expect(res.status).toBe(200);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('DELETE /api/pages/:id bumps cmsstate.version by exactly 1', async () => {
    const page = await prisma.page.create({
      data: {
        title: 'Delete Test Page',
        slug: 'delete-page-v-test',
        pageData: {},
      },
    });

    const vBefore = await getCmsVersion();

    const res = await request(app)
      .delete(`/api/pages/${page.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('PUT /api/content bumps cmsstate.version by exactly 1', async () => {
    const vBefore = await getCmsVersion();

    const res = await request(app)
      .put('/api/content')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        home_banner_title: 'Updated Campus Title',
      });
    expect(res.status).toBe(200);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });

  it('PUT /api/content/:key bumps cmsstate.version by exactly 1', async () => {
    const vBefore = await getCmsVersion();

    const res = await request(app)
      .put('/api/content/footer_copy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        value: 'Copyright 2026 CampusMart',
      });
    expect(res.status).toBe(200);

    const vAfter = await getCmsVersion();
    expect(vAfter).toBe(vBefore + 1);
  });
});
