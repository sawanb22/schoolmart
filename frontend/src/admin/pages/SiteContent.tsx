import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Save,
    RotateCcw,
    Facebook,
    Twitter,
    Youtube,
    Instagram,
    Linkedin,
    Link2,
    Building2,
    Layers,
    Sparkles,
    ShieldCheck,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import api from '../api/client';
import { broadcastCmsInvalidation } from '@/hooks/usePageData';
import {
    DEFAULT_ABOUT_TEXT,
    DEFAULT_ABOUT_LINKS,
    DEFAULT_BUSINESS_LINKS,
    DEFAULT_CATEGORIES,
    DEFAULT_BRANDS,
    DEFAULT_TRENDING,
    DEFAULT_COPYRIGHT,
    DEFAULT_POLICY_LINKS,
    type FooterLinkItem,
    type FooterCategoryItem,
} from '@/components/layout/footer';
import {
    DEFAULT_HEADER_NAV,
    type NavItem,
} from '@/components/layout/header';

interface ContentMap { [key: string]: string; }

interface FooterSettings {
    aboutText: string;
    aboutLinks: FooterLinkItem[];
    businessLinks: FooterLinkItem[];
    categories: FooterCategoryItem[];
    brands: FooterLinkItem[];
    trending: FooterLinkItem[];
    copyright: string;
    policyLinks: FooterLinkItem[];
}

const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
    aboutText: DEFAULT_ABOUT_TEXT,
    aboutLinks: DEFAULT_ABOUT_LINKS,
    businessLinks: DEFAULT_BUSINESS_LINKS,
    categories: DEFAULT_CATEGORIES,
    brands: DEFAULT_BRANDS,
    trending: DEFAULT_TRENDING,
    copyright: DEFAULT_COPYRIGHT,
    policyLinks: DEFAULT_POLICY_LINKS,
};

function normalizeFooterSettings(raw: any): FooterSettings {
    if (!raw) return DEFAULT_FOOTER_SETTINGS;
    let data = raw;
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw);
        } catch {
            return DEFAULT_FOOTER_SETTINGS;
        }
    }
    if (!data || typeof data !== 'object') return DEFAULT_FOOTER_SETTINGS;

    return {
        aboutText: typeof data.aboutText === 'string' && data.aboutText.trim() ? data.aboutText : DEFAULT_FOOTER_SETTINGS.aboutText,
        aboutLinks: Array.isArray(data.aboutLinks) && data.aboutLinks.length > 0 ? data.aboutLinks : DEFAULT_FOOTER_SETTINGS.aboutLinks,
        businessLinks: Array.isArray(data.businessLinks) && data.businessLinks.length > 0 ? data.businessLinks : DEFAULT_FOOTER_SETTINGS.businessLinks,
        categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : DEFAULT_FOOTER_SETTINGS.categories,
        brands: Array.isArray(data.brands) && data.brands.length > 0 ? data.brands : DEFAULT_FOOTER_SETTINGS.brands,
        trending: Array.isArray(data.trending) && data.trending.length > 0 ? data.trending : DEFAULT_FOOTER_SETTINGS.trending,
        copyright: typeof data.copyright === 'string' && data.copyright.trim() ? data.copyright : DEFAULT_FOOTER_SETTINGS.copyright,
        policyLinks: Array.isArray(data.policyLinks) && data.policyLinks.length > 0 ? data.policyLinks : DEFAULT_FOOTER_SETTINGS.policyLinks,
    };
}

function normalizeHeaderNav(raw: any): NavItem[] {
    if (!raw) return DEFAULT_HEADER_NAV;
    let data = raw;
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw);
        } catch {
            return DEFAULT_HEADER_NAV;
        }
    }
    if (!Array.isArray(data) || data.length === 0) return DEFAULT_HEADER_NAV;
    return data.map((item) => ({
        label: typeof item.label === 'string' ? item.label : '',
        href: typeof item.href === 'string' ? item.href : '',
        hasDropdown: Boolean(item.hasDropdown),
        dropdownItems: Array.isArray(item.dropdownItems)
            ? item.dropdownItems.map((sub: any) => ({
                label: typeof sub.label === 'string' ? sub.label : '',
                href: typeof sub.href === 'string' ? sub.href : '',
            }))
            : [],
    }));
}

const CONTENT_LABELS: Record<string, string> = {
    about_text: 'About Text',
    contact_phone: 'Primary Contact Phone',
    contact_phone_alt: 'Alternate Contact Phone',
    contact_email: 'Primary Contact Email',
    contact_email_alt: 'Secondary / Support Email',
    contact_whatsapp: 'WhatsApp Business Number',
    contact_hours: 'Working Hours',
    contact_address: 'Contact Address',
};

const SOCIAL_LINKS: { key: string; label: string; icon: typeof Facebook; placeholder: string }[] = [
    { key: 'social_facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://www.facebook.com/yourpage' },
    { key: 'social_twitter', label: 'X (Twitter)', icon: Twitter, placeholder: 'https://x.com/yourhandle' },
    { key: 'social_youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://www.youtube.com/@yourchannel' },
    { key: 'social_instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://www.instagram.com/yourpage' },
    { key: 'social_linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://www.linkedin.com/company/yourpage' },
    { key: 'social_pinterest', label: 'Pinterest', icon: Link2, placeholder: 'https://in.pinterest.com/yourpage' },
];

const HOMEPAGE_MANAGED_KEYS = new Set([
    'home_hero',
    'home_features',
    'home_services',
    'home_sidebar',
    'home_categories',
    'ticker_announcements',
    'collaborations',
    'home_faqs',
]);

function LinkRowEditor({
    link,
    index,
    onChange,
    onRemove,
    labelPlaceholder = 'Link Label',
    hrefPlaceholder = '/page-url',
}: {
    link: FooterLinkItem;
    index: number;
    onChange: (index: number, field: 'label' | 'href', value: string) => void;
    onRemove: (index: number) => void;
    labelPlaceholder?: string;
    hrefPlaceholder?: string;
}) {
    return (
        <div className="flex items-center gap-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
            <span className="text-[10px] font-bold text-gray-400 w-5 text-center shrink-0">#{index + 1}</span>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                    type="text"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    placeholder={labelPlaceholder}
                    value={link.label}
                    onChange={(e) => onChange(index, 'label', e.target.value)}
                />
                <input
                    type="text"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    placeholder={hrefPlaceholder}
                    value={link.href}
                    onChange={(e) => onChange(index, 'href', e.target.value)}
                />
            </div>
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Remove link"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function SiteContent() {
    const [content, setContent] = useState<ContentMap>({});
    const [original, setOriginal] = useState<ContentMap>({});
    const [headerNav, setHeaderNav] = useState<NavItem[]>(DEFAULT_HEADER_NAV);
    const [footerSettings, setFooterSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
    const [activeFooterTab, setActiveFooterTab] = useState<'about_business' | 'categories' | 'brands_trending' | 'copyright_policies'>('about_business');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const fetch = async () => {
        const { data } = await api.get('/content');
        setContent(data);
        setOriginal(data);
        setHeaderNav(normalizeHeaderNav(data?.header_navigation));
        setFooterSettings(normalizeFooterSettings(data?.footer_settings));
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const updateHeaderNav = (updater: (prev: NavItem[]) => NavItem[]) => {
        setHeaderNav((prev) => {
            const next = updater(prev);
            setContent((prevContent) => ({
                ...prevContent,
                header_navigation: JSON.stringify(next),
            }));
            return next;
        });
    };

    const updateFooterSettings = (updater: (prev: FooterSettings) => FooterSettings) => {
        setFooterSettings((prev) => {
            const next = updater(prev);
            setContent((prevContent) => ({
                ...prevContent,
                footer_settings: JSON.stringify(next),
            }));
            return next;
        });
    };

    const save = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            // Filter out keys managed exclusively by HomepageEditor
            const payload: ContentMap = {};
            for (const [key, value] of Object.entries(content)) {
                if (!HOMEPAGE_MANAGED_KEYS.has(key)) {
                    payload[key] = value;
                }
            }
            await api.put('/content', payload);
            setOriginal(content);
            setSaved(true);

            // Broadcast cache invalidation across all tabs
            broadcastCmsInvalidation({ type: 'INVALIDATE_ALL' });

            setTimeout(() => setSaved(false), 2000);
        } catch (err: any) {
            console.error('Failed to save site content:', err);
            const msg = err?.response?.data?.error || 'Failed to save changes. Please try again.';
            setSaveError(msg);
            alert(`Save failed: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify(content) !== JSON.stringify(original);

    if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Sticky Header Editor Actions */}
            <div className="sticky top-0 z-[60] -mx-6 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between mb-8 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Site Content</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Global website text, navigation links, and contact details</p>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <button onClick={fetch} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Reset
                        </button>
                    )}
                    <button onClick={save} disabled={saving || !hasChanges}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 ${saving || !hasChanges ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : saved ? '✓ Changes Saved!' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {saveError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center justify-between">
                    <span>⚠️ {saveError}</span>
                    <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
                </div>
            )}

            <div className="space-y-8">
                {/* Website Settings Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            Website Content
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(CONTENT_LABELS).map(([key, label]) => {
                            const isMultiline = key.includes('subtitle') || key.includes('text') || key.includes('address') || key.includes('hours');
                            return (
                                <div key={key} className={isMultiline ? "col-span-full space-y-1.5" : "space-y-1.5"}>
                                    <label className="block text-sm font-bold text-gray-700">{label}</label>
                                    {isMultiline ? (
                                        <textarea
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm"
                                            rows={3}
                                            value={content[key] || ''}
                                            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                                        />
                                    ) : (
                                        <input
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={content[key] || ''}
                                            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Social Media Links Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            Social Media Links
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Shown in the site header and footer. Leave a field blank to hide that icon.</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {SOCIAL_LINKS.map(({ key, label, icon: Icon, placeholder }) => (
                            <div key={key} className="space-y-1.5">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Icon className="w-4 h-4 text-blue-600" /> {label}
                                </label>
                                <input
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder={placeholder}
                                    value={content[key] || ''}
                                    onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Header Navigation Bar Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                Main Header Navigation Strip
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Edit, add, reorder, or remove items and dropdown menus in the main website header navigation bar.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => updateHeaderNav(() => [...DEFAULT_HEADER_NAV])}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                                title="Reset navigation to standard SchoolMart layout"
                            >
                                Reset to SchoolMart Standard
                            </button>
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {headerNav.length} Items
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {headerNav.map((item, idx) => (
                            <div key={idx} className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3 transition hover:border-gray-300">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => {
                                                if (idx === 0) return;
                                                updateHeaderNav((prev) => {
                                                    const copy = [...prev];
                                                    const temp = copy[idx - 1];
                                                    copy[idx - 1] = copy[idx];
                                                    copy[idx] = temp;
                                                    return copy;
                                                });
                                            }}
                                            className={`p-1 rounded text-gray-500 hover:bg-gray-200 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={idx === headerNav.length - 1}
                                            onClick={() => {
                                                if (idx === headerNav.length - 1) return;
                                                updateHeaderNav((prev) => {
                                                    const copy = [...prev];
                                                    const temp = copy[idx + 1];
                                                    copy[idx + 1] = copy[idx];
                                                    copy[idx] = temp;
                                                    return copy;
                                                });
                                            }}
                                            className={`p-1 rounded text-gray-500 hover:bg-gray-200 ${idx === headerNav.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>

                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Button Label</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                                placeholder="e.g. Corporate"
                                                value={item.label}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateHeaderNav((prev) => {
                                                        const copy = [...prev];
                                                        copy[idx] = { ...copy[idx], label: val };
                                                        return copy;
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Target URL / Path</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                                placeholder="e.g. /corporate or https://..."
                                                value={item.href || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateHeaderNav((prev) => {
                                                        const copy = [...prev];
                                                        copy[idx] = { ...copy[idx], href: val };
                                                        return copy;
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 pt-4">
                                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={!!item.hasDropdown}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    updateHeaderNav((prev) => {
                                                        const copy = [...prev];
                                                        copy[idx] = {
                                                            ...copy[idx],
                                                            hasDropdown: checked,
                                                            dropdownItems: checked && (!copy[idx].dropdownItems || copy[idx].dropdownItems.length === 0)
                                                                ? [{ label: '', href: '' }]
                                                                : copy[idx].dropdownItems,
                                                        };
                                                        return copy;
                                                    });
                                                }}
                                            />
                                            Submenu
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateHeaderNav((prev) => prev.filter((_, i) => i !== idx));
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Navigation Item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Dropdown Submenu Editor */}
                                {item.hasDropdown && (
                                    <div className="ml-8 mt-2 p-3 bg-white rounded-xl border border-blue-100 space-y-2.5">
                                        <div className="flex items-center justify-between text-xs font-bold text-blue-900 border-b border-blue-50 pb-1.5">
                                            <span>Submenu Items under &ldquo;{item.label || 'Item'}&rdquo;</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateHeaderNav((prev) => {
                                                        const copy = [...prev];
                                                        const items = copy[idx].dropdownItems ? [...copy[idx].dropdownItems] : [];
                                                        items.push({ label: '', href: '' });
                                                        copy[idx] = { ...copy[idx], dropdownItems: items };
                                                        return copy;
                                                    });
                                                }}
                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Sub-item
                                            </button>
                                        </div>

                                        {(item.dropdownItems || []).map((subItem, subIdx) => (
                                            <div key={subIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                <span className="text-[10px] font-bold text-slate-400 w-4 text-center">#{subIdx + 1}</span>
                                                <input
                                                    type="text"
                                                    placeholder="Sub-item Label (e.g. About Us)"
                                                    value={subItem.label}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateHeaderNav((prev) => {
                                                            const copy = [...prev];
                                                            const subList = [...(copy[idx].dropdownItems || [])];
                                                            subList[subIdx] = { ...subList[subIdx], label: val };
                                                            copy[idx] = { ...copy[idx], dropdownItems: subList };
                                                            return copy;
                                                        });
                                                    }}
                                                    className="flex-1 border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Sub-item URL (e.g. /about-us)"
                                                    value={subItem.href}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateHeaderNav((prev) => {
                                                            const copy = [...prev];
                                                            const subList = [...(copy[idx].dropdownItems || [])];
                                                            subList[subIdx] = { ...subList[subIdx], href: val };
                                                            copy[idx] = { ...copy[idx], dropdownItems: subList };
                                                            return copy;
                                                        });
                                                    }}
                                                    className="flex-1 border border-gray-200 rounded px-2.5 py-1 text-xs bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateHeaderNav((prev) => {
                                                            const copy = [...prev];
                                                            const subList = (copy[idx].dropdownItems || []).filter((_, i) => i !== subIdx);
                                                            copy[idx] = { ...copy[idx], dropdownItems: subList };
                                                            return copy;
                                                        });
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                                                    title="Remove sub-item"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                updateHeaderNav((prev) => [
                                    ...prev,
                                    { label: 'New Link', href: '/', hasDropdown: false, dropdownItems: [] },
                                ]);
                            }}
                            className="w-full py-2.5 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 hover:bg-blue-50/60 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                        >
                            <Plus className="w-4 h-4" /> Add Header Navigation Item
                        </button>
                    </div>
                </div>

                {/* Footer Settings & Navigation Links Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                Footer Settings &amp; Navigation Links
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Manage all footer columns, navigation links, categories, brands, trending tags, and policy links.
                            </p>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            Dynamic CMS
                        </span>
                    </div>

                    {/* Clean Tabs */}
                    <div className="border-b border-gray-200 bg-gray-50/40 p-2 flex gap-1 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setActiveFooterTab('about_business')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeFooterTab === 'about_business'
                                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            1. About &amp; Business Links
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFooterTab('categories')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeFooterTab === 'categories'
                                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            2. Category Columns ({footerSettings.categories.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFooterTab('brands_trending')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeFooterTab === 'brands_trending'
                                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            3. Brands &amp; Trending
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFooterTab('copyright_policies')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeFooterTab === 'copyright_policies'
                                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            4. Copyright &amp; Policies
                        </button>
                    </div>

                    {/* Tab Body */}
                    <div className="p-6">
                        {/* Tab 1: About & Business Links */}
                        {activeFooterTab === 'about_business' && (
                            <div className="space-y-6">
                                {/* About Us Blurb */}
                                <div className="space-y-1.5 pb-6 border-b border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700">About Us Footer Description</label>
                                    <p className="text-xs text-gray-500">Short intro blurb shown under the About Us column in the footer.</p>
                                    <textarea
                                        rows={3}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm"
                                        value={footerSettings.aboutText}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateFooterSettings((prev) => ({ ...prev, aboutText: val }));
                                        }}
                                    />
                                </div>

                                {/* About Links */}
                                <div className="space-y-3 pb-6 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800">About Us Links</h4>
                                            <p className="text-xs text-gray-500">Links listed directly under the About Us intro blurb</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateFooterSettings((prev) => ({
                                                    ...prev,
                                                    aboutLinks: [...prev.aboutLinks, { label: 'New Link', href: '/how-it-works' }],
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Add About Link
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {footerSettings.aboutLinks.map((link, idx) => (
                                            <LinkRowEditor
                                                key={idx}
                                                link={link}
                                                index={idx}
                                                onChange={(i, field, val) => {
                                                    const updated = [...footerSettings.aboutLinks];
                                                    updated[i] = { ...updated[i], [field]: val };
                                                    updateFooterSettings((prev) => ({ ...prev, aboutLinks: updated }));
                                                }}
                                                onRemove={(i) => {
                                                    const updated = footerSettings.aboutLinks.filter((_, idx2) => idx2 !== i);
                                                    updateFooterSettings((prev) => ({ ...prev, aboutLinks: updated }));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Business Links */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800">Business Links</h4>
                                            <p className="text-xs text-gray-500">Links in the dedicated Business column (About Us, Careers, FAQs, etc.)</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateFooterSettings((prev) => ({
                                                    ...prev,
                                                    businessLinks: [...prev.businessLinks, { label: 'New Link', href: '/contact-us' }],
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Add Business Link
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {footerSettings.businessLinks.map((link, idx) => (
                                            <LinkRowEditor
                                                key={idx}
                                                link={link}
                                                index={idx}
                                                onChange={(i, field, val) => {
                                                    const updated = [...footerSettings.businessLinks];
                                                    updated[i] = { ...updated[i], [field]: val };
                                                    updateFooterSettings((prev) => ({ ...prev, businessLinks: updated }));
                                                }}
                                                onRemove={(i) => {
                                                    const updated = footerSettings.businessLinks.filter((_, idx2) => idx2 !== i);
                                                    updateFooterSettings((prev) => ({ ...prev, businessLinks: updated }));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Category Columns */}
                        {activeFooterTab === 'categories' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Category Columns</h3>
                                        <p className="text-xs text-gray-500">Multi-column product and solution category links</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateFooterSettings((prev) => ({
                                                ...prev,
                                                categories: [
                                                    ...prev.categories,
                                                    { title: 'New Category Column', items: [{ label: 'New Item', href: '/shop' }] },
                                                ],
                                            }));
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition shadow-xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> + Add Category Column
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {footerSettings.categories.map((cat, catIdx) => (
                                        <div key={catIdx} className="bg-gray-50/50 rounded-xl border border-gray-200 p-4 space-y-3 shadow-xs">
                                            <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                                                <input
                                                    type="text"
                                                    className="text-xs font-bold text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                                    value={cat.title}
                                                    placeholder="Column Title (e.g. Furniture)"
                                                    onChange={(e) => {
                                                        const newCats = [...footerSettings.categories];
                                                        newCats[catIdx] = { ...newCats[catIdx], title: e.target.value };
                                                        updateFooterSettings((prev) => ({ ...prev, categories: newCats }));
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`Remove category column "${cat.title}"?`)) {
                                                            const newCats = footerSettings.categories.filter((_, i) => i !== catIdx);
                                                            updateFooterSettings((prev) => ({ ...prev, categories: newCats }));
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition"
                                                    title="Delete Column"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                                {cat.items.map((item, itemIdx) => (
                                                    <div key={itemIdx} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-gray-200">
                                                        <input
                                                            type="text"
                                                            className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 bg-white focus:outline-none"
                                                            placeholder="Label"
                                                            value={item.label}
                                                            onChange={(e) => {
                                                                const newCats = [...footerSettings.categories];
                                                                const newItems = [...newCats[catIdx].items];
                                                                newItems[itemIdx] = { ...newItems[itemIdx], label: e.target.value };
                                                                newCats[catIdx] = { ...newCats[catIdx], items: newItems };
                                                                updateFooterSettings((prev) => ({ ...prev, categories: newCats }));
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            className="text-xs font-mono border border-gray-200 rounded px-2 py-1 flex-1 bg-white focus:outline-none"
                                                            placeholder="/url"
                                                            value={item.href}
                                                            onChange={(e) => {
                                                                const newCats = [...footerSettings.categories];
                                                                const newItems = [...newCats[catIdx].items];
                                                                newItems[itemIdx] = { ...newItems[itemIdx], href: e.target.value };
                                                                newCats[catIdx] = { ...newCats[catIdx], items: newItems };
                                                                updateFooterSettings((prev) => ({ ...prev, categories: newCats }));
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newCats = [...footerSettings.categories];
                                                                newCats[catIdx] = {
                                                                    ...newCats[catIdx],
                                                                    items: newCats[catIdx].items.filter((_, i) => i !== itemIdx),
                                                                };
                                                                updateFooterSettings((prev) => ({ ...prev, categories: newCats }));
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                            title="Remove link"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newCats = [...footerSettings.categories];
                                                    newCats[catIdx] = {
                                                        ...newCats[catIdx],
                                                        items: [...newCats[catIdx].items, { label: 'New Item', href: '/shop' }],
                                                    };
                                                    updateFooterSettings((prev) => ({ ...prev, categories: newCats }));
                                                }}
                                                className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white hover:border-gray-400 flex items-center justify-center gap-1 transition shadow-2xs"
                                            >
                                                <Plus className="w-3 h-3" /> Add Link to {cat.title || 'Column'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Brands & Trending */}
                        {activeFooterTab === 'brands_trending' && (
                            <div className="space-y-6">
                                {/* Brands Section */}
                                <div className="space-y-3 pb-6 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800">Featured Brands</h4>
                                            <p className="text-xs text-gray-500">Partner &amp; equipment brand links</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateFooterSettings((prev) => ({
                                                    ...prev,
                                                    brands: [...prev.brands, { label: 'New Brand', href: '/shop' }],
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Add Brand Link
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {footerSettings.brands.map((link, idx) => (
                                            <LinkRowEditor
                                                key={idx}
                                                link={link}
                                                index={idx}
                                                labelPlaceholder="Brand Name"
                                                hrefPlaceholder="/shop?brand=..."
                                                onChange={(i, field, val) => {
                                                    const updated = [...footerSettings.brands];
                                                    updated[i] = { ...updated[i], [field]: val };
                                                    updateFooterSettings((prev) => ({ ...prev, brands: updated }));
                                                }}
                                                onRemove={(i) => {
                                                    const updated = footerSettings.brands.filter((_, idx2) => idx2 !== i);
                                                    updateFooterSettings((prev) => ({ ...prev, brands: updated }));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Trending Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800">What's Trending</h4>
                                            <p className="text-xs text-gray-500">Trending topics and high-priority solutions</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateFooterSettings((prev) => ({
                                                    ...prev,
                                                    trending: [...prev.trending, { label: 'New Trending Topic', href: '/labs' }],
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Add Trending Link
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {footerSettings.trending.map((link, idx) => (
                                            <LinkRowEditor
                                                key={idx}
                                                link={link}
                                                index={idx}
                                                labelPlaceholder="Trending Topic Label"
                                                hrefPlaceholder="/page-slug"
                                                onChange={(i, field, val) => {
                                                    const updated = [...footerSettings.trending];
                                                    updated[i] = { ...updated[i], [field]: val };
                                                    updateFooterSettings((prev) => ({ ...prev, trending: updated }));
                                                }}
                                                onRemove={(i) => {
                                                    const updated = footerSettings.trending.filter((_, idx2) => idx2 !== i);
                                                    updateFooterSettings((prev) => ({ ...prev, trending: updated }));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 4: Copyright & Policies */}
                        {activeFooterTab === 'copyright_policies' && (
                            <div className="space-y-6">
                                {/* Copyright Input */}
                                <div className="space-y-1.5 pb-6 border-b border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700">Copyright Line</label>
                                    <p className="text-xs text-gray-500">Displayed on the bottom left corner of the footer bar.</p>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={footerSettings.copyright}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateFooterSettings((prev) => ({ ...prev, copyright: val }));
                                        }}
                                    />
                                </div>

                                {/* Policy Links */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800">Policy &amp; Legal Links</h4>
                                            <p className="text-xs text-gray-500">Bottom bar links (Replacement &amp; Return, Privacy Policy, Terms of Use, etc.)</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateFooterSettings((prev) => ({
                                                    ...prev,
                                                    policyLinks: [...prev.policyLinks, { label: 'New Policy', href: '/privacy-policy' }],
                                                }));
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> + Add Policy Link
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {footerSettings.policyLinks.map((link, idx) => (
                                            <LinkRowEditor
                                                key={idx}
                                                link={link}
                                                index={idx}
                                                labelPlaceholder="Policy Title"
                                                hrefPlaceholder="/policy-slug"
                                                onChange={(i, field, val) => {
                                                    const updated = [...footerSettings.policyLinks];
                                                    updated[i] = { ...updated[i], [field]: val };
                                                    updateFooterSettings((prev) => ({ ...prev, policyLinks: updated }));
                                                }}
                                                onRemove={(i) => {
                                                    const updated = footerSettings.policyLinks.filter((_, idx2) => idx2 !== i);
                                                    updateFooterSettings((prev) => ({ ...prev, policyLinks: updated }));
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Homepage Sections Notice */}
                <div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Managing Homepage Sections?</h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Hero Banner, Service Cards, Feature Cards, Categories, Ticker Announcements, and Partner Institutions are structured objects protected from text corruption and managed in the Homepage Editor.
                        </p>
                        <a
                            href="/admin/homepage-editor"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 mt-2.5 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm"
                        >
                            Open Homepage Editor →
                        </a>
                    </div>
                </div>

                {/* Contact Us Page Editor Notice */}
                <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 text-lg">
                        📞
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-amber-950 text-sm">Managing Contact Channels &amp; Page?</h3>
                            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                Phone, WhatsApp, email, hours, and address set here synchronize live with the TopBar, Footer, and Contact Us page. To manage cards or page banners, use the Contact Us page editor.
                            </p>
                        </div>
                        <Link
                            to="/admin/pages"
                            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-2 rounded-xl shadow-xs transition"
                        >
                            Open Contact Us Editor →
                        </Link>
                    </div>
                </div>

                {/* Custom Content Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            Custom Content Keys
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <p className="text-sm text-gray-500">Generic configuration keys for various site components.</p>
                        <div className="space-y-3">
                            {Object.entries(content)
                                .filter(([key]) => !CONTENT_LABELS[key] && !SOCIAL_LINKS.some((s) => s.key === key) && !HOMEPAGE_MANAGED_KEYS.has(key) && key !== 'footer_settings')
                                .map(([key, value]) => (
                                    <div key={key} className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex-shrink-0 w-32 truncate text-xs font-bold bg-blue-50 text-blue-700 px-3 py-2 rounded-lg mt-0.5 border border-blue-100 text-center">{key}</div>
                                        <input
                                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
                                            value={value}
                                            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            <div className="flex gap-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 mt-6">
                                <input id="new-key" className="w-32 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none bg-white" placeholder="new_key" />
                                <input id="new-value" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none bg-white" placeholder="value" />
                                <button
                                    onClick={() => {
                                        const k = (document.getElementById('new-key') as HTMLInputElement).value.trim();
                                        const v = (document.getElementById('new-value') as HTMLInputElement).value.trim();
                                        if (k) setContent({ ...content, [k]: v });
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    + Add New Key
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
