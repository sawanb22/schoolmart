import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { solutionsIndexService } from '../services/solutions-finder';
import { validateTaxonomyPayload } from '../services/solutions-finder/taxonomy.validator';
import { SolutionsTaxonomy } from '../services/solutions-finder/types/solutions-card.types';

const router = Router();

// Require admin authentication for all routes in this router
router.use(verifyToken, requireAdmin);

/**
 * Resolve unified 5-group human-readable labels from Page.template
 */
export function resolvePageGroup(template: string | null): string {
  switch (template) {
    case 'article':
      return 'Editorial & Articles';
    case 'grid':
      return 'Strategic Guides & Hubs';
    case 'solution-hub':
      return 'Solution Infrastructure Hubs';
    case 'service-suite':
      return 'Turnkey Service Suites';
    default:
      return 'Standard Pages';
  }
}

// ─── 1. CARDS MANAGEMENT ──────────────────────────────────────────────────────

// GET /api/admin/solutions-finder/cards - List all cards with target page status
router.get('/cards', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [cards, pages] = await Promise.all([
      prisma.searchCard.findMany({
        orderBy: [{ priority: 'desc' }, { cardSlug: 'asc' }],
      }),
      prisma.page.findMany({
        select: { slug: true, title: true, published: true },
      }),
    ]);

    const pageMap = new Map(pages.map(p => [p.slug, p]));

    const enriched = cards.map(card => {
      const page = pageMap.get(card.targetSlug);
      return {
        ...card,
        targetPageExists: Boolean(page),
        targetPagePublished: Boolean(page?.published),
        targetPageTitle: page?.title ?? null,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Failed to fetch solutions cards:', err);
    res.status(500).json({ error: 'Failed to fetch solutions cards' });
  }
});

// GET /api/admin/solutions-finder/pages-lookup - List live pages for searchable dropdown
router.get('/pages-lookup', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pages = await prisma.page.findMany({
      select: { id: true, slug: true, title: true, template: true, published: true },
      orderBy: { title: 'asc' },
    });

    const result = pages.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      template: p.template,
      published: p.published,
      group: resolvePageGroup(p.template),
    }));

    res.json(result);
  } catch (err) {
    console.error('Failed to lookup pages:', err);
    res.status(500).json({ error: 'Failed to fetch pages lookup' });
  }
});

// POST /api/admin/solutions-finder/cards - Create new card
router.post('/cards', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      cardSlug,
      targetSlug,
      sectionAnchor,
      categorySlug,
      subcategorySlug,
      secondaryCategorySlugs,
      title,
      summary,
      inclusions,
      badge,
      imageUrl,
      keywords,
      institutionTypes,
      relatedCardSlugs,
      priority,
      active,
    } = req.body || {};

    // Validate cardSlug
    if (!cardSlug || typeof cardSlug !== 'string' || !/^[a-z0-9-]+$/.test(cardSlug.trim())) {
      res.status(400).json({ error: 'cardSlug is required and must contain only lowercase letters, numbers, and hyphens' });
      return;
    }
    const cleanCardSlug = cardSlug.trim().toLowerCase();

    // Check slug uniqueness
    const existingSlug = await prisma.searchCard.findUnique({
      where: { cardSlug: cleanCardSlug },
    });
    if (existingSlug) {
      res.status(409).json({ error: `A card with slug "${cleanCardSlug}" already exists.` });
      return;
    }

    // Validate targetSlug
    if (!targetSlug || typeof targetSlug !== 'string' || !targetSlug.trim()) {
      res.status(400).json({ error: 'targetSlug is required' });
      return;
    }
    const cleanTargetSlug = targetSlug.trim();
    const targetPage = await prisma.page.findUnique({
      where: { slug: cleanTargetSlug },
      select: { id: true, slug: true, title: true },
    });
    if (!targetPage) {
      res.status(400).json({ error: `Target page slug "${cleanTargetSlug}" does not exist in the Page table.` });
      return;
    }

    // Validate title & summary
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      res.status(400).json({ error: 'title is required and must be at least 3 characters' });
      return;
    }
    if (!summary || typeof summary !== 'string' || summary.trim().length < 10) {
      res.status(400).json({ error: 'summary is required and must be at least 10 characters' });
      return;
    }

    // Validate strictly 3 non-empty inclusions
    if (!Array.isArray(inclusions)) {
      res.status(400).json({ error: 'inclusions must be an array of exactly 3 items' });
      return;
    }
    const sanitizedInclusions = inclusions
      .map(i => (typeof i === 'string' ? i.trim() : ''))
      .filter(i => i.length > 0);

    if (sanitizedInclusions.length !== 3) {
      res.status(400).json({ error: 'Strict Invariant: Exactly 3 non-empty inclusions are required.' });
      return;
    }

    // Validate categorySlug
    if (!categorySlug || typeof categorySlug !== 'string' || !categorySlug.trim()) {
      res.status(400).json({ error: 'categorySlug is required' });
      return;
    }

    // Clean sectionAnchor (strip leading #)
    let cleanAnchor: string | null = null;
    if (typeof sectionAnchor === 'string' && sectionAnchor.trim()) {
      cleanAnchor = sectionAnchor.trim().replace(/^#+/, '');
    }

    // Clean related cards (remove self)
    const cleanRelated = Array.isArray(relatedCardSlugs)
      ? relatedCardSlugs.filter(s => typeof s === 'string' && s.trim() && s.trim() !== cleanCardSlug).map(s => s.trim())
      : [];

    const newCard = await prisma.searchCard.create({
      data: {
        cardSlug: cleanCardSlug,
        targetSlug: cleanTargetSlug,
        sectionAnchor: cleanAnchor,
        categorySlug: categorySlug.trim(),
        subcategorySlug: typeof subcategorySlug === 'string' && subcategorySlug.trim() ? subcategorySlug.trim() : null,
        secondaryCategorySlugs: Array.isArray(secondaryCategorySlugs) ? secondaryCategorySlugs.map(s => String(s).trim()).filter(Boolean) : [],
        title: title.trim(),
        summary: summary.trim(),
        inclusions: sanitizedInclusions,
        badge: typeof badge === 'string' && badge.trim() ? badge.trim() : null,
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
        keywords: Array.isArray(keywords) ? keywords.map(k => String(k).trim()).filter(Boolean) : [],
        institutionTypes: Array.isArray(institutionTypes) ? institutionTypes.map(i => String(i).trim()).filter(Boolean) : [],
        relatedCardSlugs: cleanRelated,
        priority: typeof priority === 'number' ? priority : 0,
        active: active !== false,
      },
    });

    // Instant RAM cache invalidation
    await solutionsIndexService.rebuild();

    res.status(201).json(newCard);
  } catch (err) {
    console.error('Failed to create solution card:', err);
    res.status(500).json({ error: 'Failed to create solution card' });
  }
});

// PUT /api/admin/solutions-finder/cards/:id - Update card
router.put('/cards/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = parseInt(String(req.params.id), 10);
    if (isNaN(cardId) || cardId <= 0) {
      res.status(400).json({ error: 'Valid positive integer card ID is required' });
      return;
    }

    const existingCard = await prisma.searchCard.findUnique({
      where: { id: cardId },
    });
    if (!existingCard) {
      res.status(404).json({ error: 'Solution card not found' });
      return;
    }

    const {
      cardSlug,
      targetSlug,
      sectionAnchor,
      categorySlug,
      subcategorySlug,
      secondaryCategorySlugs,
      title,
      summary,
      inclusions,
      badge,
      imageUrl,
      keywords,
      institutionTypes,
      relatedCardSlugs,
      priority,
      active,
    } = req.body || {};

    const updateData: any = {};

    // Validate cardSlug if provided
    let newSlug = existingCard.cardSlug;
    if (cardSlug !== undefined) {
      if (typeof cardSlug !== 'string' || !/^[a-z0-9-]+$/.test(cardSlug.trim())) {
        res.status(400).json({ error: 'cardSlug must contain only lowercase letters, numbers, and hyphens' });
        return;
      }
      newSlug = cardSlug.trim().toLowerCase();
      if (newSlug !== existingCard.cardSlug) {
        const slugConflict = await prisma.searchCard.findFirst({
          where: { cardSlug: newSlug, NOT: { id: cardId } },
        });
        if (slugConflict) {
          res.status(409).json({ error: `Card slug "${newSlug}" is already taken by another card.` });
          return;
        }
        updateData.cardSlug = newSlug;
      }
    }

    // Validate targetSlug if provided
    if (targetSlug !== undefined) {
      if (typeof targetSlug !== 'string' || !targetSlug.trim()) {
        res.status(400).json({ error: 'targetSlug cannot be empty' });
        return;
      }
      const cleanTarget = targetSlug.trim();
      const pageExists = await prisma.page.findUnique({
        where: { slug: cleanTarget },
        select: { id: true },
      });
      if (!pageExists) {
        res.status(400).json({ error: `Target page slug "${cleanTarget}" does not exist in the Page table.` });
        return;
      }
      updateData.targetSlug = cleanTarget;
    }

    // Validate inclusions if provided
    if (inclusions !== undefined) {
      if (!Array.isArray(inclusions)) {
        res.status(400).json({ error: 'inclusions must be an array of exactly 3 items' });
        return;
      }
      const sanitized = inclusions
        .map(i => (typeof i === 'string' ? i.trim() : ''))
        .filter(i => i.length > 0);

      if (sanitized.length !== 3) {
        res.status(400).json({ error: 'Strict Invariant: Exactly 3 non-empty inclusions are required.' });
        return;
      }
      updateData.inclusions = sanitized;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        res.status(400).json({ error: 'title must be at least 3 characters' });
        return;
      }
      updateData.title = title.trim();
    }

    if (summary !== undefined) {
      if (typeof summary !== 'string' || summary.trim().length < 10) {
        res.status(400).json({ error: 'summary must be at least 10 characters' });
        return;
      }
      updateData.summary = summary.trim();
    }

    if (categorySlug !== undefined) {
      if (typeof categorySlug !== 'string' || !categorySlug.trim()) {
        res.status(400).json({ error: 'categorySlug cannot be empty' });
        return;
      }
      updateData.categorySlug = categorySlug.trim();
    }

    if (sectionAnchor !== undefined) {
      updateData.sectionAnchor = typeof sectionAnchor === 'string' && sectionAnchor.trim()
        ? sectionAnchor.trim().replace(/^#+/, '')
        : null;
    }

    if (subcategorySlug !== undefined) {
      updateData.subcategorySlug = typeof subcategorySlug === 'string' && subcategorySlug.trim() ? subcategorySlug.trim() : null;
    }

    if (secondaryCategorySlugs !== undefined) {
      updateData.secondaryCategorySlugs = Array.isArray(secondaryCategorySlugs) ? secondaryCategorySlugs.map(s => String(s).trim()).filter(Boolean) : [];
    }

    if (badge !== undefined) {
      updateData.badge = typeof badge === 'string' && badge.trim() ? badge.trim() : null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    }

    if (keywords !== undefined) {
      updateData.keywords = Array.isArray(keywords) ? keywords.map(k => String(k).trim()).filter(Boolean) : [];
    }

    if (institutionTypes !== undefined) {
      updateData.institutionTypes = Array.isArray(institutionTypes) ? institutionTypes.map(i => String(i).trim()).filter(Boolean) : [];
    }

    if (relatedCardSlugs !== undefined) {
      updateData.relatedCardSlugs = Array.isArray(relatedCardSlugs)
        ? relatedCardSlugs.filter(s => typeof s === 'string' && s.trim() && s.trim() !== newSlug).map(s => s.trim())
        : [];
    }

    if (priority !== undefined && typeof priority === 'number') {
      updateData.priority = priority;
    }

    if (active !== undefined && typeof active === 'boolean') {
      updateData.active = active;
    }

    // Execute update and cross-card reference sync if slug changed
    const updated = await prisma.$transaction(async tx => {
      const card = await tx.searchCard.update({
        where: { id: cardId },
        data: updateData,
      });

      if (newSlug !== existingCard.cardSlug) {
        // Replace old slug with new slug in relatedCardSlugs across other cards
        await tx.$executeRaw`
            UPDATE "searchcard"
            SET "relatedCardSlugs" = array_replace("relatedCardSlugs", ${existingCard.cardSlug}, ${newSlug})
            WHERE ${existingCard.cardSlug} = ANY("relatedCardSlugs")
        `;
      }

      return card;
    });

    // Invalidate RAM cache post-commit
    await solutionsIndexService.rebuild();

    res.json(updated);
  } catch (err) {
    console.error('Failed to update solution card:', err);
    res.status(500).json({ error: 'Failed to update solution card' });
  }
});

// PATCH /api/admin/solutions-finder/cards/:id/toggle-active - Quick toggle
router.patch('/cards/:id/toggle-active', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = parseInt(String(req.params.id), 10);
    if (isNaN(cardId) || cardId <= 0) {
      res.status(400).json({ error: 'Valid card ID required' });
      return;
    }

    const card = await prisma.searchCard.findUnique({ where: { id: cardId } });
    if (!card) {
      res.status(404).json({ error: 'Solution card not found' });
      return;
    }

    const updated = await prisma.searchCard.update({
      where: { id: cardId },
      data: { active: !card.active },
    });

    await solutionsIndexService.rebuild();
    res.json(updated);
  } catch (err) {
    console.error('Failed to toggle card active state:', err);
    res.status(500).json({ error: 'Failed to toggle card active state' });
  }
});

// DELETE /api/admin/solutions-finder/cards/:id - Delete card and clean cross-sell references
router.delete('/cards/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = parseInt(String(req.params.id), 10);
    if (isNaN(cardId) || cardId <= 0) {
      res.status(400).json({ error: 'Valid card ID required' });
      return;
    }

    const existingCard = await prisma.searchCard.findUnique({ where: { id: cardId } });
    if (!existingCard) {
      res.status(404).json({ error: 'Solution card not found' });
      return;
    }

    await prisma.$transaction([
      prisma.searchCard.delete({ where: { id: cardId } }),
      prisma.$executeRaw`
        UPDATE "searchcard"
        SET "relatedCardSlugs" = array_remove("relatedCardSlugs", ${existingCard.cardSlug})
        WHERE ${existingCard.cardSlug} = ANY("relatedCardSlugs")
      `,
    ]);

    await solutionsIndexService.rebuild();
    res.json({ success: true, message: `Card "${existingCard.cardSlug}" deleted successfully` });
  } catch (err) {
    console.error('Failed to delete solution card:', err);
    res.status(500).json({ error: 'Failed to delete solution card' });
  }
});

// ─── 2. TAXONOMY MANAGEMENT ───────────────────────────────────────────────────

// GET /api/admin/solutions-finder/taxonomy - Get stored taxonomy
router.get('/taxonomy', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { key: 'solutions_finder_taxonomy' },
    });

    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      res.json(parsed);
      return;
    }

    // Default taxonomy fallback if not yet initialized
    const defaultTaxonomy: SolutionsTaxonomy = {
      categories: [
        { id: 'campus-design', label: 'Campus Design & Architecture', shortLabel: 'Architecture', letterCode: 'A', subcategories: ['Campus Master Planning', 'Architectural Design', 'Campus Landscaping', 'Building Design & Execution', 'Interior Architecture', 'Renovation & Modernisation', 'Turnkey Campus Development'] },
        { id: 'furniture', label: 'Furniture & Interiors', shortLabel: 'Furniture', letterCode: 'B', subcategories: ['Classroom Furniture', 'Faculty & Administrative Furniture', 'Library Furniture', 'Laboratory Furniture', 'Hostel Furniture', 'Auditorium Seating', 'Cafeteria & Dining Furniture', 'Custom Furniture'] },
        { id: 'sports-infra', label: 'Sports Infrastructure', shortLabel: 'Sports', letterCode: 'C', subcategories: ['Indoor Sports Facilities', 'Outdoor Sports Facilities', 'Sports Grounds & Playfields', 'Synthetic Turf', 'Gymnasium & Fitness Centres', 'Swimming Pool Infrastructure', 'Sports Equipment'] },
        { id: 'ai-tech', label: 'AI & Technology Infrastructure', shortLabel: 'AI & Tech', letterCode: 'D', subcategories: ['AI Learning Stations', 'AI & Machine Learning Labs', 'AI HoloTeacher & Holographic Learning', 'GPU Servers & Computing Infrastructure', 'Robotics & Embedded AI Labs', 'Humanoid Robots', 'Smart Classrooms'] },
        { id: 'labs', label: 'Science & Healthcare Labs', shortLabel: 'Labs', letterCode: 'E', subcategories: ['Physics Laboratories', 'Chemistry Laboratories', 'Biology & Life Sciences Labs', 'Medical & Nursing Skill Labs', 'Pharmacy & Formulation Labs', 'Engineering Workshop & Maker Spaces', 'Research Instrumentation Labs'] },
        { id: 'libraries', label: 'Library & Learning Resources', shortLabel: 'Libraries', letterCode: 'F', subcategories: ['Digital Library Systems', 'Automated Library (RFID & Barcode)', 'Books, Periodicals & Print Resources', 'E-Resources & Institutional Repositories', 'Library Furniture & Reading Commons'] },
        { id: 'additional-infra', label: 'Student Life & Campus Amenities', shortLabel: 'Amenities', letterCode: 'G', subcategories: ['Student Hostels & Living Spaces', 'Cafeteria & Food Courts', 'Health Centre & Infirmary', 'Student Lounges & Activity Zones', 'Campus Store & Utility Services'] },
        { id: 'strategic-services', label: 'Strategic Campus Services', shortLabel: 'Strategic Services', letterCode: 'H', subcategories: ['New College & University Setup', 'Regulatory Approvals & Affiliations', 'NAAC / NBA Accreditation Readiness', 'Campus Feasibility & Financial Planning', 'Institutional Restructuring & Turnaround'] },
        { id: 'automation', label: 'Campus Management & Automation', shortLabel: 'Automation', letterCode: 'I', subcategories: ['Campus ERP & Student Information Systems', 'Smart Security & Access Control', 'Energy Management & Sustainability', 'IT Infrastructure & Networking', 'Digital Signage & Campus Communications'] },
        { id: 'turnkey-projects', label: 'Turnkey Academic Projects', shortLabel: 'Turnkey Projects', letterCode: 'J', subcategories: ['Complete New Campus Development', 'Department-Level Modernisation', 'Centre of Excellence Setup', 'Incubation Centre & Startup Hub', 'Multipurpose Auditoriums & Convention Centres'] },
      ],
      institutions: [
        { id: 'all', label: 'All Educational Institutions', shortLabel: 'All' },
        { id: 'universities', label: 'Universities (State & Private)', shortLabel: 'Universities' },
        { id: 'engineering', label: 'Engineering & Technical Colleges', shortLabel: 'Engineering' },
        { id: 'degree', label: 'Degree & Management Colleges', shortLabel: 'Degree' },
        { id: 'vocational', label: 'Vocational & Polytechnic Institutes', shortLabel: 'Vocational' },
        { id: 'skill', label: 'Skill Development & Training Centers', shortLabel: 'Skill Centers' },
      ],
      popularSearchPrompts: [
        '50-workstation NVIDIA GPU AI CoE lab setup',
        'Turnkey FIFA-standard synthetic football turf',
        'Ergonomic modular hostel furniture for 500 students',
        'Smart interactive digital classrooms with acoustic panels',
        'Comprehensive 50-acre greenfield campus master plan',
      ],
    };

    res.json(defaultTaxonomy);
  } catch (err) {
    console.error('Failed to fetch taxonomy:', err);
    res.status(500).json({ error: 'Failed to fetch taxonomy store' });
  }
});

// PUT /api/admin/solutions-finder/taxonomy - Validate & Save taxonomy
router.put('/taxonomy', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = validateTaxonomyPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Invalid taxonomy payload' });
      return;
    }

    const jsonString = JSON.stringify(validation.data);

    await prisma.siteContent.upsert({
      where: { key: 'solutions_finder_taxonomy' },
      update: { value: jsonString },
      create: { key: 'solutions_finder_taxonomy', value: jsonString },
    });

    // Invalidate RAM cache post-commit
    await solutionsIndexService.rebuild();

    res.json({
      success: true,
      message: 'Taxonomy store updated successfully',
      data: validation.data,
      version: solutionsIndexService.getVersion(),
    });
  } catch (err) {
    console.error('Failed to update taxonomy:', err);
    res.status(500).json({ error: 'Failed to update taxonomy store' });
  }
});

// ─── 3. SEARCH ANALYTICS & LOGS ───────────────────────────────────────────────

// GET /api/admin/solutions-finder/logs - Paginated search telemetry
router.get('/logs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;

    const unmatchedOnly = req.query.unmatchedOnly === 'true';
    const category = typeof req.query.category === 'string' && req.query.category.trim() ? req.query.category.trim() : undefined;
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;

    const where: any = {};
    if (unmatchedOnly) {
      where.matchedCount = 0;
    }
    if (category) {
      where.categorySlug = category;
    }
    if (search) {
      where.queryText = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.searchQueryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.searchQueryLog.count({ where }),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Failed to fetch search logs:', err);
    res.status(500).json({ error: 'Failed to fetch search query logs' });
  }
});

// GET /api/admin/solutions-finder/stats - Analytics overview
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalSearches, zeroMatchCount, convertedCount, recentUnmet] = await Promise.all([
      prisma.searchQueryLog.count(),
      prisma.searchQueryLog.count({ where: { matchedCount: 0 } }),
      prisma.searchQueryLog.count({ where: { converted: true } }),
      prisma.searchQueryLog.findMany({
        where: { matchedCount: 0 },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, queryText: true, institutionType: true, categorySlug: true, createdAt: true },
      }),
    ]);

    const zeroMatchRate = totalSearches > 0 ? (zeroMatchCount / totalSearches) * 100 : 0;
    const conversionRate = totalSearches > 0 ? (convertedCount / totalSearches) * 100 : 0;

    res.json({
      totalSearches,
      zeroMatchCount,
      zeroMatchRate: Number(zeroMatchRate.toFixed(1)),
      convertedCount,
      conversionRate: Number(conversionRate.toFixed(1)),
      recentUnmetQueries: recentUnmet,
    });
  } catch (err) {
    console.error('Failed to fetch search stats:', err);
    res.status(500).json({ error: 'Failed to fetch search analytics' });
  }
});

// ─── 4. CACHE CONTROL & DIAGNOSTICS ──────────────────────────────────────────

// POST /api/admin/solutions-finder/rebuild-cache - Force manual recompilation
router.post('/rebuild-cache', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await solutionsIndexService.rebuild();
    res.json({
      success: true,
      message: 'RAM index successfully recompiled',
      version: solutionsIndexService.getVersion(),
      activeCardsCount: solutionsIndexService.getCards().length,
    });
  } catch (err) {
    console.error('Failed to rebuild solutions cache:', err);
    res.status(500).json({ error: 'Failed to recompile solutions index cache' });
  }
});

// GET /api/admin/solutions-finder/cache-status - Diagnostic status
router.get('/cache-status', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    initialized: solutionsIndexService.isReady(),
    version: solutionsIndexService.getVersion(),
    activeCardsCount: solutionsIndexService.getCards().length,
  });
});

export default router;
