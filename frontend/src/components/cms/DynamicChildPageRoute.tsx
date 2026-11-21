import { Navigate, useParams } from 'react-router-dom';
import { useResolvePath } from '@/hooks/useResolvePath';
import NotFound from '@/pages/not-found';
import { ArticleDetailSkeleton } from '@/components/ui/page-skeleton';
import ServiceDetailPage from '@/components/cms/ServiceDetailPage';
import UniversalArticleDetail from '@/components/cms/UniversalArticleDetail';
import GenericPageRenderer, { type GenericPageData } from '@/components/cms/GenericPageRenderer';

// Slugs that are explicitly reserved or have dedicated routing
const RESERVED_PREFIXES = new Set([
  'admin',
  'api',
  'login',
  'register',
  'registration',
  'product',
  'blog',
  'case-studies',
  'completed-projects',
  'find-solutions',
  'my-account',
  'request-quote',
  'wishlist',
  'cart',
]);

export default function DynamicChildPageRoute() {
  const { hubSlug, itemSlug } = useParams<{ hubSlug: string; itemSlug: string }>();

  const isReserved = !hubSlug || !itemSlug || RESERVED_PREFIXES.has(hubSlug.toLowerCase());
  const path = !isReserved ? `/${hubSlug}/${itemSlug}` : '';

  const { data: resolveResult, isLoading } = useResolvePath(path);

  if (isReserved) {
    return <NotFound />;
  }

  if (isLoading) {
    return <ArticleDetailSkeleton />;
  }

  if (resolveResult?.type === 'redirect' && resolveResult.redirectTo) {
    return <Navigate to={resolveResult.redirectTo} replace />;
  }

  if (!resolveResult || resolveResult.type === 'not_found') {
    return <NotFound />;
  }

  if (resolveResult.type === 'page' && resolveResult.page) {
    const page = resolveResult.page;
    let parsedData: GenericPageData = {};
    try {
      parsedData =
        typeof page.pageData === 'string'
          ? JSON.parse(page.pageData)
          : (page.pageData as GenericPageData) || {};
    } catch {
      parsedData = {};
    }
    return (
      <GenericPageRenderer
        page={{
          id: page.id as number | undefined,
          title: (page.title as string) || '',
          slug: (page.slug as string) || (itemSlug || ''),
          template: (page.template as string) || 'article',
        }}
        pageData={parsedData}
        backLink={{
          label: `Back to ${hubSlug}`,
          href: `/${hubSlug}`,
        }}
      />
    );
  }

  if (resolveResult.type === 'item') {
    const hubTemplate = resolveResult.hubTemplate || '';
    const isServiceLayout =
      hubTemplate === 'solution-hub' ||
      hubTemplate === 'service-suite' ||
      hubTemplate === 'sports-infra' ||
      hubTemplate === 'tech-infra' ||
      hubTemplate === 'labs' ||
      hubTemplate === 'libraries';

    if (isServiceLayout) {
      return (
        <ServiceDetailPage
          categorySlug={hubSlug}
          categoryTitle={hubSlug}
        />
      );
    }

    return (
      <UniversalArticleDetail
        hubSlug={hubSlug}
        hubTitle={hubSlug}
      />
    );
  }

  return <NotFound />;
}
