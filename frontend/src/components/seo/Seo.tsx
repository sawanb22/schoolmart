export interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  noindex?: boolean;
}

/**
 * Formats document title to "${cleanTitle} | CampusMart" unless cleanTitle already contains "CampusMart".
 */
export function formatTitle(title?: string): string {
  const clean = (title || 'CampusMart').trim();
  if (!clean) return 'CampusMart';
  if (/campusmart/i.test(clean)) {
    return clean;
  }
  return `${clean} | CampusMart`;
}

/**
 * Truncates description at word boundary within maxLength characters, appending '...' if truncated.
 */
export function truncateDescription(desc?: string, maxLength = 160): string {
  if (!desc) return '';
  const trimmed = desc.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;

  // Fit the ellipsis inside maxLength so total length <= maxLength
  const targetLen = Math.max(0, maxLength - 3);
  const candidate = trimmed.slice(0, targetLen);
  const lastSpace = candidate.lastIndexOf(' ');
  const cut = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
  return `${cut.trim()}...`;
}

/**
 * Formats canonical URL using VITE_SITE_URL or fallback https://campusmart.in.
 */
export function formatCanonicalUrl(path?: string, baseUrl?: string): string {
  const siteUrl = (
    baseUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) ||
    'https://campusmart.in'
  ).replace(/\/+$/, '');

  const rawPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return `${siteUrl}${cleanPath || '/'}`;
}

/**
 * Formats image URL to an absolute URL if needed.
 */
export function formatImageUrl(image?: string, baseUrl?: string): string | undefined {
  if (!image) return undefined;
  const trimmed = image.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const siteUrl = (
    baseUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) ||
    'https://campusmart.in'
  ).replace(/\/+$/, '');

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl}${cleanPath}`;
}

/**
 * React 19 document metadata hoisting component.
 * Directly renders <title>, <meta>, <link> in JSX tree to be hoisted into <head>.
 */
export function Seo({ title, description, image, path, noindex = false }: SeoProps) {
  const formattedTitle = formatTitle(title);
  const formattedDescription = truncateDescription(description, 160);
  const canonicalUrl = formatCanonicalUrl(path);
  const imageUrl = formatImageUrl(image);

  return (
    <>
      <title>{formattedTitle}</title>
      {formattedDescription ? (
        <meta name="description" content={formattedDescription} />
      ) : null}
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph */}
      <meta property="og:title" content={formattedTitle} />
      {formattedDescription ? (
        <meta property="og:description" content={formattedDescription} />
      ) : null}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}

      {/* Twitter Cards */}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={formattedTitle} />
      {formattedDescription ? (
        <meta name="twitter:description" content={formattedDescription} />
      ) : null}
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}

      {/* Crawl Directives */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : null}
    </>
  );
}

export default Seo;
