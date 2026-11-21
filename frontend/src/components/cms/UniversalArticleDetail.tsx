import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/api/client';
import { usePageData } from '@/hooks/usePageData';
import GenericPageRenderer, { type GenericPageData } from '@/components/cms/GenericPageRenderer';

export interface UniversalArticleDetailProps {
  hubSlug: string;
  hubTitle: string;
  defaultCtaHref?: string;
  defaultCtaLabel?: string;
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

  // 1. Check if a dedicated standalone page exists in the database
  const [standalonePage, setStandalonePage] = useState<any>(null);
  const [checkingStandalone, setCheckingStandalone] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkDedicatedPage = async () => {
      try {
        // Try slug: `${hubSlug}/${normalizedSlug}` or `${normalizedSlug}`
        const res = await api.get(`/pages/${hubSlug}-${normalizedSlug}`).catch(() => null)
          || await api.get(`/pages/${normalizedSlug}`).catch(() => null);

        if (isMounted && res?.data && res.data.published) {
          setStandalonePage(res.data);
        }
      } catch {
        // Fallback to hub card data
      } finally {
        if (isMounted) setCheckingStandalone(false);
      }
    };

    if (normalizedSlug) {
      checkDedicatedPage();
    } else {
      setCheckingStandalone(false);
    }

    return () => {
      isMounted = false;
    };
  }, [hubSlug, normalizedSlug]);

  // 2. Fetch the hub's data
  const { data: hubData, loading: hubLoading } = usePageData<any>(hubSlug);

  const backLink = {
    label: `Back to ${hubTitle}`,
    href: `/${hubSlug}`,
  };

  // If standalone page exists in DB, render it
  if (standalonePage) {
    let parsedData: GenericPageData = {};
    try {
      parsedData = typeof standalonePage.pageData === 'string'
        ? JSON.parse(standalonePage.pageData)
        : (standalonePage.pageData || {});
    } catch {
      parsedData = {};
    }
    return (
      <GenericPageRenderer
        page={{
          id: standalonePage.id,
          title: standalonePage.title,
          slug: standalonePage.slug,
          template: standalonePage.template || 'article',
        }}
        pageData={parsedData}
        backLink={backLink}
      />
    );
  }

  // Loading skeleton while checking
  if ((hubLoading || checkingStandalone) && !standalonePage) {
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

  // 3. Resolve article from hub cards or featured
  const cards: any[] = Array.isArray(hubData?.cards) ? hubData.cards.filter(Boolean) : [];
  const moreCards: any[] = Array.isArray(hubData?.moreCards) ? hubData.moreCards.filter(Boolean) : [];
  const featured = hubData?.featured && typeof hubData.featured === 'object' ? hubData.featured : null;

  const allArticles: any[] = [
    ...(featured && featured.title ? [featured] : []),
    ...cards,
    ...moreCards,
  ];

  const resolvedArticle = allArticles.find((item: any) => {
    if (!item || !item.title) return false;
    const s = (item.slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    const t = slugify(item.title || '');
    const h = (item.href || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    const hLeaf = h.split('/').pop() || '';
    return (
      s === normalizedSlug ||
      t === normalizedSlug ||
      h === normalizedSlug ||
      hLeaf === normalizedSlug ||
      (h && (h.endsWith('/' + normalizedSlug) || h === normalizedSlug))
    );
  });

  if (!resolvedArticle) {
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

  const category =
    resolvedArticle.category ||
    resolvedArticle.eyebrow ||
    (Array.isArray(resolvedArticle.categories) ? resolvedArticle.categories[0] : null) ||
    hubTitle;

  let bodyContent = (resolvedArticle.useCustomDetail && resolvedArticle.detailContent?.trim())
    ? resolvedArticle.detailContent
    : (resolvedArticle.body || resolvedArticle.content || '');
  if (!bodyContent && resolvedArticle.methodology) {
    bodyContent = resolvedArticle.methodology;
    if (resolvedArticle.description && resolvedArticle.description.trim() !== resolvedArticle.methodology.trim()) {
      bodyContent = `<p class="lead text-base sm:text-lg text-slate-600 mb-6 font-medium">${resolvedArticle.description}</p>${bodyContent}`;
    }
  } else if (!bodyContent && resolvedArticle.description) {
    bodyContent = resolvedArticle.description;
  }

  // Gracefully adapt structured deliverables if present in cloud DB
  if (Array.isArray(resolvedArticle.deliverables) && resolvedArticle.deliverables.length > 0) {
    const deliverablesHtml = `
      <div class="mt-8 pt-6 border-t border-slate-200">
        <h3 class="text-xl font-bold text-slate-900 mb-4">${resolvedArticle.deliverablesHeading || 'Key Milestones & Deliverables'}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
          ${resolvedArticle.deliverables.map((d: any, idx: number) => `
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-xs font-bold text-cm-blue uppercase tracking-wider block mb-1">
                ${d.phaseLabel || `Phase ${String(idx + 1).padStart(2, '0')}`}
              </span>
              <h4 class="font-bold text-slate-900 text-sm mb-1">${d.title || ''}</h4>
              <p class="text-xs text-slate-600 leading-relaxed">${d.desc || ''}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    bodyContent = `${bodyContent}${deliverablesHtml}`;
  }

  const pageData: GenericPageData = {
    heroTitle: resolvedArticle.title,
    category,
    featuredImage: resolvedArticle.image || featured?.image || '',
    beforeImages: Array.isArray(resolvedArticle.beforeImages) ? resolvedArticle.beforeImages.filter(Boolean) : [],
    afterImages: Array.isArray(resolvedArticle.afterImages) ? resolvedArticle.afterImages.filter(Boolean) : [],
    body: bodyContent,
    ctaTitle:
      resolvedArticle.ctaTitle ||
      hubData?.ctaTitle ||
      `Want to bring ${resolvedArticle.title.toLowerCase()} to your campus?`,
    ctaSubtitle:
      resolvedArticle.ctaSubtitle ||
      hubData?.ctaSubtitle ||
      'Talk to our team about tailored advisory, planning, and implementation.',
    ctaButtonLabel:
      resolvedArticle.ctaButtonLabel ||
      hubData?.ctaButtonLabel ||
      defaultCtaLabel,
    ctaHref:
      resolvedArticle.ctaButtonHref ||
      resolvedArticle.ctaHref ||
      hubData?.ctaButtonHref ||
      hubData?.ctaHref ||
      defaultCtaHref,
    hideHero: false,
    hideBody: false,
    hideCta: Boolean(resolvedArticle.hideCta),
  };

  const editSlug = (resolvedArticle.slug || (resolvedArticle.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).replace(/^\/+|\/+$/g, '');
  const adminEditUrl = `/admin/pages?edit=${encodeURIComponent(hubSlug)}&card=${encodeURIComponent(editSlug)}`;
  const adminEditLabel = `Edit in ${hubTitle || 'Hub Page'}`;

  return (
    <GenericPageRenderer
      page={{
        title: resolvedArticle.title,
        slug: normalizedSlug,
        template: 'article',
      }}
      pageData={pageData}
      backLink={backLink}
      adminEditUrl={adminEditUrl}
      adminEditLabel={adminEditLabel}
    />
  );
}
