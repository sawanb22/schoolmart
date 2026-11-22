/**
 * itemToCard
 *
 * Converts a structured PageItem / ItemFull / ItemSummary object from the
 * backend into the legacy card shape expected by frontend templates and detail pages.
 *
 * Mirrors `buildItem` from `backend/src/services/page-content/legacy-mapper.ts`.
 */

export interface ItemToCardOptions {
  includeDetail?: boolean;
}

export function itemToCard(
  item: any,
  options?: ItemToCardOptions
): Record<string, any> {
  if (!item || typeof item !== 'object') {
    return {};
  }
  const result: Record<string, any> = {};
  const includeDetail = options?.includeDetail ?? false;

  // 1. Spread data (minus __titleDerived)
  if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
    for (const [k, v] of Object.entries(item.data)) {
      if (k !== '__titleDerived') {
        result[k] = v;
      }
    }
  }

  // 2. Spread detail if includeDetail
  if (includeDetail && item.detail && typeof item.detail === 'object' && !Array.isArray(item.detail)) {
    for (const [k, v] of Object.entries(item.detail)) {
      result[k] = v;
    }
  }

  // 3. title (omitted if data.__titleDerived)
  const isDerived = Boolean(item.data?.__titleDerived);
  if (!isDerived && item.title !== undefined && item.title !== null) {
    result.title = item.title;
  }

  // 4. slug
  if (item.slug !== undefined && item.slug !== null) {
    result.slug = item.slug;
  }

  // 5. description: summary (omit if null)
  if (item.summary !== undefined && item.summary !== null) {
    result.description = item.summary;
  }

  // 6. image: imageUrl (omit if null)
  if (item.imageUrl !== undefined && item.imageUrl !== null) {
    result.image = item.imageUrl;
  }

  // 7. href (omit if null)
  if (item.href !== undefined && item.href !== null) {
    result.href = item.href;
  }

  // 8. badge (omit if null)
  if (item.badge !== undefined && item.badge !== null) {
    result.badge = item.badge;
  }

  // 9. categories: [names in join sortOrder] (omit if empty)
  let catNames: string[] = [];
  if (Array.isArray(item.categoryNames)) {
    catNames = item.categoryNames;
  } else if (Array.isArray(item.categories)) {
    catNames = item.categories
      .map((c: any) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object') {
          return c.category?.name || c.name || '';
        }
        return '';
      })
      .filter((s: string) => typeof s === 'string' && s.length > 0);
  }
  if (catNames.length > 0) {
    result.categories = catNames;
  }

  return result;
}
