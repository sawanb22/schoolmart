import { describe, it, expect, vi, afterEach } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/middleware/error.middleware';
import { logger } from '../../src/lib/logger';

describe('Error Middleware Hardening (T17)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  function createTestApp() {
    const testApp = express();
    testApp.use((req, res, next) => {
      const customId = req.headers['x-request-id'] || 'trace-default-uuid';
      (req as any).id = customId;
      res.setHeader('X-Request-Id', customId as string);
      next();
    });

    testApp.get('/throw-500', (_req: Request, _res: Response) => {
      throw new Error('Sensitive database connection credentials leaked in stack trace');
    });

    testApp.get('/throw-400', (_req: Request, _res: Response) => {
      const err: any = new Error('Invalid query parameter');
      err.status = 400;
      throw err;
    });

    testApp.use(errorHandler);
    return testApp;
  }

  it('in production, 500 returns sanitized { error: "internal_error", requestId } suppressing message and stack', async () => {
    process.env.NODE_ENV = 'production';
    const testApp = createTestApp();
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation((() => {}) as any);

    const res = await request(testApp)
      .get('/throw-500')
      .set('x-request-id', 'req-prod-500-trace');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'internal_error',
      requestId: 'req-prod-500-trace',
    });
    // Ensure stack and raw error messages are never leaked in payload
    expect(res.body.stack).toBeUndefined();
    expect(res.text).not.toContain('Sensitive database connection credentials');

    // Verify structured logger was called with error details and requestId
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/throw-500',
        method: 'GET',
        requestId: 'req-prod-500-trace',
      }),
      expect.stringContaining('internal server error')
    );
  });

  it('in non-production, 500 returns error message and stack trace for development debugging', async () => {
    process.env.NODE_ENV = 'test';
    const testApp = createTestApp();
    vi.spyOn(logger, 'error').mockImplementation((() => {}) as any);

    const res = await request(testApp)
      .get('/throw-500')
      .set('x-request-id', 'req-dev-500-trace');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Sensitive database connection credentials leaked in stack trace');
    expect(res.body.requestId).toBe('req-dev-500-trace');
    expect(res.body.stack).toBeDefined();
  });

  it('in production, 4xx errors preserve client error message', async () => {
    process.env.NODE_ENV = 'production';
    const testApp = createTestApp();

    const res = await request(testApp)
      .get('/throw-400')
      .set('x-request-id', 'req-prod-400');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid query parameter');
    expect(res.body.requestId).toBe('req-prod-400');
  });
});
