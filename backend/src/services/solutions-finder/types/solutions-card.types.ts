export interface SolutionCardDto {
  readonly id: number;
  readonly cardSlug: string;
  readonly targetSlug: string;
  readonly sectionAnchor?: string | null;
  readonly categorySlug: string;
  readonly subcategorySlug?: string | null;
  readonly secondaryCategorySlugs: readonly string[];
  readonly title: string;
  readonly summary: string;
  readonly inclusions: readonly string[];
  readonly badge?: string | null;
  readonly imageUrl?: string | null;
  readonly keywords: readonly string[];
  readonly institutionTypes: readonly string[];
  readonly relatedCardSlugs: readonly string[];
  readonly priority: number;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TaxonomyCategory {
  readonly id: string; // e.g. "campus-design"
  readonly label: string;
  readonly shortLabel: string;
  readonly letterCode: string; // "A" through "J"
  readonly iconName?: string;
  readonly subcategories?: readonly string[];
}

export interface TaxonomyInstitution {
  readonly id: string; // e.g. "engineering-college"
  readonly label: string;
  readonly shortLabel: string;
}

export interface SolutionsTaxonomy {
  readonly categories: readonly TaxonomyCategory[];
  readonly institutions: readonly TaxonomyInstitution[];
  readonly popularSearchPrompts?: readonly string[];
}

export interface DataWatermarks {
  readonly pageMax: number;
  readonly pageCount: number;
  readonly cardMax: number;
  readonly cardCount: number;
  readonly taxonomyMax: number;
  readonly caseMax?: number;
  readonly caseCount?: number;
}

export interface CaseStudyDto {
  readonly id: number;
  readonly title: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly body?: string | null;
  readonly imageUrl?: string | null;
  readonly active: boolean;
}
