import SolutionPageRenderer from '@/components/cms/SolutionPageRenderer';
import type { CardItem, SolutionPageStyles } from '@/components/cms/SolutionPageRenderer';

export type { CardItem as Card, SolutionPageStyles as LabsStyles };

export interface LabServiceItem {
  title: string;
  desc: string;
}

export const LABS_PAGE_SLUG = 'labs';

export function slugifyLabTitle(title: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'lab'
  );
}

const Labs = ({ slug = 'labs' }: { slug?: string }) => {
  return <SolutionPageRenderer slug={slug} />;
};

export default Labs;
