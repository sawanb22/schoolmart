import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../src/lib/prisma';
import { bootstrapPages } from '../../src/services/bootstrap-pages';

describe('Bootstrap Pages Service', () => {
    beforeEach(async () => {
        await prisma.page.deleteMany({});
    });

    it('creates all default pages on an empty database', async () => {
        const result = await bootstrapPages();
        expect(result.created.length).toBeGreaterThan(0);

        const count = await prisma.page.count();
        expect(count).toBe(result.created.length);
        expect(result.created).toContain('colleges-universities-for-sale');
        expect(result.created).toContain('partner-with-colleges');
        expect(result.created).toContain('job-openings');
        expect(result.created).toContain('partnership');
        expect(result.created).toContain('faq');
        expect(result.created).toContain('how-it-works');
        expect(result.created).toContain('privacy-policy');
    });

    it('is idempotent on second run (creates 0 pages)', async () => {
        const first = await bootstrapPages();
        expect(first.created.length).toBeGreaterThan(0);

        const second = await bootstrapPages();
        expect(second.created.length).toBe(0);
        expect(second.updated.length).toBe(0);
    });

    it('handles concurrent runs without throwing or creating duplicate keys', async () => {
        const [run1, run2] = await Promise.all([
            bootstrapPages(),
            bootstrapPages(),
        ]);

        expect(Array.isArray(run1.created)).toBe(true);
        expect(Array.isArray(run2.created)).toBe(true);

        const pages = await prisma.page.findMany({ select: { slug: true } });
        const slugSet = new Set(pages.map(p => p.slug));
        expect(slugSet.size).toBe(pages.length);

        // A third sequential run creates nothing
        const run3 = await bootstrapPages();
        expect(run3.created.length).toBe(0);
    });
});
