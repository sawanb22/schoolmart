import { Link, Navigate, useParams } from 'react-router-dom';
import { useResolvePath } from '@/hooks/useResolvePath';
import { useHubItem } from '@/hooks/useHubItem';
import { itemToCard } from '@/lib/item-to-card';
import { buildArticleViewModel } from '@/components/cms/article-view-model';
import GenericPageRenderer, { type GenericPageData } from '@/components/cms/GenericPageRenderer';

export interface UniversalArticleDetailProps {
  hubSlug: string;
  hubTitle: string;
  defaultCtaHref?: string;
  defaultCtaLabel?: string;
}

export default function UniversalArticleDetail({
  hubSlug,
  hubTitle,
  defaultCtaHref = '/contact-us',
  defaultCtaLabel = 'Partner With Us',
}: UniversalArticleDetailProps) {
  const params = useParams();
  const rawArticleSlug =
    params.articleSlug ||
    params.trackSlug ||
    params.stepSlug ||
    params.serviceSlug ||
    params.experienceSlug ||
    params.rangeSlug ||
    params.solutionSlug ||
    params.slug ||
    Object.values(params).find((p) => Boolean(p) && p !== hubSlug) ||
    Object.values(params)[0] ||
    '';

  let decodedSlug = rawArticleSlug;
  try {
    decodedSlug = decodeURIComponent(rawArticleSlug);
  } catch {
    decodedSlug = rawArticleSlug;
  }
  const normalizedSlug = decodedSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');

  const path = `/${hubSlug}/${normalizedSlug}`;
  const { data: resolveResult, isLoading: isResolving } = useResolvePath(normalizedSlug ? path : '');

  const itemSlugToQuery =
    resolveResult?.type === 'item' && resolveResult.itemSlug ? resolveResult.itemSlug : '';
  const { data: hubItemData, isLoading: isItemLoading } = useHubItem(hubSlug, itemSlugToQuery);

  const backLink = {
    label: `Back to ${hubTitle}`,
    href: `/${hubSlug}`,
  };

  // 1. Loading state while path is resolving or item is loading
  const isLoading =
    isResolving ||
    (resolveResult?.type === 'item' && Boolean(resolveResult.itemSlug) && isItemLoading);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50/60 py-8 sm:py-12 animate-pulse">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-64 sm:h-96 w-full bg-slate-200" />
            <div className="p-6 sm:p-12 space-y-4">
              <div className="h-6 w-28 rounded-full bg-slate-200" />
              <div className="h-10 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-5/6 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Redirect handling from path resolve
  if (resolveResult?.type === 'redirect' && resolveResult.redirectTo) {
    return <Navigate to={resolveResult.redirectTo} replace />;
  }

  // 3. Standalone dedicated page matched in DB
  if (resolveResult?.type === 'page' && resolveResult.page) {
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
          slug: (page.slug as string) || normalizedSlug,
          template: (page.template as string) || 'article',
        }}
        pageData={parsedData}
        backLink={backLink}
      />
    );
  }

  // 4. Redirect from item endpoint
  if (hubItemData && (hubItemData as any).redirectTo) {
    return <Navigate to={(hubItemData as any).redirectTo as string} replace />;
  }

  // 5. Hub item resolved
  if (resolveResult?.type === 'item' && hubItemData && (hubItemData as any).item) {
    const rawItem = (hubItemData as any).item;
    const hub = (hubItemData as any).hub || {};
    const card = itemToCard(rawItem, { includeDetail: true });

    const viewModel = buildArticleViewModel(card, hub, {
      hubSlug,
      hubTitle,
      defaultCtaHref,
      defaultCtaLabel,
      normalizedSlug,
    });

    return (
      <GenericPageRenderer
        page={{
          title: card.title || '',
          slug: normalizedSlug,
          template: 'article',
        }}
        pageData={viewModel.pageData}
        backLink={viewModel.backLink}
        adminEditUrl={viewModel.adminEditUrl}
        adminEditLabel={viewModel.adminEditLabel}
      />
    );
  }

  // 6. Not found fallback
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-4 bg-slate-50/60">
      <h1 className="text-3xl font-bold text-cm-blue-dark">Article not found</h1>
      <p className="text-gray-600">That guide or article couldn't be found.</p>
      <Link to={`/${hubSlug}`} className="btn-primary">
        Back to {hubTitle}
      </Link>
    </main>
  );
}
