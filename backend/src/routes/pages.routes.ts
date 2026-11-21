import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { uploadDocument } from '../middleware/upload.middleware';
import { solutionsIndexService } from '../services/solutions-finder';

const router = Router();

const COLLEGE_SALE_SLUG = 'colleges-universities-for-sale';
const COLLEGE_SALE_DATA = {
    heroTitle: 'Businesses for Sale and Investment',
    heroSubtitle: 'Showing businesses for sale and investment. Buy or invest in a business listed by direct business owners and business brokers.',
    filterLabel: 'cbse schools',
    cards: [
        { title: 'School for Sale in Bahraich, India', description: 'CBSE school with 800+ students, day and boarding facility for sale in Bahraich. The school encompasses a total area of 87,000 square feet and includes approximately 40 rooms, fully equipped science and computer labs.', location: 'Bahraich', rating: '6.8', sales: 'INR 2.6 crore', margin: '40 %', askingPrice: 'INR 20 Cr', premium: true, image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=700&q=80' },
        { title: 'Playschool Seeking Loan in Haryana, India', description: 'Education society in Haryana with 5 CBSE schools and 70 playschools. This is an educational society with primary and play schools seeking growth funding.', location: 'Haryana', rating: '6.8', sales: 'INR 30 crore', margin: '25 %', askingPrice: 'INR 5 Cr at 15%', premium: true, image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=700&q=80' },
        { title: 'School for Sale in Thiruvananthapuram, India', description: 'CBSE-affiliated school with 400+ students and owned facilities. Located in Thiruvananthapuram, this school offers quality education from a well-established campus.', location: 'Thiruvananthapuram', rating: '6.2', sales: 'INR 1.6 crore', margin: '10 - 20 %', askingPrice: 'INR 8 Cr', image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=700&q=80' },
    ],
};

async function ensureCollegeSalePage() {
    const existing = await prisma.page.findUnique({ where: { slug: COLLEGE_SALE_SLUG } });
    if (existing) return existing;
    return prisma.page.create({
        data: {
            title: 'Colleges / Universities for Sale',
            slug: COLLEGE_SALE_SLUG,
            template: COLLEGE_SALE_SLUG,
            published: true,
            pageData: JSON.stringify(COLLEGE_SALE_DATA),
        },
    });
}

const PARTNER_SLUG = 'partner-with-colleges';
const JOB_OPENINGS_SLUG = 'job-openings';

// Makes sure the "Partner With Running Colleges" page (linked from the Classifieds
// "Partnership Opportunities" card) always has a DB row so it shows up in the admin
// Pages Manager. Its full default content lives in the React component and can be edited in the admin CMS.
async function ensurePartnerPage() {
    const existing = await prisma.page.findUnique({ where: { slug: PARTNER_SLUG } });
    if (existing) return existing;
    return prisma.page.create({
        data: {
            title: 'Partner With Running Colleges',
            slug: PARTNER_SLUG,
            template: PARTNER_SLUG,
            published: true,
            pageData: JSON.stringify({}),
        },
    });
}

async function ensureJobOpeningsPage() {
    const existing = await prisma.page.findUnique({ where: { slug: JOB_OPENINGS_SLUG } });
    if (existing) return existing;
    return prisma.page.create({
        data: {
            title: 'Job Openings',
            slug: JOB_OPENINGS_SLUG,
            template: JOB_OPENINGS_SLUG,
            published: true,
            pageData: JSON.stringify({}),
        },
    });
}

async function restorePartnershipIdentity() {
    const existing = await prisma.page.findUnique({ where: { slug: 'partnership' } });
    if (existing) return existing;
    return prisma.page.create({
        data: {
            title: 'Partnership Enquiry',
            slug: 'partnership',
            template: 'partnership',
            published: true,
            pageData: JSON.stringify({}),
        },
    });
}


async function ensureSimplePage(slug: string, title: string) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
        return existing;
    }
    return prisma.page.create({
        data: {
            title,
            slug,
            template: slug,
            published: true,
            pageData: JSON.stringify({}),
        },
    });
}

function createEmptyArticlePageData(title: string) {
    return {
        category: '',
        heroTitle: title || '',
        heroImage: '',
        body: '',
        ctaTitle: '',
        ctaSubtitle: '',
        ctaButtonLabel: '',
        ctaHref: '/contact-us',
        hideHero: false,
        hideBody: false,
        hideCta: true,
    };
}

const ARTICLE_PAGE_SLUGS = new Set([
    'how-it-works',
    'brand-help',
    'sell-on-schoolmart',
    'sell-on-campusmart',
    '20-stunning-college-buildings',
    'academic-buildings',
    'research-facilities',
    'student-life-centers',
    'privacy-policy',
    'terms-of-use',
    'payment-policy',
    'replacement-return',
    'order-rejection',
]);

const requiredDefaults: [string, string][] = [
    ['science-tech-labs', 'Science & Tech Labs'],
    ['campus-master-planning', 'Campus Master Planning'],
    ['ar-vr-experiences', 'AR / VR Learning'],
    ['campus-furniture-design', 'Campus Furniture Design'],
    ['collaboration-spaces', 'Collaboration Spaces'],
    ['contact-us', 'Contact Us'],
    ['catalogues', 'Catalogues & Downloads'],
    ['faq', 'Frequently Asked Questions'],
    ['how-it-works', 'How It Works'],
    ['brand-help', 'Brand Help'],
    ['sell-on-schoolmart', 'Sell on SchoolMart'],
    ['sell-on-campusmart', 'Sell on CampusMart'],
    ['20-stunning-college-buildings', '20 Stunning College Buildings'],
    ['academic-buildings', 'Academic Buildings'],
    ['research-facilities', 'Research Facilities'],
    ['student-life-centers', 'Student Life Centers'],
    ['privacy-policy', 'Privacy Policy'],
    ['terms-of-use', 'Terms of Use'],
    ['payment-policy', 'Payment Policy'],
    ['replacement-return', 'Replacement & Return Policy'],
    ['order-rejection', 'Order Rejection Policy'],
    ['home', 'Homepage'],
    ['campus-design', 'Campus Design'],
    ['campus-design-execution', 'Campus Design & Execution'],
    ['ai-guide', 'AI Implementation Guide'],
    ['setup-college', 'Setup Your College'],
    ['ugc-guidelines', 'UGC Guidelines'],
    ['innovation', 'Innovation'],
    ['resources', 'Resources & Guides'],
    ['collaboration', 'Collaboration Spaces'],
];

async function ensureArticlePage(slug: string, title: string) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
        let needsUpdate = false;
        const updateData: Record<string, any> = {};

        if (existing.template !== 'article') {
            updateData.template = 'article';
            needsUpdate = true;
        }

        let currentData: any = null;
        try {
            currentData = typeof existing.pageData === 'string' ? JSON.parse(existing.pageData) : existing.pageData;
        } catch {
            currentData = null;
        }

        if (!currentData || typeof currentData !== 'object' || Object.keys(currentData).length === 0) {
            updateData.pageData = JSON.stringify(createEmptyArticlePageData(existing.title || title));
            needsUpdate = true;
        } else if (!currentData.body && Array.isArray(currentData.sections) && currentData.sections.length > 0) {
            const parts: string[] = [];
            if (currentData.heroSubtitle) {
                parts.push(`<p><strong>${currentData.heroSubtitle}</strong></p>`);
            }
            for (const s of currentData.sections) {
                if (!s || s.active === false) continue;
                if (s.heading) parts.push(`<h3>${s.heading}</h3>`);
                if (s.body) parts.push(`<p>${s.body}</p>`);
                if (Array.isArray(s.bullets) && s.bullets.length > 0) {
                    parts.push(`<ul>${s.bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>`);
                }
            }
            const cleanArticleData = {
                category: currentData.category || currentData.heroEyebrow || '',
                heroTitle: currentData.heroTitle || currentData.title || existing.title || title || '',
                heroImage: currentData.heroImage || currentData.featuredImage || '',
                body: parts.join('\n'),
                ctaTitle: currentData.ctaTitle || '',
                ctaSubtitle: currentData.ctaSubtitle || '',
                ctaButtonLabel: currentData.ctaButtonLabel || '',
                ctaHref: currentData.ctaHref || '/contact-us',
                hideHero: Boolean(currentData.hideHero),
                hideBody: Boolean(currentData.hideBody),
                hideCta: currentData.hideCta !== undefined ? Boolean(currentData.hideCta) : !currentData.ctaTitle,
            };
            updateData.pageData = JSON.stringify(cleanArticleData);
            needsUpdate = true;
        }

        if (needsUpdate) {
            try {
                return await prisma.page.update({
                    where: { slug },
                    data: updateData,
                });
            } catch (err) {
                console.warn(`Failed to update page ${slug} to article template:`, err);
                return existing;
            }
        }
        return existing;
    }

    return prisma.page.create({
        data: {
            title,
            slug,
            template: 'article',
            published: true,
            pageData: JSON.stringify(createEmptyArticlePageData(title)),
        },
    });
}

// GET /api/pages - get all pages (admin only to see unpublished)
router.get('/', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        let pages = await prisma.page.findMany({
            orderBy: { title: 'asc' }
        });

        // Fast in-memory slug check: only seed missing pages if database is missing defaults
        const pageMap = new Map(pages.map(p => [p.slug, p]));
        let missingPagesCreated = false;

        if (!pageMap.has(COLLEGE_SALE_SLUG)) {
            await ensureCollegeSalePage();
            missingPagesCreated = true;
        }
        if (!pageMap.has(PARTNER_SLUG)) {
            await ensurePartnerPage();
            missingPagesCreated = true;
        }
        if (!pageMap.has(JOB_OPENINGS_SLUG)) {
            await ensureJobOpeningsPage();
            missingPagesCreated = true;
        }
        if (!pageMap.has('partnership')) {
            await restorePartnershipIdentity();
            missingPagesCreated = true;
        }

        for (const [slug, title] of requiredDefaults) {
            const existing = pageMap.get(slug);
            if (!existing) {
                if (ARTICLE_PAGE_SLUGS.has(slug)) {
                    await ensureArticlePage(slug, title);
                } else {
                    await ensureSimplePage(slug, title);
                }
                missingPagesCreated = true;
            } else if (ARTICLE_PAGE_SLUGS.has(slug) && (existing.template !== 'article' || !existing.pageData || existing.pageData === '{}')) {
                await ensureArticlePage(slug, title);
                missingPagesCreated = true;
            }
        }

        if (missingPagesCreated) {
            pages = await prisma.page.findMany({
                orderBy: { title: 'asc' }
            });
        }

        console.log(`Admin ${_req.user?.id} fetched ${pages.length} pages`);
        res.json(pages);
    } catch (error) {
        console.error('Failed to fetch pages:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// GET /api/pages/published - get all published pages (public)
router.get('/published', async (req: Request, res: Response) => {
    try {
        await ensureSimplePage('faq', 'Frequently Asked Questions');
        for (const [s, t] of requiredDefaults) {
            if (ARTICLE_PAGE_SLUGS.has(s)) {
                await ensureArticlePage(s, t);
            }
        }
        const pages = await prisma.page.findMany({
            where: { published: true }
        });
        res.json(pages);
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
            let rawData: any = {};
            if (page?.pageData) {
                try {
                    rawData = typeof page.pageData === 'string' ? JSON.parse(page.pageData) : page.pageData;
                } catch {}
            }

            const explicitCats: string[] = Array.isArray(rawData.categories)
                ? rawData.categories.filter(Boolean)
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

        if (!isNumeric && normalizedParam === COLLEGE_SALE_SLUG) {
            return res.json(await ensureCollegeSalePage());
        }
        if (!isNumeric && normalizedParam === 'catalogues') {
            return res.json(await ensureSimplePage('catalogues', 'Catalogues & Downloads'));
        }
        if (!isNumeric && normalizedParam === 'faq') {
            return res.json(await ensureSimplePage('faq', 'Frequently Asked Questions'));
        }
        if (!isNumeric && ARTICLE_PAGE_SLUGS.has(normalizedParam)) {
            const defItem = requiredDefaults.find(([s]) => s === normalizedParam);
            const title = defItem ? defItem[1] : normalizedParam;
            return res.json(await ensureArticlePage(normalizedParam, title));
        }
        if (!isNumeric && normalizedParam === 'campus-design') {
            return res.json(await ensureSimplePage('campus-design', 'Campus Design'));
        }
        if (!isNumeric && normalizedParam === 'campus-design-execution') {
            return res.json(await ensureSimplePage('campus-design-execution', 'Campus Design & Execution'));
        }
        if (!isNumeric && normalizedParam === 'home') {
            return res.json(await ensureSimplePage('home', 'Homepage'));
        }

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

        for (const field of validFields) {
            if (req.body[field] !== undefined) {
                if (field === 'pageData') {
                    let serialized = typeof req.body.pageData === 'object' && req.body.pageData !== null ? JSON.stringify(req.body.pageData) : String(req.body.pageData || '{}');
                    createData.pageData = serialized
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
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
        res.status(201).json(page);
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
                return res.status(201).json(page);
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
                    let serialized = typeof req.body.pageData === 'object' && req.body.pageData !== null ? JSON.stringify(req.body.pageData) : String(req.body.pageData || '{}');
                    
                    updateData.pageData = serialized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
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
        res.json(page);
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
