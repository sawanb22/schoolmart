import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../src/lib/prisma';
import { Prisma } from '@prisma/client';

describe('Schema Constraints & Cascade Deletion', () => {
    let testPageA: { id: number; slug: string };
    let testPageB: { id: number; slug: string };

    beforeEach(async () => {
        // Clean and create test parent pages
        const now = Date.now();
        testPageA = await prisma.page.create({
            data: {
                title: 'Constraint Test Page A',
                slug: `constraint-a-${now}`,
                pageData: { key: 'a' },
            },
        });

        testPageB = await prisma.page.create({
            data: {
                title: 'Constraint Test Page B',
                slug: `constraint-b-${now}`,
                pageData: { key: 'b' },
            },
        });
    });

    describe('PageItem Constraints', () => {
        it('rejects duplicate (pageId, slug) on pageitem with Prisma P2002', async () => {
            await prisma.pageItem.create({
                data: {
                    pageId: testPageA.id,
                    collection: 'cards',
                    slug: 'shared-item-slug',
                    title: 'First Item',
                },
            });

            await expect(
                prisma.pageItem.create({
                    data: {
                        pageId: testPageA.id,
                        collection: 'moreCards',
                        slug: 'shared-item-slug',
                        title: 'Duplicate Item on Same Page',
                    },
                })
            ).rejects.toThrowError(Prisma.PrismaClientKnownRequestError);

            try {
                await prisma.pageItem.create({
                    data: {
                        pageId: testPageA.id,
                        collection: 'moreCards',
                        slug: 'shared-item-slug',
                        title: 'Duplicate Item on Same Page',
                    },
                });
            } catch (err: any) {
                expect(err.code).toBe('P2002');
            }
        });

        it('allows the same slug on different pages for pageitem', async () => {
            const itemA = await prisma.pageItem.create({
                data: {
                    pageId: testPageA.id,
                    collection: 'cards',
                    slug: 'common-item-slug',
                    title: 'Item on Page A',
                },
            });

            const itemB = await prisma.pageItem.create({
                data: {
                    pageId: testPageB.id,
                    collection: 'cards',
                    slug: 'common-item-slug',
                    title: 'Item on Page B',
                },
            });

            expect(itemA.id).toBeDefined();
            expect(itemB.id).toBeDefined();
            expect(itemA.slug).toBe(itemB.slug);
            expect(itemA.pageId).not.toBe(itemB.pageId);
        });
    });

    describe('PageCategory Constraints', () => {
        it('rejects duplicate (pageId, slug) on pagecategory with Prisma P2002', async () => {
            await prisma.pageCategory.create({
                data: {
                    pageId: testPageA.id,
                    name: 'Robotics',
                    slug: 'robotics',
                },
            });

            await expect(
                prisma.pageCategory.create({
                    data: {
                        pageId: testPageA.id,
                        name: 'Robotics Duplicate',
                        slug: 'robotics',
                    },
                })
            ).rejects.toThrowError(Prisma.PrismaClientKnownRequestError);

            try {
                await prisma.pageCategory.create({
                    data: {
                        pageId: testPageA.id,
                        name: 'Robotics Duplicate',
                        slug: 'robotics',
                    },
                });
            } catch (err: any) {
                expect(err.code).toBe('P2002');
            }
        });

        it('allows the same slug on different pages for pagecategory', async () => {
            const catA = await prisma.pageCategory.create({
                data: {
                    pageId: testPageA.id,
                    name: 'Science',
                    slug: 'science',
                },
            });

            const catB = await prisma.pageCategory.create({
                data: {
                    pageId: testPageB.id,
                    name: 'Science',
                    slug: 'science',
                },
            });

            expect(catA.id).toBeDefined();
            expect(catB.id).toBeDefined();
            expect(catA.slug).toBe(catB.slug);
            expect(catA.pageId).not.toBe(catB.pageId);
        });
    });

    describe('Cascade Deletion', () => {
        it('cascades page deletion to items, categories, item-categories, and revisions', async () => {
            // Create category
            const category = await prisma.pageCategory.create({
                data: {
                    pageId: testPageA.id,
                    name: 'Biology',
                    slug: 'biology',
                },
            });

            // Create item
            const item = await prisma.pageItem.create({
                data: {
                    pageId: testPageA.id,
                    collection: 'cards',
                    slug: 'biology-lab',
                    title: 'Biology Lab',
                },
            });

            // Create item-category link
            await prisma.pageItemCategory.create({
                data: {
                    itemId: item.id,
                    categoryId: category.id,
                    sortOrder: 0,
                },
            });

            // Create revision
            const revision = await prisma.pageRevision.create({
                data: {
                    pageId: testPageA.id,
                    version: 1,
                    reason: 'pre-migration',
                    snapshot: { title: testPageA.title },
                },
            });

            // Verify they exist
            expect(await prisma.pageItem.count({ where: { pageId: testPageA.id } })).toBe(1);
            expect(await prisma.pageCategory.count({ where: { pageId: testPageA.id } })).toBe(1);
            expect(await prisma.pageItemCategory.count({ where: { itemId: item.id } })).toBe(1);
            expect(await prisma.pageRevision.count({ where: { pageId: testPageA.id } })).toBe(1);

            // Delete parent page
            await prisma.page.delete({ where: { id: testPageA.id } });

            // Verify all children were cascade deleted
            expect(await prisma.pageItem.count({ where: { pageId: testPageA.id } })).toBe(0);
            expect(await prisma.pageCategory.count({ where: { pageId: testPageA.id } })).toBe(0);
            expect(await prisma.pageItemCategory.count({ where: { itemId: item.id } })).toBe(0);
            expect(await prisma.pageRevision.count({ where: { id: revision.id } })).toBe(0);
        });
    });

    describe('SlugRedirect Constraints', () => {
        it('enforces unique constraint on fromPath', async () => {
            const fromPath = `/redirect-test-${Date.now()}`;
            await prisma.slugRedirect.create({
                data: {
                    fromPath,
                    toPath: '/destination-a',
                },
            });

            await expect(
                prisma.slugRedirect.create({
                    data: {
                        fromPath,
                        toPath: '/destination-b',
                    },
                })
            ).rejects.toThrowError(Prisma.PrismaClientKnownRequestError);

            try {
                await prisma.slugRedirect.create({
                    data: {
                        fromPath,
                        toPath: '/destination-b',
                    },
                });
            } catch (err: any) {
                expect(err.code).toBe('P2002');
            }
        });
    });
});
