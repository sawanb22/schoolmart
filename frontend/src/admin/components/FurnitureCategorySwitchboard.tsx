import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Eye, EyeOff, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import api from '../api/client';

interface CategoryItem {
    id: number;
    name: string;
    slug: string;
    page: string;
    _count?: { products: number };
}

interface FurnitureCategorySwitchboardProps {
    hiddenCategorySlugs: string[];
    onChange: (slugs: string[]) => void;
}

export default function FurnitureCategorySwitchboard({
    hiddenCategorySlugs = [],
    onChange,
}: FurnitureCategorySwitchboardProps) {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/products/categories', { params: { page: 'furniture' } });
            if (Array.isArray(data)) {
                // Filter out 'uncategorized' and legacy redundant 'furniture' slug from switchboard
                const filtered = data.filter((c: CategoryItem) => c.slug !== 'uncategorized' && c.slug !== 'furniture');
                setCategories(filtered);
            }
        } catch (err: any) {
            console.error('Failed to load furniture categories:', err);
            setError(err?.response?.data?.error || 'Unable to load furniture categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const toggleVisibility = (slug: string) => {
        const isHidden = hiddenCategorySlugs.includes(slug);
        const next = isHidden
            ? hiddenCategorySlugs.filter((s) => s !== slug)
            : [...hiddenCategorySlugs, slug];
        onChange(next);
    };

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                            Furniture Store Categories Switchboard
                        </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Control which category filter tabs are visible to customers on the public <span className="font-mono text-blue-600">/furniture</span> store. Hidden categories skip queries completely.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={loadCategories}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        title="Refresh Category List"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <Link
                        to="/admin/products"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        <span>Manage Products</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading furniture categories...</span>
                </div>
            ) : error ? (
                <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium flex items-center justify-between">
                    <span>{error}</span>
                    <button type="button" onClick={loadCategories} className="font-bold underline text-xs">
                        Retry
                    </button>
                </div>
            ) : categories.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                    No active subcategories found for Furniture. Add categories in <Link to="/admin/categories?mode=products" className="text-blue-600 font-bold underline">Categories Hub</Link>.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat) => {
                        const isHidden = hiddenCategorySlugs.includes(cat.slug);
                        const productCount = cat._count?.products ?? 0;

                        return (
                            <div
                                key={cat.id}
                                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                    isHidden
                                        ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                                        : 'bg-white border-blue-100/80 hover:border-blue-300 text-slate-800 shadow-2xs'
                                }`}
                            >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold truncate ${isHidden ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                            {cat.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                        <span className="font-mono">slug: {cat.slug}</span>
                                        <span>•</span>
                                        <span>{productCount} {productCount === 1 ? 'item' : 'items'}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => toggleVisibility(cat.slug)}
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        isHidden
                                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                    title={isHidden ? 'Click to Show category' : 'Click to Hide category'}
                                >
                                    {isHidden ? (
                                        <>
                                            <EyeOff className="w-3.5 h-3.5" />
                                            <span>Hidden</span>
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Visible</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
