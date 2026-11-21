import { useEffect, useState } from 'react';
import { Save, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, LayoutGrid, Palette, Type, Sliders, Pencil, ExternalLink, Loader2, Upload, Image as ImageIcon, Search, Building2, Target, Tag, X } from 'lucide-react';
import api from '../api/client';
import MediaImageField from '../components/MediaImageField';
import { CATEGORY_ICONS, DEFAULT_CATEGORIES, type CategoryItem } from '@/components/sections/category-bar';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { defaultServices } from '@/components/sections/service-cards';
import { DEFAULT_RESOURCES, type ResourceItem } from '@/components/sections/resources';
import { broadcastCmsInvalidation } from '@/hooks/usePageData';
import {
    DEFAULT_INSTITUTIONS_DATA,
    DEFAULT_OBJECTIVES_DATA,
    DEFAULT_POPULAR_CHIPS,
    DEFAULT_SEARCH_TAXONOMY,
    SEARCH_ICON_OPTIONS,
    SEARCH_ICON_MAP,
    type RawSearchOption,
    type TaxonomyCategoryItem,
    type TaxonomyInstitutionItem,
    type TaxonomyStoreData,
} from '@/components/sections/search-bar';

function Section({
    title,
    children,
    isLive,
    onToggleLive,
    badge,
}: {
    title: string;
    children: React.ReactNode;
    isLive?: boolean;
    onToggleLive?: () => void;
    badge?: string;
}) {
    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
            isLive === false
                ? 'bg-slate-50/70 border-slate-300 ring-1 ring-slate-300/40'
                : 'bg-white border-gray-200'
        }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3 ${
                isLive === false ? 'bg-slate-100/80 border-slate-200' : 'bg-gray-50/50 border-gray-100'
            }`}>
                <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-6 rounded-full ${isLive === false ? 'bg-slate-400' : 'bg-blue-600'}`}></span>
                    <h2 className={`font-bold flex items-center gap-2 ${isLive === false ? 'text-slate-600' : 'text-gray-900'}`}>
                        {title}
                        {badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                                {badge}
                            </span>
                        )}
                    </h2>
                </div>

                {onToggleLive && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onToggleLive}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                isLive !== false
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500/20'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 ring-2 ring-slate-400/20'
                            }`}
                            title={isLive !== false ? 'Click to hide this entire section from public homepage' : 'Click to make this section live on public homepage'}
                        >
                            {isLive !== false ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                    <span>● Live on Homepage</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    <span>○ Not Live (Hidden)</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {isLive === false && (
                <div className="px-6 py-2.5 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
                    <span className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>This section is currently <strong>Not Live (Hidden)</strong> and will not appear on the public homepage.</span>
                    </span>
                    <button
                        type="button"
                        onClick={onToggleLive}
                        className="text-xs font-bold text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                        Publish Live
                    </button>
                </div>
            )}

            <div className={`p-6 space-y-6 ${isLive === false ? 'opacity-85' : ''}`}>{children}</div>
        </div>
    );
}

function ItemLivePill({
    isLive,
    onToggle,
}: {
    isLive: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                isLive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
            }`}
            title={isLive ? 'Click to hide this item from the public grid' : 'Click to make this item live'}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            <span>{isLive ? 'Live' : 'Hidden'}</span>
        </button>
    );
}

function Field({ label, value, onChange, multiline = false, hint = '', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void;
    multiline?: boolean; hint?: string; placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 flex items-center justify-between">
                {label}
                {hint && <span className="text-gray-400 font-normal text-[10px] uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">{hint}</span>}
            </label>
            {multiline
                ? <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
                : <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
            }
        </div>
    );
}

function VisibilityToggle({ label, isHidden, onToggle }: { label: string; isHidden: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold ${
                isHidden
                    ? 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
            }`}
        >
            <span className="flex items-center gap-2">
                {isHidden ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                <span>{label}</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isHidden ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'
            }`}>
                {isHidden ? 'Hidden' : 'Live'}
            </span>
        </button>
    );
}

const HEADING_FONT_OPTIONS = [
    { value: 'poppins', label: 'Poppins (Default Sans-Serif)' },
    { value: 'playfair', label: 'Playfair Display (Editorial Serif)' },
    { value: 'grotesk', label: 'Space Grotesk (Modern Tech)' },
    { value: 'opensans', label: 'Open Sans (Clean Neutral)' },
    { value: 'system', label: 'System Sans (Native OS)' },
];

const BODY_FONT_OPTIONS = [
    { value: 'opensans', label: 'Open Sans (Default High-Legibility)' },
    { value: 'poppins', label: 'Poppins (Geometric)' },
    { value: 'grotesk', label: 'Space Grotesk (Modern Tech)' },
    { value: 'system', label: 'System Sans (Native OS)' },
];

const HERO_BG_OPTIONS = [
    { value: 'blue', label: 'Deep Blue (Default #001f52)' },
    { value: 'slate', label: 'Slate Dark (#0f172a)' },
    { value: 'stone', label: 'Stone Dark (#1c1917)' },
    { value: 'amber', label: 'Warm Amber (#451a03)' },
    { value: 'white', label: 'Clean White' },
    { value: 'paper', label: 'Paper Off-White (#f8f7f4)' },
];

const HERO_LAYOUT_OPTIONS = [
    { value: 'split-right', label: 'Split Right (Default Left Content / Right Image)' },
    { value: 'split-left', label: 'Split Left (Right Content / Left Image)' },
    { value: 'centered', label: 'Centered (Hero Headline & Buttons Centered)' },
    { value: 'minimal', label: 'Minimal (Compact Padding)' },
];

export default function HomepageEditor() {
    const { refresh } = useSiteContent();

    // ── Page Controls (Typography, Layout, Theme, Master Visibility) ──
    const [pageStyles, setPageStyles] = useState<{
        headingFont?: string;
        bodyFont?: string;
        primaryColor?: string;
        heroBg?: string;
        heroLayout?: string;
        hideCategories?: boolean;
        hideTicker?: boolean;
        hideSearchBar?: boolean;
        hideHero?: boolean;
        hideServices?: boolean;
        hideFeatures?: boolean;
        hideResources?: boolean;
        hidePartnershipForm?: boolean;
        hideCollaborations?: boolean;
    }>({
        headingFont: 'poppins',
        bodyFont: 'opensans',
        primaryColor: '#002B66',
        heroBg: 'blue',
        heroLayout: 'split-right',
        hideCategories: false,
        hideTicker: false,
        hideSearchBar: false,
        hideHero: false,
        hideServices: false,
        hideFeatures: false,
        hideResources: false,
        hidePartnershipForm: false,
        hideCollaborations: false,
    });

    const upStyle = (k: string, v: any) => setPageStyles((p: any) => ({ ...p, [k]: v }));

    // ── Hero Section ──
    const [heroData, setHeroData] = useState<any>({
        eyebrow: 'Future-ready campus infrastructure',
        title: 'Design. Build.\nDigitize. Operate.\nFuture-Ready Campuses.',
        subtitle: 'Physical + Digital',
        ctaLabel: 'Schedule Campus Audit →',
        ctaHref: '/contact-us',
        image: '',
    });

    // ── Feature Cards ──
    const [features, setFeatures] = useState<any[]>([]);
    const [expandedFeatureIndex, setExpandedFeatureIndex] = useState<number | null>(null);

    // ── 4 Services ──
    const [services, setServices] = useState<any[]>([]);

    // ── Sidebar Blocks ──
    const [sidebar, setSidebar] = useState<any>({ classifieds: [], resources: [], completedProjects: [], contacts: [] });

    // ── Resources Section ──
    const [resourcesHeading, setResourcesHeading] = useState('Resources & Catalogues');
    const [resourcesSubtitle, setResourcesSubtitle] = useState('Explore our curated guides, product showrooms, and official frameworks to inspire your next campus project.');
    const [resources, setResources] = useState<ResourceItem[]>(DEFAULT_RESOURCES);
    const [expandedResourceIndex, setExpandedResourceIndex] = useState<number | null>(null);

    // ── Partnership Section ──
    const [partnership, setPartnership] = useState({
        formTitle: 'Partnership Enquiry Form',
        formSubtitle: "Please fill out the form and we'll get back to you as soon as possible.",
        readyTitle: 'Ready to talk?',
        readyText: 'At SchoolMart, we have the expertise in guiding you to set up your school infrastructure and campus project and help you maximize the performance of your campus while also figuring out your return on investment. We have the expertise in guiding you to set up your new campus project and help you maximize.',
        whatsappNumber: '919966109191',
        whatsappText: 'Connect On WhatsApp',
        phoneNumber: '+919966109191',
        phoneText: 'Call Us 9966109191',
    });

    const upPartnership = (k: string, v: string) => setPartnership((p: any) => ({ ...p, [k]: v }));

    // ── Micro-Copy & Tickers ──
    const [tickerTitle, setTickerTitle] = useState('LATEST UPDATES');
    const [searchPlaceholder, setSearchPlaceholder] = useState('Search: I need a design for an AI STATION');
    const [searchInstitutions, setSearchInstitutions] = useState<RawSearchOption[]>(DEFAULT_INSTITUTIONS_DATA);
    const [searchObjectives, setSearchObjectives] = useState<RawSearchOption[]>(DEFAULT_OBJECTIVES_DATA);
    const [searchPopularChips, setSearchPopularChips] = useState<{ label: string; query: string }[]>(DEFAULT_POPULAR_CHIPS);
    const [searchTab, setSearchTab] = useState<'institutions' | 'objectives' | 'chips'>('institutions');
    const [searchTaxonomy, setSearchTaxonomy] = useState<TaxonomyStoreData>(DEFAULT_SEARCH_TAXONOMY);
    const [expandedCategoryIndex, setExpandedCategoryIndex] = useState<number | null>(null);
    const [expandedInstitutionIndex, setExpandedInstitutionIndex] = useState<number | null>(null);
    const [institutionFilter, setInstitutionFilter] = useState<'all' | 'higher-ed' | 'other'>('all');
    const [institutionSearchTerm, setInstitutionSearchTerm] = useState('');
    const [newSubcatInput, setNewSubcatInput] = useState<{ [catIndex: number]: string }>({});
    const [collaborationsTitle, setCollaborationsTitle] = useState('Trusted By Leading Institutions Worldwide');
    const [tickerAnnouncements, setTickerAnnouncements] = useState<string[]>([]);
    const [collaborations, setCollaborations] = useState<any[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const fetchContent = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/content');

            // Page Styles & Controls
            try {
                if (data.home_styles) {
                    const parsed = JSON.parse(data.home_styles);
                    setPageStyles((prev) => ({ ...prev, ...parsed }));
                }
            } catch { /**/ }

            // Hero
            try {
                const savedHero = JSON.parse(data.home_hero || '{}');
                setHeroData((current: any) => ({ ...current, ...savedHero }));
            } catch { /**/ }

            // Feature cards
            try {
                const savedFeatures = data.home_features ? JSON.parse(data.home_features) : [];
                setFeatures(savedFeatures.map((feature: any) => feature.title === 'Smart Classrooms'
                    ? { ...feature, href: '/smart-classrooms' }
                    : feature.title === 'AR / VR Learning' || feature.title === 'AR/VR Learning'
                        ? { ...feature, href: '/ar-vr-experiences' }
                        : feature));
            } catch { /**/ }

            // Services
            try {
                const parsedServices = data.home_services !== undefined && data.home_services !== null
                    ? JSON.parse(data.home_services)
                    : null;
                setServices(Array.isArray(parsedServices) ? parsedServices : defaultServices);
            } catch {
                setServices(defaultServices);
            }

            // Sidebar
            try {
                const rawSb = data.home_sidebar ? JSON.parse(data.home_sidebar) : { classifieds: [], resources: [], completedProjects: [], contacts: [] };
                if (Array.isArray(rawSb.classifieds)) {
                    rawSb.classifieds = rawSb.classifieds.map((item: any) => ({
                        ...item,
                        label: (item?.label || item?.title || '').trim(),
                        href: item?.href === '/campus-sale' ? '/colleges-universities-for-sale' : (item?.href || '/classifieds'),
                        active: item?.active !== false,
                    }));
                }
                if (Array.isArray(rawSb.completedProjects)) {
                    rawSb.completedProjects = rawSb.completedProjects.map((item: any) => ({
                        ...item,
                        label: (item?.label || item?.title || '').trim(),
                        category: item?.category || 'Completed Project',
                        description: item?.description || '',
                        images: Array.isArray(item?.images) ? item.images : (item?.image ? [item.image] : []),
                        active: item?.active !== false,
                    }));
                }
                setSidebar(rawSb);
            } catch { /**/ }

            // Resources
            try {
                if (data.home_resources) {
                    const parsedRes = JSON.parse(data.home_resources);
                    if (parsedRes && typeof parsedRes === 'object') {
                        if (parsedRes.heading) setResourcesHeading(parsedRes.heading);
                        if (parsedRes.subtitle) setResourcesSubtitle(parsedRes.subtitle);
                        if (Array.isArray(parsedRes.items) && parsedRes.items.length > 0) {
                            setResources(parsedRes.items);
                        }
                    }
                }
            } catch { /**/ }

            // Partnership
            try {
                if (data.home_partnership) {
                    const parsedPart = JSON.parse(data.home_partnership);
                    if (parsedPart && typeof parsedPart === 'object') {
                        setPartnership((prev) => ({ ...prev, ...parsedPart }));
                    }
                }
            } catch { /**/ }

            // Micro-copy
            if (typeof data.ticker_title === 'string' && data.ticker_title) {
                setTickerTitle(data.ticker_title);
            }
            if (typeof data.home_search_placeholder === 'string' && data.home_search_placeholder) {
                setSearchPlaceholder(data.home_search_placeholder);
            }
            if (typeof data.collaborations_title === 'string' && data.collaborations_title) {
                setCollaborationsTitle(data.collaborations_title);
            }

            // Ticker Announcements
            try { setTickerAnnouncements(data.ticker_announcements ? JSON.parse(data.ticker_announcements) : [
                "Digital Transformation Summit: 15 May 2026",
                "New AI-Powered Learning Stations now available for pre-order",
                "Join our upcoming Campus Design Webinar on 15th April 2026",
                "Latest UGC Guidelines for Digital Campus implemented across 50+ institutions",
                "Explore our new range of ergonomic Campus Furniture in the Lookbook",
            ]); } catch { /**/ }

            // Categories
            try { setCategories(data.home_categories ? JSON.parse(data.home_categories) : DEFAULT_CATEGORIES); } catch { /**/ }

            // Collaborations
            try { setCollaborations(data.collaborations ? JSON.parse(data.collaborations) : [
                { name: 'Stanford University' },
                { name: 'MIT Labs' },
                { name: 'Oxford Library' },
                { name: 'Cambridge Tech' },
                { name: 'Harvard Research' },
                { name: 'Yale Architecture' },
                { name: 'Princeton Science' },
                { name: 'Columbia Design' },
            ]); } catch { /**/ }

            // Solutions Finder Taxonomy (Master Categories, Subcategories, Institutions)
            try {
                if (data.solutions_finder_taxonomy) {
                    const parsed = typeof data.solutions_finder_taxonomy === 'string'
                        ? JSON.parse(data.solutions_finder_taxonomy)
                        : data.solutions_finder_taxonomy;
                    if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.institutions)) {
                        setSearchTaxonomy({
                            categories: parsed.categories,
                            institutions: parsed.institutions,
                            popularSearchPrompts: parsed.popularSearchPrompts || DEFAULT_SEARCH_TAXONOMY.popularSearchPrompts,
                            popularChips: parsed.popularChips || DEFAULT_POPULAR_CHIPS,
                            placeholder: parsed.placeholder || data.home_search_placeholder || DEFAULT_SEARCH_TAXONOMY.placeholder,
                        });
                    }
                }
            } catch (e) { console.error('Failed to parse solutions_finder_taxonomy', e); }

            // Search Bar Options (Legacy Backward Compatibility)
            try {
                if (data.home_search_institutions) {
                    const parsed = JSON.parse(data.home_search_institutions);
                    if (Array.isArray(parsed) && parsed.length > 0) setSearchInstitutions(parsed);
                }
            } catch { /**/ }

            try {
                if (data.home_search_objectives) {
                    const parsed = JSON.parse(data.home_search_objectives);
                    if (Array.isArray(parsed) && parsed.length > 0) setSearchObjectives(parsed);
                }
            } catch { /**/ }

            try {
                if (data.home_search_popular_chips) {
                    const parsed = JSON.parse(data.home_search_popular_chips);
                    if (Array.isArray(parsed) && parsed.length > 0) setSearchPopularChips(parsed);
                }
            } catch { /**/ }

        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchContent(); }, []);

    const saveContent = async () => {
        if (loading) return;
        setSaving(true);
        setSaveError(null);
        try {
            await api.put('/content', {
                home_hero: JSON.stringify(heroData),
                home_features: JSON.stringify(features),
                home_services: JSON.stringify(services),
                home_sidebar: JSON.stringify(sidebar),
                home_categories: JSON.stringify(categories),
                ticker_announcements: JSON.stringify(tickerAnnouncements),
                ticker_title: tickerTitle,
                collaborations: JSON.stringify(collaborations),
                collaborations_title: collaborationsTitle,
                solutions_finder_taxonomy: JSON.stringify(searchTaxonomy),
                home_search_placeholder: searchTaxonomy.placeholder || searchPlaceholder,
                home_search_institutions: JSON.stringify(searchInstitutions),
                home_search_objectives: JSON.stringify(searchObjectives),
                home_search_popular_chips: JSON.stringify(searchTaxonomy.popularChips || searchPopularChips),
                home_styles: JSON.stringify(pageStyles),
                home_resources: JSON.stringify({
                    heading: resourcesHeading,
                    subtitle: resourcesSubtitle,
                    items: resources,
                }),
                home_partnership: JSON.stringify(partnership),
            });
            await refresh();

            // Broadcast cache invalidation across all tabs
            broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e: any) {
            console.error('Failed to save homepage content:', e);
            const msg = e?.response?.data?.error || 'Failed to save homepage changes. Please try again.';
            setSaveError(msg);
            alert(`Save failed: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Feature helpers
    const addFeature = () => {
        const next = [...features, { title: 'New Feature', description: 'Description', tag: 'New', color: '#3B82F6', h: 250, href: '/', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=90', active: true }];
        setFeatures(next);
        setExpandedFeatureIndex(next.length - 1);
    };
    const upFeature = (i: number, k: string, v: any) => { const a = [...features]; a[i] = { ...a[i], [k]: v }; setFeatures(a); };
    const delFeature = (i: number) => {
        setFeatures(prev => prev.filter((_, idx) => idx !== i));
        setExpandedFeatureIndex(prev => {
            if (prev === null) return null;
            if (prev === i) return null;
            if (prev > i) return prev - 1;
            return prev;
        });
    };

    // Service helpers
    const addService = () => setServices([...services, { title: 'New Service', bgColor: '#3B82F6', textColor: '#ffffff', href: '/', active: true }]);
    const upService = (i: number, k: string, v: any) => { const a = [...services]; a[i] = { ...a[i], [k]: v }; setServices(a); };
    const delService = (i: number) => setServices(services.filter((_, idx) => idx !== i));

    // Resources helpers
    const addResource = () => {
        const next = [...resources, {
            title: 'New Resource Guide',
            description: 'Comprehensive overview and guidance for educational infrastructure.',
            image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800',
            color: '#0ea5e9',
            tag: 'GUIDE',
            href: '/catalogues',
            active: true,
        }];
        setResources(next);
        setExpandedResourceIndex(next.length - 1);
    };
    const upResource = (i: number, k: keyof ResourceItem, v: any) => { const a = [...resources]; a[i] = { ...a[i], [k]: v }; setResources(a); };
    const delResource = (i: number) => {
        setResources(prev => prev.filter((_, idx) => idx !== i));
        setExpandedResourceIndex(prev => {
            if (prev === null) return null;
            if (prev === i) return null;
            if (prev > i) return prev - 1;
            return prev;
        });
    };
    const moveResource = (i: number, dir: -1 | 1) => {
        const target = i + dir;
        if (target < 0 || target >= resources.length) return;
        const a = [...resources];
        const temp = a[i];
        a[i] = a[target];
        a[target] = temp;
        setResources(a);
        setExpandedResourceIndex(prev => {
            if (prev === i) return target;
            if (prev === target) return i;
            return prev;
        });
    };

    // Category icon helpers
    const addCategory = () => setCategories([...categories, { icon: 'Circle', label: 'New Category', href: '/', active: true }]);
    const upCategory = (i: number, k: keyof CategoryItem, v: any) => { const a = [...categories]; a[i] = { ...a[i], [k]: v }; setCategories(a); };
    const delCategory = (i: number) => setCategories(categories.filter((_, idx) => idx !== i));

    // Sidebar helpers
    const setSidebarList = (key: string, list: any[]) => setSidebar((p: any) => ({ ...p, [key]: list }));
    const upListItem = (key: string, i: number, field: string, val: any) => {
        const list = [...(sidebar[key] || [])];
        list[i] = { ...list[i], [field]: val };
        setSidebarList(key, list);
    };
    const addListItem = (key: string, defaults: any) => setSidebarList(key, [...(sidebar[key] || []), defaults]);
    const delListItem = (key: string, i: number) => setSidebarList(key, (sidebar[key] || []).filter((_: any, idx: number) => idx !== i));

    // Completed Projects Inline Editor State & Helpers
    const [expandedProjectIdx, setExpandedProjectIdx] = useState<number | null>(null);
    const [uploadingProjectIdx, setUploadingProjectIdx] = useState<number | null>(null);

    const slugifyProjectLabel = (text: string): string => {
        return (
            (text || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'completed-project'
        );
    };

    const moveCompletedProject = (i: number, dir: -1 | 1) => {
        const list = [...(sidebar.completedProjects || [])];
        const target = i + dir;
        if (target < 0 || target >= list.length) return;
        [list[i], list[target]] = [list[target], list[i]];
        setSidebarList('completedProjects', list);
        if (expandedProjectIdx === i) setExpandedProjectIdx(target);
        else if (expandedProjectIdx === target) setExpandedProjectIdx(i);
    };

    const addProjectImage = (i: number) => {
        const list = [...(sidebar.completedProjects || [])];
        const current = list[i] || {};
        const images = Array.isArray(current.images) ? [...current.images] : [];
        images.push('');
        list[i] = { ...current, images };
        setSidebarList('completedProjects', list);
    };

    const updateProjectImage = (i: number, imgIdx: number, url: string) => {
        const list = [...(sidebar.completedProjects || [])];
        const current = list[i] || {};
        const images = Array.isArray(current.images) ? [...current.images] : [];
        images[imgIdx] = url;
        list[i] = { ...current, images };
        setSidebarList('completedProjects', list);
    };

    const removeProjectImage = (i: number, imgIdx: number) => {
        const list = [...(sidebar.completedProjects || [])];
        const current = list[i] || {};
        const images = (Array.isArray(current.images) ? current.images : []).filter((_: string, idx: number) => idx !== imgIdx);
        list[i] = { ...current, images };
        setSidebarList('completedProjects', list);
    };

    const uploadProjectImages = async (i: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
        for (const file of Array.from(files)) {
            if (file.size > MAX_IMAGE_SIZE) {
                const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
                alert(`Image "${file.name}" is ${sizeMb} MB. Images must be under 5 MB.`);
                return;
            }
        }

        setUploadingProjectIdx(i);
        try {
            const uploadedUrls: string[] = [];
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append('media', file);
                fd.append('image', file);
                const { data } = await api.post('/media', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (data?.url) uploadedUrls.push(data.url);
            }
            if (uploadedUrls.length > 0) {
                const list = [...(sidebar.completedProjects || [])];
                const current = list[i] || {};
                const existing = (Array.isArray(current.images) ? current.images : []).filter(Boolean);
                list[i] = { ...current, images: [...existing, ...uploadedUrls] };
                const updatedSidebar = { ...sidebar, completedProjects: list };
                setSidebar(updatedSidebar);
                await api.put('/content', { home_sidebar: JSON.stringify(updatedSidebar) });
                await refresh();
                broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });
            }
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Image upload failed');
        } finally {
            setUploadingProjectIdx(null);
        }
    };

    // Ensure editor state re-syncs from DB if Vite HMR preserved pre-schema sidebar state
    const hasStaleCompletedProjects =
        Array.isArray(sidebar.completedProjects) &&
        sidebar.completedProjects.length > 0 &&
        sidebar.completedProjects.every(
            (p: any) => (!Array.isArray(p?.images) || p.images.length === 0) && !p?.description
        );

    useEffect(() => {
        if (hasStaleCompletedProjects) {
            void fetchContent();
        }
    }, [hasStaleCompletedProjects]);

    if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">Loading editor…</p></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Sticky Header Editor Actions */}
            <div className="sticky top-0 z-[60] -mx-6 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between mb-8 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>Homepage Visual Editor</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Full CMS Controls</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Customize styling, section visibility, content blocks, cards, and copy</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchContent} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={saveContent} disabled={saving || loading}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 ${saving || loading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving…' : saved ? '✓ Changes Saved!' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {saveError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center justify-between">
                    <span>⚠️ {saveError}</span>
                    <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
                </div>
            )}

            {/* ── Page Controls & Master Visibility Panel ── */}
            <Section title="⚙️ Page Controls & Master Section Visibility">
                <div className="space-y-6">
                    {/* Typography & Accent Color */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Type className="w-4 h-4 text-gray-500" /> Heading Font
                            </label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={pageStyles.headingFont || 'poppins'}
                                onChange={e => upStyle('headingFont', e.target.value)}
                            >
                                {HEADING_FONT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Type className="w-4 h-4 text-gray-500" /> Body Font
                            </label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={pageStyles.bodyFont || 'opensans'}
                                onChange={e => upStyle('bodyFont', e.target.value)}
                            >
                                {BODY_FONT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Palette className="w-4 h-4 text-gray-500" /> Brand Accent Color
                            </label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    className="h-10 w-12 border border-gray-200 rounded-xl p-1 cursor-pointer bg-white"
                                    value={pageStyles.primaryColor || '#002B66'}
                                    onChange={e => upStyle('primaryColor', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={pageStyles.primaryColor || '#002B66'}
                                    onChange={e => upStyle('primaryColor', e.target.value)}
                                    placeholder="#002B66"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Hero Theme & Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Palette className="w-4 h-4 text-gray-500" /> Hero Background Theme
                            </label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={pageStyles.heroBg || 'blue'}
                                onChange={e => upStyle('heroBg', e.target.value)}
                            >
                                {HERO_BG_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <LayoutGrid className="w-4 h-4 text-gray-500" /> Hero Layout Mode
                            </label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={pageStyles.heroLayout || 'split-right'}
                                onChange={e => upStyle('heroLayout', e.target.value)}
                            >
                                {HERO_LAYOUT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Master Section Visibility Grid */}
                    <div className="pt-2 border-t border-gray-100">
                        <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-gray-500" /> Master Section Live / Hide Toggles (9 Sections)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">Quick-switch sections live or hidden on the public homepage. You can also toggle each section directly in its card header below.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            <VisibilityToggle
                                label="Hero Section"
                                isHidden={!!pageStyles.hideHero}
                                onToggle={() => upStyle('hideHero', !pageStyles.hideHero)}
                            />
                            <VisibilityToggle
                                label="Category Icon Bar"
                                isHidden={!!pageStyles.hideCategories}
                                onToggle={() => upStyle('hideCategories', !pageStyles.hideCategories)}
                            />
                            <VisibilityToggle
                                label="Latest Updates Ticker"
                                isHidden={!!pageStyles.hideTicker}
                                onToggle={() => upStyle('hideTicker', !pageStyles.hideTicker)}
                            />
                            <VisibilityToggle
                                label="Global Search Bar"
                                isHidden={!!pageStyles.hideSearchBar}
                                onToggle={() => upStyle('hideSearchBar', !pageStyles.hideSearchBar)}
                            />
                            <VisibilityToggle
                                label="4 Service Cards"
                                isHidden={!!pageStyles.hideServices}
                                onToggle={() => upStyle('hideServices', !pageStyles.hideServices)}
                            />
                            <VisibilityToggle
                                label="Feature Cards & Sidebar"
                                isHidden={!!pageStyles.hideFeatures}
                                onToggle={() => upStyle('hideFeatures', !pageStyles.hideFeatures)}
                            />
                            <VisibilityToggle
                                label="Resources & Catalogues"
                                isHidden={!!pageStyles.hideResources}
                                onToggle={() => upStyle('hideResources', !pageStyles.hideResources)}
                            />
                            <VisibilityToggle
                                label="Partnership Form Section"
                                isHidden={!!pageStyles.hidePartnershipForm}
                                onToggle={() => upStyle('hidePartnershipForm', !pageStyles.hidePartnershipForm)}
                            />
                            <VisibilityToggle
                                label="Institutions / Collab Ticker"
                                isHidden={!!pageStyles.hideCollaborations}
                                onToggle={() => upStyle('hideCollaborations', !pageStyles.hideCollaborations)}
                            />
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── 1. Hero Banner Content ── */}
            <Section
                title="🖼 Hero Banner Content"
                isLive={!pageStyles.hideHero}
                onToggleLive={() => upStyle('hideHero', !pageStyles.hideHero)}
            >
                <div className="space-y-4">
                    <Field label="Hero Eyebrow" value={heroData.eyebrow || ''} onChange={v => setHeroData((p: any) => ({ ...p, eyebrow: v }))} placeholder="Future-ready campus infrastructure" />
                    <Field label="Hero Title" value={heroData.title || ''} onChange={v => setHeroData((p: any) => ({ ...p, title: v }))} multiline placeholder="Design. Build.&#10;Digitize. Operate.&#10;Future-Ready Campuses." />
                    <Field label="Hero Subtitle" value={heroData.subtitle || ''} onChange={v => setHeroData((p: any) => ({ ...p, subtitle: v }))} placeholder="Physical + Digital" />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="CTA Label" value={heroData.ctaLabel || ''} onChange={v => setHeroData((p: any) => ({ ...p, ctaLabel: v }))} placeholder="Schedule Campus Audit →" />
                        <Field label="CTA Link" value={heroData.ctaHref || ''} onChange={v => setHeroData((p: any) => ({ ...p, ctaHref: v }))} placeholder="/contact-us" />
                    </div>
                    <MediaImageField label="Background Image" value={heroData.image || ''} onChange={v => setHeroData((p: any) => ({ ...p, image: v }))} previewClassName="h-36 rounded-xl" />
                </div>
            </Section>

            {/* ── 2. Category Icons ── */}
            <Section
                title="🏷️ Category Icons Bar"
                isLive={!pageStyles.hideCategories}
                onToggleLive={() => upStyle('hideCategories', !pageStyles.hideCategories)}
            >
                <p className="text-xs text-gray-400 mb-4">Edit labels, destination links, icons, and live status in the quick navigation bar.</p>
                <div className="space-y-3">
                    {categories.map((cat, i) => {
                        const Icon = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS.Circle;
                        const isLive = cat.active !== false;
                        return (
                            <div key={i} className={`border rounded-xl p-4 transition-all ${isLive ? 'border-gray-200 bg-gray-50/40' : 'border-gray-200 bg-slate-100/60 opacity-70'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        <Icon className="w-4 h-4 text-gray-600" /> Icon {i + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <ItemLivePill isLive={isLive} onToggle={() => upCategory(i, 'active', !isLive)} />
                                        <button onClick={() => delCategory(i)} className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <Field label="Label" value={cat.label} onChange={v => upCategory(i, 'label', v)} placeholder="AI INFRA" />
                                    <Field label="Link (href)" value={cat.href} onChange={v => upCategory(i, 'href', v)} placeholder="/ai-ml" />
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-gray-700">Icon</label>
                                        <select
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
                                            value={cat.icon}
                                            onChange={e => upCategory(i, 'icon', e.target.value)}
                                        >
                                            {Object.keys(CATEGORY_ICONS).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <button onClick={addCategory} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Icon
                    </button>
                </div>
            </Section>

            {/* ── 3. Latest Updates Ticker ── */}
            <Section
                title="📣 Latest Updates Ticker"
                isLive={!pageStyles.hideTicker}
                onToggleLive={() => upStyle('hideTicker', !pageStyles.hideTicker)}
            >
                <div className="space-y-4">
                    <Field
                        label="Ticker Badge Label"
                        value={tickerTitle}
                        onChange={setTickerTitle}
                        placeholder="LATEST UPDATES"
                        hint="Appears on the left angled tab"
                    />
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Scrolling Announcement Lines</label>
                        <p className="text-xs text-gray-400 mb-3">Each line will scroll across the top bar under the header.</p>
                        <div className="space-y-2">
                            {tickerAnnouncements.map((ann, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={ann} onChange={e => {
                                        const a = [...tickerAnnouncements]; a[i] = e.target.value; setTickerAnnouncements(a);
                                    }} />
                                    <button onClick={() => setTickerAnnouncements(tickerAnnouncements.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button onClick={() => setTickerAnnouncements([...tickerAnnouncements, 'New announcement text'])} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <Plus className="w-3.5 h-3.5" /> Add Announcement
                            </button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── 4. Global Search Bar ── */}
            <Section
                title="🔍 Global Search Bar & Guided Decision Engine"
                badge="Cloud-Backed (Neon DB)"
                isLive={!pageStyles.hideSearchBar}
                onToggleLive={() => upStyle('hideSearchBar', !pageStyles.hideSearchBar)}
            >
                {/* Search Bar Overview Notice */}
                <div className="p-4 mb-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <Search className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                            <div className="font-bold text-blue-900 mb-0.5">Dual-Selector Decision Engine Cloud Taxonomy</div>
                            <div className="text-blue-700 leading-relaxed">
                                Manage all <strong>{searchTaxonomy.institutions.length} Institution Types</strong> and <strong>{searchTaxonomy.categories.length} Master Solution Categories (A–J)</strong> with their <strong>{searchTaxonomy.categories.reduce((acc, c) => acc + (c.subcategories?.length || 0), 0)} Subcategories</strong>. Click any card to expand and edit.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Reset entire taxonomy to original default categories, subcategories, and institutions? Any unsaved edits will be lost.')) {
                                    setSearchTaxonomy(DEFAULT_SEARCH_TAXONOMY);
                                    setExpandedCategoryIndex(null);
                                    setExpandedInstitutionIndex(null);
                                }
                            }}
                            className="text-xs text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 bg-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer font-medium"
                            title="Reset taxonomy to original system defaults"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
                        </button>
                    </div>
                </div>

                {/* Sub-Editor Header & Tabs */}
                <div className="pt-2">
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-gray-200 gap-2 mb-4 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setSearchTab('institutions')}
                            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                searchTab === 'institutions'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>🏛️ Institution Types</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                searchTab === 'institutions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {searchTaxonomy.institutions.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSearchTab('objectives')}
                            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                searchTab === 'objectives'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>🎯 Master Categories & Subcategories</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                searchTab === 'objectives' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {searchTaxonomy.categories.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSearchTab('chips')}
                            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                searchTab === 'chips'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>✨ Popular Search Briefs & Placeholder</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                searchTab === 'chips' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {(searchTaxonomy.popularChips || []).length}
                            </span>
                        </button>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════
                        TAB 1: INSTITUTION TYPES (Click-to-Open Accordion Cards)
                    ══════════════════════════════════════════════════════════════ */}
                    {searchTab === 'institutions' && (
                        <div className="space-y-4">
                            {/* Filter Bar & Quick Add */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 mr-1">Filter Group:</span>
                                    <button
                                        type="button"
                                        onClick={() => setInstitutionFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            institutionFilter === 'all'
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        All ({searchTaxonomy.institutions.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInstitutionFilter('higher-ed')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            institutionFilter === 'higher-ed'
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        Higher-Ed ({searchTaxonomy.institutions.filter((i) => i.group !== 'other').length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInstitutionFilter('other')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            institutionFilter === 'other'
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        Other Institutions ({searchTaxonomy.institutions.filter((i) => i.group === 'other').length})
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={institutionSearchTerm}
                                        onChange={(e) => setInstitutionSearchTerm(e.target.value)}
                                        placeholder="Search institutions..."
                                        className="w-full sm:w-48 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newId = `inst-${Date.now()}`;
                                            const newInst: TaxonomyInstitutionItem = {
                                                id: newId,
                                                label: 'New Institution Type',
                                                shortLabel: 'New Type',
                                                group: institutionFilter === 'other' ? 'other' : 'higher-ed',
                                                iconName: 'Building2',
                                                active: true,
                                            };
                                            const updated = [newInst, ...searchTaxonomy.institutions];
                                            setSearchTaxonomy({ ...searchTaxonomy, institutions: updated });
                                            setExpandedInstitutionIndex(0);
                                        }}
                                        className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer shrink-0 font-bold"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Type
                                    </button>
                                </div>
                            </div>

                            {/* Accordion Institutions List */}
                            <div className="space-y-2">
                                {searchTaxonomy.institutions
                                    .map((inst, realIdx) => ({ inst, realIdx }))
                                    .filter(({ inst }) => {
                                        if (institutionFilter === 'higher-ed' && inst.group === 'other') return false;
                                        if (institutionFilter === 'other' && inst.group !== 'other') return false;
                                        if (institutionSearchTerm.trim()) {
                                            const term = institutionSearchTerm.toLowerCase();
                                            return (
                                                inst.label.toLowerCase().includes(term) ||
                                                inst.shortLabel.toLowerCase().includes(term) ||
                                                inst.id.toLowerCase().includes(term)
                                            );
                                        }
                                        return true;
                                    })
                                    .map(({ inst, realIdx }) => {
                                        const isExpanded = expandedInstitutionIndex === realIdx;
                                        const isLive = inst.active !== false;
                                        const InstIcon = SEARCH_ICON_MAP[inst.iconName || ''] || Building2;

                                        return (
                                            <div
                                                key={inst.id || realIdx}
                                                className={`rounded-xl border transition-all overflow-hidden shadow-2xs ${
                                                    isExpanded
                                                        ? 'border-blue-400 ring-2 ring-blue-500/10 bg-white'
                                                        : isLive
                                                        ? 'border-gray-200 bg-white hover:border-gray-300'
                                                        : 'border-slate-200 bg-slate-50/70 opacity-75'
                                                }`}
                                            >
                                                {/* Collapsed Header Bar */}
                                                <div
                                                    onClick={() => setExpandedInstitutionIndex(isExpanded ? null : realIdx)}
                                                    className="p-3 bg-white hover:bg-slate-50/80 cursor-pointer flex items-center justify-between gap-3 select-none"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                type="button"
                                                                disabled={realIdx === 0}
                                                                onClick={() => {
                                                                    const arr = [...searchTaxonomy.institutions];
                                                                    const temp = arr[realIdx];
                                                                    arr[realIdx] = arr[realIdx - 1];
                                                                    arr[realIdx - 1] = temp;
                                                                    setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                                                title="Move Up"
                                                            >
                                                                <ChevronUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={realIdx === searchTaxonomy.institutions.length - 1}
                                                                onClick={() => {
                                                                    const arr = [...searchTaxonomy.institutions];
                                                                    const temp = arr[realIdx];
                                                                    arr[realIdx] = arr[realIdx + 1];
                                                                    arr[realIdx + 1] = temp;
                                                                    setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                                                title="Move Down"
                                                            >
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                            <InstIcon className="w-3.5 h-3.5" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs text-gray-900 truncate">
                                                                {inst.label}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                                                                <span>Button: <strong>{inst.shortLabel || inst.label}</strong></span>
                                                                <span>•</span>
                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                                    inst.group === 'other'
                                                                        ? 'bg-amber-100 text-amber-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                    {inst.group === 'other' ? 'Other Institution' : 'Higher Education'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {isLive ? '● Live' : 'Hidden'}
                                                        </span>
                                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                                            isExpanded ? 'rotate-180 text-blue-600' : ''
                                                        }`} />
                                                    </div>
                                                </div>

                                                {/* Expanded Details Form */}
                                                {isExpanded && (
                                                    <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                            <div className="sm:col-span-2">
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                    Full Name (Option Title)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={inst.label}
                                                                    onChange={(e) => {
                                                                        const arr = [...searchTaxonomy.institutions];
                                                                        arr[realIdx] = { ...arr[realIdx], label: e.target.value };
                                                                        setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                    }}
                                                                    className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                                    placeholder="e.g. Engineering Colleges"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                    Button Label (Short)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={inst.shortLabel || ''}
                                                                    onChange={(e) => {
                                                                        const arr = [...searchTaxonomy.institutions];
                                                                        arr[realIdx] = { ...arr[realIdx], shortLabel: e.target.value };
                                                                        setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                    }}
                                                                    className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                                    placeholder="e.g. Engineering"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                    Group Placement
                                                                </label>
                                                                <select
                                                                    value={inst.group || 'higher-ed'}
                                                                    onChange={(e) => {
                                                                        const arr = [...searchTaxonomy.institutions];
                                                                        arr[realIdx] = { ...arr[realIdx], group: e.target.value as 'higher-ed' | 'other' };
                                                                        setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                    }}
                                                                    className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                                >
                                                                    <option value="higher-ed">Higher Education</option>
                                                                    <option value="other">Other Institutions</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                    Lucide Icon
                                                                </label>
                                                                <select
                                                                    value={inst.iconName || 'Building2'}
                                                                    onChange={(e) => {
                                                                        const arr = [...searchTaxonomy.institutions];
                                                                        arr[realIdx] = { ...arr[realIdx], iconName: e.target.value };
                                                                        setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                    }}
                                                                    className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                                >
                                                                    {SEARCH_ICON_OPTIONS.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="flex items-end justify-between gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const arr = [...searchTaxonomy.institutions];
                                                                        arr[realIdx] = { ...arr[realIdx], active: !isLive };
                                                                        setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                                        isLive
                                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                                    }`}
                                                                >
                                                                    {isLive ? 'Visible on Search Bar' : 'Hidden from Search Bar'}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (confirm(`Delete institution type "${inst.label}"?`)) {
                                                                            const arr = searchTaxonomy.institutions.filter((_, i) => i !== realIdx);
                                                                            setSearchTaxonomy({ ...searchTaxonomy, institutions: arr });
                                                                            setExpandedInstitutionIndex(null);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 transition-colors cursor-pointer flex items-center gap-1 border border-red-200"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════════
                        TAB 2: MASTER CATEGORIES (A–J) & SUBCATEGORIES ACCORDION
                    ══════════════════════════════════════════════════════════════ */}
                    {searchTab === 'objectives' && (
                        <div className="space-y-4">
                            {/* Categories Overview Bar & Add Category */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                                <div>
                                    <div className="text-xs font-bold text-slate-800">10 Master Procurement Verticals (A–J)</div>
                                    <div className="text-[11px] text-slate-500">
                                        Click any category below to expand its title, icon, and full interactive subcategory tag manager.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newId = `cat-${Date.now()}`;
                                        const nextLetter = String.fromCharCode(65 + searchTaxonomy.categories.length);
                                        const newCategory: TaxonomyCategoryItem = {
                                            id: newId,
                                            letterCode: nextLetter,
                                            label: 'New Master Category',
                                            shortLabel: 'New Category',
                                            iconName: 'Target',
                                            subcategories: ['Sample Subcategory 1', 'Sample Subcategory 2'],
                                        };
                                        const updated = [...searchTaxonomy.categories, newCategory];
                                        setSearchTaxonomy({ ...searchTaxonomy, categories: updated });
                                        setExpandedCategoryIndex(updated.length - 1);
                                    }}
                                    className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer shrink-0 font-bold self-end sm:self-center"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Master Category
                                </button>
                            </div>

                            {/* Accordion Categories List */}
                            <div className="space-y-2.5">
                                {searchTaxonomy.categories.map((cat, catIdx) => {
                                    const isExpanded = expandedCategoryIndex === catIdx;
                                    const CatIcon = SEARCH_ICON_MAP[cat.iconName || ''] || Target;

                                    return (
                                        <div
                                            key={cat.id || catIdx}
                                            className={`rounded-xl border transition-all overflow-hidden shadow-2xs ${
                                                isExpanded
                                                    ? 'border-blue-400 ring-2 ring-blue-500/10 bg-white'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            {/* Collapsed Category Header */}
                                            <div
                                                onClick={() => setExpandedCategoryIndex(isExpanded ? null : catIdx)}
                                                className="p-3.5 bg-white hover:bg-slate-50/80 cursor-pointer flex items-center justify-between gap-3 select-none"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            disabled={catIdx === 0}
                                                            onClick={() => {
                                                                const arr = [...searchTaxonomy.categories];
                                                                const temp = arr[catIdx];
                                                                arr[catIdx] = arr[catIdx - 1];
                                                                arr[catIdx - 1] = temp;
                                                                setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                                            title="Move Up"
                                                        >
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={catIdx === searchTaxonomy.categories.length - 1}
                                                            onClick={() => {
                                                                const arr = [...searchTaxonomy.categories];
                                                                const temp = arr[catIdx];
                                                                arr[catIdx] = arr[catIdx + 1];
                                                                arr[catIdx + 1] = temp;
                                                                setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                                            title="Move Down"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {cat.letterCode || (catIdx + 1)}
                                                    </span>

                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                        <CatIcon className="w-3.5 h-3.5" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs text-gray-900 truncate">
                                                            {cat.label}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            Button: <strong>{cat.shortLabel || cat.label}</strong> • ID: <code className="text-[10px] bg-slate-100 px-1 rounded">{cat.id}</code>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                        {(cat.subcategories || []).length} subcategories
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180 text-blue-600' : ''
                                                    }`} />
                                                </div>
                                            </div>

                                            {/* Expanded Category Editor */}
                                            {isExpanded && (
                                                <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-150">
                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                Category Title (Full)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={cat.label}
                                                                onChange={(e) => {
                                                                    const arr = [...searchTaxonomy.categories];
                                                                    arr[catIdx] = { ...arr[catIdx], label: e.target.value };
                                                                    setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                }}
                                                                className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                                placeholder="e.g. Campus Design & Space Planning"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                Button Label (Short)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={cat.shortLabel || ''}
                                                                onChange={(e) => {
                                                                    const arr = [...searchTaxonomy.categories];
                                                                    arr[catIdx] = { ...arr[catIdx], shortLabel: e.target.value };
                                                                    setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                }}
                                                                className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                                placeholder="e.g. Campus Design"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                Letter Code (A-Z)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={cat.letterCode || ''}
                                                                maxLength={3}
                                                                onChange={(e) => {
                                                                    const arr = [...searchTaxonomy.categories];
                                                                    arr[catIdx] = { ...arr[catIdx], letterCode: e.target.value.toUpperCase() };
                                                                    setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                }}
                                                                className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white uppercase text-center"
                                                                placeholder="A"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                                                Lucide Icon
                                                            </label>
                                                            <select
                                                                value={cat.iconName || 'Target'}
                                                                onChange={(e) => {
                                                                    const arr = [...searchTaxonomy.categories];
                                                                    arr[catIdx] = { ...arr[catIdx], iconName: e.target.value };
                                                                    setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                }}
                                                                className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                            >
                                                                {SEARCH_ICON_OPTIONS.map((opt) => (
                                                                    <option key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="flex items-end justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (confirm(`Delete category "${cat.label}" and its ${(cat.subcategories || []).length} subcategories?`)) {
                                                                        const arr = searchTaxonomy.categories.filter((_, i) => i !== catIdx);
                                                                        setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                        setExpandedCategoryIndex(null);
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 transition-colors cursor-pointer flex items-center gap-1 border border-red-200"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Delete Category
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Subcategories Tag Manager */}
                                                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                                                <span>Subcategories ({(cat.subcategories || []).length})</span>
                                                            </label>
                                                            <span className="text-[11px] text-gray-400">Click × to remove a subcategory</span>
                                                        </div>

                                                        {/* Subcategories Tag Grid */}
                                                        <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                                                            {(!cat.subcategories || cat.subcategories.length === 0) ? (
                                                                <span className="text-xs text-gray-400 italic py-1">No subcategories defined yet.</span>
                                                            ) : (
                                                                cat.subcategories.map((subcat, sIdx) => (
                                                                    <span
                                                                        key={sIdx}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300 transition-all"
                                                                    >
                                                                        <span>{subcat}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const arr = [...searchTaxonomy.categories];
                                                                                const nextSubcats = (arr[catIdx].subcategories || []).filter((_, i) => i !== sIdx);
                                                                                arr[catIdx] = { ...arr[catIdx], subcategories: nextSubcats };
                                                                                setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                            }}
                                                                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                                            title={`Remove "${subcat}"`}
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Add Subcategory Input */}
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <input
                                                                type="text"
                                                                value={newSubcatInput[catIdx] || ''}
                                                                onChange={(e) => setNewSubcatInput({ ...newSubcatInput, [catIdx]: e.target.value })}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        const text = (newSubcatInput[catIdx] || '').trim();
                                                                        if (text) {
                                                                            const arr = [...searchTaxonomy.categories];
                                                                            const existing = arr[catIdx].subcategories || [];
                                                                            if (!existing.includes(text)) {
                                                                                arr[catIdx] = { ...arr[catIdx], subcategories: [...existing, text] };
                                                                                setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                            }
                                                                            setNewSubcatInput({ ...newSubcatInput, [catIdx]: '' });
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Type new subcategory (e.g. 40-Seat GPU Lab) and press Enter"
                                                                className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const text = (newSubcatInput[catIdx] || '').trim();
                                                                    if (text) {
                                                                        const arr = [...searchTaxonomy.categories];
                                                                        const existing = arr[catIdx].subcategories || [];
                                                                        if (!existing.includes(text)) {
                                                                            arr[catIdx] = { ...arr[catIdx], subcategories: [...existing, text] };
                                                                            setSearchTaxonomy({ ...searchTaxonomy, categories: arr });
                                                                        }
                                                                        setNewSubcatInput({ ...newSubcatInput, [catIdx]: '' });
                                                                    }
                                                                }}
                                                                className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3 cursor-pointer shrink-0 font-bold"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" /> Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════════
                        TAB 3: POPULAR CHIPS & INPUT PLACEHOLDER
                    ══════════════════════════════════════════════════════════════ */}
                    {searchTab === 'chips' && (
                        <div className="space-y-4">
                            {/* Input Placeholder Config */}
                            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <label className="text-xs font-bold text-gray-800 block">
                                    Search Bar Default Placeholder Text
                                </label>
                                <input
                                    type="text"
                                    value={searchTaxonomy.placeholder ?? searchPlaceholder}
                                    onChange={(e) => {
                                        setSearchTaxonomy({ ...searchTaxonomy, placeholder: e.target.value });
                                        setSearchPlaceholder(e.target.value);
                                    }}
                                    className="w-full text-xs font-semibold px-3 py-2 border border-gray-200 rounded-lg focus:outline-blue-500 bg-white"
                                    placeholder="Describe what you need (e.g. 40-seat AI lab with GPU workstations)"
                                />
                                <p className="text-[11px] text-gray-500">
                                    Shown inside the main text search field on the public homepage.
                                </p>
                            </div>

                            {/* Popular Chips Header */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                                <span>Quick pill shortcuts displayed in the footer of the floating suggestions panel.</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextChips = [
                                            ...(searchTaxonomy.popularChips || DEFAULT_POPULAR_CHIPS),
                                            { label: 'New Keyword', query: 'Search query' },
                                        ];
                                        setSearchTaxonomy({ ...searchTaxonomy, popularChips: nextChips });
                                        setSearchPopularChips(nextChips);
                                    }}
                                    className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3 cursor-pointer font-bold"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Keyword Chip
                                </button>
                            </div>

                            {/* Chips Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {(searchTaxonomy.popularChips || DEFAULT_POPULAR_CHIPS).map((chip, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-white flex items-center gap-2 shadow-xs">
                                        <div className="flex-1 space-y-1.5">
                                            <input
                                                type="text"
                                                value={chip.label}
                                                onChange={(e) => {
                                                    const arr = [...(searchTaxonomy.popularChips || DEFAULT_POPULAR_CHIPS)];
                                                    arr[idx] = { ...arr[idx], label: e.target.value };
                                                    setSearchTaxonomy({ ...searchTaxonomy, popularChips: arr });
                                                    setSearchPopularChips(arr);
                                                }}
                                                className="w-full text-xs font-bold px-2.5 py-1 border border-gray-200 rounded-md focus:outline-blue-500"
                                                placeholder="Chip Display Label"
                                            />
                                            <input
                                                type="text"
                                                value={chip.query}
                                                onChange={(e) => {
                                                    const arr = [...(searchTaxonomy.popularChips || DEFAULT_POPULAR_CHIPS)];
                                                    arr[idx] = { ...arr[idx], query: e.target.value };
                                                    setSearchTaxonomy({ ...searchTaxonomy, popularChips: arr });
                                                    setSearchPopularChips(arr);
                                                }}
                                                className="w-full text-[11px] text-gray-600 px-2.5 py-1 border border-gray-200 rounded-md focus:outline-blue-500"
                                                placeholder="Search query string"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const arr = (searchTaxonomy.popularChips || DEFAULT_POPULAR_CHIPS).filter((_, i) => i !== idx);
                                                setSearchTaxonomy({ ...searchTaxonomy, popularChips: arr });
                                                setSearchPopularChips(arr);
                                            }}
                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                            title="Delete chip"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Section>

            {/* ── 5. Service Cards ── */}
            <Section
                title="⚡ 4 Highlight Service Cards"
                isLive={!pageStyles.hideServices}
                onToggleLive={() => upStyle('hideServices', !pageStyles.hideServices)}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((svc: any, i) => {
                        const isLive = svc.active !== false;
                        return (
                            <div key={i} className={`border rounded-xl p-4 space-y-3 transition-all ${isLive ? 'border-gray-200 bg-gray-50/40' : 'border-gray-200 bg-slate-100/60 opacity-70'}`}>
                                <div className="flex justify-between items-center pb-1 border-b border-gray-200">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Card {i + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <ItemLivePill isLive={isLive} onToggle={() => upService(i, 'active', !isLive)} />
                                        {services.length > 1 && (
                                            <button onClick={() => delService(i)} className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                                        )}
                                    </div>
                                </div>
                                <Field label="Card Title" value={svc.title} onChange={v => upService(i, 'title', v)} placeholder="e.g. Transform Campus Infrastructure" />
                                <Field label="Link (href)" value={svc.href || '/'} onChange={v => upService(i, 'href', v)} placeholder="/contact-us" />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Background Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" className="h-8 w-10 border border-gray-200 rounded p-0.5 cursor-pointer" value={svc.bgColor || '#3B82F6'} onChange={e => upService(i, 'bgColor', e.target.value)} />
                                            <span className="text-xs text-gray-500">{svc.bgColor}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Text Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" className="h-8 w-10 border border-gray-200 rounded p-0.5 cursor-pointer" value={svc.textColor || '#ffffff'} onChange={e => upService(i, 'textColor', e.target.value)} />
                                            <span className="text-xs text-gray-500">{svc.textColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {services.length < 8 && (
                    <button onClick={addService} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors mt-4 shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Service Card
                    </button>
                )}
            </Section>

            {/* ── 6. Feature Cards & Sidebar ── */}
            <Section
                title={`🪟 Homepage Feature Cards (${features.length}) — Change Image & Text`}
                isLive={!pageStyles.hideFeatures}
                onToggleLive={() => upStyle('hideFeatures', !pageStyles.hideFeatures)}
            >
                <p className="text-xs text-gray-400 mb-4">Edit the cards on the homepage: change image, title, description, badge tag, color, destination link, and live/hidden state.</p>
                <div className="space-y-4">
                    {features.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
                            No cards yet. Click "Add Card" below.
                        </div>
                    )}
                    {features.map((card, i) => {
                        const isLive = card.active !== false;
                        const isExpanded = expandedFeatureIndex === i;
                        return (
                            <div
                                key={i}
                                className={`border rounded-2xl transition-all overflow-hidden ${
                                    isExpanded
                                        ? 'border-blue-400 bg-white ring-2 ring-blue-50 shadow-md'
                                        : isLive
                                        ? 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300'
                                        : 'border-gray-200 bg-slate-100/60 opacity-75 hover:bg-slate-100'
                                }`}
                            >
                                {/* Collapsible Header Strip - Whole Strip Clickable */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
                                    onClick={() => setExpandedFeatureIndex(isExpanded ? null : i)}
                                    onKeyDown={(e) => {
                                        if (e.target !== e.currentTarget) return;
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setExpandedFeatureIndex(isExpanded ? null : i);
                                        }
                                    }}
                                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 border border-blue-100">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        {card.image && (
                                            <img
                                                src={card.image}
                                                alt=""
                                                className="w-10 h-7 rounded-md object-cover border border-gray-200 shrink-0 hidden sm:block"
                                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800 truncate max-w-xs sm:max-w-md">
                                                    {card.title || 'Untitled Card'}
                                                </span>
                                                {card.tag && (
                                                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                                                        {card.tag}
                                                    </span>
                                                )}
                                            </div>
                                            {card.href && (
                                                <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                                                    {card.href}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <ItemLivePill isLive={isLive} onToggle={() => upFeature(i, 'active', !isLive)} />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                delFeature(i);
                                            }}
                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                                            title="Remove Card"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Remove</span>
                                        </button>
                                        <span className={`p-1.5 rounded-lg text-gray-400 transition-colors ${isExpanded ? 'bg-blue-50 text-blue-600' : 'hover:text-gray-600'}`}>
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Card Body - Full Editor */}
                                {isExpanded && (
                                    <div className="p-4 sm:p-5 pt-0 border-t border-gray-100 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-3">
                                                <Field label="Card Title" value={card.title || ''} onChange={v => upFeature(i, 'title', v)} placeholder="e.g. Smart Classrooms" />
                                                <Field label="Description" value={card.description || ''} onChange={v => upFeature(i, 'description', v)} multiline placeholder="Short description of this solution" />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Field label="Badge Tag" value={card.tag || ''} onChange={v => upFeature(i, 'tag', v)} placeholder="e.g. Turnkey, AI, Labs" />
                                                    <Field label="Link (href)" value={card.href || ''} onChange={v => upFeature(i, 'href', v)} placeholder="/smart-classrooms" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-600">Badge & Button Color</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input type="color" className="h-8 w-12 border border-gray-200 rounded p-0.5 cursor-pointer bg-white" value={card.color || '#3B82F6'} onChange={e => upFeature(i, 'color', e.target.value)} />
                                                        <input type="text" className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-28 focus:outline-none" value={card.color || '#3B82F6'} onChange={e => upFeature(i, 'color', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <MediaImageField label="Card Image" value={card.image || ''} onChange={v => upFeature(i, 'image', v)} previewClassName="h-44 rounded-xl" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button onClick={addFeature} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Card
                    </button>
                </div>
            </Section>

            {/* ── 7. Resources & Catalogues Section ── */}
            <Section
                title={`📚 Resources & Catalogues Section (${resources.length} Cards)`}
                isLive={!pageStyles.hideResources}
                onToggleLive={() => upStyle('hideResources', !pageStyles.hideResources)}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                        <Field
                            label="Section Heading"
                            value={resourcesHeading}
                            onChange={setResourcesHeading}
                            placeholder="Resources & Catalogues"
                        />
                        <Field
                            label="Section Subtitle"
                            value={resourcesSubtitle}
                            onChange={setResourcesSubtitle}
                            placeholder="Explore our curated guides, product showrooms..."
                        />
                    </div>

                    <div className="space-y-4">
                        {resources.map((item, i) => {
                            const isLive = item.active !== false;
                            const isExpanded = expandedResourceIndex === i;
                            return (
                                <div
                                    key={i}
                                    className={`border rounded-2xl transition-all overflow-hidden ${
                                        isExpanded
                                            ? 'border-blue-400 bg-white ring-2 ring-blue-50 shadow-md'
                                            : isLive
                                            ? 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300'
                                            : 'border-gray-200 bg-slate-100/60 opacity-75 hover:bg-slate-100'
                                    }`}
                                >
                                    {/* Collapsible Header Strip - Whole Strip Clickable */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                        onClick={() => setExpandedResourceIndex(isExpanded ? null : i)}
                                        onKeyDown={(e) => {
                                            if (e.target !== e.currentTarget) return;
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setExpandedResourceIndex(isExpanded ? null : i);
                                            }
                                        }}
                                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 border border-blue-100">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            {item.image && (
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    className="w-10 h-7 rounded-md object-cover border border-gray-200 shrink-0 hidden sm:block"
                                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-gray-800 truncate max-w-xs sm:max-w-md">
                                                        {item.title || 'Untitled Resource'}
                                                    </span>
                                                    {item.tag && (
                                                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 shrink-0">
                                                            {item.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.href && (
                                                    <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                                                        {item.href}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <ItemLivePill isLive={isLive} onToggle={() => upResource(i, 'active', !isLive)} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveResource(i, -1);
                                                }}
                                                disabled={i === 0}
                                                title="Move Up"
                                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveResource(i, 1);
                                                }}
                                                disabled={i === resources.length - 1}
                                                title="Move Down"
                                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    delResource(i);
                                                }}
                                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                                                title="Remove Resource"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Remove</span>
                                            </button>
                                            <span className={`p-1.5 rounded-lg text-gray-400 transition-colors ${isExpanded ? 'bg-blue-50 text-blue-600' : 'hover:text-gray-600'}`}>
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expanded Card Body - Full Editor */}
                                    {isExpanded && (
                                        <div className="p-4 sm:p-5 pt-0 border-t border-gray-100 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div className="space-y-3">
                                                    <Field label="Card Title" value={item.title} onChange={v => upResource(i, 'title', v)} placeholder="e.g. Complete Guide on AI Implementation" />
                                                    <Field label="Card Description" value={item.description} onChange={v => upResource(i, 'description', v)} multiline placeholder="Short description..." />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Field label="Badge Tag" value={item.tag} onChange={v => upResource(i, 'tag', v)} placeholder="e.g. GUIDE, HANDBOOK" />
                                                        <Field label="Link (href)" value={item.href} onChange={v => upResource(i, 'href', v)} placeholder="/ai-guide" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-xs font-semibold text-gray-600">Tag & Read Accent Color</label>
                                                        <div className="flex gap-2 items-center">
                                                            <input type="color" className="h-8 w-12 border border-gray-200 rounded p-0.5 cursor-pointer bg-white" value={item.color || '#0ea5e9'} onChange={e => upResource(i, 'color', e.target.value)} />
                                                            <input type="text" className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-28 focus:outline-none" value={item.color || '#0ea5e9'} onChange={e => upResource(i, 'color', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <MediaImageField label="Card Image" value={item.image} onChange={v => upResource(i, 'image', v)} previewClassName="h-44 rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={addResource} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Resource Card
                    </button>
                </div>
            </Section>

            {/* ── 8. Partnership Enquiry Section ── */}
            <Section
                title="🤝 Partnership Enquiry Section (Form & Sidebar)"
                isLive={!pageStyles.hidePartnershipForm}
                onToggleLive={() => upStyle('hidePartnershipForm', !pageStyles.hidePartnershipForm)}
            >
                <div className="space-y-5">
                    <div className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-800">Form Column</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field
                                label="Form Heading"
                                value={partnership.formTitle || ''}
                                onChange={v => upPartnership('formTitle', v)}
                                placeholder="Partnership Enquiry Form"
                            />
                            <Field
                                label="Form Subtitle"
                                value={partnership.formSubtitle || ''}
                                onChange={v => upPartnership('formSubtitle', v)}
                                placeholder="Please fill out the form and we'll get back to you as soon as possible."
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-800">"Ready to talk?" Sidebar Column</h3>
                        <Field
                            label="Sidebar Heading"
                            value={partnership.readyTitle || ''}
                            onChange={v => upPartnership('readyTitle', v)}
                            placeholder="Ready to talk?"
                        />
                        <Field
                            label="Sidebar Description"
                            value={partnership.readyText || ''}
                            onChange={v => upPartnership('readyText', v)}
                            multiline
                            placeholder="At SchoolMart, we have the expertise in guiding you to set up your school infrastructure and campus project..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field
                                label="WhatsApp Button Text"
                                value={partnership.whatsappText || ''}
                                onChange={v => upPartnership('whatsappText', v)}
                                placeholder="Connect On WhatsApp"
                            />
                            <Field
                                label="WhatsApp Number"
                                value={partnership.whatsappNumber || ''}
                                onChange={v => upPartnership('whatsappNumber', v)}
                                placeholder="919966109191"
                                hint="Country code + 10 digits"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field
                                label="Phone Button Text"
                                value={partnership.phoneText || ''}
                                onChange={v => upPartnership('phoneText', v)}
                                placeholder="Call Us 9966109191"
                            />
                            <Field
                                label="Phone Number"
                                value={partnership.phoneNumber || ''}
                                onChange={v => upPartnership('phoneNumber', v)}
                                placeholder="+919966109191"
                            />
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── 9. Collaborations Ticker ── */}
            <Section
                title="🤝 Institutions / Collaborations"
                isLive={!pageStyles.hideCollaborations}
                onToggleLive={() => upStyle('hideCollaborations', !pageStyles.hideCollaborations)}
            >
                <div className="space-y-4">
                    <Field
                        label="Section Banner Headline"
                        value={collaborationsTitle}
                        onChange={setCollaborationsTitle}
                        placeholder="Trusted By Leading Institutions Worldwide"
                    />
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Institutions List</label>
                        <p className="text-xs text-gray-400 mb-3">The scrolling logo/name bar for trusted institutions.</p>
                        <div className="space-y-2">
                            {collaborations.map((collab: any, i) => {
                                const isLive = collab.active !== false;
                                return (
                                    <div key={i} className={`flex gap-2 items-center border rounded-lg p-2 transition-all ${isLive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-slate-100/60 opacity-70'}`}>
                                        <input placeholder="Institution Name" className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={collab.name} onChange={e => {
                                            const a = [...collaborations]; a[i] = { ...a[i], name: e.target.value }; setCollaborations(a);
                                        }} />
                                        <ItemLivePill isLive={isLive} onToggle={() => {
                                            const a = [...collaborations]; a[i] = { ...a[i], active: !isLive }; setCollaborations(a);
                                        }} />
                                        <button onClick={() => setCollaborations(collaborations.filter((_, idx) => idx !== i))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                );
                            })}
                            <button onClick={() => setCollaborations([...collaborations, { name: 'New Institution', active: true }])} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <Plus className="w-3.5 h-3.5" /> Add Institution
                            </button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── Right Sidebar Blocks ── */}
            <Section title="📐 Right Sidebar Blocks (Classifieds, Resources, Projects, Contacts)">
                <div className="space-y-6">
                    {/* Classifieds */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-gray-800">Classifieds Block</span>
                            <button onClick={() => addListItem('classifieds', { label: 'New Classified Listing', href: '/classifieds', active: true })} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                        <div className="space-y-2">
                            {(sidebar.classifieds || []).map((c: any, i: number) => (
                                <div key={i} className="flex gap-2 items-center border border-gray-200 p-2.5 rounded-xl bg-gray-50/50">
                                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {i + 1}
                                    </span>
                                    <input className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800" placeholder="Bullet Label (e.g. Colleges / Universities for Sale)" value={c.label ?? c.title ?? ''} onChange={e => upListItem('classifieds', i, 'label', e.target.value)} />
                                    <input className="w-56 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-600" placeholder="Link (/...)" value={c.href || ''} onChange={e => upListItem('classifieds', i, 'href', e.target.value)} />
                                    <ItemLivePill
                                        isLive={c.active !== false}
                                        onToggle={() => upListItem('classifieds', i, 'active', c.active === false)}
                                    />
                                    <button onClick={() => delListItem('classifieds', i)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resources */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-gray-800">Resources Block</span>
                            <button onClick={() => addListItem('resources', { label: 'New Resource', href: '/catalogues', active: true })} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                        <div className="space-y-2">
                            {(sidebar.resources || []).map((c: any, i: number) => (
                                <div key={i} className="flex gap-2 items-center border border-gray-200 p-2.5 rounded-xl bg-gray-50/50">
                                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {i + 1}
                                    </span>
                                    <input className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800" placeholder="Resource Label (e.g. Complete Guide on AI Implementation)" value={c.label ?? c.title ?? ''} onChange={e => upListItem('resources', i, 'label', e.target.value)} />
                                    <input className="w-56 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-600" placeholder="Link (/...)" value={c.href || ''} onChange={e => upListItem('resources', i, 'href', e.target.value)} />
                                    <ItemLivePill
                                        isLive={c.active !== false}
                                        onToggle={() => upListItem('resources', i, 'active', c.active === false)}
                                    />
                                    <button onClick={() => delListItem('resources', i)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Completed Projects */}
                    <div>
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sm text-gray-800">Completed Projects Block</span>
                                <ItemLivePill
                                    isLive={!sidebar.hideCompletedProjects}
                                    onToggle={() => setSidebar((p: any) => ({ ...p, hideCompletedProjects: !p.hideCompletedProjects }))}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const nextIdx = (sidebar.completedProjects || []).length;
                                    addListItem('completedProjects', {
                                        label: 'New Completed Project',
                                        category: 'Completed Project',
                                        description: '',
                                        images: [],
                                        active: true,
                                    });
                                    setExpandedProjectIdx(nextIdx);
                                }}
                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Project Bullet
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(sidebar.completedProjects || []).map((c: any, i: number) => {
                                const bulletLabel = c.label ?? c.title ?? '';
                                const projectSlug = slugifyProjectLabel(bulletLabel);
                                const liveHref = `/completed-projects/${projectSlug}`;
                                const isExpanded = expandedProjectIdx === i;
                                const isUploading = uploadingProjectIdx === i;
                                const images: string[] = Array.isArray(c.images) ? c.images : (c.image ? [c.image] : []);
                                const validImageCount = images.filter(Boolean).length;

                                return (
                                    <div
                                        key={i}
                                        className={`border rounded-xl transition-all ${
                                            c.active === false
                                                ? 'border-gray-200 bg-gray-100/60 opacity-75'
                                                : isExpanded
                                                ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                                                : 'border-gray-200 bg-gray-50/50 hover:border-blue-200'
                                        }`}
                                    >
                                        {/* Compact Top Row */}
                                        <div className="flex flex-wrap gap-2 items-center p-3">
                                            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {i + 1}
                                            </span>
                                            <input
                                                className="flex-1 min-w-[180px] border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="Project Bullet Name (e.g. 20 Stunning College Buildings)"
                                                value={bulletLabel}
                                                onChange={e => upListItem('completedProjects', i, 'label', e.target.value)}
                                            />
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                                                <ImageIcon className="w-3 h-3 text-blue-500" />
                                                {validImageCount} {validImageCount === 1 ? 'Photo' : 'Photos'}
                                            </span>
                                            <ItemLivePill
                                                isLive={c.active !== false}
                                                onToggle={() => upListItem('completedProjects', i, 'active', c.active === false)}
                                            />
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => moveCompletedProject(i, -1)}
                                                    disabled={i === 0}
                                                    title="Move Up"
                                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                                >
                                                    <ChevronUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveCompletedProject(i, 1)}
                                                    disabled={i === (sidebar.completedProjects || []).length - 1}
                                                    title="Move Down"
                                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedProjectIdx(isExpanded ? null : i)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                                                    isExpanded
                                                        ? 'bg-slate-800 text-white hover:bg-slate-900'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                <span>{isExpanded ? 'Close Editor' : 'Edit Page & Photos'}</span>
                                            </button>
                                            <a
                                                href={liveHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                                                title={`Open live project page (${liveHref})`}
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (expandedProjectIdx === i) setExpandedProjectIdx(null);
                                                    delListItem('completedProjects', i);
                                                }}
                                                className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                title="Delete project bullet"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Simple Sleek Inline Editor for Shared Project Template */}
                                        {isExpanded && (
                                            <div className="border-t border-blue-200/70 bg-white rounded-b-xl p-4 space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <Field
                                                        label="Project Title (Heading on Page)"
                                                        value={bulletLabel}
                                                        onChange={v => upListItem('completedProjects', i, 'label', v)}
                                                        placeholder="e.g. Campus Master Planning"
                                                    />
                                                    <Field
                                                        label="Category Badge"
                                                        value={c.category || ''}
                                                        onChange={v => upListItem('completedProjects', i, 'category', v)}
                                                        placeholder="e.g. Master Planning & Urban Design"
                                                    />
                                                </div>

                                                <Field
                                                    label="Project Description (Shown below Carousel)"
                                                    value={c.description || ''}
                                                    onChange={v => upListItem('completedProjects', i, 'description', v)}
                                                    multiline
                                                    placeholder="Write the project overview, architectural highlights, and campus impact..."
                                                />

                                                {/* Carousel Images Manager */}
                                                <div className="space-y-2.5 pt-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-800">
                                                                Carousel Images ({validImageCount} {validImageCount === 1 ? 'Slide' : 'Slides'})
                                                            </label>
                                                            <p className="text-[11px] text-gray-400">
                                                                Add multiple photos to display in the interactive project carousel
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                                                                {isUploading ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <Upload className="w-3.5 h-3.5" />
                                                                )}
                                                                <span>{isUploading ? 'Uploading…' : 'Upload Photos'}</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    multiple
                                                                    className="hidden"
                                                                    disabled={isUploading}
                                                                    onChange={e => {
                                                                        void uploadProjectImages(i, e.target.files);
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => addProjectImage(i)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" /> Add Slide Slot
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {images.length === 0 ? (
                                                        <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center bg-gray-50/50">
                                                            <p className="text-xs text-gray-500">
                                                                No carousel images added yet. Click <strong>Upload Photos</strong> or <strong>Add Slide Slot</strong> above.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {images.map((imgUrl: string, imgIdx: number) => (
                                                                <div
                                                                    key={imgIdx}
                                                                    className="border border-gray-200 rounded-xl p-2.5 bg-gray-50/60 space-y-2"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[11px] font-bold text-gray-600">
                                                                            Slide #{imgIdx + 1}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeProjectImage(i, imgIdx)}
                                                                            className="text-[11px] font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" /> Remove
                                                                        </button>
                                                                    </div>
                                                                    <MediaImageField
                                                                        label=""
                                                                        value={imgUrl || ''}
                                                                        onChange={url => updateProjectImage(i, imgIdx, url)}
                                                                        previewClassName="h-32"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Contacts Block */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-gray-800">Direct Contact Cards (Sidebar Bottom)</span>
                            <button onClick={() => addListItem('contacts', { queryText: 'FOR QUERIES ON', title: 'Direct Contact', contact: '9966109191', href: 'tel:+919966109191', bg: '#00c4cc', active: true })} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                        <div className="space-y-3">
                            {(sidebar.contacts || []).map((c: any, i: number) => (
                                <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400">Contact Card {i + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <ItemLivePill
                                                isLive={c.active !== false}
                                                onToggle={() => upListItem('contacts', i, 'active', c.active === false)}
                                            />
                                            <button onClick={() => delListItem('contacts', i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="Top Small Text" value={c.queryText ?? 'FOR QUERIES ON'} onChange={v => upListItem('contacts', i, 'queryText', v)} />
                                        <Field label="Card Title" value={c.title || ''} onChange={v => upListItem('contacts', i, 'title', v)} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Field label="Display Phone / Email" value={c.contact ?? c.desc ?? ''} onChange={v => upListItem('contacts', i, 'contact', v)} />
                                        <Field label="Link (tel: / mailto:)" value={c.href || ''} onChange={v => upListItem('contacts', i, 'href', v)} />
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-600">Background Colour</label>
                                            <div className="flex gap-2 items-center">
                                                <input type="color" className="h-8 w-10 border border-gray-200 rounded p-0.5 cursor-pointer" value={c.bg || '#3B82F6'} onChange={e => upListItem('contacts', i, 'bg', e.target.value)} />
                                                <span className="text-xs text-gray-400">{c.bg}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>

            {/* Bottom Save */}
            <div className="flex justify-end pb-8">
                <button onClick={saveContent} disabled={saving || loading}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-colors shadow-md ${saving || loading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : saved ? '✓ All Changes Saved!' : 'Save All Changes'}
                </button>
            </div>
        </div>
    );
}
