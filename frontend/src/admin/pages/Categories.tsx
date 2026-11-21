import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    X,
    Tag,
    ExternalLink,
    HelpCircle,
    ArrowUp,
    ArrowDown,
    Check,
    Save,
    Sparkles,
    FolderOpen,
    Layers,
    BookOpen,
    Laptop,
    Trophy,
    Microscope,
    Store,
    LayoutGrid,
    CheckCircle2,
    Target,
    ChevronUp,
    ChevronDown,
    Building2
} from 'lucide-react';
import api from '../api/client';
import { clearPageCategoriesCache } from '@/hooks/usePageCategories';
import { clearPageDataCache, broadcastCmsInvalidation } from '@/hooks/usePageData';
import {
    SEARCH_ICON_MAP,
    SEARCH_ICON_OPTIONS,
    DEFAULT_OBJECTIVES_DATA,
    type RawSearchOption,
} from '@/components/sections/search-bar';

// --- TYPES ---
interface ProductCategory {
    id: number;
    name: string;
    slug: string;
    page: string;
    _count?: { products: number };
}

interface PageSummary {
    id: number;
    title: string;
    slug: string;
    template?: string;
    pageData?: string | Record<string, any>;
}

// Well-defined category-enabled showcase pages in SchoolMart (Excluding homepage as per strict invariant)
const PRESET_SHOWCASE_PAGES: Array<{ slug: string; label: string; group: string; icon: any }> = [
    // Solution Infrastructure Hubs
    { slug: 'libraries', label: 'Smart Libraries', group: 'Solution Hubs', icon: BookOpen },
    { slug: 'labs', label: 'Composite & Skill Labs', group: 'Solution Hubs', icon: Microscope },
    { slug: 'sports', label: 'Sports Hub', group: 'Solution Hubs', icon: Trophy },
    { slug: 'sports-infra', label: 'Sports Infrastructure', group: 'Solution Hubs', icon: Trophy },
    { slug: 'school-building-design', label: 'Architecture', group: 'Solution Hubs', icon: Building2 },
    { slug: 'digital', label: 'Digital Infra', group: 'Solution Hubs', icon: Laptop },
    { slug: 'environments', label: 'Environments Hub', group: 'Solution Hubs', icon: LayoutGrid },
    { slug: 'mathematics', label: 'Mathematics', group: 'Solution Hubs', icon: Target },
    { slug: 'design', label: 'School Designs', group: 'Solution Hubs', icon: Layers },
    { slug: 'science', label: 'Science Labs', group: 'Solution Hubs', icon: Microscope },
    { slug: 'tech-infra', label: 'Tech Infrastructure', group: 'Solution Hubs', icon: Laptop },
    { slug: 'renovation', label: 'Campus Renovation', group: 'Solution Hubs', icon: Building2 },

    // Strategic Guides & Knowledge Hubs
    { slug: 'ai-guide', label: 'AI Guide', group: 'Knowledge Hubs', icon: Sparkles },
    { slug: 'innovation', label: 'Innovation Hub', group: 'Knowledge Hubs', icon: Layers },
    { slug: 'setup-college', label: 'Setup Your College', group: 'Knowledge Hubs', icon: FolderOpen },
    { slug: 'collaboration', label: 'Collaboration Spaces', group: 'Knowledge Hubs', icon: LayoutGrid },
    { slug: 'resources', label: 'Resources & Guides', group: 'Knowledge Hubs', icon: BookOpen },
    { slug: 'ugc-guidelines', label: 'UGC Guidelines', group: 'Knowledge Hubs', icon: Layers },
    { slug: 'ai-ml', label: 'AI & ML Labs', group: 'Knowledge Hubs', icon: Laptop },

    // Turnkey Service Suites
    { slug: 'campus-design-execution', label: 'Campus Design & Execution', group: 'Turnkey Services', icon: LayoutGrid },
    { slug: 'campus-furniture-design', label: 'Campus Furniture Design', group: 'Turnkey Services', icon: LayoutGrid },
    { slug: 'sports-design-execution', label: 'Sports Design & Execution', group: 'Turnkey Services', icon: Trophy },
    { slug: 'ai-digital-design-supply', label: 'AI/Digital Design & Supply', group: 'Turnkey Services', icon: Laptop },
    { slug: 'ar-vr-experiences', label: 'AR / VR Experiences', group: 'Turnkey Services', icon: Sparkles },

    // Classifieds & Opportunities
    { slug: 'classifieds', label: 'Classifieds Opportunities', group: 'Directories', icon: Tag },
    { slug: 'colleges-universities-for-sale', label: 'Colleges for Sale', group: 'Directories', icon: FolderOpen },
];

const STORE_PAGE_OPTIONS = [
    { value: 'furniture', label: 'Campus Furniture' },
];

const EMPTY_PRODUCT_CAT: Partial<ProductCategory> = { name: '', slug: '', page: 'furniture' };

export default function Categories() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Mode: 'pages' (Showcase Page Card Filters) vs 'products' (E-Commerce Store Inventory) vs 'objectives' (Search & Hub Objectives)
    const urlMode = searchParams.get('mode');
    const initialMode: 'pages' | 'products' | 'objectives' =
        urlMode === 'products' ? 'products' : urlMode === 'objectives' ? 'objectives' : 'pages';
    const [activeMode, setActiveMode] = useState<'pages' | 'products' | 'objectives'>(initialMode);

    // --- MODE A: PAGE CATEGORIES STATE ---
    const [availablePages, setAvailablePages] = useState<PageSummary[]>([]);
    const [, setLoadingPages] = useState(true);
    const [selectedPageSlug, setSelectedPageSlug] = useState<string>(searchParams.get('page') || 'libraries');
    const [pageDetails, setPageDetails] = useState<PageSummary | null>(null);
    const [pageCategories, setPageCategories] = useState<string[]>([]);
    const [pageCards, setPageCards] = useState<any[]>([]);
    const [loadingPageData, setLoadingPageData] = useState(false);
    const [savingPage, setSavingPage] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
    const [editingCategoryValue, setEditingCategoryValue] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // --- MODE B: STORE PRODUCT CATEGORIES STATE ---
    const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [activeStoreFilter, setActiveStoreFilter] = useState('all');
    const [showProductModal, setShowProductModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [editingProductCat, setEditingProductCat] = useState<Partial<ProductCategory>>(EMPTY_PRODUCT_CAT);
    const [loadingProductCats, setLoadingProductCats] = useState(false);
    const [savingProductCat, setSavingProductCat] = useState(false);

    // --- MODE C: SEARCH & HUB OBJECTIVE CATEGORIES STATE ---
    const [searchObjectives, setSearchObjectives] = useState<RawSearchOption[]>(DEFAULT_OBJECTIVES_DATA);
    const [loadingObjectives, setLoadingObjectives] = useState(false);
    const [savingObjectives, setSavingObjectives] = useState(false);
    const [objectivesSuccessMsg, setObjectivesSuccessMsg] = useState('');
    const [hasUnsavedObjectives, setHasUnsavedObjectives] = useState(false);
    const [showNewObjectiveModal, setShowNewObjectiveModal] = useState(false);
    const [editingObjectiveIndex, setEditingObjectiveIndex] = useState<number | null>(null);
    const [objectiveForm, setObjectiveForm] = useState<Partial<RawSearchOption>>({
        id: '',
        label: '',
        shortLabel: '',
        iconName: 'Target',
        defaultRoute: '/find-solutions',
        active: true,
    });

    // Sync mode with query params
    const handleSwitchMode = (mode: 'pages' | 'products' | 'objectives') => {
        setActiveMode(mode);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', mode);
        setSearchParams(nextParams);
    };

    // 1. Fetch available pages list on mount
    useEffect(() => {
        const fetchPages = async () => {
            setLoadingPages(true);
            try {
                const { data } = await api.get('/pages');
                if (Array.isArray(data)) {
                    // Exclude homepage explicitly
                    const filtered = data.filter((p: any) => p.slug !== 'home');
                    setAvailablePages(filtered);

                    // If URL param page is present, select it; otherwise default to libraries
                    const urlPage = searchParams.get('page');
                    if (urlPage && filtered.some((p: any) => p.slug === urlPage)) {
                        setSelectedPageSlug(urlPage);
                    } else if (!selectedPageSlug && filtered.length > 0) {
                        setSelectedPageSlug('libraries');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch pages list:', err);
            } finally {
                setLoadingPages(false);
            }
        };

        fetchPages();
    }, []);

    // 2. Fetch specific page data when selectedPageSlug changes (Single-Stream Isolated Fetch)
    useEffect(() => {
        if (!selectedPageSlug) return;

        let alive = true;
        setLoadingPageData(true);
        setSaveSuccessMsg('');
        setHasUnsavedChanges(false);
        setEditingCategoryIndex(null);

        api.get(`/pages/${selectedPageSlug}`)
            .then(({ data }) => {
                if (!alive) return;
                setPageDetails(data);
                const pd = typeof data.pageData === 'string' ? JSON.parse(data.pageData || '{}') : (data.pageData || {});
                const explicitCats: string[] = Array.isArray(pd.categories) ? pd.categories.filter(Boolean) : [];
                const cards: any[] = Array.isArray(pd.cards) ? pd.cards : [];

                // Discover any card categories that might not be in explicitCats yet
                const existingSet = new Set(explicitCats.map(c => c.toLowerCase()));
                const unindexedCardCats: string[] = [];
                for (const card of cards) {
                    const raw = Array.isArray(card?.categories)
                        ? card.categories
                        : card?.category
                        ? [card.category]
                        : [];
                    for (const c of raw) {
                        if (c && typeof c === 'string' && !existingSet.has(c.toLowerCase().trim())) {
                            existingSet.add(c.toLowerCase().trim());
                            unindexedCardCats.push(c.trim());
                        }
                    }
                }

                const initialCats = [...explicitCats, ...unindexedCardCats];
                setPageCategories(initialCats);
                setPageCards(cards);
            })
            .catch((err) => {
                if (alive) console.error(`Failed to load page data for ${selectedPageSlug}:`, err);
            })
            .finally(() => {
                if (alive) setLoadingPageData(false);
            });

        return () => {
            alive = false;
        };
    }, [selectedPageSlug]);

    // 3. Fetch product categories when Product tab is active
    const fetchProductCategories = async () => {
        setLoadingProductCats(true);
        try {
            const { data } = await api.get('/products/categories');
            setProductCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch product categories:', err);
        } finally {
            setLoadingProductCats(false);
        }
    };

    useEffect(() => {
        if (activeMode === 'products' && productCategories.length === 0) {
            fetchProductCategories();
        }
    }, [activeMode]);

    // 4. Fetch search objectives when Objectives tab is active
    const fetchSearchObjectives = async () => {
        setLoadingObjectives(true);
        try {
            const { data } = await api.get('/content');
            if (data?.home_search_objectives) {
                try {
                    const parsed = JSON.parse(data.home_search_objectives);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSearchObjectives(parsed);
                    }
                } catch { /**/ }
            }
        } catch (err) {
            console.error('Failed to load search objectives:', err);
        } finally {
            setLoadingObjectives(false);
        }
    };

    useEffect(() => {
        if (activeMode === 'objectives') {
            fetchSearchObjectives();
        }
    }, [activeMode]);

    const handleSaveObjectives = async (updatedList?: RawSearchOption[]) => {
        const payload = updatedList || searchObjectives;
        setSavingObjectives(true);
        setObjectivesSuccessMsg('');
        try {
            await api.put('/content', {
                home_search_objectives: JSON.stringify(payload),
            });
            setSearchObjectives(payload);
            setHasUnsavedObjectives(false);
            setObjectivesSuccessMsg('Search & Hub Categories saved successfully! Live across search bar and page editors.');
            broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });
            setTimeout(() => setObjectivesSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Failed to save search objectives:', err);
            alert('Failed to save categories. Please check server logs.');
        } finally {
            setSavingObjectives(false);
        }
    };

    const handleOpenAddObjective = () => {
        setEditingObjectiveIndex(null);
        setObjectiveForm({
            id: '',
            label: '',
            shortLabel: '',
            iconName: 'Target',
            defaultRoute: '/find-solutions',
            active: true,
        });
        setShowNewObjectiveModal(true);
    };

    const handleOpenEditObjective = (index: number) => {
        setEditingObjectiveIndex(index);
        setObjectiveForm({ ...searchObjectives[index] });
        setShowNewObjectiveModal(true);
    };

    const handleSaveObjectiveModal = () => {
        const label = (objectiveForm.label || '').trim();
        if (!label) {
            alert('Please enter a category label.');
            return;
        }

        let id = (objectiveForm.id || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        if (!id) {
            id = label.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        }

        const shortLabel = (objectiveForm.shortLabel || '').trim() || label;
        const iconName = objectiveForm.iconName || 'Target';
        const defaultRoute = (objectiveForm.defaultRoute || '').trim() || '/find-solutions';
        const active = objectiveForm.active !== false;

        const nextObjectives = [...searchObjectives];

        if (editingObjectiveIndex !== null && editingObjectiveIndex >= 0) {
            nextObjectives[editingObjectiveIndex] = {
                id,
                label,
                shortLabel,
                iconName,
                defaultRoute,
                active,
            };
        } else {
            if (nextObjectives.some(o => o.id === id)) {
                alert(`Category ID "${id}" already exists. Please choose a different label or ID.`);
                return;
            }
            nextObjectives.push({
                id,
                label,
                shortLabel,
                iconName,
                defaultRoute,
                active,
            });
        }

        setSearchObjectives(nextObjectives);
        setHasUnsavedObjectives(true);
        setShowNewObjectiveModal(false);
    };

    const handleToggleObjectiveActive = (index: number) => {
        const next = [...searchObjectives];
        next[index] = { ...next[index], active: !next[index].active };
        setSearchObjectives(next);
        setHasUnsavedObjectives(true);
    };

    const handleDeleteObjective = (index: number) => {
        const target = searchObjectives[index];
        if (target.id === 'all') {
            alert('The "All Objectives" baseline option cannot be deleted.');
            return;
        }
        if (!confirm(`Delete category "${target.label}" (${target.id})?\n\nThis will remove it from the homepage search selector and admin dropdowns.`)) {
            return;
        }
        const next = searchObjectives.filter((_, i) => i !== index);
        setSearchObjectives(next);
        setHasUnsavedObjectives(true);
    };

    const handleMoveObjective = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= searchObjectives.length) return;

        const next = [...searchObjectives];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);

        setSearchObjectives(next);
        setHasUnsavedObjectives(true);
    };

    // Calculate card count per category in memory (<0.1ms, zero DB queries)
    const cardCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const card of pageCards) {
            const cardCats = Array.isArray(card?.categories)
                ? card.categories
                : card?.category
                ? [card.category]
                : [];
            for (const c of cardCats) {
                if (c) {
                    counts[c] = (counts[c] || 0) + 1;
                }
            }
        }
        return counts;
    }, [pageCards]);

    // --- MODE A ACTIONS: ADD, RENAME, REORDER, DELETE, SAVE ---
    const handleAddCategory = () => {
        const trimmed = newCategoryInput.trim();
        if (!trimmed) return;

        if (pageCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            alert(`Category "${trimmed}" already exists on this page.`);
            return;
        }

        setPageCategories((prev) => [...prev, trimmed]);
        setNewCategoryInput('');
        setHasUnsavedChanges(true);
    };

    const handleStartRename = (index: number) => {
        setEditingCategoryIndex(index);
        setEditingCategoryValue(pageCategories[index]);
    };

    const handleConfirmRename = (index: number) => {
        const trimmed = editingCategoryValue.trim();
        const oldName = pageCategories[index];

        if (!trimmed) {
            setEditingCategoryIndex(null);
            return;
        }

        if (trimmed.toLowerCase() !== oldName.toLowerCase() && pageCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            alert(`Category "${trimmed}" already exists on this page.`);
            return;
        }

        // Update category list
        const nextCats = [...pageCategories];
        nextCats[index] = trimmed;
        setPageCategories(nextCats);

        // Cascade rename to cards that carried the old category tag so no cards get orphaned
        const nextCards = pageCards.map((card) => {
            const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
            if (cats.includes(oldName)) {
                return {
                    ...card,
                    categories: cats.map((c: string) => (c === oldName ? trimmed : c)),
                    category: card.category === oldName ? trimmed : card.category,
                };
            }
            return card;
        });
        setPageCards(nextCards);

        setEditingCategoryIndex(null);
        setHasUnsavedChanges(true);
    };

    const handleDeleteCategory = (index: number) => {
        const catToRemove = pageCategories[index];
        const count = cardCounts[catToRemove] || 0;
        const msg = count > 0
            ? `Delete category "${catToRemove}"?\n\n${count} card(s) are currently tagged with this category and will have this tag unlinked.`
            : `Delete category "${catToRemove}"?`;

        if (!confirm(msg)) return;

        const nextCats = pageCategories.filter((_, i) => i !== index);
        setPageCategories(nextCats);

        // Unlink category from cards
        const nextCards = pageCards.map((card) => {
            const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
            if (cats.includes(catToRemove)) {
                return {
                    ...card,
                    categories: cats.filter((c: string) => c !== catToRemove),
                    category: card.category === catToRemove ? '' : card.category,
                };
            }
            return card;
        });
        setPageCards(nextCards);

        setHasUnsavedChanges(true);
    };

    const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= pageCategories.length) return;

        const nextCats = [...pageCategories];
        const [moved] = nextCats.splice(index, 1);
        nextCats.splice(targetIndex, 0, moved);

        setPageCategories(nextCats);
        setHasUnsavedChanges(true);
    };

    // Single-Stream Isolated Page Save (Touches ONLY this page's cloud record)
    const handleSavePageCategories = async () => {
        if (!pageDetails) return;
        setSavingPage(true);
        setSaveSuccessMsg('');

        try {
            const currentPd = typeof pageDetails.pageData === 'string'
                ? JSON.parse(pageDetails.pageData || '{}')
                : (pageDetails.pageData || {});

            const updatedPageData = {
                ...currentPd,
                categories: pageCategories,
                cards: pageCards,
            };

            await api.put(`/pages/${pageDetails.id}`, {
                pageData: updatedPageData,
            });

            // Update local snapshot
            setPageDetails((prev) => (prev ? { ...prev, pageData: updatedPageData } : null));

            // Instant cache invalidation
            clearPageDataCache(selectedPageSlug);
            broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: selectedPageSlug });

            setHasUnsavedChanges(false);
            setSaveSuccessMsg(`Categories for ${pageDetails.title} saved! Active on live /${selectedPageSlug}`);
            setTimeout(() => setSaveSuccessMsg(''), 6000);
        } catch (err: any) {
            console.error('Failed to save page categories:', err);
            alert(err.response?.data?.error || 'Failed to save categories.');
        } finally {
            setSavingPage(false);
        }
    };

    // --- MODE B ACTIONS: PRODUCT CATEGORIES (E-COMMERCE) ---
    const openAddProductCat = () => {
        setEditingProductCat({ ...EMPTY_PRODUCT_CAT, page: activeStoreFilter === 'all' ? 'furniture' : activeStoreFilter });
        setShowProductModal(true);
    };

    const openEditProductCat = (c: ProductCategory) => {
        setEditingProductCat(c);
        setShowProductModal(true);
    };

    const saveProductCat = async () => {
        if (!editingProductCat.name) return;
        setSavingProductCat(true);
        try {
            const payload = {
                ...editingProductCat,
                name: editingProductCat.name.trim(),
                slug: editingProductCat.slug
                    ? editingProductCat.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    : undefined,
            };
            if (editingProductCat.id) {
                await api.put(`/products/categories/${editingProductCat.id}`, payload);
            } else {
                await api.post('/products/categories', payload);
            }
            await fetchProductCategories();
            clearPageCategoriesCache();
            setShowProductModal(false);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save product category');
        } finally {
            setSavingProductCat(false);
        }
    };

    const deleteProductCat = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product category?')) return;
        try {
            await api.delete(`/products/categories/${id}`);
            await fetchProductCategories();
            clearPageCategoriesCache();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete category. Ensure no products are linked.');
        }
    };

    const filteredProductCats = productCategories.filter((c) =>
        ((c.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
            (c.slug || '').toLowerCase().includes(productSearch.toLowerCase())) &&
        (activeStoreFilter === 'all' || c.page === activeStoreFilter)
    );

    // Build the list of selectable pages for Mode A
    const selectablePages = useMemo(() => {
        const set = new Map<string, { slug: string; label: string; group: string; icon: any; id?: number }>();

        // Add presets first
        for (const p of PRESET_SHOWCASE_PAGES) {
            set.set(p.slug, { ...p });
        }

        // Add EVERY dynamic page returned from availablePages (excluding 'home')
        for (const p of availablePages) {
            if (!p.slug || p.slug === 'home') continue;

            if (set.has(p.slug)) {
                // If a page is already present in presets, retain the preset or update its label if p.title is present
                const existing = set.get(p.slug)!;
                if (p.title) {
                    existing.label = p.title;
                }
                if (p.id) {
                    existing.id = p.id;
                }
            } else {
                // Classify its group dynamically based on template or slug
                let group = 'Other Pages';
                let icon: any = FolderOpen;

                if (p.template === 'solution-hub' || p.template === 'grid') {
                    group = 'Solution Hubs';
                    icon = Building2;
                } else if (p.template === 'service-suite') {
                    group = 'Turnkey Services';
                    icon = LayoutGrid;
                } else if (p.template === 'article') {
                    group = 'Knowledge Hubs';
                    icon = BookOpen;
                }

                set.set(p.slug, {
                    slug: p.slug,
                    label: p.title || p.slug,
                    group,
                    icon,
                    id: p.id,
                });
            }
        }

        return Array.from(set.values());
    }, [availablePages]);

    // Store section options for Mode B (strictly physical e-commerce store catalog: Furniture)
    const storePageOptions = useMemo(() => {
        return STORE_PAGE_OPTIONS;
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Tag className="w-7 h-7 text-blue-600" />
                        Categories & Classifications
                    </h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Unified Master Control for Showcase Page Filters & Store Catalogues
                    </p>
                </div>

                {/* Top Segmented Mode Control */}
                <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/60 shadow-xs flex-wrap gap-1">
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('pages')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeMode === 'pages'
                                ? 'bg-white text-blue-900 shadow-sm border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                        }`}
                    >
                        <Layers className="w-4 h-4 text-blue-600" />
                        Showcase Page Filters
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('products')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeMode === 'products'
                                ? 'bg-white text-blue-900 shadow-sm border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                        }`}
                    >
                        <Store className="w-4 h-4 text-indigo-600" />
                        Store & Product Catalog
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('objectives')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeMode === 'objectives'
                                ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                        }`}
                    >
                        <Target className="w-4 h-4 text-emerald-600" />
                        Search & Hub Categories
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* MODE A: SHOWCASE PAGE CATEGORIES (LIVE CARDS & FILTERS)                  */}
            {/* ========================================================================= */}
            {activeMode === 'pages' && (
                <div className="space-y-6">
                    {/* Guidance Strip */}
                    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0">
                                <Sparkles className="w-5 h-5 text-cm-yellow" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">Single-Stream Master Categories Control</h2>
                                <p className="text-xs text-blue-200/90 mt-0.5">
                                    Categories created here control the live 1-click filter bar on that page and become the only selectable categories when assigning cards.
                                </p>
                            </div>
                        </div>
                        {hasUnsavedChanges && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-black uppercase tracking-wider animate-pulse">
                                ● Unsaved Changes
                            </span>
                        )}
                    </div>

                    {/* Page Selector Strip */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-blue-600" />
                                Select Showcase Page to Manage Categories:
                            </label>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {selectablePages.length} Pages Available
                            </span>
                        </div>

                        {/* Page Pill Buttons */}
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                            {selectablePages.map((page) => {
                                const Icon = page.icon || FolderOpen;
                                const isSelected = selectedPageSlug === page.slug;
                                return (
                                    <button
                                        key={page.slug}
                                        type="button"
                                        onClick={() => {
                                            if (hasUnsavedChanges) {
                                                if (!confirm('You have unsaved category changes. Switch page without saving?')) {
                                                    return;
                                                }
                                            }
                                            setSelectedPageSlug(page.slug);
                                            const nextParams = new URLSearchParams(searchParams);
                                            nextParams.set('page', page.slug);
                                            setSearchParams(nextParams);
                                        }}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                                                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                                        <span>{page.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Page Category Management Card */}
                    {loadingPageData ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                            Loading categories for {selectedPageSlug}...
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                            {/* Card Top: Page Info & Action Links */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-black text-slate-900">
                                            {pageDetails?.title || selectedPageSlug}
                                        </h2>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-widest">
                                            /{selectedPageSlug}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {pageCategories.length} Categories Defined &middot; {pageCards.length} Total Cards
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/${selectedPageSlug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 transition-all shadow-xs"
                                        title="View live page in new tab"
                                    >
                                        <span>Live Page</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    <Link
                                        to={`/admin/pages`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all shadow-xs"
                                        title="Open page in Pages Manager"
                                    >
                                        <span>Pages Manager</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Success Notification Banner */}
                            {saveSuccessMsg && (
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{saveSuccessMsg}</span>
                                </div>
                            )}

                            {/* Categories List */}
                            <div className="space-y-2.5">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                                    Registered Live Categories (Displayed in Order on Live Site):
                                </label>

                                {pageCategories.length === 0 ? (
                                    <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-xs font-medium">
                                        No categories defined yet for this page. Type a category name below and click &ldquo;Add Category&rdquo;.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {pageCategories.map((cat, idx) => {
                                            const count = cardCounts[cat] || 0;
                                            const isEditing = editingCategoryIndex === idx;

                                            return (
                                                <div
                                                    key={`${cat}-${idx}`}
                                                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-white border border-gray-200/80 hover:border-blue-200 hover:shadow-xs transition-all group"
                                                >
                                                    {/* Left: Reorder & Name */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {/* Reorder Buttons */}
                                                        <div className="flex flex-col gap-0.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveCategory(idx, 'up')}
                                                                disabled={idx === 0}
                                                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveCategory(idx, 'down')}
                                                                disabled={idx === pageCategories.length - 1}
                                                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Index Badge */}
                                                        <span className="text-[11px] font-mono font-bold text-slate-400 w-5">
                                                            #{idx + 1}
                                                        </span>

                                                        {/* Category Title or Inline Edit */}
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                                                <input
                                                                    type="text"
                                                                    value={editingCategoryValue}
                                                                    onChange={(e) => setEditingCategoryValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            if (e.nativeEvent.isComposing) return;
                                                                            handleConfirmRename(idx);
                                                                        }
                                                                        if (e.key === 'Escape') setEditingCategoryIndex(null);
                                                                    }}
                                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-blue-400 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleConfirmRename(idx)}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                                                                >
                                                                    Done
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingCategoryIndex(null)}
                                                                    className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 text-xs font-bold"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2.5 truncate">
                                                                <span className="text-sm font-bold text-slate-900 truncate">
                                                                    {cat}
                                                                </span>
                                                                <span
                                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                                        count > 0
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'bg-slate-200 text-slate-600'
                                                                    }`}
                                                                >
                                                                    {count} {count === 1 ? 'card' : 'cards'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right: Actions */}
                                                    {!isEditing && (
                                                        <div className="flex items-center gap-1 shrink-0 ml-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartRename(idx)}
                                                                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                                title={`Rename "${cat}"`}
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCategory(idx)}
                                                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                                title={`Delete "${cat}"`}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Add Category Input */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                                    Add New Category to {pageDetails?.title || selectedPageSlug}:
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryInput}
                                        onChange={(e) => setNewCategoryInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (e.nativeEvent.isComposing) return;
                                                e.preventDefault();
                                                handleAddCategory();
                                            }
                                        }}
                                        placeholder="e.g. Cybersecurity, Collaborative Commons, Aquatics..."
                                        className="flex-1 max-w-lg border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Category
                                    </button>
                                </div>
                            </div>

                            {/* Single-Stream Isolated Save Bar */}
                            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 -mx-6 -mb-6 p-6 rounded-b-2xl">
                                <div className="text-xs text-slate-500">
                                    {hasUnsavedChanges ? (
                                        <span className="text-amber-700 font-bold flex items-center gap-1.5">
                                            ● You have unsaved changes. Click save to apply changes.
                                        </span>
                                    ) : (
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                            All categories are up to date.
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSavePageCategories}
                                    disabled={savingPage || !hasUnsavedChanges}
                                    className="w-full sm:w-auto px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    {savingPage ? 'Saving...' : `Save ${pageDetails?.title || ''} Categories`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODE B: STORE & PRODUCT CATALOG CATEGORIES (PHYSICAL INVENTORY)          */}
            {/* ========================================================================= */}
            {activeMode === 'products' && (
                <div className="space-y-6">
                    {/* Header + Add Product Category Button */}
                    <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">E-Commerce Product Categories</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {productCategories.length} Classifications for Physical Store Inventory (/shop & /furniture)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openAddProductCat}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> New Product Category
                        </button>
                    </div>

                    {/* Explanatory Guide Banner */}
                    <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-sm border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                                        How Store Product Categories Work
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Every physical product in the catalog (chairs, desks, lab sets, balls) is tagged with a product category.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide((v) => !v)}
                                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                            >
                                {showGuide ? 'Hide Details' : 'View Store Mapping'}
                            </button>
                        </div>

                        {showGuide && (
                            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                {storePageOptions.map((opt) => (
                                    <a
                                        key={opt.value}
                                        href={opt.value === 'furniture' ? '/furniture' : ['renovation', 'libraries', 'tech-infra', 'sports-infra', 'labs'].includes(opt.value) ? `/${opt.value}` : `/shop?category=${opt.value}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-colors"
                                    >
                                        <span className="font-semibold">{opt.label}</span>
                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Store Filter Tabs */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveStoreFilter('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                activeStoreFilter === 'all'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            All ({productCategories.length})
                        </button>
                        {storePageOptions.map((opt) => {
                            const count = productCategories.filter((c) => c.page === opt.value).length;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setActiveStoreFilter(opt.value)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        activeStoreFilter === opt.value
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {opt.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Search product categories..."
                                className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingProductCats ? (
                            <div className="col-span-full py-16 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">
                                Loading Product Categories...
                            </div>
                        ) : filteredProductCats.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-slate-400 text-xs font-medium">
                                No product categories found for this selection.
                            </div>
                        ) : (
                            filteredProductCats.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Tag className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                                {cat.slug}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                                    {storePageOptions.find((p) => p.value === cat.page)?.label || cat.page}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    &middot; {cat._count?.products ?? 0} product{cat._count?.products === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => openEditProductCat(cat)}
                                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                            title="Edit Category"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteProductCat(cat.id)}
                                            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Delete Category"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Product Category Modal */}
                    {showProductModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between p-6 border-b">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">
                                            {editingProductCat.id ? 'Edit Product Category' : 'New Product Category'}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            Physical Store Inventory Classification
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(false)}
                                        className="p-2 text-gray-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Category Name
                                        </label>
                                        <input
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            value={editingProductCat.name || ''}
                                            onChange={(e) => setEditingProductCat({ ...editingProductCat, name: e.target.value })}
                                            placeholder="e.g. Ergonomic Chairs, Chemistry Glassware..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Slug (URL Identifier)
                                        </label>
                                        <input
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            value={editingProductCat.slug || ''}
                                            onChange={(e) => setEditingProductCat({ ...editingProductCat, slug: e.target.value })}
                                            placeholder="automatic if left blank"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Store Section
                                        </label>
                                        <select
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                            value={editingProductCat.page || 'furniture'}
                                            onChange={(e) => setEditingProductCat({ ...editingProductCat, page: e.target.value })}
                                        >
                                            {storePageOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="p-6 border-t flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(false)}
                                        className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveProductCat}
                                        disabled={savingProductCat}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                                    >
                                        {savingProductCat ? 'Saving...' : 'Save Product Category'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODE C: SEARCH & HUB OBJECTIVE CATEGORIES (SINGLE SOURCE OF TRUTH)        */}
            {/* ========================================================================= */}
            {activeMode === 'objectives' && (
                <div className="space-y-6">
                    {/* Guidance Strip */}
                    <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
                                <Target className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">Master Search Objectives &amp; Hub Categories</h2>
                                <p className="text-xs text-emerald-200/90 mt-0.5">
                                    The single source of truth for the Homepage Search Bar (&quot;Looking For&quot; selector), AI Solutions Finder classification, Hub Page tagging, and Shop Products.
                                </p>
                            </div>
                        </div>
                        {hasUnsavedObjectives && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-black uppercase tracking-wider animate-pulse">
                                ● Unsaved Changes
                            </span>
                        )}
                    </div>

                    {/* Success Alert */}
                    {objectivesSuccessMsg && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{objectivesSuccessMsg}</span>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Categories List
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                {searchObjectives.length} configured
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAddObjective}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add New Category</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveObjectives()}
                                disabled={savingObjectives}
                                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer ${
                                    hasUnsavedObjectives
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 animate-pulse'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                } disabled:opacity-50`}
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{savingObjectives ? 'Saving...' : 'Save All Changes'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Categories List */}
                    {loadingObjectives ? (
                        <div className="p-12 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl border border-slate-200">
                            Loading search objectives...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {searchObjectives.map((item, idx) => {
                                const IconComponent = SEARCH_ICON_MAP[item.iconName || 'Target'] || Target;
                                const isAllBaseline = item.id === 'all';
                                const isLive = item.active !== false;

                                return (
                                    <div
                                        key={item.id || idx}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                            isLive
                                                ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                                                : 'bg-slate-50 border-slate-200 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                                #{String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-extrabold text-slate-900 text-sm">
                                                        {item.label}
                                                    </span>
                                                    {item.shortLabel && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Pill: {item.shortLabel}
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        id: {item.id}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                                                    Default Route: {item.defaultRoute || '/find-solutions'} • Icon: {item.iconName || 'Target'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                            {/* Live / Hidden Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleObjectiveActive(idx)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    isLive
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-200/80 text-slate-600 border border-slate-300 hover:bg-slate-300'
                                                }`}
                                                title="Toggle visibility in search bar and dropdowns"
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                <span>{isLive ? 'Live' : 'Hidden'}</span>
                                            </button>

                                            {/* Reorder Up */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveObjective(idx, 'up')}
                                                disabled={idx === 0}
                                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30 cursor-pointer"
                                                title="Move Up"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>

                                            {/* Reorder Down */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveObjective(idx, 'down')}
                                                disabled={idx === searchObjectives.length - 1}
                                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30 cursor-pointer"
                                                title="Move Down"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditObjective(idx)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                                title="Edit Category Details"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            {/* Delete */}
                                            {!isAllBaseline && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteObjective(idx)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                    title="Delete Category"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Modal: Add / Edit Search Objective */}
                    {showNewObjectiveModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                            <Target className="w-5 h-5 text-emerald-600" />
                                            {editingObjectiveIndex !== null ? 'Edit Search Objective' : 'Add Search Objective'}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Configures how this category appears in the search bar and hub dropdowns.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewObjectiveModal(false)}
                                        className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Category Label (Display Name) *
                                        </label>
                                        <input
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            value={objectiveForm.label || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const autoId = editingObjectiveIndex === null && !objectiveForm.id
                                                    ? val.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
                                                    : objectiveForm.id;
                                                setObjectiveForm({
                                                    ...objectiveForm,
                                                    label: val,
                                                    ...(editingObjectiveIndex === null ? { id: autoId } : {}),
                                                });
                                            }}
                                            placeholder="e.g. Become Smart Campus, Sports Infrastructure..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Category ID (Slug) *
                                            </label>
                                            <input
                                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                value={objectiveForm.id || ''}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, id: e.target.value })}
                                                placeholder="e.g. smart-campus, sports-infra"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Short Label (Pill Text)
                                            </label>
                                            <input
                                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                value={objectiveForm.shortLabel || ''}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, shortLabel: e.target.value })}
                                                placeholder="e.g. Smart Campus, Sports"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Display Icon
                                            </label>
                                            <select
                                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                value={objectiveForm.iconName || 'Target'}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, iconName: e.target.value })}
                                            >
                                                {SEARCH_ICON_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Default Target Route
                                            </label>
                                            <input
                                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                value={objectiveForm.defaultRoute || ''}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, defaultRoute: e.target.value })}
                                                placeholder="/smart-classrooms"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={objectiveForm.active !== false}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, active: e.target.checked })}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                            <span className="text-xs font-bold text-slate-800">
                                                Active &amp; Visible in Homepage Search &amp; CMS Dropdowns
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewObjectiveModal(false)}
                                        className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveObjectiveModal}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                                    >
                                        Apply Category
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
