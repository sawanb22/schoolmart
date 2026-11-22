import { Prisma } from '@prisma/client';
import { slugify, SplitItem, SplitCategory } from './legacy-mapper';

export interface WriteStructuredPageOptions {
  reason: string;
  authorId?: number | null;
}

/**
 * Persists structured page data transactionally:
 * 1. Upserts categories by (pageId, slug) and deletes removed categories.
 * 2. Upserts items by (pageId, slug), keeping existing IDs and bumping version only on change, and deletes removed items.
 * 3. Rebuilds pageitemcategory join rows in sortOrder.
 * 4. Updates page: pageData = splitResult.settings, contentModel = 'structured', version = version + 1.
 */
export async function writeStructuredPage(
  tx: Prisma.TransactionClient,
  pageId: number,
  splitResult: {
    settings: Record<string, unknown>;
    items: SplitItem[];
    categories: SplitCategory[];
  },
  _options: WriteStructuredPageOptions
): Promise<void> {
  // 1. Categories
  const categoryMap = new Map<string, { id: number; name: string; slug: string }>();

  for (const cat of splitResult.categories) {
    const row = await tx.pageCategory.upsert({
      where: {
        pageId_slug: { pageId, slug: cat.slug },
      },
      create: {
        pageId,
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
      },
      update: {
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });
    categoryMap.set(cat.slug, row);
  }

  const activeCategorySlugs = splitResult.categories.map(c => c.slug);
  await tx.pageCategory.deleteMany({
    where: {
      pageId,
      slug: { notIn: activeCategorySlugs },
    },
  });

  // 2. Items
  const existingItems = await tx.pageItem.findMany({
    where: { pageId },
  });
  const existingBySlug = new Map(existingItems.map(it => [it.slug, it]));
  const activeItemSlugs = splitResult.items.map(it => it.slug);

  const savedItems: Array<{ id: number; item: SplitItem }> = [];

  for (const item of splitResult.items) {
    const existing = existingBySlug.get(item.slug);
    const itemData = (item.data || {}) as Prisma.InputJsonValue;
    const itemDetail = (item.detail || {}) as Prisma.InputJsonValue;
    const published = item.published !== false;
    const sortOrder = item.sortOrder ?? 0;
    const summary = item.summary ?? null;
    const imageUrl = item.imageUrl ?? null;
    const href = item.href ?? null;
    const badge = item.badge ?? null;

    let itemId: number;

    if (existing) {
      // Check if content changed to determine whether to bump version
      const hasChanged =
        existing.collection !== item.collection ||
        existing.title !== item.title ||
        existing.summary !== summary ||
        existing.imageUrl !== imageUrl ||
        existing.href !== href ||
        existing.badge !== badge ||
        existing.sortOrder !== sortOrder ||
        existing.published !== published ||
        JSON.stringify(existing.data) !== JSON.stringify(item.data || {}) ||
        JSON.stringify(existing.detail) !== JSON.stringify(item.detail || {});

      const newVersion = hasChanged ? existing.version + 1 : existing.version;

      const updated = await tx.pageItem.update({
        where: { id: existing.id },
        data: {
          collection: item.collection,
          title: item.title,
          summary,
          imageUrl,
          href,
          badge,
          sortOrder,
          published,
          data: itemData,
          detail: itemDetail,
          version: newVersion,
        },
      });
      itemId = updated.id;
    } else {
      const created = await tx.pageItem.create({
        data: {
          pageId,
          collection: item.collection,
          slug: item.slug,
          title: item.title,
          summary,
          imageUrl,
          href,
          badge,
          sortOrder,
          published,
          data: itemData,
          detail: itemDetail,
          version: 1,
        },
      });
      itemId = created.id;
    }

    savedItems.push({ id: itemId, item });
  }

  // Delete removed items
  await tx.pageItem.deleteMany({
    where: {
      pageId,
      slug: { notIn: activeItemSlugs },
    },
  });

  // 3. Rebuild pageitemcategory join rows in sortOrder
  const itemIds = savedItems.map(s => s.id);
  if (itemIds.length > 0) {
    await tx.pageItemCategory.deleteMany({
      where: { itemId: { in: itemIds } },
    });
  }

  const linkRows: Array<{ itemId: number; categoryId: number; sortOrder: number }> = [];
  for (const { id: itemId, item } of savedItems) {
    const catNames = Array.isArray(item.categoryNames) ? item.categoryNames : [];
    const seenCatIds = new Set<number>();
    let linkSortOrder = 0;

    for (const name of catNames) {
      const catSlug = slugify(name);
      const catRow = categoryMap.get(catSlug);
      if (catRow && !seenCatIds.has(catRow.id)) {
        seenCatIds.add(catRow.id);
        linkRows.push({
          itemId,
          categoryId: catRow.id,
          sortOrder: linkSortOrder++,
        });
      }
    }
  }

  if (linkRows.length > 0) {
    await tx.pageItemCategory.createMany({
      data: linkRows,
      skipDuplicates: true,
    });
  }

  // 4. Update page
  await tx.page.update({
    where: { id: pageId },
    data: {
      pageData: (splitResult.settings || {}) as Prisma.InputJsonValue,
      contentModel: 'structured',
      version: { increment: 1 },
    },
  });
}
