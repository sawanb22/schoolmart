import SolutionPageRenderer from '@/components/cms/SolutionPageRenderer';
import type { CardItem, SolutionPageStyles } from '@/components/cms/SolutionPageRenderer';

export type { CardItem, SolutionPageStyles as TechInfraStyles };

export const TECH_INFRA_PAGE_SLUG = 'tech-infra';

export function slugifyTechInfraTitle(title: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'solution'
  );
}

const TechInfra = ({ slug = 'tech-infra' }: { slug?: string }) => {
  return <SolutionPageRenderer slug={slug} />;
};

export default TechInfra;
