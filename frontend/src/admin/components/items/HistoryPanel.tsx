import { useQuery } from '@tanstack/react-query';
import { History, X, Loader2 } from 'lucide-react';
import { fetchAdminPageRevisions, type PageRevision } from '../../api/pageItems';

export interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    pageId: number;
    pageSlug: string;
}

function formatWhen(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
}

/**
 * Read-only activity log: who did what to this page and when.
 */
export default function HistoryPanel({ isOpen, onClose, pageId, pageSlug }: HistoryPanelProps) {
    const {
        data,
        isLoading,
        error: fetchError,
        refetch,
    } = useQuery({
        queryKey: ['admin', 'revisions', pageId],
        queryFn: () => fetchAdminPageRevisions(pageId),
        enabled: isOpen,
        staleTime: 10_000,
    });

    const revisions: PageRevision[] = data?.revisions || [];

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Page Activity History"
        >
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">History</h3>
                            <p className="text-xs text-slate-500 font-medium">/{pageSlug}</p>
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

                <p className="px-6 pt-4 text-xs text-slate-500">Shows the last 20 changes to this page.</p>

                {/* Activity list */}
                <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                            <p className="text-xs font-semibold">Loading history…</p>
                        </div>
                    ) : fetchError ? (
                        <div className="p-6 text-center text-xs text-rose-600 space-y-2">
                            <p className="font-bold">Failed to load history.</p>
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
                            <p className="font-bold text-slate-600">No changes recorded yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {revisions.map((rev) => (
                                <li
                                    key={rev.id}
                                    className="p-4 rounded-2xl border border-gray-200 bg-white"
                                >
                                    <p className="text-sm font-semibold text-slate-900">{rev.summary}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        by {rev.authorName} · {formatWhen(rev.createdAt)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-slate-50/50 flex justify-end items-center text-xs">
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
