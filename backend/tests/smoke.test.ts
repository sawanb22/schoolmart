import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from './helpers/app';
import { assertTestDatabaseSafety } from './global-setup';

describe('Backend Smoke Tests', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/pages/faq returns 200 and resolves properly', async () => {
    const res = await request(app).get('/api/pages/faq');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('slug', 'faq');
    expect(res.body).toHaveProperty('title', 'Frequently Asked Questions');
  });

  describe('Test Database Safety Guard', () => {
    const validDevUrl = 'postgresql://user:pass@ep-dev.neon.tech/neondb?sslmode=require';
    const validTestUrl = 'postgresql://user:pass@ep-test.neon.tech/neondb?sslmode=require';

    it('throws when TEST_DB_CONFIRM is unset or invalid', () => {
      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: validTestUrl,
          DATABASE_URL: validDevUrl,
          TEST_DB_CONFIRM: '',
        });
      }).toThrow(/TEST_DB_CONFIRM/);

      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: validTestUrl,
          DATABASE_URL: validDevUrl,
          TEST_DB_CONFIRM: 'wrong-confirmation',
        });
      }).toThrow(/TEST_DB_CONFIRM/);
    });

    it('throws when DATABASE_URL_TEST is empty or unset', () => {
      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: '',
          DATABASE_URL: validDevUrl,
          TEST_DB_CONFIRM: 'yes-reset-this-db',
        });
      }).toThrow(/DATABASE_URL_TEST is unset or empty/);

      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL: validDevUrl,
          TEST_DB_CONFIRM: 'yes-reset-this-db',
        });
      }).toThrow(/DATABASE_URL_TEST is unset or empty/);
    });

    it('throws when DATABASE_URL_TEST matches DATABASE_URL', () => {
      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: validDevUrl,
          DATABASE_URL: validDevUrl,
          TEST_DB_CONFIRM: 'yes-reset-this-db',
        });
      }).toThrow(/DATABASE_URL_TEST matches DATABASE_URL/);

      // Even with different query parameters
      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: 'postgresql://user:pass@ep-dev.neon.tech/neondb?channel_binding=require',
          DATABASE_URL: 'postgresql://user:pass@ep-dev.neon.tech/neondb?sslmode=require',
          TEST_DB_CONFIRM: 'yes-reset-this-db',
        });
      }).toThrow(/DATABASE_URL_TEST matches DATABASE_URL/);
    });

    it('throws when DATABASE_URL_TEST matches DATABASE_URL_UNPOOLED', () => {
      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: validDevUrl,
          DATABASE_URL: validTestUrl,
          DATABASE_URL_UNPOOLED: validDevUrl,
          TEST_DB_CONFIRM: 'yes-reset-this-db',
        });
      }).toThrow(/DATABASE_URL_TEST matches DATABASE_URL_UNPOOLED/);
    });

    it('passes when inputs are distinct and confirmed', () => {
      expect(() => {
        assertTestDatabaseSafety({
          DATABASE_URL_TEST: validTestUrl,
          DATABASE_URL: validDevUrl,
          DATABASE_URL_UNPOOLED: validDevUrl,
          TEST_DB_CONFIRM: 'yes-reset-this-db',
        });
      }).not.toThrow();
    });
  });
});
