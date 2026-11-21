import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/api/client';
import NotFound from '@/pages/not-found';
import { ArticleDetailSkeleton } from '@/components/ui/page-skeleton';
import ServiceDetailPage from '@/components/cms/ServiceDetailPage';
import UniversalArticleDetail from '@/components/cms/UniversalArticleDetail';

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
  const [loading, setLoading] = useState(true);
  const [parentPage, setParentPage] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!hubSlug || !itemSlug || RESERVED_PREFIXES.has(hubSlug.toLowerCase())) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchParent = async () => {
      try {
        const { data } = await api.get(`/pages/${hubSlug}`);
        if (!isMounted) return;
        if (!data || !data.published) {
          setNotFound(true);
        } else {
          setParentPage(data);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchParent();
    return () => {
      isMounted = false;
    };
  }, [hubSlug, itemSlug]);

  if (loading) {
    return <ArticleDetailSkeleton />;
  }

  if (notFound || !parentPage) {
    return <NotFound />;
  }

  // Determine whether this hub prefers ServiceDetailPage or UniversalArticleDetail
  const template = parentPage.template || '';
  const isServiceLayout =
    template === 'solution-hub' ||
    template === 'service-suite' ||
    template === 'sports-infra' ||
    template === 'tech-infra' ||
    template === 'labs' ||
    template === 'libraries';

  if (isServiceLayout) {
    return (
      <ServiceDetailPage
        categorySlug={hubSlug}
        categoryTitle={parentPage.title || hubSlug}
      />
    );
  }

  return (
    <UniversalArticleDetail
      hubSlug={hubSlug!}
      hubTitle={parentPage.title || hubSlug!}
    />
  );
}
