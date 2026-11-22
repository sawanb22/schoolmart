import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Mail,
    Phone,
    Building2,
    Download,
    BriefcaseBusiness,
    Check,
    CheckCheck,
    Eye,
    X,
    FileSpreadsheet,
    RotateCcw,
    Filter,
    Calendar,
    Inbox,
    Loader2,
} from 'lucide-react';
import api from '../api/client';
import { cn } from '../../lib/utils';
import { tableStyles } from '../components/ui/tableStyles';
import { AdminPagination } from '../components/ui/AdminPagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SearchInput } from '../components/ui/SearchInput';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export type EnquiryType = 'quote' | 'contact' | 'jobs';

export interface EnquiryItem {
    id: number;
    type: EnquiryType;
    name: string;
    email: string;
    phone?: string | null;
    institution?: string | null;
    subject?: string | null;
    role?: string | null;
    message: string;
    items?: string | null;
    resumeFilename?: string | null;
    resumeOriginalName?: string | null;
    read: boolean;
    createdAt: string;
}

interface EnquiriesApiResponse {
    items: EnquiryItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface OverviewCounts {
    quotes: { total: number; unread: number };
    contacts: { total: number; unread: number };
    jobs: { total: number; unread: number };
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

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

const PAGE_SIZE = 20;

export default function Enquiries() {
    const [searchParams, setSearchParams] = useSearchParams();

    // URL parameter synchronization
    const rawType = searchParams.get('type');
    const activeTab: EnquiryType =
        rawType === 'contact' || rawType === 'jobs' ? rawType : 'quote';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const unreadOnly =
        searchParams.get('unreadOnly') === 'true' || searchParams.get('unread') === 'true';

    // State
    const [items, setItems] = useState<EnquiryItem[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Overview counters for tabs and stat cards
    const [overviewCounts, setOverviewCounts] = useState<OverviewCounts>({
        quotes: { total: 0, unread: 0 },
        contacts: { total: 0, unread: 0 },
        jobs: { total: 0, unread: 0 },
    });

    // Detail modal & action loading state
    const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryItem | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [markingReadId, setMarkingReadId] = useState<number | null>(null);

    // Fetch tab summary counts from backend
    const fetchOverviewCounts = useCallback(async () => {
        try {
            const { data } = await api.get<{
                contacts?: Array<{
                    id: number;
                    read: boolean;
                    resumeOriginalName?: string | null;
                    resumeFilename?: string | null;
                    role?: string | null;
                }>;
                quotes?: Array<{
                    id: number;
                    read: boolean;
                }>;
            }>('/admin/enquiries');

            if (data && Array.isArray(data.contacts) && Array.isArray(data.quotes)) {
                const quotesList = data.quotes;
                const contactsList = data.contacts;
                const jobsList = contactsList.filter(
                    (c) => Boolean(c.resumeOriginalName || c.resumeFilename || c.role)
                );
                const generalList = contactsList.filter(
                    (c) => !c.resumeOriginalName && !c.resumeFilename && !c.role
                );

                setOverviewCounts({
                    quotes: {
                        total: quotesList.length,
                        unread: quotesList.filter((q) => !q.read).length,
                    },
                    contacts: {
                        total: generalList.length,
                        unread: generalList.filter((c) => !c.read).length,
                    },
                    jobs: {
                        total: jobsList.length,
                        unread: jobsList.filter((j) => !j.read).length,
                    },
                });
            }
        } catch (err: unknown) {
            console.warn('Failed to load enquiry counts:', err);
        }
    }, []);

    // Main paginated enquiry fetch
    const fetchEnquiries = useCallback(async () => {
        setLoading(true);
        setPageError(null);
        try {
            const params: Record<string, string | number> = {
                page,
                limit: PAGE_SIZE,
                type: activeTab,
            };
            if (unreadOnly) {
                params.unreadOnly = 'true';
            }

            const { data } = await api.get<EnquiriesApiResponse>('/admin/enquiries', { params });
            const fetchedItems = Array.isArray(data?.items) ? data.items : [];
            setItems(fetchedItems);
            setTotalItems(data?.total ?? 0);
            setTotalPages(Math.max(1, data?.totalPages ?? 1));
        } catch (err: unknown) {
            console.error('Failed to fetch enquiries:', err);
            setPageError(getErrorMessage(err, 'Failed to fetch enquiries. Please try again.'));
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, unreadOnly]);

    useEffect(() => {
        fetchEnquiries();
    }, [fetchEnquiries]);

    useEffect(() => {
        fetchOverviewCounts();
    }, [fetchOverviewCounts]);

    // Handle escape key to dismiss detail modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedEnquiry(null);
            }
        };
        if (selectedEnquiry) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [selectedEnquiry]);

    // URL parameter helpers
    const handleTabChange = (newTab: EnquiryType) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('type', newTab);
            next.set('page', '1');
            return next;
        });
    };

    const handlePageChange = (newPage: number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('page', String(newPage));
            return next;
        });
    };

    const handleUnreadOnlyToggle = () => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (unreadOnly) {
                next.delete('unread');
                next.delete('unreadOnly');
            } else {
                next.set('unreadOnly', 'true');
            }
            next.set('page', '1');
            return next;
        });
    };

    // 1-Click mark as read with instant optimistic UI update
    const markRead = async (type: EnquiryType, id: number) => {
        // Immediate optimistic update
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
        if (selectedEnquiry && selectedEnquiry.id === id) {
            setSelectedEnquiry((prev) => (prev ? { ...prev, read: true } : null));
        }

        // Optimistically decrement unread count in overview
        setOverviewCounts((prev) => {
            if (type === 'quote') {
                return {
                    ...prev,
                    quotes: { ...prev.quotes, unread: Math.max(0, prev.quotes.unread - 1) },
                };
            } else if (type === 'jobs') {
                return {
                    ...prev,
                    jobs: { ...prev.jobs, unread: Math.max(0, prev.jobs.unread - 1) },
                };
            } else {
                return {
                    ...prev,
                    contacts: { ...prev.contacts, unread: Math.max(0, prev.contacts.unread - 1) },
                };
            }
        });

        setMarkingReadId(id);
        try {
            await api.put(`/admin/enquiries/${type}/${id}/read`);
        } catch (err: unknown) {
            console.error('Failed to mark enquiry as read:', err);
            setPageError(getErrorMessage(err, 'Failed to update enquiry read status.'));
        } finally {
            setMarkingReadId(null);
        }
    };

    // Resume file download handler
    const downloadResume = async (enquiry: EnquiryItem) => {
        setDownloadingId(enquiry.id);
        try {
            const response = await api.get(`/admin/enquiries/contact/${enquiry.id}/resume`, {
                responseType: 'blob',
            });
            const blob = response.data as Blob;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = enquiry.resumeOriginalName || enquiry.resumeFilename || 'resume.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            console.error('Failed to download resume:', err);
            setPageError('Failed to download resume file. File may not be available.');
        } finally {
            setDownloadingId(null);
        }
    };

    // Client-side search filtering across name, email, phone, subject, institution, role, items
    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return items;
        return items.filter((item) => {
            const nameMatch = item.name.toLowerCase().includes(query);
            const emailMatch = item.email.toLowerCase().includes(query);
            const phoneMatch = Boolean(item.phone && item.phone.toLowerCase().includes(query));
            const subjectMatch = Boolean(item.subject && item.subject.toLowerCase().includes(query));
            const instMatch = Boolean(item.institution && item.institution.toLowerCase().includes(query));
            const roleMatch = Boolean(item.role && item.role.toLowerCase().includes(query));
            const itemsMatch = Boolean(item.items && item.items.toLowerCase().includes(query));
            const msgMatch = item.message.toLowerCase().includes(query);

            return (
                nameMatch ||
                emailMatch ||
                phoneMatch ||
                subjectMatch ||
                instMatch ||
                roleMatch ||
                itemsMatch ||
                msgMatch
            );
        });
    }, [items, search]);

    // Tab definitions
    const tabs: TabItem<EnquiryType>[] = [
        {
            id: 'quote',
            label: 'Quotations',
            icon: FileSpreadsheet,
            count: unreadOnly
                ? overviewCounts.quotes.unread
                : overviewCounts.quotes.unread > 0
                ? overviewCounts.quotes.unread
                : overviewCounts.quotes.total,
        },
        {
            id: 'contact',
            label: 'General Enquiries',
            icon: Mail,
            count: unreadOnly
                ? overviewCounts.contacts.unread
                : overviewCounts.contacts.unread > 0
                ? overviewCounts.contacts.unread
                : overviewCounts.contacts.total,
        },
        {
            id: 'jobs',
            label: 'Job Applications',
            icon: BriefcaseBusiness,
            count: unreadOnly
                ? overviewCounts.jobs.unread
                : overviewCounts.jobs.unread > 0
                ? overviewCounts.jobs.unread
                : overviewCounts.jobs.total,
        },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <PageHeader
                title="Enquiries & Quotations"
                subtitle="Calm procurement inbox for institutional quote requests, customer enquiries, and career applications"
            />

            {/* Error Banner */}
            {pageError ? (
                <ErrorBanner
                    message={pageError}
                    retry={() => {
                        fetchEnquiries();
                        fetchOverviewCounts();
                    }}
                    onDismiss={() => setPageError(null)}
                />
            ) : null}

            {/* Stat Cards Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Quotations"
                    value={overviewCounts.quotes.total}
                    subtitle={
                        overviewCounts.quotes.unread > 0
                            ? `${overviewCounts.quotes.unread} unread quote requests`
                            : 'All quotes up to date'
                    }
                    icon={FileSpreadsheet}
                    change={
                        overviewCounts.quotes.unread > 0
                            ? `${overviewCounts.quotes.unread} unread`
                            : 'Clear'
                    }
                    changeType={overviewCounts.quotes.unread > 0 ? 'negative' : 'positive'}
                    onClick={() => handleTabChange('quote')}
                    className={cn(activeTab === 'quote' && 'ring-2 ring-[#1e3a8a]/30 border-[#1e3a8a]')}
                />
                <StatCard
                    title="General Enquiries"
                    value={overviewCounts.contacts.total}
                    subtitle={
                        overviewCounts.contacts.unread > 0
                            ? `${overviewCounts.contacts.unread} unread enquiries`
                            : 'All enquiries reviewed'
                    }
                    icon={Mail}
                    change={
                        overviewCounts.contacts.unread > 0
                            ? `${overviewCounts.contacts.unread} unread`
                            : 'Clear'
                    }
                    changeType={overviewCounts.contacts.unread > 0 ? 'negative' : 'positive'}
                    onClick={() => handleTabChange('contact')}
                    className={cn(activeTab === 'contact' && 'ring-2 ring-[#1e3a8a]/30 border-[#1e3a8a]')}
                />
                <StatCard
                    title="Job Applications"
                    value={overviewCounts.jobs.total}
                    subtitle={
                        overviewCounts.jobs.unread > 0
                            ? `${overviewCounts.jobs.unread} new applicant submissions`
                            : 'All candidates reviewed'
                    }
                    icon={BriefcaseBusiness}
                    change={
                        overviewCounts.jobs.unread > 0
                            ? `${overviewCounts.jobs.unread} unread`
                            : 'Clear'
                    }
                    changeType={overviewCounts.jobs.unread > 0 ? 'negative' : 'positive'}
                    onClick={() => handleTabChange('jobs')}
                    className={cn(activeTab === 'jobs' && 'ring-2 ring-[#1e3a8a]/30 border-[#1e3a8a]')}
                />
            </div>

            {/* Category Navigation Tabs */}
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={handleTabChange}
                className="bg-white px-2 pt-2 rounded-t-xl border-x border-t border-stone-200"
            />

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by name, email, phone, subject..."
                        className="w-full sm:max-w-md"
                    />

                    <button
                        type="button"
                        onClick={handleUnreadOnlyToggle}
                        className={cn(
                            'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all select-none shrink-0 shadow-2xs',
                            unreadOnly
                                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        )}
                        title={unreadOnly ? 'Show all items' : 'Filter to unread only'}
                    >
                        <Filter className={cn('w-3.5 h-3.5', unreadOnly ? 'text-white' : 'text-stone-400')} />
                        <span>Unread Only</span>
                        {unreadOnly ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        ) : null}
                    </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-stone-500">
                    {search ? (
                        <span className="text-stone-500 font-medium">
                            Showing {filteredItems.length} matching
                        </span>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => {
                            fetchEnquiries();
                            fetchOverviewCounts();
                        }}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs disabled:opacity-50"
                        title="Refresh list"
                    >
                        <RotateCcw
                            className={cn('w-3.5 h-3.5 text-stone-400', loading && 'animate-spin text-[#1e3a8a]')}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Table & Pagination Container */}
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs">
                <table className={tableStyles.table}>
                    <thead className={tableStyles.thead}>
                        <tr>
                            <th className={cn(tableStyles.th, 'w-36')}>Type & Status</th>
                            <th className={cn(tableStyles.th, 'w-64')}>Sender</th>
                            <th className={tableStyles.th}>
                                {activeTab === 'quote'
                                    ? 'Quotation Requirements & Message'
                                    : activeTab === 'jobs'
                                    ? 'Target Role & Message'
                                    : 'Subject & Message'}
                            </th>
                            <th className={cn(tableStyles.th, 'w-36')}>Received</th>
                            <th className={cn(tableStyles.th, 'w-48 text-right')}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className={tableStyles.tbody}>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-[#1e3a8a]" />
                                        <span className="text-xs text-stone-500 font-medium">
                                            Loading enquiries...
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8">
                                    <EmptyState
                                        icon={Inbox}
                                        title={unreadOnly ? 'No unread enquiries' : 'No enquiries found'}
                                        description={
                                            search
                                                ? `No results match "${search}". Try adjusting your search query.`
                                                : unreadOnly
                                                ? 'All enquiries in this section are marked as read.'
                                                : 'No enquiry submissions found for this category.'
                                        }
                                        actionLabel={
                                            search
                                                ? 'Clear Search'
                                                : unreadOnly
                                                ? 'Show All Enquiries'
                                                : undefined
                                        }
                                        onAction={
                                            search
                                                ? () => setSearch('')
                                                : unreadOnly
                                                ? handleUnreadOnlyToggle
                                                : undefined
                                        }
                                    />
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        tableStyles.tr,
                                        !item.read && 'bg-blue-50/20 font-medium'
                                    )}
                                >
                                    {/* Status & Type */}
                                    <td className={tableStyles.td}>
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <StatusBadge status={item.type} />
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide select-none',
                                                    item.read
                                                        ? 'bg-stone-100 text-stone-600 border-stone-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'w-1.5 h-1.5 rounded-full shrink-0',
                                                        item.read ? 'bg-stone-400' : 'bg-amber-500'
                                                    )}
                                                />
                                                <span>{item.read ? 'Read' : 'Unread'}</span>
                                            </span>
                                        </div>
                                    </td>

                                    {/* Sender Details */}
                                    <td className={tableStyles.td}>
                                        <div className="space-y-1">
                                            <div className="font-semibold text-stone-900 leading-tight">
                                                {item.name}
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-xs text-stone-500">
                                                <a
                                                    href={`mailto:${item.email}`}
                                                    className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#1e3a8a] transition-colors truncate"
                                                    title={item.email}
                                                >
                                                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span className="truncate">{item.email}</span>
                                                </a>
                                                {item.phone ? (
                                                    <a
                                                        href={`tel:${item.phone}`}
                                                        className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#1e3a8a] transition-colors"
                                                    >
                                                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                        <span>{item.phone}</span>
                                                    </a>
                                                ) : null}
                                                {item.institution ? (
                                                    <div className="inline-flex items-center gap-1.5 text-stone-600 font-medium truncate">
                                                        <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                        <span className="truncate">{item.institution}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Summary / Message Preview */}
                                    <td className={tableStyles.td}>
                                        <div className="space-y-1 max-w-xl">
                                            {item.subject && item.type !== 'quote' ? (
                                                <div className="text-xs font-semibold text-stone-800 line-clamp-1">
                                                    {item.subject}
                                                </div>
                                            ) : null}

                                            {item.role ? (
                                                <div className="text-xs font-semibold text-[#1e3a8a]">
                                                    Role: {item.role}
                                                </div>
                                            ) : null}

                                            {item.items ? (
                                                <div className="text-xs text-stone-700 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200/60 line-clamp-1 font-mono">
                                                    <span className="font-semibold text-stone-600 font-sans">
                                                        Requirements:
                                                    </span>{' '}
                                                    {item.items}
                                                </div>
                                            ) : null}

                                            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                                                {item.message}
                                            </p>

                                            {item.resumeOriginalName ? (
                                                <div className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 pt-0.5">
                                                    <Download className="w-3 h-3 text-stone-400" />
                                                    <span>Attachment: {item.resumeOriginalName}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </td>

                                    {/* Date */}
                                    <td className={tableStyles.td}>
                                        <div className="text-xs whitespace-nowrap">
                                            <div className="font-medium text-stone-800">
                                                {formatDate(item.createdAt)}
                                            </div>
                                            <div className="text-[11px] text-stone-400">
                                                {formatTime(item.createdAt)}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className={cn(tableStyles.td, 'text-right')}>
                                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                            {/* View Message Detail Modal */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedEnquiry(item)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1e3a8a] bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 transition-colors shadow-2xs"
                                                title="View complete message"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View</span>
                                            </button>

                                            {/* Direct Resume Download in Job Applications */}
                                            {(item.resumeOriginalName || item.resumeFilename) && (
                                                <button
                                                    type="button"
                                                    onClick={() => downloadResume(item)}
                                                    disabled={downloadingId === item.id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors shadow-2xs disabled:opacity-50"
                                                    title={`Download ${item.resumeOriginalName || 'Resume'}`}
                                                >
                                                    {downloadingId === item.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-600" />
                                                    ) : (
                                                        <Download className="w-3.5 h-3.5 text-stone-600" />
                                                    )}
                                                    <span className="hidden sm:inline">Resume</span>
                                                </button>
                                            )}

                                            {/* 1-Click Mark as Read Button */}
                                            {!item.read ? (
                                                <button
                                                    type="button"
                                                    onClick={() => markRead(item.type, item.id)}
                                                    disabled={markingReadId === item.id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs disabled:opacity-50"
                                                    title="Mark as read"
                                                >
                                                    {markingReadId === item.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                                    ) : (
                                                        <Check className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>Mark Read</span>
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-stone-400 font-medium">
                                                    <CheckCheck className="w-3.5 h-3.5 text-stone-400" />
                                                    <span className="hidden md:inline">Read</span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <AdminPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                />
            </div>

            {/* View Message Detail Modal */}
            {selectedEnquiry ? (
                <div
                    className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setSelectedEnquiry(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-base font-bold text-stone-900">
                                    {selectedEnquiry.type === 'quote'
                                        ? 'Quotation Request'
                                        : selectedEnquiry.type === 'jobs'
                                        ? 'Job Application'
                                        : 'General Enquiry'}
                                </h2>
                                <StatusBadge status={selectedEnquiry.type} />
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                                        selectedEnquiry.read
                                            ? 'bg-stone-100 text-stone-600 border-stone-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'w-1.5 h-1.5 rounded-full',
                                            selectedEnquiry.read ? 'bg-stone-400' : 'bg-amber-500'
                                        )}
                                    />
                                    <span>{selectedEnquiry.read ? 'Read' : 'Unread'}</span>
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedEnquiry(null)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Contact Card */}
                            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="text-sm font-bold text-stone-900">
                                        {selectedEnquiry.name}
                                    </h3>
                                    <div className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                        <span>
                                            {formatDate(selectedEnquiry.createdAt)} at{' '}
                                            {formatTime(selectedEnquiry.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                        <a
                                            href={`mailto:${selectedEnquiry.email}`}
                                            className="text-[#1e3a8a] font-medium hover:underline truncate"
                                        >
                                            {selectedEnquiry.email}
                                        </a>
                                    </div>

                                    {selectedEnquiry.phone ? (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                            <a
                                                href={`tel:${selectedEnquiry.phone}`}
                                                className="text-stone-700 hover:text-[#1e3a8a] font-medium transition-colors"
                                            >
                                                {selectedEnquiry.phone}
                                            </a>
                                        </div>
                                    ) : null}

                                    {selectedEnquiry.institution ? (
                                        <div className="flex items-center gap-2 sm:col-span-2">
                                            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                            <span className="text-stone-700 font-medium">
                                                Institution: {selectedEnquiry.institution}
                                            </span>
                                        </div>
                                    ) : null}

                                    {selectedEnquiry.role ? (
                                        <div className="flex items-center gap-2 sm:col-span-2">
                                            <BriefcaseBusiness className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" />
                                            <span className="text-[#1e3a8a] font-semibold">
                                                Target Role: {selectedEnquiry.role}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Quotation Requirements / Items */}
                            {selectedEnquiry.items ? (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                        Requested Items / Requirements
                                    </label>
                                    <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-stone-800 font-mono whitespace-pre-wrap leading-relaxed">
                                        {selectedEnquiry.items}
                                    </div>
                                </div>
                            ) : null}

                            {/* Subject */}
                            {selectedEnquiry.subject && selectedEnquiry.type !== 'quote' ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                        Subject
                                    </label>
                                    <p className="text-sm font-semibold text-stone-900">
                                        {selectedEnquiry.subject}
                                    </p>
                                </div>
                            ) : null}

                            {/* Message Content */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                    Message
                                </label>
                                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-sm whitespace-pre-wrap leading-relaxed">
                                    {selectedEnquiry.message || 'No additional message provided.'}
                                </div>
                            </div>

                            {/* Resume Download Section */}
                            {selectedEnquiry.resumeOriginalName || selectedEnquiry.resumeFilename ? (
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                        Applicant Resume Attachment
                                    </label>
                                    <div className="flex items-center justify-between p-3.5 bg-violet-50/50 border border-violet-100 rounded-xl">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <BriefcaseBusiness className="w-4 h-4 text-violet-600 shrink-0" />
                                            <span className="text-xs font-semibold text-stone-800 truncate">
                                                {selectedEnquiry.resumeOriginalName ||
                                                    selectedEnquiry.resumeFilename ||
                                                    'Resume.pdf'}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => downloadResume(selectedEnquiry)}
                                            disabled={downloadingId === selectedEnquiry.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-[#1e3a8a] hover:bg-blue-50 shadow-2xs transition-colors shrink-0 disabled:opacity-50"
                                        >
                                            {downloadingId === selectedEnquiry.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5" />
                                            )}
                                            <span>Download</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50/70">
                            <div>
                                {!selectedEnquiry.read ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            markRead(selectedEnquiry.type, selectedEnquiry.id)
                                        }
                                        disabled={markingReadId === selectedEnquiry.id}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                                    >
                                        {markingReadId === selectedEnquiry.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                        <span>Mark as Read</span>
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/80">
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>Marked as Read</span>
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedEnquiry(null)}
                                className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
