import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Star, Pencil } from 'lucide-react';
import { isAdminSession } from '@/lib/auth-session';
import { useHubItem } from '@/hooks/useHubItem';
import { itemToCard } from '@/lib/item-to-card';
import { MediaImage } from '@/components/ui/media-image';
import RichTextContent from '@/components/common/RichTextContent';
import { ArticleDetailSkeleton } from '@/components/ui/page-skeleton';

export interface ServiceDetailPageProps {
  categorySlug?: string;
  categoryTitle?: string;
  ctaButtonHref?: string;
  ctaButtonLabel?: string;
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ServiceDetailPage({
  categorySlug,
  categoryTitle,
  ctaButtonHref,
  ctaButtonLabel,
}: ServiceDetailPageProps) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const slug = categorySlug || params.categorySlug || '';
  const rawItemSlug = params.itemSlug || Object.values(params).find((p) => p && p !== slug) || '';

  const refIntent = searchParams.get('ref_intent') || '';
  const refInst = searchParams.get('ref_inst') || '';
  const refQty = searchParams.get('ref_qty') || '';
  const refTrace = searchParams.get('ref_trace') || '';

  let normalizedItemSlug = '';
  try {
    normalizedItemSlug = decodeURIComponent(rawItemSlug).trim().toLowerCase();
  } catch {
    normalizedItemSlug = rawItemSlug.trim().toLowerCase();
  }

  const { data: hubItemData, isLoading } = useHubItem(slug, normalizedItemSlug);
  const isAdmin = isAdminSession();

  if (isLoading) {
    return <ArticleDetailSkeleton />;
  }

  if (hubItemData && (hubItemData as any).redirectTo) {
    return <Navigate to={(hubItemData as any).redirectTo as string} replace />;
  }

  const item = hubItemData ? (hubItemData as any).item : null;
  const hub = hubItemData ? ((hubItemData as any).hub || {}) : {};

  if (!item) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600">That module couldn't be found.</p>
        <Link to={'/' + slug} className="btn-primary">
          Back to {categoryTitle || hub?.title || 'Overview'}
        </Link>
      </main>
    );
  }

  const card = itemToCard(item, { includeDetail: true });

  const hubCta = hub?.cta || {};
  const hubCtaHref = hubCta.ctaButtonHref || hubCta.ctaHref || hub?.ctaButtonHref || hub?.ctaHref;
  const hubCtaLabel = hubCta.ctaButtonLabel || hub?.ctaButtonLabel;
  const hubCtaTitle = hubCta.ctaTitle || hub?.subpageCtaTitle || hub?.ctaTitle;
  const hubCtaSubtitle = hubCta.ctaSubtitle || hub?.subpageCtaSubtitle || hub?.ctaSubtitle;

  const rawCtaHref = card?.ctaButtonHref || card?.ctaHref || ctaButtonHref || hubCtaHref || '/contact-us';
  const effectiveCtaHref = rawCtaHref.startsWith('http') || rawCtaHref.startsWith('/') ? rawCtaHref : `/${rawCtaHref}`;
  const effectiveCtaLabel =
    card?.ctaButtonLabel || ctaButtonLabel || hubCtaLabel || (effectiveCtaHref.includes('quote') ? 'Request a Quote' : 'Contact Us');
  const effectiveCtaTitle =
    card?.ctaTitle?.trim() || hubCtaTitle || `Want ${card?.title?.toLowerCase()} on your campus?`;
  const effectiveCtaSubtitle = card?.ctaSubtitle?.trim() || hubCtaSubtitle || '';

  const ctaParams = new URLSearchParams();
  if (refIntent) ctaParams.set('ref_intent', refIntent);
  if (refInst) ctaParams.set('ref_inst', refInst);
  if (refQty) ctaParams.set('ref_qty', refQty);
  if (refTrace) ctaParams.set('ref_trace', refTrace);
  if (card?.title) ctaParams.set('ref_sol', card.title);

  const qs = ctaParams.toString();
  const targetCtaHref = qs ? `${effectiveCtaHref}${effectiveCtaHref.includes('?') ? '&' : '?'}${qs}` : effectiveCtaHref;
  const isExternalCta = effectiveCtaHref.startsWith('http');

  const parentOverviewTitle = categoryTitle || hub?.title || 'Overview';

  return (
    <main className="min-h-screen bg-gray-50/50 py-8 sm:py-12">
      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <Link
            to={'/' + slug}
            className="inline-flex items-center gap-2 font-semibold text-cm-blue hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {parentOverviewTitle}
          </Link>
          {isAdmin && (
            <a
              href={`/admin/pages?edit=${encodeURIComponent(slug)}&card=${encodeURIComponent(card?.slug || slugify(card?.title || ''))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition shadow-xs"
              title="Jump to parent hub editor with this card expanded"
            >
              <Pencil className="w-3 h-3 text-amber-700" /> Edit in {categoryTitle || hub?.title || 'Hub Page'}
            </a>
          )}
        </div>

        {/* AI Solutions Finder Context Notice */}
        {(refIntent || refInst || refQty) && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs sm:text-sm text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-blue-700 block mb-0.5">Matched Institutional Scope</span>
              <span className="font-semibold text-slate-900">{refIntent || card.title}</span>
              {refInst && <span className="text-blue-600 font-medium ml-1.5">({refInst})</span>}
            </div>
            {refQty && (
              <span className="font-black bg-blue-600 text-white px-3 py-1 rounded-full text-xs self-start sm:self-auto shrink-0">
                Scope: {refQty} Units
              </span>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {card.image && (
            <MediaImage
              src={card.image}
              alt={card.title}
              className="h-56 w-full object-cover sm:h-72"
            />
          )}
          <div className="p-6 sm:p-10">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cm-blue">
              <Star className="h-3 w-3" /> {card.categories?.[0] ?? card.category ?? categoryTitle ?? 'Overview'}
            </div>
            <h1 className="mb-6 text-3xl font-bold leading-tight text-cm-blue-dark sm:text-4xl">
              {card.title}
            </h1>
            {((card.useCustomDetail && card.detailContent?.trim()) || card.description) && (
              <RichTextContent
                content={(card.useCustomDetail && card.detailContent?.trim()) ? card.detailContent : card.description}
                className="text-lg leading-relaxed text-gray-700"
              />
            )}
          </div>
        </div>

        {!card.hideCta && (
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-cm-blue-dark p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <div>
              <p className="text-sm font-semibold text-white sm:text-base">
                {effectiveCtaTitle}
              </p>
              {effectiveCtaSubtitle && (
                <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                  {effectiveCtaSubtitle}
                </p>
              )}
            </div>
            {isExternalCta ? (
              <a
                href={targetCtaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-cm-yellow px-6 py-3 text-sm font-bold text-cm-blue-dark transition-colors hover:brightness-95"
              >
                {effectiveCtaLabel} <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link
                to={targetCtaHref}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-cm-yellow px-6 py-3 text-sm font-bold text-cm-blue-dark transition-colors hover:brightness-95"
              >
                {effectiveCtaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </article>
    </main>
  );
}

export { ServiceDetailPage };
