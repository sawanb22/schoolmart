import { useRef, useState } from 'react';
import {
    ExternalLink,
    Layers,
    Plus,
    Trash2,
    Sparkles,
} from 'lucide-react';
import api from '../../api/client';
import MediaImageField from '../MediaImageField';
import HtmlRichTextEditor from '../HtmlRichTextEditor';
import { resolveMediaUrl } from '@/lib/media-url';

function slugifyCardTitle(title?: string): string {
    return (title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function Field({
    label,
    value,
    onChange,
    onBlur,
    multiline = false,
    placeholder = '',
    hint = '',
    richText = false,
    rows = 3,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    multiline?: boolean;
    placeholder?: string;
    hint?: string;
    richText?: boolean;
    rows?: number;
}) {
    if (richText) {
        return (
            <HtmlRichTextEditor
                label={label}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                helperText={hint}
                rows={rows}
            />
        );
    }
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 flex items-center justify-between">
                {label}
                {hint && (
                    <span className="text-gray-400 font-normal text-[10px] uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
                        {hint}
                    </span>
                )}
            </label>
            {multiline ? (
                <textarea
                    rows={rows}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm bg-white"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
}

function DocumentUploadField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (file: File) => {
        setUploading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.post('/pages/upload-document', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.url);
        } catch {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const currentFilename = value ? decodeURIComponent(value.split('/').pop() || '') : '';

    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white font-mono text-xs"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https://... or upload file"
                />
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-50"
                >
                    {uploading ? 'Uploading...' : 'Upload PDF'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = '';
                    }}
                />
            </div>
            {value && (
                <div className="flex items-center gap-2 pt-1 text-xs text-blue-600">
                    <span className="font-semibold text-gray-500">Current file:</span>
                    <a
                        href={resolveMediaUrl(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline truncate max-w-md font-medium hover:text-blue-800"
                        title={currentFilename}
                    >
                        {currentFilename}
                    </a>
                </div>
            )}
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
        </div>
    );
}

function CardCategoriesField({
    categories = [],
    availableCategories = [],
    onChange,
    pageSlug,
}: {
    categories?: string[];
    availableCategories: string[];
    onChange: (cats: string[]) => void;
    pageSlug?: string;
}) {
    const currentCats = Array.isArray(categories) ? categories : [];

    const handleToggle = (cat: string) => {
        if (currentCats.some((c) => c.toLowerCase() === cat.toLowerCase())) {
            onChange(currentCats.filter((c) => c.toLowerCase() !== cat.toLowerCase()));
        } else {
            onChange([...currentCats, cat]);
        }
    };

    return (
        <div className="space-y-2 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Categories (Card Filter Chips)
                </label>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-2 py-0.5 rounded-full">
                    {currentCats.length} assigned
                </span>
            </div>

            {availableCategories.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-2">
                    <span>No categories registered for this page yet.</span>
                    {pageSlug && (
                        <a
                            href={`/admin/categories?page=${pageSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                        >
                            Open Categories Manager &rarr;
                        </a>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 font-medium">
                        Click category pills below to toggle them on/off for this card:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableCategories.map((cat) => {
                            const isAssigned = currentCats.some((c) => c.toLowerCase() === cat.toLowerCase());
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleToggle(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        isAssigned
                                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {isAssigned ? '✓ ' : '+ '}
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export interface CardFieldsEditorProps {
    card: Record<string, any>;
    setCard: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
    pageSlug?: string;
    availableCategories?: string[];
}

export default function CardFieldsEditor({
    card,
    setCard,
    pageSlug = '',
    availableCategories = [],
}: CardFieldsEditorProps) {
    const updateCard = (patch: Record<string, any>) => {
        setCard((prev) => ({ ...prev, ...patch }));
    };

    const isClassifieds = pageSlug === 'classifieds';
    const isAiGuide = pageSlug === 'ai-guide';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                    label={isAiGuide ? 'Article Title' : isClassifieds ? 'Opportunity Title' : 'Card Title'}
                    value={card.title ?? ''}
                    onChange={(v) => updateCard({ title: v })}
                    placeholder={isClassifieds ? 'Opportunity Title' : 'Card Title'}
                />

                {/* Subpage Slug & Link Destination Field */}
                <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <label className="block text-sm font-bold text-gray-700">
                            Subpage URL Slug / Destination Link
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={card.slug !== undefined && card.slug !== null ? card.slug : (card.href ? card.href.replace(/^\/+/, '') : '')}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (!raw.trim()) {
                                    updateCard({ slug: '', href: '' });
                                } else {
                                    const cleanSlug = raw.trim().replace(/^\/+/, '');
                                    const cleanHref = raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#') || raw.startsWith('/')
                                        ? raw.trim()
                                        : `/${cleanSlug}`;
                                    updateCard({ slug: cleanSlug, href: cleanHref });
                                }
                            }}
                            placeholder={slugifyCardTitle(card.title) || 'subpage-slug'}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-slate-800"
                            title="Hook this card to an existing CMS page or enter a custom destination"
                        />
                        <a
                            href={card.href?.startsWith('http') ? card.href : (card.href?.startsWith('/') ? card.href : `/${pageSlug}/${(card.slug || slugifyCardTitle(card.title) || '').replace(/^\/+/, '')}`)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                            title="View this card's live subpage in a new tab"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> View Live Subpage
                        </a>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">
                        Destination: {card.href?.startsWith('http') ? card.href : (card.href?.startsWith('/') ? card.href : `/${pageSlug}/${(card.slug || slugifyCardTitle(card.title) || 'subpage').replace(/^\/+/, '').replace(/\/+$/, '')}`)}
                    </p>
                </div>

                <div className="md:col-span-2">
                    <Field
                        label={isAiGuide ? 'Article Summary' : isClassifieds ? 'Opportunity Description' : 'Card Teaser Summary (Displayed on Card Grid)'}
                        value={card.description ?? ''}
                        onChange={(v) => updateCard({ description: v })}
                        richText
                        placeholder={isClassifieds ? 'Opportunity overview...' : 'Card teaser description...'}
                    />
                </div>

                {/* In-Depth Subpage Dual-Content Toggle */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold text-slate-900 flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(card.useCustomDetail)}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        updateCard({
                                            useCustomDetail: checked,
                                            detailContent: checked ? (card.detailContent || card.description || '') : card.detailContent
                                        });
                                    }}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                />
                                <span>Customize In-Depth Subpage Content (Optional)</span>
                            </label>
                            <p className="text-xs text-slate-500">
                                When enabled, the short teaser displays on the grid, and this comprehensive content displays when visitors open the subpage.
                            </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${card.useCustomDetail ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                            {card.useCustomDetail ? 'Custom Subpage Active' : 'Inherits Teaser'}
                        </span>
                    </div>

                    {card.useCustomDetail && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                            <Field
                                label="In-Depth Subpage Content"
                                value={card.detailContent ?? ''}
                                onChange={(v) => updateCard({ detailContent: v })}
                                richText
                                placeholder="Write the comprehensive subpage content, scope, specifications, or deliverables..."
                            />
                        </div>
                    )}
                </div>

                {/* Optional Before & After Visual Showcase Section */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600" />
                                Before & After Visual Showcase (Optional)
                            </span>
                            <p className="text-xs text-slate-500">
                                Display an interactive top-center Before/After toggle on the subpage hero image with multi-photo slide galleries.
                            </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase)}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    updateCard({
                                        enableShowcase: checked,
                                        beforeImages: checked ? (card.beforeImages && card.beforeImages.length > 0 ? card.beforeImages : ['']) : [],
                                        afterImages: checked ? (card.afterImages && card.afterImages.length > 0 ? card.afterImages : [card.image || '']) : [],
                                    });
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                            />
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-200 text-slate-600'
                            }`}>
                                {Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase)
                                    ? 'Showcase Active'
                                    : 'Standard Single Image'}
                            </span>
                        </label>
                    </div>

                    {Boolean((card.beforeImages && card.beforeImages.length > 0) || (card.afterImages && card.afterImages.length > 0) || card.enableShowcase) && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Before Images */}
                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Before Images (Legacy State)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = Array.isArray(card.beforeImages) ? [...card.beforeImages] : [];
                                            updateCard({ beforeImages: [...current, ''] });
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 px-2 py-1 rounded transition"
                                    >
                                        <Plus className="w-3 h-3" /> Add Image
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(card.beforeImages && card.beforeImages.length > 0 ? card.beforeImages : ['']).map((url: string, bIdx: number) => (
                                        <div key={bIdx} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <MediaImageField
                                                    label={`Before Photo #${bIdx + 1}`}
                                                    value={url}
                                                    onChange={(newUrl: string) => {
                                                        const current = Array.isArray(card.beforeImages) ? [...card.beforeImages] : [''];
                                                        current[bIdx] = newUrl;
                                                        updateCard({ beforeImages: current });
                                                    }}
                                                    previewClassName="h-16"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = Array.isArray(card.beforeImages) ? [...card.beforeImages] : [];
                                                    const filtered = current.filter((_: string, idx: number) => idx !== bIdx);
                                                    updateCard({ beforeImages: filtered.length > 0 ? filtered : [] });
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-500 transition mt-6"
                                                title="Remove photo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* After Images */}
                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                        After Images (Modernized State)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = Array.isArray(card.afterImages) ? [...card.afterImages] : [];
                                            updateCard({ afterImages: [...current, ''] });
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-1 rounded transition"
                                    >
                                        <Plus className="w-3 h-3" /> Add Image
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(card.afterImages && card.afterImages.length > 0 ? card.afterImages : ['']).map((url: string, aIdx: number) => (
                                        <div key={aIdx} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <MediaImageField
                                                    label={`After Photo #${aIdx + 1}`}
                                                    value={url}
                                                    onChange={(newUrl: string) => {
                                                        const current = Array.isArray(card.afterImages) ? [...card.afterImages] : [''];
                                                        current[aIdx] = newUrl;
                                                        updateCard({ afterImages: current });
                                                    }}
                                                    previewClassName="h-16"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = Array.isArray(card.afterImages) ? [...card.afterImages] : [];
                                                    const filtered = current.filter((_: string, idx: number) => idx !== aIdx);
                                                    updateCard({ afterImages: filtered.length > 0 ? filtered : [] });
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-500 transition mt-6"
                                                title="Remove photo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Optional Custom Subpage CTA Strip Section */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Subpage Bottom CTA Strip (Optional)
                            </span>
                            <p className="text-xs text-slate-500">
                                Customize the inquiry banner at the bottom of this subpage. Leave fields empty to inherit default.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(card.hideCta)}
                                    onChange={(e) => updateCard({ hideCta: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                                />
                                <span>Hide CTA Strip</span>
                            </label>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${card.hideCta ? 'bg-red-100 text-red-700' : (card.ctaTitle || card.ctaButtonLabel || card.ctaButtonHref || card.ctaHref ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}`}>
                                {card.hideCta ? 'CTA Hidden' : (card.ctaTitle || card.ctaButtonLabel || card.ctaButtonHref || card.ctaHref ? 'Custom CTA Active' : 'Default CTA')}
                            </span>
                        </div>
                    </div>

                    {!card.hideCta && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field
                                label="CTA Banner Heading"
                                value={card.ctaTitle ?? ''}
                                onChange={(v) => updateCard({ ctaTitle: v })}
                                placeholder="e.g. Want this module on your campus?"
                            />
                            <Field
                                label="CTA Banner Subtitle"
                                value={card.ctaSubtitle ?? ''}
                                onChange={(v) => updateCard({ ctaSubtitle: v })}
                                placeholder="e.g. Connect with our engineering advisors for a tailored deployment plan."
                            />
                            <Field
                                label="CTA Button Label"
                                value={card.ctaButtonLabel ?? ''}
                                onChange={(v) => updateCard({ ctaButtonLabel: v })}
                                placeholder="e.g. Request a Quote, Contact Us, Partner With Us"
                            />
                            <Field
                                label="CTA Button Destination Link"
                                value={card.ctaButtonHref ?? card.ctaHref ?? ''}
                                onChange={(v) => {
                                    updateCard({
                                        ctaButtonHref: v,
                                        ctaHref: v,
                                    });
                                }}
                                placeholder="e.g. /request-quote, /contact-us, or https://..."
                            />
                        </div>
                    )}
                </div>

                <div className="md:col-span-2">
                    <MediaImageField
                        label={isAiGuide ? 'Article Thumbnail Image' : 'Card Cover Image (Optional)'}
                        value={card.image ?? ''}
                        onChange={(v) => updateCard({ image: v })}
                        previewClassName="h-24"
                    />
                </div>

                {availableCategories.length > 0 && (
                    <div className="md:col-span-2">
                        <CardCategoriesField
                            categories={card.categories ?? (card.category ? [card.category] : [])}
                            availableCategories={availableCategories}
                            pageSlug={pageSlug}
                            onChange={(newCats) => updateCard({ categories: newCats })}
                        />
                    </div>
                )}

                <div className="md:col-span-2">
                    <DocumentUploadField
                        label="Download PDF Document (Optional)"
                        value={card.downloadLink ?? ''}
                        onChange={(v) => updateCard({ downloadLink: v })}
                    />
                </div>
            </div>
        </div>
    );
}
