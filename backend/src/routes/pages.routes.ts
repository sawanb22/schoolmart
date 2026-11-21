import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parsePageData } from '../lib/page-data';
import { toLegacyPageResponse, toLegacyPagesResponse } from '../services/page-content/page-response';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { uploadDocument } from '../middleware/upload.middleware';
import { solutionsIndexService } from '../services/solutions-finder';
import { bootstrapPages } from '../services/bootstrap-pages';

const router = Router();

// GET /api/pages - get all pages (admin only to see unpublished)
router.get('/', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        await bootstrapPages();
        const pages = await prisma.page.findMany({
            orderBy: { title: 'asc' }
        });
        console.log(`Admin ${_req.user?.id} fetched ${pages.length} pages`);
        res.json(toLegacyPagesResponse(pages));
    } catch (error) {
        console.error('Failed to fetch pages:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// GET /api/pages/published - get all published pages (public)
router.get('/published', async (_req: Request, res: Response) => {
    try {
        const pages = await prisma.page.findMany({
            where: { published: true }
        });
        res.json(toLegacyPagesResponse(pages));
    } catch (err) {
        console.error('Failed to fetch published pages:', err);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// GET /api/pages/hub/catalog - Master Hub Aggregator for Shop (Option B: On-Demand Hub Loading)
router.get('/hub/catalog', async (req: Request, res: Response) => {
    try {
        const requestedHub = typeof req.query.hub === 'string' ? req.query.hub.trim().toLowerCase() : '';

        // 1. Fetch CMS hub pages
        const hubPages = await prisma.page.findMany({
            where: {
                slug: { in: ['labs', 'sports-infra', 'tech-infra', 'libraries'] },
                published: true,
            },
            select: { id: true, slug: true, title: true, pageData: true },
        });

        // 2. Fetch Furniture data
        const needFurnitureItems = !requestedHub || requestedHub === 'furniture' || requestedHub === 'all';

        const [furnitureProducts, furnitureCount, furnitureCategories] = await Promise.all([
            needFurnitureItems
                ? prisma.product.findMany({
                    where: { active: true, category: { page: 'furniture' } },
                    include: { category: { select: { id: true, name: true, slug: true } } },
                    orderBy: { createdAt: 'desc' },
                })
                : Promise.resolve([]),
            prisma.product.count({
                where: { active: true, category: { page: 'furniture' } },
            }),
            prisma.category.findMany({
                where: { page: 'furniture' },
                select: { name: true, slug: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        const hubMap = new Map<string, any>(hubPages.map(p => [p.slug, p]));

        interface UnifiedHubItem {
            id: string | number;
            title: string;
            description: string;
            image: string;
            categories: string[];
            slug: string;
            href: string;
            hubSlug: string;
            hubTitle: string;
            price?: number;
        }

        const items: UnifiedHubItem[] = [];

        // Build Furniture items if needed
        const furnitureCatNames = Array.from(new Set([
            ...furnitureCategories.map(c => c.name.trim()),
            ...furnitureProducts.map(p => p.category?.name?.trim()).filter(Boolean) as string[],
        ]));

        if (needFurnitureItems) {
            for (const p of furnitureProducts) {
                const catName = p.category?.name?.trim() || 'General Furniture';
                items.push({
                    id: `prod-${p.id}`,
                    title: p.name,
                    description: p.description || '',
                    image: p.imageUrl || '',
                    categories: [catName],
                    slug: p.slug,
                    href: `/product/${p.slug}`,
                    hubSlug: 'furniture',
                    hubTitle: 'Campus Furniture',
                    price: p.price,
                });
            }
        }

        // Metadata definitions with robust fallback subcategories
        const HUB_METADATA: Record<string, { title: string; defaultCategories: string[] }> = {
            'furniture': { title: 'Campus Furniture', defaultCategories: furnitureCatNames },
            'labs': { title: 'Science & Tech Labs', defaultCategories: ['Science Labs', 'Skill Labs', 'Tech Labs', 'STEM & Innovation'] },
            'sports-infra': { title: 'Sports Infrastructure', defaultCategories: ['Consulting', 'Surface Sports', 'Indoor Sports', 'Athletics', 'Water Sports', 'Artificial Turf'] },
            'tech-infra': { title: 'Tech Infrastructure', defaultCategories: ['Classroom Tech', 'Displays', 'Networking', 'Wi-Fi & Fiber', 'Servers & Cloud', 'Security'] },
            'libraries': { title: 'Smart Libraries', defaultCategories: ['Seating', 'Shelving & Display', 'Digital & Tech', 'Collaborative'] },
        };

        const hubConfigs: Array<{ id: string; title: string; subcategories: string[]; totalCount: number }> = [];

        // Add Furniture Hub config
        hubConfigs.push({
            id: 'furniture',
            title: HUB_METADATA['furniture'].title,
            subcategories: furnitureCatNames,
            totalCount: furnitureCount,
        });

        // Process CMS page hubs (labs, sports-infra, tech-infra, libraries)
        for (const slug of ['labs', 'sports-infra', 'tech-infra', 'libraries']) {
            const page = hubMap.get(slug);
            const meta = HUB_METADATA[slug] || { title: slug, defaultCategories: [] };
            const rawData = parsePageData(page?.pageData);

            const explicitCats: string[] = Array.isArray(rawData.categories)
                ? (rawData.categories as string[]).filter(Boolean)
                : meta.defaultCategories;

            const pageCards: any[] = Array.isArray(rawData.cards) ? rawData.cards : [];
            const cardCatSet = new Set<string>(explicitCats);

            const needThisHubItems = !requestedHub || requestedHub === 'all' || requestedHub === slug;

            let pageItemCount = 0;
            for (let i = 0; i < pageCards.length; i++) {
                const c = pageCards[i];
                if (!c || !c.title) continue;

                const cardCats: string[] = Array.isArray(c.categories)
                    ? c.categories.filter(Boolean)
                    : c.category
                    ? [c.category]
                    : [];

                cardCats.forEach(cat => {
                    if (cat) cardCatSet.add(cat.trim());
                });

                if (needThisHubItems) {
                    const fallbackSlug = String(c.slug || c.title || `card-${i}`)
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '') || `item-${i}`;

                    items.push({
                        id: `${slug}-${i}`,
                        title: c.title,
                        description: c.description || '',
                        image: c.image || '',
                        categories: cardCats.length > 0 ? cardCats : [explicitCats[0] || 'General'],
                        slug: fallbackSlug,
                        href: c.href || `/${slug}/${fallbackSlug}`,
                        hubSlug: slug,
                        hubTitle: page?.title || meta.title,
                    });
                }
                pageItemCount++;
            }

            hubConfigs.push({
                id: slug,
                title: page?.title || meta.title,
                subcategories: Array.from(cardCatSet),
                totalCount: pageItemCount,
            });
        }

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
        res.json({
            activeHub: requestedHub || 'furniture',
            hubs: hubConfigs,
            items,
        });
    } catch (error) {
        console.error('Failed to fetch hub catalog:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// GET /api/pages/:idOrSlug - get specific page by ID (number) or slug (string)
router.get('/:idOrSlug', async (req: Request, res: Response) => {
    try {
        const param = req.params.idOrSlug as string;
        const normalizedParam = param;
        const numericId = parseInt(normalizedParam);
        const isNumeric = !isNaN(numericId) && String(numericId) === normalizedParam;

        let page = isNumeric
            ? await prisma.page.findUnique({ where: { id: numericId } })
            : await prisma.page.findUnique({ where: { slug: normalizedParam } });

        if (!page && !isNumeric) {
            if (normalizedParam === 'sports') {
                page = await prisma.page.findUnique({ where: { slug: 'sports-infra' } });
            } else if (normalizedParam === 'sports-infra') {
                page = await prisma.page.findUnique({ where: { slug: 'sports' } });
            } else if (normalizedParam === 'sell-on-schoolmart') {
                page = await prisma.page.findUnique({ where: { slug: 'sell-on-campusmart' } });
            } else if (normalizedParam === 'sell-on-campusmart') {
                page = await prisma.page.findUnique({ where: { slug: 'sell-on-schoolmart' } });
            }
        }

        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }
        res.json(toLegacyPageResponse(page));
    } catch (err) {
        console.error('Failed to fetch page:', err);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// POST /api/pages/upload-document - upload a PDF (e.g. NDA, Mandate) and get back its URL (admin)
router.post('/upload-document', verifyToken, requireAdmin, uploadDocument.single('file'), (req: AuthRequest, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: 'A PDF file is required' });
        return;
    }
    res.status(201).json({
        url: `/uploads/documents/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
    });
});

// POST /api/pages - create a page
router.post('/', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const createData: Record<string, any> = {
        published: true,
    };
    try {
        // Validate required fields
        if (!req.body.title || !req.body.slug) {
            res.status(400).json({ error: 'Title and slug are required' });
            return;
        }

        const validFields: Array<'title' | 'slug' | 'content' | 'template' | 'pageData' | 'published'> = [
            'title', 'slug', 'content', 'template', 'pageData', 'published'
        ];

        for (const field of validFields) {
            if (req.body[field] !== undefined) {
                if (field === 'pageData') {
                    const parsed = parsePageData(req.body.pageData);
                    const cleanStr = JSON.stringify(parsed)
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
                    createData.pageData = JSON.parse(cleanStr) as Prisma.InputJsonValue;
                } else if (field === 'published' && typeof req.body.published !== 'boolean') {
                    createData.published = req.body.published === 'true' || req.body.published === 1;
                } else {
                    createData[field] = req.body[field];
                }
            }
        }

        // Automatic non-colliding slug generation
        const baseSlug = String(req.body.slug || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'page';

        let targetSlug = baseSlug;
        let counter = 2;
        while (await prisma.page.findUnique({ where: { slug: targetSlug } })) {
            targetSlug = `${baseSlug}-${counter}`;
            counter++;
        }
        createData.slug = targetSlug;

        const page = await prisma.page.create({
            data: createData as any
        });
        console.log(`Page created by admin ${req.user?.id}: ${page.slug}`);
        solutionsIndexService.rebuild().catch(err => console.error('[SolutionsIndex] Rebuild error on page create:', err));
        res.status(201).json(toLegacyPageResponse(page));
    } catch (error: any) {
        if (error?.code === 'P2002') {
            try {
                // If race condition caused collision, try one more time with a unique suffix
                const fallbackSlug = `${createData.slug || req.body.slug || 'page'}-${Date.now()}`;
                createData.slug = fallbackSlug;
                const page = await prisma.page.create({
                    data: createData as any
                });
                console.log(`Page created with collision resolution by admin ${req.user?.id}: ${page.slug}`);
                return res.status(201).json(toLegacyPageResponse(page));
            } catch (retryError: any) {
                console.error('Collision resolution retry failed:', retryError);
                return res.status(409).json({ error: 'A page with this slug already exists. Please choose a different title or slug.' });
            }
        }
        console.error('Failed to create page:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// PUT /api/pages/:id - update a page
router.put('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        
        // Validate ID
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid page ID' });
            return;
        }

        // Check page exists before attempting update
        const existing = await prisma.page.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Page not found' });
            return;
        }

        const validFields: Array<'title' | 'slug' | 'content' | 'template' | 'pageData' | 'published'> = [
            'title', 'slug', 'content', 'template', 'pageData', 'published'
        ];
        const updateData: Record<string, any> = {
            updatedAt: new Date()
        };

        for (const field of validFields) {
            if (req.body[field] !== undefined) {
                if (field === 'pageData') {
                    const parsed = parsePageData(req.body.pageData);
                    const cleanStr = JSON.stringify(parsed)
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
                    updateData.pageData = JSON.parse(cleanStr) as Prisma.InputJsonValue;
                } else if (field === 'published' && typeof req.body.published !== 'boolean') {
                    updateData.published = req.body.published === 'true' || req.body.published === 1;
                } else {
                    updateData[field] = req.body[field];
                }
            }
        }

        // Update page (atomic transaction if slug changes)
        let page;
        if (updateData.slug && updateData.slug !== existing.slug) {
            const [updatedPage] = await prisma.$transaction([
                prisma.page.update({ where: { id }, data: updateData }),
                prisma.searchCard.updateMany({
                    where: { targetSlug: existing.slug },
                    data: { targetSlug: updateData.slug }
                })
            ]);
            page = updatedPage;
        } else {
            page = await prisma.page.update({
                where: { id },
                data: updateData
            });
        }
        
        console.log(`Page ${id} updated by admin ${req.user?.id}`);
        solutionsIndexService.rebuild().catch(err => console.error('[SolutionsIndex] Rebuild error on page update:', err));
        res.json(toLegacyPageResponse(page));
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.status(409).json({ error: 'A page with this URL slug already exists. Please choose a different slug.' });
            return;
        }
        console.error(`Failed to update page ${req.params.id}:`, error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// DELETE /api/pages/:id - delete a page
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        
        // Validate ID
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid page ID' });
            return;
        }

        // Check page exists before attempting delete
        const existing = await prisma.page.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Page not found' });
            return;
        }

        const PROTECTED_SLUGS = ['colleges-universities-for-sale', 'home', 'classifieds', 'catalogues', 'faq', 'blog'];
        if (PROTECTED_SLUGS.includes(existing.slug)) {
            res.status(403).json({ error: 'System critical pages cannot be deleted. You can unpublish this page instead.' });
            return;
        }

        await prisma.page.delete({
            where: { id }
        });
        console.log(`Page ${id} deleted by admin ${req.user?.id}`);
        solutionsIndexService.rebuild().catch(err => console.error('[SolutionsIndex] Rebuild error on page delete:', err));
        res.status(204).end();
    } catch (error) {
        console.error(`Failed to delete page ${req.params.id}:`, error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

export default router;
