import { PrismaClient } from '@prisma/client';
import { ISolutionsRepository } from './solutions-repository.interface';
import { SolutionCardDto, SolutionsTaxonomy, DataWatermarks, CaseStudyDto } from './types/solutions-card.types';
import { validateTaxonomyPayload } from './taxonomy.validator';
import { PageSolutionsExtractor, RawPageInput } from './page-solutions-extractor';
import { buildLegacyPageData } from '../page-content/legacy-mapper';
import { parsePageData } from '../../lib/page-data';

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err?.code === 'P1001' ||
        err?.code === 'P1017' ||
        err?.name === 'PrismaClientInitializationError' ||
        String(err?.message || '').includes("Can't reach database server");
      if (isConnectionError && i < retries - 1) {
        await new Promise(res => setTimeout(res, delayMs * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export class PrismaSolutionsRepository implements ISolutionsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetchActiveCards(): Promise<SolutionCardDto[]> {
    return withDbRetry(async () => {
      const [rawCards, pages, taxonomy] = await Promise.all([
        this.prisma.searchCard.findMany({
          where: { active: true },
          orderBy: [
            { priority: 'desc' },
            { cardSlug: 'asc' },
          ],
        }),
        this.prisma.page.findMany({
          where: { published: true },
          select: {
            id: true,
            title: true,
            slug: true,
            template: true,
            contentModel: true,
            pageData: true,
            published: true,
            createdAt: true,
            updatedAt: true,
            categories: {
              orderBy: { sortOrder: 'asc' },
            },
            items: {
              where: { published: true },
              orderBy: [
                { collection: 'asc' },
                { sortOrder: 'asc' },
              ],
              include: {
                categories: {
                  orderBy: { sortOrder: 'asc' },
                  include: { category: true },
                },
              },
            },
          },
        }),
        this.fetchTaxonomy(),
      ]);

      const cardMap = new Map<string, SolutionCardDto>();

      // 1. Process Pinned Flagship Search Cards (Highest Priority)
      for (const c of rawCards) {
        const cleanInclusions = (c.inclusions || [])
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(s => s.length > 0);

        if (cleanInclusions.length !== 3) {
          console.warn(`[PrismaSolutionsRepository] Skipping invalid card "${c.cardSlug}": expected strictly 3 non-empty inclusions, found ${cleanInclusions.length}`);
          continue;
        }

        const dto: SolutionCardDto = {
          id: c.id,
          cardSlug: c.cardSlug,
          targetSlug: c.targetSlug.trim(),
          sectionAnchor: c.sectionAnchor ? c.sectionAnchor.replace(/^#+/, '').trim() : null,
          categorySlug: c.categorySlug.trim(),
          subcategorySlug: c.subcategorySlug ? c.subcategorySlug.trim() : null,
          secondaryCategorySlugs: (c.secondaryCategorySlugs || []).map(s => s.trim()),
          title: c.title.trim(),
          summary: c.summary.trim(),
          inclusions: cleanInclusions,
          badge: c.badge ? c.badge.trim() : null,
          imageUrl: c.imageUrl ? c.imageUrl.trim() : null,
          keywords: (c.keywords || []).map(s => s.trim()).filter(Boolean),
          institutionTypes: (c.institutionTypes || []).map(s => s.trim()).filter(Boolean),
          relatedCardSlugs: (c.relatedCardSlugs || []).map(s => s.trim()).filter(Boolean),
          priority: c.priority,
          active: c.active,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };

        cardMap.set(dto.cardSlug, dto);
      }

      // 2. Synthesize page data for structured pages and extract dynamic solution cards
      const pageInputs: RawPageInput[] = pages.map(p => {
        let pageData: any;
        if (p.contentModel === 'structured') {
          const settings = parsePageData(p.pageData);
          pageData = buildLegacyPageData(settings, p.items || [], p.categories || [], {
            includeDetail: true,
            publicOnly: true,
          });
        } else {
          pageData = p.pageData ? parsePageData(p.pageData) : null;
        }

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          template: p.template,
          pageData,
          published: p.published,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });

      const dynamicCards = PageSolutionsExtractor.extractFromPages(pageInputs, taxonomy);

      // 3. Deduplication Matrix: Deduplicate STRICTLY on cardSlug (Never targetSlug!)
      for (const d of dynamicCards) {
        if (!cardMap.has(d.cardSlug)) {
          cardMap.set(d.cardSlug, d);
        }
      }

      // 4. Return merged cards sorted by priority descending, then cardSlug ascending
      return Array.from(cardMap.values()).sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.cardSlug.localeCompare(b.cardSlug);
      });
    });
  }

  async fetchPublishedSlugs(): Promise<Set<string>> {
    return withDbRetry(async () => {
      const pages = await this.prisma.page.findMany({
        where: { published: true },
        select: { slug: true },
      });
      return new Set(pages.map(p => p.slug.trim()));
    });
  }

  async fetchTaxonomy(): Promise<SolutionsTaxonomy | null> {
    return withDbRetry(async () => {
      const row = await this.prisma.siteContent.findUnique({
        where: { key: 'solutions_finder_taxonomy' },
      });
      if (!row || !row.value) return null;

      const result = validateTaxonomyPayload(row.value);
      if (!result.valid || !result.data) {
        console.warn('[PrismaSolutionsRepository] Invalid taxonomy in SiteContent:', result.error);
        return null;
      }
      return result.data;
    });
  }

  async fetchDataWatermarks(): Promise<DataWatermarks> {
    return withDbRetry(async () => {
      const [pageAgg, cardAgg, taxRow, caseAgg, cmsState] = await Promise.all([
        this.prisma.page.aggregate({
          _max: { updatedAt: true },
          _count: { id: true },
        }),
        this.prisma.searchCard.aggregate({
          _max: { updatedAt: true },
          _count: { id: true },
        }),
        this.prisma.siteContent.findUnique({
          where: { key: 'solutions_finder_taxonomy' },
          select: { updatedAt: true },
        }),
        this.prisma.caseStudy.aggregate({
          _max: { updatedAt: true },
          _count: { id: true },
        }),
        this.prisma.cmsState.findUnique({
          where: { id: 1 },
          select: { version: true },
        }),
      ]);

      return {
        pageMax: pageAgg._max.updatedAt ? new Date(pageAgg._max.updatedAt).getTime() : 0,
        pageCount: Number(pageAgg._count.id ?? 0),
        cardMax: cardAgg._max.updatedAt ? new Date(cardAgg._max.updatedAt).getTime() : 0,
        cardCount: Number(cardAgg._count.id ?? 0),
        taxonomyMax: taxRow?.updatedAt ? new Date(taxRow.updatedAt).getTime() : 0,
        caseMax: caseAgg._max.updatedAt ? new Date(caseAgg._max.updatedAt).getTime() : 0,
        caseCount: Number(caseAgg._count.id ?? 0),
        cmsVersion: cmsState?.version ?? 1,
      };
    });
  }

  async fetchCmsVersion(): Promise<number> {
    return withDbRetry(async () => {
      const row = await this.prisma.cmsState.findUnique({
        where: { id: 1 },
        select: { version: true },
      });
      return row?.version ?? 1;
    });
  }

  async fetchCaseStudies(): Promise<CaseStudyDto[]> {
    return withDbRetry(async () => {
      const cases = await this.prisma.caseStudy.findMany({
        where: { active: true },
        orderBy: { id: 'asc' },
      });

      return cases.map(cs => ({
        id: cs.id,
        title: cs.title,
        slug: cs.slug,
        description: cs.description,
        body: cs.body,
        imageUrl: cs.imageUrl,
        active: cs.active,
      }));
    });
  }
}
