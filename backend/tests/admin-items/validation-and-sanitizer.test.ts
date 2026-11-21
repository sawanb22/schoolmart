import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { getAdminToken } from '../helpers/auth';
import { sanitizeRichHtml, sanitizeItemPayload } from '../../src/lib/sanitize';
import { MAX_ITEM_JSON_BYTES } from '../../src/services/page-content/constants';
import { SettingsSchema } from '../../src/services/page-content/schemas';

describe('Admin Item Validation & Rich Text Sanitization', () => {
  let adminToken: string;
  let pageId: number;

  beforeAll(async () => {
    await resetContentTables();
    adminToken = await getAdminToken();

    const page = await prisma.page.create({
      data: {
        title: 'Validation Hub',
        slug: 'validation-hub',
        contentModel: 'structured',
        pageData: {},
        version: 1,
        published: true,
      },
    });
    pageId = page.id;
  }, 60000);

  it('rejects oversize item payload exceeding MAX_ITEM_JSON_BYTES with 400', async () => {
    // Generate a payload that exceeds 256 KB
    const largeString = 'X'.repeat(MAX_ITEM_JSON_BYTES + 1024);

    const res = await request(app)
      .post(`/api/admin/pages/${pageId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collection: 'cards',
        title: 'Huge Item',
        detail: {
          hugeContent: largeString,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('rejects invalid types on known settings keys with 400 in SettingsSchema', () => {
    // hideCta should be boolean
    const invalidHideCta = SettingsSchema.safeParse({
      hideCta: 'not-a-boolean',
    });
    expect(invalidHideCta.success).toBe(false);

    // partnerLogos should be array
    const invalidLogos = SettingsSchema.safeParse({
      partnerLogos: 12345,
    });
    expect(invalidLogos.success).toBe(false);

    // Unknown settings keys are accepted (passthrough)
    const validWithUnknown = SettingsSchema.safeParse({
      hideCta: true,
      customAuthorBio: 'Allowed extra setting',
      brandColor: '#ff0000',
    });
    expect(validWithUnknown.success).toBe(true);
    if (validWithUnknown.success) {
      expect((validWithUnknown.data as any).customAuthorBio).toBe('Allowed extra setting');
    }
  });

  it('strips <script>, onerror=, and javascript: on known attack vectors', () => {
    const malicious = '<p>Normal text</p><script>alert("pwned")</script><img src="x" onerror="stealCookies()"><a href="javascript:doEvil()">click me</a>';
    const cleaned = sanitizeRichHtml(malicious);

    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('stealCookies');
    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).toContain('<p>Normal text</p>');
    expect(cleaned).toContain('<img src="x" />');
    expect(cleaned).toContain('<a>click me</a>');
  });

  it('preserves allowed HTML tags and attributes on clean markup', () => {
    const cleanMarkup = '<h2>Overview</h2><p>This is a <strong>bold</strong> and <em>italic</em> description with a <a href="https://example.com" target="_blank" class="text-blue-500">clean link</a> and <span class="badge">tag</span>.</p>';
    const cleaned = sanitizeRichHtml(cleanMarkup);

    expect(cleaned).toContain('<h2>Overview</h2>');
    expect(cleaned).toContain('<strong>bold</strong>');
    expect(cleaned).toContain('<em>italic</em>');
    expect(cleaned).toContain('href="https://example.com"');
    expect(cleaned).toContain('class="text-blue-500"');
    expect(cleaned).toContain('<span class="badge">tag</span>');
  });

  it('sanitizes item payloads recursively across data and detail', () => {
    const item = {
      collection: 'cards',
      title: 'Lab Card',
      data: {
        body: '<p>Body text</p><script>evil()</script>',
        normalField: 'safe',
      },
      detail: {
        detailContent: '<p>Detail text</p><img src="pic.jpg" onerror="alert(1)">',
        methodology: '<p>Methodology</p><a href="javascript:void(0)">Link</a>',
      },
    };

    const sanitized = sanitizeItemPayload(item);
    expect(sanitized.data.body).toBe('<p>Body text</p>');
    expect(sanitized.detail.detailContent).toContain('<p>Detail text</p>');
    expect(sanitized.detail.detailContent).not.toContain('onerror');
    expect(sanitized.detail.methodology).not.toContain('javascript:');
  });

  it('fast-check property test: 200 runs ensuring XSS payloads are completely neutralized', () => {
    const maliciousInjections = [
      '<script>alert(1)</script>',
      '<SCRIPT SRC="https://evil.com/xss.js"></SCRIPT>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(document.cookie)">click</a>',
      '<a href="vbscript:msgbox(1)">click</a>',
      '"><script>alert(1)</script>',
      '<body onload=alert(1)>',
    ];

    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(...maliciousInjections),
        fc.string(),
        (prefix, injection, suffix) => {
          const raw = `${prefix}${injection}${suffix}`;
          const cleaned = sanitizeRichHtml(raw);

          // Invariant: Output must NEVER contain script tags, on* event handlers, or javascript: protocols
          expect(cleaned.toLowerCase()).not.toContain('<script');
          expect(cleaned.toLowerCase()).not.toMatch(/\bon\w+\s*=/i);
          expect(cleaned.toLowerCase()).not.toContain('javascript:');
          expect(cleaned.toLowerCase()).not.toContain('vbscript:');
        }
      ),
      { numRuns: 200 }
    );
  });
});
