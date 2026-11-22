import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import {
  generateSitemapXml,
  writeSitemapFileAtomic,
  scheduleSitemapSync,
  cancelPendingSitemapSync,
} from '../../src/services/sitemap.service';
import { afterContentWrite } from '../../src/services/page-content/after-content-write';

describe('Sitemap Service & /sitemap.xml Endpoint (T16)', () => {
  let publishedPageId: number;
  let testTempDir: string;
  let sitemapFilePath: string;

  beforeAll(async () => {
    await resetContentTables();

    // 1. Published regular page
    const page1 = await prisma.page.create({
      data: {
        title: 'Science & Tech Labs',
        slug: 'labs',
        contentModel: 'structured',
        published: true,
        pageData: {
          settings: {
            title: 'Labs Hub',
            heroTitle: 'Science Labs',
          },
        },
        version: 1,
      },
    });
    publishedPageId = page1.id;

    // Published item on published page (card collection)
    await prisma.pageItem.create({
      data: {
        pageId: page1.id,
        collection: 'cards',
        title: 'Robotics & AI Lab',
        slug: 'robotics-ai-lab',
        published: true,
        sortOrder: 0,
        version: 1,
        data: {},
      },
    });

    // Unpublished item on published page
    await prisma.pageItem.create({
      data: {
        pageId: page1.id,
        collection: 'cards',
        title: 'Draft Lab Item',
        slug: 'draft-lab-item',
        published: false,
        sortOrder: 1,
        version: 1,
        data: {},
      },
    });

    // Item with noindex: true
    await prisma.pageItem.create({
      data: {
        pageId: page1.id,
        collection: 'cards',
        title: 'Hidden Lab Item',
        slug: 'hidden-lab-item',
        published: true,
        sortOrder: 2,
        version: 1,
        data: {
          seo: {
            noindex: true,
          },
        },
      },
    });

    // Item in non-card collection (e.g. faq or metrics - should be excluded from card item URLs)
    await prisma.pageItem.create({
      data: {
        pageId: page1.id,
        collection: 'metrics',
        title: 'Metric Stat',
        slug: 'metric-stat',
        published: true,
        sortOrder: 3,
        version: 1,
        data: {},
      },
    });

    // 2. Unpublished page
    await prisma.page.create({
      data: {
        title: 'Unpublished Hub',
        slug: 'unpublished-hub',
        contentModel: 'structured',
        published: false,
        pageData: {},
        version: 1,
      },
    });

    // 3. Excluded slug prefixes: test-* and draft-*
    await prisma.page.create({
      data: {
        title: 'Test Page',
        slug: 'test-preview-page',
        contentModel: 'structured',
        published: true,
        pageData: {},
        version: 1,
      },
    });

    await prisma.page.create({
      data: {
        title: 'Draft Page',
        slug: 'draft-feature-page',
        contentModel: 'structured',
        published: true,
        pageData: {},
        version: 1,
      },
    });

    // 4. 'home' slug page
    await prisma.page.create({
      data: {
        title: 'Home Page CMS Record',
        slug: 'home',
        contentModel: 'structured',
        published: true,
        pageData: {},
        version: 1,
      },
    });

    // 5. Page with noindex: true in settings
    await prisma.page.create({
      data: {
        title: 'Private Hub',
        slug: 'private-hub',
        contentModel: 'structured',
        published: true,
        pageData: {
          settings: {
            noindex: true,
          },
        },
        version: 1,
      },
    });

    // Create unique temp directory for atomic file tests
    testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
    sitemapFilePath = path.join(testTempDir, 'sitemap.xml');
  }, 60000);

  afterAll(async () => {
    cancelPendingSitemapSync();
    if (testTempDir && fs.existsSync(testTempDir)) {
      try {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure
      }
    }
  });

  afterEach(() => {
    cancelPendingSitemapSync();
  });

  describe('generateSitemapXml()', () => {
    it('produces valid XML structure with urlset and root URL', async () => {
      const xml = await generateSitemapXml();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');
      expect(xml).toContain('<loc>https://schoolmart.in/</loc>');
    });

    it('includes published pages and structured card items', async () => {
      const xml = await generateSitemapXml();

      // Published page
      expect(xml).toContain('<loc>https://schoolmart.in/labs</loc>');
      // Published card item
      expect(xml).toContain('<loc>https://schoolmart.in/labs/robotics-ai-lab</loc>');
      // Includes lastmod formatted as YYYY-MM-DD
      expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    });

    it('excludes unpublished pages, unpublished items, test-*, draft-*, home, and noindex entities', async () => {
      const xml = await generateSitemapXml();

      // Excluded:
      expect(xml).not.toContain('/unpublished-hub');
      expect(xml).not.toContain('/draft-lab-item');
      expect(xml).not.toContain('/hidden-lab-item');
      expect(xml).not.toContain('/metric-stat');
      expect(xml).not.toContain('/test-preview-page');
      expect(xml).not.toContain('/draft-feature-page');
      expect(xml).not.toContain('/private-hub');
      expect(xml).not.toContain('<loc>https://schoolmart.in/home</loc>');
    });

    it('escapes XML special characters in URLs correctly', async () => {
      // Create a page with special characters in title and test escaping
      const specialPage = await prisma.page.create({
        data: {
          title: 'Special & Unique <Lab> "Page"',
          slug: 'special-lab',
          contentModel: 'structured',
          published: true,
          pageData: {},
          version: 1,
        },
      });

      const xml = await generateSitemapXml();
      expect(xml).toContain('<loc>https://schoolmart.in/special-lab</loc>');

      // Cleanup
      await prisma.page.delete({ where: { id: specialPage.id } });
    });
  });

  describe('GET /sitemap.xml endpoint', () => {
    it('serves sitemap at root /sitemap.xml with correct headers', async () => {
      const res = await request(app).get('/sitemap.xml');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/xml/);
      expect(res.headers['cache-control']).toBe('public, no-cache');
      expect(res.headers['etag']).toBeDefined();
      expect(res.text).toContain('<urlset');
      expect(res.text).toContain('https://schoolmart.in/labs');
    });

    it('handles conditional requests with If-None-Match (304)', async () => {
      const firstRes = await request(app).get('/sitemap.xml');
      expect(firstRes.status).toBe(200);
      const etag = firstRes.headers['etag'];

      const cachedRes = await request(app)
        .get('/sitemap.xml')
        .set('If-None-Match', etag);

      expect(cachedRes.status).toBe(304);
    });
  });

  describe('Atomic sitemap file sync', () => {
    it('writeSitemapFileAtomic writes atomically to destination file', async () => {
      const success = await writeSitemapFileAtomic(sitemapFilePath);
      expect(success).toBe(true);
      expect(fs.existsSync(sitemapFilePath)).toBe(true);

      const content = fs.readFileSync(sitemapFilePath, 'utf8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('https://schoolmart.in/labs');
    });

    it('writeSitemapFileAtomic returns false gracefully without throwing if path is invalid', async () => {
      // Unwritable / invalid target path
      const invalidPath = '\0/invalid/path/sitemap.xml';
      const success = await writeSitemapFileAtomic(invalidPath);
      expect(success).toBe(false);
    });

    it('afterContentWrite triggers scheduleSitemapSync when SITEMAP_WRITE_PATH is set', async () => {
      const prevEnv = process.env.SITEMAP_WRITE_PATH;
      process.env.SITEMAP_WRITE_PATH = sitemapFilePath;

      try {
        await afterContentWrite({
          pageId: publishedPageId,
          reason: 'Test content mutation for sitemap trigger',
        });

        // Cancel the pending debounce timer before test cleanup
        cancelPendingSitemapSync();
      } finally {
        process.env.SITEMAP_WRITE_PATH = prevEnv;
      }
    });
  });
});
