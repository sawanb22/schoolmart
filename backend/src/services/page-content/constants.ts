export const CARD_COLLECTIONS = ['cards', 'section2Cards', 'moreCards', 'featured'] as const;
export const LIST_COLLECTIONS = ['faqs', 'openings', 'caseStudies'] as const;
export const COLLECTIONS = [...CARD_COLLECTIONS, ...LIST_COLLECTIONS] as const;

export type Collection = typeof COLLECTIONS[number];
export type CardCollection = typeof CARD_COLLECTIONS[number];
export type ListCollection = typeof LIST_COLLECTIONS[number];

export const SINGLE_OBJECT_COLLECTIONS: ReadonlySet<Collection> = new Set(['featured']);

// Moved to PageItem.detail, for CARD_COLLECTIONS only. LIST_COLLECTIONS keep everything in `data`.
export const DETAIL_KEYS = [
  'detailContent',
  'useCustomDetail',
  'body',
  'content',
  'methodology',
  'deliverables',
  'deliverablesHeading',
  'beforeImages',
  'afterImages',
  'ctaTitle',
  'ctaSubtitle',
  'ctaButtonLabel',
  'ctaButtonHref',
  'ctaHref',
  'hideCta',
] as const;

export type DetailKey = typeof DETAIL_KEYS[number];

// Legacy key -> PageItem column. A column is filled only when the legacy key has exactly this name.
export const COLUMN_KEYS = {
  title: 'title',
  slug: 'slug',
  description: 'summary',
  image: 'imageUrl',
  href: 'href',
  badge: 'badge',
} as const;

// Pages that always stay contentModel='document' even if they contain arrays.
export const DOCUMENT_ONLY_SLUGS: ReadonlySet<string> = new Set([
  'home',
  'furniture',
  'contact-us',
  'about-us',
  'corporate',
]);

// Slugs that represent static article / policy documents and stay contentModel='document'
export const ARTICLE_PAGE_SLUGS: ReadonlySet<string> = new Set([
  'terms-and-conditions',
  'privacy-policy',
  'refund-policy',
  'shipping-policy',
  'terms-of-use',
  'payment-policy',
  'replacement-return',
  'order-rejection',
  'how-it-works',
  'brand-help',
  'sell-on-schoolmart',
  'sell-on-campusmart',
  '20-stunning-college-buildings',
  'academic-buildings',
  'research-facilities',
  'student-life-centers',
]);

// HTML content fields requiring sanitization on write
export const HTML_KEYS = [
  'detailContent',
  'body',
  'content',
  'methodology',
  'answer',
] as const;

export const MAX_PAGEDATA_BYTES = 512 * 1024;
export const MAX_ITEM_JSON_BYTES = 256 * 1024;
export const REVISIONS_KEPT_PER_PAGE = 30;

// Slugs that require full detail content on the hub list view.
// Currently empty as all migrated hub pages consume summary cards and detail views fetch individual item endpoints.
export const HUB_NEEDS_DETAIL: ReadonlySet<string> = new Set<string>([]);

export const LEGACY_HUB_DEFAULT_CATEGORIES: Record<string, string[]> = {
  'tech-infra': ['Classroom Tech', 'Displays', 'Networking', 'Wi-Fi & Fiber', 'Servers & Cloud', 'Security'],
};
