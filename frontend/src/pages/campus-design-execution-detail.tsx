import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import { getStepBadge } from '@/components/cms/ServicePageRenderer';
import { usePageData } from '@/hooks/usePageData';
import { MediaImage } from '@/components/ui/media-image';
import RichTextContent from '@/components/common/RichTextContent';
import {
  CDE_PAGE_SLUG,
  slugifyStepTitle,
  type CampusDesignExecutionCard,
  type CampusDesignExecutionDeliverable,
  type CampusDesignExecutionPageData,
} from './campus-design-execution.data';

const CampusDesignExecutionDetail = () => {
  const { stepSlug } = useParams();
  const { data, loading } = usePageData<CampusDesignExecutionPageData>(CDE_PAGE_SLUG);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50/50 py-8 sm:py-12 animate-pulse">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-8 h-5 w-48 rounded bg-stone-200" />
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="h-56 w-full bg-stone-200 sm:h-72" />
            <div className="p-6 sm:p-10 space-y-6">
              <div className="space-y-3">
                <div className="h-5 w-28 rounded-full bg-stone-200" />
                <div className="h-8 w-3/4 rounded-lg bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-200" />
                <div className="h-4 w-5/6 rounded bg-stone-200" />
              </div>
            </div>
          </div>
        </article>
      </main>
    );
  }

  const cards: CampusDesignExecutionCard[] = Array.isArray(data?.cards)
    ? data.cards
    : [];

  const card = cards.find(
    (item: CampusDesignExecutionCard) =>
      (item.slug && item.slug.trim() === stepSlug) ||
      (item.title && slugifyStepTitle(item.title) === stepSlug) ||
      item.href?.endsWith(`/${stepSlug}`),
  );

  if (!card) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600">That step couldn't be found.</p>
        <Link to={`/${CDE_PAGE_SLUG}`} className="btn-primary">Back to Design &amp; Execution</Link>
      </main>
    );
  }

  const badge = card.tag?.trim() || card.categories?.[0] || '';
  const overview = card.methodology?.trim() || card.longDescription?.trim() || card.description;
  const rawDeliverables: CampusDesignExecutionDeliverable[] = Array.isArray(card.deliverables) ? card.deliverables : [];
  const deliverables = rawDeliverables.filter((item: CampusDesignExecutionDeliverable) => item?.title?.trim() || item?.desc?.trim());

  const styles = data.styles || {};
  const headingFontClass =
    styles.headingFont === 'playfair'
      ? 'font-playfair'
      : styles.headingFont === 'grotesk'
      ? 'font-grotesk'
      : styles.headingFont === 'opensans'
      ? 'font-opensans'
      : styles.headingFont === 'system'
      ? 'font-sans'
      : 'font-poppins';

  const bodyFontClass =
    styles.bodyFont === 'poppins'
      ? 'font-poppins'
      : styles.bodyFont === 'grotesk'
      ? 'font-grotesk'
      : styles.bodyFont === 'system'
      ? 'font-sans'
      : 'font-opensans';


  const methodologyHeading = card.methodologyHeading?.trim() || data.methodologyHeading?.trim() || 'Scope & Methodology';
  const deliverablesHeading = card.deliverablesHeading?.trim() || data.deliverablesHeading?.trim() || 'Key Milestones & Deliverables';

  const showHero = !card.hideHero && !data.hideHero;
  const showMethodology = !card.hideMethodology && !data.hideMethodology && Boolean(overview);
  const showDeliverables = !card.hideDeliverables && !data.hideDeliverables && deliverables.length > 0;
  const hasCardContent = showHero || showMethodology || showDeliverables;

  return (
    <main className={`min-h-screen bg-gray-50/50 py-8 sm:py-12 ${bodyFontClass}`}>
      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link to={`/${CDE_PAGE_SLUG}`} className="mb-8 inline-flex items-center gap-2 font-semibold text-cm-blue">
          <ArrowLeft className="h-4 w-4" /> Back to Design &amp; Execution
        </Link>
        {!hasCardContent ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
            This step content is currently marked as hidden by the administrator.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {showHero && (
              <>
                {card.image && (
                  <MediaImage
                    src={card.image}
                    alt={card.title}
                    className="h-56 w-full object-cover sm:h-72"
                  />
                )}
                <div className="p-6 sm:p-10 pb-0">
                  {(() => {
                    const stepBadge = getStepBadge(card, 0);
                    const StepBadgeIcon = stepBadge.Icon;
                    return (
                      <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-xs ${stepBadge.gradient}`}>
                        <StepBadgeIcon className="h-3.5 w-3.5 drop-shadow-xs" /> {badge || card.title}
                      </div>
                    );
                  })()}
                  <h1 className={`${headingFontClass} mb-4 text-3xl font-bold leading-tight text-cm-blue-dark sm:text-4xl`}>{card.title}</h1>
                  {card.description && <RichTextContent content={card.description} className="text-lg leading-relaxed text-gray-700" />}
                </div>
              </>
            )}
            <div className="p-6 sm:p-10 space-y-6">
              {/* Scope & Methodology */}
              {showMethodology && (
                <div className={showHero ? "pt-6 border-t border-gray-100" : ""}>
                  <h2 className={`${headingFontClass} text-xl font-bold text-cm-blue-dark mb-3`}>{methodologyHeading}</h2>
                  <RichTextContent content={overview} className="text-base leading-relaxed text-gray-600" />
                </div>
              )}

              {/* Key Milestones & Deliverables */}
              {showDeliverables && (
                <div className={showHero || showMethodology ? "pt-6 border-t border-gray-100" : ""}>
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="h-5 w-5 text-orange-600" />
                    <h3 className={`${headingFontClass} text-lg font-bold text-gray-900`}>{deliverablesHeading}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {deliverables.map((item: CampusDesignExecutionDeliverable, idx: number) => (
                      <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                        <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider block mb-1">
                          {item.phaseLabel?.trim() || `Phase ${String(idx + 1).padStart(2, '0')}`}
                        </span>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
                        {item.desc && <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!data.hideCta && (
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-cm-blue-dark to-cm-blue p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <p className="text-sm font-semibold text-white sm:text-base">
              {card.ctaTitle || data.subpageCtaTitle || data.ctaTitle || `Ready to start the ${(card.title || 'project').toLowerCase()} phase?`}
            </p>
            <Link
              to={card.ctaHref || data.subpageCtaHref || data.ctaHref || '/request-quote'}
              className="btn-secondary inline-flex flex-shrink-0 items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              {card.ctaButtonLabel || data.subpageCtaButtonLabel || data.ctaButtonLabel || 'Get a Project Quote'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </article>
    </main>
  );
};

export default CampusDesignExecutionDetail;
