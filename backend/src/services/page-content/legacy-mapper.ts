import { parsePageData } from '../../lib/page-data';
import {
  CARD_COLLECTIONS,
  LIST_COLLECTIONS,
  COLLECTIONS,
  Collection,
  DETAIL_KEYS,
  COLUMN_KEYS,
  DOCUMENT_ONLY_SLUGS,
  ARTICLE_PAGE_SLUGS,
} from './constants';

export interface SplitItem {
  collection: Collection;
  sortOrder: number;
  title: string;
  slug: string;
  summary: string | null;
  imageUrl: string | null;
  href: string | null;
  badge: string | null;
  published: boolean;
  data: Record<string, unknown>;
  detail: Record<string, unknown>;
  categoryNames: string[];
}

export interface SplitCategory {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface SplitResult {
  settings: Record<string, unknown>;
  items: SplitItem[];
  categories: SplitCategory[];
  warnings: string[];
}

/**
 * Byte-for-byte matching slugify logic matching frontend and backend fallbackSlug.
 */
export function slugify(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes slug: lowercases, trims, strips leading/trailing slashes, and keeps last segment.
 */
export function normalizeSlug(s: unknown): string {
  if (s === null || s === undefined) return '';
  const str = String(s).toLowerCase().trim().replace(/^\/+|\/+$/g, '');
  if (!str) return '';
  const lastSeg = str.split('/').pop() || '';
  return slugify(lastSeg);
}

/**
 * Classifies page as 'document' or 'structured' according to Section 3.4 rules.
 */
export function classifyPage(page: {
  slug: string;
  template?: string | null;
  pageData: any;
}): 'document' | 'structured' {
  if (page.template === 'article') {
    return 'document';
  }
  const slug = (page.slug || '').toLowerCase().trim();
  if (DOCUMENT_ONLY_SLUGS.has(slug) || ARTICLE_PAGE_SLUGS.has(slug)) {
    return 'document';
  }
  if (
    slug.startsWith('guide-') ||
    slug.startsWith('environment-') ||
    slug.startsWith('resource-')
  ) {
    return 'document';
  }
  const parsed = parsePageData(page.pageData);
  const hasCollectionKey = COLLECTIONS.some(
    key => Object.prototype.hasOwnProperty.call(parsed, key) && parsed[key] !== undefined && parsed[key] !== null
  );
  if (!hasCollectionKey) {
    return 'document';
  }
  return 'structured';
}

/**
 * Splits a single item object into structured format.
 */
export function splitItem(
  obj: Record<string, unknown>,
  collection: Collection,
  index: number = 0,
  existingSlugs: Set<string> = new Set(),
  warnings: string[] = []
): { item: SplitItem; warnings: string[] } {
  // Title candidate: first non-empty string among ['title', 'question', 'name', 'heading', 'label'], fallback: `${collection} ${index + 1}`
  const TITLE_KEYS = ['title', 'question', 'name', 'heading', 'label'] as const;
  let candidateTitle = '';
  for (const tk of TITLE_KEYS) {
    if (typeof obj[tk] === 'string' && (obj[tk] as string).trim() !== '') {
      candidateTitle = tk === 'title' ? String(obj[tk]) : (obj[tk] as string).trim();
      break;
    }
  }
  if (!candidateTitle) {
    candidateTitle = `${collection} ${index + 1}`;
  }

  const titleWasDerived = !(typeof obj.title === 'string' && obj.title.trim() !== '');

  // Column fields
  const summary = obj.description !== undefined && obj.description !== null ? String(obj.description) : null;
  const imageUrl = obj.image !== undefined && obj.image !== null ? String(obj.image) : null;
  const href = obj.href !== undefined && obj.href !== null ? String(obj.href) : null;
  const badge = obj.badge !== undefined && obj.badge !== null ? String(obj.badge) : null;

  // Categories
  let categoryNames: string[] = [];
  if (Array.isArray(obj.categories)) {
    const seen = new Set<string>();
    for (const c of obj.categories) {
      if (typeof c === 'string') {
        const trimmed = c.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          categoryNames.push(trimmed);
        }
      }
    }
  } else if (typeof obj.category === 'string' && obj.category.trim() !== '') {
    categoryNames = [obj.category.trim()];
  }

  // Detail & Data
  const isCardCol = (CARD_COLLECTIONS as readonly string[]).includes(collection);
  const detail: Record<string, unknown> = {};
  if (isCardCol) {
    for (const dk of DETAIL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(obj, dk) && obj[dk] !== undefined) {
        detail[dk] = obj[dk];
      }
    }
  }

  const EXCLUDED_LEGACY_KEYS = new Set([
    'title',
    'slug',
    'description',
    'image',
    'href',
    'badge',
    'category',
    'categories',
  ]);

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (EXCLUDED_LEGACY_KEYS.has(k)) continue;
    if (isCardCol && (DETAIL_KEYS as readonly string[]).includes(k)) continue;
    data[k] = v;
  }
  if (titleWasDerived) {
    data.__titleDerived = true;
  }

  // Slug calculation (unique across whole page)
  let base = '';
  if (obj.slug !== undefined && obj.slug !== null && String(obj.slug).trim() !== '') {
    base = normalizeSlug(obj.slug);
  }
  if (!base) {
    base = slugify(candidateTitle);
  }
  if (!base) {
    base = slugify(`${collection}-${index + 1}`);
  }

  let finalSlug = base;
  let counter = 2;
  if (existingSlugs.has(finalSlug)) {
    while (existingSlugs.has(`${base}-${counter}`)) {
      counter++;
    }
    finalSlug = `${base}-${counter}`;
    warnings.push(`Slug collision on '${base}': resolved to '${finalSlug}'`);
  }
  existingSlugs.add(finalSlug);

  const published = obj.published !== false;

  const item: SplitItem = {
    collection,
    sortOrder: index,
    title: candidateTitle,
    slug: finalSlug,
    summary,
    imageUrl,
    href,
    badge,
    published,
    data,
    detail,
    categoryNames,
  };

  return { item, warnings };
}

/**
 * Pure function splitting legacy pageData blob into settings, structured items, and categories.
 */
export function splitLegacyPageData(blob: Record<string, unknown>): SplitResult {
  if (!blob || typeof blob !== 'object' || Array.isArray(blob)) {
    return { settings: {}, items: [], categories: [], warnings: [] };
  }

  // 1. Settings is a deep copy with COLLECTIONS and categories removed
  const settings = JSON.parse(JSON.stringify(blob));
  for (const col of COLLECTIONS) {
    delete settings[col];
  }
  delete settings.categories;

  const items: SplitItem[] = [];
  const warnings: string[] = [];
  const existingSlugs = new Set<string>();

  // 2. Process collections in COLLECTIONS order
  for (const col of COLLECTIONS) {
    if (col === 'featured') {
      const rawFeatured = blob.featured;
      if (
        rawFeatured &&
        typeof rawFeatured === 'object' &&
        !Array.isArray(rawFeatured) &&
        Object.keys(rawFeatured).length > 0
      ) {
        const { item } = splitItem(rawFeatured as Record<string, unknown>, 'featured', 0, existingSlugs, warnings);
        items.push(item);
      }
    } else {
      const rawCol = blob[col];
      if (Array.isArray(rawCol)) {
        let validIndex = 0;
        for (const rawItem of rawCol) {
          if (rawItem && typeof rawItem === 'object' && !Array.isArray(rawItem)) {
            const { item } = splitItem(
              rawItem as Record<string, unknown>,
              col,
              validIndex++,
              existingSlugs,
              warnings
            );
            items.push(item);
          }
        }
      }
    }
  }

  // 5. Page-level categories
  const categoryList: SplitCategory[] = [];
  const seenCategorySlugs = new Map<string, string>(); // slug -> name

  const addCategory = (rawName: unknown) => {
    if (typeof rawName !== 'string') return;
    const name = rawName.trim();
    if (!name) return;
    const catSlug = slugify(name);
    if (!catSlug) return;

    if (seenCategorySlugs.has(catSlug)) {
      const existingName = seenCategorySlugs.get(catSlug)!;
      if (existingName !== name) {
        warnings.push(`Category slug collision on '${catSlug}': '${name}' merged into '${existingName}'`);
      }
      return;
    }

    seenCategorySlugs.set(catSlug, name);
    categoryList.push({
      name,
      slug: catSlug,
      sortOrder: categoryList.length,
    });
  };

  // Explicit top-level categories first
  if (Array.isArray(blob.categories)) {
    for (const cat of blob.categories) {
      addCategory(cat);
    }
  }

  // Item categories in item order
  for (const it of items) {
    for (const catName of it.categoryNames) {
      addCategory(catName);
    }
  }

  return {
    settings,
    items,
    categories: categoryList,
    warnings,
  };
}

/**
 * Reconstructs a single legacy item object from structured properties.
 */
export function buildItem(
  item: {
    collection?: string;
    title?: string;
    slug?: string;
    summary?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    badge?: string | null;
    data?: any;
    detail?: any;
    categoryNames?: string[];
    categories?: any[];
  },
  options?: { includeDetail?: boolean }
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
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

/**
 * Reconstructs legacy JSON pageData format from structured settings, items, and categories.
 */
export function buildLegacyPageData(
  settings: Record<string, unknown>,
  items: any[],
  categories: any[],
  options?: { includeDetail?: boolean; publicOnly?: boolean }
): Record<string, unknown> {
  const blob: Record<string, unknown> = JSON.parse(JSON.stringify(settings || {}));
  const includeDetail = options?.includeDetail ?? false;
  const publicOnly = options?.publicOnly ?? false;

  const validItems = Array.isArray(items) ? items : [];

  for (const col of COLLECTIONS) {
    const colItems = validItems.filter(it => it.collection === col);
    const filteredItems = publicOnly ? colItems.filter(it => it.published !== false) : colItems;
    filteredItems.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    if (col === 'featured') {
      if (filteredItems.length > 0) {
        blob.featured = buildItem(filteredItems[0], { includeDetail });
      } else {
        delete blob.featured;
      }
    } else {
      if (filteredItems.length > 0) {
        blob[col] = filteredItems.map(it => buildItem(it, { includeDetail }));
      } else {
        delete blob[col];
      }
    }
  }

  if (Array.isArray(categories) && categories.length > 0) {
    const sortedCats = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const names = sortedCats
      .map(c => typeof c === 'string' ? c : c.name)
      .filter(n => typeof n === 'string' && n.length > 0);
    if (names.length > 0) {
      blob.categories = names;
    } else {
      delete blob.categories;
    }
  } else {
    delete blob.categories;
  }

  return blob;
}
