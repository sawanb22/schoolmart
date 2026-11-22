import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Backend Security Headers (T17)', () => {
  it('API responses carry default-src "none" and frame-ancestors "none" CSP', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('API responses carry standard security headers: nosniff and X-Frame-Options DENY', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('Static /uploads requests retain cross-origin resource policy: cross-origin', async () => {
    const res = await request(app).get('/uploads/test.png');

    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
