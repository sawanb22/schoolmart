import prisma from '../../lib/prisma';
import { parsePageData } from '../../lib/page-data';
import { COLLECTIONS, Collection } from './constants';
import {
  slugify,
  normalizeSlug,
  buildLegacyPageData,
} from './legacy-mapper';
import { toLegacyPageResponse } from './page-response';

export const DETAIL_DROPPED = new Set<string>();

export const PAGE_SLUG_ALIASES: Record<string, string> = {
  'sports': 'sports-infra',
  'sports-infra': 'sports',
  'sell-on-schoolmart': 'sell-on-campusmart',
  'sell-on-campusmart': 'sell-on-schoolmart',
};

export interface LoadPageOptions {
  includeUnpublished?: boolean;
}

export interface GetPageOptions {
  isAdmin?: boolean;
}

export interface ItemSummary {
  id: number;
  slug: string;
  collection: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  href: string | null;
  badge: string | null;
  categories: string[];
  data: Record<string, unknown>;
  sortOrder: number;
}

export interface ItemFull extends ItemSummary {
  detail: Record<string, unknown>;
  published: boolean;
  version: number;
  updatedAt: Date;
}

export interface HubV2Response {
  page: {
    id: number;
    slug: string;
    title: string;
    template: string | null;
    contentModel: string;
    version: number;
    updatedAt: Date;
  };
  settings: Record<string, unknown>;
  collections: {
    cards?: ItemSummary[];
    section2Cards?: ItemSummary[];
    moreCards?: ItemSummary[];
    featured?: ItemSummary[];
    faqs?: ItemSummary[];
    openings?: ItemSummary[];
    caseStudies?: ItemSummary[];
    [key: string]: ItemSummary[] | undefined;
  };
  categories: Array<{ id: number; name: string; slug: string }>;
}

export interface HubItemResponse {
  hub: {
    id: number;
    slug: string;
    title: string;
    template: string | null;
    heroImage: string | null;
    cta: {
      ctaTitle: string | null;
      ctaSubtitle: string | null;
      ctaButtonLabel: string | null;
      ctaHref: string | null;
      ctaButtonHref: string | null;
    };
  };
  item: ItemFull;
}

export type GetItemResult = HubItemResponse | { redirectTo: string } | null;

export class PageContentService {
  /**
   * Loads a Page with categories and items in one single Prisma query.
   * Resolves aliases if not found by original slug.
   */
  async loadPage(
    slugOrId: string | number,
    options?: LoadPageOptions
  ): Promise<any | null> {
    const isNumeric =
      typeof slugOrId === 'number' ||
      (!isNaN(Number(slugOrId)) && String(Number(slugOrId)) === String(slugOrId).trim());
    const numericId = isNumeric ? Number(slugOrId) : null;
    const slug = isNumeric ? '' : String(slugOrId).trim();

    const includeClause = {
      categories: {
        orderBy: { sortOrder: 'asc' as const },
      },
      items: {
        where: options?.includeUnpublished ? undefined : { published: true },
        orderBy: [
          { collection: 'asc' as const },
          { sortOrder: 'asc' as const },
        ],
        include: {
          categories: {
            orderBy: { sortOrder: 'asc' as const },
            include: { category: true },
          },
        },
      },
    };

    let page = await prisma.page.findUnique({
      where: isNumeric ? { id: numericId! } : { slug },
      include: includeClause,
    });

    if (!page && !isNumeric && PAGE_SLUG_ALIASES[slug]) {
      page = await prisma.page.findUnique({
        where: { slug: PAGE_SLUG_ALIASES[slug] },
        include: includeClause,
      });
    }

    if (!page) {
      return null;
    }

    if (!options?.includeUnpublished && !page.published) {
      return null;
    }

    return page;
  }

  /**
   * Returns a Page in the legacy shape with stringified pageData.
   * For structured pages, reconstructs pageData from items and categories.
   */
  async getPageLegacy(
    slugOrId: string | number,
    options?: GetPageOptions
  ): Promise<any | null> {
    const page = await this.loadPage(slugOrId, {
      includeUnpublished: options?.isAdmin,
    });

    if (!page) {
      return null;
    }

    if (page.contentModel === 'document') {
      return toLegacyPageResponse(page);
    }

    // Structured page: reconstruct legacy pageData
    const settings = parsePageData(page.pageData);
    const includeDetail = !DETAIL_DROPPED.has(page.slug);
    const publicOnly = !options?.isAdmin;

    const reconstructed = buildLegacyPageData(settings, page.items, page.categories, {
      includeDetail,
      publicOnly,
    });

    return toLegacyPageResponse({
      ...page,
      pageData: reconstructed,
    });
  }

  /**
   * Returns Hub v2 response.
   * NEVER includes detail key anywhere in response (Invariant I5).
   */
  async getHubV2(
    slugOrId: string | number,
    options?: GetPageOptions
  ): Promise<HubV2Response | null> {
    const page = await this.loadPage(slugOrId, {
      includeUnpublished: options?.isAdmin,
    });

    if (!page) {
      return null;
    }

    const pageInfo = {
      id: page.id,
      slug: page.slug,
      title: page.title,
      template: page.template,
      contentModel: page.contentModel,
      version: page.version,
      updatedAt: page.updatedAt,
    };

    const parsedSettings = parsePageData(page.pageData);

    if (page.contentModel === 'document') {
      return {
        page: pageInfo,
        settings: parsedSettings,
        collections: {},
        categories: [],
      };
    }

    const collections: HubV2Response['collections'] = {};

    for (const col of COLLECTIONS) {
      const colItems = (page.items || []).filter((it: any) => it.collection === col);
      if (colItems.length === 0) continue;

      const summaries: ItemSummary[] = colItems.map((it: any) => {
        const catNames: string[] = (it.categories || [])
          .map((c: any) => c.category?.name || c.name || '')
          .filter((name: string) => typeof name === 'string' && name.length > 0);

        return {
          id: it.id,
          slug: it.slug,
          collection: it.collection,
          title: it.title,
          summary: it.summary ?? null,
          imageUrl: it.imageUrl ?? null,
          href: it.href ?? null,
          badge: it.badge ?? null,
          categories: catNames,
          data: it.data || {},
          sortOrder: it.sortOrder,
        };
      });

      if (col === 'featured') {
        collections.featured = summaries.slice(0, 1);
      } else {
        collections[col] = summaries;
      }
    }

    const categories = (page.categories || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }));

    return {
      page: pageInfo,
      settings: parsedSettings,
      collections,
      categories,
    };
  }

  /**
   * Resolves an item within a loaded page:
   * 1. Exact match by slug
   * 2. Check SlugRedirect for /<page.slug>/<itemSlug>
   * 3. Fallback match by slugify(title) or last segment of href
   */
  async findItem(
    page: any,
    itemSlug: string
  ): Promise<{ type: 'exact' | 'fallback'; item: any } | { type: 'redirect'; redirectTo: string } | null> {
    if (!page) return null;
    const targetSlug = itemSlug.toLowerCase().trim();

    // 1. Exact match on item.slug
    const items = page.items || [];
    const exact = items.find((it: any) => it.slug.toLowerCase().trim() === targetSlug);
    if (exact) {
      return { type: 'exact', item: exact };
    }

    // 2. Check SlugRedirect for /<page.slug>/<itemSlug>
    const fromPath = `/${page.slug}/${targetSlug}`;
    const redirect = await prisma.slugRedirect.findUnique({
      where: { fromPath },
    });
    if (redirect) {
      return { type: 'redirect', redirectTo: redirect.toPath };
    }

    // 3. Fallback: match on slugify(title) or last segment of href
    const fallback = items.find((it: any) => {
      const titleSlug = slugify(it.title || '');
      if (titleSlug && titleSlug === targetSlug) {
        return true;
      }
      if (it.href) {
        const leafSlug = normalizeSlug(it.href);
        if (leafSlug && leafSlug === targetSlug) {
          return true;
        }
      }
      return false;
    });

    if (fallback) {
      return { type: 'fallback', item: fallback };
    }

    return null;
  }

  /**
   * Returns item full details within hub or redirect instruction.
   * Returns null if missing or unpublished (for public callers).
   */
  async getItem(
    hubSlug: string,
    itemSlug: string,
    options?: GetPageOptions
  ): Promise<GetItemResult> {
    const page = await this.loadPage(hubSlug, {
      includeUnpublished: options?.isAdmin,
    });

    if (!page) {
      return null;
    }

    const match = await this.findItem(page, itemSlug);
    if (!match) {
      return null;
    }

    if (match.type === 'redirect') {
      return { redirectTo: match.redirectTo };
    }

    const item = match.item;
    if (!options?.isAdmin && !item.published) {
      return null;
    }

    const pageData = parsePageData(page.pageData);
    const hero = (pageData.hero || {}) as Record<string, any>;
    const cta = (pageData.cta || {}) as Record<string, any>;

    const heroImage = (pageData.heroImage ||
      hero.bannerImage ||
      hero.image ||
      hero.mediaUrl ||
      null) as string | null;

    const hubCta = {
      ctaTitle: (cta.ctaTitle || cta.title || pageData.ctaTitle || null) as string | null,
      ctaSubtitle: (cta.ctaSubtitle || cta.subtitle || pageData.ctaSubtitle || null) as string | null,
      ctaButtonLabel: (cta.ctaButtonLabel ||
        cta.buttonLabel ||
        cta.label ||
        pageData.ctaButtonLabel ||
        null) as string | null,
      ctaHref: (cta.ctaHref || cta.href || pageData.ctaHref || null) as string | null,
      ctaButtonHref: (cta.ctaButtonHref ||
        cta.buttonHref ||
        pageData.ctaButtonHref ||
        null) as string | null,
    };

    const catNames: string[] = (item.categories || [])
      .map((c: any) => c.category?.name || c.name || '')
      .filter((name: string) => typeof name === 'string' && name.length > 0);

    const itemFull: ItemFull = {
      id: item.id,
      slug: item.slug,
      collection: item.collection,
      title: item.title,
      summary: item.summary ?? null,
      imageUrl: item.imageUrl ?? null,
      href: item.href ?? null,
      badge: item.badge ?? null,
      categories: catNames,
      data: (item.data || {}) as Record<string, unknown>,
      detail: (item.detail || {}) as Record<string, unknown>,
      sortOrder: item.sortOrder ?? 0,
      published: item.published !== false,
      version: item.version ?? 1,
      updatedAt: item.updatedAt,
    };

    return {
      hub: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        template: page.template ?? null,
        heroImage,
        cta: hubCta,
      },
      item: itemFull,
    };
  }
}

export const pageContentService = new PageContentService();
export default pageContentService;
