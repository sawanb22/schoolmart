export interface AIIntentRequest {
  readonly queryText: string;
  readonly institutionHint?: string | null;
  readonly categoryHint?: string | null;
}

export interface AIIntentResult {
  readonly intentSummary: string;
  readonly categoryId: string;
  readonly categoryLabel: string;
  readonly institutionId: string;
  readonly institutionLabel: string;
  readonly detectedKeywords: readonly string[];
  readonly scale?: string | null;
  readonly scopeTags: readonly string[];
  readonly confidenceScore: number;
  readonly providerName: string;
  readonly rawLatencyMs: number;
}

// ── Two-Call AI Pipeline Contracts ──────────────────────────────────────────

export interface CatalogItemDto {
  readonly cardSlug?: string;
  readonly slug: string;
  readonly title: string;
  readonly categorySlug: string;
  readonly subcategorySlug?: string | null;
  readonly summary?: string;
}

export interface AIDiscoveryRequest {
  readonly queryText: string;
  readonly institutionHint?: string | null;
  readonly categoryHint?: string | null;
  readonly catalog: readonly CatalogItemDto[];
}

export interface SectionAPersonalisedSummary {
  readonly headline: string;
  readonly narrative: string;
  readonly userTags: readonly string[];
}

export interface AIDiscoveryResult {
  readonly sectionA: SectionAPersonalisedSummary;
  readonly categoryId: string;
  readonly categoryLabel: string;
  readonly institutionId: string;
  readonly institutionLabel: string;
  readonly scale?: string | null;
  readonly scopeTags: readonly string[];
  readonly selectedPageSlugs: readonly string[];
  readonly selectedCardSlugs?: readonly string[];
  readonly complementaryCategories: readonly string[];
  readonly confidenceScore: number;
  readonly providerName: string;
  readonly rawLatencyMs: number;
}

export interface RawPageSnippet {
  readonly slug: string;
  readonly cardSlug?: string;
  readonly title: string;
  readonly heroTitle?: string | null;
  readonly heroSubtitle?: string | null;
  readonly heroImage?: string | null;
  readonly contentSnippets: readonly string[];
}

export interface AIExtractCardsRequest {
  readonly userRequirement: string;
  readonly institutionLabel?: string;
  readonly pages: readonly RawPageSnippet[];
}

export interface ExtractedCardItem {
  readonly slug: string;
  readonly cardSlug?: string;
  readonly title: string;
  readonly summary: string;
  readonly inclusions: readonly string[];
  readonly whyRelevant: string;
}

export interface AIExtractedCardsResult {
  readonly cards: readonly ExtractedCardItem[];
  readonly providerName: string;
  readonly rawLatencyMs: number;
}

export interface IAIProvider {
  readonly name: string;
  isAvailable(): boolean;
  extractIntent(request: AIIntentRequest): Promise<AIIntentResult>;
  discoverSolutions?(request: AIDiscoveryRequest): Promise<AIDiscoveryResult>;
  extractPageCards?(request: AIExtractCardsRequest): Promise<AIExtractedCardsResult>;
}
