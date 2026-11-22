import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    ArrowUp,
    ArrowDown,
    Pencil,
    Trash2,
    Check,
    X,
    FolderOpen,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import {
    type PageCategory,
    fetchAdminPageCategories,
    createAdminPageCategory,
    updateAdminPageCategory,
    deleteAdminPageCategory,
    reorderAdminPageCategories,
} from '../../api/pageItems';

export interface CategoryManagerProps {
    pageId: number;
    pageSlug?: string;
}

export default function CategoryManager({ pageId, pageSlug }: CategoryManagerProps) {
    const queryClient = useQueryClient();
    const queryKey = ['admin', 'categories', pageId];

    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 1. Fetch categories
    const {
        data,
        isLoading,
        error: fetchError,
    } = useQuery({
        queryKey,
        queryFn: () => fetchAdminPageCategories(pageId),
        staleTime: 30_000,
    });

    const categories: PageCategory[] = data?.categories || [];

    // 2. Mutations
    const createMutation = useMutation({
        mutationFn: (name: string) => createAdminPageCategory(pageId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setNewName('');
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to create category.';
            setErrorMessage(msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) =>
            updateAdminPageCategory(pageId, id, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setEditingId(null);
            setEditingName('');
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to update category.';
            setErrorMessage(msg);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteAdminPageCategory(pageId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete category.';
            setErrorMessage(msg);
        },
    });

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: number[]) => reorderAdminPageCategories(pageId, orderedIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            setErrorMessage(null);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to reorder categories.';
            setErrorMessage(msg);
        },
    });

    // Handlers
    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newName.trim();
        if (!trimmed) return;
        setErrorMessage(null);
        createMutation.mutate(trimmed);
    };

    const handleStartEdit = (cat: PageCategory) => {
        setEditingId(cat.id);
        setEditingName(cat.name);
    };

    const handleSaveEdit = (id: number) => {
        const trimmed = editingName.trim();
        if (!trimmed) {
            setEditingId(null);
            return;
        }
        setErrorMessage(null);
        updateMutation.mutate({ id, name: trimmed });
    };

    const handleDelete = (cat: PageCategory) => {
        const count = cat.itemCount ?? 0;
        const msg = count > 0
            ? `Delete category "${cat.name}"?\n\n${count} card(s) tagged with this category will have this tag unlinked.`
            : `Delete category "${cat.name}"?`;
        if (!window.confirm(msg)) return;
        setErrorMessage(null);
        deleteMutation.mutate(cat.id);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) return;

        const nextCats = [...categories];
        const [moved] = nextCats.splice(index, 1);
        nextCats.splice(targetIndex, 0, moved);

        const orderedIds = nextCats.map(c => c.id);
        reorderMutation.mutate(orderedIds);
    };

    return (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Page Filter Categories</h3>
                        <p className="text-xs text-slate-500">
                            {pageSlug ? `Manage filter pills for /${pageSlug}` : 'Categories for organizing cards on this page'}
                        </p>
                    </div>
                </div>

                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
                    {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
                </span>
            </div>

            {/* Error alerts */}
            {(errorMessage || fetchError) && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage || 'Failed to load categories.'}</span>
                </div>
            )}

            {/* New Category Input */}
            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New category name (e.g. Robotics, AI Labs, Innovation)"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm bg-white"
                />
                <button
                    type="submit"
                    disabled={createMutation.isPending || !newName.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                    {createMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Plus className="w-3.5 h-3.5" />
                    )}
                    Add Category
                </button>
            </form>

            {/* Categories List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-8 text-slate-400 text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Loading categories...
                </div>
            ) : categories.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs">
                    No categories registered yet. Add a category above to enable filter chips on this page.
                </div>
            ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {categories.map((cat, idx) => {
                        const isEditing = editingId === cat.id;

                        return (
                            <div
                                key={cat.id}
                                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Reorder Buttons */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={idx === 0 || reorderMutation.isPending}
                                            onClick={() => handleMove(idx, 'up')}
                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Move category up"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={idx === categories.length - 1 || reorderMutation.isPending}
                                            onClick={() => handleMove(idx, 'down')}
                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Move category down"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Category Name or Edit Input */}
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="flex-1 rounded-lg border border-indigo-300 px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(cat.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveEdit(cat.id)}
                                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                                title="Save rename"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingId(null)}
                                                className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
                                                title="Cancel"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="font-bold text-xs text-slate-800 truncate">
                                                {cat.name}
                                            </span>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                #{cat.slug}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {cat.itemCount ?? 0} {cat.itemCount === 1 ? 'card' : 'cards'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Row Actions */}
                                {!isEditing && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(cat)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                            title="Rename category"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(cat)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                            title="Delete category"
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
        </section>
    );
}
