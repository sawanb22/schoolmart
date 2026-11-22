import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('Health & Readiness Probes (T17)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /health returns 200 with status ok and process uptime without touching DB', async () => {
    const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(queryRawSpy).not.toHaveBeenCalled();
  });

  it('GET /ready returns 200 with status ready, db ok, and cmsVersion when DB is available', async () => {
    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.db).toBe('ok');
    expect(typeof res.body.cmsVersion).toBe('number');
  });

  it('GET /ready returns 503 with status not_ready when Prisma query throws', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'not_ready',
      db: 'error',
    });
  });

  it('GET /ready returns 503 when Prisma query times out (>2s)', async () => {
    vi.spyOn(prisma, '$queryRaw').mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 3000))
    );

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'not_ready',
      db: 'error',
    });
  });
});
