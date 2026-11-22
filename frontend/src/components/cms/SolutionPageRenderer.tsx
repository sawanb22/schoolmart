import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { Heart, Check, Trash2, ArrowRight } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import PaginationControl from '@/components/common/PaginationControl';
import { useHubLegacy } from '@/hooks/useHubLegacy';
import { useDesignWishlist } from '@/hooks/useDesignWishlist';
import LoginPromptModal from '@/components/login-prompt-modal';
import { MediaImage } from '@/components/ui/media-image';
import { SportsInfraSkeleton } from '@/components/ui/page-skeleton';
import { SafeRichText } from '@/components/common/RichTextContent';
import { resolveCtaButtonStyles } from '@/lib/ctaStyles';

export interface PartnerLogoItem {
  name: string;
  image: string;
  href?: string;
}

export interface CardItem {
  title: string;
  description?: string;
  image?: string;
  categories?: string[];
  category?: string;
  href?: string;
  slug?: string;
}

export interface SolutionPageStyles {
  headingFont?: 'playfair' | 'grotesk' | 'poppins' | 'opensans' | 'system';
  bodyFont?: 'opensans' | 'poppins' | 'grotesk' | 'system';
  primaryColor?: string;
  heroBg?: string;
  ctaBg?: string;
  ctaBtnBg?: string;
  ctaBtnText?: string;
  heroLayout?: 'split-right' | 'split-left' | 'centered' | 'minimal';
  cardColumns?: '2' | '3' | '4';
  showFilters?: boolean;
}

export interface SolutionPageRendererProps {
  slug?: string;
}

export function slugifySolutionItem(title: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

export interface SolutionCardProps {
  card: CardItem;
  headingFontClass?: string;
  primaryColor?: string;
  cardLinkUrl?: string;
  isSaved?: boolean;
  isPending?: boolean;
  onAddWishlist?: () => void;
  onRemoveWishlist?: () => void;
  hubBadge?: string;
}

export function SolutionCard({
  card,
  headingFontClass = 'font-poppins',
  primaryColor = '#0047ab',
  cardLinkUrl,
  isSaved = false,
  isPending = false,
  onAddWishlist,
  onRemoveWishlist,
  hubBadge,
}: SolutionCardProps) {
  const targetLink = cardLinkUrl || card.href || '#';

  return (
    <div className="group flex flex-col overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-20px_rgba(15,23,42,0.28)]">
      <Link to={targetLink} className="flex flex-1 flex-col">
        <div className="relative overflow-hidden h-[220px] sm:h-[230px] bg-slate-100">
          {card.image && (
            <MediaImage
              src={card.image}
              alt={card.title}
              width={480}
              height={230}
              widths={[480, 960]}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent" />
          {hubBadge && (
            <div className="absolute top-3 left-3 z-10">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/95 text-slate-800 shadow-sm backdrop-blur-xs">
                {hubBadge}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col px-5 pb-2 pt-4">
          <h3 className={`${headingFontClass} text-lg font-semibold text-slate-900 tracking-tight mb-2 group-hover:text-cm-blue transition-colors`}>
            {card.title}
          </h3>
          {card.description && (
            <SafeRichText
              content={card.description}
              context="card"
              className="text-sm text-slate-600 leading-relaxed mb-3 block"
            />
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between px-5 pb-4 pt-3 text-slate-700 border-t border-slate-50">
        {isSaved ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white">
              <Check className="h-3.5 w-3.5" /> Added to wishlist
            </span>
            {onRemoveWishlist && (
              <button
                type="button"
                onClick={onRemoveWishlist}
                disabled={isPending}
                aria-label={`Remove ${card.title} from wishlist`}
                className="flex items-center justify-center rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          onAddWishlist && (
            <button
              type="button"
              onClick={onAddWishlist}
              disabled={isPending}
              style={{ backgroundColor: primaryColor }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <Heart className="h-3.5 w-3.5" /> Add to wishlist
            </button>
          )
        )}
        <Link
          to={targetLink}
          className="inline-flex items-center gap-1 text-xs font-bold text-cm-blue hover:underline ml-auto"
        >
          <span>Explore</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

const PAGE_SIZE = 12;

const SolutionPageRenderer = ({ slug = '' }: SolutionPageRendererProps) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { data, loading } = useHubLegacy(slug);
  const { isSaved, isPending, add, remove, showLoginPrompt, setShowLoginPrompt } = useDesignWishlist(slug);
  const [selectedCategory, setSelectedCategory] = useState('');

  const styles: SolutionPageStyles = {
    headingFont: 'poppins',
    bodyFont: 'opensans',
    primaryColor: '#0047ab',
    heroBg: '#002a6c',
    ctaBg: '#002a6c',
    heroLayout: 'split-right',
    cardColumns: '3',
    showFilters: true,
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

  const heroBgTheme = styles.heroBg || '#002a6c';
  const heroBgClass =
    heroBgTheme === 'amber'
      ? 'bg-amber-500 text-white'
      : heroBgTheme === 'slate'
      ? 'bg-slate-900 text-white'
      : heroBgTheme === 'stone'
      ? 'bg-stone-900 text-white'
      : heroBgTheme === 'white'
      ? 'bg-white text-slate-800 border border-slate-200'
      : heroBgTheme.startsWith('#')
      ? 'text-white'
      : 'bg-cm-blue-dark text-white';

  const isHeroLight = heroBgTheme === 'white';
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

  const heroLayout = styles.heroLayout || 'split-right';
  const cardGridColsClass =
    styles.cardColumns === '2'
      ? 'grid-cols-1 sm:grid-cols-2'
      : styles.cardColumns === '4'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const showFilters = Boolean(styles.showFilters !== false && !data.hideFilters);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(heroRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
      }

      const cards = cardsRef.current?.children;
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 85%',
            },
          }
        );
      }
    });
    return () => ctx.revert();
  }, [loading]);

  const allCards: CardItem[] = Array.isArray(data.cards) ? data.cards : [];
  const cards = allCards.map((card: any) => {
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

  const explicitCategories: string[] = Array.isArray(data.categories)
    ? data.categories.filter((c: string) => Boolean(c) && c !== 'All')
    : [];
  const cardDerivedCategories: string[] = cards
    .flatMap((card) => card.categories ?? [])
    .filter((option) => Boolean(option) && option !== 'All');
  const categoryOptions: string[] = Array.from(
    new Set<string>([...explicitCategories, ...cardDerivedCategories])
  );

  const activeCategory =
    selectedCategory && categoryOptions.includes(selectedCategory)
      ? selectedCategory
      : (categoryOptions[0] || '');

  const filteredCards = activeCategory
    ? cards.filter((card) => card.categories?.includes(activeCategory))
    : cards;

  const {
    page: safePage,
    totalPages,
    paginatedItems: paginatedCards,
    setPage,
  } = usePagination(filteredCards, PAGE_SIZE);

  // Brand & Partner Logos revolving marquee (100% database-driven)
  const partnerLogos: PartnerLogoItem[] = Array.isArray(data.partnerLogos)
    ? data.partnerLogos.filter((item: any) => Boolean(item && typeof item === 'object' && item.image))
    : [];
  const showPartnerLogos = !data.hidePartnerLogos && partnerLogos.length > 0;
  // Ensure the track is wide enough to fill ultra-wide screens (min 24 items per half)
  const tickerMultiplier = partnerLogos.length > 0 ? Math.max(4, Math.ceil(24 / partnerLogos.length)) : 0;
  const tickerHalf = partnerLogos.length > 0 ? Array(tickerMultiplier).fill(partnerLogos).flat() : [];
  const fullTickerTrack = [...tickerHalf, ...tickerHalf];

  const cardLink = (card: CardItem) =>
    card.href?.trim() || `/${slug}/${card.slug?.trim() || slugifySolutionItem(card.title)}`;

  if (loading) {
    return <SportsInfraSkeleton />;
  }

  const showCta = !data.hideCta && (Boolean(data.ctaTitle) || Boolean(data.ctaButtonLabel));

  return (
    <main className={`min-h-screen bg-white ${bodyFontClass} ${showCta ? 'pb-0' : 'pb-16'}`}>
      <LoginPromptModal open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />

      {/* Hero Section - 100% Database Driven */}
      {!data.hideHero && (
        <section
          ref={heroRef}
          style={heroInlineBg}
          className={`${heroBgClass} mx-3 sm:mx-6 lg:mx-8 rounded-[2rem] py-8 md:py-10 overflow-hidden relative shadow-inner transition-colors`}
        >
          {heroLayout === 'centered' ? (
            /* Centered Hero Layout */
            <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
              {data.heroEyebrow && (
                <span
                  className="text-xs font-bold uppercase tracking-widest inline-block mb-2"
                  style={{ color: isHeroLight ? primaryColor : '#fde047' }}
                >
                  {data.heroEyebrow}
                </span>
              )}
              {data.heroTitle && (
                <h1 className={`${headingFontClass} text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight`}>
                  {data.heroTitle}
                </h1>
              )}
              {data.heroSubtitle && (
                <p className={`text-base md:text-lg leading-relaxed max-w-2xl mx-auto ${isHeroLight ? 'text-slate-600' : 'text-white/85'}`}>
                  {data.heroSubtitle}
                </p>
              )}
              {data.heroButtonLabel && (
                <div className="mt-6 flex justify-center">
                  <Link
                    to={data.heroButtonHref || '/contact-us'}
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                    className="btn-primary px-7 py-3 text-sm font-bold text-white shadow-md hover:brightness-110 inline-flex items-center gap-2"
                  >
                    {data.heroButtonLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
              {data.heroImage && (
                <div className="mt-8 max-w-2xl mx-auto overflow-hidden rounded-2xl shadow-xl border-2 border-white/20">
                  <MediaImage
                    src={data.heroImage}
                    alt={data.heroTitle || ''}
                    width={960}
                    height={320}
                    widths={[480, 960, 1600]}
                    sizes="(max-width: 768px) 100vw, 960px"
                    priority
                    fetchPriority="high"
                    loading="eager"
                    className="w-full h-[280px] sm:h-[320px] object-cover"
                  />
                </div>
              )}
            </div>
          ) : heroLayout === 'minimal' ? (
            /* Minimal Text-Only Hero Layout */
            <div className="max-w-6xl mx-auto relative z-10 px-6 sm:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="max-w-3xl">
                  {data.heroEyebrow && (
                    <span
                      className="text-xs font-bold uppercase tracking-widest inline-block mb-2"
                      style={{ color: isHeroLight ? primaryColor : '#fde047' }}
                    >
                      {data.heroEyebrow}
                    </span>
                  )}
                  {data.heroTitle && (
                    <h1 className={`${headingFontClass} text-2xl md:text-4xl font-extrabold mb-3 tracking-tight`}>
                      {data.heroTitle}
                    </h1>
                  )}
                  {data.heroSubtitle && (
                    <p className={`text-sm md:text-base leading-relaxed max-w-2xl ${isHeroLight ? 'text-slate-600' : 'text-white/85'}`}>
                      {data.heroSubtitle}
                    </p>
                  )}
                </div>
                {data.heroButtonLabel && (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link
                      to={data.heroButtonHref || '/contact-us'}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                      className="btn-primary px-6 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      {data.heroButtonLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Split Hero Layout (split-right or split-left) */
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-8 relative z-10 px-4">
              <div className={`lg:w-1/2 text-left ${heroLayout === 'split-left' ? 'order-1 lg:order-2' : ''}`}>
                {data.heroEyebrow && (
                  <span
                    className="text-xs font-bold uppercase tracking-widest inline-block mb-2"
                    style={{ color: isHeroLight ? primaryColor : '#fde047' }}
                  >
                    {data.heroEyebrow}
                  </span>
                )}
                {data.heroTitle && (
                  <h1 className={`${headingFontClass} text-2xl md:text-4xl font-extrabold mb-3 tracking-tight leading-tight`}>
                    {data.heroTitle}
                  </h1>
                )}
                {data.heroSubtitle && (
                  <p className={`text-sm md:text-base leading-relaxed max-w-xl ${isHeroLight ? 'text-slate-600' : 'text-white/85'}`}>
                    {data.heroSubtitle}
                  </p>
                )}
                {data.heroButtonLabel && (
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link
                      to={data.heroButtonHref || '/contact-us'}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                      className="btn-primary px-6 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 inline-flex items-center gap-2"
                    >
                      {data.heroButtonLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
              {data.heroImage && (
                <div className={`lg:w-1/2 relative w-full ${heroLayout === 'split-left' ? 'order-2 lg:order-1' : ''}`}>
                  <MediaImage
                    src={data.heroImage}
                    alt={data.heroTitle || ''}
                    width={960}
                    height={300}
                    widths={[480, 960, 1600]}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    fetchPriority="high"
                    loading="eager"
                    className="rounded-2xl shadow-xl w-full h-[260px] sm:h-[300px] object-cover border-2 border-white/20 relative z-10"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Brand & Partner Logos Revolving Ticker (Direction 3 Capsules) ─── */}
      {showPartnerLogos && (
        <section
          aria-label="Partner and Brand Logos"
          className="relative w-full overflow-hidden border-y border-slate-200/80 bg-slate-50/60 py-3 sm:py-3.5 select-none"
        >
          {/* Edge gradient fade masks for smooth entrance and exit */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 sm:w-24 bg-gradient-to-r from-slate-50 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 sm:w-24 bg-gradient-to-l from-slate-50 to-transparent" />

          <style>{`
            @keyframes cmTickerLoop {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .cm-ticker-track {
              display: flex;
              align-items: center;
              width: max-content;
              will-change: transform;
              animation: cmTickerLoop 30s linear infinite;
            }
            .cm-ticker-track:hover {
              animation-play-state: paused;
            }
            @media (prefers-reduced-motion: reduce) {
              .cm-ticker-track {
                animation: none;
                overflow-x: auto;
              }
            }
          `}</style>

          {/* Clean Frameless Infinite Revolving Brand Logo Track */}
          <div className="cm-ticker-track gap-12 sm:gap-16">
            {fullTickerTrack.map((logo, idx) => {
              const imageNode = (
                <div className="flex items-center justify-center shrink-0 px-2 transition-opacity duration-300 opacity-85 hover:opacity-100">
                  <MediaImage
                    src={logo.image}
                    alt={logo.name || 'Brand logo'}
                    className="h-7 sm:h-8 md:h-9 w-auto max-w-[130px] sm:max-w-[150px] object-contain transition-transform duration-300 hover:scale-105"
                  />
                </div>
              );

              return logo.href ? (
                <a
                  key={`ticker-logo-${idx}`}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={logo.name || 'Brand logo link'}
                  className="cursor-pointer"
                >
                  {imageNode}
                </a>
              ) : (
                <div key={`ticker-logo-${idx}`}>{imageNode}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* Facilities & Categories Layout - 100% Database Driven */}
      {!data.hideCards && (
        <section className={showPartnerLogos ? 'pt-4 pb-10 sm:pt-6 md:pb-14' : 'py-10 md:py-14'}>
          <div className="max-w-6xl mx-auto px-4">
            {data.section1Title && (
              <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <h2 className={`${headingFontClass} text-2xl md:text-3xl font-bold text-cm-blue-dark tracking-tight`}>
                  {data.section1Title}
                </h2>
                <div
                  className="hidden md:block h-1 w-24 rounded-full transition-colors"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            )}

            {/* Mobile / Tablet Horizontal Category Filter Bar (Visible only on < lg) */}
            {showFilters && categoryOptions.length > 0 && (
              <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2">
                {categoryOptions.map((option) => {
                  const isActive = activeCategory === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(option);
                        setPage(1);
                      }}
                      style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                      className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        isActive
                          ? 'text-white shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            <div className={`grid grid-cols-1 ${showFilters && categoryOptions.length > 0 ? 'lg:grid-cols-[240px_minmax(0,1fr)]' : ''} gap-8`}>
              {/* Desktop Sticky Sidebar (Visible only on lg+) */}
              {showFilters && categoryOptions.length > 0 && (
                <aside className="hidden lg:block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm self-start sticky top-24">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-cm-blue-dark mb-5">Categories</h3>
                  <div className="space-y-3">
                    {categoryOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(option);
                          setPage(1);
                        }}
                        style={activeCategory === option ? { backgroundColor: primaryColor } : undefined}
                        className={`w-full text-left rounded-2xl px-4 py-3 transition-all duration-200 cursor-pointer ${
                          activeCategory === option
                            ? 'text-white shadow-lg'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </aside>
              )}

              <div className="min-w-0">
                {paginatedCards.length === 0 ? (
                  <div className="text-center py-16 px-4 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50">
                    <p className="text-base font-semibold text-slate-700">No items found under &ldquo;{activeCategory}&rdquo;</p>
                    <p className="text-sm text-slate-500 mt-1">Assign this category to items in the admin editor to display them here.</p>
                  </div>
                ) : (
                  <>
                    <div ref={cardsRef} className={`grid ${cardGridColsClass} gap-6`}>
                      {paginatedCards.map((card) => {
                        const wishlistCard = { title: card.title, image: card.image };
                        return (
                          <SolutionCard
                            key={card.title}
                            card={card}
                            headingFontClass={headingFontClass}
                            primaryColor={primaryColor}
                            cardLinkUrl={cardLink(card)}
                            isSaved={isSaved(wishlistCard)}
                            isPending={isPending(wishlistCard)}
                            onAddWishlist={() => add(wishlistCard)}
                            onRemoveWishlist={() => remove(wishlistCard)}
                          />
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
                  </>
                )}
              </div>
            </div>
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
                {data.ctaTitle && (
                  <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-black leading-tight`}>
                    {data.ctaTitle}
                  </h2>
                )}
                {data.ctaSubtitle && (
                  <p className="text-sm sm:text-base leading-relaxed opacity-90">
                    {data.ctaSubtitle}
                  </p>
                )}
              </div>
              {data.ctaButtonLabel && (() => {
                const ctaBtnStyles = resolveCtaButtonStyles({
                  ctaBg: ctaBgTheme,
                  ctaBtnBg: (data as any)?.ctaBtnBg || styles.ctaBtnBg,
                  ctaBtnText: (data as any)?.ctaBtnText || styles.ctaBtnText,
                  primaryColor,
                });
                return (
                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link
                      to={data.ctaHref || '/contact-us'}
                      style={ctaBtnStyles}
                      className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-full shadow-lg hover:scale-105 hover:opacity-95 transition-all whitespace-nowrap"
                    >
                      {data.ctaButtonLabel} <ArrowRight className="w-4 h-4" />
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

export default SolutionPageRenderer;
