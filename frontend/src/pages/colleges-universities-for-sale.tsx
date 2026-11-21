import { useMemo, useState, useEffect } from 'react';
import {
  Grid2X2,
  List,
  Mail,
  MapPin,
  Phone,
  Search,
  Star,
  Send,
  X,
  FileText,
  Download,
  Lock,
  Tag,
  GraduationCap,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { usePageData } from '@/hooks/usePageData';
import api from '@/api/client';
import LoginPromptModal from '@/components/login-prompt-modal';
import MediaImage from '@/components/ui/media-image';
import { resolveMediaUrl } from '@/lib/media-url';
import RichTextContent from '@/components/common/RichTextContent';
import PaginationControl from '@/components/common/PaginationControl';
import { CollegesGridSkeleton } from '@/components/ui/page-skeleton';

export type Region = 'North' | 'South' | 'East' | 'West';

export interface Listing {
  title: string;
  description: string;
  category?: string;
  image?: string;
  images?: string[];
  location?: string;
  region?: Region;
  rating?: string;
  sales?: string;
  margin?: string;
  askingPrice?: string;
  premium?: boolean;
  ndaUrl?: string;
  mandateUrl?: string;
}

export const getListingImages = (listing: { image?: string; images?: string[] }): string[] => {
  const list: string[] = [];
  if (Array.isArray(listing.images)) {
    list.push(...listing.images.filter(Boolean));
  }
  if (listing.image && !list.includes(listing.image)) {
    list.unshift(listing.image);
  }
  return list;
};

const CollegeCardCarousel: React.FC<{
  listing: Listing;
  view: 'grid' | 'list';
  onOpenDossier: () => void;
}> = ({ listing, view, onOpenDossier }) => {
  const images = getListingImages(listing);
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) return null;

  const safeIdx = Math.min(activeIdx, images.length - 1);
  const currentImg = images[safeIdx];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className={`relative group/carousel ${
        view === 'list' ? 'h-40 sm:w-52 shrink-0' : 'mb-4 h-44 w-full'
      } rounded-xl overflow-hidden bg-slate-100 cursor-pointer select-none`}
      onClick={onOpenDossier}
      title="Click to view full asset dossier"
    >
      <MediaImage
        src={currentImg}
        alt={listing.title}
        className="h-full w-full object-cover transition-transform duration-300 group-hover/carousel:scale-105"
      />

      {images.length > 1 && (
        <>
          {/* Previous Slide Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous campus photo"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white flex items-center justify-center transition-all opacity-90 sm:opacity-0 group-hover/carousel:opacity-100 shadow-md z-10 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Slide Arrow */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next campus photo"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white flex items-center justify-center transition-all opacity-90 sm:opacity-0 group-hover/carousel:opacity-100 shadow-md z-10 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Photo Counter Badge */}
          <div className="absolute bottom-2 right-2 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs flex items-center gap-1 z-10">
            <Camera className="w-3 h-3" />
            <span>
              {safeIdx + 1}/{images.length}
            </span>
          </div>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIdx ? 'w-3.5 bg-white shadow-xs' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const REGIONS: (Region | 'All')[] = ['All', 'North', 'South', 'East', 'West'];
const PAGE_SIZE = 8;

const resolveImage = (value?: string) => resolveMediaUrl(value);

const EMPTY_FORM = { name: '', email: '', phone: '', institution: '', message: '' };

export default function CollegesUniversitiesForSale() {
  const { data, loading } = usePageData('colleges-universities-for-sale');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'relevance' | 'newest' | 'price'>('relevance');
  const [selectedRegion, setSelectedRegion] = useState<Region | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [page, setPage] = useState(1);

  // Database is the Single Source of Truth: no hardcoded mock listings
  const listings: Listing[] = useMemo(() => {
    const raw = Array.isArray(data.cards) ? data.cards : [];
    return raw.map((c: any) => ({
      ...c,
      category: c.category === 'General' ? '' : (c.category || ''),
    }));
  }, [data.cards]);

  const [contactListing, setContactListing] = useState<Listing | null>(null);
  const [dossierListing, setDossierListing] = useState<Listing | null>(null);
  const [dossierActiveSlide, setDossierActiveSlide] = useState(0);

  useEffect(() => {
    setDossierActiveSlide(0);
  }, [dossierListing]);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem('cm_token'));

  // Automatically reset pagination to page 1 whenever any filter or search changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedRegion, selectedCategory, sort]);

  const handleNdaDownload = (rawUrl?: string) => {
    if (!rawUrl) return;
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    const targetUrl = resolveImage(rawUrl);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMandateDownload = (rawUrl?: string) => {
    if (!rawUrl) return;
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    const targetUrl = resolveImage(rawUrl);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Available categories derived dynamically from database pageData & listings
  const availableCategories = useMemo(() => {
    const listCats = Array.isArray(data.categories)
      ? data.categories.filter((c) => Boolean(c) && c !== 'General')
      : [];
    const itemCats = listings
      .map((l) => l.category)
      .filter((c): c is string => Boolean(c) && c !== 'General');
    return Array.from(new Set([...listCats, ...itemCats]));
  }, [data.categories, listings]);

  // Search filtering
  const searchMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? listings.filter((item) =>
          `${item.title} ${item.description} ${item.location ?? ''} ${item.category ?? ''}`.toLowerCase().includes(query)
        )
      : listings;
  }, [listings, search]);

  // Dynamic region counts
  const regionCounts = useMemo(() => {
    const counts: Record<Region | 'All', number> = { All: searchMatches.length, North: 0, South: 0, East: 0, West: 0 };
    searchMatches.forEach((item) => {
      if (item.region && counts[item.region] !== undefined) {
        counts[item.region] += 1;
      }
    });
    return counts;
  }, [searchMatches]);

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: searchMatches.length };
    availableCategories.forEach((cat) => {
      counts[cat] = 0;
    });
    searchMatches.forEach((item) => {
      if (item.category && counts[item.category] !== undefined) {
        counts[item.category] += 1;
      }
    });
    return counts;
  }, [searchMatches, availableCategories]);

  // Full filtered & sorted listings
  const filteredListings = useMemo(() => {
    let matches = searchMatches;
    if (selectedRegion !== 'All') {
      matches = matches.filter((item) => item.region === selectedRegion);
    }
    if (selectedCategory !== 'All') {
      matches = matches.filter((item) => item.category === selectedCategory);
    }

    if (sort === 'relevance') return matches;
    const sorted = [...matches];
    if (sort === 'newest') {
      sorted.reverse();
    } else if (sort === 'price') {
      const parsePrice = (value?: string) => {
        const match = value?.replace(/,/g, '').match(/[\d.]+/);
        return match ? parseFloat(match[0]) : Infinity;
      };
      sorted.sort((a, b) => parsePrice(a.askingPrice) - parsePrice(b.askingPrice));
    }
    return sorted;
  }, [searchMatches, selectedRegion, selectedCategory, sort]);

  // Pagination calculation: 8 universities per page
  const totalPages = Math.ceil(filteredListings.length / PAGE_SIZE) || 1;
  const paginatedListings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredListings.slice(start, start + PAGE_SIZE);
  }, [filteredListings, page]);

  const openContactForm = (listing: Listing) => {
    setContactListing(listing);
    setFormData({ ...EMPTY_FORM, message: `I'm interested in "${listing.title}". Please share more details.` });
    setSubmitted(false);
    setFormError('');
  };

  const closeContactForm = () => setContactListing(null);

  const submitContactForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactListing) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/contact', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        institution: formData.institution,
        subject: `Business enquiry: ${contactListing.title}`,
        message: formData.message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to send your enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = search || selectedRegion !== 'All' || selectedCategory !== 'All';

  const resetAllFilters = () => {
    setSearch('');
    setSelectedRegion('All');
    setSelectedCategory('All');
    setSort('relevance');
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        icon={Lock}
        eyebrow="Verified Credentials Required"
        title="Institutional Sign-In Required"
        description="Verified institutional credentials are required to view and download confidential M&A Non-Disclosure Agreements and Mandate documents."
      />

      {/* Hero Header Section */}
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-7 flex items-center gap-3 text-sm">
            <a href="/" className="font-medium text-[#087ea4] hover:underline">
              Home
            </a>
            <span className="text-slate-300">/</span>
            <a href="/classifieds" className="font-medium text-[#087ea4] hover:underline">
              Classifieds
            </a>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Colleges / Universities for Sale</span>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {data.heroTitle ?? 'Businesses for Sale and Investment'}
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-500">
                {data.heroSubtitle ??
                  'Showing businesses for sale and investment. Buy or invest in a business listed by direct business owners and business brokers.'}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#087ea4]" />
                <span className="text-xs font-semibold text-slate-700" title="Non-Disclosure Agreement">
                  NDA
                </span>
                {data.ndaUrl ? (
                  <button
                    type="button"
                    onClick={() => handleNdaDownload(data.ndaUrl)}
                    className="inline-flex items-center gap-1 rounded bg-[#087ea4] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#066e8f] transition cursor-pointer"
                  >
                    {isLoggedIn ? <Download className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    Download Here
                  </button>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Coming soon</span>
                )}
              </div>

              <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#087ea4]" />
                <span className="text-xs font-semibold text-slate-700">Mandate</span>
                {data.mandateUrl ? (
                  <button
                    type="button"
                    onClick={() => handleMandateDownload(data.mandateUrl)}
                    className="inline-flex items-center gap-1 rounded bg-[#087ea4] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#066e8f] transition cursor-pointer"
                  >
                    {isLoggedIn ? <Download className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    Download Here
                  </button>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Coming soon</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Sidebar Filters */}
          <aside className="shrink-0 lg:w-64 space-y-4">
            {/* Region Filter Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <MapPin className="h-4 w-4 text-[#087ea4]" /> Geographical Region
              </h3>
              <ul className="space-y-1">
                {REGIONS.map((region) => (
                  <li key={region}>
                    <button
                      type="button"
                      onClick={() => setSelectedRegion(region)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                        selectedRegion === region
                          ? 'bg-[#087ea4] text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{region === 'All' ? 'All Regions' : `${region} India`}</span>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                          selectedRegion === region ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {regionCounts[region] ?? 0}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Category Filter Box */}
            {availableCategories.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Tag className="h-4 w-4 text-[#087ea4]" /> Asset Category
                </h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                        selectedCategory === 'All'
                          ? 'bg-[#087ea4] text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Categories</span>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                          selectedCategory === 'All' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {categoryCounts['All'] ?? 0}
                      </span>
                    </button>
                  </li>
                  {availableCategories.map((cat) => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                          selectedCategory === cat
                            ? 'bg-[#087ea4] text-white shadow-xs font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate text-left pr-2">{cat}</span>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-semibold shrink-0 ${
                            selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {categoryCounts[cat] ?? 0}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reset Filters Link */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition bg-slate-100 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </aside>

          {/* Listings Container */}
          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={data.filterLabel || 'Search by school, location...'}
                    className="w-full sm:w-64 pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#087ea4]/20 focus:border-[#087ea4]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setView('grid')}
                    className={`p-2 transition ${view === 'grid' ? 'bg-[#087ea4] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Grid view"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className={`p-2 transition ${view === 'list' ? 'bg-[#087ea4] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Sort:</span>
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#087ea4]/20 cursor-pointer"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as 'relevance' | 'newest' | 'price')}
                    aria-label="Sort listings"
                  >
                    <option value="relevance">Default Order</option>
                    <option value="newest">Newest First</option>
                    <option value="price">Price: Low to High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results count & active tags bar */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <strong>{filteredListings.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> -{' '}
                <strong>{Math.min(page * PAGE_SIZE, filteredListings.length)}</strong> of{' '}
                <strong>{filteredListings.length}</strong> institutions
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-[#087ea4] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Loading Shimmer Skeleton */}
            {loading ? (
              <CollegesGridSkeleton view={view} />
            ) : filteredListings.length === 0 ? (
              /* Friendly Empty State */
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-bold text-slate-900">No institutions found</h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  {hasActiveFilters
                    ? 'No institutional opportunities match your current filters. Try resetting search or selecting all regions.'
                    : 'There are currently no institutional assets listed. Please check back soon or submit a mandate request.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-[#087ea4] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#066e8f] transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            ) : (
              /* Grid / List of Institutional Cards */
              <div className={`mt-6 grid gap-6 ${view === 'grid' ? 'md:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {paginatedListings.map((listing, index) => (
                  <article
                    key={listing.title + index}
                    className={`relative border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md rounded-2xl overflow-hidden flex flex-col justify-between ${
                      view === 'list' ? 'sm:flex-row gap-5 p-5' : 'p-6'
                    }`}
                  >
                    {listing.premium && (
                      <span className="absolute right-0 top-0 bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white rounded-bl-xl shadow-xs z-10">
                        Premium
                      </span>
                    )}

                    <CollegeCardCarousel
                      listing={listing}
                      view={view}
                      onOpenDossier={() => setDossierListing(listing)}
                    />

                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Badges row */}
                        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087ea4] truncate">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">
                              {listing.region ? `${listing.region} India` : 'Verified Institution'}
                              {listing.category ? ` • ${listing.category}` : ''}
                            </span>
                          </div>
                          <span
                            className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0 truncate max-w-[140px] sm:max-w-[180px]"
                            title={listing.location || 'India'}
                          >
                            <MapPin className="h-3.5 w-3.5 text-red-500 inline shrink-0" />
                            <span className="truncate">{listing.location || 'India'}</span>
                          </span>
                        </div>

                        {/* Title with overflow protection */}
                        <h2
                          className="text-lg sm:text-xl font-bold leading-snug text-slate-950 mb-2 cursor-pointer hover:text-[#087ea4] transition-colors line-clamp-2 break-words"
                          onClick={() => setDossierListing(listing)}
                          title="Click to view full asset dossier"
                        >
                          {listing.title}
                        </h2>

                        {/* Verification tags */}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>
                            <Mail className="mr-1 inline h-3.5 w-3.5 text-[#087ea4]" />
                            Email Verified
                          </span>
                          <span>
                            <Phone className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                            Direct Mandate
                          </span>
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {listing.rating || '7.5'} Rating
                          </span>
                        </div>

                        {/* Description using RichTextContent with 3-line clamping and break-words */}
                        <div className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3 break-words">
                          <RichTextContent content={listing.description} context="card" />
                        </div>

                        {/* NDA / Mandate documents */}
                        {(listing.ndaUrl || listing.mandateUrl) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {listing.ndaUrl && (
                              <button
                                type="button"
                                onClick={() => handleNdaDownload(listing.ndaUrl)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#087ea4]/10 px-2.5 py-1 text-xs font-semibold text-[#087ea4] hover:bg-[#087ea4]/20 transition cursor-pointer"
                              >
                                <FileText className="h-3 w-3" /> NDA
                              </button>
                            )}
                            {listing.mandateUrl && (
                              <button
                                type="button"
                                onClick={() => handleMandateDownload(listing.mandateUrl)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#087ea4]/10 px-2.5 py-1 text-xs font-semibold text-[#087ea4] hover:bg-[#087ea4]/20 transition cursor-pointer"
                              >
                                <FileText className="h-3 w-3" /> Mandate
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Financials & Action Buttons */}
                      <div>
                        <div className="mt-4 border-t border-slate-100 pt-3 text-sm space-y-1.5">
                          <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                            <span className="text-slate-500 text-xs sm:text-sm shrink-0">Run Rate Sales</span>
                            <strong className="text-right truncate text-slate-900 text-xs sm:text-sm">
                              {listing.sales || 'Price on request'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                            <span className="text-slate-500 text-xs sm:text-sm shrink-0">EBITDA Margin</span>
                            <strong className="text-emerald-600 font-bold text-right truncate text-xs sm:text-sm">
                              {listing.margin || '25 %'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                            <span className="text-slate-500 text-xs sm:text-sm shrink-0">Asking Price</span>
                            <strong className="text-[#087ea4] font-bold text-right truncate text-xs sm:text-sm">
                              {listing.askingPrice || 'Contact us'}
                            </strong>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setDossierListing(listing)}
                            className="rounded-xl border border-[#087ea4] bg-white px-3 py-2.5 text-xs sm:text-sm font-bold text-[#087ea4] hover:bg-[#087ea4]/5 transition text-center cursor-pointer shadow-xs min-w-0 truncate"
                          >
                            {data.cardDetailsButtonLabel || 'View Full Details'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openContactForm(listing)}
                            className="rounded-xl bg-[#e6bb00] px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-[#d5ab00] transition text-center cursor-pointer shadow-xs min-w-0 truncate"
                          >
                            {data.cardContactButtonLabel || 'Contact Business'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="mt-10">
                <PaginationControl page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Business Modal Form */}
      {contactListing && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Contact Business</h2>
                <p className="mt-1 text-sm text-slate-500 break-words">{contactListing.title}</p>
              </div>
              <button
                type="button"
                onClick={closeContactForm}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 text-sm">
                  Thank you. Your enquiry has been sent — the listing owner will get back to you soon.
                </div>
              ) : (
                <form onSubmit={submitContactForm} className="space-y-4 text-xs sm:text-sm">
                  {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#087ea4]/20"
                        required
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#087ea4]/20"
                        required
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                      <input
                        type="tel"
                        pattern="(?:\+?91[\s\-]?)?0?[0-9\s\-]{10,14}"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#087ea4]/20"
                        required
                        value={formData.phone}
                        onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Institution / Company</label>
                      <input
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#087ea4]/20"
                        value={formData.institution}
                        onChange={(event) => setFormData({ ...formData, institution: event.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Message *</label>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#087ea4]/20 min-h-[100px]"
                      required
                      value={formData.message}
                      onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e6bb00] px-4 py-3 font-bold text-slate-950 hover:bg-[#d5ab00] disabled:opacity-60 transition"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Sending...' : 'Send Enquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Institutional Dossier Modal */}
      {dossierListing && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#087ea4]">
                    {dossierListing.region ? `${dossierListing.region} India` : 'Verified Institution'} &bull;{' '}
                    {dossierListing.location ?? 'India'}
                    {dossierListing.category ? ` &bull; ${dossierListing.category}` : ''}
                  </span>
                  {dossierListing.premium && (
                    <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      Premium
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight break-words">
                  {dossierListing.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDossierListing(null)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* Dossier Multi-Photo Interactive Gallery */}
              {(() => {
                const dossierImages = getListingImages(dossierListing);
                if (dossierImages.length === 0) return null;
                const safeDossierIdx = Math.min(dossierActiveSlide, dossierImages.length - 1);
                return (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden h-56 sm:h-72 w-full bg-slate-900 shadow-inner group/dossierGallery">
                      <MediaImage
                        src={dossierImages[safeDossierIdx]}
                        alt={`${dossierListing.title} photo ${safeDossierIdx + 1}`}
                        className="w-full h-full object-cover transition-all duration-300"
                      />

                      {dossierImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setDossierActiveSlide((prev) => (prev - 1 + dossierImages.length) % dossierImages.length)
                            }
                            aria-label="Previous campus photo"
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center transition-all shadow-md z-10"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDossierActiveSlide((prev) => (prev + 1) % dossierImages.length)
                            }
                            aria-label="Next campus photo"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center transition-all shadow-md z-10"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          <div className="absolute bottom-2.5 right-2.5 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-xs flex items-center gap-1.5 z-10">
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              {safeDossierIdx + 1} / {dossierImages.length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Navigation Strip */}
                    {dossierImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5">
                        {dossierImages.map((thumbUrl, idx) => {
                          const isSelected = idx === safeDossierIdx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDossierActiveSlide(idx)}
                              className={`relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-600 ring-2 ring-emerald-500/25 opacity-100 scale-[1.02]'
                                  : 'border-slate-200 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <MediaImage
                                src={thumbUrl}
                                alt={`Thumbnail ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Executive Summary & Overview
                </h3>
                <div className="text-sm sm:text-base text-slate-700 leading-relaxed break-words bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                  <RichTextContent content={dossierListing.description} context="body" />
                </div>
              </div>

              {/* Financials & Key Stats Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Institutional Valuation & Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase">Run Rate Sales</span>
                    <strong className="block text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">
                      {dossierListing.sales ?? 'On request'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase">EBITDA Margin</span>
                    <strong className="block text-sm sm:text-base font-bold text-emerald-600 mt-1 truncate">
                      {dossierListing.margin ?? '25 %'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase">Asking Price</span>
                    <strong className="block text-sm sm:text-base font-bold text-[#087ea4] mt-1 truncate">
                      {dossierListing.askingPrice ?? 'Contact us'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase">Asset Rating</span>
                    <strong className="block text-sm sm:text-base font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-current" />
                      {dossierListing.rating ?? '7.5'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Legal Documents */}
              {(dossierListing.ndaUrl || dossierListing.mandateUrl) && (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/80">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#087ea4] mb-2.5">
                    Confidential Due Diligence Documents
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {dossierListing.ndaUrl && (
                      <button
                        type="button"
                        onClick={() => handleNdaDownload(dossierListing.ndaUrl)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#087ea4]/30 px-3.5 py-2 text-xs font-bold text-[#087ea4] hover:bg-[#087ea4] hover:text-white transition shadow-xs cursor-pointer"
                      >
                        <FileText className="h-4 w-4" /> Download NDA Document
                      </button>
                    )}
                    {dossierListing.mandateUrl && (
                      <button
                        type="button"
                        onClick={() => handleMandateDownload(dossierListing.mandateUrl)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#087ea4]/30 px-3.5 py-2 text-xs font-bold text-[#087ea4] hover:bg-[#087ea4] hover:text-white transition shadow-xs cursor-pointer"
                      >
                        <FileText className="h-4 w-4" /> Download Mandate Document
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDossierListing(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = dossierListing;
                  setDossierListing(null);
                  openContactForm(target);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#e6bb00] hover:bg-[#d5ab00] text-slate-950 font-bold text-sm transition shadow-sm"
              >
                Contact Business Regarding this Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
