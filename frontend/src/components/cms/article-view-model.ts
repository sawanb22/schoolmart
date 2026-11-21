import type { GenericPageData } from './GenericPageRenderer';

export interface BuildArticleViewModelOptions {
  hubSlug: string;
  hubTitle: string;
  defaultCtaHref?: string;
  defaultCtaLabel?: string;
  normalizedSlug?: string;
}

export interface ArticleViewModelResult {
  pageData: GenericPageData;
  adminEditUrl: string;
  adminEditLabel: string;
  backLink: { label: string; href: string };
}

/**
 * Pure function that transforms a card and its parent hub data into
 * GenericPageData and admin navigation links for article detail rendering.
 *
 * Extracted from UniversalArticleDetail.tsx lines ~174-246.
 */
export function buildArticleViewModel(
  card: any,
  hub: any,
  options: BuildArticleViewModelOptions
): ArticleViewModelResult {
  const safeCard = card || {};
  const hubCta = hub?.cta || {};

  const category =
    safeCard.category ||
    safeCard.eyebrow ||
    (Array.isArray(safeCard.categories) ? safeCard.categories[0] : null) ||
    options.hubTitle;

  let bodyContent = (safeCard.useCustomDetail && safeCard.detailContent?.trim())
    ? safeCard.detailContent
    : (safeCard.body || safeCard.content || '');

  if (!bodyContent && safeCard.methodology) {
    bodyContent = safeCard.methodology;
    if (safeCard.description && safeCard.description.trim() !== safeCard.methodology.trim()) {
      bodyContent = `<p class="lead text-base sm:text-lg text-slate-600 mb-6 font-medium">${safeCard.description}</p>${bodyContent}`;
    }
  } else if (!bodyContent && safeCard.description) {
    bodyContent = safeCard.description;
  }

  // Gracefully adapt structured deliverables if present
  if (Array.isArray(safeCard.deliverables) && safeCard.deliverables.length > 0) {
    const deliverablesHtml = `
      <div class="mt-8 pt-6 border-t border-slate-200">
        <h3 class="text-xl font-bold text-slate-900 mb-4">${safeCard.deliverablesHeading || 'Key Milestones & Deliverables'}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
          ${safeCard.deliverables.map((d: any, idx: number) => `
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

  const hubFeaturedImage = hub?.featured?.image || hub?.heroImage || '';
  const defaultCtaLabel = options.defaultCtaLabel || 'Partner With Us';
  const defaultCtaHref = options.defaultCtaHref || '/contact-us';

  const cardTitle = safeCard.title || '';
  const fallbackCtaTitle = cardTitle
    ? `Want to bring ${cardTitle.toLowerCase()} to your campus?`
    : 'Want to bring this to your campus?';

  const pageData: GenericPageData = {
    heroTitle: cardTitle,
    category,
    featuredImage: safeCard.image || hubFeaturedImage || '',
    beforeImages: Array.isArray(safeCard.beforeImages) ? safeCard.beforeImages.filter(Boolean) : [],
    afterImages: Array.isArray(safeCard.afterImages) ? safeCard.afterImages.filter(Boolean) : [],
    body: bodyContent,
    ctaTitle:
      safeCard.ctaTitle ||
      hub?.ctaTitle ||
      hubCta.ctaTitle ||
      fallbackCtaTitle,
    ctaSubtitle:
      safeCard.ctaSubtitle ||
      hub?.ctaSubtitle ||
      hubCta.ctaSubtitle ||
      'Talk to our team about tailored advisory, planning, and implementation.',
    ctaButtonLabel:
      safeCard.ctaButtonLabel ||
      hub?.ctaButtonLabel ||
      hubCta.ctaButtonLabel ||
      defaultCtaLabel,
    ctaHref:
      safeCard.ctaButtonHref ||
      safeCard.ctaHref ||
      hub?.ctaButtonHref ||
      hub?.ctaHref ||
      hubCta.ctaButtonHref ||
      hubCta.ctaHref ||
      defaultCtaHref,
    hideHero: false,
    hideBody: false,
    hideCta: Boolean(safeCard.hideCta),
  };

  const rawEditSlug = (
    safeCard.slug ||
    (cardTitle || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  ).replace(/^\/+|\/+$/g, '');

  const adminEditUrl = `/admin/pages?edit=${encodeURIComponent(options.hubSlug)}&card=${encodeURIComponent(rawEditSlug)}`;
  const adminEditLabel = `Edit in ${options.hubTitle || 'Hub Page'}`;
  const backLink = {
    label: `Back to ${options.hubTitle}`,
    href: `/${options.hubSlug}`,
  };

  return {
    pageData,
    adminEditUrl,
    adminEditLabel,
    backLink,
  };
}
