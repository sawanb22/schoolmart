import { useState, useEffect, useRef } from 'react';
import {
    X,
    Save,
    AlertCircle,
    Check,
    Loader2,
    Globe,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    type ItemFull,
    createAdminPageItem,
    updateAdminPageItem,
} from '../../api/pageItems';
import CardFieldsEditor from './CardFieldsEditor';

export interface ItemEditorDrawerProps {
    pageId: number;
    pageSlug: string;
    collection: string;
    item: (ItemFull & { card?: any }) | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: (item: ItemFull & { card?: any }) => void;
    availableCategories?: string[];
    renderCardFields?: (card: any, setCard: (updater: (prev: any) => any) => void) => React.ReactNode;
}

export default function ItemEditorDrawer({
    pageId,
    pageSlug,
    collection,
    item,
    isOpen,
    onClose,
    onSaved,
    availableCategories = [],
    renderCardFields,
}: ItemEditorDrawerProps) {
    const isNew = !item || !item.id;

    // Build initial card state
    const initialCard = useRef<Record<string, any>>({});
    const [card, setCard] = useState<Record<string, any>>({});
    const [version, setVersion] = useState<number>(1);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [seoOpen, setSeoOpen] = useState(false);

    // Initialize or reset state when item or isOpen changes
    useEffect(() => {
        if (isOpen) {
            const rawCard = item?.card || (item ? {
                title: item.title,
                slug: item.slug,
                description: item.summary || '',
                image: item.imageUrl || '',
                href: item.href || '',
                badge: item.badge || '',
                categories: item.categories || [],
                ...item.data,
                ...item.detail,
            } : {
                title: '',
                slug: '',
                description: '',
                image: '',
                href: '',
                badge: '',
                categories: [],
            });

            const cloned = structuredClone(rawCard);
            initialCard.current = cloned;
            setCard(cloned);
            setVersion(item?.version ?? 1);
            setSaveError(null);
            setSavedSuccess(false);
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    // Check dirty state
    const isDirty = JSON.stringify(card) !== JSON.stringify(initialCard.current);

    const handleClose = () => {
        if (isDirty) {
            const ok = window.confirm('You have unsaved changes on this item. Are you sure you want to close without saving?');
            if (!ok) return;
        }
        onClose();
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        setSavedSuccess(false);

        try {
            let result: ItemFull & { card?: any };

            if (isNew) {
                result = await createAdminPageItem(pageId, {
                    collection,
                    card,
                });
            } else {
                result = await updateAdminPageItem(pageId, item.id, {
                    version, // ignored by the server (last write wins)
                    card,
                });
            }

            setSavedSuccess(true);
            initialCard.current = structuredClone(card);
            onSaved(result);
            setTimeout(() => {
                setSavedSuccess(false);
                onClose();
            }, 500);
        } catch (err: any) {
            console.error('Failed to save item:', err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to save item.';
            setSaveError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">
                                {isNew ? 'New Item' : `Edit: ${card.title || 'Untitled Card'}`}
                            </h2>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {collection}
                            </span>
                            {!isNew && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                    v{version}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {pageSlug ? `Page /${pageSlug}` : `Page ID ${pageId}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {isDirty && (
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                                Unsaved changes
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                            title="Close drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {saveError && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-900 text-xs">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}

                    {renderCardFields ? (
                        renderCardFields(card, setCard)
                    ) : (
                        <CardFieldsEditor
                            card={card}
                            setCard={setCard}
                            pageSlug={pageSlug}
                            availableCategories={availableCategories}
                        />
                    )}

                    {/* Collapsible SEO Section */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                        <button
                            type="button"
                            onClick={() => setSeoOpen(!seoOpen)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5">
                                <Globe className="w-4 h-4 text-blue-600" />
                                <div>
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                                        SEO &amp; Search Engine Metadata
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        Custom title, description, social preview image, and indexing
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {(card.seo?.title || card.seo?.description || card.seo?.noindex) && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                        Configured
                                    </span>
                                )}
                                {seoOpen ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                        </button>

                        {seoOpen && (
                            <div className="p-4 space-y-4 border-t border-slate-200 bg-white">
                                {/* Title */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            SEO Title
                                        </label>
                                        <span className={`text-[11px] font-mono ${(card.seo?.title?.length || 0) > 60 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                            {card.seo?.title?.length || 0}/60
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={card.seo?.title || ''}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setCard((prev: any) => ({
                                                ...prev,
                                                seo: { ...(prev.seo || {}), title: v },
                                            }));
                                        }}
                                        placeholder={card.title || 'Custom search engine title'}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Leave blank to default to item title. Recommended: max 60 characters.
                                    </p>
                                </div>

                                {/* Description */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            SEO Description
                                        </label>
                                        <span className={`text-[11px] font-mono ${(card.seo?.description?.length || 0) > 160 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                            {card.seo?.description?.length || 0}/160
                                        </span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={card.seo?.description || ''}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setCard((prev: any) => ({
                                                ...prev,
                                                seo: { ...(prev.seo || {}), description: v },
                                            }));
                                        }}
                                        placeholder={card.description || 'Custom search engine meta description'}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Leave blank to default to item summary. Recommended: max 160 characters.
                                    </p>
                                </div>

                                {/* OG Image */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        OpenGraph / Social Image URL
                                    </label>
                                    <input
                                        type="text"
                                        value={card.seo?.ogImage || ''}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setCard((prev: any) => ({
                                                ...prev,
                                                seo: { ...(prev.seo || {}), ogImage: v },
                                            }));
                                        }}
                                        placeholder={card.image || '/uploads/custom-og.jpg'}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                {/* Noindex Toggle */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-700">
                                            Exclude from Search Engines (noindex)
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            Instruct crawlers not to index this item and exclude it from the sitemap.
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCard((prev: any) => ({
                                                ...prev,
                                                seo: { ...(prev.seo || {}), noindex: !prev.seo?.noindex },
                                            }));
                                        }}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            card.seo?.noindex ? 'bg-red-600' : 'bg-slate-200'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                card.seo?.noindex ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave()}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 ${
                            savedSuccess
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving Item...
                            </>
                        ) : savedSuccess ? (
                            <>
                                <Check className="w-4 h-4" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isNew ? 'Create Item' : 'Save Changes'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
