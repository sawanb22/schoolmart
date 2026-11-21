import api from './client';

export interface PageLegacyResult {
  record: Record<string, unknown>;
  pageData: Record<string, unknown>;
}

export interface ResolveResult {
  type: 'page' | 'item' | 'redirect' | 'not_found';
  slug?: string;
  hubSlug?: string;
  itemSlug?: string | null;
  template?: string | null;
  contentModel?: string;
  hubTemplate?: string | null;
  redirectTo?: string;
  page?: Record<string, unknown>;
}

/**
 * Fetch page legacy shape (record and parsed pageData).
 * GET /api/pages/:slug
 */
export async function fetchPageLegacy(slug: string): Promise<PageLegacyResult> {
  const res = await api.get(`/pages/${slug}`);
  const record = (res.data || {}) as Record<string, unknown>;
  let pageData: Record<string, unknown> = {};

  if (record && record.pageData) {
    if (typeof record.pageData === 'string') {
      try {
        pageData = JSON.parse(record.pageData);
      } catch {
        pageData = {};
      }
    } else if (typeof record.pageData === 'object') {
      pageData = record.pageData as Record<string, unknown>;
    }
  }

  return { record, pageData };
}

/**
 * Fetch hub summary v2.
 * GET /api/pages/:slug?v=2
 */
export async function fetchHub(slug: string): Promise<Record<string, unknown>> {
  const res = await api.get(`/pages/${slug}?v=2`);
  return res.data;
}

/**
 * Fetch single hub item.
 * GET /api/pages/:hubSlug/items/:itemSlug
 * Catches 404 and returns null without throwing.
 */
export async function fetchHubItem(hubSlug: string, itemSlug: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await api.get(`/pages/${hubSlug}/items/${itemSlug}`);
    return res.data;
  } catch (err: unknown) {
    const axiosError = err as { response?: { status?: number; data?: Record<string, unknown> } };
    if (axiosError.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Resolve path (single- or two-segment).
 * GET /api/pages/resolve?path=:path
 * Catches 404 and returns { type: 'not_found' } without throwing.
 */
export async function fetchResolve(path: string): Promise<ResolveResult> {
  try {
    const res = await api.get(`/pages/resolve?path=${encodeURIComponent(path)}`);
    return res.data;
  } catch (err: unknown) {
    const axiosError = err as { response?: { status?: number; data?: ResolveResult } };
    if (axiosError.response?.status === 404) {
      return axiosError.response.data || { type: 'not_found' };
    }
    throw err;
  }
}
