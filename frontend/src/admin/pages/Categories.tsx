import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
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
import {
    fetchAdminPageCategories,
    createAdminPageCategory,
    deleteAdminPageCategory,
    reorderAdminPageCategories,
    fetchAdminPageItems,
    updateAdminPageItem,
} from '../api/pageItems';
import { clearPageCategoriesCache } from '@/hooks/usePageCategories';
import { clearPageDataCache, broadcastCmsInvalidation } from '@/hooks/usePageData';
import {
    SEARCH_ICON_MAP,
    SEARCH_ICON_OPTIONS,
    DEFAULT_OBJECTIVES_DATA,
} from '@/components/sections/search-bar';
import type { RawSearchOption } from '@/components/sections/search-bar';

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
    contentModel?: string;
    pageData?: string | Record<string, any>;
}

interface PageCardItem {
    id?: string | number;
    title?: string;
    category?: string;
    categories?: string[];
    [key: string]: unknown;
}

interface ApiError {
    response?: {
        data?: {
            error?: string;
            message?: string;
        };
        status?: number;
    };
}

// Well-defined category-enabled showcase pages in SchoolMart (Excluding homepage as per strict invariant)
const PRESET_SHOWCASE_PAGES: Array<{ slug: string; label: string; group: string; icon: ElementType }> = [
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
    const [pageCards, setPageCards] = useState<PageCardItem[]>([]);
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
                    const filtered = data.filter((p: PageSummary) => p.slug !== 'home');
                    setAvailablePages(filtered);

                    // If URL param page is present, select it; otherwise default to libraries
                    const urlPage = searchParams.get('page');
                    if (urlPage && filtered.some((p: PageSummary) => p.slug === urlPage)) {
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
                const cards: PageCardItem[] = Array.isArray(pd.cards) ? pd.cards : [];

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
                if (c && typeof c === 'string') {
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
            if (pageDetails.contentModel === 'structured') {
                // Read current categories from backend
                const { categories: serverCats } = await fetchAdminPageCategories(pageDetails.id);
                const serverCatMap = new Map(serverCats.map(c => [c.name.trim().toLowerCase(), c]));

                // 1. Create missing categories
                for (const catName of pageCategories) {
                    const key = catName.trim().toLowerCase();
                    if (!serverCatMap.has(key)) {
                        const { category: created } = await createAdminPageCategory(pageDetails.id, catName.trim());
                        serverCatMap.set(key, created);
                    }
                }

                // 2. Delete removed categories
                const localCatSet = new Set(pageCategories.map(c => c.trim().toLowerCase()));
                for (const [key, serverCat] of serverCatMap.entries()) {
                    if (!localCatSet.has(key)) {
                        await deleteAdminPageCategory(pageDetails.id, serverCat.id);
                        serverCatMap.delete(key);
                    }
                }

                // 3. Reorder categories to match pageCategories order
                const orderedIds = pageCategories
                    .map(name => serverCatMap.get(name.trim().toLowerCase())?.id)
                    .filter((id): id is number => id !== undefined);

                if (orderedIds.length > 0) {
                    await reorderAdminPageCategories(pageDetails.id, orderedIds);
                }

                // 4. Update card categories if cards were modified
                const { items: serverItems } = await fetchAdminPageItems(pageDetails.id, 'cards', 'card');
                for (const card of pageCards) {
                    const matchItem = serverItems.find(it => it.slug === card.slug || it.title === card.title);
                    if (matchItem) {
                        const newCats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
                        const oldCats = matchItem.categories || [];
                        if (JSON.stringify(newCats) !== JSON.stringify(oldCats)) {
                            await updateAdminPageItem(pageDetails.id, matchItem.id, {
                                version: matchItem.version,
                                categories: newCats,
                            });
                        }
                    }
                }
            } else {
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
            }

            // Instant cache invalidation
            clearPageDataCache(selectedPageSlug);
            broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: selectedPageSlug });

            setHasUnsavedChanges(false);
            setSaveSuccessMsg(`Categories for ${pageDetails.title} saved! Active on live /${selectedPageSlug}`);
            setTimeout(() => setSaveSuccessMsg(''), 6000);
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            console.error('Failed to save page categories:', err);
            alert(apiErr.response?.data?.error || 'Failed to save categories.');
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
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            alert(apiErr.response?.data?.error || 'Failed to save product category');
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
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            alert(apiErr.response?.data?.error || 'Failed to delete category. Ensure no products are linked.');
        }
    };

    const filteredProductCats = productCategories.filter((c) =>
        ((c.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
            (c.slug || '').toLowerCase().includes(productSearch.toLowerCase())) &&
        (activeStoreFilter === 'all' || c.page === activeStoreFilter)
    );

    // Build the list of selectable pages for Mode A
    const selectablePages = useMemo(() => {
        const set = new Map<string, { slug: string; label: string; group: string; icon: ElementType; id?: number }>();

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
                let icon: ElementType = FolderOpen;

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
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
                        <Tag className="w-6 h-6 text-[#1e3a8a]" />
                        Categories &amp; Classifications
                    </h1>
                    <p className="text-xs text-stone-500 font-medium tracking-wide mt-1">
                        Unified Master Control for Showcase Page Filters &amp; Store Catalogues
                    </p>
                </div>

                {/* Top Segmented Mode Control - Calm Stone Styling */}
                <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 flex-wrap gap-1">
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('pages')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            activeMode === 'pages'
                                ? 'bg-white text-[#1e3a8a] shadow-xs border border-stone-200'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-transparent'
                        }`}
                    >
                        <Layers className={`w-4 h-4 ${activeMode === 'pages' ? 'text-[#1e3a8a]' : 'text-stone-500'}`} />
                        Showcase Page Filters
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('products')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            activeMode === 'products'
                                ? 'bg-white text-[#1e3a8a] shadow-xs border border-stone-200'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-transparent'
                        }`}
                    >
                        <Store className={`w-4 h-4 ${activeMode === 'products' ? 'text-[#1e3a8a]' : 'text-stone-500'}`} />
                        Store &amp; Product Catalog
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('objectives')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            activeMode === 'objectives'
                                ? 'bg-white text-[#1e3a8a] shadow-xs border border-stone-200'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-transparent'
                        }`}
                    >
                        <Target className={`w-4 h-4 ${activeMode === 'objectives' ? 'text-[#1e3a8a]' : 'text-stone-500'}`} />
                        Search &amp; Hub Categories
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* MODE A: SHOWCASE PAGE CATEGORIES (LIVE CARDS & FILTERS)                  */}
            {/* ========================================================================= */}
            {activeMode === 'pages' && (
                <div className="space-y-6">
                    {/* Guidance Strip - Calm #1e293b Container */}
                    <div className="bg-[#1e293b] rounded-xl p-5 text-white shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-stone-300 shrink-0">
                                <Sparkles className="w-4 h-4 text-stone-300" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white">Single-Stream Master Categories Control</h2>
                                <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                                    Categories created here control the live 1-click filter bar on that page and become the only selectable categories when assigning cards.
                                </p>
                            </div>
                        </div>
                        {hasUnsavedChanges && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-semibold tracking-wide">
                                ● Unsaved Changes
                            </span>
                        )}
                    </div>

                    {/* Page Selector Strip */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-[#1e3a8a]" />
                                Select Showcase Page to Manage Categories:
                            </label>
                            <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
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
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#1e3a8a] text-white shadow-xs font-semibold'
                                                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-200/80'
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                                        <span>{page.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Page Category Management Card */}
                    {loadingPageData ? (
                        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 font-medium text-xs uppercase tracking-wider">
                            Loading categories for {selectedPageSlug}...
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-6 space-y-6">
                            {/* Card Top: Page Info & Action Links */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-stone-900">
                                            {pageDetails?.title || selectedPageSlug}
                                        </h2>
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                                            /{selectedPageSlug}
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1">
                                        {pageCategories.length} Categories Defined &middot; {pageCards.length} Total Cards
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/${selectedPageSlug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-stone-300 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 transition-all shadow-xs"
                                        title="View live page in new tab"
                                    >
                                        <span>Live Page</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    <Link
                                        to={`/admin/pages`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-stone-300 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 transition-all shadow-xs"
                                        title="Open page in Pages Manager"
                                    >
                                        <span>Pages Manager</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Success Notification Banner */}
                            {saveSuccessMsg && (
                                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{saveSuccessMsg}</span>
                                </div>
                            )}

                            {/* Categories List */}
                            <div className="space-y-2.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 block">
                                    Registered Live Categories (Displayed in Order on Live Site):
                                </label>

                                {pageCategories.length === 0 ? (
                                    <div className="p-8 text-center rounded-lg bg-stone-50 border border-dashed border-stone-200 text-stone-400 text-xs font-medium">
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
                                                    className="flex items-center justify-between p-3 rounded-lg bg-stone-50/70 hover:bg-white border border-stone-200 hover:border-stone-300 transition-all group"
                                                >
                                                    {/* Left: Reorder & Name */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {/* Reorder Buttons */}
                                                        <div className="flex flex-col gap-0.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveCategory(idx, 'up')}
                                                                disabled={idx === 0}
                                                                className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveCategory(idx, 'down')}
                                                                disabled={idx === pageCategories.length - 1}
                                                                className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Index Badge */}
                                                        <span className="text-[11px] font-mono font-medium text-stone-400 w-5">
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
                                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] bg-white"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleConfirmRename(idx)}
                                                                    className="px-3 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold cursor-pointer"
                                                                >
                                                                    Done
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingCategoryIndex(null)}
                                                                    className="px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-stone-700 text-xs font-medium cursor-pointer"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2.5 truncate">
                                                                <span className="text-sm font-semibold text-stone-900 truncate">
                                                                    {cat}
                                                                </span>
                                                                {/* Calm neutral chip */}
                                                                <span
                                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                                                                        count > 0
                                                                            ? 'bg-stone-100 text-stone-800 border-stone-200'
                                                                            : 'bg-stone-50 text-stone-500 border-stone-200'
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
                                                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                                                title={`Rename "${cat}"`}
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCategory(idx)}
                                                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
                            <div className="pt-2 border-t border-stone-100">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 block mb-2">
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
                                        className="flex-1 max-w-lg border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] bg-white text-stone-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Category
                                    </button>
                                </div>
                            </div>

                            {/* Single-Stream Isolated Save Bar */}
                            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50 -mx-6 -mb-6 p-4 px-6 rounded-b-xl border-t border-stone-200">
                                <div className="text-xs text-stone-500">
                                    {hasUnsavedChanges ? (
                                        <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                                            ● You have unsaved changes. Click save to apply changes.
                                        </span>
                                    ) : (
                                        <span className="text-stone-500 flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                            All categories are up to date.
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSavePageCategories}
                                    disabled={savingPage || !hasUnsavedChanges}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg transition-all shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
                    <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
                        <div>
                            <h2 className="text-base font-bold text-stone-900">E-Commerce Product Categories</h2>
                            <p className="text-xs text-stone-500 font-medium tracking-wide mt-0.5">
                                {productCategories.length} Classifications for Physical Store Inventory (/shop &amp; /furniture)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openAddProductCat}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> New Product Category
                        </button>
                    </div>

                    {/* Explanatory Guide Banner - Calm #1e293b Container */}
                    <div className="bg-[#1e293b] rounded-xl p-5 text-white shadow-sm border border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <HelpCircle className="w-4 h-4 text-stone-300 shrink-0" />
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                                        How Store Product Categories Work
                                    </h3>
                                    <p className="text-xs text-stone-300 mt-0.5">
                                        Every physical product in the catalog (chairs, desks, lab sets, balls) is tagged with a product category.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide((v) => !v)}
                                className="text-xs font-medium text-stone-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
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
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-200 transition-colors"
                                    >
                                        <span className="font-medium">{opt.label}</span>
                                        <ExternalLink className="w-3 h-3 text-stone-400" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Store Filter Tabs */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-2 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveStoreFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                                activeStoreFilter === 'all'
                                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                                    : 'text-stone-600 hover:bg-stone-100'
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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                                        activeStoreFilter === opt.value
                                            ? 'bg-[#1e3a8a] text-white shadow-xs'
                                            : 'text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    {opt.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-3">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Search product categories..."
                                className="w-full border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] bg-white text-stone-900"
                            />
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingProductCats ? (
                            <div className="col-span-full py-16 text-center font-medium text-stone-400 uppercase tracking-wider text-xs">
                                Loading Product Categories...
                            </div>
                        ) : filteredProductCats.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-stone-400 text-xs font-medium">
                                No product categories found for this selection.
                            </div>
                        ) : (
                            filteredProductCats.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-stone-300 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 shrink-0 border border-stone-200">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-stone-900 text-sm">{cat.name}</h3>
                                            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                                                {cat.slug}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 uppercase tracking-wider">
                                                    {storePageOptions.find((p) => p.value === cat.page)?.label || cat.page}
                                                </span>
                                                <span className="text-[10px] text-stone-400 font-medium">
                                                    &middot; {cat._count?.products ?? 0} product{cat._count?.products === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => openEditProductCat(cat)}
                                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                            title="Edit Category"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteProductCat(cat.id)}
                                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Delete Category"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Product Category Modal */}
                    {showProductModal && (
                        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                                <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-stone-50">
                                    <div>
                                        <h3 className="text-base font-bold text-stone-900">
                                            {editingProductCat.id ? 'Edit Product Category' : 'New Product Category'}
                                        </h3>
                                        <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider mt-0.5">
                                            Physical Store Inventory Classification
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(false)}
                                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                            Category Name
                                        </label>
                                        <input
                                            className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] text-stone-900"
                                            value={editingProductCat.name || ''}
                                            onChange={(e) => setEditingProductCat({ ...editingProductCat, name: e.target.value })}
                                            placeholder="e.g. Ergonomic Chairs, Chemistry Glassware..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                            Slug (URL Identifier)
                                        </label>
                                        <input
                                            className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] text-stone-900"
                                            value={editingProductCat.slug || ''}
                                            onChange={(e) => setEditingProductCat({ ...editingProductCat, slug: e.target.value })}
                                            placeholder="automatic if left blank"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                            Store Section
                                        </label>
                                        <select
                                            className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-medium bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a]"
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
                                <div className="p-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50">
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(false)}
                                        className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveProductCat}
                                        disabled={savingProductCat}
                                        className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
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
                    {/* Guidance Strip - Calm #1e293b Container */}
                    <div className="bg-[#1e293b] rounded-xl p-5 text-white shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-stone-300 shrink-0">
                                <Target className="w-4 h-4 text-stone-300" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white">Master Search Objectives &amp; Hub Categories</h2>
                                <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                                    The single source of truth for the Homepage Search Bar (&quot;Looking For&quot; selector), AI Solutions Finder classification, Hub Page tagging, and Shop Products.
                                </p>
                            </div>
                        </div>
                        {hasUnsavedObjectives && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-semibold tracking-wide">
                                ● Unsaved Changes
                            </span>
                        )}
                    </div>

                    {/* Success Alert */}
                    {objectivesSuccessMsg && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{objectivesSuccessMsg}</span>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                                Categories List
                            </span>
                            <span className="text-[11px] font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-md">
                                {searchObjectives.length} configured
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAddObjective}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add New Category</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveObjectives()}
                                disabled={savingObjectives}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer ${
                                    hasUnsavedObjectives
                                        ? 'bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs'
                                        : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200'
                                } disabled:opacity-50`}
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{savingObjectives ? 'Saving...' : 'Save All Changes'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Categories List */}
                    {loadingObjectives ? (
                        <div className="p-12 text-center text-stone-400 font-medium text-xs bg-white rounded-xl border border-stone-200">
                            Loading search objectives...
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {searchObjectives.map((item, idx) => {
                                const IconComponent = SEARCH_ICON_MAP[item.iconName || 'Target'] || Target;
                                const isAllBaseline = item.id === 'all';
                                const isLive = item.active !== false;

                                return (
                                    <div
                                        key={item.id || idx}
                                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isLive
                                                ? 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                                                : 'bg-stone-50 border-stone-200 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-7 h-7 rounded-md bg-stone-100 text-stone-600 font-mono text-xs flex items-center justify-center shrink-0 border border-stone-200">
                                                #{String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-stone-900 text-sm">
                                                        {item.label}
                                                    </span>
                                                    {item.shortLabel && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                                            Pill: {item.shortLabel}
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
                                                        id: {item.id}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-stone-500 font-mono mt-0.5 truncate">
                                                    Default Route: {item.defaultRoute || '/find-solutions'} • Icon: {item.iconName || 'Target'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                            {/* Live / Hidden Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleObjectiveActive(idx)}
                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    isLive
                                                        ? 'bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200/70'
                                                        : 'bg-stone-200/80 text-stone-600 border border-stone-300 hover:bg-stone-300'
                                                }`}
                                                title="Toggle visibility in search bar and dropdowns"
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-600' : 'bg-stone-400'}`}></span>
                                                <span>{isLive ? 'Live' : 'Hidden'}</span>
                                            </button>

                                            {/* Reorder Up */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveObjective(idx, 'up')}
                                                disabled={idx === 0}
                                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                                                title="Move Up"
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Reorder Down */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveObjective(idx, 'down')}
                                                disabled={idx === searchObjectives.length - 1}
                                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                                                title="Move Down"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditObjective(idx)}
                                                className="p-1.5 text-stone-500 hover:text-[#1e3a8a] hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                                                title="Edit Category Details"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Delete */}
                                            {!isAllBaseline && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteObjective(idx)}
                                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                    title="Delete Category"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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
                        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                                    <div>
                                        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                            <Target className="w-4 h-4 text-[#1e3a8a]" />
                                            {editingObjectiveIndex !== null ? 'Edit Search Objective' : 'Add Search Objective'}
                                        </h3>
                                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                                            Configures how this category appears in the search bar and hub dropdowns.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewObjectiveModal(false)}
                                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                            Category Label (Display Name) *
                                        </label>
                                        <input
                                            className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a]"
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
                                            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                                Category ID (Slug) *
                                            </label>
                                            <input
                                                className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-mono font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a]"
                                                value={objectiveForm.id || ''}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, id: e.target.value })}
                                                placeholder="e.g. smart-campus, sports-infra"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                                Short Label (Pill Text)
                                            </label>
                                            <input
                                                className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a]"
                                                value={objectiveForm.shortLabel || ''}
                                                onChange={(e) => setObjectiveForm({ ...objectiveForm, shortLabel: e.target.value })}
                                                placeholder="e.g. Smart Campus, Sports"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                                Display Icon
                                            </label>
                                            <select
                                                className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-medium bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a]"
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
                                            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                                                Default Target Route
                                            </label>
                                            <input
                                                className="w-full border border-stone-300 rounded-lg px-3.5 py-2 text-xs font-mono font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a]"
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
                                                className="w-4 h-4 rounded text-[#1e3a8a] focus:ring-[#1e3a8a] border-stone-300"
                                            />
                                            <span className="text-xs font-medium text-stone-800">
                                                Active &amp; Visible in Homepage Search &amp; CMS Dropdowns
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewObjectiveModal(false)}
                                        className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveObjectiveModal}
                                        className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
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
