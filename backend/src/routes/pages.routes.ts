import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parsePageData } from '../lib/page-data';
import { toLegacyPageResponse, toLegacyPagesResponse } from '../services/page-content/page-response';
import { verifyToken, requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth.middleware';
import { uploadDocument } from '../middleware/upload.middleware';
import { bootstrapPages } from '../services/bootstrap-pages';
import { pageContentService } from '../services/page-content/page-content.service';
import { splitLegacyPageData, classifyPage } from '../services/page-content/legacy-mapper';
import { writeStructuredPage } from '../services/page-content/structured-writer';
import { afterContentWrite } from '../services/page-content/after-content-write';
import { COLLECTIONS, LEGACY_HUB_DEFAULT_CATEGORIES } from '../services/page-content/constants';
import { sanitizePageData, sanitizeRichHtml } from '../lib/sanitize';

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

        // 1. Fetch CMS hub pages with relational items & categories
        const hubPages = await prisma.page.findMany({
            where: {
                slug: { in: ['labs', 'sports-infra', 'tech-infra', 'libraries'] },
                published: true,
            },
            select: {
                id: true,
                slug: true,
                title: true,
                contentModel: true,
                pageData: true,
                categories: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, name: true, slug: true, sortOrder: true },
                },
                items: {
                    where: { published: true, collection: 'cards' },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        categories: {
                            orderBy: { sortOrder: 'asc' },
                            include: { category: true },
                        },
                    },
                },
            },
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

        // Hub titles metadata (default categories removed - read from relational tables)
        const HUB_METADATA: Record<string, { title: string }> = {
            'furniture': { title: 'Campus Furniture' },
            'labs': { title: 'Science & Tech Labs' },
            'sports-infra': { title: 'Sports Infrastructure' },
            'tech-infra': { title: 'Tech Infrastructure' },
            'libraries': { title: 'Smart Libraries' },
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
            const meta = HUB_METADATA[slug] || { title: slug };
            const needThisHubItems = !requestedHub || requestedHub === 'all' || requestedHub === slug;

            if (page && page.contentModel === 'structured') {
                const dbCats = (page.categories || []).map((c: any) => c.name.trim()).filter(Boolean);
                const fallbackCats = LEGACY_HUB_DEFAULT_CATEGORIES[slug] || [];
                const explicitCats = dbCats.length > 0 ? dbCats : fallbackCats;
                const cardCatSet = new Set<string>(explicitCats);
                const pageItems: any[] = page.items || [];

                for (let i = 0; i < pageItems.length; i++) {
                    const item = pageItems[i];
                    if (!item || !item.title) continue;

                    const itemCats: string[] = (item.categories || [])
                        .map((ic: any) => ic.category?.name?.trim() || ic.name?.trim())
                        .filter(Boolean);

                    itemCats.forEach((cat: string) => cardCatSet.add(cat));

                    if (needThisHubItems) {
                        const fallbackSlug = String(item.slug || item.title || `item-${i}`)
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '') || `item-${i}`;

                        const resolvedCategories = itemCats.length > 0
                            ? itemCats
                            : (explicitCats.length > 0 ? [explicitCats[0]] : ['General']);

                        items.push({
                            id: `pi-${item.id}`,
                            title: item.title,
                            description: item.summary || (item.data as any)?.description || '',
                            image: item.imageUrl || (item.data as any)?.image || '',
                            categories: resolvedCategories,
                            slug: item.slug || fallbackSlug,
                            href: item.href || `/${slug}/${item.slug || fallbackSlug}`,
                            hubSlug: slug,
                            hubTitle: page.title || meta.title,
                        });
                    }
                }

                hubConfigs.push({
                    id: slug,
                    title: page.title || meta.title,
                    subcategories: Array.from(cardCatSet),
                    totalCount: pageItems.length,
                });
            } else {
                // Legacy unmigrated blob fallback
                const rawData = parsePageData(page?.pageData);
                const fallbackCats = LEGACY_HUB_DEFAULT_CATEGORIES[slug] || [];
                const explicitCats: string[] = (Array.isArray(rawData.categories) && rawData.categories.length > 0)
                    ? (rawData.categories as string[]).filter(Boolean)
                    : fallbackCats;

                const pageCards: any[] = Array.isArray(rawData.cards) ? rawData.cards : [];
                const cardCatSet = new Set<string>(explicitCats);

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
                            categories: cardCats.length > 0 ? cardCats : (explicitCats[0] ? [explicitCats[0]] : ['General']),
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

// GET /api/pages/:slug/items/:itemSlug - get single item within a hub (or redirect)
router.get('/:slug/items/:itemSlug', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
        const slug = String(req.params.slug);
        const itemSlug = String(req.params.itemSlug);
        const isAdmin = req.user?.role === 'admin';
        const result = await pageContentService.getItem(slug, itemSlug, { isAdmin });

        if (!result) {
            return res.status(404).json({ error: 'not_found' });
        }

        if ('redirectTo' in result) {
            return res.status(200).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error(`Failed to fetch item ${req.params.itemSlug} in hub ${req.params.slug}:`, err);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// GET /api/pages/:idOrSlug - get specific page by ID (number) or slug (string)
router.get('/:idOrSlug', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
        const param = req.params.idOrSlug as string;
        const isAdmin = req.user?.role === 'admin';

        if (req.query.v === '2') {
            const v2 = await pageContentService.getHubV2(param, { isAdmin });
            if (!v2) {
                return res.status(404).json({ error: 'Page not found' });
            }
            return res.json(v2);
        }

        const page = await pageContentService.getPageLegacy(param, { isAdmin });
        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }
        res.json(page);
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

        let parsedIncomingPageData: Record<string, unknown> = {};

        for (const field of validFields) {
            if (req.body[field] !== undefined) {
                if (field === 'pageData') {
                    const parsed = parsePageData(req.body.pageData);
                    parsedIncomingPageData = sanitizePageData(parsed);
                    createData.pageData = parsedIncomingPageData as Prisma.InputJsonValue;
                } else if (field === 'content' && typeof req.body.content === 'string') {
                    createData.content = sanitizeRichHtml(req.body.content);
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

        const classification = classifyPage({ slug: targetSlug, template: createData.template, pageData: parsedIncomingPageData });
        const hasCollectionKeys =
            COLLECTIONS.some(col => col in parsedIncomingPageData) ||
            ('categories' in parsedIncomingPageData);

        let createdPage: any;

        if (classification === 'structured' && hasCollectionKeys) {
            const splitResult = splitLegacyPageData(parsedIncomingPageData);
            createdPage = await prisma.$transaction(async tx => {
                const page = await tx.page.create({
                    data: {
                        ...createData,
                        pageData: splitResult.settings as Prisma.InputJsonValue,
                        contentModel: 'structured',
                        version: 0,
                    } as any,
                });
                await writeStructuredPage(tx, page.id, splitResult, {
                    reason: 'page-create',
                    authorId: req.user?.id,
                });
                return page;
            });
        } else {
            createdPage = await prisma.page.create({
                data: {
                    ...createData,
                    contentModel: 'document',
                    version: 1,
                } as any,
            });
        }

        console.log(`Page created by admin ${req.user?.id}: ${createdPage.slug}`);
        await afterContentWrite({ pageId: createdPage.id, reason: 'page-create', authorId: req.user?.id });

        const responsePage = await pageContentService.getPageLegacy(createdPage.id, { isAdmin: true });
        res.status(201).json(responsePage);
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
                await afterContentWrite({ pageId: page.id, reason: 'page-create', authorId: req.user?.id });
                const responsePage = await pageContentService.getPageLegacy(page.id, { isAdmin: true });
                return res.status(201).json(responsePage);
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
        const existing = await pageContentService.loadPage(id, { includeUnpublished: true });
        if (!existing) {
            res.status(404).json({ error: 'Page not found' });
            return;
        }

        // Optimistic locking check: if version is provided, it must match existing.version
        if (req.body.version !== undefined && req.body.version !== null) {
            const incomingVersion = Number(req.body.version);
            if (!isNaN(incomingVersion) && incomingVersion !== existing.version) {
                const current = await pageContentService.getPageLegacy(id, { isAdmin: true });
                return res.status(409).json({ error: 'version_conflict', current });
            }
        }

        const validFields: Array<'title' | 'slug' | 'content' | 'template' | 'pageData' | 'published'> = [
            'title', 'slug', 'content', 'template', 'pageData', 'published'
        ];
        const updateData: Record<string, any> = {
            updatedAt: new Date()
        };

        let hasIncomingPageData = false;
        let incomingPageData: Record<string, unknown> = {};

        for (const field of validFields) {
            if (req.body[field] !== undefined) {
                if (field === 'pageData') {
                    hasIncomingPageData = true;
                    const parsed = parsePageData(req.body.pageData);
                    incomingPageData = sanitizePageData(parsed);
                    updateData.pageData = incomingPageData as Prisma.InputJsonValue;
                } else if (field === 'content' && typeof req.body.content === 'string') {
                    updateData.content = sanitizeRichHtml(req.body.content);
                } else if (field === 'published' && typeof req.body.published !== 'boolean') {
                    updateData.published = req.body.published === 'true' || req.body.published === 1;
                } else {
                    updateData[field] = req.body[field];
                }
            }
        }

        const isStructured = existing.contentModel === 'structured';
        const hasCollectionKeys =
            hasIncomingPageData &&
            (COLLECTIONS.some(col => col in incomingPageData) || ('categories' in incomingPageData));

        if (isStructured && hasCollectionKeys) {
            // Full blob write on structured page: split & writeStructuredPage
            const splitResult = splitLegacyPageData(incomingPageData);

            await prisma.$transaction(async tx => {
                const basicUpdates: any = { updatedAt: new Date() };
                if (updateData.title !== undefined) basicUpdates.title = updateData.title;
                if (updateData.slug !== undefined) basicUpdates.slug = updateData.slug;
                if (updateData.content !== undefined) basicUpdates.content = updateData.content;
                if (updateData.template !== undefined) basicUpdates.template = updateData.template;
                if (updateData.published !== undefined) basicUpdates.published = updateData.published;

                await tx.page.update({
                    where: { id },
                    data: basicUpdates,
                });

                await writeStructuredPage(tx, id, splitResult, {
                    reason: 'legacy-adapter-update',
                    authorId: req.user?.id,
                });

                if (updateData.slug && updateData.slug !== existing.slug) {
                    await tx.searchCard.updateMany({
                        where: { targetSlug: existing.slug },
                        data: { targetSlug: updateData.slug }
                    });
                }
            });
        } else if (isStructured && !hasCollectionKeys) {
            // Settings-only update on structured page: merge settings over existing
            const currentSettings = parsePageData(existing.pageData);
            const mergedSettings = hasIncomingPageData
                ? { ...currentSettings, ...incomingPageData }
                : currentSettings;

            const basicUpdates: any = {
                ...updateData,
                pageData: mergedSettings as Prisma.InputJsonValue,
                version: { increment: 1 },
                updatedAt: new Date(),
            };

            await prisma.$transaction(async tx => {
                await tx.page.update({
                    where: { id },
                    data: basicUpdates,
                });

                if (updateData.slug && updateData.slug !== existing.slug) {
                    await tx.searchCard.updateMany({
                        where: { targetSlug: existing.slug },
                        data: { targetSlug: updateData.slug }
                    });
                }
            });
        } else {
            // Document page: standard update
            await prisma.$transaction(async tx => {
                await tx.page.update({
                    where: { id },
                    data: {
                        ...updateData,
                        version: { increment: 1 },
                        updatedAt: new Date(),
                    },
                });

                if (updateData.slug && updateData.slug !== existing.slug) {
                    await tx.searchCard.updateMany({
                        where: { targetSlug: existing.slug },
                        data: { targetSlug: updateData.slug }
                    });
                }
            });
        }

        console.log(`Page ${id} updated by admin ${req.user?.id}`);
        await afterContentWrite({ pageId: id, reason: 'legacy-adapter-update', authorId: req.user?.id });

        const updatedResponse = await pageContentService.getPageLegacy(id, { isAdmin: true });
        res.json(updatedResponse);
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
        await afterContentWrite({ pageId: id, reason: 'page-delete', authorId: req.user?.id });
        res.status(204).end();
    } catch (error) {
        console.error(`Failed to delete page ${req.params.id}:`, error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

export default router;
