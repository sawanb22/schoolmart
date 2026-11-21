import { useMemo } from 'react';
import { useHub } from './useHub';
import { itemToCard } from '@/lib/item-to-card';

const EMPTY = Object.freeze({});

const LIST_AND_MULTI_CARD_COLLECTIONS = [
  'cards',
  'section2Cards',
  'moreCards',
  'faqs',
  'openings',
  'caseStudies',
] as const;

/**
 * Pure conversion function that synthesizes a legacy pageData object
 * from a v2 hub response.
 *
 * Guaranteed parity with backend `buildLegacyPageData(settings, items, categories, { includeDetail: false })`.
 */
export function hubV2ToLegacyPageData(hub: any): Record<string, any> {
  if (!hub || typeof hub !== 'object') {
    return {};
  }

  // 1. Spreads data.settings
  const settings =
    hub.settings && typeof hub.settings === 'object' && !Array.isArray(hub.settings)
      ? JSON.parse(JSON.stringify(hub.settings))
      : {};
  const result: Record<string, any> = { ...settings };

  const collections = hub.collections || {};

  // 2. Maps collection items using itemToCard(item, { includeDetail: false })
  for (const col of LIST_AND_MULTI_CARD_COLLECTIONS) {
    const items = collections[col];
    if (Array.isArray(items) && items.length > 0) {
      result[col] = items.map((item: any) =>
        itemToCard(item, { includeDetail: false })
      );
    } else if (Array.isArray(result[col]) && result[col].length > 0) {
      // Retain settings fallback if defined in settings
    } else {
      delete result[col];
    }
  }

  // 3. Maps `featured`: single object itemToCard(collections.featured[0], { includeDetail: false })
  //    if present, else fallback to settings
  const featured = collections.featured;
  if (Array.isArray(featured) && featured.length > 0 && featured[0]) {
    result.featured = itemToCard(featured[0], { includeDetail: false });
  } else if (result.featured !== undefined && result.featured !== null) {
    // Retain settings.featured fallback
  } else {
    delete result.featured;
  }

  // 4. Maps `categories`: array of category names string[] from data.categories.map(c => c.name)
  if (Array.isArray(hub.categories) && hub.categories.length > 0) {
    const names = hub.categories
      .map((c: any) => (typeof c === 'string' ? c : c?.name))
      .filter((n: any) => typeof n === 'string' && n.length > 0);
    if (names.length > 0) {
      result.categories = names;
    } else if (Array.isArray(result.categories) && result.categories.length > 0) {
      // Retain settings fallback
    } else {
      delete result.categories;
    }
  } else if (Array.isArray(result.categories) && result.categories.length > 0) {
    // Retain settings fallback
  } else {
    delete result.categories;
  }

  return result;
}

/**
 * Adapter hook converting `useHub(slug)` v2 summary payloads into legacy pageData shape.
 * Returns backward-compatible { data, loading } with memoized reference stability.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useHubLegacy<T = Record<string, any>>(slug: string): {
  data: T;
  loading: boolean;
} {
  const { data, isPending, isError } = useHub(slug);

  const legacyData = useMemo(() => {
    if (isError || !data) return null;
    return hubV2ToLegacyPageData(data) as T;
  }, [data, isError]);

  const resolvedData = (legacyData ?? EMPTY) as T;
  const resolvedLoading = !isError && isPending && !!slug;

  return useMemo(
    () => ({
      data: resolvedData,
      loading: resolvedLoading,
    }),
    [resolvedData, resolvedLoading]
  );
}
