import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  PenTool,
  HardHat,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Armchair,
  Trophy,
  Cpu,
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import PaginationControl from '@/components/common/PaginationControl';
import { useHubLegacy } from '@/hooks/useHubLegacy';
import MediaImage from '@/components/ui/media-image';
import { CampusDesignExecutionSkeleton } from '@/components/ui/page-skeleton';
import { SafeRichText } from '@/components/common/RichTextContent';
import { normalizeCardHref } from '@/lib/cms-routing';
import { resolveCtaButtonStyles } from '@/lib/ctaStyles';

export interface ServiceCardItem {
  title: string;
  description?: string;
  image?: string;
  categories?: string[];
  category?: string;
  href?: string;
  slug?: string;
  active?: boolean;
}

export interface ServicePageStyles {
  headingFont?: 'playfair' | 'grotesk' | 'poppins' | 'opensans' | 'system';
  bodyFont?: 'opensans' | 'poppins' | 'grotesk' | 'system';
  primaryColor?: string;
  heroBg?: string;
  ctaBg?: string;
  ctaBtnBg?: string;
  ctaBtnText?: string;
  heroLayout?: 'minimal' | 'split-right' | 'split-left' | 'centered';
  cardColumns?: '2' | '3' | '4';
  showFeatured?: boolean;
  showFilters?: boolean;
}

export interface ServicePageRendererProps {
  slug?: string;
}

export function slugifyServiceItem(title: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

export interface StepBadgeConfig {
  Icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shadow: string;
}

export function getStepBadge(card: { title?: string; category?: string; categories?: string[] }, index: number): StepBadgeConfig {
  const title = (card.title || '').toLowerCase();
  const category = ((card.categories || []).join(' ') + ' ' + (card.category || '')).toLowerCase();
  const combined = `${title} ${category}`;

  // Site Survey / Feasibility / Audit
  if (combined.includes('survey') || combined.includes('site') || combined.includes('audit') || combined.includes('feasibility')) {
    return {
      Icon: Compass,
      gradient: 'bg-gradient-to-br from-blue-600 to-cyan-500',
      shadow: 'shadow-blue-500/25',
    };
  }

  // Design / Planning / Architecture / Master Plan
  if (combined.includes('design') || combined.includes('plan') || combined.includes('architect') || combined.includes('layout') || combined.includes('blueprint')) {
    return {
      Icon: PenTool,
      gradient: 'bg-gradient-to-br from-indigo-600 to-purple-500',
      shadow: 'shadow-indigo-500/25',
    };
  }

  // Construction / Build / Civil / Execution
  if (combined.includes('construct') || combined.includes('build') || combined.includes('civil') || combined.includes('execution') || combined.includes('install')) {
    return {
      Icon: HardHat,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      shadow: 'shadow-orange-500/25',
    };
  }

  // Handover / Delivery / Commissioning
  if (combined.includes('handover') || combined.includes('deliver') || combined.includes('commission') || combined.includes('ready')) {
    return {
      Icon: KeyRound,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
    };
  }

  // Safety / Compliance / Standards / Inspection
  if (combined.includes('safety') || combined.includes('compliance') || combined.includes('inspection') || combined.includes('standard') || combined.includes('quality')) {
    return {
      Icon: ShieldCheck,
      gradient: 'bg-gradient-to-br from-rose-500 to-red-600',
      shadow: 'shadow-rose-500/25',
    };
  }

  // Turnkey / Modernization / Smart / Innovation
  if (combined.includes('turnkey') || combined.includes('modern') || combined.includes('smart') || combined.includes('innovat') || combined.includes('transform')) {
    return {
      Icon: Sparkles,
      gradient: 'bg-gradient-to-br from-purple-600 to-fuchsia-600',
      shadow: 'shadow-purple-500/25',
    };
  }

  // Furniture / Interior / Seating
  if (combined.includes('furniture') || combined.includes('interior') || combined.includes('chair') || combined.includes('desk')) {
    return {
      Icon: Armchair,
      gradient: 'bg-gradient-to-br from-amber-600 to-yellow-500',
      shadow: 'shadow-amber-500/25',
    };
  }

  // Sports / Fitness / Turf
  if (combined.includes('sport') || combined.includes('fitness') || combined.includes('court') || combined.includes('turf')) {
    return {
      Icon: Trophy,
      gradient: 'bg-gradient-to-br from-emerald-600 to-green-500',
      shadow: 'shadow-emerald-500/25',
    };
  }

  // AI / Digital / Tech
  if (combined.includes('ai') || combined.includes('digital') || combined.includes('tech') || combined.includes('computing')) {
    return {
      Icon: Cpu,
      gradient: 'bg-gradient-to-br from-sky-600 to-blue-600',
      shadow: 'shadow-sky-500/25',
    };
  }

  // Fallback sequential color & icon palette based on card index
  const FALLBACKS: StepBadgeConfig[] = [
    { Icon: Compass, gradient: 'bg-gradient-to-br from-blue-600 to-cyan-500', shadow: 'shadow-blue-500/25' },
    { Icon: PenTool, gradient: 'bg-gradient-to-br from-indigo-600 to-purple-500', shadow: 'shadow-indigo-500/25' },
    { Icon: HardHat, gradient: 'bg-gradient-to-br from-amber-500 to-orange-600', shadow: 'shadow-orange-500/25' },
    { Icon: KeyRound, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
    { Icon: ShieldCheck, gradient: 'bg-gradient-to-br from-rose-500 to-red-600', shadow: 'shadow-rose-500/25' },
    { Icon: Sparkles, gradient: 'bg-gradient-to-br from-purple-600 to-fuchsia-600', shadow: 'shadow-purple-500/25' },
  ];

  return FALLBACKS[index % FALLBACKS.length];
}

const PAGE_SIZE = 12;

const ServicePageRenderer = ({ slug = '' }: ServicePageRendererProps) => {
  const { data, loading } = useHubLegacy(slug);
  const [activeCategory, setActiveCategory] = useState('All');

  const styles: ServicePageStyles = {
    headingFont: 'poppins',
    bodyFont: 'opensans',
    primaryColor: '#0047ab',
    heroBg: 'white',
    ctaBg: '#002a6c',
    heroLayout: 'minimal',
    cardColumns: '3',
    showFeatured: false,
    showFilters: false,
    ...(data.styles || {}),
  };

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

  const primaryColor = styles.primaryColor || '#0047ab';

  const heroBgTheme = styles.heroBg || 'white';
  const heroBgClass =
    heroBgTheme === 'amber'
      ? 'bg-amber-50/60 border-b border-amber-100'
      : heroBgTheme === 'slate'
      ? 'bg-slate-100/80 border-b border-slate-200/60'
      : heroBgTheme === 'blue'
      ? 'bg-blue-50/70 border-b border-blue-100'
      : heroBgTheme === 'stone'
      ? 'bg-stone-900 text-white'
      : heroBgTheme.startsWith('#')
      ? ''
      : 'bg-white';

  const isHeroDark = heroBgTheme === 'stone' || (heroBgTheme.startsWith('#') && !heroBgTheme.toLowerCase().includes('fff'));
  const heroInlineBg = heroBgTheme.startsWith('#') ? { backgroundColor: heroBgTheme } : undefined;

  const ctaBgTheme = styles.ctaBg || '#002a6c';
  const ctaBgClass =
    ctaBgTheme === 'stone'
      ? 'bg-stone-900 text-white'
      : ctaBgTheme === 'amber'
      ? 'bg-amber-950 text-white'
      : ctaBgTheme === 'slate'
      ? 'bg-slate-900 text-white'
      : ctaBgTheme === 'white'
      ? 'bg-slate-100 text-slate-800 border border-slate-200'
      : ctaBgTheme.startsWith('#')
      ? 'text-white'
      : 'bg-cm-blue-dark text-white';

  const ctaInlineBg = ctaBgTheme.startsWith('#') ? { backgroundColor: ctaBgTheme } : undefined;

  const cardGridColsClass =
    styles.cardColumns === '2'
      ? 'sm:grid-cols-2'
      : styles.cardColumns === '4'
      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  const heroLayout = styles.heroLayout || 'minimal';
  const showFeatured = Boolean(styles.showFeatured);
  const showFilters = Boolean(styles.showFilters) && !data.hideFilters;

  const rawCards: ServiceCardItem[] = useMemo(() => {
    const list: any[] = Array.isArray(data.cards) ? data.cards : [];
    return list.filter((c) => c.active !== false).map((card) => {
      const rawCats = Array.isArray(card.categories)
        ? card.categories.filter(Boolean)
        : card.category
        ? [card.category]
        : [];
      return {
        ...card,
        categories: rawCats,
      };
    });
  }, [data.cards]);

  const categoryOptions = useMemo(() => {
    const fromCards = rawCards.flatMap((card) => card.categories ?? []).filter(Boolean);
    const fromPage = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
    return ['All', ...Array.from(new Set([...fromPage, ...fromCards]))];
  }, [rawCards, data.categories]);

  const filteredCards = useMemo(() => {
    if (activeCategory === 'All') return rawCards;
    return rawCards.filter((card) => (card.categories ?? []).includes(activeCategory));
  }, [rawCards, activeCategory]);

  const {
    page: safePage,
    totalPages,
    paginatedItems: paginatedCards,
    setPage,
  } = usePagination(filteredCards, PAGE_SIZE);

  const featured = showFeatured && safePage === 1 ? paginatedCards[0] : null;
  const gridCards = showFeatured && safePage === 1 ? paginatedCards.slice(1) : paginatedCards;

  const cardLink = (card: ServiceCardItem) => {
    const raw = card.href?.trim() || `/${slug}/${card.slug?.trim() || slugifyServiceItem(card.title)}`;
    return normalizeCardHref(raw);
  };

  if (loading) {
    return <CampusDesignExecutionSkeleton />;
  }

  const heroEyebrow = data.heroEyebrow || '';
  const heroTitle = data.heroTitle || '';
  const heroSubtitle = data.heroSubtitle || '';
  const heroImage = data.heroImage || '';
  const heroButtonLabel = data.heroButtonLabel || '';
  const heroButtonHref = data.heroButtonHref || '/contact-us';
  const section1Title = data.section1Title || '';
  const stepCountLabel = data.stepCountLabel || 'Services';
  const readMoreLabel = data.readMoreLabel || 'Explore Service';
  const ctaTitle = data.ctaTitle || '';
  const ctaSubtitle = data.ctaSubtitle || '';
  const ctaButtonLabel = data.ctaButtonLabel || '';
  const ctaHref = data.ctaHref || '/contact-us';
  const showCta = !data.hideCta && (Boolean(ctaTitle) || Boolean(ctaButtonLabel));

  return (
    <main className={`min-h-screen bg-white ${bodyFontClass} ${showCta ? 'pb-0' : 'pb-16'}`}>
      {/* Hero / Section Header - 100% Database Driven */}
      {!data.hideHero && (
        <section
          style={heroInlineBg}
          className={`${heroBgClass} px-4 pt-8 pb-5 sm:px-6 lg:px-8 transition-colors`}
        >
          {heroLayout === 'centered' ? (
            /* Centered Hero Layout */
            <div className="mx-auto max-w-4xl text-center">
              {heroEyebrow && (
                <span
                  className="text-xs font-bold uppercase tracking-widest inline-block mb-2"
                  style={{ color: primaryColor }}
                >
                  {heroEyebrow}
                </span>
              )}
              {heroTitle && (
                <h1
                  className={`${headingFontClass} mt-1 text-3xl font-extrabold tracking-tight sm:text-5xl ${
                    isHeroDark ? 'text-white' : 'text-cm-blue-dark'
                  }`}
                >
                  {heroTitle}
                </h1>
              )}
              {heroSubtitle && (
                <p
                  className={`mt-3 max-w-2xl mx-auto text-base leading-relaxed ${
                    isHeroDark ? 'text-white/75' : 'text-gray-600'
                  }`}
                >
                  {heroSubtitle}
                </p>
              )}
              {heroButtonLabel && (
                <div className="mt-5 flex justify-center">
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
                <div className="mt-7 overflow-hidden rounded-2xl shadow-xl max-w-2xl mx-auto h-60 sm:h-80">
                  <MediaImage
                    src={heroImage}
                    alt={heroTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          ) : heroLayout === 'split-right' || heroLayout === 'split-left' ? (
            /* Split Hero Layout */
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
              <div className={heroLayout === 'split-left' ? 'order-1 lg:order-2' : ''}>
                {heroEyebrow && (
                  <span
                    className="text-xs font-bold uppercase tracking-widest inline-block mb-2"
                    style={{ color: primaryColor }}
                  >
                    {heroEyebrow}
                  </span>
                )}
                {heroTitle && (
                  <h1
                    className={`${headingFontClass} mt-1 text-3xl font-extrabold tracking-tight sm:text-5xl ${
                      isHeroDark ? 'text-white' : 'text-cm-blue-dark'
                    }`}
                  >
                    {heroTitle}
                  </h1>
                )}
                {heroSubtitle && (
                  <p
                    className={`mt-3 max-w-2xl text-base leading-relaxed ${
                      isHeroDark ? 'text-white/75' : 'text-gray-600'
                    }`}
                  >
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
                <div className={`overflow-hidden rounded-2xl shadow-xl h-64 sm:h-80 ${heroLayout === 'split-left' ? 'order-2 lg:order-1' : ''}`}>
                  <MediaImage
                    src={heroImage}
                    alt={heroTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Minimal Text-Only Hero Layout */
            <div className="mx-auto max-w-6xl py-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="max-w-3xl">
                  {heroEyebrow && (
                    <span
                      className="text-xs font-bold uppercase tracking-widest inline-block mb-2"
                      style={{ color: primaryColor }}
                    >
                      {heroEyebrow}
                    </span>
                  )}
                  {heroTitle && (
                    <h1
                      className={`${headingFontClass} text-2xl font-extrabold tracking-tight sm:text-4xl ${
                        isHeroDark ? 'text-white' : 'text-cm-blue-dark'
                      }`}
                    >
                      {heroTitle}
                    </h1>
                  )}
                  {heroSubtitle && (
                    <p
                      className={`mt-2 max-w-2xl text-sm leading-relaxed sm:text-base ${
                        isHeroDark ? 'text-white/75' : 'text-gray-600'
                      }`}
                    >
                      {heroSubtitle}
                    </p>
                  )}
                </div>
                {heroButtonLabel && (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link
                      to={heroButtonHref}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                      className="btn-primary inline-flex items-center gap-2 text-white shadow-md hover:brightness-110 whitespace-nowrap"
                    >
                      {heroButtonLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Phased Execution Cards Grid - 100% Database Driven */}
      {!data.hideCards && rawCards.length > 0 && (
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
              {section1Title && (
                <h2 className={`${headingFontClass} text-xl font-bold text-cm-blue-dark sm:text-2xl`}>
                  {section1Title}
                </h2>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {filteredCards.length} {stepCountLabel}
              </span>
            </div>

            {/* Responsive Category Filter Bar (Horizontal scroll on mobile, flex wrap on desktop) */}
            {showFilters && categoryOptions.length > 1 && (
              <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2">
                {categoryOptions.map((category) => {
                  const isActive = activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category);
                        setPage(1);
                      }}
                      style={
                        isActive
                          ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' }
                          : undefined
                      }
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Featured Card Banner (when enabled) */}
            {featured && (
              <Link
                to={cardLink(featured)}
                className="group mb-6 grid grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-slate-50/70 shadow-sm transition-all hover:shadow-lg sm:grid-cols-[1.2fr_0.8fr]"
              >
                <div className="min-h-[220px] overflow-hidden bg-slate-100 sm:min-h-full">
                  {featured.image && (
                    <MediaImage
                      src={featured.image}
                      alt={featured.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <h3 className={`${headingFontClass} text-2xl font-bold leading-tight text-cm-blue-dark sm:text-3xl`}>
                    {featured.title}
                  </h3>
                  {featured.description && (
                    <SafeRichText
                      content={featured.description}
                      context="card"
                      className="mt-3 block text-sm leading-relaxed text-gray-600"
                    />
                  )}
                  {readMoreLabel && (
                    <div className="mt-5">
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-bold transition-all group-hover:gap-2.5"
                        style={{ color: primaryColor }}
                      >
                        {readMoreLabel} <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )}

            <div className={`grid grid-cols-1 gap-6 ${cardGridColsClass}`}>
              {gridCards.map((card) => {
                return (
                  <Link
                    key={card.title}
                    to={cardLink(card)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      {card.image && (
                        <MediaImage
                          src={card.image}
                          alt={card.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      {(card.category || card.categories?.[0]) && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {card.category || card.categories?.[0]}
                          </span>
                        </div>
                      )}
                      <h3 className={`${headingFontClass} text-lg font-bold text-cm-blue-dark transition-colors group-hover:text-cm-blue`}>
                        {card.title}
                      </h3>
                      {card.description && (
                        <SafeRichText
                          content={card.description}
                          context="card"
                          className="mt-2 line-clamp-3 block flex-1 text-sm leading-relaxed text-gray-600"
                        />
                      )}
                      {readMoreLabel && (
                        <div className="mt-5 border-t border-gray-50 pt-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-sm font-bold transition-all group-hover:gap-2.5"
                            style={{ color: primaryColor }}
                          >
                            {readMoreLabel} <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination Controls (Max 12 items per page) */}
            <PaginationControl
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
              primaryColor={primaryColor}
              className="border-slate-100 mt-10"
            />
          </div>
        </section>
      )}

      {/* Call to Action - 100% Database Driven Generalized 2-Column Flex Layout */}
      {showCta && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 mb-10">
          <div
            style={ctaInlineBg}
            className={`rounded-[2rem] p-8 sm:p-12 shadow-xl relative overflow-hidden transition-colors ${ctaBgClass}`}
          >
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2 text-left max-w-2xl">
                {ctaTitle && (
                  <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-black leading-tight`}>
                    {ctaTitle}
                  </h2>
                )}
                {ctaSubtitle && (
                  <p className="text-sm sm:text-base leading-relaxed opacity-90">
                    {ctaSubtitle}
                  </p>
                )}
              </div>
              {ctaButtonLabel && (() => {
                const ctaBtnStyles = resolveCtaButtonStyles({
                  ctaBg: ctaBgTheme,
                  ctaBtnBg: (data as any)?.ctaBtnBg || styles.ctaBtnBg,
                  ctaBtnText: (data as any)?.ctaBtnText || styles.ctaBtnText,
                  primaryColor,
                });
                return (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link
                      to={ctaHref}
                      style={ctaBtnStyles}
                      className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-full shadow-lg hover:scale-105 hover:opacity-95 transition-all whitespace-nowrap"
                    >
                      {ctaButtonLabel} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default ServicePageRenderer;
