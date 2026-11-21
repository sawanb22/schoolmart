import { ISolutionsRepository } from './solutions-repository.interface';
import { SolutionCardDto, SolutionsTaxonomy, DataWatermarks, CaseStudyDto } from './types/solutions-card.types';

export class InMemorySolutionsRepository implements ISolutionsRepository {
  private cards: SolutionCardDto[] = [];
  private publishedSlugs: Set<string> = new Set();
  private taxonomy: SolutionsTaxonomy | null = null;
  private caseStudies: CaseStudyDto[] = [];
  private failNextFetch = false;
  private lastModified = 1000;
  private cmsVersion = 1;

  constructor(
    initialCards: SolutionCardDto[] = [],
    initialSlugs: string[] = [],
    initialTaxonomy?: SolutionsTaxonomy,
    initialCaseStudies: CaseStudyDto[] = [],
    initialCmsVersion = 1
  ) {
    this.cards = [...initialCards];
    this.publishedSlugs = new Set(initialSlugs);
    this.taxonomy = initialTaxonomy || null;
    this.caseStudies = [...initialCaseStudies];
    this.cmsVersion = initialCmsVersion;
  }

  setCmsVersion(version: number): void {
    this.cmsVersion = version;
    this.lastModified++;
  }

  setCards(cards: SolutionCardDto[]): void {
    this.cards = [...cards];
    this.lastModified++;
  }

  setPublishedSlugs(slugs: string[]): void {
    this.publishedSlugs = new Set(slugs);
    this.lastModified++;
  }

  setTaxonomy(taxonomy: SolutionsTaxonomy | null): void {
    this.taxonomy = taxonomy;
    this.lastModified++;
  }

  setCaseStudies(caseStudies: CaseStudyDto[]): void {
    this.caseStudies = [...caseStudies];
    this.lastModified++;
  }

  setFailNextFetch(fail: boolean): void {
    this.failNextFetch = fail;
  }

  async fetchActiveCards(): Promise<SolutionCardDto[]> {
    if (this.failNextFetch) {
      throw new Error('Simulated repository fetch failure');
    }
    return this.cards
      .filter(c => c.active)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.cardSlug.localeCompare(b.cardSlug);
      });
  }

  async fetchPublishedSlugs(): Promise<Set<string>> {
    if (this.failNextFetch) {
      throw new Error('Simulated repository fetch failure');
    }
    return new Set(this.publishedSlugs);
  }

  async fetchTaxonomy(): Promise<SolutionsTaxonomy | null> {
    if (this.failNextFetch) {
      throw new Error('Simulated repository fetch failure');
    }
    return this.taxonomy;
  }

  async fetchDataWatermarks(): Promise<DataWatermarks> {
    if (this.failNextFetch) {
      throw new Error('Simulated repository fetch failure');
    }
    return {
      pageMax: this.lastModified,
      pageCount: this.publishedSlugs.size,
      cardMax: this.lastModified,
      cardCount: this.cards.length,
      taxonomyMax: this.taxonomy ? this.lastModified : 0,
      cmsVersion: this.cmsVersion,
    };
  }

  async fetchCmsVersion(): Promise<number> {
    if (this.failNextFetch) {
      throw new Error('Simulated repository fetch failure');
    }
    return this.cmsVersion;
  }

  async fetchCaseStudies(): Promise<CaseStudyDto[]> {
    if (this.failNextFetch) {
      throw new Error('Simulated repository fetch failure');
    }
    return this.caseStudies.filter(cs => cs.active);
  }
}
