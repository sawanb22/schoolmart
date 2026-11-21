import { PrismaClient } from '@prisma/client';
import { ISolutionsRepository } from './solutions-repository.interface';
import { SolutionCardDto, SolutionsTaxonomy, DataWatermarks, CaseStudyDto } from './types/solutions-card.types';
import { validateTaxonomyPayload } from './taxonomy.validator';
import { PageSolutionsExtractor } from './page-solutions-extractor';

export class PrismaSolutionsRepository implements ISolutionsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetchActiveCards(): Promise<SolutionCardDto[]> {
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
          pageData: true,
          published: true,
          createdAt: true,
          updatedAt: true,
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

    // 2. Extract Dynamic Solution Cards from CMS Pages
    const dynamicCards = PageSolutionsExtractor.extractFromPages(pages, taxonomy);

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
  }

  async fetchPublishedSlugs(): Promise<Set<string>> {
    const pages = await this.prisma.page.findMany({
      where: { published: true },
      select: { slug: true },
    });
    return new Set(pages.map(p => p.slug.trim()));
  }

  async fetchTaxonomy(): Promise<SolutionsTaxonomy | null> {
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
  }

  async fetchDataWatermarks(): Promise<DataWatermarks> {
    const [pageAgg, cardAgg, taxRow, caseAgg] = await Promise.all([
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
    ]);

    return {
      pageMax: pageAgg._max.updatedAt ? new Date(pageAgg._max.updatedAt).getTime() : 0,
      pageCount: Number(pageAgg._count.id ?? 0),
      cardMax: cardAgg._max.updatedAt ? new Date(cardAgg._max.updatedAt).getTime() : 0,
      cardCount: Number(cardAgg._count.id ?? 0),
      taxonomyMax: taxRow?.updatedAt ? new Date(taxRow.updatedAt).getTime() : 0,
      caseMax: caseAgg._max.updatedAt ? new Date(caseAgg._max.updatedAt).getTime() : 0,
      caseCount: Number(caseAgg._count.id ?? 0),
    };
  }

  async fetchCaseStudies(): Promise<CaseStudyDto[]> {
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
  }
}
