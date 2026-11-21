import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { splitLegacyPageData, buildItem } from '../../src/services/page-content/legacy-mapper';
import { parsePageData } from '../../src/lib/page-data';

describe('Generate Item Fixtures for Frontend itemToCard Tests', () => {
  it('extracts split items from all page fixtures and writes frontend/src/test/fixtures/items/items.json', () => {
    const pagesDir = path.resolve(__dirname, 'pages');
    const outDir = path.resolve(__dirname, '../../../frontend/src/test/fixtures/items');
    fs.mkdirSync(outDir, { recursive: true });

    const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'));
    const allFixtures: any[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
      const page = JSON.parse(content);
      const parsedBlob = parsePageData(page.pageData);
      const { items } = splitLegacyPageData(parsedBlob);

      for (const item of items) {
        allFixtures.push({
          sourcePage: file,
          item,
          expectedLegacyNoDetail: buildItem(item, { includeDetail: false }),
          expectedLegacyWithDetail: buildItem(item, { includeDetail: true }),
        });
      }
    }

    expect(allFixtures.length).toBeGreaterThan(30);

    const outPath = path.join(outDir, 'items.json');
    fs.writeFileSync(outPath, JSON.stringify(allFixtures, null, 2), 'utf-8');
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
