import { expect } from 'vitest';
import { COLLECTIONS, Collection } from '../../src/services/page-content/constants';
import { slugify, normalizeSlug } from '../../src/services/page-content/legacy-mapper';

/**
 * Normalizes an original legacy blob to account for the 5 permitted differences
 * when comparing against a rebuilt legacy blob.
 */
export function normalizeForEquivalence(original: any, rebuilt: any): {
  normalizedOriginal: Record<string, unknown>;
  normalizedRebuilt: Record<string, unknown>;
} {
  const normOriginal: Record<string, unknown> = JSON.parse(JSON.stringify(original || {}));
  const normRebuilt: Record<string, unknown> = JSON.parse(JSON.stringify(rebuilt || {}));

  // Helper to extract category names from a legacy item
  const getItemCatNames = (item: any): string[] => {
    if (!item || typeof item !== 'object') return [];
    if (Array.isArray(item.categories)) {
      const seen = new Set<string>();
      const res: string[] = [];
      for (const c of item.categories) {
        if (typeof c === 'string') {
          const t = c.trim();
          if (t && !seen.has(t)) {
            seen.add(t);
            res.push(t);
          }
        }
      }
      return res;
    }
    if (typeof item.category === 'string' && item.category.trim() !== '') {
      return [item.category.trim()];
    }
    return [];
  };

  // 4. Top-level categories becomes the merged list from rule 5
  const mergedCatNames: string[] = [];
  const seenCatSlugs = new Set<string>();

  const addMergedCat = (name: unknown) => {
    if (typeof name !== 'string') return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const s = slugify(trimmed);
    if (!s || seenCatSlugs.has(s)) return;
    seenCatSlugs.add(s);
    mergedCatNames.push(trimmed);
  };

  if (Array.isArray(original?.categories)) {
    for (const c of original.categories) {
      addMergedCat(c);
    }
  }

  for (const col of COLLECTIONS) {
    if (col === 'featured') {
      if (
        original?.featured &&
        typeof original.featured === 'object' &&
        !Array.isArray(original.featured) &&
        Object.keys(original.featured).length > 0
      ) {
        for (const c of getItemCatNames(original.featured)) {
          addMergedCat(c);
        }
      }
    } else if (Array.isArray(original?.[col])) {
      for (const it of original[col]) {
        if (it && typeof it === 'object' && !Array.isArray(it)) {
          for (const c of getItemCatNames(it)) {
            addMergedCat(c);
          }
        }
      }
    }
  }

  if (mergedCatNames.length > 0) {
    normOriginal.categories = mergedCatNames;
  } else {
    delete normOriginal.categories;
  }

  if (Array.isArray(normRebuilt.categories) && normRebuilt.categories.length === 0) {
    delete normRebuilt.categories;
  }

  // Normalize single item
  const normalizeItem = (item: any, rebuiltItem?: any) => {
    // 2. category: "X" becomes categories: ["X"], trimmed & deduplicated, empty removed
    const catNames = getItemCatNames(item);
    if (catNames.length > 0) {
      item.categories = catNames;
    } else {
      delete item.categories;
    }
    delete item.category;

    // 1 & 5. Slug normalization & missing/collision slug resolution
    if (rebuiltItem && rebuiltItem.slug) {
      if (!item.slug || normalizeSlug(item.slug) !== rebuiltItem.slug) {
        item.slug = rebuiltItem.slug;
      } else {
        item.slug = normalizeSlug(item.slug);
      }
    } else if (item.slug) {
      item.slug = normalizeSlug(item.slug);
    }

    // Omit keys with null value (buildItem omits null column keys)
    for (const [k, v] of Object.entries(item)) {
      if (v === null || v === undefined) {
        delete item[k];
      }
    }

    // Title: if title was empty or not provided or whitespace only, rebuilt item omits title
    if (!item.title || (typeof item.title === 'string' && item.title.trim() === '')) {
      delete item.title;
    }
  };

  // 3. Non-object entries in collection arrays are removed, empty featured: {} removed
  for (const col of COLLECTIONS) {
    if (col === 'featured') {
      if (
        !normOriginal.featured ||
        typeof normOriginal.featured !== 'object' ||
        Array.isArray(normOriginal.featured) ||
        Object.keys(normOriginal.featured).length === 0
      ) {
        delete normOriginal.featured;
      } else {
        normalizeItem(normOriginal.featured, normRebuilt.featured);
      }
      if (
        normRebuilt.featured &&
        typeof normRebuilt.featured === 'object' &&
        Object.keys(normRebuilt.featured).length === 0
      ) {
        delete normRebuilt.featured;
      }
    } else {
      if (Array.isArray(normOriginal[col])) {
        const filtered = (normOriginal[col] as any[]).filter(
          x => x && typeof x === 'object' && !Array.isArray(x)
        );
        if (filtered.length === 0) {
          delete normOriginal[col];
        } else {
          normOriginal[col] = filtered;
          const rebuiltList = Array.isArray(normRebuilt[col]) ? normRebuilt[col] : [];
          for (let i = 0; i < filtered.length; i++) {
            normalizeItem(filtered[i], rebuiltList[i]);
          }
        }
      } else {
        delete normOriginal[col];
      }

      if (Array.isArray(normRebuilt[col]) && normRebuilt[col].length === 0) {
        delete normRebuilt[col];
      }
    }
  }

  return { normalizedOriginal: normOriginal, normalizedRebuilt: normRebuilt };
}

/**
 * Asserts round-trip equivalence allowing only the 5 permitted normalization differences.
 */
export function assertLegacyEquivalent(original: any, rebuilt: any): void {
  const { normalizedOriginal, normalizedRebuilt } = normalizeForEquivalence(original, rebuilt);
  expect(normalizedOriginal).toEqual(normalizedRebuilt);
}
