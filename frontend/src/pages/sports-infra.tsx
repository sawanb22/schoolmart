import SolutionPageRenderer from '@/components/cms/SolutionPageRenderer';
import type { CardItem, SolutionPageStyles } from '@/components/cms/SolutionPageRenderer';

export type { CardItem, SolutionPageStyles as SportsInfraStyles };

export const SPORTS_INFRA_PAGE_SLUG = 'sports-infra';

export function slugifySportsInfraTitle(title: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'facility'
  );
}

const SportsInfra = ({ slug = 'sports-infra' }: { slug?: string }) => {
  return <SolutionPageRenderer slug={slug} />;
};

export default SportsInfra;
