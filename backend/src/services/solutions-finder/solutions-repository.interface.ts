import { SolutionCardDto, SolutionsTaxonomy, DataWatermarks, CaseStudyDto } from './types/solutions-card.types';

export interface ISolutionsRepository {
  fetchActiveCards(): Promise<SolutionCardDto[]>;
  fetchPublishedSlugs(): Promise<Set<string>>;
  fetchTaxonomy(): Promise<SolutionsTaxonomy | null>;
  fetchDataWatermarks(): Promise<DataWatermarks>;
  fetchCaseStudies(): Promise<CaseStudyDto[]>;
  fetchCmsVersion?(): Promise<number>;
}
