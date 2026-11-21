import prisma from '../../lib/prisma';
import { PrismaSolutionsRepository } from './prisma-solutions.repository';
import { SolutionsIndexService } from './solutions-index.service';
import { AIProviderFactory } from './ai-providers';
import { IntentScorerService } from './intent-scorer.service';

export * from './types/solutions-card.types';
export * from './types/solutions-search.types';
export * from './taxonomy.validator';
export * from './solutions-repository.interface';
export * from './prisma-solutions.repository';
export * from './in-memory-solutions.repository';
export * from './solutions-index.service';
export * from './page-solutions-extractor';
export * from './ai-providers';
export * from './intent-scorer.service';

export const solutionsRepository = new PrismaSolutionsRepository(prisma);
export const solutionsIndexService = new SolutionsIndexService(solutionsRepository);
export const solutionsAIProvider = AIProviderFactory.create();
export const intentScorerService = new IntentScorerService(solutionsIndexService, solutionsAIProvider);
