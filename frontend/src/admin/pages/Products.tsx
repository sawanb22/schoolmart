import { useEffect, useState, useCallback, useMemo, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    Package,
    Upload,
    X,
} from 'lucide-react';
import api from '../api/client';
import MediaImageField from '../components/MediaImageField';
import MediaImageListField from '../components/MediaImageListField';
import { resolveMediaUrl } from '../../lib/media-url';
import { cn } from '../../lib/utils';
import { tableStyles } from '../components/ui/tableStyles';
import { AdminPagination } from '../components/ui/AdminPagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SearchInput } from '../components/ui/SearchInput';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

export interface Category {
    id: number;
    name: string;
    slug: string;
    page?: string;
    _count?: { products: number };
}

export interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    active: boolean;
    featured: boolean;
    rating: number;
    reviewCount: number;
    imageUrl?: string;
    description?: string;
    categoryId: number;
    category?: Category;
    sku?: string;
    images?: string;
    specifications?: string;
}

export interface ProductFormData {
    id?: number;
    name: string;
    price: number | '';
    stock: number;
    active: boolean;
    featured: boolean;
    rating: number;
    reviewCount: number;
    description: string;
    imageUrl: string;
    categoryId: number | '';
    sku: string;
    images: string;
    specifications: string;
    category?: Category;
}

export interface StorePageOption {
    value: string;
    label: string;
}

interface SearchObjectiveItem {
    id?: string;
    slug?: string;
    label?: string;
}

interface ApiErrorResponse {
    error?: string;
    message?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: ApiErrorResponse } }).response;
        if (response?.data?.error) return response.data.error;
        if (response?.data?.message) return response.data.message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
}

export const STORE_PAGES_LIST: readonly StorePageOption[] = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'labs', label: 'Labs' },
    { value: 'sports', label: 'Sports' },
    { value: 'tech-infra', label: 'Tech Infrastructure' },
    { value: 'libraries', label: 'Libraries' },
] as const;

export const availableStorePages = STORE_PAGES_LIST;

const PAGE_SIZE = 25;

const DEFAULT_SEARCH_OBJECTIVES: SearchObjectiveItem[] = [
    { id: 'build-new', label: 'Build New Campus / Setup From Scratch' },
    { id: 'upgrade', label: 'Upgrade Existing Campus / Lab / Classroom' },
    { id: 'smart-campus', label: 'Smart Campus & Automation Setup' },
    { id: 'innovation', label: 'Innovation & Research Center / Incubation' },
    { id: 'accreditation', label: 'NAAC / NBA / NIRF Accreditation Readiness' },
    { id: 'admissions', label: 'Student Admissions, Outreach & Marketing' },
];

const EMPTY: ProductFormData = {
    name: '',
    price: '',
    stock: 1,
    active: true,
    featured: false,
    rating: 0,
    reviewCount: 0,
    description: '',
    imageUrl: '',
    categoryId: '',
    sku: '',
    images: '',
    specifications: '',
};

export default function Products() {
    const [searchParams, setSearchParams] = useSearchParams();

    // URL-synchronized query states
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const statusFilter = (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all';
    const categoryFilter = searchParams.get('category') || 'all';
    const searchQuery = searchParams.get('q') || '';
    const [storePageFilter, setStorePageFilter] = useState<string>(searchParams.get('storePage') || 'furniture');

    // Cascading store page state for Add/Edit modal
    const [modalStorePage, setModalStorePage] = useState<string>('furniture');

    // Search input state with debouncing
    const [searchInput, setSearchInput] = useState(searchQuery);

    const [products, setProducts] = useState<Product[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [statusCounts, setStatusCounts] = useState<{ all: number; active: number; inactive: number }>({
        all: 0,
        active: 0,
        inactive: 0,
    });

    const [categories, setCategories] = useState<Category[]>([]);
    const [searchObjectives, setSearchObjectives] = useState<SearchObjectiveItem[]>(DEFAULT_SEARCH_OBJECTIVES);
    const [productObjective, setProductObjective] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ProductFormData>(EMPTY);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        api.get('/content').then(({ data: siteContent }) => {
            if (!alive || !siteContent) return;
            if (siteContent.home_search_objectives) {
                try {
                    const parsed: unknown = typeof siteContent.home_search_objectives === 'string'
                        ? JSON.parse(siteContent.home_search_objectives)
                        : siteContent.home_search_objectives;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSearchObjectives(parsed.map((item: SearchObjectiveItem) => ({
                            id: item.id || item.slug || '',
                            label: item.label || item.id || '',
                        })));
                    }
                } catch (err: unknown) {
                    console.error('Failed to parse search objectives in products:', err);
                }
            }
        }).catch(() => {});
        return () => { alive = false; };
    }, []);

    // Helper to safely update URL search parameters
    const updateParams = useCallback((newParams: Record<string, string | number | undefined>) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            Object.entries(newParams).forEach(([key, val]) => {
                if (
                    val === undefined ||
                    val === '' ||
                    (key === 'page' && Number(val) <= 1) ||
                    (key === 'status' && val === 'all') ||
                    (key === 'category' && val === 'all') ||
                    (key === 'storePage' && val === 'all')
                ) {
                    next.delete(key);
                } else {
                    next.set(key, String(val));
                }
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Keep storePageFilter in sync if URL storePage changes externally
    useEffect(() => {
        const spParam = searchParams.get('storePage');
        if (spParam) {
            setStorePageFilter(spParam);
        }
    }, [searchParams]);

    // Keep local search input in sync if URL q changes externally
    useEffect(() => {
        setSearchInput(searchQuery);
    }, [searchQuery]);

    // Debounce search input changes by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmed = searchInput.trim();
            if (trimmed !== searchQuery) {
                updateParams({ q: trimmed || undefined, page: 1 });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, searchQuery, updateParams]);

    const filteredCategoriesForFilterBar = useMemo<Category[]>(() => {
        if (storePageFilter && storePageFilter !== 'all') {
            return categories.filter((c: Category) => c.page === storePageFilter || (!c.page && storePageFilter === 'furniture'));
        }
        return categories.filter((c: Category) => !c.page || c.page === 'furniture');
    }, [categories, storePageFilter]);

    const fetchCategories = useCallback(async () => {
        try {
            const { data } = await api.get('/products/categories', { params: { _t: Date.now() } });
            if (Array.isArray(data)) setCategories(data);
        } catch (err: unknown) {
            console.error('Failed to load categories:', err);
        }
    }, []);

    const fetchProducts = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setLoadError(null);
        try {
            // Default storePage: 'furniture'
            const params: Record<string, string | number> = {
                page,
                limit: PAGE_SIZE,
                active: statusFilter === 'all' ? 'all' : statusFilter === 'active' ? 'true' : 'false',
                storePage: storePageFilter || 'furniture',
            };
            if (categoryFilter !== 'all') {
                params.category = categoryFilter;
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const { data } = await api.get('/products', { params, signal });
            const list: Product[] = Array.isArray(data?.products)
                ? data.products
                : Array.isArray(data)
                    ? data
                    : [];
            const total = typeof data?.total === 'number' ? data.total : list.length;
            const totalP = typeof data?.totalPages === 'number' ? data.totalPages : (Math.ceil(total / PAGE_SIZE) || 1);

            // Handle jumping to previous page if current page became empty
            if (list.length === 0 && page > 1 && totalP < page) {
                updateParams({ page: totalP });
                return;
            }

            setProducts(list);
            setTotalCount(total);
            setTotalPages(totalP);
            if (data?.counts) {
                setStatusCounts(data.counts);
            }
        } catch (err: unknown) {
            if (err && typeof err === 'object' && ('name' in err || 'code' in err)) {
                const axiosErr = err as { name?: string; code?: string };
                if (axiosErr.name === 'CanceledError' || axiosErr.code === 'ERR_CANCELED') return;
            }
            console.error('Failed to load products in admin:', err);
            setLoadError(getErrorMessage(err, 'Failed to load products. Please check server or retry.'));
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, categoryFilter, searchQuery, storePageFilter, updateParams]);

    useEffect(() => {
        const controller = new AbortController();
        fetchProducts(controller.signal);
        return () => controller.abort();
    }, [fetchProducts]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const openAdd = () => {
        setModalStorePage('furniture');
        const furnitureCats = categories.filter((c: Category) => !modalStorePage || c.page === modalStorePage);
        const defaultCat = furnitureCats[0] || categories[0];
        setEditing({
            ...EMPTY,
            categoryId: defaultCat?.id || '',
            price: '',
            stock: 1,
        });
        setProductObjective('');
        setFormErrors({});
        setShowModal(true);
    };

    const openEdit = (p: Product) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        const pPage = cat?.page || p.category?.page || 'furniture';
        setModalStorePage(pPage);

        // Convert JSON back to user-friendly text for editing
        let imagesText = p.images || '';
        if (imagesText.startsWith('[')) {
            try {
                const parsed = JSON.parse(imagesText);
                if (Array.isArray(parsed)) {
                    imagesText = parsed.join(', ');
                }
            } catch {
                // Keep raw string on parse error
            }
        }
        let specsText = p.specifications || '';
        let extractedObjective = '';
        if (specsText.startsWith('{')) {
            try {
                const obj = JSON.parse(specsText) as Record<string, unknown>;
                if (obj.searchObjective) {
                    extractedObjective = String(obj.searchObjective);
                    delete obj.searchObjective;
                }
                specsText = Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n');
            } catch {
                // Keep raw string on parse error
            }
        } else if (specsText) {
            const lines = specsText.split('\n');
            const remainingLines: string[] = [];
            for (const line of lines) {
                const parts = line.split(':');
                if (parts.length >= 2 && parts[0].trim().toLowerCase() === 'searchobjective') {
                    extractedObjective = parts.slice(1).join(':').trim();
                } else {
                    remainingLines.push(line);
                }
            }
            specsText = remainingLines.join('\n');
        }
        setProductObjective(extractedObjective);
        setEditing({
            ...p,
            stock: p.stock ?? 1,
            price: p.price ?? '',
            sku: p.sku || '',
            images: imagesText,
            specifications: specsText,
            imageUrl: p.imageUrl || '',
            description: p.description || '',
        });
        setFormErrors({});
        setShowModal(true);
    };

    const save = async () => {
        const errors: Record<string, string> = {};
        if (!editing.name || !editing.name.trim()) {
            errors.name = 'Product name is required.';
        }
        if (!editing.categoryId) {
            errors.categoryId = 'Please select a valid category.';
        }
        if (editing.price === undefined || editing.price === null || editing.price === '' || isNaN(Number(editing.price)) || Number(editing.price) <= 0) {
            errors.price = 'Listing price must be a valid number greater than ₹0.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setSaving(true);
        try {
            const fd = new FormData();
            // Process specifications to include searchObjective
            const specObj: Record<string, string> = {};
            const rawSpecs = editing.specifications;
            if (typeof rawSpecs === 'string' && rawSpecs.trim()) {
                if (rawSpecs.trim().startsWith('{')) {
                    try {
                        const parsedObj = JSON.parse(rawSpecs) as Record<string, unknown>;
                        Object.entries(parsedObj).forEach(([k, v]) => {
                            if (v !== undefined && v !== null) {
                                specObj[k] = String(v);
                            }
                        });
                    } catch {
                        // ignore JSON parse error
                    }
                } else {
                    rawSpecs.split('\n').forEach(line => {
                        const parts = line.split(':');
                        if (parts.length >= 2) {
                            const key = parts[0].trim();
                            const value = parts.slice(1).join(':').trim();
                            if (key) specObj[key] = value;
                        }
                    });
                }
            }
            if (productObjective && productObjective.trim()) {
                specObj.searchObjective = productObjective.trim();
            }

            const payload: Record<string, string | number | boolean | undefined> = {
                name: editing.name?.trim(),
                price: Number(editing.price),
                stock: (editing.stock !== undefined && editing.stock !== null && !isNaN(Number(editing.stock)) && Number(editing.stock) > 0) ? Number(editing.stock) : 1,
                active: editing.active,
                featured: editing.featured,
                description: editing.description,
                imageUrl: editing.imageUrl,
                categoryId: editing.categoryId === '' ? undefined : Number(editing.categoryId),
                sku: editing.sku,
                images: editing.images,
                specifications: JSON.stringify(specObj),
            };

            Object.entries(payload).forEach(([k, v]) => {
                if (v !== undefined) {
                    let val: string | number | boolean = v;
                    // Intercept and convert back to JSON for backend
                    if (k === 'images' && typeof v === 'string' && !v.trim().startsWith('[')) {
                        val = JSON.stringify(v.split(',').map(s => s.trim()).filter(Boolean));
                    }
                    fd.append(k, String(val));
                }
            });

            if (editing.id) {
                await api.put(`/products/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                // If creating a product in a different category than currently filtered, switch to show it
                if (categoryFilter !== 'all' && categoryFilter !== String(editing.categoryId)) {
                    updateParams({ category: String(editing.categoryId), page: 1, q: undefined });
                } else {
                    updateParams({ page: 1, q: undefined });
                }
            }
            await fetchProducts();
            fetchCategories();
            setShowModal(false);
        } catch (err: unknown) {
            const errorMsg = getErrorMessage(err, 'Failed to save product. Please review the details and try again.');
            setFormErrors({ general: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    const deleteProduct = async (id: number) => {
        if (!confirm('Deactivate this product? It will be hidden from the public shop but preserved in admin inventory.')) return;
        try {
            await api.delete(`/products/${id}`);
            await fetchProducts();
            fetchCategories();
        } catch (err: unknown) {
            alert(getErrorMessage(err, 'Failed to deactivate product'));
        }
    };

    const restoreProduct = async (id: number) => {
        try {
            await api.patch(`/products/${id}/restore`);
            await fetchProducts();
            fetchCategories();
        } catch (err: unknown) {
            alert(getErrorMessage(err, 'Failed to reactivate product'));
        }
    };

    // Bulk Upload State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkCategory, setBulkCategory] = useState<number | ''>('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [csvFileName, setCsvFileName] = useState('');
    const [csvData, setCsvData] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleCsvFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (!file) {
            setCsvFileName('');
            setCsvData('');
            return;
        }
        const fileName = file.name ?? '';
        if (!fileName.toLowerCase().endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }
        setCsvFileName(fileName);
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setCsvData(reader.result);
            } else {
                alert('Unable to read CSV file. Please try again.');
            }
        };
        reader.onerror = () => {
            alert('Unable to read CSV file. Please try again.');
        };
        reader.readAsText(file);
    };

    const fetchCsvFromUrl = async () => {
        if (!sheetUrl.trim()) return alert('Enter a URL first');
        setUploading(true);
        try {
            const axios = (await import('axios')).default;
            const { data } = await axios.get(sheetUrl);
            setCsvData(data);
        } catch {
            alert('Failed to fetch data. Ensure it is Published to Web as CSV or the URL is a direct CSV file.');
        } finally {
            setUploading(false);
        }
    };

    const handleBulkUpload = async () => {
        if (!csvData.trim()) return alert('Please upload a CSV file, paste raw CSV data, or provide a CSV link');
        setUploading(true);
        try {
            const trimmedData = csvData.trim();
            if (trimmedData.startsWith('<!DOCTYPE html>') || trimmedData.startsWith('<html')) {
                setUploading(false);
                return alert('ERROR: The loaded data is an HTML webpage, not raw CSV text. Please ensure you share using the correct /export?format=csv Link or choose "CSV" when publishing.');
            }

            // Filter out empty rows (like leading commas ',,,,,') that crash column builders
            const lines = trimmedData.split('\n').filter(row => row.replace(/,/g, '').trim() !== '');
            if (lines.length === 0) return alert('No valid rows found inside data.');

            const headers = String(lines[0] ?? '').split(',').map((rawHeader) => {
                const clean = String(rawHeader ?? '').trim().replace(/^"|"$/g, '').replace(/\s+/g, '').toLowerCase();
                if (!clean) return '';
                // Normalize common CSV header variants to backend keys
                if (clean === 'categoryslug' || clean === 'category_slug' || clean === 'category') return 'categorySlug';
                if (clean === 'imageurl' || clean === 'image_url') return 'imageUrl';
                if (clean === 'specications' || clean === 'specification') return 'specifications';
                if (clean === 'product_name' || clean === 'productname' || clean === 'name') return 'name';
                if (clean === 'product_id' || clean === 'productid' || clean === 'id') return 'id';
                if (clean === 'stock_quantity' || clean === 'stockqty' || clean === 'stock') return 'stock';
                if (clean === 'price' || clean === 'listing_price') return 'price';
                if (clean === 'sku') return 'sku';
                return clean;
            }).filter(Boolean);

            if (headers.length === 0) {
                setUploading(false);
                return alert('CSV header row is empty or invalid. Please upload a valid CSV.');
            }

            const productsData = lines.slice(1).map((line) => {
                // Regex to split by comma ONLY if it is not inside double quotes
                const values = String(line ?? '').split(/,(?=(?:(?:[^"]*"){2})*[^\"]*$)/).map((value) => String(value ?? '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                const p: Record<string, string> = {};
                headers.forEach((h, idx) => {
                    if (!h) return;
                    let val = values[idx] ?? '';
                    // If CSV provided a human-readable category name, convert to slug expected by backend
                    if (h === 'categorySlug') {
                        const raw = String(val || '').trim();
                        const slugified = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        // If we have loaded categories, prefer matching by name or slug to ensure correct mapping
                        const matched = categories.find(c => c.slug === slugified || c.name.toLowerCase() === raw.toLowerCase());
                        val = matched ? matched.slug : slugified;
                    }
                    // Coerce numeric fields where appropriate (keep as strings for the server to parse if needed)
                    p[h] = val;
                });
                return p;
            });

            await api.post('/products/bulk', {
                products: productsData,
                categoryId: bulkCategory || undefined,
            });

            alert('Bulk upload successful!');
            fetchProducts();
            setShowBulkModal(false);
            setCsvData('');
        } catch (err: unknown) {
            alert(getErrorMessage(err, 'Bulk upload failed. Check CSV format.'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Product Inventory"
                subtitle={`${statusCounts.all} Items cataloged across store departments`}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setShowBulkModal(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-2xs transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Bulk Upload</span>
                        </button>
                        <button
                            type="button"
                            onClick={openAdd}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#172554] shadow-2xs transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add New Product</span>
                        </button>
                    </>
                }
            />

            {/* Search & Filters Bar */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:max-w-3xl flex-wrap">
                    <SearchInput
                        value={searchInput}
                        onChange={setSearchInput}
                        placeholder="Search by name, SKU, category..."
                        className="w-full sm:w-64"
                    />

                    {/* Store Page Filter */}
                    <select
                        value={storePageFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStorePageFilter(val);
                            updateParams({
                                storePage: val === 'all' ? undefined : val,
                                category: undefined,
                                page: 1,
                            });
                        }}
                        aria-label="Filter products by store page"
                        className="w-full sm:w-auto shrink-0 border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all cursor-pointer shadow-2xs"
                    >
                        <option value="all">All Store Pages</option>
                        {availableStorePages.map((pageOpt) => (
                            <option key={pageOpt.value} value={pageOpt.value}>
                                {pageOpt.label}
                            </option>
                        ))}
                    </select>

                    {/* Subcategory Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => updateParams({ category: e.target.value === 'all' ? undefined : e.target.value, page: 1 })}
                        aria-label="Filter products by subcategory"
                        className="w-full sm:w-auto shrink-0 border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all cursor-pointer shadow-2xs"
                    >
                        <option value="all">
                            All Subcategories ({statusCounts.all})
                        </option>
                        {filteredCategoriesForFilterBar.map((c: Category) => (
                            <option key={c.id} value={String(c.id)}>
                                {c.name} {typeof c._count?.products === 'number' ? `(${c._count.products})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Segmented Tabs */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg self-start md:self-auto shrink-0">
                    {(['all', 'active', 'inactive'] as const).map((tab) => {
                        const count = tab === 'all'
                            ? statusCounts.all
                            : tab === 'active'
                                ? statusCounts.active
                                : statusCounts.inactive;
                        const isCurrent = statusFilter === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => updateParams({ status: tab, page: 1 })}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all flex items-center gap-1.5 select-none',
                                    isCurrent
                                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                                        : 'text-stone-500 hover:text-stone-800'
                                )}
                            >
                                <span>{tab === 'inactive' ? 'Draft' : tab}</span>
                                <span className={cn(
                                    'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                                    isCurrent ? 'bg-stone-100 text-stone-800' : 'bg-stone-200/70 text-stone-600'
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Products Table Card */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>ID</th>
                                <th className={tableStyles.th}>Image</th>
                                <th className={tableStyles.th}>Name / Title</th>
                                <th className={tableStyles.th}>Store Page</th>
                                <th className={tableStyles.th}>Subcategory</th>
                                <th className={tableStyles.th}>Price</th>
                                <th className={tableStyles.th}>Stock / Status</th>
                                <th className={cn(tableStyles.th, 'text-right')}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-8" /></td>
                                        <td className={tableStyles.td}><div className="w-10 h-10 rounded-lg bg-stone-100" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-36 mb-1" /><div className="h-3 bg-stone-50 rounded w-20" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-20" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-24" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-16" /></td>
                                        <td className={tableStyles.td}><div className="h-5 bg-stone-100 rounded w-16" /></td>
                                        <td className={cn(tableStyles.td, 'text-right')}><div className="h-7 bg-stone-100 rounded-lg w-16 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center">
                                        <div className="max-w-md mx-auto space-y-3">
                                            <p className="text-sm font-medium text-red-600">{loadError}</p>
                                            <button
                                                type="button"
                                                onClick={() => fetchProducts()}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Retry Loading</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-4">
                                        <EmptyState
                                            title="No products match your filters"
                                            description={searchQuery ? `No products found for "${searchQuery}". Try adjusting your search query or filters.` : 'No products available for the selected criteria.'}
                                            actionLabel={searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || storePageFilter !== 'furniture' ? 'Clear Filters' : undefined}
                                            onAction={searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || storePageFilter !== 'furniture' ? () => {
                                                setSearchInput('');
                                                setStorePageFilter('furniture');
                                                updateParams({ q: undefined, category: undefined, status: undefined, storePage: undefined, page: 1 });
                                            } : undefined}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                products.map((p) => {
                                    const mediaUrl = resolveMediaUrl(p.imageUrl);
                                    const storePageLabel = p.category?.page
                                        ? availableStorePages.find(sp => sp.value === p.category?.page)?.label || p.category.page
                                        : 'Furniture';
                                    return (
                                        <tr key={p.id} className={tableStyles.tr}>
                                            {/* 1. ID */}
                                            <td className={tableStyles.td}>
                                                <span className="font-mono text-xs text-stone-500">#{p.id}</span>
                                            </td>

                                            {/* 2. Image */}
                                            <td className={tableStyles.td}>
                                                <div className="w-11 h-11 rounded-lg overflow-hidden border border-stone-200/80 bg-stone-50 flex items-center justify-center shrink-0">
                                                    {mediaUrl ? (
                                                        <img
                                                            src={mediaUrl}
                                                            alt={p.name}
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-stone-400" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* 3. Name / Title */}
                                            <td className={tableStyles.td}>
                                                <div className="font-medium text-stone-900 line-clamp-1">{p.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {p.sku && (
                                                        <span className="font-mono text-[10px] text-stone-400 uppercase">{p.sku}</span>
                                                    )}
                                                    {p.featured && (
                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                                            Featured
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 4. Store Page */}
                                            <td className={tableStyles.td}>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-700">
                                                    {storePageLabel}
                                                </span>
                                            </td>

                                            {/* 5. Subcategory */}
                                            <td className={tableStyles.td}>
                                                <span className="text-xs font-medium text-stone-600">
                                                    {p.category?.name || 'Unassigned'}
                                                </span>
                                            </td>

                                            {/* 6. Price */}
                                            <td className={tableStyles.td}>
                                                <span className="font-semibold text-stone-900">
                                                    ₹{p.price.toLocaleString('en-IN')}
                                                </span>
                                            </td>

                                            {/* 7. Stock / Status */}
                                            <td className={tableStyles.td}>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <StatusBadge status={p.active ? 'active' : 'draft'} />
                                                    <StatusBadge
                                                        status={p.stock > 0 ? 'active' : 'inactive'}
                                                        label={p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                                    />
                                                </div>
                                            </td>

                                            {/* 8. Actions */}
                                            <td className={cn(tableStyles.td, 'text-right')}>
                                                <div className="inline-flex items-center gap-1 justify-end">
                                                    <button
                                                        type="button"
                                                        title="Edit product"
                                                        onClick={() => openEdit(p)}
                                                        className={tableStyles.actionBtn}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    {p.active ? (
                                                        <button
                                                            type="button"
                                                            title="Deactivate product"
                                                            onClick={() => deleteProduct(p.id)}
                                                            className={cn(tableStyles.actionBtn, 'hover:text-red-600 hover:bg-red-50')}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            title="Reactivate product"
                                                            onClick={() => restoreProduct(p.id)}
                                                            className={cn(tableStyles.actionBtn, 'hover:text-emerald-600 hover:bg-emerald-50')}
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Admin Pagination */}
                <AdminPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={(newPage) => updateParams({ page: newPage })}
                />
            </div>

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50/70">
                            <div>
                                <h2 className="text-lg font-bold text-stone-900">Bulk Load Products</h2>
                                <p className="text-xs text-stone-500 mt-0.5">CSV Data Importer</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">1. Target Category (Optional Override)</label>
                                <select
                                    className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] bg-white font-medium text-stone-800"
                                    value={bulkCategory}
                                    onChange={(e) => setBulkCategory(Number(e.target.value) || '')}
                                >
                                    <option value="">Use categorySlug from CSV</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-stone-500">If you select a category here, all products in the CSV will be assigned to it.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">2. Load Data from Source</label>
                                <div className="grid gap-4">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-medium text-stone-600">Upload CSV file</label>
                                        <input
                                            type="file"
                                            accept=".csv,text/csv"
                                            className="block w-full text-xs text-stone-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 cursor-pointer"
                                            onChange={handleCsvFileChange}
                                        />
                                        {csvFileName && <p className="text-[11px] text-stone-500">Loaded file: {csvFileName}</p>}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-medium text-stone-600">Or paste a CSV link</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                placeholder="Paste Google Sheet 'Publish to Web' CSV link or direct CSV URL"
                                                className="flex-1 min-w-0 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] font-medium text-stone-800 placeholder:text-stone-400"
                                                value={sheetUrl}
                                                onChange={(e) => setSheetUrl(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={fetchCsvFromUrl}
                                                disabled={uploading}
                                                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
                                            >
                                                Fetch
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-stone-400">If using a Google Sheet, publish it to web as CSV and paste the URL here.</p>
                                    </div>

                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-medium text-stone-600">Or paste raw CSV text</label>
                                        <textarea
                                            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] h-48 font-mono text-stone-800"
                                            value={csvData}
                                            onChange={(e) => setCsvData(e.target.value)}
                                            placeholder="Paste CSV text here if you do not want to upload a file or use a link"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-stone-200 flex justify-end gap-2.5 bg-stone-50/70">
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkUpload}
                                disabled={uploading}
                                className="px-5 py-2 bg-[#1e3a8a] text-white text-xs font-semibold rounded-lg hover:bg-[#172554] transition-colors shadow-2xs disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Start Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50/70">
                            <div>
                                <h2 className="text-lg font-bold text-stone-900">{editing.id ? 'Edit Product Details' : 'Onboard New Product'}</h2>
                                <p className="text-xs text-stone-500 mt-0.5">Catalog Management System</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
                            {formErrors.general && (
                                <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center justify-between">
                                    <span>{formErrors.general}</span>
                                    <button type="button" onClick={() => setFormErrors((prev) => { const next = { ...prev }; delete next.general; return next; })}>
                                        <X className="w-4 h-4 text-red-400 hover:text-red-700 transition-colors" />
                                    </button>
                                </div>
                            )}

                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Product Name *</label>
                                <input
                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all font-medium ${
                                        formErrors.name
                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20'
                                            : 'border-stone-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/20'
                                    }`}
                                    value={editing.name || ''}
                                    onChange={(e) => {
                                        setEditing({ ...editing, name: e.target.value });
                                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    placeholder="e.g. Ergonomic Teacher Chair"
                                />
                                {formErrors.name && <p className="text-[11px] font-semibold text-red-500">{formErrors.name}</p>}
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Product Narrative</label>
                                <textarea
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all resize-none h-20 font-medium text-stone-800"
                                    value={editing.description || ''}
                                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                    placeholder="Product description and key specifications..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Listing Price (₹) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all font-semibold text-stone-900 ${
                                        formErrors.price
                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20'
                                            : 'border-stone-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/20'
                                    }`}
                                    value={editing.price ?? ''}
                                    onChange={(e) => {
                                        setEditing({ ...editing, price: e.target.value === '' ? '' : Number(e.target.value) });
                                        if (formErrors.price) setFormErrors(prev => ({ ...prev, price: '' }));
                                    }}
                                    placeholder="e.g. 5500"
                                />
                                {formErrors.price && <p className="text-[11px] font-semibold text-red-500">{formErrors.price}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Inventory Stock Count</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-semibold text-stone-900"
                                    value={editing.stock ?? 1}
                                    onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) || 0 })}
                                    placeholder="1"
                                />
                            </div>

                            {/* Target Store Page Dropdown */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Target Store Page *</label>
                                <select
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all bg-white font-medium text-stone-800"
                                    value={modalStorePage}
                                    onChange={(e) => {
                                        const newPage = e.target.value;
                                        setModalStorePage(newPage);
                                        const matchingCats = categories.filter((c: Category) => !newPage || c.page === newPage);
                                        setEditing((prev) => ({
                                            ...prev,
                                            categoryId: matchingCats[0]?.id || '',
                                        }));
                                        if (formErrors.categoryId) {
                                            setFormErrors((prev) => ({ ...prev, categoryId: '' }));
                                        }
                                    }}
                                >
                                    <option value="">Select a Store Page</option>
                                    {availableStorePages.map((pageOpt) => (
                                        <option key={pageOpt.value} value={pageOpt.value}>
                                            {pageOpt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subcategory Classification Dropdown */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Subcategory Classification *</label>
                                <select
                                    disabled={!modalStorePage}
                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all bg-white font-medium text-stone-800 disabled:opacity-50 disabled:bg-stone-50 disabled:cursor-not-allowed ${
                                        formErrors.categoryId
                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                                            : 'border-stone-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/20'
                                    }`}
                                    value={editing.categoryId || ''}
                                    onChange={(e) => {
                                        setEditing({ ...editing, categoryId: Number(e.target.value) });
                                        if (formErrors.categoryId) setFormErrors((prev) => ({ ...prev, categoryId: '' }));
                                    }}
                                >
                                    <option value="">Select a Category</option>
                                    {categories
                                        .filter((c: Category) => !modalStorePage || c.page === modalStorePage)
                                        .map((c: Category) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                </select>
                                {formErrors.categoryId && <p className="text-[11px] font-semibold text-red-500">{formErrors.categoryId}</p>}
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">AI Solutions Objective / Category</label>
                                <select
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all bg-white font-medium text-stone-800"
                                    value={productObjective}
                                    onChange={(e) => setProductObjective(e.target.value)}
                                >
                                    <option value="">-- None (General Catalog) --</option>
                                    {searchObjectives.map((obj) => (
                                        <option key={obj.id} value={obj.id}>
                                            {obj.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-stone-400">Maps product into AI Solutions Finder &amp; category search</p>
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">SKU / Product Code (Optional)</label>
                                <input
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-mono uppercase text-stone-800"
                                    value={editing.sku || ''}
                                    onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                                    placeholder="Auto-generated if blank (e.g. CM-SEAT-01)"
                                />
                                <p className="text-[10px] text-stone-400">Leave blank to auto-generate from name.</p>
                            </div>

                            <MediaImageField
                                label="Cover Image"
                                value={editing.imageUrl || ''}
                                onChange={value => setEditing({ ...editing, imageUrl: value })}
                                previewClassName="h-32 rounded-xl"
                            />

                            <MediaImageListField
                                label="Gallery Images"
                                value={editing.images || ''}
                                onChange={value => setEditing({ ...editing, images: value })}
                            />

                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Technical Specifications (Line-separated Key: Value pairs)</label>
                                <textarea
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 h-24 font-mono text-stone-800"
                                    value={editing.specifications || ''}
                                    onChange={(e) => setEditing({ ...editing, specifications: e.target.value })}
                                    placeholder={"Frame: Steel\nHeight: 30 in\nColor: Blue"}
                                />
                            </div>

                            <div className="col-span-2 flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-stone-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                                        checked={!!editing.active}
                                        onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                                    />
                                    <span className="text-xs font-medium text-stone-700">Visible on storefront</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-stone-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                                        checked={!!editing.featured}
                                        onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                                    />
                                    <span className="text-xs font-medium text-stone-700">Show in Featured Sections</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 p-6 border-t border-stone-200 bg-stone-50/70">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving}
                                className="px-5 py-2 bg-[#1e3a8a] text-white text-xs font-semibold rounded-lg hover:bg-[#172554] transition-colors shadow-2xs active:scale-98 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Sync with Database'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
