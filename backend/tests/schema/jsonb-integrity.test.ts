import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../../src/lib/prisma';
import { bootstrapPages } from '../../src/services/bootstrap-pages';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';

describe('JSONB Integrity (Invariant I2)', () => {
    beforeAll(async () => {
        // Seed all fixtures and run bootstrapPages()
        const fixtures = loadAllPageFixtures();
        await seedPagesFromFixtures(fixtures);
        await bootstrapPages();
    }, 60000);

    it('confirms every non-null pageData has jsonb_typeof = "object" (Invariant I2)', async () => {
        const result: Array<{ count: bigint }> = await prisma.$queryRaw`
            SELECT count(*) FROM "page"
            WHERE "pageData" IS NOT NULL
              AND jsonb_typeof("pageData") <> 'object';
        `;

        const nonObjectCount = Number(result[0].count);
        expect(nonObjectCount).toBe(0);
    }, 30000);

    it('confirms all seeded pages have valid JSONB object data', async () => {
        const pages = await prisma.page.findMany({
            select: { id: true, slug: true, pageData: true },
        });

        expect(pages.length).toBeGreaterThan(0);

        for (const page of pages) {
            if (page.pageData !== null) {
                expect(typeof page.pageData).toBe('object');
                expect(Array.isArray(page.pageData)).toBe(false);
            }
        }
    }, 30000);

    it('confirms pageitem data and detail defaults are objects', async () => {
        // Create a test page and item to verify default JSONB properties
        const testPage = await prisma.page.create({
            data: {
                title: 'JSONB Test Page',
                slug: `jsonb-test-${Date.now()}`,
                template: 'test',
                pageData: { test: true },
            },
        });

        const testItem = await prisma.pageItem.create({
            data: {
                pageId: testPage.id,
                collection: 'cards',
                slug: 'item-1',
                title: 'Item 1',
            },
        });

        const itemRow: Array<{ data_type: string; detail_type: string }> = await prisma.$queryRaw`
            SELECT jsonb_typeof("data") as data_type, jsonb_typeof("detail") as detail_type
            FROM "pageitem"
            WHERE "id" = ${testItem.id};
        `;

        expect(itemRow[0].data_type).toBe('object');
        expect(itemRow[0].detail_type).toBe('object');

        // Cleanup test page (cascades)
        await prisma.page.delete({ where: { id: testPage.id } });
    });
});
