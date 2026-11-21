import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';

describe('HTTP Compression', () => {
  beforeEach(async () => {
    await resetContentTables();
    await prisma.page.create({
      data: {
        title: 'Labs Hub Page',
        slug: 'labs',
        template: 'hub',
        published: true,
        content: '<p>' + 'A'.repeat(2000) + '</p>',
        pageData: {
          hero: {
            title: 'Welcome to Labs',
            subtitle: 'Explore innovative laboratory solutions ' + 'B'.repeat(1500),
          },
        },
      },
    });
  });

  it('GET /api/pages/labs with Accept-Encoding: gzip returns content-encoding: gzip', async () => {
    const res = await request(app)
      .get('/api/pages/labs')
      .set('Accept-Encoding', 'gzip');

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });
});
