import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { isAdminSession } from '@/lib/auth-session';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControl } from '@/components/common/PaginationControl';
import { resolveMediaUrl } from '@/lib/media-url';
import MediaImage from '@/components/ui/media-image';
import RichTextContent from '@/components/common/RichTextContent';
import { normalizeCardHref, isExternalLink } from '@/lib/cms-routing';
import { resolveCtaButtonStyles } from '@/lib/ctaStyles';
import Seo from '@/components/seo/Seo';
import usePageSeo from '@/hooks/usePageSeo';

gsap.registerPlugin(ScrollTrigger);

export interface GenericCardItem {
  title: string;
  description: string;
  image?: string;
  href?: string;
  category?: string;
  categories?: string[];
  readTime?: string;
  active?: boolean;
}

export interface GenericSectionItem {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface GenericPageStyles {
  headingFont?: 'playfair' | 'grotesk' | 'poppins' | 'opensans' | 'inter' | 'dmsans' | 'system' | string;
  bodyFont?: 'opensans' | 'poppins' | 'grotesk' | 'inter' | 'dmsans' | 'system' | string;
  primaryColor?: string;
  heroBg?: 'amber' | 'slate' | 'blue' | 'white' | 'stone' | 'paper' | string;
  ctaBg?: 'stone' | 'blue' | 'amber' | 'slate' | 'white' | string;
  ctaBtnBg?: string;
  ctaBtnText?: string;
  heroLayout?: 'split-right' | 'split-left' | 'centered' | 'minimal';
  cardColumns?: '2' | '3' | '4';
  showFeatured?: boolean;
  showFilters?: boolean;
}

export interface GenericPageData {
  pageTitle?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  featuredImage?: string;
  beforeImages?: string[];
  afterImages?: string[];
  category?: string;
  heroEyebrow?: string;
  heroButtonLabel?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  heroButtonHref?: string;
  readMoreLabel?: string;
  categories?: string[];
  section1Title?: string;
  sectionDescription?: string;
  section2Title?: string;
  section2Description?: string;
  cards?: GenericCardItem[];
  section2Cards?: GenericCardItem[];
  sections?: GenericSectionItem[];
  features?: string[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  ctaBtnBg?: string;
  ctaBtnText?: string;
  bodyHeading?: string;
  body?: string;
  readTime?: string;
  hideHero?: boolean;
  hideBody?: boolean;
  hideCards?: boolean;
  hideCta?: boolean;
  hideFilters?: boolean;
  styles?: GenericPageStyles;
  technicalParameters?: Array<{ label: string; desc: string }>;
  taxonomy?: string[];
}

export interface GenericPageProps {
  page?: {
    id?: number;
    title: string;
    slug: string;
    template?: string | null;
  };
  pageData?: GenericPageData;
  backLink?: {
    label: string;
    href: string;
  };
  adminEditUrl?: string;
  adminEditLabel?: string;
}

function isDarkColor(color?: string): boolean {
  if (!color) return false;
  if (!color.startsWith('#')) return color === 'stone';
  const c = color.substring(1);
  const rgb = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  if (isNaN(rgb)) return false;
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 140;
}

interface BeforeAfterHeroBannerProps {
  beforeImages: string[];
  afterImages: string[];
  defaultImage?: string | null;
  title: string;
}

function BeforeAfterHeroBanner({ beforeImages, afterImages, defaultImage, title }: BeforeAfterHeroBannerProps) {
  const [activeTab, setActiveTab] = useState<'before' | 'after'>(() => {
    return afterImages.length > 0 ? 'after' : 'before';
  });
  const [beforeIndex, setBeforeIndex] = useState(0);
  const [afterIndex, setAfterIndex] = useState(0);

  const activeImages = activeTab === 'before' ? beforeImages : afterImages;
  const currentIndex = activeTab === 'before' ? beforeIndex : afterIndex;
  const setCurrentIndex = activeTab === 'before' ? setBeforeIndex : setAfterIndex;

  const currentRawUrl = activeImages[currentIndex] || defaultImage || '';
  const currentUrl = currentRawUrl ? (resolveMediaUrl(currentRawUrl) || currentRawUrl) : '';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeImages.length);
  };

  return (
    <div className="relative w-full h-72 sm:h-96 md:h-[440px] bg-slate-900 overflow-hidden select-none group">
      {/* Active Photo */}
      {currentUrl ? (
        <img
          key={`${activeTab}-${currentIndex}-${currentUrl}`}
          src={currentUrl}
          alt={`${title} - ${activeTab} renovation state`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
          No image available
        </div>
      )}

      {/* Subtle Top & Bottom Gradient Overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none" />

      {/* Floating Top-Center Toggle Switch */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('before')}
          className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
            activeTab === 'before'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-white/80 hover:text-white'
          }`}
        >
          Before
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('after')}
          className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
            activeTab === 'after'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-white/80 hover:text-white'
          }`}
        >
          After
        </button>
      </div>

      {/* Left / Right Navigation Chevrons if multiple images exist in active set */}
      {activeImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-80 hover:opacity-100 shadow-md"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-80 hover:opacity-100 shadow-md"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom Counter Indicator Pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-mono font-semibold tracking-wider">
            {currentIndex + 1} / {activeImages.length}
          </div>
        </>
      )}

      {/* State Badge (Top Left) */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <span
          className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md text-white shadow ${
            activeTab === 'before' ? 'bg-amber-600/90' : 'bg-emerald-600/90'
          }`}
        >
          {activeTab === 'before' ? 'Original Condition' : 'Modernized State'}
        </span>
      </div>
    </div>
  );
}

/**
 * GenericPageRenderer
 * Dynamic CMS renderer adhering to the AI/ML baseline:
 * Configurable typography, theme, hero layout, card grid, filter chips, and CTA banner.
 * Zero-fallback rule: What the admin saves is strictly what displays; if empty or hidden, do not render.
 */
export default function GenericPageRenderer({ page, pageData = {}, backLink, adminEditUrl, adminEditLabel }: GenericPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const title = pageData.heroTitle || pageData.pageTitle || page?.title || '';
  const subtitle = pageData.heroSubtitle || pageData.sectionDescription || '';
  const category = pageData.heroEyebrow || pageData.category || '';
  const rawFeatured = pageData.featuredImage || pageData.heroImage;
  const featuredImage = rawFeatured ? resolveMediaUrl(rawFeatured) : null;
  const heroBtnLabel = pageData.heroButtonLabel?.trim() || '';
  const heroBtnHref = pageData.heroButtonHref?.trim() || '/contact-us';
  const readMore = pageData.readMoreLabel || 'Learn More';

  const allCards = (Array.isArray(pageData.cards) ? pageData.cards : []).filter(Boolean);
  const section2Cards = (Array.isArray(pageData.section2Cards) ? pageData.section2Cards : []).filter(Boolean);
  const sections = (Array.isArray(pageData.sections) ? pageData.sections : []).filter(Boolean);

  const isArticle =
    page?.template === 'grid'
      ? false
      : page?.template === 'article' || Boolean(pageData.body?.trim());

  const seoProps = usePageSeo(pageData, title || page?.title, subtitle, page?.slug ? `/${page.slug}` : undefined);

  // Styles and Theme Resolution matching AI/ML baseline
  const rawStyles = pageData.styles || {};
  const styles: GenericPageStyles = {
    headingFont: rawStyles.headingFont || 'playfair',
    bodyFont: rawStyles.bodyFont || 'opensans',
    primaryColor: rawStyles.primaryColor || '#ea580c',
    heroBg: rawStyles.heroBg || 'amber',
    ctaBg: rawStyles.ctaBg || 'stone',
    heroLayout: rawStyles.heroLayout || 'split-right',
    cardColumns: rawStyles.cardColumns || '3',
    showFeatured: rawStyles.showFeatured !== undefined ? rawStyles.showFeatured : true,
    showFilters: rawStyles.showFilters !== undefined ? rawStyles.showFilters : true,
  };

  const headingFontClass =
    styles.headingFont === 'grotesk'
      ? 'font-grotesk'
      : styles.headingFont === 'poppins'
      ? 'font-poppins'
      : styles.headingFont === 'opensans'
      ? 'font-opensans'
      : styles.headingFont === 'inter'
      ? 'font-inter'
      : styles.headingFont === 'dmsans'
      ? 'font-dmsans'
      : styles.headingFont === 'system'
      ? 'font-sans'
      : 'font-playfair';

  const bodyFontClass =
    styles.bodyFont === 'poppins'
      ? 'font-poppins'
      : styles.bodyFont === 'grotesk'
      ? 'font-grotesk'
      : styles.bodyFont === 'inter'
      ? 'font-inter'
      : styles.bodyFont === 'dmsans'
      ? 'font-dmsans'
      : styles.bodyFont === 'system'
      ? 'font-sans'
      : 'font-opensans';

  const primaryColor = styles.primaryColor || '#ea580c';

  const heroBgTheme = styles.heroBg || '#fbf9f5';
  const heroBgHex = heroBgTheme.startsWith('#')
    ? heroBgTheme
    : heroBgTheme === 'paper'
    ? '#fbf9f5'
    : heroBgTheme === 'white'
    ? '#ffffff'
    : heroBgTheme === 'amber'
    ? '#fef3c7'
    : heroBgTheme === 'slate'
    ? '#f1f5f9'
    : heroBgTheme === 'blue'
    ? '#eff6ff'
    : heroBgTheme === 'stone'
    ? '#0f172a'
    : '#fbf9f5';

  const isHeroDark = isDarkColor(heroBgHex);
  const heroInlineBg = { backgroundColor: heroBgHex };
  const heroBgClass = isHeroDark ? 'text-white' : 'text-slate-900 border-b border-stone-200/60';

  const ctaBgTheme = styles.ctaBg || '#002a6c';
  const ctaBgHex = ctaBgTheme.startsWith('#')
    ? ctaBgTheme
    : ctaBgTheme === 'stone'
    ? '#0f172a'
    : ctaBgTheme === 'blue'
    ? '#002a6c'
    : ctaBgTheme === 'amber'
    ? '#451a03'
    : ctaBgTheme === 'slate'
    ? '#0f172a'
    : ctaBgTheme === 'white'
    ? '#f8fafc'
    : '#002a6c';

  const isCtaDark = isDarkColor(ctaBgHex);
  const ctaInlineBg = { backgroundColor: ctaBgHex };
  const ctaBgClass = isCtaDark ? 'text-white' : 'text-slate-900 border border-slate-200';

  const cardGridColsClass =
    styles.cardColumns === '2'
      ? 'sm:grid-cols-2'
      : styles.cardColumns === '4'
      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  const heroLayout = styles.heroLayout || 'split-right';
  const showFeatured = styles.showFeatured !== false;
  const showFilters = styles.showFilters !== false && !pageData.hideFilters;

  // Filter chips logic
  const [activeCategory, setActiveCategory] = useState('All');
  const explicitCats = Array.isArray(pageData.categories) ? pageData.categories.filter(Boolean) : [];
  const cardCats = allCards.flatMap((c) =>
    Array.isArray(c.categories) ? c.categories : c.category ? [c.category] : []
  ).filter(Boolean);
  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set([...explicitCats, ...cardCats])).filter((c) => c !== 'All');
    return unique.length > 0 ? ['All', ...unique] : [];
  }, [explicitCats, cardCats]);

  const filteredCards = useMemo(() => {
    if (activeCategory === 'All') return allCards;
    return allCards.filter((card) => {
      const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
      return cats.includes(activeCategory);
    });
  }, [allCards, activeCategory]);

  const featuredCard = showFeatured && activeCategory === 'All' && filteredCards.length > 0 ? filteredCards[0] : null;
  const restCards = featuredCard ? filteredCards.slice(1) : filteredCards;

  const PAGE_SIZE = 12;
  const {
    page: currentPage,
    totalPages,
    paginatedItems: paginatedRestCards,
    setPage,
  } = usePagination(restCards, PAGE_SIZE);

  // When active category changes, reset pagination to page 1
  useEffect(() => {
    setPage(1);
  }, [activeCategory, setPage]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
        );
      }

      if (cardsRef.current?.children && cardsRef.current.children.length > 0) {
        gsap.fromTo(
          cardsRef.current.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, [title]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ARTICLE / DETAIL VIEW LAYOUT
  // ─────────────────────────────────────────────────────────────────────────────
  if (isArticle) {
    const hasShowcase = Boolean(
      (pageData.beforeImages && pageData.beforeImages.length > 0) ||
      (pageData.afterImages && pageData.afterImages.length > 0)
    );
    const showHero = !pageData.hideHero && (Boolean(title) || Boolean(featuredImage) || hasShowcase);
    const showBody = !pageData.hideBody && Boolean(pageData.body?.trim());
    const showCta = !pageData.hideCta && (Boolean(pageData.ctaTitle) || Boolean(pageData.ctaButtonLabel));

    return (
      <main className="min-h-screen bg-slate-50/60 py-8 sm:py-12">
        <Seo {...seoProps} />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
          {backLink && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Link
                to={backLink.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cm-blue hover:text-cm-blue-dark transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> {backLink.label}
              </Link>
              {adminEditUrl && isAdminSession() && (
                <a
                  href={adminEditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition shadow-xs"
                  title="Jump to parent hub editor with this card expanded"
                >
                  <Pencil className="w-3 h-3 text-amber-700" /> {adminEditLabel || 'Edit in Hub'}
                </a>
              )}
            </div>
          )}
          {(showHero || showBody) && (
            <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              {showHero && (
                hasShowcase ? (
                  <BeforeAfterHeroBanner
                    beforeImages={pageData.beforeImages || []}
                    afterImages={pageData.afterImages || []}
                    defaultImage={featuredImage}
                    title={title}
                  />
                ) : (
                  featuredImage && (
                    <MediaImage
                      src={featuredImage}
                      alt={title}
                      className="h-64 sm:h-96 w-full object-cover"
                    />
                  )
                )
              )}

              <div className="p-6 sm:p-12 space-y-6">
                {showHero && (
                  <>
                    {category && (
                      <div className="inline-block rounded-full bg-cm-blue/10 px-3 py-1 text-xs font-semibold text-cm-blue uppercase tracking-wider">
                        {category}
                      </div>
                    )}

                    {title && (
                      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-cm-blue-dark leading-tight">
                        {title}
                      </h1>
                    )}
                  </>
                )}

                {showBody && (
                  <div className="pt-2">
                    <RichTextContent
                      content={pageData.body}
                      className="text-base sm:text-lg text-slate-700 leading-relaxed"
                    />
                  </div>
                )}

                {Array.isArray(pageData.technicalParameters) && pageData.technicalParameters.length > 0 && (
                  <div className="mt-8 border-t border-slate-200/80 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                      Institutional Specifications & Turnkey Standards
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {pageData.technicalParameters.map((param: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-xs">
                          <p className="font-bold text-slate-800 text-sm mb-1">{param.label}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{param.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(pageData.taxonomy) && pageData.taxonomy.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    {pageData.taxonomy.map((tag: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}

          {showCta && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-cm-blue-dark p-6 text-center sm:flex-row sm:p-8 sm:text-left shadow-lg">
              <div>
                {pageData.ctaTitle && (
                  <h3 className="text-lg sm:text-xl font-bold text-white">{pageData.ctaTitle}</h3>
                )}
                {pageData.ctaSubtitle && (
                  <p className="mt-1 text-sm text-white/80">{pageData.ctaSubtitle}</p>
                )}
              </div>
              {pageData.ctaButtonLabel && (
                <Link
                  to={pageData.ctaHref || '/contact-us'}
                  className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-cm-yellow px-6 py-3 text-sm font-bold text-cm-blue-dark hover:bg-yellow-400 transition-colors"
                >
                  {pageData.ctaButtonLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. STANDARD HUB / GRID LAYOUT (AI/ML Baseline Architecture)
  // ─────────────────────────────────────────────────────────────────────────────
  const hasHeroContent = Boolean(title || subtitle || featuredImage);
  const showHero = !pageData.hideHero && hasHeroContent;
  const showCards = !pageData.hideCards && allCards.length > 0;
  const showCta = !pageData.hideCta && (Boolean(pageData.ctaTitle) || Boolean(pageData.ctaButtonLabel));

  return (
    <main ref={containerRef} className={`min-h-screen bg-white ${bodyFontClass} ${showCta ? 'pb-0' : 'pb-16'}`}>
      <Seo {...seoProps} />
      {/* ─── Hero Section ─── */}
      {showHero && (
        <section
          ref={heroRef}
          style={heroInlineBg}
          className={`${heroBgClass} px-4 pb-6 pt-6 sm:px-6 sm:pb-10 sm:pt-9 lg:px-8 transition-colors`}
        >
          {heroLayout === 'centered' ? (
            /* Centered Layout */
            <div className="mx-auto max-w-4xl text-center">
              {category && (
                <span
                  className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: primaryColor }}
                >
                  <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                  {category}
                  <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                </span>
              )}
              {title && (
                <h1
                  className={`${headingFontClass} text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl ${
                    isHeroDark ? 'text-white' : 'text-stone-900'
                  }`}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p
                  className={`mt-4 max-w-2xl mx-auto text-sm leading-relaxed sm:text-base ${
                    isHeroDark ? 'text-white/70' : 'text-stone-500'
                  }`}
                >
                  {subtitle}
                </p>
              )}
              {heroBtnLabel && (
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    to={heroBtnHref}
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                    className="btn-primary inline-flex items-center gap-2 text-white shadow-md hover:brightness-110"
                  >
                    {heroBtnLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
              {featuredImage && (
                <div className="mt-8 overflow-hidden rounded-2xl shadow-xl max-w-2xl mx-auto h-60 sm:h-80">
                  <MediaImage src={featuredImage} alt={title} className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          ) : heroLayout === 'minimal' ? (
            /* Minimal Text-Only Layout */
            <div className="mx-auto max-w-6xl py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="max-w-3xl">
                  {category && (
                    <span
                      className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                      style={{ color: primaryColor }}
                    >
                      <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                      {category}
                    </span>
                  )}
                  {title && (
                    <h1
                      className={`${headingFontClass} text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl ${
                        isHeroDark ? 'text-white' : 'text-stone-900'
                      }`}
                    >
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p
                      className={`mt-3 max-w-2xl text-sm leading-relaxed sm:text-base ${
                        isHeroDark ? 'text-white/70' : 'text-stone-500'
                      }`}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                {heroBtnLabel && (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link
                      to={heroBtnHref}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                      className="btn-primary inline-flex items-center gap-2 text-white shadow-md hover:brightness-110 whitespace-nowrap"
                    >
                      {heroBtnLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Split Layouts: split-right or split-left */
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
              <div className={heroLayout === 'split-left' ? 'order-1 lg:order-2' : ''}>
                {category && (
                  <span
                    className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: primaryColor }}
                  >
                    <span className="h-[2px] w-6" style={{ backgroundColor: primaryColor }} />
                    {category}
                  </span>
                )}
                {title && (
                  <h1
                    className={`${headingFontClass} max-w-xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl ${
                      isHeroDark ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p
                    className={`mt-4 max-w-lg text-sm leading-relaxed sm:text-base ${
                      isHeroDark ? 'text-white/70' : 'text-stone-500'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
                {heroBtnLabel && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={heroBtnHref}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                      className="btn-primary inline-flex items-center gap-2 text-white shadow-md hover:brightness-110"
                    >
                      {heroBtnLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>

              {featuredImage && (
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
                    <MediaImage src={featuredImage} alt={title} className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Primary Cards Grid & Modules Section ─── */}
      {showCards && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
          {(pageData.section1Title || (category && !showHero)) && (
            <div className="mb-6">
              {category && !showHero && (
                <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: primaryColor }}>
                  {category}
                </span>
              )}
              {pageData.section1Title && (
                <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-bold text-slate-900 mt-1`}>
                  {pageData.section1Title}
                </h2>
              )}
            </div>
          )}

          {/* Category Filter Chips */}
          {showFilters && categoryOptions.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={activeCategory === cat ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : undefined}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'border-transparent text-white'
                      : 'border-stone-200 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Featured Card Banner (if enabled) */}
          {featuredCard && (() => {
            const href = normalizeCardHref(featuredCard.href);
            const isExternal = isExternalLink(href);
            const CardWrapper = ({ children }: { children: React.ReactNode }) =>
              isExternal ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid grid-cols-1 overflow-hidden rounded-2xl bg-amber-50/70 sm:grid-cols-[1.2fr_0.8fr] border border-amber-100/60 shadow-xs hover:shadow-md transition-all mb-6"
                >
                  {children}
                </a>
              ) : href && href !== '#' && href !== '/' ? (
                <Link
                  to={href}
                  className="group grid grid-cols-1 overflow-hidden rounded-2xl bg-amber-50/70 sm:grid-cols-[1.2fr_0.8fr] border border-amber-100/60 shadow-xs hover:shadow-md transition-all mb-6"
                >
                  {children}
                </Link>
              ) : (
                <div className="group grid grid-cols-1 overflow-hidden rounded-2xl bg-amber-50/70 sm:grid-cols-[1.2fr_0.8fr] border border-amber-100/60 shadow-xs mb-6">
                  {children}
                </div>
              );

            return (
              <CardWrapper>
                <div className="min-h-[220px] overflow-hidden sm:min-h-full bg-stone-100">
                  {featuredCard.image && (
                    <img
                      src={resolveMediaUrl(featuredCard.image)}
                      alt={featuredCard.title}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <h2 className={`${headingFontClass} text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl`}>
                    {featuredCard.title}
                  </h2>
                  {featuredCard.description && (
                    <RichTextContent
                      content={featuredCard.description}
                      className="mt-3 text-sm leading-relaxed text-stone-600"
                    />
                  )}
                  {readMore && (
                    <span
                      className="mt-5 inline-flex w-fit items-center gap-2 border-b pb-1 text-sm font-bold"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {readMore} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </div>
              </CardWrapper>
            );
          })()}

          {/* Cards Grid */}
          {paginatedRestCards.length > 0 && (
            <div ref={cardsRef} className={`grid grid-cols-1 gap-6 ${cardGridColsClass}`}>
              {paginatedRestCards.map((card, i) => {
                if (!card) return null;
                const cardImage = card.image ? resolveMediaUrl(card.image) : null;
                const rawHref = card.href?.trim() || (page?.slug ? `/${page.slug}/${(card as any).slug?.trim() || (card.title ? card.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '')}` : '');
                const href = normalizeCardHref(rawHref || card.href);
                const isExternal = isExternalLink(href);

                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
                  >
                    {cardImage && (
                      <div className="h-48 w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={cardImage}
                          alt={card.title}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className={`${headingFontClass} font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors mb-2`}>
                          {card.title}
                        </h3>
                        {card.description && (
                          <RichTextContent
                            content={card.description}
                            className="text-slate-600 text-sm leading-relaxed mb-4"
                          />
                        )}
                      </div>

                      {isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pt-2 border-t border-slate-100 hover:opacity-80 transition-opacity"
                          style={{ color: primaryColor }}
                        >
                          {readMore} <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      ) : href && href !== '#' && href !== '/' ? (
                        <Link
                          to={href}
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pt-2 border-t border-slate-100 hover:opacity-80 transition-opacity"
                          style={{ color: primaryColor }}
                        >
                          {readMore} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Integrated Pagination (Max 12 cards per page) */}
          {totalPages > 1 && (
            <PaginationControl
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              primaryColor={primaryColor}
              className="mt-10"
            />
          )}
        </section>
      )}

      {/* ─── Structured Process / Sections (if provided) ─── */}
      {sections.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm">
            <div className="max-w-xl mb-8">
              {pageData.section2Title && (
                <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-black text-slate-900 mt-1`}>
                  {pageData.section2Title}
                </h2>
              )}
              {pageData.section2Description && (
                <p className="text-slate-600 text-sm sm:text-base mt-2">
                  {pageData.section2Description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sections.map((sec, i) => (
                <div key={i} className="border-t-2 pt-5 space-y-2" style={{ borderColor: primaryColor }}>
                  <span className="text-3xl font-black opacity-30" style={{ color: primaryColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{sec.heading}</h3>
                  <RichTextContent
                    content={sec.body}
                    className="text-slate-600 text-sm leading-relaxed"
                  />
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="pt-2 space-y-1">
                      {sec.bullets.map((b, bi) => (
                        <li key={bi} className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Section 2 Cards (if available) ─── */}
      {section2Cards.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          {pageData.section2Title && (
            <div className="mb-6">
              <h2 className={`${headingFontClass} text-2xl font-black text-slate-900`}>
                {pageData.section2Title}
              </h2>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {section2Cards.filter(Boolean).map((card, i) => {
              if (!card) return null;
              const href = normalizeCardHref(card.href);
              const isExternal = isExternalLink(href);
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">{card.title}</h3>
                    <RichTextContent
                      content={card.description}
                      className="text-slate-600 text-sm leading-relaxed"
                    />
                  </div>
                  {isExternal ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 mt-4 hover:opacity-80 transition-opacity"
                      style={{ color: primaryColor }}
                    >
                      {readMore} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  ) : href && href !== '#' && href !== '/' ? (
                    <Link
                      to={href}
                      className="font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 mt-4 hover:opacity-80 transition-opacity"
                      style={{ color: primaryColor }}
                    >
                      {readMore} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Call to Action Section ─── */}
      {showCta && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 mb-10">
          <div
            style={ctaInlineBg}
            className={`rounded-[2rem] p-8 sm:p-12 shadow-xl relative overflow-hidden transition-colors ${ctaBgClass}`}
          >
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2 text-left max-w-2xl">
                {pageData.ctaTitle && (
                  <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-black leading-tight`}>
                    {pageData.ctaTitle}
                  </h2>
                )}
                {pageData.ctaSubtitle && (
                  <p className="text-sm sm:text-base leading-relaxed opacity-90">
                    {pageData.ctaSubtitle}
                  </p>
                )}
              </div>
              {pageData.ctaButtonLabel && (() => {
                const ctaBtnStyles = resolveCtaButtonStyles({
                  ctaBg: ctaBgHex,
                  ctaBtnBg: pageData.ctaBtnBg || styles.ctaBtnBg,
                  ctaBtnText: pageData.ctaBtnText || styles.ctaBtnText,
                  primaryColor,
                });
                return (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link
                      to={pageData.ctaHref || '/contact-us'}
                      style={ctaBtnStyles}
                      className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-full shadow-lg hover:scale-105 hover:opacity-95 transition-all whitespace-nowrap"
                    >
                      {pageData.ctaButtonLabel} <ArrowRight className="w-4 h-4" />
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
}
