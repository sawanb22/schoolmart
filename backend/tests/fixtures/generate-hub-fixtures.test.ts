import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { splitLegacyPageData, buildLegacyPageData } from '../../src/services/page-content/legacy-mapper';
import { parsePageData } from '../../src/lib/page-data';
import { COLLECTIONS } from '../../src/services/page-content/constants';

describe('Generate Hub Fixtures for Frontend useHubLegacy Tests', () => {
  it('extracts split items from all page fixtures and writes frontend/src/test/fixtures/hubs/hubs.json', () => {
    const pagesDir = path.resolve(__dirname, 'pages');
    const outDir = path.resolve(__dirname, '../../../frontend/src/test/fixtures/hubs');
    fs.mkdirSync(outDir, { recursive: true });

    const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'));
    const allFixtures: any[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
      const page = JSON.parse(content);
      const parsedBlob = parsePageData(page.pageData);
      const { settings, items, categories } = splitLegacyPageData(parsedBlob);

      const expectedLegacyNoDetail = buildLegacyPageData(settings, items, categories, {
        includeDetail: false,
        publicOnly: true,
      });

      const collections: Record<string, any[]> = {};
      for (const col of COLLECTIONS) {
        const colItems = items.filter((it) => it.collection === col && it.published !== false);
        if (colItems.length === 0) continue;
        const summaries = colItems.map((it) => ({
          id: it.sortOrder,
          slug: it.slug,
          collection: it.collection,
          title: it.title,
          summary: it.summary ?? null,
          imageUrl: it.imageUrl ?? null,
          href: it.href ?? null,
          badge: it.badge ?? null,
          categories: it.categoryNames,
          data: it.data || {},
          sortOrder: it.sortOrder,
        }));
        if (col === 'featured') {
          collections.featured = summaries.slice(0, 1);
        } else {
          collections[col] = summaries;
        }
      }

      const v2Payload = {
        page: {
          id: page.id || 1,
          slug: page.slug,
          title: page.title,
          template: page.template,
          contentModel: 'structured',
          version: 1,
          updatedAt: '2026-11-21T00:00:00.000Z',
        },
        settings,
        collections,
        categories: categories.map((c) => ({
          id: c.sortOrder,
          name: c.name,
          slug: c.slug,
        })),
      };

      allFixtures.push({
        sourcePage: file,
        slug: page.slug,
        v2Payload,
        expectedLegacyNoDetail,
      });
    }

    expect(allFixtures.length).toBeGreaterThan(20);

    const outPath = path.join(outDir, 'hubs.json');
    fs.writeFileSync(outPath, JSON.stringify(allFixtures, null, 2), 'utf-8');
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
