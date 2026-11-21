import { SolutionCardDto } from './solutions-card.types';

export interface SearchRequestDto {
  queryText?: string;
  institutionHint?: string | null;
  categoryHint?: string | null;
}

export interface RequirementSummaryDto {
  intentSummary: string;
  institutionId: string;
  institutionLabel: string;
  categoryId: string;
  categoryLabel: string;
  scale?: string | null;
  scopeTags: string[];
  // Section A: Personalised requirement summary
  headline?: string;
  narrative?: string;
  userTags?: string[];
}

export interface CuratedSolutionDto {
  cardSlug: string;
  targetUrl: string;
  title: string;
  summary: string;
  inclusions: readonly string[];
  badge?: string | null;
  imageUrl?: string | null;
  categorySlug: string;
  whyRelevant: string;
  score: number;
}

export interface ComplementarySolutionDto {
  cardSlug: string;
  targetUrl: string;
  title: string;
  badge?: string | null;
  imageUrl?: string | null;
  categorySlug: string;
  description?: string;
}

export interface ProposalCaseStudyDto {
  title: string;
  slug: string;
  imageUrl?: string | null;
  badge?: string; // "COMPLETED PROJECT" | "CONCEPTUAL DESIGN"
  description?: string;
}

export interface ProposalResponseDto {
  success: boolean;
  traceId: string;
  executionTimeMs: number;
  unmatchedFallback: boolean;
  provider: string;
  confidenceScore: number;
  requirementSummary: RequirementSummaryDto;
  curatedSolutions: CuratedSolutionDto[];
  complementaryInfra: ComplementarySolutionDto[];
  caseStudies: ProposalCaseStudyDto[];
}
