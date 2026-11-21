import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Pencil, X, Plus, Trash2, ExternalLink, Search, FileText, Layers, Building2, Compass } from 'lucide-react';
import api from '../api/client';
import UnifiedPageEditor, { type Page } from '../components/UnifiedPageEditor';

// ─── Subpage & Deep Card Search Helper (Issue #9) ─────────────────────────────
function getSubpageMatch(page: Page, query: string): string | null {
    if (!query) return null;
    if (!page.pageData) return null;

    try {
        const data = typeof page.pageData === 'string' ? JSON.parse(page.pageData) : page.pageData;
        if (!data || typeof data !== 'object') return null;

        // 1. Check feature / solution cards
        if (Array.isArray(data.cards)) {
            for (const c of data.cards) {
                if (c?.title && c.title.toLowerCase().includes(query)) {
                    return `Card: "${c.title}"`;
                }
                if (c?.category && c.category.toLowerCase().includes(query)) {
                    return `Category: "${c.category}"`;
                }
                if (c?.description && c.description.toLowerCase().includes(query)) {
                    return `Card content: "${c.title || 'Item'}"`;
                }
            }
        }

        // 2. Check secondary cards
        if (Array.isArray(data.secondaryCards)) {
            for (const c of data.secondaryCards) {
                if (c?.title && c.title.toLowerCase().includes(query)) {
                    return `Sub-card: "${c.title}"`;
                }
            }
        }

        // 3. Check process steps
        if (Array.isArray(data.processSteps)) {
            for (const s of data.processSteps) {
                if (s?.title && s.title.toLowerCase().includes(query)) {
                    return `Step: "${s.title}"`;
                }
            }
        }

        // 4. Check case studies
        if (Array.isArray(data.caseStudies)) {
            for (const cs of data.caseStudies) {
                if (cs?.title && cs.title.toLowerCase().includes(query)) {
                    return `Case Study: "${cs.title}"`;
                }
            }
        }

        // 5. Check FAQs
        if (Array.isArray(data.faqs)) {
            for (const f of data.faqs) {
                if (f?.question && f.question.toLowerCase().includes(query)) {
                    return `FAQ: "${f.question}"`;
                }
                if (f?.answer && f.answer.toLowerCase().includes(query)) {
                    return `FAQ Answer: "${f.question || 'Item'}"`;
                }
            }
        }

        // 5b. Check article / policy sections
        if (Array.isArray(data.sections)) {
            for (const s of data.sections) {
                if (s?.heading && s.heading.toLowerCase().includes(query)) {
                    return `Section: "${s.heading}"`;
                }
                if (s?.body && s.body.toLowerCase().includes(query)) {
                    return `Article Body: "${s.heading || 'Section'}"`;
                }
            }
        }

        // 6. Check hero or section titles if distinct
        if (data.heroTitle && data.heroTitle.toLowerCase().includes(query) && !page.title.toLowerCase().includes(query)) {
            return `Hero Title: "${data.heroTitle}"`;
        }
        if (data.section1Title && data.section1Title.toLowerCase().includes(query)) {
            return `Section: "${data.section1Title}"`;
        }
    } catch {
        // Safe fallback for malformed JSON
    }

    return null;
}

// ─── Page hierarchy classification ───────────────────────────────────────────
// Dedicated Campus Design & Turnkey Execution Suite
export const CAMPUS_DESIGN_SLUGS = new Set([
    'campus-design',
    'campus-design-execution',
    'campus-master-planning',
    'campus-furniture-design',
    'ai-digital-design-supply',
    'furniture-design-supply',
    'sports-design-execution',
]);

// Dedicated Classifieds & Opportunities Suite
export const CLASSIFIEDS_SUITE_SLUGS = new Set([
    'classifieds',
    'colleges-universities-for-sale',
    'partner-with-colleges',
    'job-openings',
]);

// Protected core functional pages that cannot be deleted by editors
export const PROTECTED_SYSTEM_SLUGS = new Set([
    'home',
    'colleges-universities-for-sale',
    'classifieds',
    'catalogues',
    'faq',
    'blog',
]);

// Main top-level pages that appear in primary navigation
const MAIN_SLUGS = new Set([
    'home', 'about-us', 'contact-us', 'blog', 'shop', 'services',
    'solutions', 'corporate', 'catalogues', 'classifieds', 'login',
    'registration', 'my-account', 'request-quote', 'not-found',
    'privacy-policy', 'terms-of-use', 'payment-policy', 'replacement-return',
    'order-rejection', 'partnership', 'job-openings', 'partner-with-colleges', 'lookbook', 'ugc-guidelines', 'faq',
    'how-it-works', 'brand-help', 'sell-on-schoolmart', 'sell-on-campusmart',
    '20-stunning-college-buildings', 'academic-buildings', 'research-facilities', 'student-life-centers',
]);

// Primary category / solution pages
const CATEGORY_SLUGS = new Set([
    'campus-design', 'furniture', 'sports-infra', 'ai-ml', 'tech-infra',
    'libraries', 'labs', 'collaboration', 'innovation', 'lms',
    'smart-classrooms',
    'digital-transformation', 'campus-automation', 'assessment-system',
    'library-management', 'new-environments', 'setup-college',
    'science-tech-labs', 'ai-guide',
    'campus-master-planning', 'ar-vr-experiences', 'campus-furniture-design',
]);

type Group = { label: string; badge: string; badgeColor: string; pages: Page[] };

function classifyPages(pages: Page[]): Group[] {
    const campusDesign: Page[] = [];
    const classifiedsSuite: Page[] = [];
    const main: Page[] = [];
    const category: Page[] = [];
    const inner: Page[] = [];

    pages.forEach(p => {
        if (CAMPUS_DESIGN_SLUGS.has(p.slug)) campusDesign.push(p);
        else if (CLASSIFIEDS_SUITE_SLUGS.has(p.slug)) classifiedsSuite.push(p);
        else if (MAIN_SLUGS.has(p.slug)) main.push(p);
        else if (CATEGORY_SLUGS.has(p.slug)) category.push(p);
        else inner.push(p);
    });

    const sort = (arr: Page[]) => arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return [
        { label: 'Campus Design & Execution Suite', badge: 'Master Planning, Turnkey Execution & Spatial Design', badgeColor: 'bg-teal-100 text-teal-800', pages: sort(campusDesign) },
        { label: 'Classifieds & Opportunities Suite', badge: 'Institutions, Partnerships, Funding & Careers Hub', badgeColor: 'bg-amber-100 text-amber-800', pages: sort(classifiedsSuite) },
        { label: 'Main Pages', badge: 'Primary navigation & utility pages', badgeColor: 'bg-blue-100 text-blue-700', pages: sort(main) },
        { label: 'Category / Solution Pages', badge: 'Top-level category landing pages', badgeColor: 'bg-violet-100 text-violet-700', pages: sort(category) },
        { label: 'Inner & Sub-Pages', badge: 'Detailed inner pages under categories', badgeColor: 'bg-amber-100 text-amber-700', pages: sort(inner) },
    ].filter(g => g.pages.length > 0);
}

// ─── Page Card ────────────────────────────────────────────────────────────────
function PageCard({ page, allPages: _allPages, isEditing, onToggleEdit, onTogglePublish, onDelete, onSelectPage: _onSelectPage, matchedSubpage }: {
    page: Page;
    allPages?: Page[];
    isEditing: boolean;
    onToggleEdit: () => void;
    onTogglePublish: () => void;
    onDelete: () => void;
    onSelectPage?: (page: Page) => void;
    matchedSubpage?: string | null;
}) {
    return (
        <div className={`bg-white rounded-2xl border transition-all shadow-sm hover:shadow-md overflow-hidden flex flex-col justify-between ${
            isEditing ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
        }`}>
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                    {/* Header: Status, Template, and Dedicated Hub Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={onTogglePublish}
                                title="Toggle publish status"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                                    page.published
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                            >
                                {page.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {page.published ? 'Live' : 'Draft'}
                            </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                page.template === 'article'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : page.template
                                    ? 'bg-indigo-50 text-indigo-500'
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                {page.template === 'article' ? 'ARTICLE' : page.template === 'solution-hub' ? 'SOLUTION' : page.template === 'service-suite' ? 'SERVICE' : page.template ? 'REACT' : 'HTML'}
                            </span>
                            {page.slug === 'home' && (
                                <Link
                                    to="/admin/homepage-editor"
                                    className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-0.5 rounded-md transition-colors"
                                    title="Open Dedicated Homepage Visual Editor"
                                >
                                    Visual Editor ↗
                                </Link>
                            )}
                            {page.slug === 'catalogues' && (
                                <>
                                    <Link
                                        to="/admin/catalogues"
                                        className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                                        title="Open PDF Catalogues Manager"
                                    >
                                        PDF Manager ↗
                                    </Link>
                                    <Link
                                        to="/admin/case-studies"
                                        className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                                        title="Open Case Studies & Projects Manager"
                                    >
                                        Case Studies ↗
                                    </Link>
                                </>
                            )}
                            {page.slug === 'colleges-universities-for-sale' && (
                                <Link
                                    to="/admin/colleges"
                                    className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                                    title="Open Dedicated Colleges Manager"
                                >
                                    Colleges Manager ↗
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <a
                                href={`/${page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View live page in new tab"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            {!PROTECTED_SYSTEM_SLUGS.has(page.slug) && (
                                <button
                                    onClick={onDelete}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete page"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Page Details */}
                    {(() => {
                        const displayTitle = page.slug === 'campus-design'
                            ? 'Campus Design'
                            : page.slug === 'campus-design-execution'
                            ? 'Campus Design & Execution'
                            : page.slug === 'classifieds'
                            ? 'Classifieds Hub'
                            : page.slug === 'colleges-universities-for-sale'
                            ? 'Colleges / Universities for Sale'
                            : page.title;
                        return (
                            <h3 className="font-bold text-gray-900 text-sm mb-1 leading-snug line-clamp-1" title={displayTitle}>
                                {displayTitle}
                            </h3>
                        );
                    })()}
                    <p className="text-xs text-gray-400 font-mono truncate" title={`/${page.slug}`}>
                        /{page.slug}
                    </p>

                    {/* Subpage / Deep Card Match Indicator (Issue #9) */}
                    {matchedSubpage && (
                        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold" title={`Found inside ${matchedSubpage}`}>
                            <Search className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">Found in {matchedSubpage}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Primary Action Buttons: Dual Split Row */}
            <div className="border-t border-gray-100 bg-gray-50/70 p-3 grid grid-cols-2 gap-2">
                <Link
                    to={`/admin/pages/${page.id}/edit`}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-xs"
                    title="Open full standalone page editor"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">Full Editor</span>
                </Link>
                <button
                    onClick={onToggleEdit}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs ${
                        isEditing
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                    }`}
                >
                    {isEditing ? (
                        <>
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>Close</span>
                        </>
                    ) : (
                        <>
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                            <span>Quick Edit</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── Module-level SWR Cache & Skeleton ────────────────────────────────────────
let pagesCache: Page[] | null = null;

function PagesSkeleton() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
            {/* Header & Search Toolbar Skeleton */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
                        <div className="h-4 w-44 bg-gray-100 rounded-md" />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="h-10 w-full sm:w-80 bg-gray-100 rounded-xl" />
                        <div className="h-10 w-28 bg-gray-200 rounded-xl shrink-0" />
                    </div>
                </div>

                {/* Filter Chips Skeleton */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    {[90, 160, 120, 150, 110].map((width, idx) => (
                        <div
                            key={idx}
                            className="h-8 rounded-xl bg-gray-100"
                            style={{ width: `${width}px` }}
                        />
                    ))}
                </div>
            </div>

            {/* 6-Card Shimmer Skeleton Grid */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-5 w-44 bg-gray-200 rounded-md" />
                    <div className="h-5 w-32 bg-gray-100 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between min-h-[160px]"
                        >
                            <div className="p-4 sm:p-5 flex-1 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-5 w-14 bg-gray-200 rounded-full" />
                                        <div className="h-4 w-12 bg-gray-100 rounded-md" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-6 w-6 bg-gray-100 rounded-lg" />
                                        <div className="h-6 w-6 bg-gray-100 rounded-lg" />
                                    </div>
                                </div>
                                <div className="h-5 w-3/4 bg-gray-200 rounded-md" />
                                <div className="h-3 w-1/2 bg-gray-100 rounded-md" />
                            </div>
                            <div className="border-t border-gray-100 bg-gray-50/70 p-3 grid grid-cols-2 gap-2">
                                <div className="h-8 bg-gray-200 rounded-xl" />
                                <div className="h-8 bg-gray-200 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Pages Manager ───────────────────────────────────────────────────────
export default function PagesManager() {
    const [searchParams, setSearchParams] = useSearchParams();
    const editSlug = searchParams.get('edit') || searchParams.get('slug');
    const [pages, setPages] = useState<Page[]>(() => pagesCache || []);
    const [loading, setLoading] = useState<boolean>(() => !pagesCache);
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const initialSlugProcessed = useRef<string | null>(null);

    useEffect(() => {
        if (editSlug && pages.length > 0 && initialSlugProcessed.current !== editSlug) {
            const found = pages.find(p => p.slug === editSlug || String(p.id) === editSlug);
            if (found) {
                setEditingPage(found);
                initialSlugProcessed.current = editSlug;
            }
        }
    }, [editSlug, pages]);

    const handleCloseEditor = () => {
        setEditingPage(null);
        if (searchParams.has('edit') || searchParams.has('slug')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('edit');
            nextParams.delete('slug');
            setSearchParams(nextParams, { replace: true });
        }
    };
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'campus-design' | 'classifieds' | 'main' | 'category' | 'inner'>('all');
    const [creating, setCreating] = useState(false);
    const [newPageType, setNewPageType] = useState<'article' | 'grid' | 'solution-hub' | 'service-suite'>('article');
    const [newTitle, setNewTitle] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const editorAnchorRef = useRef<HTMLDivElement | null>(null);

    const handleTitleChange = (val: string) => {
        setNewTitle(val);
        if (!slugEdited) {
            setNewSlug(
                val
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
            );
        }
    };

    // Debounce search query by 150ms to eliminate typing lag across pages
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 150);
        return () => clearTimeout(timer);
    }, [search]);

    const clearSearch = () => {
        setSearch('');
        setDebouncedSearch('');
    };

    useEffect(() => {
        if (editingPage && editorAnchorRef.current) {
            editorAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [editingPage]);

    const fetchPages = async (isBackground = false) => {
        if (!pagesCache && !isBackground) {
            setLoading(true);
        }
        try {
            const { data } = await api.get('/pages');
            if (Array.isArray(data)) {
                pagesCache = data;
                setPages(data);
            }
        } catch { /* noop */ }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // If cache is populated, load silently in background (SWR pattern)
        fetchPages(Boolean(pagesCache));
    }, []);

    const togglePublish = async (id: number, current: boolean) => {
        const nextPublished = !current;
        // Optimistic UI: flip local published state immediately for 0ms user feedback
        setPages(pp => {
            const next = pp.map(p => p.id === id ? { ...p, published: nextPublished } : p);
            pagesCache = next;
            return next;
        });
        setEditingPage(prev => (prev?.id === id ? { ...prev, published: nextPublished } : prev));

        try {
            await api.put(`/pages/${id}`, { published: nextPublished });
        } catch (error) {
            console.error('Failed to toggle publish status, reverting:', error);
            // Revert on API failure
            setPages(pp => {
                const reverted = pp.map(p => p.id === id ? { ...p, published: current } : p);
                pagesCache = reverted;
                return reverted;
            });
            setEditingPage(prev => (prev?.id === id ? { ...prev, published: current } : prev));
        }
    };

    const deletePage = async (id: number) => {
        const target = pages.find(p => p.id === id);
        if (!target) return;
        if (PROTECTED_SYSTEM_SLUGS.has(target.slug)) {
            alert(`The page "${target.title}" is a protected functional page and cannot be deleted. You can take it offline by toggling its Live/Draft status instead.`);
            return;
        }
        const ok = window.confirm(`Delete page "${target.title}"? This cannot be undone.`);
        if (!ok) return;

        try {
            await api.delete(`/pages/${id}`);
            setPages(pp => {
                const next = pp.filter(p => p.id !== id);
                pagesCache = next;
                return next;
            });
            if (editingPage?.id === id) setEditingPage(null);
        } catch { /* noop */ }
    };

    const createPage = async () => {
        const title = newTitle.trim();
        if (!title) return;

        const slug = (newSlug.trim() || title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'new-page';

        const initialPageData = newPageType === 'article'
            ? {
                category: '',
                heroTitle: title,
                heroImage: '',
                body: '<p>Write your detailed article and content here...</p>',
                ctaTitle: '',
                ctaSubtitle: '',
                ctaButtonLabel: '',
                ctaHref: '/contact-us',
                hideHero: false,
                hideBody: false,
                hideCta: true,
            }
            : newPageType === 'solution-hub'
            ? {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Facilities & Solutions',
                cards: [],
                ctaTitle: 'Ready to Elevate Your Campus Facilities?',
                ctaSubtitle: 'Partner with our specialists to plan, equip, and maintain state-of-the-art infrastructure.',
                ctaButtonLabel: 'Get Project Audit',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: false,
                styles: {
                    headingFont: 'poppins',
                    bodyFont: 'opensans',
                    primaryColor: '#0047ab',
                    heroBg: '#002a6c',
                    ctaBg: '#002a6c',
                    heroLayout: 'split-right',
                    cardColumns: '3',
                    showFeatured: false,
                    showFilters: true,
                },
            }
            : newPageType === 'service-suite'
            ? {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Phases & Execution Steps',
                stepCountLabel: 'Phases',
                readMoreLabel: 'Explore Service',
                cards: [],
                ctaTitle: 'Ready to Execute Your Campus Project?',
                ctaSubtitle: 'Share your project scope, area, and timelines with our architectural and engineering team.',
                ctaButtonLabel: 'Get a Project Quote',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: false,
                styles: {
                    headingFont: 'poppins',
                    bodyFont: 'opensans',
                    primaryColor: '#0047ab',
                    heroBg: 'white',
                    ctaBg: '#002a6c',
                    heroLayout: 'minimal',
                    cardColumns: '3',
                    showFeatured: false,
                    showFilters: false,
                },
            }
            : {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Solutions & Offerings',
                ...(newPageType === 'solution-hub' || newPageType === 'service-suite' ? {} : { cards: [] }),
                ctaTitle: '',
                ctaSubtitle: '',
                ctaButtonLabel: '',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: true,
                styles: {
                    headingFont: 'poppins',
                    bodyFont: 'opensans',
                    primaryColor: '#0047ab',
                    heroBg: 'blue',
                    ctaBg: '#002a6c',
                    heroLayout: 'split-right',
                    cardColumns: '3',
                    showFeatured: false,
                    showFilters: true,
                },
            };

        try {
            const { data } = await api.post('/pages', {
                title,
                slug,
                template: newPageType,
                published: true,
                pageData: JSON.stringify(initialPageData)
            });
            setPages(pp => {
                const next = [data, ...pp];
                pagesCache = next;
                return next;
            });
            setEditingPage(data);
            setNewTitle('');
            setNewSlug('');
            setSlugEdited(false);
            setNewPageType('article');
            setCreating(false);
            setTimeout(() => {
                editorAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err: any) {
            console.error('Failed to create page:', err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to create page. A page with this slug may already exist.';
            alert(`Unable to create page: ${msg}`);
        }
    };

    const handleSaved = (updated: Page) => {
        setPages(pp => {
            const next = pp.map(p => p.id === updated.id ? { ...p, ...updated } : p);
            pagesCache = next;
            return next;
        });
        setEditingPage(prev => prev ? { ...prev, ...updated } : prev);
    };

    const normalizedSearch = (debouncedSearch || '').trim().replace(/^\/+/, '').toLowerCase();

    // Deep search across Title, Slug, and Inner PageData (cards, subtitles, facilities)
    const searchMatches = useMemo(() => {
        const map = new Map<number, string | null>();
        pages.forEach(p => {
            if (!normalizedSearch) {
                map.set(p.id, null);
                return;
            }
            const titleLower = (p.title || '').toLowerCase();
            const slugLower = (p.slug || '').toLowerCase();

            // Prevent false-positive substring match of "lab" inside "collaboration"
            const isFalsePositiveCollab =
                (normalizedSearch === 'lab' || normalizedSearch === 'labs') &&
                slugLower.includes('collaboration');

            const titleMatch =
                !isFalsePositiveCollab &&
                (titleLower.includes(normalizedSearch) || (titleLower.length >= 4 && normalizedSearch.includes(titleLower)));
            const slugMatch = !isFalsePositiveCollab && slugLower.includes(normalizedSearch);

            // Search aliases for AI-Powered Learning Stations, Sports & Labs
            const isAliasMatch =
                ((slugLower === 'ai-stations' || p.id === 6) && (
                    normalizedSearch.includes('ai-powered') ||
                    normalizedSearch.includes('ai powered') ||
                    normalizedSearch.includes('learning station') ||
                    normalizedSearch.includes('learning stations')
                )) ||
                ((slugLower === 'sports-infra' || slugLower === 'sports-design-execution') && (
                    normalizedSearch === 'sports' ||
                    normalizedSearch === 'sport'
                )) ||
                (slugLower === 'labs' && (
                    normalizedSearch === 'lab' ||
                    normalizedSearch === 'labs' ||
                    normalizedSearch.includes('lab page') ||
                    normalizedSearch.includes('labs page') ||
                    normalizedSearch.includes('laboratory') ||
                    normalizedSearch.includes('laboratories')
                ));

            if (titleMatch || slugMatch || isAliasMatch) {
                map.set(p.id, null); // Direct title/slug/alias match
            } else {
                const subMatch = getSubpageMatch(p, normalizedSearch);
                if (subMatch) {
                    map.set(p.id, subMatch); // Subpage / inner card match
                }
            }
        });
        return map;
    }, [pages, normalizedSearch]);

    const filtered = pages.filter(p => {
        if (!searchMatches.has(p.id)) return false;
        if (activeFilter === 'campus-design') return CAMPUS_DESIGN_SLUGS.has(p.slug);
        if (activeFilter === 'classifieds') return CLASSIFIEDS_SUITE_SLUGS.has(p.slug);
        if (activeFilter === 'main') return MAIN_SLUGS.has(p.slug) && !CAMPUS_DESIGN_SLUGS.has(p.slug) && !CLASSIFIEDS_SUITE_SLUGS.has(p.slug);
        if (activeFilter === 'category') return CATEGORY_SLUGS.has(p.slug) && !CAMPUS_DESIGN_SLUGS.has(p.slug) && !CLASSIFIEDS_SUITE_SLUGS.has(p.slug);
        if (activeFilter === 'inner') return !MAIN_SLUGS.has(p.slug) && !CATEGORY_SLUGS.has(p.slug) && !CAMPUS_DESIGN_SLUGS.has(p.slug) && !CLASSIFIEDS_SUITE_SLUGS.has(p.slug);
        return true;
    });

    const groups: Group[] = useMemo(() => {
        if (!normalizedSearch) {
            return classifyPages(filtered);
        }

        const getRelevanceScore = (p: Page): number => {
            const slugLower = (p.slug || '').toLowerCase();
            const titleLower = (p.title || '').toLowerCase();
            if (slugLower === normalizedSearch || titleLower === normalizedSearch) return 100;
            if (slugLower === 'labs' && (normalizedSearch === 'lab' || normalizedSearch === 'labs' || normalizedSearch.startsWith('lab'))) return 99;
            if (slugLower.startsWith(normalizedSearch) || titleLower.startsWith(normalizedSearch)) return 85;
            const slugWords = slugLower.split(/[-_\s]+/);
            const titleWords = titleLower.split(/[-_\s()/]+/);
            if (slugWords.includes(normalizedSearch) || titleWords.includes(normalizedSearch)) return 75;
            if (slugWords.some(w => w.startsWith(normalizedSearch)) || titleWords.some(w => w.startsWith(normalizedSearch))) return 65;
            return 30;
        };

        const directMatches = filtered
            .filter(p => searchMatches.get(p.id) === null)
            .sort((a, b) => {
                const diff = getRelevanceScore(b) - getRelevanceScore(a);
                return diff !== 0 ? diff : a.title.localeCompare(b.title);
            });

        const contentMatches = filtered
            .filter(p => searchMatches.get(p.id) !== null)
            .sort((a, b) => a.title.localeCompare(b.title));

        const searchGroups: Group[] = [];
        if (directMatches.length > 0) {
            searchGroups.push({
                label: 'Best Page Matches',
                badge: 'Direct page title & URL matches',
                badgeColor: 'bg-emerald-100 text-emerald-800',
                pages: directMatches,
            });
        }
        if (contentMatches.length > 0) {
            searchGroups.push({
                label: 'Matched Inside Page Content & Cards',
                badge: 'Pages containing matching cards or sections',
                badgeColor: 'bg-blue-100 text-blue-700',
                pages: contentMatches,
            });
        }
        return searchGroups;
    }, [filtered, normalizedSearch, searchMatches]);

    if (loading && pages.length === 0) return <PagesSkeleton />;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Search Toolbar */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Pages Management</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            <span className="font-semibold text-blue-600">{pages.length}</span> total pages · organised by hierarchy
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search pages, cards, facilities…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full bg-white shadow-sm font-medium"
                            />
                            {search && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                    title="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setCreating(v => !v)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 transition-all shrink-0 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            {creating ? 'Cancel' : 'New Page'}
                        </button>
                    </div>
                </div>

                {/* Filter Chips Toolbar (Issue #9) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        All Pages ({pages.length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('campus-design')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeFilter === 'campus-design'
                                ? 'bg-teal-700 text-white shadow-sm'
                                : 'bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100'
                        }`}
                    >
                        Campus Design Suite ({pages.filter(p => CAMPUS_DESIGN_SLUGS.has(p.slug)).length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('classifieds')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeFilter === 'classifieds'
                                ? 'bg-amber-700 text-white shadow-sm'
                                : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                        }`}
                    >
                        Classifieds Suite ({pages.filter(p => CLASSIFIEDS_SUITE_SLUGS.has(p.slug)).length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('main')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeFilter === 'main' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        Main Navigation
                    </button>
                    <button
                        onClick={() => setActiveFilter('category')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeFilter === 'category' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        Category / Solution Hubs
                    </button>
                    <button
                        onClick={() => setActiveFilter('inner')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeFilter === 'inner' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        Inner Sub-Pages
                    </button>
                    {debouncedSearch && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 flex items-center gap-1.5">
                            <span>Matching: <strong>"{debouncedSearch}"</strong> ({filtered.length} found)</span>
                            <button onClick={clearSearch} className="text-blue-500 hover:text-blue-800 underline ml-1 cursor-pointer">
                                Clear
                            </button>
                        </span>
                    )}
                </div>
            </div>

            {creating && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-5 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em]">Create New CMS Page</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Choose layout structure and configure URL slug</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCreating(false)}
                            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Close modal"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Page Layout Mode Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Select Page Type</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <button
                                type="button"
                                onClick={() => setNewPageType('article')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'article'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'article' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">📄 Detail / Article Page</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Group 1</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For policies, guidelines, announcements, and deep-dive article reading. Features rich text editor and inquiry CTA.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('grid')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'grid'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🗂️ Knowledge & Guide Hub</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Group 2</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Interactive guides and directory cards (e.g. AI Guide, College Setup, UGC Guidelines). Features 12-card pagination.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('solution-hub')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'solution-hub'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'solution-hub' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🏟️ Solution Infrastructure Hub</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Group 4</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For physical campus infra, labs, libraries, and sports products. Includes wishlist heart engine and category filter.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('service-suite')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'service-suite'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'service-suite' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    <Compass className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🏗️ Turnkey Service & Execution</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Group 5</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For phased service delivery and architectural execution (e.g. Design & Execution, Furniture Design). Features step badges.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700">Page Title *</label>
                            <input
                                value={newTitle}
                                onChange={e => handleTitleChange(e.target.value)}
                                placeholder="e.g. Student Exchange Program"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700">URL Slug (Auto-generated if blank)</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">/</span>
                                <input
                                    value={newSlug}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!val.trim()) {
                                            setSlugEdited(false);
                                            setNewSlug(
                                                newTitle
                                                    .toLowerCase()
                                                    .trim()
                                                    .replace(/[^a-z0-9]+/g, '-')
                                                    .replace(/^-+|-+$/g, '')
                                            );
                                        } else {
                                            setSlugEdited(true);
                                            setNewSlug(val);
                                        }
                                    }}
                                    placeholder="student-exchange-program"
                                    className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-3 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => {
                                setCreating(false);
                                setNewTitle('');
                                setNewSlug('');
                                setSlugEdited(false);
                            }}
                            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={createPage}
                            disabled={!newTitle.trim()}
                            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Create {newPageType === 'article' ? 'Article Page' : newPageType === 'solution-hub' ? 'Solution Hub' : newPageType === 'service-suite' ? 'Service Suite' : 'Grid Hub'}
                        </button>
                    </div>
                </div>
            )}

            {/* Inline / Quick Editor panel */}
            <div ref={editorAnchorRef} className="scroll-mt-24">
                {editingPage && (
                    <UnifiedPageEditor
                        key={editingPage.id}
                        page={editingPage}
                        allPages={pages}
                        onClose={handleCloseEditor}
                        onSaved={handleSaved}
                        onSelectPage={(targetPage) => setEditingPage(targetPage)}
                        targetCardSlug={searchParams.get('card') || undefined}
                    />
                )}
            </div>

            {/* Grouped sections */}
            {groups.map((group) => (
                <div key={group.label}>
                    {/* Group header */}
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-base font-extrabold text-gray-800">{group.label}</h2>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${group.badgeColor}`}>
                            {group.badge}
                        </span>
                        <span className="ml-auto text-xs text-gray-400 font-semibold">{group.pages.length} pages</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {group.pages.map(page => (
                            <PageCard
                                key={page.id}
                                page={page}
                                allPages={pages}
                                matchedSubpage={searchMatches.get(page.id)}
                                isEditing={editingPage?.id === page.id}
                                onToggleEdit={() => setEditingPage(editingPage?.id === page.id ? null : page)}
                                onTogglePublish={() => togglePublish(page.id, page.published)}
                                onDelete={() => deletePage(page.id)}
                                onSelectPage={(p) => setEditingPage(p)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200 space-y-2">
                    <p>No pages match your search or filter.</p>
                    {(search || activeFilter !== 'all') && (
                        <button
                            onClick={() => { clearSearch(); setActiveFilter('all'); }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                            Reset search & filters
                        </button>
                    )}
                </div>
            )}
            <p className="text-xs text-gray-400 text-right">Showing {filtered.length} of {pages.length} pages</p>
        </div>
    );
}
