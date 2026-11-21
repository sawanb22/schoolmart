import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Heart,
  Armchair,
  Microscope,
  Trophy,
  Laptop,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import PaginationControl from '@/components/common/PaginationControl';
import api from '@/api/client';
import LoginPromptModal from '@/components/login-prompt-modal';
import { useWishlist } from '@/contexts/WishlistContext';
import { useDesignWishlist } from '@/hooks/useDesignWishlist';
import { SolutionCard, type CardItem } from '@/components/cms/SolutionPageRenderer';

export interface UnifiedHubItem extends Omit<CardItem, 'categories'> {
  id: string | number;
  hubSlug: string;
  hubTitle: string;
  categories: string[];
  price?: number;
}

export interface HubConfig {
  id: string;
  title: string;
  subcategories: string[];
  totalCount: number;
}

export interface HubCatalogResponse {
  hubs: HubConfig[];
  items: UnifiedHubItem[];
}

export interface ShopProps {
  categorySlug?: string;
  categorySlugs?: string[];
  showAllCategories?: boolean;
  categoryRoutes?: Record<string, string>;
  excludedCategorySlugs?: string[];
  categoryPage?: string;
  hideCategorySidebar?: boolean;
  embedded?: boolean;
  defaultCategorySlug?: string;
  hideAllOption?: boolean;
}

const PAGE_SIZE = 12;

const HUB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  furniture: Armchair,
  labs: Microscope,
  'sports-infra': Trophy,
  'tech-infra': Laptop,
  libraries: BookOpen,
};

let memoryHubCache: Record<string, UnifiedHubItem[]> = {};
let memoryHubsList: HubConfig[] = [];

export default function Shop({
  categoryPage,
  embedded = false,
  hideCategorySidebar = false,
  defaultCategorySlug,
  excludedCategorySlugs = [],
}: ShopProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State Resolution - default to 'furniture'
  const rawUrlHub = searchParams.get('hub') || categoryPage;
  const urlHub = rawUrlHub && rawUrlHub !== 'all' ? rawUrlHub : 'furniture';
  const urlCategory = searchParams.get('category') || defaultCategorySlug || 'all';
  const urlSearch = searchParams.get('search') || '';
  const urlPage = Math.max(1, Number(searchParams.get('page')) || 1);

  const [activeHub, setActiveHub] = useState<string>(urlHub);
  const [activeCategory, setActiveCategory] = useState<string>(urlCategory);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [currentPage, setCurrentPage] = useState<number>(urlPage);
  const [columnCount, setColumnCount] = useState<3 | 4>(3);

  const [hubCache, setHubCache] = useState<Record<string, UnifiedHubItem[]>>(memoryHubCache);
  const [hubsList, setHubsList] = useState<HubConfig[]>(memoryHubsList);
  const [loading, setLoading] = useState<boolean>(!memoryHubCache[urlHub]);
  const [error, setError] = useState<string | null>(null);

  const { isSaved, isPending, add, remove, showLoginPrompt, setShowLoginPrompt } = useDesignWishlist(
    activeHub || 'furniture'
  );
  const { count: wishlistCount } = useWishlist();

  // Sync URL search params helper
  const updateUrlParams = (newParams: Record<string, string | number | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([k, v]) => {
        if (
          v === undefined ||
          v === '' ||
          (k === 'page' && Number(v) <= 1) ||
          (k === 'hub' && v === 'furniture') ||
          (k === 'category' && v === 'all')
        ) {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      return next;
    }, { replace: true });
  };

  // Search input debouncer & URL sync
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedSearch(trimmed);
      setCurrentPage(1);
      updateUrlParams({ search: trimmed, page: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Hub Data on Demand (Option B)
  useEffect(() => {
    let alive = true;

    // Check if this hub is already in client memory
    if (hubCache[activeHub] && hubsList.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get('/pages/hub/catalog', { params: { hub: activeHub } })
      .then(({ data }) => {
        if (!alive) return;
        if (data && Array.isArray(data.items)) {
          const updatedCache = { ...hubCache, [activeHub]: data.items };
          memoryHubCache = updatedCache;
          setHubCache(updatedCache);

          if (Array.isArray(data.hubs) && data.hubs.length > 0) {
            memoryHubsList = data.hubs;
            setHubsList(data.hubs);
          }
        }
      })
      .catch((err) => {
        if (!alive) return;
        console.error('Failed to load hub catalog:', err);
        setError('Unable to load catalog. Please check network connection.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [activeHub]);

  // Hub Switch Handler
  const handleHubSelect = (hubId: string) => {
    setActiveHub(hubId);
    setActiveCategory('all');
    setCurrentPage(1);
    updateUrlParams({ hub: hubId, category: 'all', page: 1 });
  };

  // Subcategory Switch Handler
  const handleCategorySelect = (categoryName: string) => {
    setActiveCategory(categoryName);
    setCurrentPage(1);
    updateUrlParams({ category: categoryName, page: 1 });
  };

  // Active Hub Metadata with excludedCategorySlugs filtered out
  const activeHubMeta = useMemo(() => {
    const raw = hubsList.find((h) => h.id === activeHub) || hubsList[0];
    if (!raw) return null;
    if (!excludedCategorySlugs || excludedCategorySlugs.length === 0) return raw;
    const filteredSubs = raw.subcategories.filter((sub) => {
      const subClean = sub.toLowerCase().trim();
      const subSlug = subClean.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return !excludedCategorySlugs.some((ex) => {
        const exClean = ex.toLowerCase().trim();
        return exClean === subClean || exClean === subSlug;
      });
    });
    return { ...raw, subcategories: filteredSubs };
  }, [hubsList, activeHub, excludedCategorySlugs]);

  // Normalize initial category slug (e.g. 'chairs' -> 'Chairs & Seating')
  useEffect(() => {
    if (!hubsList.length || activeCategory === 'all') return;
    const activeHubData = hubsList.find((h) => h.id === activeHub);
    if (!activeHubData) return;
    const match = activeHubData.subcategories.find(
      (sub) =>
        sub.toLowerCase() === activeCategory.toLowerCase() ||
        sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === activeCategory.toLowerCase()
    );
    if (match && match !== activeCategory) {
      setActiveCategory(match);
    }
  }, [hubsList, activeHub, activeCategory]);

  const currentHubItems = hubCache[activeHub] || [];

  // Filter Items
  const filteredItems = useMemo(() => {
    return currentHubItems.filter((item) => {
      // 1. Excluded categories filter (e.g. hidden from CMS)
      if (excludedCategorySlugs && excludedCategorySlugs.length > 0) {
        const isExcluded = (item.categories || []).some((c) =>
          excludedCategorySlugs.some((ex) => {
            const exClean = ex.toLowerCase().trim();
            const cClean = c.toLowerCase().trim();
            const cSlug = cClean.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            return exClean === cClean || exClean === cSlug;
          })
        );
        if (isExcluded) return false;
      }
      // 2. Subcategory filter
      if (activeCategory !== 'all') {
        const itemCats = (item.categories || []).map((c) => c.toLowerCase());
        const target = activeCategory.toLowerCase();
        if (!itemCats.includes(target) && !itemCats.some((c) => c.includes(target))) {
          return false;
        }
      }
      // 3. Search query filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        const catMatch = (item.categories || []).some((c) => c.toLowerCase().includes(query));
        if (!titleMatch && !descMatch && !catMatch) {
          return false;
        }
      }
      return true;
    });
  }, [currentHubItems, excludedCategorySlugs, activeCategory, debouncedSearch]);

  // Subcategory counts for the active hub's sidebar
  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of currentHubItems) {
      for (const cat of (item.categories || [])) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [currentHubItems]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const Root: 'div' | 'main' = embedded ? 'div' : 'main';

  return (
    <Root className={embedded ? undefined : 'min-h-screen bg-slate-50/60 pb-16'}>
      <LoginPromptModal open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />

      {/* Top Search & Wishlist Bar */}
      <div className={embedded ? 'rounded-2xl border border-gray-100 bg-white' : 'bg-white border-b border-slate-200/80 shadow-2xs'}>
        <div className={embedded ? 'px-4 py-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search solutions, products, apparatus, or specifications..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cm-blue focus:bg-white text-sm transition-all shadow-inner"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {!embedded && (
              <Link
                to="/my-account?tab=wishlist"
                title="View Wishlist"
                className="relative inline-flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors border border-slate-200/80 shadow-2xs"
              >
                <Heart className="w-4 h-4 text-cm-blue" />
                <span className="hidden sm:inline text-xs font-bold text-slate-700">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cm-yellow px-1 text-[10px] font-black text-cm-blue-dark">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className={embedded ? 'py-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
        {/* Horizontal Hub Selection Bar */}
        {!categoryPage && (
          <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {(hubsList.length > 0
                ? hubsList
                : [
                    { id: 'furniture', title: 'Campus Furniture', totalCount: 0, subcategories: [] },
                    { id: 'labs', title: 'Science & Tech Labs', totalCount: 0, subcategories: [] },
                    { id: 'sports-infra', title: 'Sports Infrastructure', totalCount: 0, subcategories: [] },
                    { id: 'tech-infra', title: 'Tech Infrastructure', totalCount: 0, subcategories: [] },
                    { id: 'libraries', title: 'Smart Libraries', totalCount: 0, subcategories: [] },
                  ]
              ).map((hub) => {
                const Icon = HUB_ICONS[hub.id] || Sparkles;
                const isActive = activeHub === hub.id;

                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleHubSelect(hub.id)}
                    className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-cm-blue text-white border-cm-blue shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cm-blue'}`} />
                    <span>{hub.title}</span>
                    {hub.totalCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {hub.totalCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Layout: Sidebar + Solution Cards Grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Dynamic Subcategory Sidebar */}
          {!hideCategorySidebar && (
            <aside className="lg:w-64 shrink-0 space-y-4">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 sticky top-24">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-cm-blue" />
                    <h3 className="font-bold text-cm-blue-dark text-xs uppercase tracking-wider">
                      {activeHubMeta?.title || 'Hub'} Categories
                    </h3>
                  </div>
                  {activeCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('all')}
                      className="text-[11px] font-bold text-slate-400 hover:text-cm-blue transition-colors flex items-center gap-1 cursor-pointer"
                      title="Reset filters"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Dynamic Subcategories of active Hub */}
                <ul className="space-y-1.5 text-xs">
                  {/* "All [Hub Name] Solutions" option */}
                  <li>
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('all')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                        activeCategory === 'all'
                          ? 'bg-cm-blue text-white font-bold shadow-sm'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate">All {activeHubMeta?.title || 'Solutions'}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          activeCategory === 'all'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        }`}
                      >
                        {activeHubMeta?.totalCount || 0}
                      </span>
                    </button>
                  </li>

                  {/* Subcategories list */}
                  {(activeHubMeta?.subcategories || []).map((subcat) => {
                    const isSelected = activeCategory.toLowerCase() === subcat.toLowerCase();
                    const count = subcategoryCounts[subcat] || 0;

                    return (
                      <li key={subcat}>
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(subcat)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? 'bg-cm-blue text-white font-bold shadow-sm'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{subcat}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          )}

          {/* Solution Cards Content Grid */}
          <div className="flex-1 min-w-0">
            {/* Header info */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-cm-blue-dark tracking-tight">
                  {debouncedSearch
                    ? `Search results for "${debouncedSearch}"`
                    : activeCategory !== 'all'
                    ? activeCategory
                    : activeHubMeta?.title || 'Campus Furniture'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {paginatedItems.length} of {totalItems} verified institutional {totalItems === 1 ? 'solution' : 'solutions'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* 3 vs 4 column layout toggle */}
                <div className="hidden sm:inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs">
                  <button
                    type="button"
                    onClick={() => setColumnCount(3)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      columnCount === 3
                        ? 'bg-white text-cm-blue shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="3 columns layout (Default)"
                  >
                    3 Cols
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumnCount(4)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      columnCount === 4
                        ? 'bg-white text-cm-blue shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="4 columns layout"
                  >
                    4 Cols
                  </button>
                </div>

                {categoryPage && (
                  <Link
                    to={`/${categoryPage}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cm-blue hover:underline"
                  >
                    <span>View Full {activeHubMeta?.title} Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {loading ? (
              /* Skeleton Loader */
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  columnCount === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-4'
                } gap-6`}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm p-4 animate-pulse space-y-3"
                  >
                    <div className="aspect-[4/3] bg-slate-100 rounded-2xl" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-red-100 p-8">
                <p className="text-red-600 text-base font-bold">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-cm-blue text-white text-xs font-bold rounded-xl shadow-sm hover:brightness-110 cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : paginatedItems.length === 0 ? (
              /* Clean Empty State */
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                <p className="text-slate-700 text-base font-bold">No solutions found matching your selection.</p>
                <p className="text-slate-400 text-xs mt-1">
                  Try clearing your search query or selecting another category.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                      handleHubSelect(categoryPage || 'furniture');
                    }}
                    className="px-4 py-2 bg-cm-blue text-white text-xs font-bold rounded-xl shadow-sm hover:brightness-110 cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              /* The Ditto Reused Solution Cards Grid */
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  columnCount === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-4'
                } gap-6`}
              >
                {paginatedItems.map((item) => {
                  const wishlistCard = { title: item.title, image: item.image };
                  return (
                    <SolutionCard
                      key={`${item.hubSlug}-${item.slug}-${item.id}`}
                      card={item}
                      headingFontClass="font-poppins"
                      primaryColor="#0047ab"
                      cardLinkUrl={item.href}
                      isSaved={isSaved(wishlistCard)}
                      isPending={isPending(wishlistCard)}
                      onAddWishlist={() => add(wishlistCard)}
                      onRemoveWishlist={() => remove(wishlistCard)}
                      hubBadge={item.hubTitle}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <PaginationControl
                page={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  updateUrlParams({ page: p });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-10"
              />
            )}
          </div>
        </div>
      </div>
    </Root>
  );
}
