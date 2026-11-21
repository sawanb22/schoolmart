import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    ArrowUp,
    ArrowDown,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    ExternalLink,
    Loader2,
    AlertCircle,
    LayoutGrid,
} from 'lucide-react';
import {
    type ItemFull,
    fetchAdminPageItems,
    deleteAdminPageItem,
    reorderAdminPageItems,
    updateAdminPageItem,
} from '../../api/pageItems';
import ItemEditorDrawer from './ItemEditorDrawer';
import { resolveMediaUrl } from '@/lib/media-url';

export interface ItemsManagerProps {
    pageId: number;
    pageSlug: string;
    collection: string;
    label: string;
    availableCategories?: string[];
    renderCardFields?: (card: any, setCard: (updater: (prev: any) => any) => void) => React.ReactNode;
    targetCardSlug?: string;
}

export default function ItemsManager({
    pageId,
    pageSlug,
    collection,
    label,
    availableCategories = [],
    renderCardFields,
    targetCardSlug,
}: ItemsManagerProps) {
    const queryClient = useQueryClient();
    const queryKey = ['admin', 'items', pageId, collection];

    const [editingItem, setEditingItem] = useState<(ItemFull & { card?: any }) | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const handledInitialTargetSlug = useRef<string | null>(null);

    // 1. Fetch Items for this page and collection
    const {
        data,
        isLoading,
        error: fetchError,
    } = useQuery({
        queryKey,
        queryFn: () => fetchAdminPageItems(pageId, collection, 'card'),
        staleTime: 30_000,
    });

    const items: (ItemFull & { card?: any })[] = data?.items || [];

    // Deep link auto-open when targetCardSlug is matched
    useEffect(() => {
        if (targetCardSlug && items.length > 0 && handledInitialTargetSlug.current !== targetCardSlug) {
            const cleanTarget = targetCardSlug.trim().toLowerCase();
            const matched = items.find(
                (it) =>
                    it.slug.toLowerCase() === cleanTarget ||
                    (it.card?.slug && String(it.card.slug).toLowerCase() === cleanTarget)
            );
            if (matched) {
                handledInitialTargetSlug.current = targetCardSlug;
                setEditingItem(matched);
                setIsDrawerOpen(true);
            }
        }
    }, [targetCardSlug, items]);

    // 2. Mutations
    const deleteMutation = useMutation({
        mutationFn: ({ id, version }: { id: number; version: number }) =>
            deleteAdminPageItem(pageId, id, version),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete item.';
            setErrorMessage(msg);
        },
    });

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: number[]) =>
            reorderAdminPageItems(pageId, collection, orderedIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to reorder items.';
            setErrorMessage(msg);
        },
    });

    const togglePublishMutation = useMutation({
        mutationFn: ({ id, version, published }: { id: number; version: number; published: boolean }) =>
            updateAdminPageItem(pageId, id, { version, published }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to update item status.';
            setErrorMessage(msg);
        },
    });

    // Handlers
    const handleOpenNew = () => {
        setEditingItem(null);
        setIsDrawerOpen(true);
    };

    const handleOpenEdit = (item: ItemFull & { card?: any }) => {
        setEditingItem(item);
        setIsDrawerOpen(true);
    };

    const handleDelete = (item: ItemFull & { card?: any }) => {
        const title = item.title || item.card?.title || 'this item';
        const ok = window.confirm(`Delete item "${title}"? This cannot be undone.`);
        if (!ok) return;
        setErrorMessage(null);
        deleteMutation.mutate({ id: item.id, version: item.version });
    };

    const handleTogglePublish = (item: ItemFull & { card?: any }) => {
        setErrorMessage(null);
        togglePublishMutation.mutate({
            id: item.id,
            version: item.version,
            published: !item.published,
        });
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return;

        const nextItems = [...items];
        const [moved] = nextItems.splice(index, 1);
        nextItems.splice(targetIndex, 0, moved);

        const orderedIds = nextItems.map((it) => it.id);
        reorderMutation.mutate(orderedIds);
    };

    const handleSavedItem = () => {
        queryClient.invalidateQueries({ queryKey });
    };

    return (
        <section id={`sec-${collection}`} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{label}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {collection}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Granular per-item editing for structured hub /{pageSlug}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                    </span>
                    <button
                        type="button"
                        onClick={handleOpenNew}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Item
                    </button>
                </div>
            </div>

            {/* Error alerts */}
            {(errorMessage || fetchError) && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage || 'Failed to load items.'}</span>
                </div>
            )}

            {/* Items List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    Loading items...
                </div>
            ) : items.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                        No items added to this collection yet.
                    </p>
                    <button
                        type="button"
                        onClick={handleOpenNew}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add First Item
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const title = item.title || item.card?.title || 'Untitled Item';
                        const slug = item.slug || item.card?.slug || '';
                        const thumb = item.imageUrl || item.card?.image || '';
                        const cats = item.categories || item.card?.categories || (item.card?.category ? [item.card.category] : []);
                        const isPublished = item.published;

                        return (
                            <div
                                key={item.id}
                                className={`rounded-2xl border transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                    isPublished
                                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                        : 'bg-slate-50/80 border-slate-200 opacity-75'
                                }`}
                            >
                                {/* Thumbnail & Meta */}
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    {/* Sort Order Index & Arrows */}
                                    <div className="flex items-center gap-1">
                                        <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">
                                            #{idx + 1}
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                type="button"
                                                disabled={idx === 0 || reorderMutation.isPending}
                                                onClick={() => handleMove(idx, 'up')}
                                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                                title="Move up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={idx === items.length - 1 || reorderMutation.isPending}
                                                onClick={() => handleMove(idx, 'down')}
                                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                                title="Move down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Thumbnail Preview */}
                                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        {thumb ? (
                                            <img
                                                src={resolveMediaUrl(thumb)}
                                                alt={title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <LayoutGrid className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-bold text-slate-900 truncate">
                                                {title}
                                            </h4>
                                            {item.badge && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                                    {item.badge}
                                                </span>
                                            )}
                                            <span className="text-[10px] font-mono text-slate-400">
                                                v{item.version}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
                                            <span className="truncate">/{slug || 'no-slug'}</span>
                                            {cats.length > 0 && (
                                                <span className="font-sans text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {cats.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Controls */}
                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                    {/* Live Subpage Link */}
                                    {slug && (
                                        <a
                                            href={`/${pageSlug}/${slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                            title="View live subpage in new tab"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}

                                    {/* Published Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => handleTogglePublish(item)}
                                        disabled={togglePublishMutation.isPending}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            isPublished
                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                        title="Toggle published status"
                                    >
                                        {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        {isPublished ? 'Live' : 'Draft'}
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(item)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                                        title="Edit this card"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item)}
                                        disabled={deleteMutation.isPending}
                                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                        title="Delete this card"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Per-Item Editor Drawer */}
            <ItemEditorDrawer
                pageId={pageId}
                pageSlug={pageSlug}
                collection={collection}
                item={editingItem}
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setEditingItem(null);
                }}
                onSaved={handleSavedItem}
                availableCategories={availableCategories}
                renderCardFields={renderCardFields}
            />
        </section>
    );
}
