import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';

function normalizePageResponse(body: any) {
    if (!body || typeof body !== 'object') return body;
    const { id, createdAt, updatedAt, ...rest } = body;
    let parsedPageData = rest.pageData;
    if (typeof rest.pageData === 'string') {
        try {
            parsedPageData = JSON.parse(rest.pageData);
        } catch {
            parsedPageData = rest.pageData;
        }
    }
    return {
        ...rest,
        pageData: parsedPageData,
    };
}

describe('Legacy Pages Characterization Contract Snapshots', () => {
    const fixtures = loadAllPageFixtures();

    beforeAll(async () => {
        await seedPagesFromFixtures(fixtures);
    });

    for (const fixture of fixtures) {
        it(`GET /api/pages/${fixture.slug} matches characterization snapshot`, async () => {
            const res = await request(app).get(`/api/pages/${fixture.slug}`);
            expect(res.status).toBe(200);

            const normalized = normalizePageResponse(res.body);
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
