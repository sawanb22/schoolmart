import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import {
  ItemInputSchema,
  ItemPatchSchema,
  CategoryInputSchema,
  CategoryPatchSchema,
  ReorderSchema,
} from '../services/page-content/schemas';
import { sanitizeItemPayload } from '../lib/sanitize';
import { slugify, normalizeSlug, splitItem, buildItem } from '../services/page-content/legacy-mapper';
import { afterContentWrite } from '../services/page-content/after-content-write';
import { ItemFull } from '../services/page-content/page-content.service';

const router = Router();

function parseParamInt(param: string | string[] | undefined): number {
  if (!param) return NaN;
  const str = Array.isArray(param) ? param[0] : param;
  return parseInt(str, 10);
}

// Invariant I8: Authentication and Admin Authorization required on all routes
router.use(verifyToken, requireAdmin);

// Strict no-store for all admin responses
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/**
 * Maps a Prisma PageItem row with included categories to the canonical ItemFull shape.
 */
function toItemFull(
  item: any,
  options?: { includeCard?: boolean }
): ItemFull & { card?: Record<string, unknown> } {
  const categoryNames = Array.isArray(item.categories)
    ? item.categories.map((c: any) => c.category?.name || c.name || String(c))
    : [];

  const full: ItemFull = {
    id: item.id,
    slug: item.slug,
    collection: item.collection,
    title: item.title,
    summary: item.summary ?? null,
    imageUrl: item.imageUrl ?? null,
    href: item.href ?? null,
    badge: item.badge ?? null,
    categories: categoryNames,
    data: (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) ? item.data : {},
    detail: (item.detail && typeof item.detail === 'object' && !Array.isArray(item.detail)) ? item.detail : {},
    sortOrder: item.sortOrder ?? 0,
    published: item.published !== false,
    version: item.version,
    updatedAt: item.updatedAt,
  };

  if (options?.includeCard) {
    const card = buildItem(
      {
        ...full,
        categoryNames,
      },
      { includeDetail: true }
    );
    return { ...full, card };
  }

  return full;
}

// ==========================================
// Item Endpoints
// ==========================================

/**
 * GET /:pageId/items
 * Accepts ?collection= and ?format=card
 */
router.get('/:pageId/items', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    if (isNaN(pageId)) {
      res.status(400).json({ error: 'invalid_page_id', message: 'Page ID must be an integer' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const collection = req.query.collection ? String(req.query.collection) : undefined;
    const includeCard = req.query.format === 'card';

    const items = await prisma.pageItem.findMany({
      where: {
        pageId,
        ...(collection ? { collection } : {}),
      },
      orderBy: [
        { collection: 'asc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
      include: {
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json({
      items: items.map(it => toItemFull(it, { includeCard })),
    });
  } catch (error) {
    console.error('[AdminPageItems] GET /:pageId/items failed:', error);
    res.status(500).json({ error: 'Failed to fetch page items' });
  }
});

/**
 * POST /:pageId/items
 * Accepts fields or { collection, card }
 */
router.post('/:pageId/items', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    if (isNaN(pageId)) {
      res.status(400).json({ error: 'invalid_page_id', message: 'Page ID must be an integer' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    if (page.contentModel !== 'structured') {
      res.status(400).json({
        error: 'page_not_structured',
        message: `Page ${pageId} (${page.slug}) is a document page. Items can only be added to structured pages.`,
      });
      return;
    }

    const parseResult = ItemInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation_error',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const body = parseResult.data;
    const collection = body.collection;

    let title = body.title || '';
    let slug = body.slug ? normalizeSlug(body.slug) : '';
    let summary = body.summary ?? null;
    let imageUrl = body.imageUrl ?? null;
    let href = body.href ?? null;
    let badge = body.badge ?? null;
    let published = body.published !== false;
    let data: Record<string, unknown> = body.data || {};
    let detail: Record<string, unknown> = body.detail || {};
    let categoryNames: string[] = body.categories || [];
    let position = body.position;

    // Legacy card input conversion
    if (body.card) {
      const { item: cardSplit } = splitItem(
        body.card as Record<string, unknown>,
        collection,
        0,
        new Set()
      );
      if (!title) title = cardSplit.title;
      if (!slug && cardSplit.slug) slug = cardSplit.slug;
      if (summary === null) summary = cardSplit.summary;
      if (imageUrl === null) imageUrl = cardSplit.imageUrl;
      if (href === null) href = cardSplit.href;
      if (badge === null) badge = cardSplit.badge;
      if (categoryNames.length === 0) categoryNames = cardSplit.categoryNames;
      if (Object.keys(data).length === 0) data = cardSplit.data;
      if (Object.keys(detail).length === 0) detail = cardSplit.detail;
      if (body.published === undefined) published = cardSplit.published;
    }

    // Auto-slugify title if missing
    if (!slug) {
      slug = slugify(title);
    }
    if (!slug) {
      slug = slugify(`${collection}-${Date.now()}`);
    }

    // HTML sanitization
    const sanitized = sanitizeItemPayload({ data, detail });
    data = sanitized.data;
    detail = sanitized.detail;

    // Check slug uniqueness on page
    const existingSlug = await prisma.pageItem.findUnique({
      where: {
        pageId_slug: { pageId, slug },
      },
    });
    if (existingSlug) {
      res.status(409).json({
        error: 'slug_taken',
        message: `Slug '${slug}' is already taken on page ${pageId}`,
      });
      return;
    }

    // Determine sortOrder
    let sortOrder: number;
    if (typeof position === 'number') {
      sortOrder = position;
    } else {
      const maxOrder = await prisma.pageItem.aggregate({
        where: { pageId, collection },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    }

    // Transactional creation
    const createdItem = await prisma.$transaction(async (tx) => {
      // 1. Create the item
      const itemRow = await tx.pageItem.create({
        data: {
          pageId,
          collection,
          title,
          slug,
          summary,
          imageUrl,
          href,
          badge,
          published,
          sortOrder,
          data: data as Prisma.InputJsonValue,
          detail: detail as Prisma.InputJsonValue,
          version: 1,
        },
      });

      // 2. Resolve/upsert categories and build joins
      if (categoryNames.length > 0) {
        for (let i = 0; i < categoryNames.length; i++) {
          const rawName = categoryNames[i].trim();
          if (!rawName) continue;
          const catSlug = slugify(rawName);
          if (!catSlug) continue;

          // Find or create category
          const cat = await tx.pageCategory.upsert({
            where: {
              pageId_slug: { pageId, slug: catSlug },
            },
            create: {
              pageId,
              name: rawName,
              slug: catSlug,
              sortOrder: i,
            },
            update: {},
          });

          // Create link
          await tx.pageItemCategory.create({
            data: {
              itemId: itemRow.id,
              categoryId: cat.id,
              sortOrder: i,
            },
          });
        }
      }

      // 3. Increment Page version
      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      // 4. Record revision
      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'item-create',
          snapshot: { itemId: itemRow.id, slug: itemRow.slug, title: itemRow.title },
          authorId: req.user?.id ?? null,
        },
      });

      return itemRow;
    });

    // Invoke write hook
    await afterContentWrite({ pageId, reason: 'item-create', authorId: req.user?.id });

    // Fetch complete created item with categories
    const completeItem = await prisma.pageItem.findUnique({
      where: { id: createdItem.id },
      include: {
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.status(201).json(toItemFull(completeItem, { includeCard: true }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'slug_taken', message: 'Slug collision on creation' });
      return;
    }
    console.error('[AdminPageItems] POST /:pageId/items failed:', error);
    res.status(500).json({ error: 'Failed to create page item' });
  }
});

/**
 * PATCH /:pageId/items/:itemId
 * Requires version for optimistic concurrency locking.
 */
router.patch('/:pageId/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    const itemId = parseParamInt(req.params.itemId);
    if (isNaN(pageId) || isNaN(itemId)) {
      res.status(400).json({ error: 'invalid_id', message: 'Page ID and Item ID must be integers' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const parseResult = ItemPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation_error',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const body = parseResult.data;
    const expectedVersion = body.version;

    // Check item existence
    const existing = await prisma.pageItem.findUnique({
      where: { id: itemId },
      include: {
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!existing || existing.pageId !== pageId) {
      res.status(404).json({ error: 'item_not_found', message: `Item ${itemId} not found on page ${pageId}` });
      return;
    }

    // Determine field updates
    let title = body.title;
    let slug = body.slug !== undefined && body.slug !== null ? normalizeSlug(body.slug) : undefined;
    let summary = body.summary;
    let imageUrl = body.imageUrl;
    let href = body.href;
    let badge = body.badge;
    let published = body.published;
    let collection = body.collection;
    let position = body.position;
    let data = body.data;
    let detail = body.detail;
    let categoryNames = body.categories;

    // Legacy card input conversion if card passed
    if (body.card) {
      const { item: cardSplit } = splitItem(
        body.card as Record<string, unknown>,
        (collection || existing.collection) as any,
        existing.sortOrder,
        new Set()
      );
      if (title === undefined) title = cardSplit.title;
      if (slug === undefined && cardSplit.slug) slug = cardSplit.slug;
      if (summary === undefined) summary = cardSplit.summary ?? undefined;
      if (imageUrl === undefined) imageUrl = cardSplit.imageUrl ?? undefined;
      if (href === undefined) href = cardSplit.href ?? undefined;
      if (badge === undefined) badge = cardSplit.badge ?? undefined;
      if (categoryNames === undefined) categoryNames = cardSplit.categoryNames;
      if (data === undefined) data = cardSplit.data;
      if (detail === undefined) detail = cardSplit.detail;
      if (published === undefined) published = cardSplit.published;
    }

    // HTML sanitization
    const sanitized = sanitizeItemPayload({
      data: data !== undefined ? data : (existing.data as Record<string, unknown>),
      detail: detail !== undefined ? detail : (existing.detail as Record<string, unknown>),
    });
    if (data !== undefined) data = sanitized.data;
    if (detail !== undefined) detail = sanitized.detail;

    // Slug collision check if slug changed
    const oldSlug = existing.slug;
    const isSlugChanged = slug !== undefined && slug !== oldSlug;

    if (isSlugChanged) {
      const slugCollision = await prisma.pageItem.findFirst({
        where: {
          pageId,
          slug,
          NOT: { id: itemId },
        },
      });
      if (slugCollision) {
        res.status(409).json({
          error: 'slug_taken',
          message: `Slug '${slug}' is already taken on page ${pageId}`,
        });
        return;
      }
    }

    // Optimistic locking updateMany
    const updatePayload: Prisma.PageItemUpdateManyMutationInput = {
      version: { increment: 1 },
      updatedAt: new Date(),
    };
    if (title !== undefined) updatePayload.title = title;
    if (slug !== undefined) updatePayload.slug = slug;
    if (summary !== undefined) updatePayload.summary = summary;
    if (imageUrl !== undefined) updatePayload.imageUrl = imageUrl;
    if (href !== undefined) updatePayload.href = href;
    if (badge !== undefined) updatePayload.badge = badge;
    if (published !== undefined) updatePayload.published = published;
    if (collection !== undefined) updatePayload.collection = collection;
    if (position !== undefined) updatePayload.sortOrder = position;
    if (data !== undefined) updatePayload.data = data as Prisma.InputJsonValue;
    if (detail !== undefined) updatePayload.detail = detail as Prisma.InputJsonValue;

    const transactionResult = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.pageItem.updateMany({
        where: {
          id: itemId,
          pageId,
          version: expectedVersion,
        },
        data: updatePayload,
      });

      if (updateResult.count === 0) {
        return { conflict: true };
      }

      // Handle category links update if categories provided
      if (categoryNames !== undefined) {
        await tx.pageItemCategory.deleteMany({
          where: { itemId },
        });

        for (let i = 0; i < categoryNames.length; i++) {
          const rawName = categoryNames[i].trim();
          if (!rawName) continue;
          const catSlug = slugify(rawName);
          if (!catSlug) continue;

          const cat = await tx.pageCategory.upsert({
            where: {
              pageId_slug: { pageId, slug: catSlug },
            },
            create: {
              pageId,
              name: rawName,
              slug: catSlug,
              sortOrder: i,
            },
            update: {},
          });

          await tx.pageItemCategory.create({
            data: {
              itemId,
              categoryId: cat.id,
              sortOrder: i,
            },
          });
        }
      }

      // Handle SlugRedirect on slug change (Rule 49 & 422)
      if (isSlugChanged && slug) {
        const fromPath = `/${page.slug}/${oldSlug}`;
        const toPath = `/${page.slug}/${slug}`;

        // Eliminate loops: delete any redirect where fromPath equals the new live path
        await tx.slugRedirect.deleteMany({
          where: {
            OR: [
              { fromPath: toPath },
              { fromPath: fromPath, toPath: fromPath },
            ],
          },
        });

        // Insert/upsert redirect from old to new path
        await tx.slugRedirect.upsert({
          where: { fromPath },
          create: { fromPath, toPath },
          update: { toPath },
        });

        // Ensure no self-referential redirect
        await tx.slugRedirect.deleteMany({
          where: { fromPath: toPath, toPath: toPath },
        });
      }

      // Increment Page version
      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      // Record revision
      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'item-update',
          snapshot: { itemId, slug: slug || existing.slug, title: title || existing.title },
          authorId: req.user?.id ?? null,
        },
      });

      return { conflict: false };
    });

    if (transactionResult.conflict) {
      // Re-read current database representation
      const current = await prisma.pageItem.findUnique({
        where: { id: itemId },
        include: {
          categories: {
            include: { category: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!current || current.pageId !== pageId) {
        res.status(404).json({ error: 'item_not_found', message: `Item ${itemId} not found on page ${pageId}` });
        return;
      }

      res.status(409).json({
        error: 'version_conflict',
        current: toItemFull(current, { includeCard: true }),
      });
      return;
    }

    // Write hook
    await afterContentWrite({ pageId, reason: 'item-update', authorId: req.user?.id });

    // Fetch updated item
    const updated = await prisma.pageItem.findUnique({
      where: { id: itemId },
      include: {
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json(toItemFull(updated, { includeCard: true }));
  } catch (error) {
    console.error('[AdminPageItems] PATCH /:pageId/items/:itemId failed:', error);
    res.status(500).json({ error: 'Failed to update page item' });
  }
});

/**
 * DELETE /:pageId/items/:itemId
 * Accepts optional ?version=N for optimistic concurrency locking.
 */
router.delete('/:pageId/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    const itemId = parseParamInt(req.params.itemId);
    if (isNaN(pageId) || isNaN(itemId)) {
      res.status(400).json({ error: 'invalid_id', message: 'Page ID and Item ID must be integers' });
      return;
    }

    const item = await prisma.pageItem.findUnique({
      where: { id: itemId },
      include: {
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!item || item.pageId !== pageId) {
      res.status(404).json({ error: 'item_not_found', message: `Item ${itemId} not found on page ${pageId}` });
      return;
    }

    // Optional optimistic locking check
    if (req.query.version !== undefined) {
      const expectedVersion = Number(req.query.version);
      if (isNaN(expectedVersion)) {
        res.status(400).json({ error: 'invalid_version', message: 'version query param must be an integer' });
        return;
      }

      if (item.version !== expectedVersion) {
        res.status(409).json({
          error: 'version_conflict',
          current: toItemFull(item, { includeCard: true }),
        });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      // Cascading deletion handles PageItemCategory joins automatically
      await tx.pageItem.delete({
        where: { id: itemId },
      });

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'item-delete',
          snapshot: { itemId, slug: item.slug, title: item.title },
          authorId: req.user?.id ?? null,
        },
      });
    });

    await afterContentWrite({ pageId, reason: 'item-delete', authorId: req.user?.id });

    res.status(204).end();
  } catch (error) {
    console.error('[AdminPageItems] DELETE /:pageId/items/:itemId failed:', error);
    res.status(500).json({ error: 'Failed to delete page item' });
  }
});

/**
 * PUT /:pageId/items/reorder
 * Accepts { collection?, orderedIds: number[] }
 */
router.put('/:pageId/items/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    if (isNaN(pageId)) {
      res.status(400).json({ error: 'invalid_page_id', message: 'Page ID must be an integer' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const parseResult = ReorderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation_error',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { orderedIds, collection } = parseResult.data;

    const existingItems = await prisma.pageItem.findMany({
      where: {
        pageId,
        ...(collection ? { collection } : {}),
      },
      select: { id: true },
    });

    // Check count and exact set match
    if (existingItems.length !== orderedIds.length) {
      res.status(400).json({
        error: 'invalid_ordered_ids',
        message: `orderedIds count (${orderedIds.length}) does not match existing item count (${existingItems.length})`,
      });
      return;
    }

    const existingIdSet = new Set(existingItems.map(it => it.id));
    const orderedSet = new Set(orderedIds);

    if (orderedSet.size !== orderedIds.length || !orderedIds.every(id => existingIdSet.has(id))) {
      res.status(400).json({
        error: 'invalid_ordered_ids',
        message: 'orderedIds must contain all collection item IDs exactly once with no duplicates or foreign IDs',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.pageItem.update({
          where: { id: orderedIds[i] },
          data: { sortOrder: i },
        });
      }

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'reorder',
          snapshot: { orderedIds, collection },
          authorId: req.user?.id ?? null,
        },
      });
    });

    await afterContentWrite({ pageId, reason: 'reorder', authorId: req.user?.id });

    const reorderedItems = await prisma.pageItem.findMany({
      where: {
        pageId,
        ...(collection ? { collection } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        categories: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json({
      items: reorderedItems.map(it => toItemFull(it)),
    });
  } catch (error) {
    console.error('[AdminPageItems] PUT /:pageId/items/reorder failed:', error);
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// ==========================================
// Category Endpoints
// ==========================================

/**
 * GET /:pageId/categories
 * Returns categories with sortOrder and itemCount.
 */
router.get('/:pageId/categories', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    if (isNaN(pageId)) {
      res.status(400).json({ error: 'invalid_page_id', message: 'Page ID must be an integer' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const categories = await prisma.pageCategory.findMany({
      where: { pageId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    res.json({
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        itemCount: cat._count.items,
      })),
    });
  } catch (error) {
    console.error('[AdminPageItems] GET /:pageId/categories failed:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /:pageId/categories
 * Accepts { name }. Auto-slugifies. 409 on slug collision.
 */
router.post('/:pageId/categories', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    if (isNaN(pageId)) {
      res.status(400).json({ error: 'invalid_page_id', message: 'Page ID must be an integer' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const parseResult = CategoryInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation_error',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const name = parseResult.data.name.trim();
    const slug = slugify(name);

    const collision = await prisma.pageCategory.findUnique({
      where: {
        pageId_slug: { pageId, slug },
      },
    });

    if (collision) {
      res.status(409).json({
        error: 'slug_taken',
        message: `Category slug '${slug}' already exists on page ${pageId}`,
      });
      return;
    }

    const maxOrder = await prisma.pageCategory.aggregate({
      where: { pageId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const createdCategory = await prisma.$transaction(async (tx) => {
      const cat = await tx.pageCategory.create({
        data: {
          pageId,
          name,
          slug,
          sortOrder,
        },
      });

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'category',
          snapshot: { categoryId: cat.id, name: cat.name, slug: cat.slug },
          authorId: req.user?.id ?? null,
        },
      });

      return cat;
    });

    await afterContentWrite({ pageId, reason: 'category-create', authorId: req.user?.id });

    res.status(201).json({
      category: {
        id: createdCategory.id,
        name: createdCategory.name,
        slug: createdCategory.slug,
        sortOrder: createdCategory.sortOrder,
        itemCount: 0,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'slug_taken', message: 'Category slug already exists on page' });
      return;
    }
    console.error('[AdminPageItems] POST /:pageId/categories failed:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PATCH /:pageId/categories/:id
 * Accepts { name?, sortOrder? }. Renaming keeps item links.
 */
router.patch('/:pageId/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    const categoryId = parseParamInt(req.params.id);
    if (isNaN(pageId) || isNaN(categoryId)) {
      res.status(400).json({ error: 'invalid_id', message: 'Page ID and Category ID must be integers' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const category = await prisma.pageCategory.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { items: true } } },
    });

    if (!category || category.pageId !== pageId) {
      res.status(404).json({ error: 'category_not_found', message: `Category ${categoryId} not found on page ${pageId}` });
      return;
    }

    const parseResult = CategoryPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation_error',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { name, sortOrder } = parseResult.data;
    let newSlug: string | undefined;

    if (name !== undefined) {
      newSlug = slugify(name);
      if (newSlug !== category.slug) {
        const slugCollision = await prisma.pageCategory.findFirst({
          where: {
            pageId,
            slug: newSlug,
            NOT: { id: categoryId },
          },
        });
        if (slugCollision) {
          res.status(409).json({
            error: 'slug_taken',
            message: `Category slug '${newSlug}' is already taken on page ${pageId}`,
          });
          return;
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.pageCategory.update({
        where: { id: categoryId },
        data: {
          ...(name !== undefined ? { name, slug: newSlug } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        },
      });

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'category',
          snapshot: { categoryId: cat.id, name: cat.name, slug: cat.slug },
          authorId: req.user?.id ?? null,
        },
      });

      return cat;
    });

    await afterContentWrite({ pageId, reason: 'category-update', authorId: req.user?.id });

    res.json({
      category: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        sortOrder: updated.sortOrder,
        itemCount: category._count.items,
      },
    });
  } catch (error) {
    console.error('[AdminPageItems] PATCH /:pageId/categories/:id failed:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /:pageId/categories/:id
 * Deletes category row (cascades pageitemcategory links).
 */
router.delete('/:pageId/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    const categoryId = parseParamInt(req.params.id);
    if (isNaN(pageId) || isNaN(categoryId)) {
      res.status(400).json({ error: 'invalid_id', message: 'Page ID and Category ID must be integers' });
      return;
    }

    const category = await prisma.pageCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.pageId !== pageId) {
      res.status(404).json({ error: 'category_not_found', message: `Category ${categoryId} not found on page ${pageId}` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.pageCategory.delete({
        where: { id: categoryId },
      });

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'category',
          snapshot: { categoryId, name: category.name, slug: category.slug },
          authorId: req.user?.id ?? null,
        },
      });
    });

    await afterContentWrite({ pageId, reason: 'category-delete', authorId: req.user?.id });

    res.status(204).end();
  } catch (error) {
    console.error('[AdminPageItems] DELETE /:pageId/categories/:id failed:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * PUT /:pageId/categories/reorder
 * Accepts { orderedIds: number[] }. Rewrites sortOrder to 0..n-1.
 */
router.put('/:pageId/categories/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const pageId = parseParamInt(req.params.pageId);
    if (isNaN(pageId)) {
      res.status(400).json({ error: 'invalid_page_id', message: 'Page ID must be an integer' });
      return;
    }

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'page_not_found', message: `Page ${pageId} not found` });
      return;
    }

    const parseResult = ReorderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'validation_error',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { orderedIds } = parseResult.data;

    const existingCategories = await prisma.pageCategory.findMany({
      where: { pageId },
      select: { id: true },
    });

    if (existingCategories.length !== orderedIds.length) {
      res.status(400).json({
        error: 'invalid_ordered_ids',
        message: `orderedIds count (${orderedIds.length}) does not match existing category count (${existingCategories.length})`,
      });
      return;
    }

    const existingSet = new Set(existingCategories.map(c => c.id));
    const orderedSet = new Set(orderedIds);

    if (orderedSet.size !== orderedIds.length || !orderedIds.every(id => existingSet.has(id))) {
      res.status(400).json({
        error: 'invalid_ordered_ids',
        message: 'orderedIds must contain all category IDs for this page exactly once',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.pageCategory.update({
          where: { id: orderedIds[i] },
          data: { sortOrder: i },
        });
      }

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: { version: { increment: 1 } },
      });

      await tx.pageRevision.create({
        data: {
          pageId,
          version: updatedPage.version,
          reason: 'reorder',
          snapshot: { orderedIds },
          authorId: req.user?.id ?? null,
        },
      });
    });

    await afterContentWrite({ pageId, reason: 'category-reorder', authorId: req.user?.id });

    const updatedCategories = await prisma.pageCategory.findMany({
      where: { pageId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });

    res.json({
      categories: updatedCategories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        itemCount: c._count.items,
      })),
    });
  } catch (error) {
    console.error('[AdminPageItems] PUT /:pageId/categories/reorder failed:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

export default router;
