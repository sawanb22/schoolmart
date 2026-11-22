import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { assertLegacyEquivalent } from '../helpers/legacy-equivalence';
import { runMigration } from '../../scripts/migrate-page-items';

function orderKeysLike(target: any, template: any): any {
    if (target === null || typeof target !== 'object') {
        return target;
    }
    if (Array.isArray(target)) {
        if (Array.isArray(template)) {
            return target.map((item, idx) => orderKeysLike(item, template[idx]));
        }
        return target.map((item) => orderKeysLike(item, undefined));
    }
    const result: Record<string, any> = {};
    if (template && typeof template === 'object' && !Array.isArray(template)) {
        for (const key of Object.keys(template)) {
            if (key in target) {
                result[key] = orderKeysLike(target[key], template[key]);
            }
        }
    }
    for (const key of Object.keys(target)) {
        if (!(key in result)) {
            result[key] = orderKeysLike(target[key], undefined);
        }
    }
    return result;
}

function normalizePageResponse(body: any, expectedTemplate?: any) {
    if (!body || typeof body !== 'object') return body;
    const { id, createdAt, updatedAt, contentModel, version, ...rest } = body;
    let parsedPageData = rest.pageData;
    if (typeof rest.pageData === 'string') {
        try {
            parsedPageData = JSON.parse(rest.pageData);
        } catch {
            parsedPageData = rest.pageData;
        }
    }
    if (expectedTemplate) {
        let expectedPageData = expectedTemplate.pageData;
        if (typeof expectedPageData === 'string') {
            try {
                expectedPageData = JSON.parse(expectedPageData);
            } catch {}
        }
        parsedPageData = orderKeysLike(parsedPageData, expectedPageData);
    }
    return {
        ...rest,
        pageData: parsedPageData,
    };
}

describe('Legacy Pages Characterization Contract Snapshots (Mode 1: Unmigrated)', () => {
    const fixtures = loadAllPageFixtures();

    beforeAll(async () => {
        await resetContentTables();
        await seedPagesFromFixtures(fixtures);
    }, 60000);

    for (const fixture of fixtures) {
        it(`GET /api/pages/${fixture.slug} matches characterization snapshot`, async () => {
            const res = await request(app).get(`/api/pages/${fixture.slug}`);
            expect(res.status).toBe(200);

            const normalized = normalizePageResponse(res.body, fixture);
            await expect(JSON.stringify(normalized, null, 2)).toMatchFileSnapshot(
                `./__snapshots__/${fixture.slug}.json`
            );
        });
    }

    it('GET /api/pages/hub/catalog matches characterization snapshot', async () => {
        const res = await request(app).get('/api/pages/hub/catalog');
        expect(res.status).toBe(200);
        await expect(JSON.stringify(res.body, null, 2)).toMatchFileSnapshot(
            './__snapshots__/hub-catalog.json'
        );
    });

    it('GET /api/pages/hub/catalog?hub=labs matches characterization snapshot', async () => {
        const res = await request(app).get('/api/pages/hub/catalog?hub=labs');
        expect(res.status).toBe(200);
        await expect(JSON.stringify(res.body, null, 2)).toMatchFileSnapshot(
            './__snapshots__/hub-catalog-labs.json'
        );
    });
});

describe('Legacy Pages Equivalent Rebuilt Contract (Mode 2: Migrated via --apply)', () => {
    const fixtures = loadAllPageFixtures();

    beforeAll(async () => {
        await runMigration({ mode: 'apply', prisma });
    }, 120000);

    for (const fixture of fixtures) {
        it(`GET /api/pages/${fixture.slug} passes assertLegacyEquivalent after migration`, async () => {
            const res = await request(app).get(`/api/pages/${fixture.slug}`);
            expect(res.status).toBe(200);

            const originalPageData = typeof fixture.pageData === 'string'
                ? JSON.parse(fixture.pageData)
                : fixture.pageData;
            const responsePageData = typeof res.body.pageData === 'string'
                ? JSON.parse(res.body.pageData)
                : res.body.pageData;

            assertLegacyEquivalent(originalPageData, responsePageData);
        });
    }
});
