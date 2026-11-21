import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Check, Trash2 } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import PaginationControl from '@/components/common/PaginationControl';
import { usePageData } from '@/hooks/usePageData';
import { useDesignWishlist } from '@/hooks/useDesignWishlist';
import LoginPromptModal from '@/components/login-prompt-modal';
import { MediaImage } from '@/components/ui/media-image';
import { PageCardGridSkeleton } from '@/components/ui/page-skeleton';
import { AI_ML_PAGE_SLUG, slugifyAiMlTitle, type AiMlCard, type AiMlStyles } from './ai-ml.data';

gsap.registerPlugin(ScrollTrigger);

const PAGE_SIZE = 12;

const AIML = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { data, loading } = usePageData(AI_ML_PAGE_SLUG);
  const { isSaved, isPending, add, remove, showLoginPrompt, setShowLoginPrompt } = useDesignWishlist('ai-ml');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(heroRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
      }
      const items = gridRef.current?.children;
      if (items) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, scrollTrigger: { trigger: gridRef.current, start: 'top 85%' } },
        );
      }
    });
    return () => ctx.revert();
  }, [loading]);

  const heroTitle = data.heroTitle || '';
  const heroSubtitle = data.heroSubtitle || '';
  const heroImage = data.heroImage || '';
  const heroButtonLabel = data.heroButtonLabel || '';
  const heroButtonHref = data.heroButtonHref || '/request-quote';
  const heroEyebrow = data.heroEyebrow || '';
  const readMoreLabel = data.readMoreLabel || '';
  const ctaTitle = data.ctaTitle || '';
  const ctaSubtitle = data.ctaSubtitle || '';
  const ctaButtonLabel = data.ctaButtonLabel || '';
  const ctaHref = data.ctaHref || '/contact-us';
  const allCards: AiMlCard[] = Array.isArray(data.cards) ? data.cards : [];

  const styles: AiMlStyles = {
    headingFont: 'playfair',
    bodyFont: 'opensans',
    primaryColor: '#ea580c',
    heroBg: 'amber',
    ctaBg: 'stone',
    heroLayout: 'split-right',
    cardColumns: '3',
    showFeatured: true,
    showFilters: true,
    ...(data.styles || {}),
  };

  // Typography font classes
  const headingFontClass =
    styles.headingFont === 'grotesk'
      ? 'font-grotesk'
      : styles.headingFont === 'poppins'
      ? 'font-poppins'
      : styles.headingFont === 'opensans'
      ? 'font-opensans'
      : styles.headingFont === 'system'
      ? 'font-sans'
      : 'font-playfair';

  const bodyFontClass =
    styles.bodyFont === 'poppins'
      ? 'font-poppins'
      : styles.bodyFont === 'grotesk'
      ? 'font-grotesk'
      : styles.bodyFont === 'system'
      ? 'font-sans'
      : 'font-opensans';

  // Primary accent color
  const primaryColor = styles.primaryColor || '#ea580c';

  // Hero background theme
  const heroBgTheme = styles.heroBg || 'amber';
  const heroBgClass =
    heroBgTheme === 'slate'
      ? 'bg-slate-100/80 border-b border-slate-200/60'
      : heroBgTheme === 'blue'
      ? 'bg-blue-50/70 border-b border-blue-100'
      : heroBgTheme === 'white'
      ? 'bg-white border-b border-stone-200'
      : heroBgTheme === 'stone'
      ? 'bg-stone-900 text-white'
      : heroBgTheme.startsWith('#')
      ? ''
      : 'bg-amber-50/60';

  const isHeroDark = heroBgTheme === 'stone';
  const heroInlineBg = heroBgTheme.startsWith('#') ? { backgroundColor: heroBgTheme } : undefined;

  // CTA background theme
  const ctaBgTheme = styles.ctaBg || 'stone';
  const ctaBgClass =
    ctaBgTheme === 'blue'
      ? 'bg-cm-blue-dark'
      : ctaBgTheme === 'amber'
      ? 'bg-amber-950'
      : ctaBgTheme === 'slate'
      ? 'bg-slate-900'
      : ctaBgTheme.startsWith('#')
      ? ''
      : 'bg-stone-900';

  const ctaInlineBg = ctaBgTheme.startsWith('#') ? { backgroundColor: ctaBgTheme } : undefined;

  // Grid columns class
  const cardGridColsClass =
    styles.cardColumns === '2'
      ? 'sm:grid-cols-2'
      : styles.cardColumns === '4'
      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  // Layout toggles
  const heroLayout = styles.heroLayout || 'split-right';
  const showFeatured = styles.showFeatured !== false;
  const showFilters = styles.showFilters !== false && !data.hideFilters;

  const categoryOptions = useMemo(() => {
    const explicitCats = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
    const cardCats = allCards.flatMap((card) => card.categories ?? []).filter(Boolean);
    const combined = [...explicitCats, ...cardCats];
    const unique = Array.from(new Set(combined)).filter((c) => c !== 'All');
    return ['All', ...unique];
  }, [data.categories, allCards]);
  const filteredCards = useMemo(
    () => (activeCategory === 'All' ? allCards : allCards.filter((card) => (card.categories ?? []).includes(activeCategory))),
    [allCards, activeCategory],
  );

  const {
    page: safePage,
    totalPages,
    paginatedItems: paginatedCards,
    setPage,
  } = usePagination(filteredCards, PAGE_SIZE);

  const featured = showFeatured && safePage === 1 ? paginatedCards[0] : null;
  const rest = showFeatured && safePage === 1 ? paginatedCards.slice(1) : paginatedCards;

  const cardLink = (card: AiMlCard) =>
    card.href?.trim() || `/${AI_ML_PAGE_SLUG}/${card.slug?.trim() || slugifyAiMlTitle(card.title)}`;

  if (loading) {
    return <PageCardGridSkeleton cardCount={3} />;
  }

  return (
    <main className={`min-h-screen bg-white ${bodyFontClass}`}>
      <LoginPromptModal open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />

      {/* Hero Section */}
      {!data.hideHero && (
        <section
          ref={heroRef}
          style={heroInlineBg}
          className={`${heroBgClass} px-4 pb-5 pt-4 sm:px-6 sm:pb-8 sm:pt-7 lg:px-8 transition-colors`}
        >
          {heroLayout === 'centered' ? (
            /* Centered Layout */
            <div className="mx-auto max-w-4xl text-center">
              {heroEyebrow && (
                <span
                  className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: primaryColor }}
                >
                  <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                  {heroEyebrow}
                  <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                </span>
              )}
              {heroTitle && (
                <h1
                  className={`${headingFontClass} text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl ${
                    isHeroDark ? 'text-white' : 'text-stone-900'
                  }`}
                >
                  {heroTitle}
                </h1>
              )}
              {heroSubtitle && (
                <p className={`mt-4 max-w-2xl mx-auto text-sm leading-relaxed sm:text-base ${isHeroDark ? 'text-white/70' : 'text-stone-500'}`}>
                  {heroSubtitle}
                </p>
              )}
              {heroButtonLabel && (
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    to={heroButtonHref}
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                    className="btn-primary inline-flex items-center gap-2 text-white shadow-md hover:brightness-110"
                  >
                    {heroButtonLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
              {heroImage && (
                <div className="mt-8 overflow-hidden rounded-2xl shadow-xl max-w-2xl mx-auto h-60 sm:h-80">
                  <MediaImage
                    src={heroImage}
                    alt={heroTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Split Layouts: split-right or split-left */
            <div
              className={`mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10`}
            >
              <div className={heroLayout === 'split-left' ? 'order-1 lg:order-2' : ''}>
                {heroEyebrow && (
                  <span
                    className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: primaryColor }}
                  >
                    <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                    {heroEyebrow}
                  </span>
                )}
                {heroTitle && (
                  <h1
                    className={`${headingFontClass} max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl ${
                      isHeroDark ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    {heroTitle}
                  </h1>
                )}
                {heroSubtitle && (
                  <p className={`mt-4 max-w-lg text-sm leading-relaxed sm:text-base ${isHeroDark ? 'text-white/70' : 'text-stone-500'}`}>
                    {heroSubtitle}
                  </p>
                )}
                {heroButtonLabel && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={heroButtonHref}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                      className="btn-primary inline-flex items-center gap-2 text-white shadow-md hover:brightness-110"
                    >
                      {heroButtonLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
              {heroImage && (
                <div
                  className={`relative mx-auto hidden aspect-square w-full max-w-sm lg:block ${
                    heroLayout === 'split-left' ? 'order-2 lg:order-1' : ''
                  }`}
                >
                  <div
                    className="absolute right-0 top-4 h-64 w-64 rounded-full opacity-80"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div className="absolute left-2 top-10 h-56 w-72 overflow-hidden rounded-2xl shadow-xl">
                    <MediaImage
                      src={heroImage}
                      alt={heroTitle}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Main Content Section */}
      <section className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Category filter chips */}
          {showFilters && categoryOptions.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    setPage(1);
                  }}
                  style={activeCategory === category ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : undefined}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    activeCategory === category ? 'border-transparent text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {paginatedCards.length === 0 ? (
            <div className="rounded-2xl border border-stone-100 bg-stone-50 py-20 text-center text-stone-500">No modules match that filter.</div>
          ) : (
            <>
              {/* Featured Card Banner (if enabled) */}
              {featured && (
                <Link to={cardLink(featured)} className="group grid grid-cols-1 overflow-hidden rounded-2xl bg-amber-50/70 sm:grid-cols-[1.2fr_0.8fr] border border-amber-100/60">
                  <div className="min-h-[220px] overflow-hidden sm:min-h-full bg-stone-100">
                    {featured.image && (
                      <MediaImage
                        src={featured.image}
                        alt={featured.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-8">
                    <h2 className={`${headingFontClass} text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl`}>{featured.title}</h2>
                    {featured.description && <p className="mt-3 text-sm leading-relaxed text-stone-500">{featured.description}</p>}
                    {readMoreLabel && (
                      <span
                        className="mt-5 inline-flex w-fit items-center gap-2 border-b pb-1 text-sm font-bold"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        {readMoreLabel} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </div>
                </Link>
              )}

              {/* Grid of Modules */}
              {rest.length > 0 && (
                <div ref={gridRef} className={`mt-5 grid grid-cols-1 gap-x-5 gap-y-6 ${cardGridColsClass}`}>
                  {rest.map((card) => {
                    return (
                      <article key={card.title} className="group min-w-0">
                        <Link to={cardLink(card)} className="block">
                          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-100 border border-stone-100">
                            {card.image && (
                              <MediaImage
                                src={card.image}
                                alt={card.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                          </div>
                          <h3 className={`${headingFontClass} mt-3 text-lg font-semibold leading-snug text-stone-900 group-hover:underline`}>{card.title}</h3>
                          {card.description && <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{card.description}</p>}
                        </Link>
                        <div className="mt-3 flex items-center justify-between">
                          {readMoreLabel && (
                            <Link
                              to={cardLink(card)}
                              className="text-xs font-bold inline-flex items-center gap-1 hover:underline"
                              style={{ color: primaryColor }}
                            >
                              {readMoreLabel} <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}

                          {isSaved(card) ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white">
                                <Check className="h-3.5 w-3.5" /> Added
                              </span>
                              <button
                                type="button"
                                onClick={() => remove(card)}
                                disabled={isPending(card)}
                                aria-label={`Remove ${card.title} from wishlist`}
                                className="flex items-center justify-center rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => add(card)}
                              disabled={isPending(card)}
                              className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
                            >
                              <Heart className="h-3.5 w-3.5" /> Wishlist
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls (Max 12 items per page) */}
              <PaginationControl
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                primaryColor={primaryColor}
                className="border-stone-100"
              />
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {!data.hideCta && ctaTitle && (
        <section className="px-4 pb-6 sm:px-6 lg:px-8">
          <div
            style={ctaInlineBg}
            className={`relative mx-auto max-w-5xl overflow-hidden rounded-2xl ${ctaBgClass} p-6 text-center text-white sm:p-8 sm:text-left transition-colors`}
          >
            <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full border border-white/10" />
            <div className="relative flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div>
                <h2 className={`${headingFontClass} text-2xl font-semibold sm:text-3xl`}>{ctaTitle}</h2>
                {ctaSubtitle && <p className="mt-2 max-w-md text-sm text-white/70">{ctaSubtitle}</p>}
              </div>
              {ctaButtonLabel && (
                <Link
                  to={ctaHref}
                  style={{ backgroundColor: primaryColor }}
                  className="shrink-0 rounded-full px-7 py-3 text-sm font-bold text-white transition-all hover:brightness-110 shadow-lg"
                >
                  {ctaButtonLabel}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default AIML;
