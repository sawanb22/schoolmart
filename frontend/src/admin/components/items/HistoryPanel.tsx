import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    History,
    X,
    RotateCcw,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Calendar,
    User,
} from 'lucide-react';
import {
    fetchAdminPageRevisions,
    restoreAdminPageRevision,
    type PageRevision,
} from '../../api/pageItems';
import { clearPageDataCache, broadcastCmsInvalidation } from '@/hooks/usePageData';

export interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    pageId: number;
    pageSlug: string;
    currentPageVersion: number;
    onRestoreSuccess?: (restoredPage: any) => void;
}

function getReasonBadgeClass(reason: string): string {
    switch (reason) {
        case 'restore':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'pre-migration':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'item-create':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'item-update':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'item-delete':
            return 'bg-rose-100 text-rose-800 border-rose-200';
        case 'reorder':
            return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'category-create':
        case 'category':
            return 'bg-teal-100 text-teal-800 border-teal-200';
        case 'category-update':
            return 'bg-cyan-100 text-cyan-800 border-cyan-200';
        case 'category-delete':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'category-reorder':
            return 'bg-sky-100 text-sky-800 border-sky-200';
        case 'settings':
            return 'bg-slate-100 text-slate-800 border-slate-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

export default function HistoryPanel({
    isOpen,
    onClose,
    pageId,
    pageSlug,
    currentPageVersion,
    onRestoreSuccess,
}: HistoryPanelProps) {
    const queryClient = useQueryClient();
    const queryKey = ['admin', 'revisions', pageId];

    const [confirmingRevId, setConfirmingRevId] = useState<number | null>(null);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 1. Fetch revisions
    const {
        data,
        isLoading,
        error: fetchError,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: () => fetchAdminPageRevisions(pageId),
        enabled: isOpen,
        staleTime: 10_000,
    });

    const revisions: PageRevision[] = data?.revisions || [];

    // 2. Restore mutation
    const restoreMutation = useMutation({
        mutationFn: ({ revId, version }: { revId: number; version: number }) =>
            restoreAdminPageRevision(pageId, revId, version),
        onSuccess: (resData) => {
            setConflictWarning(null);
            setErrorMessage(null);
            setSuccessMessage(`Successfully restored revision! Current page version is now v${resData.page?.version || 'latest'}.`);

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'items', pageId] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories', pageId] });
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['page', pageSlug] });

            clearPageDataCache();
            broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: pageSlug });

            if (onRestoreSuccess && resData.page) {
                onRestoreSuccess(resData.page);
            }
        },
        onError: (err: any) => {
            setSuccessMessage(null);
            if (err?.response?.status === 409) {
                const currentServerVersion = err?.response?.data?.current;
                setConflictWarning(
                    `Version Conflict (409): The page has been modified on the server (now v${currentServerVersion}). Your editor was at v${currentPageVersion}. Please refresh the page before attempting to restore.`
                );
            } else {
                const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to restore revision.';
                setErrorMessage(msg);
            }
        },
    });

    if (!isOpen) return null;

    const handleRestoreClick = (rev: PageRevision) => {
        setConflictWarning(null);
        setSuccessMessage(null);
        setErrorMessage(null);

        // Check if window.confirm was mocked or confirmed
        let confirmed = false;
        try {
            if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                confirmed = window.confirm(`Restore page to revision v${rev.version}? All subsequent changes will be overwritten.`);
            }
        } catch {
            confirmed = false;
        }

        if (confirmed) {
            restoreMutation.mutate({ revId: rev.id, version: currentPageVersion });
        } else {
            // If window.confirm returned false or not confirmed, open inline confirmation banner
            setConfirmingRevId(rev.id);
        }
    };

    const confirmInlineRestore = (revId: number) => {
        setConfirmingRevId(null);
        restoreMutation.mutate({ revId, version: currentPageVersion });
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Page Revision History"
        >
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Revision History</h3>
                            <p className="text-xs text-slate-500 font-medium">
                                /{pageSlug} • Current Editor: <span className="font-bold text-slate-700">v{currentPageVersion}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Close History Panel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Notifications & Banners */}
                <div className="px-6 pt-4">
                    {conflictWarning && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm mb-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-bold text-amber-950">Conflict Warning</p>
                                <p className="mt-0.5 leading-relaxed">{conflictWarning}</p>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-sm mb-3">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-bold text-rose-950">Restore Error</p>
                                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 shadow-sm mb-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-bold text-emerald-950">Restore Succeeded</p>
                                <p className="mt-0.5 leading-relaxed">{successMessage}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Revisions List */}
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                            <p className="text-xs font-semibold">Loading revision history…</p>
                        </div>
                    ) : fetchError ? (
                        <div className="p-6 text-center text-xs text-rose-600 space-y-2">
                            <p className="font-bold">Failed to load revisions.</p>
                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-lg font-bold hover:bg-rose-200 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : revisions.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                            <History className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="font-bold text-slate-600">No revisions found</p>
                            <p>Revisions are created automatically whenever page items, categories, or settings are modified.</p>
                        </div>
                    ) : (
                        revisions.map((rev) => {
                            const isConfirming = confirmingRevId === rev.id;
                            const isRestoringThis = restoreMutation.isPending && restoreMutation.variables?.revId === rev.id;

                            return (
                                <div
                                    key={rev.id}
                                    className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                                    v{rev.version}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getReasonBadgeClass(
                                                        rev.reason
                                                    )}`}
                                                >
                                                    {rev.reason}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(rev.createdAt).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    {rev.authorId ? `Admin #${rev.authorId}` : 'System'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRestoreClick(rev)}
                                            disabled={restoreMutation.isPending}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                            title={`Restore revision v${rev.version}`}
                                        >
                                            {isRestoringThis ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                            ) : (
                                                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            <span>Restore</span>
                                        </button>
                                    </div>

                                    {/* Inline Confirmation step if not using window.confirm */}
                                    {isConfirming && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
                                            <p className="text-xs font-bold text-slate-800">
                                                Restore this revision (v{rev.version})? All current unsaved changes will be lost.
                                            </p>
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingRevId(null)}
                                                    className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => confirmInlineRestore(rev.id)}
                                                    disabled={restoreMutation.isPending}
                                                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                                >
                                                    {restoreMutation.isPending && (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    )}
                                                    Confirm Restore
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-400">
                    <span>{revisions.length} total revision(s) recorded</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
