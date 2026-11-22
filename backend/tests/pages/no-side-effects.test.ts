import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../../src/lib/prisma';
import app from '../helpers/app';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';

describe('Public GET Endpoints Strict Read-Only (Invariant I1)', () => {
    const fixtures = loadAllPageFixtures();

    beforeAll(async () => {
        // Seed all fixtures
        await seedPagesFromFixtures(fixtures);
        // Explicitly remove 'faq' to verify hitting /api/pages/faq does NOT recreate it
        await prisma.page.deleteMany({ where: { slug: 'faq' } });
    });

    it('confirms public GET routes cause zero database mutations (no creates, updates, or timestamp changes)', async () => {
        // 1. Measure initial state
        const initialCount = await prisma.page.count();
        const initialMaxUpdated = await prisma.page.aggregate({
            _max: { updatedAt: true },
        });

        // 2. Hit public endpoints
        // GET /api/pages (unauthenticated admin endpoint returns 401/403 and performs zero DB writes)
        const resRoot = await request(app).get('/api/pages');
        expect([401, 403]).toContain(resRoot.status);

        // GET /api/pages/published (public endpoint)
        const resPublished = await request(app).get('/api/pages/published');
        expect(resPublished.status).toBe(200);

        // GET /api/pages/non-existent-missing-slug (404)
        const resMissing = await request(app).get('/api/pages/non-existent-missing-slug');
        expect(resMissing.status).toBe(404);

        // GET /api/pages/faq when absent (must return 404, must NOT create the page)
        const resFaq = await request(app).get('/api/pages/faq');
        expect(resFaq.status).toBe(404);

        // GET /api/pages/<slug> for every seeded fixture (excluding deleted faq)
        for (const fixture of fixtures) {
            if (fixture.slug === 'faq') continue;
            const res = await request(app).get(`/api/pages/${fixture.slug}`);
            expect(res.status).toBe(200);
        }

        // 3. Measure final state
        const finalCount = await prisma.page.count();
        const finalMaxUpdated = await prisma.page.aggregate({
            _max: { updatedAt: true },
        });

        // 4. Invariant I1 Assertions
        expect(finalCount).toBe(initialCount);
        expect(finalMaxUpdated._max.updatedAt?.getTime()).toBe(
            initialMaxUpdated._max.updatedAt?.getTime()
        );

        // Verify 'faq' was not resurrected by GET /api/pages/faq
        const faqInDb = await prisma.page.findUnique({ where: { slug: 'faq' } });
        expect(faqInDb).toBeNull();
    });
});
