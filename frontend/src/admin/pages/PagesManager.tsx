import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Pencil, X, Plus, Trash2, ExternalLink, Search, FileText, Layers, Building2, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/client';
import UnifiedPageEditor from '../components/UnifiedPageEditor';
import type { Page } from '../components/UnifiedPageEditor';

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
        { label: 'Campus Design & Execution Suite', badge: 'Master Planning, Turnkey Execution & Spatial Design', badgeColor: 'bg-stone-100 text-stone-800 border-stone-200', pages: sort(campusDesign) },
        { label: 'Classifieds & Opportunities Suite', badge: 'Institutions, Partnerships, Funding & Careers Hub', badgeColor: 'bg-stone-100 text-stone-800 border-stone-200', pages: sort(classifiedsSuite) },
        { label: 'Main Pages', badge: 'Primary navigation & utility pages', badgeColor: 'bg-stone-100 text-stone-800 border-stone-200', pages: sort(main) },
        { label: 'Category / Solution Pages', badge: 'Top-level category landing pages', badgeColor: 'bg-stone-100 text-stone-800 border-stone-200', pages: sort(category) },
        { label: 'Inner & Sub-Pages', badge: 'Detailed inner pages under categories', badgeColor: 'bg-stone-100 text-stone-800 border-stone-200', pages: sort(inner) },
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
        <div className={`bg-white rounded-xl border transition-all shadow-xs hover:shadow-sm overflow-hidden flex flex-col justify-between ${
            isEditing ? 'border-[#1e3a8a] ring-2 ring-[#1e3a8a]/10' : 'border-stone-200 hover:border-stone-300'
        }`}>
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                    {/* Header: Status, Template, and Dedicated Hub Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={onTogglePublish}
                                title="Toggle publish status"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    page.published
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200/80'
                                }`}
                            >
                                {page.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {page.published ? 'Live' : 'Draft'}
                            </button>
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                                {page.template === 'article' ? 'ARTICLE' : page.template === 'solution-hub' ? 'SOLUTION' : page.template === 'service-suite' ? 'SERVICE' : page.template ? 'REACT' : 'HTML'}
                            </span>
                            {page.slug === 'home' && (
                                <Link
                                    to="/admin/homepage-editor"
                                    className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-800 hover:bg-stone-200/80 border border-stone-200 px-2 py-0.5 rounded-md transition-colors"
                                    title="Open Dedicated Homepage Visual Editor"
                                >
                                    Visual Editor ↗
                                </Link>
                            )}
                            {page.slug === 'catalogues' && (
                                <>
                                    <Link
                                        to="/admin/catalogues"
                                        className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-800 hover:bg-stone-200/80 border border-stone-200 px-2 py-0.5 rounded-md transition-colors"
                                        title="Open PDF Catalogues Manager"
                                    >
                                        PDF Manager ↗
                                    </Link>
                                    <Link
                                        to="/admin/case-studies"
                                        className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-800 hover:bg-stone-200/80 border border-stone-200 px-2 py-0.5 rounded-md transition-colors"
                                        title="Open Case Studies & Projects Manager"
                                    >
                                        Case Studies ↗
                                    </Link>
                                </>
                            )}
                            {page.slug === 'colleges-universities-for-sale' && (
                                <Link
                                    to="/admin/colleges"
                                    className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-800 hover:bg-stone-200/80 border border-stone-200 px-2 py-0.5 rounded-md transition-colors"
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
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                                title="View live page in new tab"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            {!PROTECTED_SYSTEM_SLUGS.has(page.slug) && (
                                <button
                                    onClick={onDelete}
                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
                            <h3 className="font-bold text-stone-900 text-sm mb-1 leading-snug line-clamp-1" title={displayTitle}>
                                {displayTitle}
                            </h3>
                        );
                    })()}
                    <p className="text-xs text-stone-400 font-mono truncate" title={`/${page.slug}`}>
                        /{page.slug}
                    </p>

                    {/* Subpage / Deep Card Match Indicator (Issue #9) */}
                    {matchedSubpage && (
                        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-medium" title={`Found inside ${matchedSubpage}`}>
                            <Search className="w-3 h-3 text-stone-500 shrink-0" />
                            <span className="truncate">Found in {matchedSubpage}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Primary Action Buttons: Dual Split Row */}
            <div className="border-t border-stone-100 bg-stone-50/70 p-2.5 grid grid-cols-2 gap-2">
                <Link
                    to={`/admin/pages/${page.id}/edit`}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-xs"
                    title="Open full standalone page editor"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">Full Editor</span>
                </Link>
                <button
                    onClick={onToggleEdit}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer ${
                        isEditing
                            ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                            : 'bg-[#1e3a8a] text-white hover:bg-[#1e40af]'
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
                        <div className="h-8 w-56 bg-stone-200 rounded-lg" />
                        <div className="h-4 w-44 bg-stone-100 rounded-md" />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="h-10 w-full sm:w-80 bg-stone-100 rounded-lg" />
                        <div className="h-10 w-28 bg-stone-200 rounded-lg shrink-0" />
                    </div>
                </div>

                {/* Filter Chips Skeleton */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                    {[90, 160, 120, 150, 110].map((width, idx) => (
                        <div
                            key={idx}
                            className="h-8 rounded-lg bg-stone-100"
                            style={{ width: `${width}px` }}
                        />
                    ))}
                </div>
            </div>

            {/* 6-Card Shimmer Skeleton Grid */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-5 w-44 bg-stone-200 rounded-md" />
                    <div className="h-5 w-32 bg-stone-100 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col justify-between min-h-[160px]"
                        >
                            <div className="p-4 sm:p-5 flex-1 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-5 w-14 bg-stone-200 rounded-full" />
                                        <div className="h-4 w-12 bg-stone-100 rounded-md" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-6 w-6 bg-stone-100 rounded-lg" />
                                        <div className="h-6 w-6 bg-stone-100 rounded-lg" />
                                    </div>
                                </div>
                                <div className="h-5 w-3/4 bg-stone-200 rounded-md" />
                                <div className="h-3 w-1/2 bg-stone-100 rounded-md" />
                            </div>
                            <div className="border-t border-stone-100 bg-stone-50/70 p-3 grid grid-cols-2 gap-2">
                                <div className="h-8 bg-stone-200 rounded-lg" />
                                <div className="h-8 bg-stone-200 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface PageCreateError {
    response?: {
        data?: {
            error?: string;
            message?: string;
        };
    };
}

const INITIAL_GROUP_PAGE_LIMIT = 12;

// ─── Main Pages Manager ───────────────────────────────────────────────────────
export default function PagesManager() {
    const [searchParams, setSearchParams] = useSearchParams();
    const editSlug = searchParams.get('edit') || searchParams.get('slug');
    const [pages, setPages] = useState<Page[]>(() => pagesCache || []);
    const [loading, setLoading] = useState<boolean>(() => !pagesCache);
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const initialSlugProcessed = useRef<string | null>(null);

    // Group expansion state for "Show all (N)" functionality
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroupExpanded = (groupLabel: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupLabel]: !prev[groupLabel],
        }));
    };

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
        } catch (err: unknown) {
            console.error('Failed to create page:', err);
            const apiErr = err as PageCreateError;
            const msg = apiErr?.response?.data?.error || apiErr?.response?.data?.message || 'Failed to create page. A page with this slug may already exist.';
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
                badgeColor: 'bg-stone-100 text-stone-800 border-stone-200',
                pages: directMatches,
            });
        }
        if (contentMatches.length > 0) {
            searchGroups.push({
                label: 'Matched Inside Page Content & Cards',
                badge: 'Pages containing matching cards or sections',
                badgeColor: 'bg-stone-100 text-stone-800 border-stone-200',
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
                        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Pages Management</h1>
                        <p className="text-stone-500 text-sm mt-1">
                            <span className="font-semibold text-[#1e3a8a]">{pages.length}</span> total pages · organised by hierarchy
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search pages, cards, facilities…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="border border-stone-200 rounded-lg pl-10 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] w-full bg-white shadow-xs font-medium text-stone-900"
                            />
                            {search && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                                    title="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setCreating(v => !v)}
                            className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            {creating ? 'Cancel' : 'New Page'}
                        </button>
                    </div>
                </div>

                {/* Calm Filter Chips Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeFilter === 'all'
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        All Pages ({pages.length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('campus-design')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeFilter === 'campus-design'
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        Campus Design Suite ({pages.filter(p => CAMPUS_DESIGN_SLUGS.has(p.slug)).length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('classifieds')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeFilter === 'classifieds'
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        Classifieds Suite ({pages.filter(p => CLASSIFIEDS_SUITE_SLUGS.has(p.slug)).length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('main')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeFilter === 'main'
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        Main Navigation
                    </button>
                    <button
                        onClick={() => setActiveFilter('category')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeFilter === 'category'
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        Category / Solution Hubs
                    </button>
                    <button
                        onClick={() => setActiveFilter('inner')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeFilter === 'inner'
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                    >
                        Inner Sub-Pages
                    </button>
                    {debouncedSearch && (
                        <span className="text-xs font-semibold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 flex items-center gap-1.5">
                            <span>Matching: <strong>"{debouncedSearch}"</strong> ({filtered.length} found)</span>
                            <button onClick={clearSearch} className="text-[#1e3a8a] hover:underline ml-1 cursor-pointer">
                                Clear
                            </button>
                        </span>
                    )}
                </div>
            </div>

            {creating && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-md p-6 space-y-5 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div>
                            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Create New CMS Page</h3>
                            <p className="text-xs text-stone-500 mt-0.5">Choose layout structure and configure URL slug</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCreating(false)}
                            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Close modal"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Page Layout Mode Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">Select Page Type</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <button
                                type="button"
                                onClick={() => setNewPageType('article')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'article'
                                        ? 'border-[#1e3a8a] bg-stone-50/70 shadow-xs ring-2 ring-[#1e3a8a]/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'article' ? 'bg-[#1e3a8a] text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-stone-900">📄 Detail / Article Page</span>
                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">Group 1</span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                        For policies, guidelines, announcements, and deep-dive article reading. Features rich text editor and inquiry CTA.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('grid')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'grid'
                                        ? 'border-[#1e3a8a] bg-stone-50/70 shadow-xs ring-2 ring-[#1e3a8a]/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'grid' ? 'bg-[#1e3a8a] text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-stone-900">🗂️ Knowledge &amp; Guide Hub</span>
                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">Group 2</span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                        Interactive guides and directory cards (e.g. AI Guide, College Setup, UGC Guidelines). Features 12-card pagination.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('solution-hub')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'solution-hub'
                                        ? 'border-[#1e3a8a] bg-stone-50/70 shadow-xs ring-2 ring-[#1e3a8a]/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'solution-hub' ? 'bg-[#1e3a8a] text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-stone-900">🏟️ Solution Infrastructure Hub</span>
                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">Group 4</span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                        For physical campus infra, labs, libraries, and sports products. Includes wishlist heart engine and category filter.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('service-suite')}
                                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                    newPageType === 'service-suite'
                                        ? 'border-[#1e3a8a] bg-stone-50/70 shadow-xs ring-2 ring-[#1e3a8a]/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${newPageType === 'service-suite' ? 'bg-[#1e3a8a] text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    <Compass className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-stone-900">🏗️ Turnkey Service &amp; Execution</span>
                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">Group 5</span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                        For phased service delivery and architectural execution (e.g. Design &amp; Execution, Furniture Design). Features step badges.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">Page Title *</label>
                            <input
                                value={newTitle}
                                onChange={e => handleTitleChange(e.target.value)}
                                placeholder="e.g. Student Exchange Program"
                                className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] text-stone-900"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">URL Slug (Auto-generated if blank)</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">/</span>
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
                                    className="w-full border border-stone-300 rounded-lg pl-7 pr-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] text-stone-900"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => {
                                setCreating(false);
                                setNewTitle('');
                                setNewSlug('');
                                setSlugEdited(false);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={createPage}
                            disabled={!newTitle.trim()}
                            className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            {groups.map((group) => {
                const isExpanded = Boolean(expandedGroups[group.label]);
                const visiblePages = isExpanded ? group.pages : group.pages.slice(0, INITIAL_GROUP_PAGE_LIMIT);
                const hasMore = group.pages.length > INITIAL_GROUP_PAGE_LIMIT;

                return (
                    <div key={group.label} className="space-y-4">
                        {/* Group header */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-base font-bold text-stone-900">{group.label}</h2>
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                                {group.badge}
                            </span>
                            <span className="ml-auto text-xs text-stone-400 font-medium">{group.pages.length} pages</span>
                        </div>

                        {/* Pages Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {visiblePages.map(page => (
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

                        {/* Expander: Display 12 items initially per group with "Show all (N)" button */}
                        {hasMore && (
                            <div className="flex justify-center pt-1 pb-2">
                                <button
                                    type="button"
                                    onClick={() => toggleGroupExpanded(group.label)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUp className="w-3.5 h-3.5" />
                                            <span>Show fewer (12 of {group.pages.length})</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                            <span>Show all ({group.pages.length})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {filtered.length === 0 && (
                <div className="text-center py-16 text-stone-400 text-sm bg-white rounded-xl border border-dashed border-stone-200 space-y-2">
                    <p>No pages match your search or filter.</p>
                    {(search || activeFilter !== 'all') && (
                        <button
                            onClick={() => { clearSearch(); setActiveFilter('all'); }}
                            className="text-xs font-semibold text-[#1e3a8a] hover:underline cursor-pointer"
                        >
                            Reset search &amp; filters
                        </button>
                    )}
                </div>
            )}
            <p className="text-xs text-stone-400 text-right">Showing {filtered.length} of {pages.length} pages</p>
        </div>
    );
}
