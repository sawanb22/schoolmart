import { useRef, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Save, Plus, AlertCircle, Trash2, Link as LinkIcon, X, ArrowLeft, ArrowRight, FileText, Eye, EyeOff, Sparkles, Type, Palette, Layout, Sliders, Layers, ChevronUp, ChevronDown, Pencil, Check, Tag, FolderOpen, ExternalLink, Loader2, Upload, History, Globe } from 'lucide-react';
import api from '../api/client';
import MediaImageField from './MediaImageField';
import FurnitureCategorySwitchboard from './FurnitureCategorySwitchboard';
import HtmlRichTextEditor from './HtmlRichTextEditor';
import JobOpeningsEditorSection from './JobOpeningsEditorSection';
import CaseStudiesEditorSection from './CaseStudiesEditorSection';
import BlogEditorSection from './BlogEditorSection';
import FaqEditorSection from './FaqEditorSection';
import ItemsManager from './items/ItemsManager';
import CategoryManager from './items/CategoryManager';
import ConflictDialog from './items/ConflictDialog';
import HistoryPanel from './items/HistoryPanel';
import { clearPageDataCache, broadcastCmsInvalidation } from '@/hooks/usePageData';
import {
    normalizeCardHref as normalizeCardHrefCore,
    inspectCardLink as inspectCardLinkCore,
} from '@/lib/cms-routing';
import { resolveMediaUrl } from '@/lib/media-url';
import { resolveCtaButtonStyles, normalizeHexColor } from '@/lib/ctaStyles';

function slugifyCardTitle(title?: string): string {
    return (title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeColorHex(val?: string, fallback: string = '#000000'): string {
    if (!val) return fallback;
    const trimmed = val.trim();
    if (trimmed.startsWith('#')) {
        if (trimmed.length === 7) return trimmed;
        if (trimmed.length === 4) {
            return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
        }
    }
    const map: Record<string, string> = {
        paper: '#fbf9f5',
        white: '#ffffff',
        amber: '#fef3c7',
        slate: '#f1f5f9',
        blue: '#eff6ff',
        stone: '#0f172a',
    };
    return map[trimmed.toLowerCase()] || fallback;
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CardItem {
    title: string;
    description: string;
    image?: string;
    href?: string;
    category?: string;
    readTime?: string;
    categories?: string[];
    downloadLink?: string;
    location?: string;
    region?: string;
    rating?: string;
    sales?: string;
    margin?: string;
    askingPrice?: string;
    tag?: string;
    slug?: string;
    methodology?: string;
    methodologyHeading?: string;
    deliverablesHeading?: string;
    deliverables?: { title: string; desc: string; phaseLabel?: string }[];
    ctaTitle?: string;
    ctaSubtitle?: string;
    ctaButtonLabel?: string;
    ctaButtonHref?: string;
    ctaHref?: string;
    hideCta?: boolean;
    useCustomDetail?: boolean;
    detailContent?: string;
    enableShowcase?: boolean;
    beforeImages?: string[];
    afterImages?: string[];
    hideCompliance?: boolean;
    hideRelatedBlog?: boolean;
    active?: boolean;
    hideHero?: boolean;
    hideMethodology?: boolean;
    hideDeliverables?: boolean;
    hideActionBar?: boolean;
}

export interface MoreCardItem {
    title: string;
    category: string;
    description?: string;
    image?: string;
    href?: string;
}

export interface SectionItem {
    heading: string;
    body: string;
    bullets?: string[];
}

export interface PageData {
    pageTitle?: string;
    heroLabel?: string;
    heroEyebrow?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: string;
    heroButtonLabel?: string;
    heroButtonHref?: string;
    styles?: any;
    filterLabel?: string;
    sectionLabel?: string;
    sectionTitle?: string;
    sectionDescription?: string;
    section1Title?: string;
    section2Title?: string;
    section2Description?: string;
    latestTitle?: string;
    viewAllLabel?: string;
    readMoreLabel?: string;
    newsletterLabel?: string;
    newsletterTitle?: string;
    newsletterDescription?: string;
    newsletterPlaceholder?: string;
    newsletterButtonLabel?: string;
    featured?: {
        category?: string;
        eyebrow?: string;
        title?: string;
        description?: string;
        image?: string;
        href?: string;
        readMoreLabel?: string;
        exploreLabel?: string;
        postButtonLabel?: string;
        [key: string]: any;
    };
    brandName?: string;
    headerActionLabel?: string;
    headerActionHref?: string;
    navLinks?: string[];
    moreTitle?: string;
    moreCards?: MoreCardItem[];
    footerDescription?: string;
    footerColumns?: { title: string; links: string[] }[];
    copyright?: string;
    greenFeature?: { category?: string; title?: string; description?: string };
    smallFeature?: { category?: string; title?: string; image?: string; href?: string };
    greenTopics?: string[];
    categoriesTitle?: string;
    categoriesButtonLabel?: string;
    categories?: string[];
    ctaButtonLabel?: string;
    ctaHref?: string;
    ctaBtnBg?: string;
    ctaBtnText?: string;
    filters?: string[];
    ctaTitle?: string;
    ctaSubtitle?: string;
    cards?: CardItem[];
    section2Cards?: CardItem[];
    features?: string[];
    sections?: SectionItem[];
    featuredImage?: string;
    category?: string;
    body?: string;
    backHref?: string;
    backLabel?: string;
    caseStudies?: { title: string; description?: string; image?: string; slug?: string }[];
    ndaUrl?: string;
    mandateUrl?: string;
    [key: string]: any;
}

export interface Page {
    id: number;
    title: string;
    slug: string;
    template: string | null;
    published: boolean;
    pageData: string | null;
    contentModel?: string;
    version?: number;
    updatedAt?: string;
}

export function parsePageData(raw: string | null): PageData {
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

export const DEFAULT_SEARCH_OBJECTIVES = [
    { id: 'build-new', label: 'Build New Campus / Setup From Scratch' },
    { id: 'upgrade', label: 'Upgrade Existing Campus / Lab / Classroom' },
    { id: 'smart-campus', label: 'Smart Campus & Automation Setup' },
    { id: 'innovation', label: 'Innovation & Research Center / Incubation' },
    { id: 'accreditation', label: 'NAAC / NBA / NIRF Accreditation Readiness' },
    { id: 'admissions', label: 'Student Admissions, Outreach & Marketing' },
];

const EMPTY_DEFAULTS: Record<string, any> = Object.freeze({});

// ─── Small Helpers ────────────────────────────────────────────────────────────
function DocumentUploadField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (file: File) => {
        setUploading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.post('/pages/upload-document', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.url);
        } catch {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const currentFilename = value ? decodeURIComponent(value.split('/').pop() || '') : '';

    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white font-mono text-xs"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https://... or upload file"
                />
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-50"
                >
                    {uploading ? 'Uploading...' : 'Upload PDF'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                />
            </div>
            {value && (
                <div className="flex items-center gap-2 pt-1 text-xs text-blue-600">
                    <span className="font-semibold text-gray-500">Current file:</span>
                    <a
                        href={resolveMediaUrl(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline truncate max-w-md font-medium hover:text-blue-800"
                        title={currentFilename}
                    >
                        {currentFilename}
                    </a>
                </div>
            )}
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
        </div>
    );
}

function LogoUploadField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (file: File) => {
        setError('');
        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const isSvgOrPng = ext === '.svg' || ext === '.png' || file.type === 'image/svg+xml' || file.type === 'image/png';
        if (!isSvgOrPng) {
            setError('Only SVG and PNG files are allowed.');
            return;
        }

        const MAX_SIZE = 500 * 1024; // 500 KB
        if (file.size > MAX_SIZE) {
            const kb = (file.size / 1024).toFixed(0);
            setError(`File is ${kb} KB. Logos must be under 500 KB. Please compress the file.`);
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('media', file);
            formData.append('image', file);
            const { data } = await api.post('/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.url);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Logo upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste logo URL or upload SVG/PNG"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".svg,.png,image/svg+xml,image/png"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = '';
                    }}
                />
            </div>
            {error && <p className="text-[11px] font-semibold text-red-500">{error}</p>}
            {value && (
                <div className="relative mt-2 p-2 rounded-xl border border-gray-200 bg-slate-50 flex items-center justify-center h-16 overflow-hidden">
                    <img
                        src={resolveMediaUrl(value)}
                        alt="Logo preview"
                        className="max-h-12 max-w-full object-contain"
                    />
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-1.5 top-1.5 p-1 rounded-full bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 transition"
                        title="Remove logo"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    onBlur,
    multiline = false,
    placeholder = '',
    hint = '',
    richText = false,
    rows = 3,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    multiline?: boolean;
    placeholder?: string;
    hint?: string;
    richText?: boolean;
    rows?: number;
}) {
    if (richText) {
        return (
            <HtmlRichTextEditor
                label={label}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                helperText={hint}
                rows={rows}
            />
        );
    }
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 flex items-center justify-between">
                {label}
                {hint && (
                    <span className="text-gray-400 font-normal text-[10px] uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
                        {hint}
                    </span>
                )}
            </label>
            {multiline ? (
                <textarea
                    rows={rows}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm bg-white"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
}

function CardCategoriesField({
    categories = [],
    availableCategories = [],
    onChange,
    pageSlug,
}: {
    categories?: string[];
    availableCategories: string[];
    onChange: (cats: string[]) => void;
    onAddGlobalCategory?: (cat: string) => void;
    pageSlug?: string;
}) {
    const currentCats = Array.isArray(categories) ? categories : [];

    const handleToggle = (cat: string) => {
        if (currentCats.some((c) => c.toLowerCase() === cat.toLowerCase())) {
            onChange(currentCats.filter((c) => c.toLowerCase() !== cat.toLowerCase()));
        } else {
            onChange([...currentCats, cat]);
        }
    };

    return (
        <div className="space-y-2 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Categories (Card Filter Chips)
                </label>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-2 py-0.5 rounded-full">
                    {currentCats.length} assigned
                </span>
            </div>

            {availableCategories.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-2">
                    <span>No categories registered for this page yet. Use the central Categories page to add them.</span>
                    {pageSlug && (
                        <a
                            href={`/admin/categories?page=${pageSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                        >
                            Open Categories Manager &rarr;
                        </a>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 font-medium">
                        Click category pills below to toggle them on/off for this card:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableCategories.map((cat) => {
                            const isAssigned = currentCats.some((c) => c.toLowerCase() === cat.toLowerCase());
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleToggle(cat)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isAssigned
                                            ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    {isAssigned ? (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    <span>{cat}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Normalizes card hrefs to ensure internal subpages have a leading slash ───
export function normalizeCardHref(raw?: string): string {
    return normalizeCardHrefCore(raw);
}

// ─── Dynamic Card Link Inspection Helper ────────────────────────────────────
export function inspectCardLink(rawLink?: string) {
    return inspectCardLinkCore(rawLink);
}

export const CLASSIFIEDS_KNOWN_SUBPAGE_SLUGS = new Set([
    'colleges-universities-for-sale',
    'partner-with-colleges',
    'job-openings',
]);

// ─── Main Unified Page Editor ────────────────────────────────────────────────
export default function UnifiedPageEditor({
    page,
    allPages: propAllPages,
    onClose,
    onSaved,
    onSelectPage: _onSelectPage,
    isStandalone = false,
    targetCardSlug: propTargetCardSlug,
}: {
    page: Page;
    allPages?: Page[];
    onClose?: () => void;
    onSaved?: (updated: Page) => void;
    onSelectPage?: (page: Page) => void;
    isStandalone?: boolean;
    targetCardSlug?: string;
}) {
    const isStructured = page.contentModel === 'structured';
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const urlCardSlug = searchParams.get('card') || undefined;
    const targetCardSlug = propTargetCardSlug || urlCardSlug;

    const [conflictCurrentPage, setConflictCurrentPage] = useState<any>(null);
    const [showPageConflictDialog, setShowPageConflictDialog] = useState(false);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const [showSeoSection, setShowSeoSection] = useState(false);

    const isAboutUs = page.slug === 'about-us' || page.slug === 'corporate';
    const isContactUs = page.slug === 'contact-us';
    const isBlog = page.slug === 'blog';
    const isFaq = page.slug === 'faq';

    const [fetchedPages, setFetchedPages] = useState<Page[]>([]);
    useEffect(() => {
        if (!propAllPages || propAllPages.length === 0) {
            api.get('/pages')
                .then(({ data }) => {
                    if (Array.isArray(data)) setFetchedPages(data);
                })
                .catch((err) => console.warn('[UnifiedPageEditor] Failed to fetch /pages for hook dropdown:', err));
        }
    }, [propAllPages]);
    const allPages = propAllPages && propAllPages.length > 0 ? propAllPages : fetchedPages;

    const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);


    const [slugValidationErrors, setSlugValidationErrors] = useState<Record<number, string>>({});

    const handleEditSubpage = async (card: any, index: number) => {
        void handleEditSubpage;
        const rawTarget = (card.slug || card.href || card.link || '').trim();
        const cleanSlug = rawTarget.replace(/^\/+|\/+$/g, '').split(/[?#]/)[0];

        if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('tel:') || rawTarget.startsWith('#')) {
            setSlugValidationErrors(prev => ({
                ...prev,
                [index]: `This card points to an external link or anchor ("${rawTarget}"). Subpages can only be edited for internal CMS pages.`
            }));
            setExpandedCardIndex(index);
            return;
        }

        if (!cleanSlug) {
            setSlugValidationErrors(prev => ({
                ...prev,
                [index]: 'Please enter a URL slug or hook this card to an existing page before editing its subpage.'
            }));
            setExpandedCardIndex(index);
            return;
        }

        setSlugValidationErrors(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
        });

        const leafSlug = cleanSlug.split('/').pop() || cleanSlug;
        const matched = allPages.find((p: any) =>
            p.slug === cleanSlug ||
            p.slug === leafSlug ||
            p.slug === `${page.slug}-${leafSlug}` ||
            p.slug === `${page.slug}-${cleanSlug}` ||
            ('/' + p.slug) === rawTarget ||
            p.slug === rawTarget
        );

        if (matched) {
            window.open(`/admin/pages?edit=${encodeURIComponent(matched.slug)}`, '_blank');
            return;
        }

        // Auto-create article page if not existing yet so the admin can write its content immediately in a new tab
        const newTab = window.open('about:blank', '_blank');
        try {
            const subpageTitle = card.title?.trim() || leafSlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const initialArticleData = {
                heroTitle: subpageTitle,
                heroSubtitle: card.description ? card.description.replace(/<[^>]+>/g, '').slice(0, 160) : '',
                body: card.description || '',
                template: 'article',
                featuredImage: card.image || '',
            };
            const res = await api.post('/pages', {
                title: subpageTitle,
                slug: cleanSlug,
                template: 'article',
                published: true,
                pageData: JSON.stringify(initialArticleData),
            });
            if (res.data) {
                if (newTab) {
                    newTab.location.href = `/admin/pages?edit=${encodeURIComponent(res.data.slug)}`;
                } else {
                    window.open(`/admin/pages?edit=${encodeURIComponent(res.data.slug)}`, '_blank');
                }
            }
        } catch (err: any) {
            if (newTab) newTab.close();
            console.error('[UnifiedPageEditor] Failed to open subpage article:', err);
            setSlugValidationErrors(prev => ({
                ...prev,
                [index]: `Subpage "${cleanSlug}" could not be opened: ${err?.response?.data?.error || err.message || 'Please check your connection.'}`
            }));
            setExpandedCardIndex(index);
        }
    };

    const [title, setTitle] = useState(page.title);
    const [published, setPublished] = useState(page.published);

    const defaultAboutUs = {
        heroBadge: 'Est. 2017',
        heroTitle: 'About SchoolMart',
        heroSubtitle:
            'We are a consortium of architects, designers, and campus innovators who strive to bring learning outcomes through the latest infrastructure and edtech solutions.',
        stats: [
            { value: '4000+', label: 'Partner Campuses' },
            { value: '7+', label: 'Years of Experience' },
            { value: '100%', label: 'Client Satisfaction' },
            { value: '50+', label: 'Awards Won' },
        ],
        missionBadge: '/ Mission Statement',
        missionTitle: 'Our Mission',
        missionBody1:
            'To transform educational infrastructure across India by providing comprehensive campus solutions that blend physical spaces with cutting-edge digital technology. We aim to create learning environments that inspire, engage, and empower students and educators alike.',
        missionBody2:
            'As the first company in Asia to bring curriculum-mapped innovations to the campus industry, we continue to lead the way in educational transformation.',
        missionTag: 'Designing Tomorrow',
        missionImage: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
        whyBulletsBadge: '/ Highlights',
        whyBulletsTitle: 'Why Sign Up Bullets',
        whyBullets: [
            "India's leading Consortium for Campus Infrastructure",
            'Bespoke Design to Delivery across 100+ categories',
            'Strategic Planning for new Campuses from scratch',
            '4000+ Partner Campuses across India',
            'Exclusive access to global educational brands',
            'NEP 2020 aligned innovation & digital tools',
        ],
        section2Title: 'Our Core Values',
        values: [
            {
                title: 'Partnership',
                description: 'We believe in building long-term partnerships with educational institutions.',
            },
            {
                title: 'Innovation',
                description: 'Constantly evolving to bring the latest technology and design to campuses.',
            },
            {
                title: 'Excellence',
                description: 'Committed to delivering the highest quality in every project we undertake.',
            },
        ],
        teamTitle: 'Governance & Leadership',
        teamSubtitle: 'Driven by a vision to revolutionize the Indian educational landscape.',
        teamTag: 'Executive Team',
        team: [
            {
                name: 'Rajesh Kumar',
                role: 'Founder & CEO',
                image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            },
            {
                name: 'Priya Sharma',
                role: 'Chief Design Officer',
                image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            },
            {
                name: 'Amit Patel',
                role: 'Head of Operations',
                image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            },
        ],
        ecosystemTitle: 'Global Ecosystem',
        ecosystemSubtitle: 'Our strength lies in our network of global partners who bring the best of edtech and infrastructure to Indian soil.',
        partnerLogos: [] as Array<{ name: string; image: string; href?: string }>,
        partnerRows: [] as Array<any>,
    };

    const defaultBlog = {
        heroEyebrow: 'SchoolMart Articles & Guides',
        heroTitle: 'Campus Insights & Ideas',
        heroSubtitle:
            'Practical guidance on campus design, technology, and infrastructure — written for principals, administrators and facility teams building better institutions.',
        newsletterLabel: 'Stay curious',
        newsletterTitle: 'Good ideas, occasionally.',
        newsletterDescription:
            'Get useful campus infrastructure perspectives, new trends, and practical stories delivered to your inbox. No noise, just things worth reading.',
        hideHero: false,
        hideFeatured: false,
        hideArticles: false,
        hideNewsletter: false,
    };

    const parsedData = parsePageData(page.pageData);
    const hasData = Boolean(parsedData && typeof parsedData === 'object' && Object.keys(parsedData).length > 0);
    const effectiveDefaults: Record<string, any> = isAboutUs ? defaultAboutUs : isBlog ? defaultBlog : EMPTY_DEFAULTS;

    const initialData: PageData = hasData
        ? parsedData
        : isAboutUs
            ? defaultAboutUs
            : isBlog
                ? defaultBlog
                : {
                    heroTitle: page.title || '',
                    cards: [],
                    styles: {
                        headingFont: 'playfair',
                        bodyFont: 'opensans',
                        primaryColor: '#ea580c',
                        heroBg: 'amber',
                        ctaBg: 'stone',
                        heroLayout: 'split-right',
                        cardColumns: '3',
                        showFeatured: true,
                        showFilters: true,
                    },
                };

    const initialSanitizedData: PageData = useMemo(() => {
        const raw = initialData;
        if (!raw || typeof raw !== 'object') return raw;
        return {
            ...raw,
            cards: Array.isArray(raw.cards) ? raw.cards.filter(Boolean) : raw.cards,
            section2Cards: Array.isArray(raw.section2Cards) ? raw.section2Cards.filter(Boolean) : raw.section2Cards,
            moreCards: Array.isArray(raw.moreCards) ? raw.moreCards.filter(Boolean) : raw.moreCards,
        };
    }, [initialData]);

    const [data, setData] = useState<PageData>(initialSanitizedData);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [searchObjectives, setSearchObjectives] = useState<{ id: string; label: string }[]>(DEFAULT_SEARCH_OBJECTIVES);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const searchParams = new URLSearchParams(window.location.search);
        const cardTarget = searchParams.get('card');
        const cardsList = Array.isArray(data?.cards) ? data.cards : [];
        if (cardTarget && cardsList.length > 0) {
            const cleanTarget = cardTarget.trim().toLowerCase();
            const matchedIdx = cardsList.findIndex((c: any) => {
                if (!c) return false;
                const s = (c.slug || '').trim().toLowerCase();
                const t = slugifyCardTitle(c.title || '');
                const h = (c.href || '').trim().toLowerCase();
                return s === cleanTarget || t === cleanTarget || h.endsWith('/' + cleanTarget);
            });
            if (matchedIdx !== -1) {
                setExpandedCardIndex(matchedIdx);
            }
        }
    }, [data?.cards]);

    useEffect(() => {
        let alive = true;
        api.get('/content').then(({ data: siteContent }) => {
            if (!alive || !siteContent) return;
            if (siteContent.home_search_objectives) {
                try {
                    const parsed = typeof siteContent.home_search_objectives === 'string'
                        ? JSON.parse(siteContent.home_search_objectives)
                        : siteContent.home_search_objectives;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSearchObjectives(parsed.map((item: any) => ({
                            id: item.id || item.slug || '',
                            label: item.label || item.id || '',
                        })));
                    }
                } catch (err) {
                    console.error('Failed to parse search objectives in editor:', err);
                }
            }
        }).catch(() => {});
        return () => { alive = false; };
    }, []);

    const isArticleFormula =
        parsedData?.template === 'article' ||
        page.template === 'article' ||
        (page.template !== 'grid' &&
            (page.slug === 'how-it-works' ||
             page.slug === 'brand-help' ||
             page.slug === 'sell-on-schoolmart' ||
             page.slug === 'sell-on-campusmart' ||
             page.slug === '20-stunning-college-buildings' ||
             page.slug === 'academic-buildings' ||
             page.slug === 'research-facilities' ||
             page.slug === 'student-life-centers' ||
             (Boolean(parsedData?.body) && (!parsedData?.cards || parsedData.cards.length === 0))));

    const [layoutMode, setLayoutMode] = useState<'article' | 'grid'>(isArticleFormula ? 'article' : 'grid');
    const isArticlePage = layoutMode === 'article';

    useEffect(() => {
        const nextIsArticle =
            parsedData?.template === 'article' ||
            page.template === 'article' ||
            (page.template !== 'grid' &&
                (page.slug === 'how-it-works' ||
                 page.slug === 'brand-help' ||
                 page.slug === 'sell-on-schoolmart' ||
                 page.slug === 'sell-on-campusmart' ||
                 page.slug === '20-stunning-college-buildings' ||
                 page.slug === 'academic-buildings' ||
                 page.slug === 'research-facilities' ||
                 page.slug === 'student-life-centers' ||
                 (Boolean(parsedData?.body) && (!parsedData?.cards || parsedData.cards.length === 0))));
        setLayoutMode(nextIsArticle ? 'article' : 'grid');
    }, [page.id, page.slug, page.template]);

    const handleLayoutModeChange = (mode: 'article' | 'grid') => {
        setLayoutMode(mode);
        page.template = mode;
        setData((prev) => ({
            ...prev,
            template: mode,
            ...(mode === 'grid' && !Array.isArray(prev.cards) ? { cards: [] } : {}),
            ...(mode === 'article' && (prev.body === undefined || prev.body === '') ? {
                body: `<p>Welcome to <strong>${title || page.title}</strong>. Add your comprehensive page description, details, specifications, and insights here using the rich text editor.</p>`,
                category: prev.category || prev.heroEyebrow || '',
                ctaTitle: prev.ctaTitle || '',
                ctaSubtitle: prev.ctaSubtitle || '',
                ctaButtonLabel: prev.ctaButtonLabel || '',
                ctaHref: prev.ctaHref || '/contact-us',
            } : {})
        }));
    };

    // Classifieds & Opportunities Suite dynamic routing computation
    const isClassifiedsSuite = page.slug === 'classifieds' || CLASSIFIEDS_KNOWN_SUBPAGE_SLUGS.has(page.slug);

    const classifiedsSuiteSubpages = useMemo(() => {
        const defaultMap = new Map<string, string>([
            ['classifieds', 'Classifieds Hub'],
            ['colleges-universities-for-sale', 'Colleges for Sale'],
            ['partner-with-colleges', 'Partnership'],
            ['job-openings', 'Job Openings'],
        ]);

        // If on classifieds hub, dynamically discover all internal subpages linked by cards
        if (page.slug === 'classifieds' && Array.isArray(data.cards)) {
            data.cards.filter(Boolean).forEach((c: any) => {
                const info = inspectCardLink(c?.href ?? c?.link);
                if (info.type === 'internal' && info.slug && !defaultMap.has(info.slug)) {
                    defaultMap.set(info.slug, c?.title || info.slug);
                }
            });
        }

        return Array.from(defaultMap.entries()).map(([slug, label]) => ({
            slug,
            label,
        }));
    }, [page.slug, data.cards]);
 
    // Live synchronization: hydrate contact channels from /api/content when editing contact-us or faq
    useEffect(() => {
        if (isContactUs || isFaq) {
            api.get('/content')
                .then(({ data: siteContent }) => {
                    if (!siteContent || typeof siteContent !== 'object') return;
                    setData((prev) => {
                        const next = { ...prev };
                        if (isContactUs) {
                            if (siteContent.contact_phone !== undefined) next.contact_phone = siteContent.contact_phone;
                            if (siteContent.contact_phone_alt !== undefined) next.contact_phone_alt = siteContent.contact_phone_alt;
                            if (siteContent.contact_email !== undefined) next.contact_email = siteContent.contact_email;
                            if (siteContent.contact_email_alt !== undefined) next.contact_email_alt = siteContent.contact_email_alt;
                            if (siteContent.contact_whatsapp !== undefined) next.contact_whatsapp = siteContent.contact_whatsapp;
                            if (siteContent.contact_hours !== undefined) next.contact_hours = siteContent.contact_hours;
                            if (siteContent.contact_address !== undefined) next.contact_address = siteContent.contact_address;
                        }
                        if (isFaq) {
                            if (!Array.isArray(parsedData.faqs) && siteContent.home_faqs !== undefined) {
                                try {
                                    const parsedFaqs = typeof siteContent.home_faqs === 'string'
                                        ? JSON.parse(siteContent.home_faqs)
                                        : siteContent.home_faqs;
                                    if (Array.isArray(parsedFaqs) && parsedFaqs.length > 0) {
                                        next.faqs = parsedFaqs;
                                    }
                                } catch {
                                    // Keep default faqs on parse error
                                }
                            }
                            if (!parsedData.contact_phone && siteContent.contact_phone) {
                                next.contact_phone = siteContent.contact_phone;
                            }
                            if (!parsedData.contact_email && siteContent.contact_email) {
                                next.contact_email = siteContent.contact_email;
                            }
                        }
                        return next;
                    });
                })
                .catch((err) => {
                    console.warn('[UnifiedPageEditor] Failed to hydrate content channels from /api/content:', err);
                });
        }
    }, [isContactUs, isFaq]);

    const updateContactChannel = (key: string, value: string) => {
        setData((prev) => {
            const next = { ...prev, [key]: value };
            if (Array.isArray(next.cards) && next.cards.length > 0) {
                const nextCards = [...next.cards];
                const p1 = key === 'contact_phone' ? value : (next.contact_phone || '');
                const p2 = key === 'contact_phone_alt' ? value : (next.contact_phone_alt || '');
                const pDisp = p2 ? `${p1}\n${p2}` : p1;

                const e1 = key === 'contact_email' ? value : (next.contact_email || '');
                const e2 = key === 'contact_email_alt' ? value : (next.contact_email_alt || '');
                const eDisp = e2 ? `${e1}\n${e2}` : e1;

                const hDisp = key === 'contact_hours' ? value : (next.contact_hours || '');

                const pIdx = nextCards.findIndex(c => (c?.title || '').toLowerCase().includes('phone'));
                if (pIdx !== -1 && (key === 'contact_phone' || key === 'contact_phone_alt')) {
                    nextCards[pIdx] = { ...nextCards[pIdx], description: pDisp };
                }

                const eIdx = nextCards.findIndex(c => (c?.title || '').toLowerCase().includes('email'));
                if (eIdx !== -1 && (key === 'contact_email' || key === 'contact_email_alt')) {
                    nextCards[eIdx] = { ...nextCards[eIdx], description: eDisp };
                }

                const hIdx = nextCards.findIndex(c => (c?.title || '').toLowerCase().includes('hour') || (c?.title || '').toLowerCase().includes('working'));
                if (hIdx !== -1 && key === 'contact_hours') {
                    nextCards[hIdx] = { ...nextCards[hIdx], description: hDisp };
                }

                next.cards = nextCards;
            }
            return next;
        });
    };

    // Starter Template Modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateMode, setTemplateMode] = useState<'append' | 'replace'>('append');

    const handleApplyStarterTemplate = () => {
        if (!effectiveDefaults || Object.keys(effectiveDefaults).length === 0) {
            alert('No starter template defaults found for this page.');
            setShowTemplateModal(false);
            return;
        }

        if (templateMode === 'replace') {
            const cloned = structuredClone(effectiveDefaults);
            setData(cloned);
            setShowTemplateModal(false);
            return;
        }

        // Mode: 'append' (Safe, Non-Destructive)
        // 1. Preserve user-created cards at the top and only append non-duplicate sample cards
        const currentCards = Array.isArray(data.cards) ? [...data.cards] : [];
        const sampleCards = Array.isArray(effectiveDefaults.cards) ? effectiveDefaults.cards : [];

        const existingTitles = new Set(
            currentCards
                .map((c: any) => (c?.title || '').trim().toLowerCase())
                .filter(Boolean)
        );

        const nonDuplicateSamples = sampleCards.filter((sample: any) => {
            const titleKey = (sample?.title || '').trim().toLowerCase();
            return !existingTitles.has(titleKey);
        });

        const mergedCards = [...currentCards, ...structuredClone(nonDuplicateSamples)];

        // 2. Additional card sets deduplication
        let mergedSection2Cards = data.section2Cards;
        if (Array.isArray(effectiveDefaults.section2Cards)) {
            const current = Array.isArray(data.section2Cards) ? [...data.section2Cards] : [];
            const existingS2Titles = new Set(current.map((c: any) => (c?.title || '').trim().toLowerCase()).filter(Boolean));
            const nonDup = effectiveDefaults.section2Cards.filter((s: any) => !existingS2Titles.has((s?.title || '').trim().toLowerCase()));
            mergedSection2Cards = [...current, ...structuredClone(nonDup)];
        }

        let mergedCaseStudies = data.caseStudies;
        if (Array.isArray(effectiveDefaults.caseStudies)) {
            const current = Array.isArray(data.caseStudies) ? [...data.caseStudies] : [];
            const existingCSTitles = new Set(current.map((c: any) => (c?.title || '').trim().toLowerCase()).filter(Boolean));
            const nonDup = effectiveDefaults.caseStudies.filter((s: any) => !existingCSTitles.has((s?.title || '').trim().toLowerCase()));
            mergedCaseStudies = [...current, ...structuredClone(nonDup)];
        }

        let mergedMoreCards = data.moreCards;
        if (Array.isArray(effectiveDefaults.moreCards)) {
            const current = Array.isArray(data.moreCards) ? [...data.moreCards] : [];
            const existingMoreTitles = new Set(current.map((c: any) => (c?.title || '').trim().toLowerCase()).filter(Boolean));
            const nonDup = effectiveDefaults.moreCards.filter((s: any) => !existingMoreTitles.has((s?.title || '').trim().toLowerCase()));
            mergedMoreCards = [...current, ...structuredClone(nonDup)];
        }

        // 3. Backfill empty scalar properties from effectiveDefaults without overwriting existing non-empty values
        const mergedData: PageData = { ...data };
        Object.entries(effectiveDefaults).forEach(([key, val]) => {
            if (key === 'cards' || key === 'section2Cards' || key === 'caseStudies' || key === 'moreCards') return;
            if (mergedData[key] === undefined || mergedData[key] === null || mergedData[key] === '') {
                mergedData[key] = structuredClone(val);
            }
        });

        if (Array.isArray(effectiveDefaults.cards)) {
            mergedData.cards = mergedCards;
        }
        if (Array.isArray(effectiveDefaults.section2Cards)) {
            mergedData.section2Cards = mergedSection2Cards;
        }
        if (Array.isArray(effectiveDefaults.caseStudies)) {
            mergedData.caseStudies = mergedCaseStudies;
        }
        if (Array.isArray(effectiveDefaults.moreCards)) {
            mergedData.moreCards = mergedMoreCards;
        }

        setData(mergedData);
        setShowTemplateModal(false);
    };

    const set = (key: string, value: any) => setData((p: any) => ({ ...p, [key]: value }));
    const setStyle = (key: string, value: any) => {
        setData((p: any) => ({
            ...p,
            styles: {
                ...(p.styles || {}),
                [key]: value,
            },
        }));
    };

    /**
     * Resilient DOM scroll & focus utility adhering to SRP.
     * Smoothly navigates the viewport (window or modal container) to newly added cards
     * and focuses the primary text field for zero-friction editing.
     */
    const scrollToAndFocusNewItem = (elementId: string) => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                const el = document.getElementById(elementId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const firstInput = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                        'input[type="text"], textarea'
                    );
                    if (firstInput) {
                        firstInput.focus();
                        firstInput.select();
                    }
                }
            }, 80);
        });
    };

    // Generic Handlers
    const updateCard = (i: number, patch: Record<string, any>) => {
        setData((prev: any) => {
            const currentCards = Array.isArray(prev.cards) ? [...prev.cards] : [];
            if (!currentCards[i]) return prev;
            currentCards[i] = { ...currentCards[i], ...patch };
            return { ...prev, cards: currentCards };
        });
    };
    const setCard = (i: number, field: string, val: any) => {
        updateCard(i, { [field]: val });
    };
    const addCard = () => {
        const nextIndex = (data.cards ?? []).length;
        const newCardObj = page.slug === 'classifieds'
            ? { title: 'New Opportunity', description: '', category: 'Institutions', href: '' }
            : { title: 'New Card', description: '', href: '' };
        set('cards', [...(data.cards ?? []), newCardObj]);
        setExpandedCardIndex(nextIndex);
        scrollToAndFocusNewItem(`card-item-${nextIndex}`);
    };
    const removeCard = (i: number) => {
        set('cards', (data.cards ?? []).filter((_: any, idx: number) => idx !== i));
        if (expandedCardIndex === i) {
            setExpandedCardIndex(null);
        } else if (expandedCardIndex !== null && expandedCardIndex > i) {
            setExpandedCardIndex(expandedCardIndex - 1);
        }
    };

    const setFeatured = (field: string, value: string) => set('featured', { ...(data.featured ?? {}), [field]: value });

    const setUgcArrayItem = (key: string, i: number, value: string) => {
        const values = [...(data[key] ?? [])];
        values[i] = value;
        set(key, values);
    };
    const addUgcArrayItem = (key: string, value: string) => set(key, [...(data[key] ?? []), value]);
    const removeUgcArrayItem = (key: string, i: number) => set(key, (data[key] ?? []).filter((_: string, idx: number) => idx !== i));

    const handleAddGlobalCategory = (catName: string) => {
        const trimmed = catName.trim();
        if (!trimmed) return;
        const currentCats = Array.isArray(data.categories) ? data.categories : [];
        if (!currentCats.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) {
            set('categories', [...currentCats, trimmed]);
        }
    };

    const handleRemoveGlobalCategory = (catToRemove: string) => {
        const target = catToRemove.trim().toLowerCase();
        const currentCats = (Array.isArray(data.categories) ? data.categories : []).filter(
            (c: string) => c.trim().toLowerCase() !== target
        );
        const currentFilters = (Array.isArray(data.filters) ? data.filters : []).filter(
            (c: string) => c.trim().toLowerCase() !== target
        );
        const updatedCards = (data.cards ?? []).map((card: any) => {
            const next = { ...card };
            if (Array.isArray(card.categories)) {
                next.categories = card.categories.filter((c: string) => c.trim().toLowerCase() !== target);
            }
            if (typeof card.category === 'string' && card.category.trim().toLowerCase() === target) {
                next.category = '';
            }
            return next;
        });
        set('categories', currentCats);
        if (Array.isArray(data.filters)) {
            set('filters', currentFilters);
        }
        set('cards', updatedCards);
    };

    const setFilter = (i: number, value: string) => {
        const filters = [...(data.filters ?? [])];
        filters[i] = value;
        set('filters', filters);
    };
    const addFilter = () => set('filters', [...(data.filters ?? []), 'New filter']);
    const removeFilter = (i: number) => set('filters', (data.filters ?? []).filter((_: string, idx: number) => idx !== i));

    const setSection2Card = (i: number, field: string, val: any) => {
        const cards = [...(data.section2Cards ?? [])];
        cards[i] = { ...cards[i], [field]: val };
        set('section2Cards', cards);
    };
    const addSection2Card = () => {
        const nextIndex = (data.section2Cards ?? []).length;
        set('section2Cards', [...(data.section2Cards ?? []), { title: 'New Card', description: '' }]);
        scrollToAndFocusNewItem(`section2-card-item-${nextIndex}`);
    };
    const removeSection2Card = (i: number) => set('section2Cards', (data.section2Cards ?? []).filter((_: any, idx: number) => idx !== i));

    const setSection = (i: number, field: string, value: any) => {
        const sections = [...(data.sections ?? [])];
        sections[i] = { ...sections[i], [field]: value };
        set('sections', sections);
    };
    const addSection = () => {
        const nextIndex = (data.sections ?? []).length;
        set('sections', [...(data.sections ?? []), { heading: 'New Section', body: '', bullets: [] }]);
        scrollToAndFocusNewItem(`section-item-${nextIndex}`);
    };
    const removeSection = (i: number) => set('sections', (data.sections ?? []).filter((_: any, idx: number) => idx !== i));

    const setHighlightBullet = (i: number, v: string) => {
        const bullets = [...(data.highlightBullets ?? [])];
        bullets[i] = v;
        set('highlightBullets', bullets);
    };
    const addHighlightBullet = () => set('highlightBullets', [...(data.highlightBullets ?? []), 'New highlight bullet']);
    const removeHighlightBullet = (i: number) => set('highlightBullets', (data.highlightBullets ?? []).filter((_: any, idx: number) => idx !== i));

    // About Us Methods
    const setStat = (i: number, field: string, val: string) => {
        const s = [...(data.stats ?? defaultAboutUs.stats)];
        s[i] = { ...(s[i] || {}), [field]: val };
        set('stats', s);
    };
    const addStat = () => {
        const s = [...(data.stats ?? defaultAboutUs.stats)];
        set('stats', [...s, { value: '100+', label: 'New Metric' }]);
    };
    const removeStat = (i: number) => {
        const s = [...(data.stats ?? defaultAboutUs.stats)];
        set('stats', s.filter((_: any, idx: number) => idx !== i));
    };

    const setValueItem = (i: number, field: string, val: string) => {
        const v = [...(data.values ?? defaultAboutUs.values)];
        v[i] = { ...(v[i] || {}), [field]: val };
        set('values', v);
    };
    const addValueItem = () => {
        const v = [...(data.values ?? defaultAboutUs.values)];
        set('values', [...v, { title: 'New Core Value', description: '' }]);
    };
    const removeValueItem = (i: number) => {
        const v = [...(data.values ?? defaultAboutUs.values)];
        set('values', v.filter((_: any, idx: number) => idx !== i));
    };

    const setWhyBullet = (i: number, v: string) => {
        const w = [...(data.whyBullets ?? [])];
        w[i] = v;
        set('whyBullets', w);
    };
    const addWhyBullet = () => set('whyBullets', [...(data.whyBullets ?? []), 'New bullet point']);
    const removeWhyBullet = (i: number) => set('whyBullets', (data.whyBullets ?? []).filter((_: any, idx: number) => idx !== i));

    const setTeamMember = (i: number, field: string, val: string) => {
        const t = [...(data.team ?? [])];
        t[i] = { ...t[i], [field]: val };
        set('team', t);
    };
    const addTeamMember = () => {
        const nextIndex = (data.team ?? []).length;
        set('team', [...(data.team ?? []), { name: 'Name', role: 'Role', image: '' }]);
        scrollToAndFocusNewItem(`team-item-${nextIndex}`);
    };
    const removeTeamMember = (i: number) => set('team', (data.team ?? []).filter((_: any, idx: number) => idx !== i));
    const moveTeamMember = (from: number, to: number) => {
        const current = [...(data.team ?? [])];
        if (from < 0 || from >= current.length || to < 0 || to >= current.length || from === to) return;
        const [moved] = current.splice(from, 1);
        current.splice(to, 0, moved);
        set('team', current);
    };

    // ─── DYNAMIC PARTNER TIERS & CATEGORY ROW BUILDER MUTATORS ───
    const addPartnerRow = () => {
        const rows = [...(data.partnerRows ?? [])];
        const newRow = {
            id: 'row-' + Date.now(),
            title: 'New Partner Tier',
            type: 'category-boxes', // 'banner' | 'category-boxes'
            hidden: false,
            headerBg: '#004B9E',
            bannerLogos: [],
            categoryBoxes: [
                {
                    id: 'cat-' + Date.now(),
                    title: 'Category Partner',
                    hidden: false,
                    width: 'auto',
                    logos: []
                }
            ]
        };
        set('partnerRows', [...rows, newRow]);
    };

    const removePartnerRow = (rIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        set('partnerRows', rows.filter((_, idx) => idx !== rIdx));
    };

    const setPartnerRow = (rIdx: number, field: string, val: any) => {
        const rows = [...(data.partnerRows ?? [])];
        rows[rIdx] = { ...(rows[rIdx] || {}), [field]: val };
        set('partnerRows', rows);
    };

    const movePartnerRow = (from: number, to: number) => {
        const rows = [...(data.partnerRows ?? [])];
        if (from < 0 || from >= rows.length || to < 0 || to >= rows.length || from === to) return;
        const [moved] = rows.splice(from, 1);
        rows.splice(to, 0, moved);
        set('partnerRows', rows);
    };

    // Row Banner Logos
    const addBannerLogo = (rIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const bannerLogos = [...(row.bannerLogos ?? [])];
        bannerLogos.push({ name: '', image: '', href: '' });
        rows[rIdx] = { ...row, bannerLogos };
        set('partnerRows', rows);
    };

    const setBannerLogo = (rIdx: number, lIdx: number, field: string, val: string) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const bannerLogos = [...(row.bannerLogos ?? [])];
        bannerLogos[lIdx] = { ...(bannerLogos[lIdx] || {}), [field]: val };
        rows[rIdx] = { ...row, bannerLogos };
        set('partnerRows', rows);
    };

    const removeBannerLogo = (rIdx: number, lIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const bannerLogos = (row.bannerLogos ?? []).filter((_: any, idx: number) => idx !== lIdx);
        rows[rIdx] = { ...row, bannerLogos };
        set('partnerRows', rows);
    };

    // Category Boxes within Row
    const addCategoryBox = (rIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const categoryBoxes = [...(row.categoryBoxes ?? [])];
        categoryBoxes.push({
            id: 'cat-' + Date.now(),
            title: 'Partner Category',
            hidden: false,
            width: 'auto',
            logos: []
        });
        rows[rIdx] = { ...row, categoryBoxes };
        set('partnerRows', rows);
    };

    const setCategoryBox = (rIdx: number, cIdx: number, field: string, val: any) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const categoryBoxes = [...(row.categoryBoxes ?? [])];
        categoryBoxes[cIdx] = { ...(categoryBoxes[cIdx] || {}), [field]: val };
        rows[rIdx] = { ...row, categoryBoxes };
        set('partnerRows', rows);
    };

    const removeCategoryBox = (rIdx: number, cIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const categoryBoxes = (row.categoryBoxes ?? []).filter((_: any, idx: number) => idx !== cIdx);
        rows[rIdx] = { ...row, categoryBoxes };
        set('partnerRows', rows);
    };

    // Logos within Category Box
    const addBoxLogo = (rIdx: number, cIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const categoryBoxes = [...(row.categoryBoxes ?? [])];
        const box = categoryBoxes[cIdx];
        if (!box) return;
        const logos = [...(box.logos ?? [])];
        logos.push({ name: '', image: '', href: '' });
        categoryBoxes[cIdx] = { ...box, logos };
        rows[rIdx] = { ...row, categoryBoxes };
        set('partnerRows', rows);
    };

    const setBoxLogo = (rIdx: number, cIdx: number, lIdx: number, field: string, val: string) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const categoryBoxes = [...(row.categoryBoxes ?? [])];
        const box = categoryBoxes[cIdx];
        if (!box) return;
        const logos = [...(box.logos ?? [])];
        logos[lIdx] = { ...(logos[lIdx] || {}), [field]: val };
        categoryBoxes[cIdx] = { ...box, logos };
        rows[rIdx] = { ...row, categoryBoxes };
        set('partnerRows', rows);
    };

    const removeBoxLogo = (rIdx: number, cIdx: number, lIdx: number) => {
        const rows = [...(data.partnerRows ?? [])];
        const row = rows[rIdx];
        if (!row) return;
        const categoryBoxes = [...(row.categoryBoxes ?? [])];
        const box = categoryBoxes[cIdx];
        if (!box) return;
        const logos = (box.logos ?? []).filter((_: any, idx: number) => idx !== lIdx);
        categoryBoxes[cIdx] = { ...box, logos };
        rows[rIdx] = { ...row, categoryBoxes };
        set('partnerRows', rows);
    };

    // Generic partner logos mutators
    const setPartnerLogo = (i: number, field: string, value: string) => {
        const next = [...(data.partnerLogos ?? [])];
        next[i] = { ...(next[i] || {}), [field]: value };
        set('partnerLogos', next);
    };
    const addPartnerLogo = () => {
        set('partnerLogos', [...(data.partnerLogos ?? []), { name: '', image: '', href: '' }]);
    };
    const removePartnerLogo = (i: number) => {
        set('partnerLogos', (data.partnerLogos ?? []).filter((_: any, idx: number) => idx !== i));
    };


    const save = async (versionOverride?: number) => {
        setSaving(true);
        setSaveError(null);
        try {
            // Live synchronization: also update global content channels for contact-us or faq
            if (isContactUs) {
                const contentPayload: Record<string, string> = {
                    contact_phone: data.contact_phone ?? '',
                    contact_phone_alt: data.contact_phone_alt ?? '',
                    contact_email: data.contact_email ?? '',
                    contact_email_alt: data.contact_email_alt ?? '',
                    contact_whatsapp: data.contact_whatsapp ?? '',
                    contact_hours: data.contact_hours ?? '',
                    contact_address: data.contact_address ?? '',
                };
                await api.put('/content', contentPayload);
            }
            if (isFaq && Array.isArray((data as any).faqs)) {
                await api.put('/content', {
                    home_faqs: JSON.stringify((data as any).faqs),
                });
            }

            const isArticle = layoutMode === 'article';
            let payloadTemplate = isArticle ? 'article' : 'grid';
            if (!isArticle && (page.template === 'solution-hub' || page.template === 'service-suite')) {
                payloadTemplate = page.template;
            }

            const payloadData = { ...data, template: payloadTemplate };
            if (page.slug === 'furniture') {
                payloadTemplate = 'shop';
                payloadData.template = 'shop';
                delete payloadData.cards;
                delete payloadData.features;
                delete payloadData.section1Title;
                delete payloadData.section2Title;
            }
            if (isArticle && typeof payloadData.body !== 'string') {
                payloadData.body = data.body || '';
            }

            if (isStructured) {
                // Strict Hybrid CMS: Strip all collection arrays and top-level categories from structured page settings
                const collectionsToStrip = ['cards', 'section2Cards', 'moreCards', 'featured', 'faqs', 'openings', 'caseStudies', 'categories'];
                for (const col of collectionsToStrip) {
                    delete (payloadData as any)[col];
                }
            } else {
                if (Array.isArray(payloadData.cards)) {
                    payloadData.cards = payloadData.cards
                        .filter(Boolean)
                        .map((card: any, idx: number) => {
                            const existingSlug = typeof card.slug === 'string' && card.slug.trim() ? card.slug.trim() : '';
                            const titleSlug = card.title ? slugifyCardTitle(card.title) : '';
                            const normalizedHref = card.href ? normalizeCardHref(card.href) : card.href;
                            return {
                                ...card,
                                href: normalizedHref,
                                slug: existingSlug || titleSlug || `card-${idx + 1}`,
                            };
                        });
                }
                if (Array.isArray(payloadData.section2Cards)) {
                    payloadData.section2Cards = payloadData.section2Cards.filter(Boolean);
                }
                if (Array.isArray(payloadData.moreCards)) {
                    payloadData.moreCards = payloadData.moreCards.filter(Boolean);
                }
            }
            if (Array.isArray(payloadData.sections)) {
                payloadData.sections = payloadData.sections.filter(Boolean);
            }
            if (Array.isArray(payloadData.features)) {
                payloadData.features = payloadData.features.filter(Boolean);
            }

            const putPayload: Record<string, any> = {
                title,
                published,
                template: payloadTemplate,
                pageData: JSON.stringify(payloadData),
            };
            const sendVersion = typeof versionOverride === 'number' ? versionOverride : page.version;
            if (sendVersion !== undefined) {
                putPayload.version = sendVersion;
            }

            const { data: updated } = await api.put(`/pages/${page.id}`, putPayload);
            if (updated?.version !== undefined) {
                page.version = updated.version;
            }
            // Preserve any in-flight keystrokes made while request was in-flight
            setData((prevData) => ({
                ...payloadData,
                ...prevData,
                template: payloadTemplate,
            }));
            page.template = updated.template !== undefined ? updated.template : payloadTemplate;
            clearPageDataCache(page.slug);
            clearPageDataCache();

            // Broadcast cache invalidation across all tabs
            broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: page.slug });
            broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            if (onSaved) onSaved(updated);
        } catch (err: any) {
            console.error(`Failed to save page ${page.slug}:`, err);
            if (err?.response?.status === 409 && err?.response?.data?.error === 'version_conflict') {
                const currentRemote = err.response.data.current;
                setConflictCurrentPage(currentRemote);
                setShowPageConflictDialog(true);
            } else {
                const msg = err?.response?.data?.error || 'Failed to save page changes. Please try again.';
                setSaveError(msg);
                alert(`Save failed: ${msg}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const scrollToSection = (targetId: string) => {
        const el = document.getElementById(targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const hasQuote = Boolean(('quoteText' in effectiveDefaults) || (data && 'quoteText' in data) || page.slug === 'furniture');

    const navPills = useMemo(() => {
        if (page.slug === 'home') return [];
        const pills: Array<{ id: string; label: string; count?: number }> = [];

        // 1. General Configuration
        pills.push({ id: 'sec-general', label: '⚙️ General' });
        pills.push({ id: 'sec-seo', label: '🌐 SEO' });

        if (isAboutUs) {
            pills.push({ id: 'sec-styling', label: '🎨 Styling' });
            pills.push({ id: 'sec-hero', label: '🖼️ Hero' });
            pills.push({ id: 'sec-mission', label: '🎯 Mission' });
            pills.push({ id: 'sec-values', label: '💎 Values' });
            pills.push({ id: 'sec-team', label: '👥 Leadership' });
            pills.push({ id: 'sec-partners', label: '🤝 Partners' });
            return pills;
        }

        if (isContactUs) {
            pills.push({ id: 'sec-hero', label: '🖼️ Hero' });
            pills.push({ id: 'sec-cta', label: '📣 CTA' });
            return pills;
        }

        if (isFaq) {
            pills.push({ id: 'sec-hero', label: '🖼️ Hero' });
            pills.push({ id: 'sec-faq', label: '❓ FAQ Questions' });
            pills.push({ id: 'sec-cta', label: '📣 Assistance CTA' });
            return pills;
        }

        if (isArticlePage) {
            pills.push({ id: 'sec-hero', label: '🖼️ Hero' });
            pills.push({ id: 'sec-article-body', label: '📄 Article Body' });
            pills.push({ id: 'sec-cta', label: '📣 CTA' });
            return pills;
        }

        // Generic Hub / Grid template (Labs, Sports, Furniture, Libraries, Tech-infra, Guides, etc.)
        pills.push({ id: 'sec-styling', label: '🎨 Styling' });
        pills.push({ id: 'sec-hero', label: '🖼️ Hero' });

        // Brand Logos
        if (page.slug !== 'blog' && page.slug !== 'classifieds' && page.slug !== 'job-openings') {
            pills.push({ id: 'sec-logos', label: '🏷️ Brand Logos' });
        }

        // Cards Section vs Furniture Store Switchboard
        if (page.slug === 'furniture') {
            pills.push({ id: 'sec-furniture-switchboard', label: '🪑 Store Categories' });
        } else {
            const cardsCount = Array.isArray(data.cards) ? data.cards.length : 0;
            pills.push({ id: 'sec-cards', label: '🗂️ Cards', count: cardsCount });
        }

        // Philosophy / Quote Section
        if (hasQuote) {
            pills.push({ id: 'sec-quote', label: '💬 Philosophy' });
        }

        // Bottom CTA
        pills.push({ id: 'sec-cta', label: '📣 CTA' });

        return pills;
    }, [page.slug, isAboutUs, isContactUs, isFaq, isArticlePage, data.cards, hasQuote]);

    const canAddCards = useMemo(() => {
        return (
            !isArticlePage &&
            page.slug !== 'home' &&
            page.slug !== 'furniture' &&
            page.slug !== 'about-us' &&
            page.slug !== 'corporate' &&
            page.slug !== 'contact-us' &&
            page.slug !== 'faq' &&
            page.slug !== 'blog' &&
            page.slug !== 'job-openings'
        );
    }, [isArticlePage, page.slug]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Editor Header */}
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center justify-between px-6 sm:px-8 py-5">
                    <div className="flex items-center gap-3">
                        {isStandalone && onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="mr-2 p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                title="Back to Pages list"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                        <div>
                            <h3 className="font-black text-gray-900 text-xl tracking-tight">
                                {isStandalone ? `Edit Page: ${page.title}` : 'Edit Page Content'}
                            </h3>
                            <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">/{page.slug}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowHistoryPanel(true)}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-sm active:scale-95"
                            title="View page revision history and restore previous versions"
                        >
                            <History className="w-3.5 h-3.5 text-slate-500" /> History
                        </button>
                        {page.slug !== 'job-openings' && (
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(true)}
                                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold border border-blue-200 text-blue-700 bg-blue-50/90 hover:bg-blue-100 rounded-xl transition-all shadow-sm active:scale-95"
                                title="Load recommended template samples for this page"
                            >
                                <FileText className="w-3.5 h-3.5" /> Load Starter Template
                            </button>
                        )}
                        <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <LinkIcon className="w-3.5 h-3.5" /> View Live
                        </a>
                        <button
                            type="button"
                            onClick={() => save()}
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 ${
                                saving ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving…' : saved ? '✓ Changes Saved!' : 'Save Page Changes'}
                        </button>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 text-gray-400 border border-gray-100 hover:border-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-2"
                                title="Close editor"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Navigation Anchor Bar */}
                {navPills.length > 0 && (
                    <div className="px-6 sm:px-8 py-2.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 shrink-0 hidden sm:inline">
                                Jump to:
                            </span>
                            {navPills.map((pill) => (
                                <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() => scrollToSection(pill.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200/90 transition-all shadow-2xs shrink-0 cursor-pointer text-xs active:scale-95"
                                >
                                    <span>{pill.label}</span>
                                    {pill.count !== undefined && (
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                            {pill.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {canAddCards && (
                            <button
                                type="button"
                                onClick={addCard}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0 cursor-pointer ml-auto"
                                title="Add a new card and jump to it immediately"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Card</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Specialized Shortcut Banners */}

            {page.slug === 'home' && (
                <div className="mx-6 sm:mx-8 mt-6 rounded-2xl border-2 border-blue-400 bg-blue-50/90 p-5 text-sm text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div>
                        <div className="font-extrabold text-blue-950 text-base">🏠 Homepage Cards, Images &amp; Content Editor</div>
                        <p className="text-xs text-blue-800 mt-1">
                            To change the images, text, and links on the homepage feature cards, hero banner, service links, and sidebar, open the dedicated Homepage Editor.
                        </p>
                    </div>
                    <Link
                        to="/admin/homepage-editor"
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shrink-0 shadow-md"
                    >
                        Edit Homepage Cards &amp; Images →
                    </Link>
                </div>
            )}

            {page.slug === 'blog' && (
                <div className="mx-6 sm:mx-8 mt-6 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                        <div className="font-bold text-blue-950">📝 Dedicated Blog Posts Manager Available</div>
                        <p className="text-xs text-blue-800 mt-0.5">
                            To create, edit, or publish individual blog posts and categories, use the Blog Posts Manager.
                        </p>
                    </div>
                    <Link
                        to="/admin/blog"
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shrink-0 shadow-xs"
                    >
                        Open Blog Manager →
                    </Link>
                </div>
            )}

            {/* Classifieds & Opportunities Suite Top Toolbar */}
            {isClassifiedsSuite && (
                <div className="mx-6 sm:mx-8 mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-950 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                                    🏷️ Classifieds &amp; Opportunities Suite
                                </span>
                                <span className="text-xs text-amber-800 font-bold">
                                    {page.slug === 'classifieds' ? 'Central Opportunity Hub' : `Active Subpage: /${page.slug}`}
                                </span>
                            </div>
                            <p className="text-xs text-amber-800 mt-1.5 max-w-2xl leading-relaxed">
                                Manage the main Classifieds marketplace and its interconnected opportunity subpages. Use the quick-switch buttons below to jump directly into editing linked subpages.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <a
                                href={`/${page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/70 transition-all shadow-xs cursor-pointer"
                            >
                                <Eye className="w-3.5 h-3.5 text-amber-700" />
                                <span>Live Preview</span>
                            </a>
                        </div>
                    </div>

                    {/* Linked Subpages Tray */}
                    <div className="mt-4 pt-3.5 border-t border-amber-200/70">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 mr-1">
                                Suite Subpages:
                            </span>
                            {classifiedsSuiteSubpages.map((sub) => {
                                const isCurrent = sub.slug === page.slug;
                                if (isCurrent) {
                                    return (
                                        <span
                                            key={sub.slug}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-600 text-white shadow-xs"
                                        >
                                            <span>● {sub.label}</span>
                                            <span className="text-[10px] bg-amber-700 px-1.5 py-0.5 rounded font-mono font-medium">
                                                /{sub.slug}
                                            </span>
                                        </span>
                                    );
                                }
                                return (
                                    <a
                                        key={sub.slug}
                                        href={`/admin/pages/${sub.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-amber-900 border border-amber-200 hover:border-amber-400 hover:bg-amber-100/60 transition-all shadow-2xs group cursor-pointer"
                                        title={`Open standalone editor for /${sub.slug} in new tab`}
                                    >
                                        <Pencil className="w-3 h-3 text-amber-600 group-hover:text-amber-800" />
                                        <span>{sub.label}</span>
                                        <span className="text-[10px] text-amber-500 font-mono">/{sub.slug}</span>
                                        <span className="text-amber-600 text-xs">↗</span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {saveError && (
                <div className="mx-6 sm:mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center justify-between">
                    <span>⚠️ {saveError}</span>
                    <button type="button" onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">
                        ✕
                    </button>
                </div>
            )}

            <div className="p-6 sm:p-8 space-y-12">
                {/* ─── Page Layout Mode Switcher ─── */}
                {!isAboutUs && !isBlog && !isContactUs && !isFaq && page.slug !== 'home' && (
                    <section className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                                    Layout Structure
                                </span>
                                <h4 className="text-sm font-extrabold text-slate-900">
                                    {layoutMode === 'article' ? '📄 Detail / Article Layout' : '🗂️ Hub / Card Grid Layout'}
                                </h4>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {layoutMode === 'article'
                                    ? 'Configured as a dedicated detail page with rich text description, cover image, and enquiry CTA.'
                                    : 'Configured as a parent hub displaying an interactive collection of cards and category filters.'}
                            </p>
                        </div>
                        {Boolean(page.id && page.id !== 0) ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold shrink-0 self-stretch md:self-auto shadow-2xs">
                                <span className="text-amber-500">🔒</span>
                                <span>{layoutMode === 'article' ? '📄 Detail / Article Layout (Locked)' : '🗂️ Hub / Card Grid Layout (Locked)'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0 self-stretch md:self-auto">
                                <button
                                    type="button"
                                    onClick={() => handleLayoutModeChange('article')}
                                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        layoutMode === 'article'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>📄 Detail / Article Layout</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleLayoutModeChange('grid')}
                                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        layoutMode === 'grid'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>🗂️ Hub / Card Grid Layout</span>
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* General Configuration */}
                <section id="sec-general" className="space-y-6 scroll-mt-36">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">General Configuration</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <Field label="Browser Title *" value={title} onChange={setTitle} hint="shown in navigation and tabs" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700">Publishing Status</label>
                            <button
                                type="button"
                                onClick={() => setPublished((p) => !p)}
                                className={`w-full px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all shadow-sm cursor-pointer ${
                                    published
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}
                            >
                                {published ? '● PUBLISHED & VISIBLE' : '○ SAVED AS DRAFT'}
                            </button>
                        </div>
                    </div>

                    {/* AI Solutions Finder / Search Objective Category */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                Primary Solution Category / Search Objective
                            </label>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Inherited dynamically by all cards in this Hub
                            </span>
                        </div>
                        <select
                            value={data.category || ''}
                            onChange={(e) => set('category', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs cursor-pointer"
                        >
                            <option value="">-- No Category Assigned (Unmapped) --</option>
                            {searchObjectives.map((obj) => (
                                <option key={obj.id} value={obj.id}>
                                    {obj.label} ({obj.id})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Controls which category this Hub Page and its internal cards are matched under in the AI Solutions Finder and homepage search bar. If cards do not have their own explicit category, they automatically inherit this one.
                        </p>
                    </div>
                </section>

                {/* SEO Configuration Section */}
                <section id="sec-seo" className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs scroll-mt-36">
                    <button
                        type="button"
                        onClick={() => setShowSeoSection(!showSeoSection)}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-white hover:bg-slate-100/70 transition cursor-pointer text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                    Search Engine Optimization (SEO) &amp; Social Metadata
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Custom title, meta description, OpenGraph preview image, and crawl indexing.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {(data.seoTitle || data.seoDescription || data.noindex) && (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Configured
                                </span>
                            )}
                            <div className="p-1 rounded-lg text-slate-400">
                                {showSeoSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                    </button>

                    {showSeoSection && (
                        <div className="p-6 pt-4 border-t border-slate-200 space-y-6 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* SEO Title */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-bold text-gray-700">
                                            SEO Meta Title
                                        </label>
                                        <span className={`text-xs font-mono ${(data.seoTitle?.length || 0) > 60 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                            {data.seoTitle?.length || 0}/60
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={data.seoTitle ?? ''}
                                        onChange={(e) => set('seoTitle', e.target.value)}
                                        placeholder={data.heroTitle || title || 'Custom page title'}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white text-slate-800"
                                    />
                                    <p className="text-[11px] text-gray-500">
                                        Browser tab title format: <code>&quot;{'{title}'} | SchoolMart&quot;</code>. Defaults to hero title or page title if empty.
                                    </p>
                                </div>

                                {/* OG Image */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-700">
                                        OpenGraph / Social Card Image
                                    </label>
                                    <input
                                        type="text"
                                        value={data.ogImage ?? ''}
                                        onChange={(e) => set('ogImage', e.target.value)}
                                        placeholder={data.heroImage || '/uploads/og-banner.jpg'}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white text-slate-800"
                                    />
                                    <p className="text-[11px] text-gray-500">
                                        Absolute URL or image path for social sharing previews (LinkedIn, Twitter, WhatsApp).
                                    </p>
                                </div>
                            </div>

                            {/* SEO Description */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-gray-700">
                                        SEO Meta Description
                                    </label>
                                    <span className={`text-xs font-mono ${(data.seoDescription?.length || 0) > 160 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                        {data.seoDescription?.length || 0}/160
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    value={data.seoDescription ?? ''}
                                    onChange={(e) => set('seoDescription', e.target.value)}
                                    placeholder={data.heroSubtitle || 'Enter search engine description for SERP snippets'}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white text-slate-800 resize-none"
                                />
                                <p className="text-[11px] text-gray-500">
                                    Search engine description snippet. Recommended: max 160 characters (longer snippets will be truncated at word boundary).
                                </p>
                            </div>

                            {/* Noindex Toggle */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                <div>
                                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Search Engine Visibility (noindex)
                                    </h5>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        When enabled, adds <code>&lt;meta name=&quot;robots&quot; content=&quot;noindex, nofollow&quot;&gt;</code> and excludes this page from sitemap.xml.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => set('noindex', !data.noindex)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        data.noindex
                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                >
                                    {data.noindex ? 'Hidden from Crawlers (noindex)' : 'Indexable by Crawlers'}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* ─── Detail / Article Page Content Section ─── */}
                {/* ─── Detail / Article Page Content Section ─── */}
                {layoutMode === 'article' && (
                    <section className="space-y-8 rounded-2xl border-2 border-blue-500/20 bg-gradient-to-b from-blue-50/20 via-white to-white p-6 sm:p-7 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-100 gap-2">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100 px-2.5 py-0.5 rounded-full">
                                    Detail / Article Layout
                                </span>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    Hero, Article Body &amp; Bottom CTA
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Clean 3-section layout: Hero Banner, Article Body, and Bottom CTA.
                                </p>
                            </div>
                            <span className="text-xs text-blue-700 font-mono font-semibold bg-white border border-blue-200 px-3 py-1 rounded-xl self-start sm:self-auto">
                                /{page.slug}
                            </span>
                        </div>

                        {/* 1. Hero Banner */}
                        <div id="sec-hero" className="space-y-4 scroll-mt-36">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    1. Hero Banner &amp; Metadata
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => set('hideHero', !data.hideHero)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        data.hideHero
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                >
                                    {data.hideHero ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {data.hideHero ? 'Hidden / Draft' : 'Live on Page'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Field
                                        label="Category / Eyebrow Tag"
                                        value={data.category ?? data.heroEyebrow ?? ''}
                                        onChange={(v) => {
                                            set('category', v);
                                            set('heroEyebrow', v);
                                        }}
                                        placeholder="e.g. Overview"
                                        hint="Top badge"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Field
                                        label="Article Headline / Title *"
                                        value={data.heroTitle ?? title}
                                        onChange={(v) => set('heroTitle', v)}
                                        placeholder="Full article headline"
                                    />
                                </div>
                                
                            </div>
                            <MediaImageField
                                label="Featured Cover Banner / Hero Image"
                                value={data.featuredImage ?? data.heroImage ?? ''}
                                onChange={(url) => {
                                    set('featuredImage', url);
                                    set('heroImage', url);
                                }}
                                previewClassName="h-52 rounded-2xl"
                            />
                        </div>

                        {/* 2. Article Body */}
                        <div id="sec-article-body" className="space-y-4 pt-4 border-t border-slate-100 scroll-mt-36">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    2. Article Body (HTML Rich Text)
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => set('hideBody', !data.hideBody)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        data.hideBody
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                >
                                    {data.hideBody ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {data.hideBody ? 'Hidden / Draft' : 'Live on Page'}
                                </button>
                            </div>
                            <Field
                                label="Section Heading (Optional)"
                                value={data.bodyHeading ?? ''}
                                onChange={(v) => set('bodyHeading', v)}
                                placeholder="e.g. Detailed Overview & Specifications"
                            />
                            <HtmlRichTextEditor
                                label="Comprehensive Page Description"
                                value={data.body ?? ''}
                                onChange={(val) => set('body', val)}
                                placeholder="Write full article description here... HTML tags, headings, lists, bold text, colors, and links are supported."
                                rows={12}
                                helperText="Format text with bold, italics, subheadings, lists, text color, and links using the toolbar above."
                            />
                        </div>

                        {/* 3. Call to Action / Bottom Enquiry Banner */}
                        <div id="sec-cta" className="space-y-4 pt-4 border-t border-slate-100 scroll-mt-36">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    3. Call to Action / Bottom Enquiry Banner
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => set('hideCta', !data.hideCta)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        data.hideCta
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                >
                                    {data.hideCta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {data.hideCta ? 'Hidden / Draft' : 'Live on Page'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                                <Field
                                    label="CTA Banner Title"
                                    value={data.ctaTitle ?? ''}
                                    onChange={(v) => set('ctaTitle', v)}
                                    placeholder="e.g. Interested in this opportunity?"
                                />
                                <Field
                                    label="CTA Button Label"
                                    value={data.ctaButtonLabel ?? ''}
                                    onChange={(v) => set('ctaButtonLabel', v)}
                                    placeholder="e.g. Enquire Now / Schedule Call"
                                />
                                <Field
                                    label="CTA Subtitle"
                                    value={data.ctaSubtitle ?? ''}
                                    onChange={(v) => set('ctaSubtitle', v)}
                                    placeholder="e.g. Get in touch with our team today."
                                />
                                <Field
                                    label="CTA Button Link"
                                    value={data.ctaHref ?? ''}
                                    onChange={(v) => set('ctaHref', v)}
                                    placeholder="/contact-us"
                                />
                            </div>
                        </div>
                    </section>
                )}

                {!isArticlePage && (() => {
                    const isServiceGridPage =
                        page.slug === 'campus-design-execution' ||
                        page.slug === 'campus-design' ||
                        page.slug === 'campus-furniture-design' ||
                        page.slug === 'sports-design-execution' ||
                        page.slug === 'ai-digital-design-supply' ||
                        page.slug === 'ar-vr-experiences' ||
                        page.slug === 'sports-infra' ||
                        page.slug === 'tech-infra' ||
                        page.slug === 'libraries' ||
                        page.slug === 'labs' ||
                        page.slug === 'collaboration' ||
                        page.slug === 'campus-automation' ||
                        page.slug === 'campus-master-planning' ||
                        page.slug === 'science-tech-labs' ||
                        page.slug === 'smart-classrooms' ||
                        page.slug === 'digital-transformation' ||
                        page.slug === 'ai-stations';
                    const isFurniturePage = page.slug === 'furniture';
                    const isSportsInfraPage = page.slug === 'sports-infra';
                    const isTechInfraPage = page.slug === 'tech-infra';
                    const isLibrariesPage = page.slug === 'libraries';
                    const isLabsPage = page.slug === 'labs';
                    const isCollabPage = page.slug === 'collaboration';
                    const isInnovationPage = page.slug === 'innovation';
                    const isCampusAutomationPage = page.slug === 'campus-automation';
                    const isCampusMasterPlanningPage = page.slug === 'campus-master-planning';
                    const isSmartClassroomsPage = page.slug === 'smart-classrooms';
                    const isDigitalTransformationPage = page.slug === 'digital-transformation';
                    const isScienceTechLabsPage = page.slug === 'science-tech-labs';
                    const defaultHeadingFont = effectiveDefaults.styles?.headingFont || (isInnovationPage ? 'poppins' : isServiceGridPage || isFurniturePage ? 'poppins' : 'playfair');
                    const defaultPrimaryColor = effectiveDefaults.styles?.primaryColor || (isInnovationPage ? '#155b51' : isServiceGridPage || isFurniturePage ? '#0047ab' : '#ea580c');
                    const defaultHeroBg = effectiveDefaults.styles?.heroBg || (isInnovationPage ? 'paper' : isCollabPage || isLabsPage || isLibrariesPage || isTechInfraPage || isSportsInfraPage || isFurniturePage ? 'blue' : isServiceGridPage ? 'white' : 'amber');
                    const defaultCtaBg = effectiveDefaults.styles?.ctaBg || (isCollabPage ? 'white' : isServiceGridPage ? 'blue' : 'stone');
                    const defaultHeroLayout = effectiveDefaults.styles?.heroLayout || (isCollabPage || isLabsPage || isLibrariesPage || isTechInfraPage || isSportsInfraPage || isFurniturePage ? 'split-right' : isServiceGridPage ? 'minimal' : 'split-right');
                    const defaultShowFeatured =
                        effectiveDefaults.styles?.showFeatured !== undefined
                            ? effectiveDefaults.styles.showFeatured
                            : isCampusAutomationPage || isInnovationPage ? true : !isServiceGridPage;
                    const defaultShowFilters =
                        effectiveDefaults.styles?.showFilters !== undefined
                            ? effectiveDefaults.styles.showFilters
                            : isCampusAutomationPage || isCampusMasterPlanningPage || isLabsPage || isLibrariesPage || isTechInfraPage || isSportsInfraPage || isInnovationPage
                            ? true
                            : !isServiceGridPage;

                    const currentShowFeatured =
                        data.styles?.showFeatured !== undefined ? data.styles.showFeatured : defaultShowFeatured;
                    const currentShowFilters =
                        data.styles?.showFilters !== undefined ? data.styles.showFilters : defaultShowFilters;

                    return (
                        <section id="sec-styling" className="space-y-6 rounded-2xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-white p-6 sm:p-7 shadow-xs scroll-mt-36">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-orange-200/60 gap-2">
                                <div>
                                    <h4 className="text-xs font-black text-orange-950 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                                        Page Control: Typography, Layout &amp; Theme
                                    </h4>
                                    <p className="text-xs text-orange-800/80 mt-1 font-medium">
                                        Customize fonts, layout variants, brand colors, and display options for {page.title}.
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 px-3 py-1 rounded-full border border-orange-200 self-start sm:self-auto">
                                    {page.title} Styles
                                </span>
                            </div>

                            {/* 1. Typography / Fonts */}
                            <div className="space-y-4">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Type className="w-3.5 h-3.5 text-orange-600" /> Typography &amp; Fonts
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-gray-700">Heading Font</label>
                                        <select
                                            value={data.styles?.headingFont ?? defaultHeadingFont}
                                            onChange={(e) => setStyle('headingFont', e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all bg-white text-slate-800"
                                        >
                                            <option value="poppins">Poppins (Geometric Clean Sans)</option>
                                            <option value="grotesk">Space Grotesk (Modern Tech Sans)</option>
                                            <option value="playfair">Playfair Display (Editorial Serif)</option>
                                            <option value="opensans">Open Sans (Classic Neutral)</option>
                                            <option value="inter">Inter (Modern Clean Sans)</option>
                                            <option value="dmsans">DM Sans (Contemporary Sans)</option>
                                            <option value="system">System Sans (Native Clean UI)</option>
                                        </select>
                                        <p className="text-[11px] text-gray-500">Applied to hero headlines, section headings, and card titles</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-gray-700">Body Font</label>
                                        <select
                                            value={data.styles?.bodyFont ?? 'opensans'}
                                            onChange={(e) => setStyle('bodyFont', e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all bg-white text-slate-800"
                                        >
                                            <option value="opensans">Open Sans (Classic Clean - Default)</option>
                                            <option value="poppins">Poppins (Geometric Sans)</option>
                                            <option value="grotesk">Space Grotesk (Modern Sans)</option>
                                            <option value="inter">Inter (Modern Clean Sans)</option>
                                            <option value="dmsans">DM Sans (Contemporary Sans)</option>
                                            <option value="system">System Sans (Native)</option>
                                        </select>
                                        <p className="text-[11px] text-gray-500">Applied to subtitles, descriptions, and article body text</p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Color & Theme */}
                            <div className="space-y-4 pt-2 border-t border-orange-200/40">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Palette className="w-3.5 h-3.5 text-orange-600" /> Brand Colors &amp; Background Themes
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Primary Accent Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.styles?.primaryColor || defaultPrimaryColor}
                                                onChange={(e) => setStyle('primaryColor', e.target.value)}
                                                className="h-10 w-12 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white"
                                            />
                                            <input
                                                type="text"
                                                value={data.styles?.primaryColor || defaultPrimaryColor}
                                                onChange={(e) => setStyle('primaryColor', e.target.value)}
                                                placeholder={defaultPrimaryColor}
                                                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {[
                                                { name: 'Blue', hex: '#0047ab' },
                                                { name: 'Orange', hex: '#ea580c' },
                                                { name: 'Emerald', hex: '#059669' },
                                                { name: 'Purple', hex: '#7c3aed' },
                                                { name: 'Charcoal', hex: '#1e293b' },
                                            ].map((c) => (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    onClick={() => setStyle('primaryColor', c.hex)}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all"
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Hero Background</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={normalizeColorHex(data.styles?.heroBg || defaultHeroBg, '#fbf9f5')}
                                                onChange={(e) => setStyle('heroBg', e.target.value)}
                                                className="h-10 w-12 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white"
                                            />
                                            <input
                                                type="text"
                                                value={data.styles?.heroBg ?? defaultHeroBg}
                                                onChange={(e) => setStyle('heroBg', e.target.value)}
                                                placeholder={defaultHeroBg}
                                                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {[
                                                { name: 'Warm Paper', hex: '#fbf9f5' },
                                                { name: 'Clean White', hex: '#ffffff' },
                                                { name: 'Soft Slate', hex: '#f1f5f9' },
                                                { name: 'Warm Amber', hex: '#fef3c7' },
                                                { name: 'Soft Blue', hex: '#eff6ff' },
                                                { name: 'Dark Charcoal', hex: '#0f172a' },
                                            ].map((c) => (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    onClick={() => setStyle('heroBg', c.hex)}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer"
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Bottom CTA Background</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={normalizeColorHex(data.styles?.ctaBg || defaultCtaBg, '#002a6c')}
                                                onChange={(e) => setStyle('ctaBg', e.target.value)}
                                                className="h-10 w-12 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white"
                                            />
                                            <input
                                                type="text"
                                                value={data.styles?.ctaBg ?? defaultCtaBg}
                                                onChange={(e) => setStyle('ctaBg', e.target.value)}
                                                placeholder={defaultCtaBg}
                                                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {[
                                                { name: 'SchoolMart Navy', hex: '#002a6c' },
                                                { name: 'SchoolMart Blue', hex: '#0057a8' },
                                                { name: 'Dark Stone', hex: '#0f172a' },
                                                { name: 'Dark Slate', hex: '#1e293b' },
                                                { name: 'Amber Gold', hex: '#d97706' },
                                                { name: 'Clean White', hex: '#ffffff' },
                                            ].map((c) => (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    onClick={() => setStyle('ctaBg', c.hex)}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer"
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Layout Variants & Section Toggles */}
                            <div className="space-y-4 pt-2 border-t border-orange-200/40">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Layout className="w-3.5 h-3.5 text-orange-600" /> Layout Variants &amp; Display Controls
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-gray-700">Hero Layout</label>
                                        <select
                                            value={data.styles?.heroLayout ?? defaultHeroLayout}
                                            onChange={(e) => setStyle('heroLayout', e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all bg-white text-slate-800"
                                        >
                                            <option value="minimal">Minimal Header (Text Only)</option>
                                            <option value="split-right">Split (Text Left, Image Right)</option>
                                            <option value="split-left">Split (Image Left, Text Right)</option>
                                            <option value="centered">Centered Headline &amp; Banner</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-gray-700">Card Grid Columns</label>
                                        <select
                                            value={data.styles?.cardColumns ?? '3'}
                                            onChange={(e) => setStyle('cardColumns', e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all bg-white text-slate-800"
                                        >
                                            <option value="3">3 Columns (Standard Grid)</option>
                                            <option value="2">2 Columns (Larger Cards)</option>
                                            <option value="4">4 Columns (Compact Grid)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-gray-700">Featured Card Display</label>
                                        <select
                                            value={currentShowFeatured ? 'true' : 'false'}
                                            onChange={(e) => setStyle('showFeatured', e.target.value === 'true')}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all bg-white text-slate-800"
                                        >
                                            <option value="true">Show 1st Card as Large Featured Banner</option>
                                            <option value="false">Uniform Grid Only (All cards same size)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStyle('showFilters', !currentShowFilters)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                            currentShowFilters
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        <span>Filter Chips</span>
                                        <span>{currentShowFilters ? '● Visible' : '○ Hidden'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => set('hideHero', !data.hideHero)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                            !data.hideHero
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        <span>Hero Section</span>
                                        <span>{!data.hideHero ? '● Visible' : '○ Hidden'}</span>
                                    </button>

                                    {page.slug === 'furniture' ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => set('hideShop', !data.hideShop)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                    !data.hideShop
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                <span>Shop Catalog</span>
                                                <span>{!data.hideShop ? '● Visible' : '○ Hidden'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => set('hideQuote', !data.hideQuote)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                    !data.hideQuote
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                <span>Design Quote</span>
                                                <span>{!data.hideQuote ? '● Visible' : '○ Hidden'}</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => set('hideCards', !data.hideCards)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                    !data.hideCards
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                <span>Cards Grid</span>
                                                <span>{!data.hideCards ? '● Visible' : '○ Hidden'}</span>
                                            </button>

                                            {isSmartClassroomsPage && (
                                                <button
                                                    type="button"
                                                    onClick={() => set('hideFeatures', !data.hideFeatures)}
                                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                        !data.hideFeatures
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}
                                                >
                                                    <span>Capabilities Ticker</span>
                                                    <span>{!data.hideFeatures ? '● Visible' : '○ Hidden'}</span>
                                                </button>
                                            )}

                                            {isSmartClassroomsPage && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => set('hideHighlight', !data.hideHighlight)}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                            !data.hideHighlight
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                                        }`}
                                                    >
                                                        <span>Highlight Band</span>
                                                        <span>{!data.hideHighlight ? '● Visible' : '○ Hidden'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => set('hideForm', !data.hideForm)}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                            !data.hideForm
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                                        }`}
                                                    >
                                                        <span>Inquiry Form</span>
                                                        <span>{!data.hideForm ? '● Visible' : '○ Hidden'}</span>
                                                    </button>
                                                </>
                                            )}

                                            {isDigitalTransformationPage && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => set('hideSection2', !data.hideSection2)}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                            !data.hideSection2
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                                        }`}
                                                    >
                                                        <span>Why Go Digital</span>
                                                        <span>{!data.hideSection2 ? '● Visible' : '○ Hidden'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => set('hideSections', !data.hideSections)}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                            !data.hideSections
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                                        }`}
                                                    >
                                                        <span>Process Steps</span>
                                                        <span>{!data.hideSections ? '● Visible' : '○ Hidden'}</span>
                                                    </button>
                                                </>
                                            )}

                                            {isScienceTechLabsPage && (
                                                <button
                                                    type="button"
                                                    onClick={() => set('hidePhilosophy', !data.hidePhilosophy)}
                                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                        !data.hidePhilosophy
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}
                                                >
                                                    <span>Philosophy Section</span>
                                                    <span>{!data.hidePhilosophy ? '● Visible' : '○ Hidden'}</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => set('hideCta', !data.hideCta)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                    !data.hideCta
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                <span>Bottom CTA</span>
                                                <span>{!data.hideCta ? '● Visible' : '○ Hidden'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 4. Micro-Copy & Labels */}
                            <div className="space-y-4 pt-2 border-t border-orange-200/40">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Sliders className="w-3.5 h-3.5 text-orange-600" /> Micro-Copy &amp; Labels
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field
                                        label="Card Action Link Label"
                                        value={data.readMoreLabel ?? ''}
                                        onChange={(v) => set('readMoreLabel', v)}
                                        placeholder={effectiveDefaults.readMoreLabel || 'Learn More'}
                                        hint="Link text on each card (e.g. Learn More / Explore Range / Contact Us)"
                                    />
                                </div>
                            </div>

                            {/* 4. Live Mini Preview Card */}
                            {(() => {
                                const activeHeading = data.styles?.headingFont ?? defaultHeadingFont;
                                const activeBody = data.styles?.bodyFont ?? 'opensans';
                                const activePrimary = data.styles?.primaryColor || defaultPrimaryColor;
                                const activeLayout = data.styles?.heroLayout ?? defaultHeroLayout;
                                const activeCols = data.styles?.cardColumns ?? '3';

                                const headingClass =
                                    activeHeading === 'grotesk'
                                        ? 'font-grotesk'
                                        : activeHeading === 'poppins'
                                        ? 'font-poppins'
                                        : activeHeading === 'playfair'
                                        ? 'font-playfair'
                                        : activeHeading === 'inter'
                                        ? 'font-inter'
                                        : activeHeading === 'dmsans'
                                        ? 'font-dmsans'
                                        : 'font-sans';

                                const bodyClass =
                                    activeBody === 'grotesk'
                                        ? 'font-grotesk'
                                        : activeBody === 'poppins'
                                        ? 'font-poppins'
                                        : activeBody === 'inter'
                                        ? 'font-inter'
                                        : activeBody === 'dmsans'
                                        ? 'font-dmsans'
                                        : 'font-sans';

                                return (
                                    <div className="pt-5 border-t border-orange-200/50 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <Eye className="w-3.5 h-3.5 text-orange-600" />
                                                Live Mini Preview Card (Visual Output)
                                            </h5>
                                            <span className="text-[11px] font-medium text-slate-500">
                                                Font: <strong className="text-slate-800 capitalize">{activeHeading}</strong> · Accent: <strong className="font-mono text-slate-800">{activePrimary}</strong>
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Preview Card */}
                                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                                        style={{ backgroundColor: `${activePrimary}15`, color: activePrimary }}
                                                    >
                                                        Preview Category
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">5 min read</span>
                                                </div>
                                                <h4 className={`${headingClass} text-lg font-bold text-slate-900 leading-snug mb-2`}>
                                                    Sample Headline in {activeHeading}
                                                </h4>
                                                <p className={`${bodyClass} text-xs text-slate-600 leading-relaxed mb-4`}>
                                                    This live mini preview renders the exact typography, weights, and color accents that will be presented to visitors on the published page.
                                                </p>
                                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                                                        style={{ color: activePrimary }}
                                                    >
                                                        {(data.readMoreLabel || effectiveDefaults.readMoreLabel || 'Learn More')} <ArrowRight className="w-3.5 h-3.5" />
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {activeCols} cols · {activeLayout}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Layout Summary */}
                                            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-5 flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        Active Configuration
                                                    </span>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div><span className="text-slate-500">Heading Font:</span> <span className="font-bold text-slate-800 capitalize">{activeHeading}</span></div>
                                                        <div><span className="text-slate-500">Body Font:</span> <span className="font-bold text-slate-800 capitalize">{activeBody}</span></div>
                                                        <div><span className="text-slate-500">Hero Layout:</span> <span className="font-bold text-slate-800">{activeLayout}</span></div>
                                                        <div><span className="text-slate-500">Columns:</span> <span className="font-bold text-slate-800">{activeCols} Columns</span></div>
                                                        <div><span className="text-slate-500">Featured Banner:</span> <span className="font-bold text-slate-800">{currentShowFeatured ? 'Visible' : 'Grid Only'}</span></div>
                                                        <div><span className="text-slate-500">Filter Chips:</span> <span className="font-bold text-slate-800">{currentShowFilters ? 'Enabled' : 'Hidden'}</span></div>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-200/60 mt-3">
                                                    ✓ Changes update dynamically in real time and persist upon clicking Save.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </section>
                    );
                })()}

                {isAboutUs ? (
                    // ─── ABOUT US & CORPORATE ──────────────────────────────────────────
                    <>
                        {/* 1. HERO BANNER */}
                        <section id="sec-hero" className="space-y-6 scroll-mt-36">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Hero Banner Content</h4>
                                <button
                                    type="button"
                                    onClick={() => set('hideHero', !data.hideHero)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        data.hideHero
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                >
                                    {data.hideHero ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {data.hideHero ? 'Hidden / Draft' : 'Live on Page'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Field
                                    label="Hero Badge / Established"
                                    value={data.heroBadge ?? 'Est. 2017'}
                                    onChange={(v) => set('heroBadge', v)}
                                    placeholder="Est. 2017"
                                />
                                <div className="md:col-span-2">
                                    <Field
                                        label="Hero Heading *"
                                        value={data.heroTitle ?? ''}
                                        onChange={(v) => set('heroTitle', v)}
                                        placeholder="About SchoolMart"
                                    />
                                </div>
                            </div>
                            <Field
                                label="Hero Sub-heading"
                                value={data.heroSubtitle ?? ''}
                                onChange={(v) => set('heroSubtitle', v)}
                                multiline
                                placeholder="We are a consortium..."
                            />
                        </section>

                        {/* 2. IMPACT STATS COUNTERS */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div>
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Impact Stats Counters</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Key numerical milestones displayed in the highlight statistics strip.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => set('hideStats', !data.hideStats)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideStats
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideStats ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideStats ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addStat}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Stat
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(data.stats ?? defaultAboutUs.stats).map((stat: any, idx: number) => (
                                    <div key={idx} className="relative p-4 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3 group hover:border-blue-300 transition-colors">
                                        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Metric #{idx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeStat(idx)}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                                title="Delete Stat"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <Field
                                            label="Value (Number/Metric)"
                                            value={stat.value ?? ''}
                                            onChange={(v) => setStat(idx, 'value', v)}
                                            placeholder="e.g. 4000+"
                                        />
                                        <Field
                                            label="Label (Description)"
                                            value={stat.label ?? ''}
                                            onChange={(v) => setStat(idx, 'label', v)}
                                            placeholder="e.g. Partner Campuses"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. OUR MISSION */}
                        <section id="sec-mission" className="space-y-6 scroll-mt-36">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Our Mission Section</h4>
                                <button
                                    type="button"
                                    onClick={() => set('hideMission', !data.hideMission)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        data.hideMission
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                >
                                    {data.hideMission ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {data.hideMission ? 'Hidden / Draft' : 'Live on Page'}
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field
                                        label="Eyebrow Tag"
                                        value={data.missionBadge ?? '/ Mission Statement'}
                                        onChange={(v) => set('missionBadge', v)}
                                        placeholder="/ Mission Statement"
                                    />
                                    <Field
                                        label="Mission Heading"
                                        value={data.missionTitle ?? ''}
                                        onChange={(v) => set('missionTitle', v)}
                                        placeholder="Our Mission"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field
                                        label="Mission Paragraph 1"
                                        value={data.missionBody1 ?? ''}
                                        onChange={(v) => set('missionBody1', v)}
                                        multiline
                                        placeholder="To transform educational..."
                                    />
                                    <Field
                                        label="Mission Paragraph 2"
                                        value={data.missionBody2 ?? ''}
                                        onChange={(v) => set('missionBody2', v)}
                                        multiline
                                        placeholder="As the first company..."
                                    />
                                </div>
                                <Field
                                    label="Bottom Tagline / Slogan"
                                    value={data.missionTag ?? 'Designing Tomorrow'}
                                    onChange={(v) => set('missionTag', v)}
                                    placeholder="Designing Tomorrow"
                                />
                                <MediaImageField
                                    label="Mission Image"
                                    value={data.missionImage ?? ''}
                                    onChange={(v) => set('missionImage', v)}
                                />
                            </div>
                        </section>

                        {/* 4. WHY SIGN UP BULLETS */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Why Sign Up Bullets</h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => set('hideWhyBullets', !data.hideWhyBullets)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideWhyBullets
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideWhyBullets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideWhyBullets ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addWhyBullet}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Bullet
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field
                                    label="Eyebrow Tag"
                                    value={data.whyBulletsBadge ?? '/ Highlights'}
                                    onChange={(v) => set('whyBulletsBadge', v)}
                                    placeholder="/ Highlights"
                                />
                                <Field
                                    label="Section Heading"
                                    value={data.whyBulletsTitle ?? ''}
                                    onChange={(v) => set('whyBulletsTitle', v)}
                                    placeholder="Why Sign Up Bullets"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(data.whyBullets ?? []).map((b: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 ml-2" />
                                        <input
                                            className="flex-1 border-none bg-transparent focus:ring-0 text-sm font-medium"
                                            value={b}
                                            onChange={(e) => setWhyBullet(i, e.target.value)}
                                            placeholder="Enter bullet point..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeWhyBullet(i)}
                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 5. CORE VALUES */}
                        <section id="sec-values" className="space-y-6 scroll-mt-36">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div>
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Our Core Values</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Three core foundational pillars displayed with prominent typography.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => set('hideValues', !data.hideValues)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideValues
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideValues ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addValueItem}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Value Card
                                    </button>
                                </div>
                            </div>
                            <Field
                                label="Section Heading"
                                value={data.section2Title ?? 'Our Core Values'}
                                onChange={(v) => set('section2Title', v)}
                                placeholder="Our Core Values"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(data.values ?? defaultAboutUs.values).map((val: any, idx: number) => (
                                    <div key={idx} className="relative p-4 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3 group hover:border-indigo-300 transition-colors">
                                        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Value #{idx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeValueItem(idx)}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                                title="Delete Value"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <Field
                                            label="Title"
                                            value={val.title ?? ''}
                                            onChange={(v) => setValueItem(idx, 'title', v)}
                                            placeholder="e.g. Partnership"
                                        />
                                        <Field
                                            label="Description"
                                            value={val.description ?? ''}
                                            onChange={(v) => setValueItem(idx, 'description', v)}
                                            multiline
                                            placeholder="We believe in building long-term..."
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 6. LEADERSHIP TEAM */}
                        <section id="sec-team" className="space-y-6 scroll-mt-36">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div>
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Leadership Team</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Executive profiles with reorder, replacement, and custom titles.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => set('hideTeam', !data.hideTeam)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideTeam
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideTeam ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideTeam ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addTeamMember}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Member
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Field
                                    label="Section Heading"
                                    value={data.teamTitle ?? 'Governance & Leadership'}
                                    onChange={(v) => set('teamTitle', v)}
                                    placeholder="Governance & Leadership"
                                />
                                <Field
                                    label="Section Sub-heading"
                                    value={data.teamSubtitle ?? 'Driven by a vision to revolutionize the Indian educational landscape.'}
                                    onChange={(v) => set('teamSubtitle', v)}
                                    placeholder="Driven by a vision..."
                                />
                                <Field
                                    label="Card Tag Badge"
                                    value={data.teamTag ?? 'Executive Team'}
                                    onChange={(v) => set('teamTag', v)}
                                    placeholder="Executive Team"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(data.team ?? []).map((t: any, i: number, arr: any[]) => (
                                    <div key={i} id={`team-item-${i}`} className="border border-gray-200 rounded-2xl p-4 space-y-4 shadow-sm bg-white relative group">
                                        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    #{i + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={i === 0}
                                                    onClick={() => moveTeamMember(i, i - 1)}
                                                    className="p-1 text-gray-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                                    title="Move Up"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={i === arr.length - 1}
                                                    onClick={() => moveTeamMember(i, i + 1)}
                                                    className="p-1 text-gray-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                                    title="Move Down"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                                {arr.length > 1 && (
                                                    <select
                                                        value={i}
                                                        onChange={(e) => moveTeamMember(i, Number(e.target.value))}
                                                        className="text-[10px] font-bold border border-gray-200 rounded px-1 py-0.5 bg-gray-50 text-slate-700"
                                                        title="Direct position jump"
                                                    >
                                                        {arr.map((_, idx) => (
                                                            <option key={idx} value={idx}>Pos {idx + 1}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeTeamMember(i)}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                                title="Delete Member"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <Field label="Name" value={t.name ?? ''} onChange={(v) => setTeamMember(i, 'name', v)} />
                                        <Field label="Role" value={t.role ?? ''} onChange={(v) => setTeamMember(i, 'role', v)} />
                                        <MediaImageField
                                            label="Image"
                                            value={t.image ?? ''}
                                            onChange={(v) => setTeamMember(i, 'image', v)}
                                            previewClassName="h-16 w-16 mx-auto rounded-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 7. DYNAMIC PARTNER TIERS & CATEGORY ROW BUILDER */}
                        <section id="sec-partners" className="space-y-6 scroll-mt-36">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div>
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Partner Tiers & Category Row Builder</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Add any number of rows. Each row can be a <strong>Full-Width Horizontal Banner</strong> or <strong>Segmented Category Boxes</strong>.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => set('hideEcosystem', !data.hideEcosystem)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideEcosystem
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideEcosystem ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideEcosystem ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addPartnerRow}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Tier Row
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field
                                    label="Main Section Heading"
                                    value={data.ecosystemTitle ?? 'Global Strategic Education Partners'}
                                    onChange={(v) => set('ecosystemTitle', v)}
                                    placeholder="Global Strategic Education Partners"
                                />
                                <Field
                                    label="Main Section Sub-heading"
                                    value={data.ecosystemSubtitle ?? ''}
                                    onChange={(v) => set('ecosystemSubtitle', v)}
                                    multiline
                                    placeholder="SchoolMart convenes world-leading curriculum developers..."
                                />
                            </div>

                            {/* ROWS LIST */}
                            {(!data.partnerRows || data.partnerRows.length === 0) ? (
                                <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                                    <p className="text-xs font-medium text-gray-500 mb-3">No partner tier rows created yet. Click below to add your first custom row.</p>
                                    <button
                                        type="button"
                                        onClick={addPartnerRow}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition shadow-xs cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add First Tier Row
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {(data.partnerRows ?? []).map((row: any, rIdx: number, rArr: any[]) => (
                                        <div key={row.id || rIdx} className="rounded-2xl border-2 border-slate-200 bg-white shadow-xs overflow-hidden">
                                            {/* ROW HEADER BAR */}
                                            <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase rounded border border-blue-500/30">
                                                        Row #{rIdx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">
                                                        {row.title || 'Untitled Tier'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        ({row.type === 'banner' ? 'Full Banner' : 'Category Boxes'})
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Row Position Controls */}
                                                    <button
                                                        type="button"
                                                        disabled={rIdx === 0}
                                                        onClick={() => movePartnerRow(rIdx, rIdx - 1)}
                                                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                                        title="Move Row Up"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={rIdx === rArr.length - 1}
                                                        onClick={() => movePartnerRow(rIdx, rIdx + 1)}
                                                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                                        title="Move Row Down"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                    {rArr.length > 1 && (
                                                        <select
                                                            value={rIdx}
                                                            onChange={(e) => movePartnerRow(rIdx, Number(e.target.value))}
                                                            className="text-[10px] font-bold border border-slate-700 rounded px-1.5 py-0.5 bg-slate-800 text-slate-200"
                                                            title="Direct position jump"
                                                        >
                                                            {rArr.map((_, idx) => (
                                                                <option key={idx} value={idx}>Pos {idx + 1}</option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {/* Row Live / Hidden Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPartnerRow(rIdx, 'hidden', !row.hidden)}
                                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                                                            row.hidden
                                                                ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                                                                : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                                                        }`}
                                                    >
                                                        {row.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        {row.hidden ? 'Row Hidden' : 'Row Live'}
                                                    </button>

                                                    {/* Delete Row Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => removePartnerRow(rIdx)}
                                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition cursor-pointer"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ROW SETTINGS FORM */}
                                            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                                        Row Title / Header
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={row.title ?? ''}
                                                        onChange={(e) => setPartnerRow(rIdx, 'title', e.target.value)}
                                                        placeholder="e.g. International Partners"
                                                        className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                                        Row Style / Format
                                                    </label>
                                                    <select
                                                        value={row.type || 'category-boxes'}
                                                        onChange={(e) => setPartnerRow(rIdx, 'type', e.target.value)}
                                                        className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                    >
                                                        <option value="banner">Full-Width Horizontal Banner (Divided by Lines)</option>
                                                        <option value="category-boxes">Segmented Category Boxes (Colocated Grid)</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                                        Header Strip Color
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={row.headerBg || '#004B9E'}
                                                            onChange={(e) => setPartnerRow(rIdx, 'headerBg', e.target.value)}
                                                            className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={row.headerBg || '#004B9E'}
                                                            onChange={(e) => setPartnerRow(rIdx, 'headerBg', e.target.value)}
                                                            className="flex-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-mono bg-white"
                                                            placeholder="#004B9E"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FORMAT 1: BANNER LOGOS BUILDER */}
                                            {row.type === 'banner' && (
                                                <div className="p-4 space-y-4">
                                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                            Logos in Banner ({row.bannerLogos?.length || 0})
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => addBannerLogo(rIdx)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition shadow-xs cursor-pointer"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Add Logo to Banner
                                                        </button>
                                                    </div>

                                                    {(!row.bannerLogos || row.bannerLogos.length === 0) ? (
                                                        <p className="text-xs text-gray-400 py-3 text-center">
                                                            No logos added to this banner yet. Click &quot;Add Logo to Banner&quot; above.
                                                        </p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {(row.bannerLogos ?? []).map((logo: any, lIdx: number) => (
                                                                <div key={lIdx} className="p-3 rounded-xl border border-gray-200 bg-white space-y-2 shadow-2xs">
                                                                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Logo #{lIdx + 1}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeBannerLogo(rIdx, lIdx)}
                                                                            className="text-gray-400 hover:text-red-500"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    <Field
                                                                        label="Name"
                                                                        value={logo.name ?? ''}
                                                                        onChange={(v) => setBannerLogo(rIdx, lIdx, 'name', v)}
                                                                        placeholder="e.g. Germany, Austrade"
                                                                    />
                                                                    <LogoUploadField
                                                                        label="Logo File (SVG/PNG <= 500KB)"
                                                                        value={logo.image ?? ''}
                                                                        onChange={(v) => setBannerLogo(rIdx, lIdx, 'image', v)}
                                                                    />
                                                                    <Field
                                                                        label="Link (Optional)"
                                                                        value={logo.href ?? ''}
                                                                        onChange={(v) => setBannerLogo(rIdx, lIdx, 'href', v)}
                                                                        placeholder="https://..."
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* FORMAT 2: CATEGORY BOXES BUILDER */}
                                            {row.type !== 'banner' && (
                                                <div className="p-4 space-y-4">
                                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                            Category Boxes in this Row ({row.categoryBoxes?.length || 0})
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => addCategoryBox(rIdx)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Add Category Box
                                                        </button>
                                                    </div>

                                                    {(!row.categoryBoxes || row.categoryBoxes.length === 0) ? (
                                                        <p className="text-xs text-gray-400 py-3 text-center">
                                                            No category boxes in this row yet. Click &quot;Add Category Box&quot; above.
                                                        </p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {(row.categoryBoxes ?? []).map((box: any, cIdx: number) => (
                                                                <div key={box.id || cIdx} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3 shadow-xs">
                                                                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase">Box #{cIdx + 1}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setCategoryBox(rIdx, cIdx, 'hidden', !box.hidden)}
                                                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                                                    box.hidden ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                                                }`}
                                                                            >
                                                                                {box.hidden ? 'Hidden' : 'Live'}
                                                                            </button>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeCategoryBox(rIdx, cIdx)}
                                                                            className="text-gray-400 hover:text-red-500"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>

                                                                    <Field
                                                                        label="Category Title"
                                                                        value={box.title ?? ''}
                                                                        onChange={(v) => setCategoryBox(rIdx, cIdx, 'title', v)}
                                                                        placeholder="e.g. Technology Partner"
                                                                    />

                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                                            Width Span
                                                                        </label>
                                                                        <select
                                                                            value={box.width || 'auto'}
                                                                            onChange={(e) => setCategoryBox(rIdx, cIdx, 'width', e.target.value)}
                                                                            className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                                                        >
                                                                            <option value="auto">Auto (Expands proportionally with logos)</option>
                                                                            <option value="standard">Standard (1x / 2 cols)</option>
                                                                            <option value="wide">Wide (2x / 4 cols)</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Logos inside this Box */}
                                                                    <div className="pt-2 border-t border-gray-100 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Logos in this Box ({box.logos?.length || 0})</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => addBoxLogo(rIdx, cIdx)}
                                                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                                                                            >
                                                                                + Add Logo
                                                                            </button>
                                                                        </div>

                                                                        {(box.logos ?? []).map((logo: any, lIdx: number) => (
                                                                            <div key={lIdx} className="p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Logo #{lIdx + 1}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => removeBoxLogo(rIdx, cIdx, lIdx)}
                                                                                        className="text-gray-400 hover:text-red-500"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                                <Field
                                                                                    label="Brand Name"
                                                                                    value={logo.name ?? ''}
                                                                                    onChange={(v) => setBoxLogo(rIdx, cIdx, lIdx, 'name', v)}
                                                                                    placeholder="e.g. Google, IBM"
                                                                                />
                                                                                <LogoUploadField
                                                                                    label="Logo File"
                                                                                    value={logo.image ?? ''}
                                                                                    onChange={(v) => setBoxLogo(rIdx, cIdx, lIdx, 'image', v)}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
) : (
                    // ─── GENERIC TEMPLATE EDITOR ──────────────────────────────────────────
                    <>
                        {page.slug !== 'blog' && page.slug !== 'science-tech-labs' && page.slug !== 'classifieds' && page.slug !== 'job-openings' && page.slug !== 'faq' && !isArticlePage && (
                            <section id="sec-hero" className="space-y-6 scroll-mt-36">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Hero Banner Content</h4>
                                    <button
                                        type="button"
                                        onClick={() => set('hideHero', !data.hideHero)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideHero
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideHero ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideHero ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <Field
                                                label="Category / Eyebrow Tag"
                                                value={data.heroEyebrow ?? ''}
                                                onChange={(v) => set('heroEyebrow', v)}
                                                placeholder={effectiveDefaults.heroEyebrow || 'e.g. Solutions & Offerings'}
                                                hint="Top badge directly above headline"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Field
                                                label="Hero Heading *"
                                                value={data.heroTitle ?? ''}
                                                onChange={(v) => set('heroTitle', v)}
                                                placeholder="Headline for the page..."
                                            />
                                        </div>
                                    </div>
                                    <Field
                                        label="Hero Sub-heading"
                                        value={data.heroSubtitle ?? ''}
                                        onChange={(v) => set('heroSubtitle', v)}
                                        multiline
                                        placeholder="Supporting text displayed below the headline…"
                                    />
                                    {('formIntro' in effectiveDefaults || page.slug === 'partnership' || page.slug === 'partner-with-colleges') && (
                                        <Field
                                            label="Text Above Form / Introductory Note"
                                            value={data.formIntro ?? ''}
                                            onChange={(v) => set('formIntro', v)}
                                            multiline
                                            placeholder="Explanatory paragraph displayed directly above the form fields…"
                                        />
                                    )}
                                    {page.slug === 'colleges-universities-for-sale' && (
                                        <Field
                                            label="Search Filter Label"
                                            value={data.filterLabel ?? ''}
                                            onChange={(v) => set('filterLabel', v)}
                                            placeholder="cbse schools"
                                        />
                                    )}

                                    <MediaImageField
                                        label="Hero Image Backdrop / Cover Banner"
                                        value={data.heroImage ?? data.featuredImage ?? ''}
                                        onChange={(v) => {
                                            set('heroImage', v);
                                            set('featuredImage', v);
                                        }}
                                        previewClassName="h-48 rounded-2xl"
                                    />

                                    {('heroButton1Label' in effectiveDefaults || 'heroButton1Label' in data || page.slug === 'furniture') ? (
                                        <div className="space-y-4 pt-2 border-t border-gray-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <Field
                                                    label="Primary Hero Button Label"
                                                    value={data.heroButton1Label ?? data.heroButtonLabel ?? ''}
                                                    onChange={(v) => {
                                                        set('heroButton1Label', v);
                                                        set('heroButtonLabel', v);
                                                    }}
                                                    placeholder="View Collections"
                                                />
                                                <Field
                                                    label="Primary Hero Button Link"
                                                    value={data.heroButton1Href ?? data.heroButtonHref ?? ''}
                                                    onChange={(v) => {
                                                        set('heroButton1Href', v);
                                                        set('heroButtonHref', v);
                                                    }}
                                                    placeholder="/catalogues"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <Field
                                                    label="Secondary Hero Button Label"
                                                    value={data.heroButton2Label ?? ''}
                                                    onChange={(v) => set('heroButton2Label', v)}
                                                    placeholder="Get Quote"
                                                />
                                                <Field
                                                    label="Secondary Hero Button Link"
                                                    value={data.heroButton2Href ?? ''}
                                                    onChange={(v) => set('heroButton2Href', v)}
                                                    placeholder="/request-quote"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                                            <Field
                                                label="Hero Button Label (Optional)"
                                                value={data.heroButtonLabel ?? ''}
                                                onChange={(v) => set('heroButtonLabel', v)}
                                                placeholder={page.slug === 'catalogues' ? 'Request Custom Catalogue' : 'e.g. Explore Guides (leave empty to hide)'}
                                            />
                                            <Field
                                                label="Hero Button Link"
                                                value={data.heroButtonHref ?? ''}
                                                onChange={(v) => set('heroButtonHref', v)}
                                                placeholder="/contact-us"
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}


                        {isContactUs && (
                            <>
                                <section className="space-y-6 rounded-2xl border-2 border-blue-500/20 bg-blue-50/30 p-6 sm:p-7 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-100 gap-2">
                                        <div>
                                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                Global Contact Channels (Live Synchronized)
                                            </h4>
                                            <p className="text-xs text-blue-700 mt-1 font-medium">
                                                ⚡ Synced across TopBar, Footer, and Contact Us page.
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
                                            Live Channels
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Primary Phone Number *"
                                            value={data.contact_phone ?? ''}
                                            onChange={(v) => updateContactChannel('contact_phone', v)}
                                            placeholder="+91 9966109191"
                                            hint="Required · TopBar & Contact Us"
                                        />
                                        <Field
                                            label="Alternate Phone Number"
                                            value={data.contact_phone_alt ?? ''}
                                            onChange={(v) => updateContactChannel('contact_phone_alt', v)}
                                            placeholder="+91 9866091111"
                                            hint="Optional · Contact Us page"
                                        />
                                        <Field
                                            label="WhatsApp Business Number"
                                            value={data.contact_whatsapp ?? ''}
                                            onChange={(v) => set('contact_whatsapp', v)}
                                            placeholder="919966109191"
                                            hint="WhatsApp button & quick action"
                                        />
                                        <Field
                                            label="Primary Email Address"
                                            value={data.contact_email ?? ''}
                                            onChange={(v) => updateContactChannel('contact_email', v)}
                                            placeholder="info@schoolmart.in"
                                            hint="TopBar & Contact Us"
                                        />
                                        <Field
                                            label="Secondary / Support Email"
                                            value={data.contact_email_alt ?? ''}
                                            onChange={(v) => updateContactChannel('contact_email_alt', v)}
                                            placeholder="support@schoolmart.in"
                                            hint="Optional · Contact Us page"
                                        />
                                        <div className="md:col-span-2">
                                            <Field
                                                label="Working Hours"
                                                value={data.contact_hours ?? ''}
                                                onChange={(v) => updateContactChannel('contact_hours', v)}
                                                multiline
                                                placeholder="Monday - Friday: 9:00 AM - 6:00 PM&#10;Saturday: 10:00 AM - 4:00 PM"
                                                hint="Hours card on Contact Us"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Field
                                                label="Office Address"
                                                value={data.contact_address ?? ''}
                                                onChange={(v) => set('contact_address', v)}
                                                multiline
                                                placeholder="SchoolMart Head Office&#10;Hyderabad, Telangana, India"
                                                hint="Global site address"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">WhatsApp CTA Banner</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="CTA Heading"
                                            value={data.whatsappCtaTitle ?? ''}
                                            onChange={(v) => set('whatsappCtaTitle', v)}
                                            placeholder="Chat with us on WhatsApp"
                                        />
                                        <Field
                                            label="CTA Button Label"
                                            value={data.whatsappCtaButton ?? ''}
                                            onChange={(v) => set('whatsappCtaButton', v)}
                                            placeholder="Start WhatsApp Chat"
                                        />
                                        <div className="md:col-span-2">
                                            <Field
                                                label="CTA Subtitle"
                                                value={data.whatsappCtaSubtitle ?? ''}
                                                onChange={(v) => set('whatsappCtaSubtitle', v)}
                                                multiline
                                                placeholder="Get direct support and immediate quotation guidance through WhatsApp with our team."
                                            />
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {page.slug === 'science-tech-labs' && (
                            <>
                                {/* 1. Header & Introduction */}
                                <section id="sec-hero" className="space-y-6 scroll-mt-36">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                            Editorial Layout Content
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => set('hideHeader', !data.hideHeader)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                data.hideHeader
                                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            {data.hideHeader ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {data.hideHeader ? 'Hidden / Draft' : 'Live on Page'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field label="Section Eyebrow" value={data.sectionLabel ?? ''} onChange={(v) => set('sectionLabel', v)} placeholder="Explore the guide" />
                                        <Field label="Section Heading" value={data.sectionTitle ?? ''} onChange={(v) => set('sectionTitle', v)} placeholder="AI, your way." />
                                        <Field label="Section Description" value={data.sectionDescription ?? ''} onChange={(v) => set('sectionDescription', v)} multiline placeholder="Helpful perspectives for leaders, faculty and teams shaping the next generation of learning environments." />
                                        <Field label="Latest Labs Heading" value={data.latestTitle ?? ''} onChange={(v) => set('latestTitle', v)} placeholder="Latest insights" />
                                        <Field label="View All Label" value={data.viewAllLabel ?? ''} onChange={(v) => set('viewAllLabel', v)} placeholder="View all" />
                                        <Field label="Featured Link Label" value={data.readMoreLabel ?? ''} onChange={(v) => set('readMoreLabel', v)} placeholder="Read article" />
                                    </div>
                                </section>

                                {/* 2. Filter Categories */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Filter Categories</h4>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => set('hideFilters', !data.hideFilters)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                    data.hideFilters
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                {data.hideFilters ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {data.hideFilters ? 'Hidden / Draft' : 'Live on Page'}
                                            </button>
                                            <button type="button" onClick={addFilter} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-amber-700 transition-all shadow-md">
                                                <Plus className="w-4 h-4" /> Add Filter
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {(data.filters ?? []).map((filter: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={filter} onChange={(e) => setFilter(i, e.target.value)} />
                                                <button type="button" onClick={() => removeFilter(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* 3. Featured Article Showcase */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                            Featured Laboratory Showcase
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => set('hideFeatured', !data.hideFeatured)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                data.hideFeatured
                                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            {data.hideFeatured ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {data.hideFeatured ? 'Hidden / Draft' : 'Live on Page'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field label="Laboratory Title" value={data.featured?.title ?? ''} onChange={(v) => setFeatured('title', v)} placeholder="Where should your campus begin with AI?" />
                                        <Field label="Description" value={data.featured?.description ?? ''} onChange={(v) => setFeatured('description', v)} multiline placeholder="A thoughtful starting point can turn a complex technology decision into a sequence of useful, measurable steps for your institution." />
                                        <MediaImageField label="Featured Image" value={data.featured?.image ?? ''} onChange={(v) => setFeatured('image', v)} previewClassName="h-32" />
                                        <Field label="Action Link Label" value={data.featured?.readMoreLabel ?? ''} onChange={(v) => setFeatured('readMoreLabel', v)} placeholder="Explore Lab Programme" />
                                        <Field label="Custom Action URL (Optional)" value={data.featured?.href ?? ''} onChange={(v) => setFeatured('href', v)} placeholder="/contact-us or leave blank for detail" />
                                    </div>
                                </section>
                            </>
                        )}

                        {page.slug === 'blog' && (
                            <BlogEditorSection data={data} set={set} />
                        )}

                        {page.slug === 'classifieds' && (
                            <>
                                <section id="sec-hero" className="space-y-6 scroll-mt-36">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Page Header Content</h4>
                                        <button
                                            type="button"
                                            onClick={() => set('hideHero', !data.hideHero)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                data.hideHero
                                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            {data.hideHero ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {data.hideHero ? 'Hidden / Draft' : 'Live on Page'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <Field label="Header Eyebrow Badge" value={data.heroEyebrow ?? 'SchoolMart Opportunities'} onChange={(v) => set('heroEyebrow', v)} />
                                        <Field label="Page Heading" value={data.heroTitle ?? ''} onChange={(v) => set('heroTitle', v)} />
                                        <Field label="Page Description" value={data.heroSubtitle ?? ''} onChange={(v) => set('heroSubtitle', v)} multiline />
                                        <Field label="Header Button Label" value={data.heroButtonLabel ?? 'Post a Classified'} onChange={(v) => set('heroButtonLabel', v)} />
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Opportunity Filter Categories</h4>
                                        <button
                                            type="button"
                                            onClick={() => addUgcArrayItem('categories', 'New Category')}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                        >
                                            <Plus className="w-4 h-4" /> Add Category
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                                        {(data.categories ?? []).map((category: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm" value={category} onChange={(e) => setUgcArrayItem('categories', i, e.target.value)} />
                                                <button type="button" onClick={() => removeUgcArrayItem('categories', i)} className="p-2 text-red-400 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Featured Opportunity Banner</h4>
                                        <button
                                            type="button"
                                            onClick={() => set('hideFeatured', !data.hideFeatured)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                data.hideFeatured
                                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            {data.hideFeatured ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {data.hideFeatured ? 'Hidden / Draft' : 'Live on Page'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <Field label="Eyebrow" value={data.featured?.eyebrow ?? ''} onChange={(v) => setFeatured('eyebrow', v)} />
                                        <Field label="Title" value={data.featured?.title ?? ''} onChange={(v) => setFeatured('title', v)} />
                                        <Field label="Description" value={data.featured?.description ?? ''} onChange={(v) => setFeatured('description', v)} multiline />
                                        <MediaImageField label="Featured Image" value={data.featured?.image ?? ''} onChange={(v) => setFeatured('image', v)} previewClassName="h-32" />
                                        <Field label="Explore Link Label" value={data.featured?.exploreLabel ?? ''} onChange={(v) => setFeatured('exploreLabel', v)} placeholder="Explore all opportunities" />
                                        <Field label="Post Button Label" value={data.featured?.postButtonLabel ?? ''} onChange={(v) => setFeatured('postButtonLabel', v)} placeholder="Post Opportunity" />
                                    </div>
                                </section>
                            </>
                        )}

                        {page.slug === 'job-openings' && (
                            isStructured ? (
                                <ItemsManager
                                    pageId={page.id}
                                    pageSlug={page.slug}
                                    collection="openings"
                                    label="Job Openings"
                                />
                            ) : (
                                <JobOpeningsEditorSection
                                    data={data}
                                    set={set}
                                    onSyncOpenings={async (nextOpenings) => {
                                        const nextData = { ...data, openings: nextOpenings };
                                        setData(nextData);
                                        try {
                                            const { data: updated } = await api.put(`/pages/${page.id}`, {
                                                title,
                                                published,
                                                pageData: JSON.stringify(nextData),
                                            });
                                            clearPageDataCache(page.slug);
                                            clearPageDataCache();
                                            broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: page.slug });
                                            broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });
                                            setSaved(true);
                                            setTimeout(() => setSaved(false), 2000);
                                            if (onSaved) onSaved(updated);
                                        } catch (err: any) {
                                            console.error('Failed to sync job openings:', err);
                                            const msg = err?.response?.data?.error || 'Failed to save job openings.';
                                            setSaveError(msg);
                                        }
                                    }}
                                />
                            )
                        )}

                        {page.slug === 'faq' && (
                            isStructured ? (
                                <ItemsManager
                                    pageId={page.id}
                                    pageSlug={page.slug}
                                    collection="faqs"
                                    label="Frequently Asked Questions"
                                />
                            ) : (
                                <FaqEditorSection
                                    data={data}
                                    set={set}
                                />
                            )
                        )}

                        {/* NDA & Mandate documents (colleges-universities-for-sale only) */}
                        {page.slug === 'colleges-universities-for-sale' && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Business Documents</h4>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Shown at the top of the page. Registered users can download these directly; visitors who aren't logged in are prompted to register.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <DocumentUploadField label="NDA (Non-Disclosure Agreement)" value={data.ndaUrl ?? ''} onChange={(v) => set('ndaUrl', v)} />
                                    <DocumentUploadField label="Mandate" value={data.mandateUrl ?? ''} onChange={(v) => set('mandateUrl', v)} />
                                </div>
                            </section>
                        )}

                        {/* Optional Custom Labels block */}
                        {('section1Title' in data || 'section1Title' in effectiveDefaults || 'section2Title' in data || 'section2Title' in effectiveDefaults) && page.slug !== 'digital-transformation' && page.slug !== 'furniture' && !isArticlePage && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Custom Section Labels</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {('section1Title' in data || 'section1Title' in effectiveDefaults) && (
                                        <Field label="Content Section Title" value={data.section1Title ?? ''} onChange={(v) => set('section1Title', v)} placeholder="e.g. Solutions" />
                                    )}
                                    {('section2Title' in data || 'section2Title' in effectiveDefaults) && (
                                        <Field label="Features Section Title" value={data.section2Title ?? ''} onChange={(v) => set('section2Title', v)} placeholder="e.g. Benefits" />
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Digital Transformation Dedicated Sections (Ordered 1:1 with Live Page) */}
                        {page.slug === 'digital-transformation' && (
                            <>
                                {/* Section 1 on Live Page: Why Go Digital */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                Why Go Digital Section (The Impact)
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-0.5">Section 1 on live page</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => set('hideSection2', !data.hideSection2)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                    data.hideSection2
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                {data.hideSection2 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {data.hideSection2 ? 'Hidden / Draft' : 'Live on Page'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addSection2Card}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                            >
                                                <Plus className="w-4 h-4" /> New Impact Card
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Section Eyebrow Tag"
                                            value={data.section2Eyebrow ?? ''}
                                            onChange={(v) => set('section2Eyebrow', v)}
                                            placeholder="The Impact"
                                        />
                                        <Field
                                            label="Section Title"
                                            value={data.section2Title ?? ''}
                                            onChange={(v) => set('section2Title', v)}
                                            placeholder="Why Go Digital"
                                        />
                                        <div className="md:col-span-2">
                                            <Field
                                                label="Supporting Description"
                                                value={data.section2Description ?? ''}
                                                onChange={(v) => set('section2Description', v)}
                                                placeholder="Most institutions we work with see measurable results..."
                                                multiline
                                            />
                                        </div>
                                    </div>

                                    {/* Impact Cards Grid */}
                                    {isStructured ? (
                                        <ItemsManager
                                            pageId={page.id}
                                            pageSlug={page.slug}
                                            collection="section2Cards"
                                            label="Impact Cards"
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                                Impact Cards ({(data.section2Cards ?? []).length})
                                            </h5>
                                            <div className="grid grid-cols-1 gap-6">
                                                {(data.section2Cards ?? []).map((card: any, i: number) => (
                                                    <div key={i} id={`section2-card-item-${i}`} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/30 hover:bg-white hover:shadow-lg hover:border-blue-200 transition-all group relative">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">{i + 1}</span>
                                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{card.title || 'Untitled Card'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSection2Card(i, 'active', card.active === false ? true : false)}
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                        card.active !== false
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${card.active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                                    <span>{card.active !== false ? 'Live' : 'Hidden'}</span>
                                                                </button>
                                                                <button type="button" onClick={() => removeSection2Card(i)} className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-wider">
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <Field label="Card Title" value={card.title ?? ''} onChange={(v) => setSection2Card(i, 'title', v)} />
                                                            <Field label="Card Link (Optional)" value={card.href ?? ''} onChange={(v) => setSection2Card(i, 'href', v)} placeholder="/digital-transformation/..." />
                                                            <div className="md:col-span-2">
                                                                <Field label="Card Description" value={card.description ?? ''} onChange={(v) => setSection2Card(i, 'description', v)} richText />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <MediaImageField label="Image" value={card.image ?? ''} onChange={(v) => setSection2Card(i, 'image', v)} previewClassName="h-24" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Section 2 on Live Page: Our Expertise / Digital Services */}
                                <section id="sec-cards" className="space-y-6 scroll-mt-36">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                Our Expertise / Services Section
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-0.5">Section 2 on live page</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => set('hideCards', !data.hideCards)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                    data.hideCards
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                {data.hideCards ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {data.hideCards ? 'Hidden / Draft' : 'Live on Page'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addCard}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                            >
                                                <Plus className="w-4 h-4" /> New Expertise Card
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Section Eyebrow Tag"
                                            value={data.section1Eyebrow ?? ''}
                                            onChange={(v) => set('section1Eyebrow', v)}
                                            placeholder="Our Expertise"
                                        />
                                        <Field
                                            label="Section Title"
                                            value={data.section1Title ?? ''}
                                            onChange={(v) => set('section1Title', v)}
                                            placeholder="Digital Services"
                                        />
                                    </div>

                                    {/* Expertise Cards Grid */}
                                    <div className="space-y-4">
                                        <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                            Numbered Service Cards ({(data.cards ?? []).length})
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(data.cards ?? []).map((card: CardItem, i: number) => (
                                                <div key={i} id={`card-item-${i}`} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/30 hover:bg-white hover:shadow-lg hover:border-blue-200 transition-all group relative">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">{String(i + 1).padStart(2, '0')}</span>
                                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{card.title || 'Untitled Card'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCard(i, 'active', (card as any).active === false ? true : false)}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                    (card as any).active !== false
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${(card as any).active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                                <span>{(card as any).active !== false ? 'Live' : 'Hidden'}</span>
                                                            </button>
                                                            <button type="button" onClick={() => removeCard(i)} className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-wider">
                                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Field label="Service Title" value={card.title ?? ''} onChange={(v) => setCard(i, 'title', v)} />
                                                        <Field label="Service Description" value={card.description ?? ''} onChange={(v) => setCard(i, 'description', v)} richText />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* Section 3 on Live Page: How We Work / Process Steps */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                How We Work / Process Steps Section
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-0.5">Section 3 on live page</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => set('hideSections', !data.hideSections)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                    data.hideSections
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                {data.hideSections ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {data.hideSections ? 'Hidden / Draft' : 'Live on Page'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addSection}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                            >
                                                <Plus className="w-4 h-4" /> New Step
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Section Eyebrow Tag"
                                            value={data.processEyebrow ?? ''}
                                            onChange={(v) => set('processEyebrow', v)}
                                            placeholder="How We Work"
                                        />
                                        <Field
                                            label="Section Title"
                                            value={data.processTitle ?? ''}
                                            onChange={(v) => set('processTitle', v)}
                                            placeholder="From Assessment to Adoption"
                                        />
                                    </div>

                                    {/* Process Steps */}
                                    <div className="space-y-6">
                                        {(data.sections ?? []).map((section: SectionItem, i: number) => (
                                            <div key={i} id={`section-item-${i}`} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/30 relative">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">{String(i + 1).padStart(2, '0')}</span>
                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{section.heading || 'Untitled Step'}</span>
                                                    </div>
                                                    <button type="button" onClick={() => removeSection(i)} className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-wider">
                                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Field label="Step Heading" value={section.heading ?? ''} onChange={(v) => setSection(i, 'heading', v)} placeholder="e.g. Assess" />
                                                    <Field label="Step Description" value={section.body ?? ''} onChange={(v) => setSection(i, 'body', v)} richText placeholder="Review current systems..." />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* Catalogues unified info banner */}
                        {page.slug === 'catalogues' && (
                            <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-900">Downloadable Catalogues &amp; Case Studies</h4>
                                        <p className="text-xs text-emerald-700 mt-1 max-w-2xl">
                                            Manage your brochure cards and case studies directly in this page editor. Use the <strong>Upload PDF</strong> button on each card to save documents natively to server disk for 1-click visitor downloads.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold border border-emerald-200">
                                            ⚡ Live Database Driven
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ─── Solution Hub Partner & Brand Logos Marquee ─── */}
                        {(page.template === 'solution-hub' || page.slug === 'sports-infra' || page.slug === 'labs' || page.slug === 'libraries' || page.slug === 'tech-infra' || Array.isArray(data.partnerLogos)) && !isArticlePage && (
                            <section id="sec-logos" className="space-y-6 scroll-mt-36">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-100 gap-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                            Brand &amp; Partner Logos Ticker
                                        </h4>
                                        <span className="text-[11px] text-gray-400 font-medium">
                                            (Auto-scrolling logo strip below Hero)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => set('hidePartnerLogos', data.hidePartnerLogos === undefined ? false : !data.hidePartnerLogos)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                data.hidePartnerLogos !== false
                                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            {data.hidePartnerLogos !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {data.hidePartnerLogos !== false ? 'Hidden / Draft' : 'Live on Page'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addPartnerLogo}
                                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Brand Logo
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
                                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="font-semibold text-blue-950">Upload Requirements &amp; Guidelines:</p>
                                        <p className="text-blue-800 leading-relaxed">
                                            Only <strong>SVG</strong> or <strong>PNG</strong> files under <strong>500 KB</strong> (transparent background recommended, ~400×120px ratio). Logos revolve in an infinite hardware-accelerated auto-scroll strip without text names on the live site.
                                        </p>
                                    </div>
                                </div>

                                {(!data.partnerLogos || data.partnerLogos.length === 0) ? (
                                    <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                                        <p className="text-xs font-medium text-gray-500 mb-3">No brand logos added yet. Click &quot;Add Brand Logo&quot; above to upload your first partner logo.</p>
                                        <button
                                            type="button"
                                            onClick={addPartnerLogo}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4 text-blue-600" /> Add First Logo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(data.partnerLogos ?? []).map((logo: any, i: number) => (
                                            <div key={i} className="relative p-4 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3 group hover:border-blue-300 transition-colors">
                                                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        Logo #{i + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePartnerLogo(i)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                                        title="Delete Logo"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <Field
                                                    label="Brand Name (Admin & Alt Tag)"
                                                    value={logo.name ?? ''}
                                                    onChange={(v) => setPartnerLogo(i, 'name', v)}
                                                    placeholder="e.g. Adidas, DecoTurf"
                                                />

                                                <LogoUploadField
                                                    label="Logo File (SVG or PNG only, max 500 KB)"
                                                    value={logo.image ?? ''}
                                                    onChange={(v) => setPartnerLogo(i, 'image', v)}
                                                />

                                                <Field
                                                    label="Website Link (Optional)"
                                                    value={logo.href ?? ''}
                                                    onChange={(v) => setPartnerLogo(i, 'href', v)}
                                                    placeholder="https://... or leave empty"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {(!isArticlePage || (data.cards ?? []).length > 0) && page.slug !== 'digital-transformation' && (() => {
                            const cardsUseCategories = (!isArticlePage || (data.cards ?? effectiveDefaults.cards ?? []).some((c: any) => Array.isArray(c?.categories)) || page.slug === 'sports-infra' || page.slug === 'tech-infra' || page.slug === 'libraries' || page.slug === 'labs') && page.slug !== 'science-tech-labs';
                            const explicitCats: string[] = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
                            const cardCats: string[] = (data.cards ?? []).flatMap((c: any) =>
                                Array.isArray(c?.categories) ? c.categories : c?.category ? [c.category] : []
                            ).filter(Boolean);
                            const allAvailableCategories = Array.from(new Set<string>([...explicitCats, ...cardCats]));
                            const cardsUseDownloadLink = (data.cards ?? effectiveDefaults.cards ?? []).some((c: any) => 'downloadLink' in (c || {})) || page.slug === 'catalogues';
                            if (page.slug === 'furniture') {
                                return null;
                            }
                            if (layoutMode === 'article') {
                                if ((data.cards ?? []).length > 0) {
                                    return (
                                        <section className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
                                            <div className="flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span>This article also contains <strong>{(data.cards ?? []).length} interactive card(s)</strong> in its collection.</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleLayoutModeChange('grid')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-700 hover:text-blue-900 font-bold hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                                            >
                                                Switch to Card Grid View to Edit Cards →
                                            </button>
                                        </section>
                                    );
                                }
                                return null;
                            }
                            if (isStructured) {
                                return (
                                    <div className="space-y-8 scroll-mt-36">
                                        <CategoryManager pageId={page.id} pageSlug={page.slug} />
                                        <ItemsManager
                                            pageId={page.id}
                                            pageSlug={page.slug}
                                            collection="cards"
                                            label={page.slug === 'ai-guide' ? 'Latest Articles Grid' : page.slug === 'classifieds' ? 'Opportunity Cards' : 'Interactive Cards'}
                                            availableCategories={allAvailableCategories}
                                            targetCardSlug={targetCardSlug}
                                        />
                                    </div>
                                );
                            }
                            return (
                                <section id="sec-cards" className="space-y-6 scroll-mt-36">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                            {page.slug === 'ai-guide' ? 'Latest Articles Grid' : page.slug === 'classifieds' ? 'Opportunity Cards' : 'Interactive Cards'} <span className="text-blue-500 ml-2">({(data.cards ?? []).length})</span>
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => set('hideCards', !data.hideCards)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                    data.hideCards
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                {data.hideCards ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {data.hideCards ? 'Hidden / Draft' : 'Live on Page'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addCard}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                            >
                                                <Plus className="w-4 h-4" /> {page.slug === 'classifieds' ? 'New Opportunity Card' : 'New Card'}
                                            </button>
                                        </div>
                                    </div>

                                    {page.slug === 'ai-guide' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-2">
                                            <Field label="Articles Section Heading" value={data.latestTitle ?? ''} onChange={(v) => set('latestTitle', v)} placeholder="Latest insights" />
                                            <Field label="View All Button Label" value={data.viewAllLabel ?? ''} onChange={(v) => set('viewAllLabel', v)} placeholder="View all" />
                                        </div>
                                    )}

                                    {page.slug === 'colleges-universities-for-sale' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-2">
                                            <Field label="Left Button Text (All Cards)" value={data.cardDetailsButtonLabel ?? 'View Full Details'} onChange={(v) => set('cardDetailsButtonLabel', v)} placeholder="View Full Details" />
                                            <Field label="Right Button Text (All Cards)" value={data.cardContactButtonLabel ?? 'Contact Business'} onChange={(v) => set('cardContactButtonLabel', v)} placeholder="Contact Business" />
                                        </div>
                                    )}

{cardsUseCategories && (
                                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                                                        Filter Categories ({allAvailableCategories.length})
                                                    </span>
                                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                                        Live Card Grid Filters
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-blue-700 font-medium">
                                                    Categories in this list appear as live 1-click filter chips above the card grid
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 items-center">
                                                {allAvailableCategories.length === 0 ? (
                                                    <p className="text-xs text-slate-500 italic">
                                                        No categories created yet. Type a category name below and click &ldquo;Add Category&rdquo; to create one.
                                                    </p>
                                                ) : (
                                                    allAvailableCategories.map((cat: string) => {
                                                        const count = (data.cards ?? []).filter((c: any) =>
                                                            (Array.isArray(c?.categories) && c.categories.includes(cat)) || c?.category === cat
                                                        ).length;
                                                        return (
                                                            <span
                                                                key={cat}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-900 text-xs font-bold shadow-xs group"
                                                            >
                                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                                {cat}
                                                                <span className="text-[10px] text-blue-600 font-semibold">
                                                                    ({count} {count === 1 ? 'card' : 'cards'})
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveGlobalCategory(cat)}
                                                                    className="w-4 h-4 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors ml-1 cursor-pointer"
                                                                    title={`Delete "${cat}" category`}
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Central Categories Manager Shortcut */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-blue-200/60">
                                                <div className="text-xs text-blue-800 font-medium flex items-center gap-1.5">
                                                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Categories are managed centrally to maintain clean classification across the platform.</span>
                                                </div>
                                                <a
                                                    href={`/admin/categories?page=${page.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                                                >
                                                    <FolderOpen className="w-3.5 h-3.5" />
                                                    <span>Manage Categories in Central Hub</span>
                                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4">
                                        {(data.cards ?? []).filter(Boolean).map((card: any, i: number) => {
                                            const isExpanded = expandedCardIndex === i;
                                            return (
                                                <div
                                                    key={i}
                                                    id={`card-item-${i}`}
                                                    className={`rounded-2xl border transition-all overflow-hidden ${
                                                        isExpanded
                                                            ? 'border-blue-400 bg-white ring-2 ring-blue-50 shadow-md'
                                                            : 'border-gray-200 bg-gray-50/40 hover:bg-white hover:border-gray-300'
                                                    }`}
                                                >
                                                    {/* Collapsible Header Strip - Whole Strip Clickable */}
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-expanded={isExpanded}
                                                        onClick={() => setExpandedCardIndex(isExpanded ? null : i)}
                                                        onKeyDown={(e) => {
                                                            if (e.target !== e.currentTarget) return;
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setExpandedCardIndex(isExpanded ? null : i);
                                                            }
                                                        }}
                                                        className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                                                #{String(i + 1).padStart(2, '0')}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-900 text-sm truncate max-w-xs sm:max-w-md">
                                                                        {card.title || 'Untitled Card'}
                                                                    </span>
                                                                    {(card.categories?.[0] || card.category) && (
                                                                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                                                            {card.categories?.[0] || card.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {(card.slug || card.href) && (
                                                                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                                                        /{page.slug}/{(card.slug || card.href).replace(/^\/+|\/+$/g, '')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {/* Live / Hidden Toggle */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCard(i, 'active', card.active === false ? true : false);
                                                                }}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                                    card.active !== false
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${card.active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                                <span>{card.active !== false ? 'Live' : 'Hidden'}</span>
                                                            </button>

                                                            {/* Delete */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeCard(i);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                                                                title="Delete this card"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>

                                                            {/* Open / Close indicator */}
                                                            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700">
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                <span className="hidden sm:inline">{isExpanded ? 'Close' : 'Open'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Form Body */}
                                                    {isExpanded && (
                                                        <div className="p-6 pt-2 border-t border-gray-100 space-y-6 bg-white">
                                                            {/* Slug Validation Error Warning */}
                                                            {slugValidationErrors[i] && (
                                                                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-amber-900 text-xs font-medium">
                                                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                                    <span>{slugValidationErrors[i]}</span>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <Field
                                                                    label={page.slug === 'ai-guide' ? 'Article Title' : page.slug === 'classifieds' ? 'Opportunity Title' : 'Card Title'}
                                                                    value={card.title ?? ''}
                                                                    onChange={(v) => setCard(i, 'title', v)}
                                                                    placeholder={page.slug === 'classifieds' ? 'Opportunity Title' : 'Card Title'}
                                                                />

                                                                {/* Subpage Slug & Link Destination Field */}
                                                                <div className="space-y-1.5">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                                                        <label className="block text-sm font-bold text-gray-700">
                                                                            Subpage URL Slug / Destination Link
                                                                        </label>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={card.slug !== undefined && card.slug !== null ? card.slug : (card.href ? card.href.replace(/^\/+/, '') : '')}
                                                                            onChange={(e) => {
                                                                                const raw = e.target.value;
                                                                                if (!raw.trim()) {
                                                                                    updateCard(i, { slug: '', href: '' });
                                                                                } else {
                                                                                    const cleanSlug = raw.trim().replace(/^\/+/, '');
                                                                                    const cleanHref = raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#') || raw.startsWith('/')
                                                                                        ? raw.trim()
                                                                                        : `/${cleanSlug}`;
                                                                                    updateCard(i, { slug: cleanSlug, href: cleanHref });
                                                                                }
                                                                                if (slugValidationErrors[i]) {
                                                                                    setSlugValidationErrors(prev => {
                                                                                        const next = { ...prev };
                                                                                        delete next[i];
                                                                                        return next;
                                                                                    });
                                                                                }
                                                                            }}
                                                                            placeholder={slugifyCardTitle(card.title) || 'subpage-slug'}
                                                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-slate-800"
                                                                            title="Hook this card to an existing CMS page or enter a custom destination"
                                                                        />
                                                                        <a
                                                                            href={card.href?.startsWith('http') ? card.href : (card.href?.startsWith('/') ? card.href : `/${page.slug}/${(card.slug || slugifyCardTitle(card.title) || '').replace(/^\/+/, '')}`)}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                                                                            title="View this card's live subpage in a new tab"
                                                                        >
                                                                            <ExternalLink className="w-3.5 h-3.5" /> View Live Subpage
                                                                        </a>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 font-mono">
                                                                        Destination: {card.href?.startsWith('http') ? card.href : (card.href?.startsWith('/') ? card.href : `/${page.slug}/${(card.slug || slugifyCardTitle(card.title) || 'subpage').replace(/^\/+/, '').replace(/\/+$/, '')}`)}
                                                                    </p>
                                                                </div>

                                                                <Field
                                                                    label={page.slug === 'ai-guide' ? 'Article Summary' : page.slug === 'classifieds' ? 'Opportunity Description' : 'Card Teaser Summary (Displayed on Card Grid)'}
                                                                    value={card.description ?? ''}
                                                                    onChange={(v) => setCard(i, 'description', v)}
                                                                    richText
                                                                    placeholder={page.slug === 'classifieds' ? 'Opportunity overview...' : 'Card teaser description...'}
                                                                />

                                                                {/* In-Depth Subpage Dual-Content Toggle */}
                                                                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
                                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                                        <div className="space-y-0.5">
                                                                            <label className="text-sm font-bold text-slate-900 flex items-center gap-2 cursor-pointer select-none">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={Boolean(card.useCustomDetail)}
                                                                                    onChange={(e) => {
                                                                                        const checked = e.target.checked;
                                                                                        updateCard(i, {
                                                                                            useCustomDetail: checked,
                                                                                            detailContent: checked ? (card.detailContent || card.description || '') : card.detailContent
                                                                                        });
                                                                                    }}
                                                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                                                                />
                                                                                <span>Customize In-Depth Subpage Content (Optional)</span>
                                                                            </label>
                                                                            <p className="text-xs text-slate-500">
                                                                                When enabled, the short teaser displays on the grid, and this comprehensive content displays when visitors open the subpage.
                                                                            </p>
                                                                        </div>
                                                                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${card.useCustomDetail ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                                                            {card.useCustomDetail ? 'Custom Subpage Active' : 'Inherits Teaser'}
                                                                        </span>
                                                                    </div>

                                                                    {card.useCustomDetail && (
                                                                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                                                                            <Field
                                                                                label="In-Depth Subpage Content"
                                                                                value={card.detailContent ?? ''}
                                                                                onChange={(v) => setCard(i, 'detailContent', v)}
                                                                                richText
                                                                                placeholder="Write the comprehensive subpage content, scope, specifications, or deliverables..."
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Optional Before & After Visual Showcase Section */}
                                                                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
                                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                                        <div className="space-y-0.5">
                                                                            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                                                <Layers className="w-4 h-4 text-blue-600" />
                                                                                Before & After Visual Showcase (Optional)
                                                                            </span>
                                                                            <p className="text-xs text-slate-500">
                                                                                Display an interactive top-center Before/After toggle on the subpage hero image with multi-photo slide galleries.
                                                                            </p>
                                                                        </div>
                                                                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase)}
                                                                                onChange={(e) => {
                                                                                    const checked = e.target.checked;
                                                                                    updateCard(i, {
                                                                                        enableShowcase: checked,
                                                                                        beforeImages: checked ? (card.beforeImages && card.beforeImages.length > 0 ? card.beforeImages : ['']) : [],
                                                                                        afterImages: checked ? (card.afterImages && card.afterImages.length > 0 ? card.afterImages : [card.image || '']) : [],
                                                                                    });
                                                                                }}
                                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                                                            />
                                                                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                                                                Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase)
                                                                                    ? 'bg-blue-100 text-blue-700'
                                                                                    : 'bg-slate-200 text-slate-600'
                                                                            }`}>
                                                                                {Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase)
                                                                                    ? 'Showcase Active'
                                                                                    : 'Standard Single Image'}
                                                                            </span>
                                                                        </label>
                                                                    </div>

                                                                    {Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase) && (
                                                                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                            {/* Before Images */}
                                                                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                                                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                                                        Before Images (Legacy State)
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const current = Array.isArray(card.beforeImages) ? [...card.beforeImages] : [];
                                                                                            updateCard(i, { beforeImages: [...current, ''] });
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 px-2 py-1 rounded transition"
                                                                                    >
                                                                                        <Plus className="w-3 h-3" /> Add Image
                                                                                    </button>
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    {(card.beforeImages && card.beforeImages.length > 0 ? card.beforeImages : ['']).map((url: string, bIdx: number) => (
                                                                                        <div key={bIdx} className="flex items-center gap-2">
                                                                                            <div className="flex-1">
                                                                                                <MediaImageField
                                                                                                    label={`Before Photo #${bIdx + 1}`}
                                                                                                    value={url}
                                                                                                    onChange={(newUrl: string) => {
                                                                                                        const current = Array.isArray(card.beforeImages) ? [...card.beforeImages] : [''];
                                                                                                        current[bIdx] = newUrl;
                                                                                                        updateCard(i, { beforeImages: current });
                                                                                                    }}
                                                                                                    previewClassName="h-16"
                                                                                                />
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const current = Array.isArray(card.beforeImages) ? [...card.beforeImages] : [];
                                                                                                    const filtered = current.filter((_: string, idx: number) => idx !== bIdx);
                                                                                                    updateCard(i, { beforeImages: filtered.length > 0 ? filtered : [] });
                                                                                                }}
                                                                                                className="p-2 text-slate-400 hover:text-red-500 transition mt-6"
                                                                                                title="Remove photo"
                                                                                            >
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            {/* After Images */}
                                                                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                                                                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                                                                        After Images (Modernized State)
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const current = Array.isArray(card.afterImages) ? [...card.afterImages] : [];
                                                                                            updateCard(i, { afterImages: [...current, ''] });
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-1 rounded transition"
                                                                                    >
                                                                                        <Plus className="w-3 h-3" /> Add Image
                                                                                    </button>
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    {(card.afterImages && card.afterImages.length > 0 ? card.afterImages : ['']).map((url: string, aIdx: number) => (
                                                                                        <div key={aIdx} className="flex items-center gap-2">
                                                                                            <div className="flex-1">
                                                                                                <MediaImageField
                                                                                                    label={`After Photo #${aIdx + 1}`}
                                                                                                    value={url}
                                                                                                    onChange={(newUrl: string) => {
                                                                                                        const current = Array.isArray(card.afterImages) ? [...card.afterImages] : [''];
                                                                                                        current[aIdx] = newUrl;
                                                                                                        updateCard(i, { afterImages: current });
                                                                                                    }}
                                                                                                    previewClassName="h-16"
                                                                                                />
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const current = Array.isArray(card.afterImages) ? [...card.afterImages] : [];
                                                                                                    const filtered = current.filter((_: string, idx: number) => idx !== aIdx);
                                                                                                    updateCard(i, { afterImages: filtered.length > 0 ? filtered : [] });
                                                                                                }}
                                                                                                className="p-2 text-slate-400 hover:text-red-500 transition mt-6"
                                                                                                title="Remove photo"
                                                                                            >
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Optional Custom Subpage CTA Strip Section */}
                                                                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
                                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                                        <div className="space-y-0.5">
                                                                            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                                                Subpage Bottom CTA Strip (Optional)
                                                                            </span>
                                                                            <p className="text-xs text-slate-500">
                                                                                Customize the inquiry banner at the bottom of this subpage. Leave fields empty to inherit default.
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer select-none">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={Boolean(card.hideCta)}
                                                                                    onChange={(e) => setCard(i, 'hideCta', e.target.checked)}
                                                                                    className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                                                                                />
                                                                                <span>Hide CTA Strip</span>
                                                                            </label>
                                                                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${card.hideCta ? 'bg-red-100 text-red-700' : (card.ctaTitle || card.ctaButtonLabel || card.ctaButtonHref || card.ctaHref ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}`}>
                                                                                {card.hideCta ? 'CTA Hidden' : (card.ctaTitle || card.ctaButtonLabel || card.ctaButtonHref || card.ctaHref ? 'Custom CTA Active' : 'Default CTA')}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {!card.hideCta && (
                                                                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <Field
                                                                                label="CTA Banner Heading"
                                                                                value={card.ctaTitle ?? ''}
                                                                                onChange={(v) => setCard(i, 'ctaTitle', v)}
                                                                                placeholder="e.g. Want this module on your campus?"
                                                                            />
                                                                            <Field
                                                                                label="CTA Banner Subtitle"
                                                                                value={card.ctaSubtitle ?? ''}
                                                                                onChange={(v) => setCard(i, 'ctaSubtitle', v)}
                                                                                placeholder="e.g. Connect with our engineering advisors for a tailored deployment plan."
                                                                            />
                                                                            <Field
                                                                                label="CTA Button Label"
                                                                                value={card.ctaButtonLabel ?? ''}
                                                                                onChange={(v) => setCard(i, 'ctaButtonLabel', v)}
                                                                                placeholder="e.g. Request a Quote, Contact Us, Partner With Us"
                                                                            />
                                                                            <Field
                                                                                label="CTA Button Destination Link"
                                                                                value={card.ctaButtonHref ?? card.ctaHref ?? ''}
                                                                                onChange={(v) => {
                                                                                    setCard(i, 'ctaButtonHref', v);
                                                                                    setCard(i, 'ctaHref', v);
                                                                                }}
                                                                                placeholder="e.g. /request-quote, /contact-us, or https://..."
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <MediaImageField
                                                                    label={page.slug === 'ai-guide' ? 'Article Thumbnail Image' : 'Card Cover Image (Optional)'}
                                                                    value={card.image ?? ''}
                                                                    onChange={(v) => setCard(i, 'image', v)}
                                                                    previewClassName="h-24"
                                                                />

                                                                {cardsUseCategories && (
                                                                    <div className="md:col-span-2">
                                                                        <CardCategoriesField
                                                                            categories={card.categories ?? []}
                                                                            availableCategories={allAvailableCategories}
                                                                            pageSlug={page.slug}
                                                                            onChange={(newCats) => setCard(i, 'categories', newCats)}
                                                                            onAddGlobalCategory={handleAddGlobalCategory}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {('downloadLink' in card || cardsUseDownloadLink) && (
                                                                    <div className="md:col-span-2">
                                                                        <DocumentUploadField
                                                                            label="Download PDF Document"
                                                                            value={card.downloadLink ?? ''}
                                                                            onChange={(v) => setCard(i, 'downloadLink', v)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })()}

                        {/* 5. Newsletter Block (AI Guide & Science Tech Labs) */}
                        {page.slug === 'science-tech-labs' && (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                        Inquiry & Consultation Block
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => set('hideNewsletter', !data.hideNewsletter)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideNewsletter
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideNewsletter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideNewsletter ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field label="Eyebrow" value={data.newsletterLabel ?? ''} onChange={(v) => set('newsletterLabel', v)} placeholder="Stay curious" />
                                    <Field label="Heading" value={data.newsletterTitle ?? ''} onChange={(v) => set('newsletterTitle', v)} placeholder="Good ideas, occasionally." />
                                    <Field label="Description" value={data.newsletterDescription ?? ''} onChange={(v) => set('newsletterDescription', v)} multiline placeholder="Get useful campus technology ideas, new guides and practical stories delivered to your inbox. No noise, just things worth reading." />
                                    <Field label="Email Placeholder" value={data.newsletterPlaceholder ?? ''} onChange={(v) => set('newsletterPlaceholder', v)} placeholder="Your email address" />
                                    <Field label="Button Label" value={data.newsletterButtonLabel ?? ''} onChange={(v) => set('newsletterButtonLabel', v)} placeholder="Subscribe" />
                                </div>
                            </section>
                        )}

                        {/* Optional policy/content sections block */}
                        {('sections' in data || 'sections' in effectiveDefaults) && page.slug !== 'digital-transformation' && !isArticlePage && (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                        Content Sections <span className="text-blue-500 ml-2">({(data.sections ?? []).length})</span>
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={addSection}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                    >
                                        <Plus className="w-4 h-4" /> New Section
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    {(data.sections ?? []).map((section: SectionItem, i: number) => (
                                        <div key={i} id={`section-item-${i}`} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/30 relative">
                                            <button type="button" onClick={() => removeSection(i)} className="absolute top-5 right-5 flex items-center gap-1.5 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-wider">
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-20">
                                                <Field label="Section Heading" value={section.heading ?? ''} onChange={(v) => setSection(i, 'heading', v)} />
                                                <Field label="Section Text" value={section.body ?? ''} onChange={(v) => setSection(i, 'body', v)} richText />
                                            </div>
                                            <div className="mt-6 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-sm font-bold text-gray-700">Bullet Points</label>
                                                    <button type="button" onClick={() => setSection(i, 'bullets', [...(section.bullets ?? []), 'New bullet'])} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                                                        + Add bullet
                                                    </button>
                                                </div>
                                                {(section.bullets ?? []).map((bullet, bulletIndex) => (
                                                    <div key={bulletIndex} className="flex items-center gap-3">
                                                        <input
                                                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                                                            value={bullet}
                                                            onChange={(e) => {
                                                                const bullets = [...(section.bullets ?? [])];
                                                                bullets[bulletIndex] = e.target.value;
                                                                setSection(i, 'bullets', bullets);
                                                            }}
                                                        />
                                                        <button type="button" onClick={() => setSection(i, 'bullets', (section.bullets ?? []).filter((_, index) => index !== bulletIndex))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {('section2Description' in data || 'section2Description' in effectiveDefaults) && page.slug !== 'digital-transformation' && page.slug !== 'furniture' && !isArticlePage && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Section Supporting Text</h4>
                                </div>
                                <Field label="Features Section Description" value={data.section2Description ?? ''} onChange={(v) => set('section2Description', v)} multiline />
                            </section>
                        )}

                        {page.slug === 'furniture' && (
                            <div id="sec-furniture-switchboard" className="scroll-mt-36">
                                <FurnitureCategorySwitchboard
                                    hiddenCategorySlugs={Array.isArray(data.hiddenCategorySlugs) ? data.hiddenCategorySlugs : []}
                                    onChange={(slugs) => set('hiddenCategorySlugs', slugs)}
                                />
                            </div>
                        )}

                        {('quoteText' in effectiveDefaults || 'quoteText' in data || page.slug === 'furniture') && !isArticlePage && (
                            <section id="sec-quote" className="space-y-6 scroll-mt-36">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                        Design Philosophy / Quote Section
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => set('hideQuote', !data.hideQuote)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideQuote
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideQuote ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideQuote ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <Field
                                        label="Quote / Philosophy Text"
                                        value={data.quoteText ?? ''}
                                        onChange={(v) => set('quoteText', v)}
                                        multiline
                                        placeholder="Infrastructure isn't just about buildings..."
                                    />
                                    <Field
                                        label="Quote Attribution / Label"
                                        value={data.quoteLabel ?? ''}
                                        onChange={(v) => set('quoteLabel', v)}
                                        placeholder="SchoolMart Design Philosophy"
                                    />
                                </div>
                            </section>
                        )}

                        {('highlightTitle' in data || 'highlightTitle' in effectiveDefaults || page.slug === 'smart-classrooms') && !isArticlePage && (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                        Highlight Band Section
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => set('hideHighlight', !data.hideHighlight)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideHighlight
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideHighlight ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideHighlight ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field
                                            label="Badge / Eyebrow"
                                            value={data.highlightEyebrow ?? ''}
                                            onChange={(v) => set('highlightEyebrow', v)}
                                            placeholder="Built for every classroom"
                                        />
                                        <Field
                                            label="Highlight Heading"
                                            value={data.highlightTitle ?? ''}
                                            onChange={(v) => set('highlightTitle', v)}
                                            placeholder="Technology that fades into the background, so teaching stays in front"
                                        />
                                    </div>
                                    <MediaImageField
                                        label="Highlight Image Backdrop"
                                        value={data.highlightImage ?? ''}
                                        onChange={(v) => set('highlightImage', v)}
                                        previewClassName="h-32"
                                    />
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-bold text-gray-700">
                                                Key Bullet Points ({(data.highlightBullets ?? []).length})
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addHighlightBullet}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Bullet
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {(data.highlightBullets ?? []).map((bullet: string, bIdx: number) => (
                                                <div
                                                    key={bIdx}
                                                    className="flex items-center gap-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200"
                                                >
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                                        ✓
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={bullet}
                                                        onChange={(e) => setHighlightBullet(bIdx, e.target.value)}
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium"
                                                        placeholder="Highlight bullet description..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeHighlightBullet(bIdx)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {page.slug !== 'faq' && !isArticlePage && (
                            <section id="sec-cta" className="space-y-6 scroll-mt-36">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Call-to-Action Footer</h4>
                                    <button
                                        type="button"
                                        onClick={() => set('hideCta', !data.hideCta)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideCta
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideCta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideCta ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field label="CTA Heading" value={data.ctaTitle ?? ''} onChange={(v) => set('ctaTitle', v)} placeholder="Ready to transform your campus?" />
                                    <Field label="CTA Subtitle" value={data.ctaSubtitle ?? ''} onChange={(v) => set('ctaSubtitle', v)} multiline placeholder="Get in touch with our specialist team today." />
                                    <Field label="CTA Button Label" value={data.ctaButtonLabel ?? ''} onChange={(v) => set('ctaButtonLabel', v)} placeholder="e.g. Enquire Now / Get in Touch" />
                                    {page.slug === 'catalogues' ? (
                                        <>
                                            <Field label="Secondary CTA Button Label" value={data.ctaSecondaryLabel ?? ''} onChange={(v) => set('ctaSecondaryLabel', v)} placeholder="Contact Sales" />
                                            <Field label="Secondary CTA Button Link" value={data.ctaSecondaryHref ?? ''} onChange={(v) => set('ctaSecondaryHref', v)} placeholder="/contact-us" />
                                        </>
                                    ) : (
                                        <Field label="CTA Link" value={data.ctaHref ?? ''} onChange={(v) => set('ctaHref', v)} placeholder="/contact-us" />
                                    )}

                                    {/* CTA Button Background & Contrast Color Controls */}
                                    <div className="md:col-span-2 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <Palette className="w-3.5 h-3.5 text-blue-600" />
                                                CTA Button Appearance &amp; Contrast
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-slate-500 font-medium">Button Preview:</span>
                                                {(() => {
                                                    const previewStyle = resolveCtaButtonStyles({
                                                        ctaBg: data.styles?.ctaBg || '#002A6C',
                                                        ctaBtnBg: data.ctaBtnBg || data.styles?.ctaBtnBg,
                                                        ctaBtnText: data.ctaBtnText || data.styles?.ctaBtnText,
                                                    });
                                                    return (
                                                        <span
                                                            style={previewStyle}
                                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs whitespace-nowrap"
                                                        >
                                                            {data.ctaButtonLabel || 'CTA Button'} <ArrowRight className="w-3 h-3" />
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                            {/* Button Background Color */}
                                            <div>
                                                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                                                    Button Background Color
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={normalizeHexColor(data.ctaBtnBg || data.styles?.ctaBtnBg) || '#F59E0B'}
                                                        onChange={(e) => {
                                                            set('ctaBtnBg', e.target.value);
                                                            setStyle('ctaBtnBg', e.target.value);
                                                        }}
                                                        className="h-9 w-12 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={data.ctaBtnBg ?? data.styles?.ctaBtnBg ?? ''}
                                                        onChange={(e) => {
                                                            set('ctaBtnBg', e.target.value);
                                                            setStyle('ctaBtnBg', e.target.value);
                                                        }}
                                                        placeholder="Auto (High Contrast)"
                                                        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold bg-white"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-2">
                                                    {[
                                                        { name: 'SchoolMart Gold', hex: '#F59E0B' },
                                                        { name: 'Crisp White', hex: '#FFFFFF' },
                                                        { name: 'Amber Orange', hex: '#EA580C' },
                                                        { name: 'Emerald', hex: '#059669' },
                                                        { name: 'SchoolMart Navy', hex: '#002A6C' },
                                                    ].map((c) => (
                                                        <button
                                                            key={c.hex}
                                                            type="button"
                                                            onClick={() => {
                                                                set('ctaBtnBg', c.hex);
                                                                setStyle('ctaBtnBg', c.hex);
                                                            }}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer"
                                                        >
                                                            <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                                                            {c.name}
                                                        </button>
                                                    ))}
                                                    {(data.ctaBtnBg || data.styles?.ctaBtnBg) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                set('ctaBtnBg', '');
                                                                setStyle('ctaBtnBg', '');
                                                            }}
                                                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 hover:text-red-600 border border-dashed border-gray-300 hover:border-red-300 bg-white transition-all cursor-pointer"
                                                        >
                                                            Reset to Auto
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Button Text Color Override (Optional) */}
                                            <div>
                                                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                                                    Button Text Color <span className="text-slate-400 font-normal">(Auto-calculated for WCAG contrast)</span>
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={normalizeHexColor(data.ctaBtnText || data.styles?.ctaBtnText) || '#0F172A'}
                                                        onChange={(e) => {
                                                            set('ctaBtnText', e.target.value);
                                                            setStyle('ctaBtnText', e.target.value);
                                                        }}
                                                        className="h-9 w-12 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={data.ctaBtnText ?? data.styles?.ctaBtnText ?? ''}
                                                        onChange={(e) => {
                                                            set('ctaBtnText', e.target.value);
                                                            setStyle('ctaBtnText', e.target.value);
                                                        }}
                                                        placeholder="Auto (Recommended)"
                                                        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold bg-white"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            set('ctaBtnText', '#0F172A');
                                                            setStyle('ctaBtnText', '#0F172A');
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer"
                                                    >
                                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-gray-300" />
                                                        Dark Slate
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            set('ctaBtnText', '#FFFFFF');
                                                            setStyle('ctaBtnText', '#FFFFFF');
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer"
                                                    >
                                                        <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-300" />
                                                        White
                                                    </button>
                                                    {(data.ctaBtnText || data.styles?.ctaBtnText) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                set('ctaBtnText', '');
                                                                setStyle('ctaBtnText', '');
                                                            }}
                                                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 hover:text-red-600 border border-dashed border-gray-300 hover:border-red-300 bg-white transition-all cursor-pointer"
                                                        >
                                                            Reset to Auto
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {('formTitle' in data || 'formTitle' in effectiveDefaults || page.slug === 'smart-classrooms') && !isArticlePage && (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                        Request Information Form
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => set('hideForm', !data.hideForm)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            data.hideForm
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        {data.hideForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {data.hideForm ? 'Hidden / Draft' : 'Live on Page'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field
                                        label="Form Heading"
                                        value={data.formTitle ?? ''}
                                        onChange={(v) => set('formTitle', v)}
                                        placeholder="Request More Information"
                                    />
                                    <Field
                                        label="Form Subheading"
                                        value={data.formSubtitle ?? ''}
                                        onChange={(v) => set('formSubtitle', v)}
                                        multiline
                                        placeholder="Tell us what your institution needs and our team will contact you."
                                    />
                                </div>
                            </section>
                        )}

                        {/* Case Studies / Projects Showcase Section */}
                        {('caseStudies' in data || 'caseStudies' in effectiveDefaults || page.slug === 'catalogues') && !isArticlePage && (
                            isStructured ? (
                                <ItemsManager
                                    pageId={page.id}
                                    pageSlug={page.slug}
                                    collection="caseStudies"
                                    label="Case Studies & Projects Showcase"
                                />
                            ) : (
                                <CaseStudiesEditorSection
                                    data={data}
                                    set={set}
                                    onSyncCaseStudies={async (nextCaseStudies) => {
                                        const nextData = { ...data, caseStudies: nextCaseStudies };
                                        setData(nextData);
                                        try {
                                            const { data: updated } = await api.put(`/pages/${page.id}`, {
                                                title,
                                                published,
                                                pageData: JSON.stringify(nextData),
                                            });
                                            clearPageDataCache(page.slug);
                                            clearPageDataCache();
                                            broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: page.slug });
                                            broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });
                                            setSaved(true);
                                            setTimeout(() => setSaved(false), 2000);
                                            if (onSaved) onSaved(updated);
                                        } catch (err: any) {
                                            console.error('Failed to sync case studies:', err);
                                            const msg = err?.response?.data?.error || 'Failed to save case studies.';
                                            setSaveError(msg);
                                        }
                                    }}
                                />
                            )
                        )}

                    </>
                )}

                {/* Bottom Back Button */}
                <div className="flex justify-between items-center pt-8 mt-4 border-t border-gray-100">
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2"
                        >
                            ← {isStandalone ? 'Back to Pages' : 'Close Editor'}
                        </button>
                    ) : (
                        <div />
                    )}
                    <button
                        type="button"
                        onClick={() => save()}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-md"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving…' : saved ? '✓ All Changes Saved!' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {/* Load Starter Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between border-b border-slate-100 p-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Load Starter Template</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Populate <strong>/{page.slug}</strong> with recommended starter content and sample cards.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <label
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                                    templateMode === 'append'
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="templateMode"
                                    checked={templateMode === 'append'}
                                    onChange={() => setTemplateMode('append')}
                                    className="mt-1 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <div className="font-bold text-sm text-slate-900">
                                        Append Samples (Keep my current cards) <span className="ml-1 text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Recommended</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                        Preserves all your existing custom cards at the top. Only appends non-duplicate sample cards from the starter template.
                                    </p>
                                </div>
                            </label>

                            <label
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                                    templateMode === 'replace'
                                        ? 'border-red-500 bg-red-50/50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="templateMode"
                                    checked={templateMode === 'replace'}
                                    onChange={() => setTemplateMode('replace')}
                                    className="mt-1 text-red-600 focus:ring-red-500"
                                />
                                <div>
                                    <div className="font-bold text-sm text-slate-900">Replace All</div>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                        Replaces your current content and cards with the original template defaults. Existing custom edits on this page will be overwritten.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyStarterTemplate}
                                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition ${
                                    templateMode === 'replace'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {templateMode === 'replace' ? 'Replace All Content' : 'Append Starter Samples'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page-Level Conflict Dialog */}
            <ConflictDialog
                isOpen={showPageConflictDialog}
                onClose={() => setShowPageConflictDialog(false)}
                onReloadLatest={() => {
                    if (conflictCurrentPage) {
                        setTitle(conflictCurrentPage.title);
                        setPublished(conflictCurrentPage.published);
                        const parsed = parsePageData(conflictCurrentPage.pageData);
                        setData(parsed);
                        if (conflictCurrentPage.version !== undefined) {
                            page.version = conflictCurrentPage.version;
                        }
                    }
                    setShowPageConflictDialog(false);
                    setConflictCurrentPage(null);
                }}
                onOverwrite={() => {
                    const targetVersion = conflictCurrentPage?.version;
                    setShowPageConflictDialog(false);
                    save(targetVersion);
                }}
                localData={{ title, published, ...data }}
                currentData={conflictCurrentPage ? {
                    title: conflictCurrentPage.title,
                    published: conflictCurrentPage.published,
                    ...parsePageData(conflictCurrentPage.pageData),
                } : {}}
                title={`Page Conflict Detected on "${page.title}"`}
                description="Another administrator or process modified this page while you were editing it. Review the settings differences below to reload latest or overwrite."
            />

            {/* Page Revision History Panel */}
            <HistoryPanel
                isOpen={showHistoryPanel}
                onClose={() => setShowHistoryPanel(false)}
                pageId={page.id}
                pageSlug={page.slug}
                currentPageVersion={page.version ?? 1}
                onRestoreSuccess={(restoredPage) => {
                    if (restoredPage) {
                        if (restoredPage.title) setTitle(restoredPage.title);
                        if (restoredPage.published !== undefined) setPublished(restoredPage.published);
                        if (restoredPage.pageData) setData(parsePageData(restoredPage.pageData));
                        if (restoredPage.version !== undefined) {
                            page.version = restoredPage.version;
                        }
                    }
                }}
            />
        </div>
    );
}
