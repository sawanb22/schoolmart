import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Request ID Tracing (T17)', () => {
  it('generates and echoes an X-Request-Id header when none is provided', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    const reqId = res.headers['x-request-id'];
    expect(reqId).toBeDefined();
    expect(typeof reqId).toBe('string');
    expect(reqId.length).toBeGreaterThan(0);
  });

  it('preserves and echoes an incoming x-request-id header', async () => {
    const customId = 'client-trace-12345-abcde';

    const res = await request(app)
      .get('/health')
      .set('x-request-id', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('attaches X-Request-Id to error responses as well', async () => {
    const customId = 'err-trace-999';

    const res = await request(app)
      .get('/api/pages/non-existent-page-slug-that-does-not-exist')
      .set('x-request-id', customId);

    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});
