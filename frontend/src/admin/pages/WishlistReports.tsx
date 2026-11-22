import { useEffect, useMemo, useState } from 'react';
import {
    Download,
    Mail,
    Phone,
    Building2,
    Heart,
    Users,
    TrendingUp,
    ShoppingBag,
    Calendar,
} from 'lucide-react';
import api from '../api/client';
import { resolveMediaUrl } from '../../lib/media-url';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SearchInput } from '../components/ui/SearchInput';
import { AdminPagination } from '../components/ui/AdminPagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export interface WishlistItem {
    id: number;
    createdAt: string;
    quantity?: number;
    designTitle?: string | null;
    designImage?: string | null;
    pageSlug?: string | null;
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string | null;
        institution?: string | null;
    };
    product?: {
        id?: number;
        name: string;
        price?: number | null;
        imageUrl?: string | null;
        category?: { name: string } | null;
    } | null;
}

interface WishlistGroupItem {
    id: number;
    title: string;
    category: string;
    quantity: number;
    price: number | null;
    image: string | null;
    createdAt: string;
}

interface UserGroup {
    user: WishlistItem['user'];
    items: WishlistGroupItem[];
    rawItems: WishlistItem[];
    totalQuantity: number;
    totalValue: number;
}

const PAGE_SIZE = 8;

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function escapeCsvValue(val: unknown): string {
    const str = String(val ?? '');
    const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${sanitized.replace(/"/g, '""')}"`;
}

export default function WishlistReports() {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const fetchReport = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const { data } = await api.get('/admin/wishlist-report');
            const list: WishlistItem[] = Array.isArray(data) ? data : (data.items ?? []);
            setItems(list);
        } catch (err: unknown) {
            let errorMsg = 'Failed to load wishlist report. Please try again.';
            if (err && typeof err === 'object' && 'response' in err) {
                const res = (err as { response?: { data?: { error?: string; message?: string } } }).response;
                if (res?.data?.error) errorMsg = res.data.error;
                else if (res?.data?.message) errorMsg = res.data.message;
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }
            setLoadError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const groups: UserGroup[] = useMemo(() => {
        const byUser = new Map<number, UserGroup>();
        for (const item of items) {
            const title = item.product?.name ?? item.designTitle ?? 'Untitled item';
            const category = item.product?.category?.name ?? item.pageSlug ?? 'General';
            const image = resolveMediaUrl(item.product?.imageUrl ?? item.designImage ?? '') || null;
            const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
            const rawPrice = item.product?.price;
            const price = typeof rawPrice === 'number' ? rawPrice : (rawPrice ? Number(rawPrice) : null);

            if (!byUser.has(item.user.id)) {
                byUser.set(item.user.id, {
                    user: item.user,
                    items: [],
                    rawItems: [],
                    totalQuantity: 0,
                    totalValue: 0,
                });
            }
            const group = byUser.get(item.user.id)!;
            group.items.push({
                id: item.id,
                title,
                category,
                quantity,
                price,
                image,
                createdAt: item.createdAt,
            });
            group.rawItems.push(item);
            group.totalQuantity += quantity;
            if (price !== null && !isNaN(price)) {
                group.totalValue += price * quantity;
            }
        }
        return Array.from(byUser.values());
    }, [items]);

    const filteredGroups = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return groups;
        return groups.filter((g) => {
            const nameMatch = g.user.name.toLowerCase().includes(query);
            const emailMatch = g.user.email.toLowerCase().includes(query);
            const instMatch = Boolean(g.user.institution && g.user.institution.toLowerCase().includes(query));
            const phoneMatch = Boolean(g.user.phone && g.user.phone.toLowerCase().includes(query));
            const itemMatch = g.items.some(
                (it) => it.title.toLowerCase().includes(query) || it.category.toLowerCase().includes(query)
            );
            return nameMatch || emailMatch || instMatch || phoneMatch || itemMatch;
        });
    }, [groups, search]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const paginatedGroups = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredGroups.slice(start, start + PAGE_SIZE);
    }, [filteredGroups, page]);

    // Summary statistics
    const totalWishlistItems = items.length;
    const totalUnitsCount = useMemo(
        () => items.reduce((sum, item) => sum + (item.quantity && item.quantity > 0 ? item.quantity : 1), 0),
        [items]
    );
    const uniqueCustomersCount = groups.length;
    const uniqueInstitutionsCount = useMemo(() => {
        const institutions = new Set<string>();
        for (const g of groups) {
            if (g.user.institution && g.user.institution.trim()) {
                institutions.add(g.user.institution.trim().toLowerCase());
            }
        }
        return institutions.size;
    }, [groups]);

    const totalPotentialValue = useMemo(() => {
        return items.reduce((sum, item) => {
            const rawPrice = item.product?.price;
            const price = typeof rawPrice === 'number' ? rawPrice : (rawPrice ? Number(rawPrice) : 0);
            const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
            return sum + (price * qty);
        }, 0);
    }, [items]);

    const downloadCsv = (itemsToExport: WishlistItem[], filenamePrefix = 'wishlist-report') => {
        const headers = [
            'Customer Name',
            'Email',
            'Phone',
            'Institution',
            'Product Title',
            'Price (INR)',
            'Quantity',
            'Date Added',
        ];

        const rows = itemsToExport.map((item) => {
            const customerName = item.user?.name ?? '';
            const email = item.user?.email ?? '';
            const phone = item.user?.phone ?? '';
            const institution = item.user?.institution ?? '';
            const title = item.product?.name ?? item.designTitle ?? 'Untitled item';
            const rawPrice = item.product?.price;
            const price = typeof rawPrice === 'number' ? rawPrice : (rawPrice ? Number(rawPrice) : 0);
            const priceStr = price > 0 ? price.toFixed(2) : 'Quote on request';
            const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
            const dateStr = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : '';

            return [
                escapeCsvValue(customerName),
                escapeCsvValue(email),
                escapeCsvValue(phone),
                escapeCsvValue(institution),
                escapeCsvValue(title),
                escapeCsvValue(priceStr),
                escapeCsvValue(qty),
                escapeCsvValue(dateStr),
            ].join(',');
        });

        const csvContent = [headers.map(escapeCsvValue).join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <PageHeader
                title="Wishlist Reports"
                subtitle="Track institutional customer interest, saved procurement lists, and prepare quotations."
                actions={
                    <button
                        type="button"
                        onClick={() => downloadCsv(items, 'wishlist-report')}
                        disabled={loading || items.length === 0}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#172554] shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                }
            />

            {/* Top Summary StatCards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Total Wishlist Items"
                    value={totalWishlistItems}
                    subtitle={`${totalUnitsCount} total units saved across accounts`}
                    icon={Heart}
                />
                <StatCard
                    title="Unique Institutions / Customers"
                    value={uniqueCustomersCount}
                    subtitle={
                        uniqueInstitutionsCount > 0
                            ? `${uniqueInstitutionsCount} institutions represented`
                            : 'Active institutional customer accounts'
                    }
                    icon={Users}
                />
                <StatCard
                    title="Potential Procurement Value"
                    value={`₹${totalPotentialValue.toLocaleString('en-IN')}`}
                    subtitle="Estimated pipeline demand from wishlist items"
                    icon={TrendingUp}
                />
            </div>

            {/* Error Banner */}
            {loadError && (
                <ErrorBanner
                    message={loadError}
                    retry={fetchReport}
                    onDismiss={() => setLoadError(null)}
                />
            )}

            {/* Search Filter Bar */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search by customer, email, institution, or item..."
                    className="w-full sm:w-96"
                />
                <div className="text-xs text-stone-500 font-medium">
                    Showing <span className="font-semibold text-stone-900">{filteredGroups.length}</span> customer {filteredGroups.length === 1 ? 'account' : 'accounts'}
                </div>
            </div>

            {/* Customer Wishlist Cards List */}
            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2">
                                    <div className="h-5 bg-stone-200 rounded w-48" />
                                    <div className="h-3.5 bg-stone-100 rounded w-72" />
                                </div>
                                <div className="h-8 bg-stone-100 rounded w-32" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-stone-100">
                                <div className="h-20 bg-stone-50 rounded-lg border border-stone-100" />
                                <div className="h-20 bg-stone-50 rounded-lg border border-stone-100" />
                                <div className="h-20 bg-stone-50 rounded-lg border border-stone-100" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredGroups.length === 0 ? (
                <EmptyState
                    icon={Heart}
                    title={search ? 'No matching wishlists found' : 'No wishlist activity yet'}
                    description={
                        search
                            ? `No customer or institution wishlists match "${search}". Try adjusting your search query.`
                            : 'When institutional buyers save products or custom kits to their wishlists, they will appear here.'
                    }
                    actionLabel={search ? 'Clear Search' : undefined}
                    onAction={search ? () => handleSearchChange('') : undefined}
                />
            ) : (
                <div className="space-y-4">
                    {paginatedGroups.map((group) => (
                        <div
                            key={group.user.id}
                            className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs transition-all hover:border-stone-300"
                        >
                            {/* Card Header: Customer Info & Export Button */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-100 font-bold flex items-center justify-center text-sm shrink-0 uppercase shadow-2xs">
                                        {group.user.name.charAt(0) || 'U'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-stone-900 text-sm sm:text-base">
                                                {group.user.name}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#1e3a8a] border border-blue-200/60">
                                                <Heart className="w-3 h-3 fill-current text-[#1e3a8a]" />
                                                <span>
                                                    {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                                                </span>
                                            </span>
                                            {group.totalValue > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                                                    Est. ₹{group.totalValue.toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500 mt-1.5">
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                <span className="truncate">{group.user.email}</span>
                                            </span>
                                            {group.user.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span>{group.user.phone}</span>
                                                </span>
                                            )}
                                            {group.user.institution && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span className="truncate font-medium text-stone-600">
                                                        {group.user.institution}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadCsv(
                                            group.rawItems,
                                            `wishlist-${group.user.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
                                        )
                                    }
                                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors shadow-2xs"
                                    title={`Download CSV for ${group.user.name}`}
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Lead (CSV)</span>
                                </button>
                            </div>

                            {/* Saved Wishlist Items Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-stone-100">
                                {group.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-start gap-3 rounded-lg border border-stone-200/70 bg-stone-50/60 p-3 hover:bg-stone-50 transition-colors"
                                    >
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0 bg-white"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-stone-200/70 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                                <ShoppingBag className="w-5 h-5 text-stone-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-1.5">
                                                <p
                                                    className="text-xs font-semibold text-stone-900 truncate"
                                                    title={item.title}
                                                >
                                                    {item.title}
                                                </p>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-stone-200 text-stone-700 shrink-0 shadow-2xs">
                                                    {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex items-baseline justify-between gap-1">
                                                <span className="text-xs font-bold text-[#1e3a8a]">
                                                    {item.price !== null && item.price > 0
                                                        ? `₹${item.price.toLocaleString('en-IN')}`
                                                        : 'Quote on request'}
                                                </span>
                                                <span
                                                    className="text-[10px] text-stone-400 truncate max-w-[100px]"
                                                    title={item.category}
                                                >
                                                    {item.category}
                                                </span>
                                            </div>

                                            <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-stone-300 shrink-0" />
                                                <span>Added {formatDate(item.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
                        <AdminPagination
                            page={page}
                            totalPages={totalPages}
                            totalItems={filteredGroups.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={(newPage) => setPage(newPage)}
                            className="border-t-0"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
