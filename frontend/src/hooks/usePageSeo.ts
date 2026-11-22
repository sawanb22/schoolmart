import { useMemo } from 'react';
import type { SeoProps } from '@/components/seo/Seo';

export interface UsePageSeoOptions {
  settings?: Record<string, any> | null;
  fallbackTitle?: string;
  fallbackDescription?: string;
  path?: string;
}

/**
 * Derives SEO properties from page settings, item data, or fallbacks.
 *
 * Fallback chains:
 * - title: settings.seoTitle || settings.heroTitle || settings.title || fallbackTitle || 'CampusMart'
 * - description: settings.seoDescription || settings.heroSubtitle || fallbackDescription || ''
 * - image: settings.ogImage || settings.heroImage || settings.featuredImage || settings.image
 * - noindex: Boolean(settings.noindex)
 */
export function usePageSeo(
  settings?: Record<string, any> | null,
  fallbackTitle?: string,
  fallbackDescription?: string,
  path?: string
): SeoProps {
  return useMemo(() => {
    const s = settings || {};
    const title =
      s.seoTitle ||
      s.heroTitle ||
      s.title ||
      s.pageTitle ||
      fallbackTitle ||
      'CampusMart';

    const description =
      s.seoDescription ||
      s.heroSubtitle ||
      s.summary ||
      s.description ||
      fallbackDescription ||
      '';

    const image =
      s.ogImage ||
      s.heroImage ||
      s.featuredImage ||
      s.image ||
      undefined;

    const noindex = Boolean(s.noindex);

    return {
      title,
      description,
      image,
      path,
      noindex,
    };
  }, [settings, fallbackTitle, fallbackDescription, path]);
}

export default usePageSeo;
