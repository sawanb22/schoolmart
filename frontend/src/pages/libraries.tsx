import SolutionPageRenderer from '@/components/cms/SolutionPageRenderer';
import type { CardItem, SolutionPageStyles } from '@/components/cms/SolutionPageRenderer';

export type { CardItem, SolutionPageStyles as LibrariesStyles };

export const LIBRARIES_PAGE_SLUG = 'libraries';

export function slugifyLibraryTitle(title: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'library-range'
  );
}

const Libraries = ({ slug = 'libraries' }: { slug?: string }) => {
  return <SolutionPageRenderer slug={slug} />;
};

export default Libraries;
