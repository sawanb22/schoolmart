import { useState, useEffect, useRef } from 'react';
import {
    X,
    Save,
    AlertCircle,
    Check,
    Loader2,
} from 'lucide-react';
import {
    type ItemFull,
    createAdminPageItem,
    updateAdminPageItem,
} from '../../api/pageItems';
import CardFieldsEditor from './CardFieldsEditor';
import ConflictDialog from './ConflictDialog';

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

    // Conflict state
    const [conflictCurrent, setConflictCurrent] = useState<(ItemFull & { card?: any }) | null>(null);
    const [showConflictDialog, setShowConflictDialog] = useState(false);

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
            setConflictCurrent(null);
            setShowConflictDialog(false);
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

    const handleSave = async (versionOverride?: number) => {
        setSaving(true);
        setSaveError(null);
        setSavedSuccess(false);

        const sendVersion = versionOverride !== undefined ? versionOverride : version;

        try {
            let result: ItemFull & { card?: any };

            if (isNew) {
                result = await createAdminPageItem(pageId, {
                    collection,
                    card,
                });
            } else {
                result = await updateAdminPageItem(pageId, item.id, {
                    version: sendVersion,
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
            if (err?.response?.status === 409 && err?.response?.data?.error === 'version_conflict') {
                const currentRemote = err.response.data.current;
                setConflictCurrent(currentRemote);
                setShowConflictDialog(true);
            } else {
                const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to save item.';
                setSaveError(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    // Conflict Actions
    const handleReloadLatest = () => {
        if (!conflictCurrent) return;
        const latestCard = conflictCurrent.card || {
            title: conflictCurrent.title,
            slug: conflictCurrent.slug,
            description: conflictCurrent.summary || '',
            image: conflictCurrent.imageUrl || '',
            href: conflictCurrent.href || '',
            badge: conflictCurrent.badge || '',
            categories: conflictCurrent.categories || [],
            ...conflictCurrent.data,
            ...conflictCurrent.detail,
        };
        const cloned = structuredClone(latestCard);
        setCard(cloned);
        initialCard.current = structuredClone(cloned);
        setVersion(conflictCurrent.version);
        setShowConflictDialog(false);
        setConflictCurrent(null);
        setSaveError(null);
    };

    const handleOverwrite = () => {
        if (!conflictCurrent) return;
        const targetVersion = conflictCurrent.version;
        setShowConflictDialog(false);
        handleSave(targetVersion);
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

            {/* Version Conflict Dialog */}
            <ConflictDialog
                isOpen={showConflictDialog}
                onClose={() => setShowConflictDialog(false)}
                onReloadLatest={handleReloadLatest}
                onOverwrite={handleOverwrite}
                localData={card}
                currentData={conflictCurrent?.card || {}}
                title={`Version Conflict on "${card.title || 'Item'}"`}
            />
        </div>
    );
}
