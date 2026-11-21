import React, { useEffect, useState, useMemo } from 'react';
import {
  Compass,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Search,
  Layers,
  TrendingUp,
  Tag,
  Check,
  X,
  Wand2,
} from 'lucide-react';
import api from '../api/client';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SolutionCard {
  id: number;
  cardSlug: string;
  targetSlug: string;
  sectionAnchor: string | null;
  categorySlug: string;
  subcategorySlug: string | null;
  secondaryCategorySlugs: string[];
  title: string;
  summary: string;
  inclusions: string[];
  badge: string | null;
  imageUrl: string | null;
  keywords: string[];
  institutionTypes: string[];
  relatedCardSlugs: string[];
  priority: number;
  active: boolean;
  targetPageExists?: boolean;
  targetPagePublished?: boolean;
  targetPageTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageLookup {
  id: number;
  slug: string;
  title: string;
  template: string | null;
  published: boolean;
  group: string;
}

interface TaxonomyCategory {
  id: string;
  label: string;
  shortLabel: string;
  letterCode: string;
  iconName?: string;
  subcategories: string[];
}

interface TaxonomyInstitution {
  id: string;
  label: string;
  shortLabel: string;
}

interface TaxonomyStore {
  categories: TaxonomyCategory[];
  institutions: TaxonomyInstitution[];
  popularSearchPrompts: string[];
}

interface SearchQueryLog {
  id: number;
  queryText: string;
  institutionType: string | null;
  categorySlug: string | null;
  matchedCardSlugs: string[];
  matchedCount: number;
  confidenceScore: number | null;
  userIp: string | null;
  converted: boolean;
  createdAt: string;
}

interface AnalyticsStats {
  totalSearches: number;
  zeroMatchCount: number;
  zeroMatchRate: number;
  convertedCount: number;
  conversionRate: number;
  recentUnmetQueries: Array<{
    id: number;
    queryText: string;
    institutionType: string | null;
    categorySlug: string | null;
    createdAt: string;
  }>;
}

interface CacheStatus {
  initialized: boolean;
  version: string;
  activeCardsCount: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SolutionsFinderManager() {
  const [activeTab, setActiveTab] = useState<'cards' | 'taxonomy' | 'analytics'>('cards');

  // Cache Diagnostics
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cards State
  const [cards, setCards] = useState<SolutionCard[]>([]);
  const [pagesLookup, setPagesLookup] = useState<PageLookup[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<SolutionCard | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Card Form State
  const [formCardSlug, setFormCardSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formTargetSlug, setFormTargetSlug] = useState('');
  const [formSectionAnchor, setFormSectionAnchor] = useState('');
  const [formCategorySlug, setFormCategorySlug] = useState('campus-design');
  const [formSubcategorySlug, setFormSubcategorySlug] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formInclusions, setFormInclusions] = useState<[string, string, string]>(['', '', '']);
  const [formBadge, setFormBadge] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formKeywordsText, setFormKeywordsText] = useState('');
  const [formInstitutionTypes, setFormInstitutionTypes] = useState<string[]>([]);
  const [formRelatedCardSlugs, setFormRelatedCardSlugs] = useState<string[]>([]);
  const [formPriority, setFormPriority] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Taxonomy State
  const [taxonomy, setTaxonomy] = useState<TaxonomyStore | null>(null);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
  const [savingTaxonomy, setSavingTaxonomy] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [newSubcatInput, setNewSubcatInput] = useState<{ [catId: string]: string }>({});
  const [newPromptInput, setNewPromptInput] = useState('');

  // Analytics & Logs State
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [logs, setLogs] = useState<SearchQueryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [unmatchedOnlyFilter, setUnmatchedOnlyFilter] = useState(false);
  const [logsCategoryFilter, setLogsCategoryFilter] = useState('all');
  const [logsSearchText, setLogsSearchText] = useState('');

  // Toast Notification Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchCacheStatus = async () => {
    try {
      const res = await api.get('/admin/solutions-finder/cache-status');
      setCacheStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch cache status', err);
    }
  };

  const fetchCardsAndPages = async () => {
    setLoadingCards(true);
    try {
      const [cardsRes, pagesRes] = await Promise.all([
        api.get('/admin/solutions-finder/cards'),
        api.get('/admin/solutions-finder/pages-lookup'),
      ]);
      setCards(cardsRes.data);
      setPagesLookup(pagesRes.data);
    } catch (err) {
      console.error('Failed to fetch cards or pages', err);
      showToast('Error loading solution cards');
    } finally {
      setLoadingCards(false);
    }
  };

  const fetchTaxonomy = async () => {
    setLoadingTaxonomy(true);
    try {
      const res = await api.get('/admin/solutions-finder/taxonomy');
      setTaxonomy(res.data);
    } catch (err) {
      console.error('Failed to fetch taxonomy', err);
      showToast('Error loading taxonomy');
    } finally {
      setLoadingTaxonomy(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/solutions-finder/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics stats', err);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const params: any = { page, limit: 25 };
      if (unmatchedOnlyFilter) params.unmatchedOnly = 'true';
      if (logsCategoryFilter !== 'all') params.category = logsCategoryFilter;
      if (logsSearchText.trim()) params.search = logsSearchText.trim();

      const res = await api.get('/admin/solutions-finder/logs', { params });
      setLogs(res.data.items || []);
      setLogsPage(res.data.page || 1);
      setLogsTotalPages(res.data.totalPages || 1);
      setLogsTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch search logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
    fetchCardsAndPages();
    fetchTaxonomy();
    fetchStats();
    fetchLogs(1);
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchLogs(1);
      fetchStats();
    }
  }, [unmatchedOnlyFilter, logsCategoryFilter]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleRebuildCache = async () => {
    setIsRebuilding(true);
    try {
      const res = await api.post('/admin/solutions-finder/rebuild-cache');
      setCacheStatus({
        initialized: true,
        version: res.data.version,
        activeCardsCount: res.data.activeCardsCount || res.data.count,
      });
      showToast(`RAM cache rebuilt (v:${res.data.version.slice(0, 8)})`);
      fetchCardsAndPages();
    } catch (err) {
      console.error('Failed to rebuild cache', err);
      showToast('Failed to rebuild RAM cache');
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await api.patch(`/admin/solutions-finder/cards/${id}/toggle-active`);
      setCards(prev => prev.map(c => (c.id === id ? { ...c, active: res.data.active } : c)));
      showToast(`Card ${res.data.active ? 'activated' : 'deactivated'}`);
      fetchCacheStatus();
    } catch (err) {
      console.error('Failed to toggle card active', err);
      showToast('Failed to toggle card status');
    }
  };

  const handleDeleteCard = async (id: number) => {
    try {
      await api.delete(`/admin/solutions-finder/cards/${id}`);
      setCards(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmId(null);
      showToast('Card deleted successfully');
      fetchCacheStatus();
    } catch (err) {
      console.error('Failed to delete card', err);
      showToast('Failed to delete card');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = (prefillQuery?: string) => {
    setEditingCard(null);
    setFormTitle(prefillQuery || '');
    setFormCardSlug(prefillQuery ? prefillQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
    setSlugManuallyEdited(false);
    setFormTargetSlug(pagesLookup[0]?.slug || '');
    setFormSectionAnchor('');
    setFormCategorySlug(taxonomy?.categories[0]?.id || 'campus-design');
    setFormSubcategorySlug('');
    setFormSummary('');
    setFormInclusions(['', '', '']);
    setFormBadge('');
    setFormImageUrl('');
    setFormKeywordsText(prefillQuery || '');
    setFormInstitutionTypes(['all']);
    setFormRelatedCardSlugs([]);
    setFormPriority(0);
    setFormActive(true);
    setFormError(null);
    setCardModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (card: SolutionCard) => {
    setEditingCard(card);
    setFormTitle(card.title);
    setFormCardSlug(card.cardSlug);
    setSlugManuallyEdited(true);
    setFormTargetSlug(card.targetSlug);
    setFormSectionAnchor(card.sectionAnchor || '');
    setFormCategorySlug(card.categorySlug);
    setFormSubcategorySlug(card.subcategorySlug || '');
    setFormSummary(card.summary);
    setFormInclusions([
      card.inclusions[0] || '',
      card.inclusions[1] || '',
      card.inclusions[2] || '',
    ]);
    setFormBadge(card.badge || '');
    setFormImageUrl(card.imageUrl || '');
    setFormKeywordsText((card.keywords || []).join(', '));
    setFormInstitutionTypes(card.institutionTypes || []);
    setFormRelatedCardSlugs(card.relatedCardSlugs || []);
    setFormPriority(card.priority);
    setFormActive(card.active);
    setFormError(null);
    setCardModalOpen(true);
  };

  // Auto-slug generator on Title typing
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!slugManuallyEdited && !editingCard) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormCardSlug(generated);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formTitle.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formCardSlug.trim() || !/^[a-z0-9-]+$/.test(formCardSlug.trim())) {
      setFormError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }
    if (!formTargetSlug.trim()) {
      setFormError('Target page selection is required');
      return;
    }
    if (!formSummary.trim() || formSummary.trim().length < 10) {
      setFormError('Summary is required and must be at least 10 characters');
      return;
    }
    if (!formInclusions[0].trim() || !formInclusions[1].trim() || !formInclusions[2].trim()) {
      setFormError('Strict Invariant: Exactly 3 non-empty inclusions are required');
      return;
    }

    const payload = {
      cardSlug: formCardSlug.trim(),
      targetSlug: formTargetSlug.trim(),
      sectionAnchor: formSectionAnchor.trim() || undefined,
      categorySlug: formCategorySlug.trim(),
      subcategorySlug: formSubcategorySlug.trim() || undefined,
      title: formTitle.trim(),
      summary: formSummary.trim(),
      inclusions: [
        formInclusions[0].trim(),
        formInclusions[1].trim(),
        formInclusions[2].trim(),
      ],
      badge: formBadge.trim() || undefined,
      imageUrl: formImageUrl.trim() || undefined,
      keywords: formKeywordsText.split(',').map(k => k.trim()).filter(Boolean),
      institutionTypes: formInstitutionTypes,
      relatedCardSlugs: formRelatedCardSlugs,
      priority: Number(formPriority) || 0,
      active: formActive,
    };

    setIsSavingCard(true);
    try {
      if (editingCard) {
        const res = await api.put(`/admin/solutions-finder/cards/${editingCard.id}`, payload);
        setCards(prev => prev.map(c => (c.id === editingCard.id ? res.data : c)));
        showToast(`Card "${res.data.cardSlug}" updated successfully`);
      } else {
        const res = await api.post('/admin/solutions-finder/cards', payload);
        setCards(prev => [res.data, ...prev]);
        showToast(`Card "${res.data.cardSlug}" created successfully`);
      }
      setCardModalOpen(false);
      fetchCacheStatus();
    } catch (err: any) {
      console.error('Failed to save card', err);
      const errMsg = err.response?.data?.error || 'Failed to save solution card';
      setFormError(errMsg);
    } finally {
      setIsSavingCard(false);
    }
  };

  // ─── Taxonomy Actions ────────────────────────────────────────────────────────

  const handleAddSubcategory = (catId: string) => {
    const inputVal = newSubcatInput[catId]?.trim();
    if (!inputVal || !taxonomy) return;

    setTaxonomy({
      ...taxonomy,
      categories: taxonomy.categories.map(cat => {
        if (cat.id === catId) {
          const exists = cat.subcategories.includes(inputVal);
          return {
            ...cat,
            subcategories: exists ? cat.subcategories : [...cat.subcategories, inputVal],
          };
        }
        return cat;
      }),
    });
    setNewSubcatInput({ ...newSubcatInput, [catId]: '' });
  };

  const handleRemoveSubcategory = (catId: string, subcat: string) => {
    if (!taxonomy) return;
    setTaxonomy({
      ...taxonomy,
      categories: taxonomy.categories.map(cat => {
        if (cat.id === catId) {
          return {
            ...cat,
            subcategories: cat.subcategories.filter(s => s !== subcat),
          };
        }
        return cat;
      }),
    });
  };

  const handleAddPrompt = () => {
    if (!newPromptInput.trim() || !taxonomy) return;
    const clean = newPromptInput.trim();
    if (!taxonomy.popularSearchPrompts.includes(clean)) {
      setTaxonomy({
        ...taxonomy,
        popularSearchPrompts: [...taxonomy.popularSearchPrompts, clean],
      });
    }
    setNewPromptInput('');
  };

  const handleRemovePrompt = (prompt: string) => {
    if (!taxonomy) return;
    setTaxonomy({
      ...taxonomy,
      popularSearchPrompts: taxonomy.popularSearchPrompts.filter(p => p !== prompt),
    });
  };

  const handleSaveTaxonomy = async () => {
    if (!taxonomy) return;
    setSavingTaxonomy(true);
    setTaxonomyError(null);
    try {
      await api.put('/admin/solutions-finder/taxonomy', taxonomy);
      showToast('Taxonomy successfully saved & RAM index updated');
      fetchCacheStatus();
    } catch (err: any) {
      console.error('Failed to save taxonomy', err);
      const msg = err.response?.data?.error || 'Failed to save taxonomy';
      setTaxonomyError(msg);
    } finally {
      setSavingTaxonomy(false);
    }
  };

  // ─── Filtered Cards ─────────────────────────────────────────────────────────

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch =
        card.title.toLowerCase().includes(cardSearch.toLowerCase()) ||
        card.cardSlug.toLowerCase().includes(cardSearch.toLowerCase()) ||
        card.targetSlug.toLowerCase().includes(cardSearch.toLowerCase()) ||
        (card.summary && card.summary.toLowerCase().includes(cardSearch.toLowerCase()));

      const matchesCategory =
        selectedCategoryFilter === 'all' || card.categorySlug === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [cards, cardSearch, selectedCategoryFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ─── Top Toast ─────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ─── Header & Cache Status ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Solutions Finder Manager
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Manage AI-curated catalogue cards, Categories A–J, and buyer search analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Cache Status Badge & Manual Rebuild */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">
              RAM Cache: {cacheStatus?.activeCardsCount ?? cards.filter(c => c.active).length} Active Cards
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] font-mono text-slate-500 uppercase">
            v:{cacheStatus?.version ? cacheStatus.version.slice(0, 8) : 'syncing'}
          </span>
          <button
            onClick={handleRebuildCache}
            disabled={isRebuilding}
            title="Force immediate cache recompile"
            className="ml-2 p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Tab Navigation Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'cards'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Solution Cards</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
            {cards.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('taxonomy')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'taxonomy'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Infrastructure Domains</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Search Analytics & Logs</span>
          {stats && stats.zeroMatchCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
              {stats.zeroMatchCount} Unmet
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: SOLUTION CARDS ─────────────────────────────────────────── */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cards, slugs, URLs..."
                  value={cardSearch}
                  onChange={e => setCardSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {taxonomy?.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenCreateModal()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Solution Card</span>
            </button>
          </div>

          {/* Cards Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Solution Card</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Destination Page</th>
                    <th className="py-3.5 px-4">Key Deliverables</th>
                    <th className="py-3.5 px-4 text-center">Priority</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingCards ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading solution catalogue cards...
                      </td>
                    </tr>
                  ) : filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No solution cards match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map(card => (
                      <tr key={card.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleActive(card.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              card.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                card.active ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            />
                            {card.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Title & Badge */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{card.title}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">
                            slug: {card.cardSlug}
                          </div>
                          {card.badge && (
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                              {card.badge}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                            {card.categorySlug}
                          </span>
                        </td>

                        {/* Destination Page */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900 text-xs">
                            {card.targetPageTitle || card.targetSlug}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-blue-600">/{card.targetSlug}</span>
                            <a
                              href={`/${card.targetSlug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-blue-600"
                              title="View Page"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* Inclusions (Strict 3) */}
                        <td className="py-3.5 px-4">
                          <ul className="text-xs text-gray-600 space-y-0.5 max-w-xs">
                            {card.inclusions.map((inc, i) => (
                              <li key={i} className="truncate flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                                <span className="truncate">{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-md text-xs">
                            {card.priority}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(card)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Solution Card"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(card.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Solution Card"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TAXONOMY & CATEGORIES ──────────────────────────────────── */}
      {activeTab === 'taxonomy' && (
        loadingTaxonomy ? (
          <div className="bg-white p-12 rounded-xl text-center text-gray-400 border border-gray-100">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading taxonomy store...
          </div>
        ) : taxonomy ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Categories A through J & Prompts</h2>
              <p className="text-xs text-gray-500">
                Ensure all 10 core letter codes (A–J) remain intact. Subcategories populate the dynamic search tray.
              </p>
            </div>
            <button
              onClick={handleSaveTaxonomy}
              disabled={savingTaxonomy}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{savingTaxonomy ? 'Validating & Saving...' : 'Save Taxonomy'}</span>
            </button>
          </div>

          {taxonomyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{taxonomyError}</span>
            </div>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxonomy.categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{cat.label}</h3>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={cat.shortLabel}
                    onChange={e => {
                      const updated = [...taxonomy.categories];
                      updated[idx].shortLabel = e.target.value;
                      setTaxonomy({ ...taxonomy, categories: updated });
                    }}
                    placeholder="Short pill label"
                    className="text-xs border border-gray-200 rounded px-2.5 py-1 text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Subcategories Tag Manager */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Subcategories & Infrastructure Components
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {cat.subcategories.map(sub => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md"
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(cat.id, sub)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add component..."
                      value={newSubcatInput[cat.id] || ''}
                      onChange={e =>
                        setNewSubcatInput({ ...newSubcatInput, [cat.id]: e.target.value })
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubcategory(cat.id);
                        }
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubcategory(cat.id)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Popular Search Prompts Tray */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-gray-900">Popular Search Prompt Trays</h3>
              <p className="text-xs text-gray-500">
                Clickable chips displayed under the homepage AI search bar for 1-click discovery.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {taxonomy.popularSearchPrompts.map(prompt => (
                <span
                  key={prompt}
                  className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1.5 rounded-full font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  {prompt}
                  <button
                    type="button"
                    onClick={() => handleRemovePrompt(prompt)}
                    className="text-blue-400 hover:text-red-500 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-xl">
              <input
                type="text"
                placeholder="Add suggested prompt (e.g. 50-workstation NVIDIA AI lab)..."
                value={newPromptInput}
                onChange={e => setNewPromptInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPrompt();
                  }
                }}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddPrompt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
              >
                Add Prompt
              </button>
            </div>
          </div>
        </div>
        ) : null
      )}

      {/* ─── TAB 3: SEARCH ANALYTICS & LOGS ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Searches
              </span>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">
                {stats?.totalSearches ?? 0}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Historical telemetry queries</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Zero-Match Rate
              </span>
              <div
                className={`text-2xl font-extrabold mt-1 ${
                  (stats?.zeroMatchRate || 0) > 15 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {stats?.zeroMatchRate ?? 0}%
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {stats?.zeroMatchCount ?? 0} searches matched 0 cards
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Consultation Conversions
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {stats?.convertedCount ?? 0}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {stats?.conversionRate ?? 0}% conversion rate
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Unmatched Demand
              </span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {stats?.recentUnmetQueries?.length ?? 0}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Recent unfulfilled requests</p>
            </div>
          </div>

          {/* Unmatched Query Demand Alert Banner */}
          {stats && stats.recentUnmetQueries && stats.recentUnmetQueries.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Unmet Search Demand (0 Results Returned to Buyers)</span>
              </div>
              <p className="text-xs text-amber-700">
                Institutional buyers submitted these project briefs, but no published cards matched. Click "+ Create Card" to resolve the gap immediately.
              </p>
              <div className="divide-y divide-amber-200/60 bg-white rounded-lg border border-amber-200/80 overflow-hidden">
                {stats.recentUnmetQueries.map(unmet => (
                  <div
                    key={unmet.id}
                    className="p-3 flex items-center justify-between gap-4 text-xs hover:bg-amber-50/50"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">"{unmet.queryText}"</div>
                      <div className="text-gray-400 text-[11px] mt-0.5">
                        Category: {unmet.categorySlug || 'None'} • Institution: {unmet.institutionType || 'All'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('cards');
                        handleOpenCreateModal(unmet.queryText);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Card</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Table Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs by query..."
                  value={logsSearchText}
                  onChange={e => setLogsSearchText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchLogs(1)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unmatchedOnlyFilter}
                  onChange={e => setUnmatchedOnlyFilter(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Zero-Matches Only (0 results)</span>
              </label>

              <select
                value={logsCategoryFilter}
                onChange={e => setLogsCategoryFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {taxonomy?.categories.map(c => (
                  <option key={c.id} value={c.id}>
                    ({c.letterCode}) {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Showing {logs.length} of {logsTotalCount} queries
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Query Text</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4 text-center">Matched</th>
                    <th className="py-3 px-4">Anonymized IP</th>
                    <th className="py-3 px-4 text-center">Converted</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading telemetry query logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No search queries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate">
                          "{log.queryText}"
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {log.categorySlug || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {log.institutionType || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.matchedCount === 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">
                              0 (Unmatched)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              {log.matchedCount}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-400">
                          {log.userIp || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.converted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  disabled={logsPage <= 1}
                  onClick={() => fetchLogs(logsPage - 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-semibold disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  Page {logsPage} of {logsTotalPages}
                </span>
                <button
                  disabled={logsPage >= logsTotalPages}
                  onClick={() => fetchLogs(logsPage + 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CARD CREATE / EDIT MODAL ───────────────────────────────────────── */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCard ? `Edit Solution Card: ${editingCard.cardSlug}` : 'Create New Solution Card'}
              </h3>
              <button
                onClick={() => setCardModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCard} className="space-y-4 text-sm">
              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Card Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="e.g. Turnkey AI & GPU Center of Excellence"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Card Slug (Unique Key) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formCardSlug}
                      onChange={e => {
                        setFormCardSlug(e.target.value);
                        setSlugManuallyEdited(true);
                      }}
                      placeholder="e.g. turnkey-ai-coe"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const generated = formTitle
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '');
                        setFormCardSlug(generated);
                      }}
                      title="Regenerate slug from title"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Page Selector (Zero Dead Links Invariant) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Destination Page *
                </label>
                <select
                  required
                  value={formTargetSlug}
                  onChange={e => setFormTargetSlug(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select destination page...</option>
                  {pagesLookup
                    .filter(p => p.published)
                    .map(p => (
                      <option key={p.id} value={p.slug}>
                        {p.title} (/{p.slug})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Clicking "Explore Solution" on the card navigates directly to /{formTargetSlug || '{targetSlug}'}
                </p>
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Primary Domain / Category *
                  </label>
                  <select
                    required
                    value={formCategorySlug}
                    onChange={e => setFormCategorySlug(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {taxonomy?.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Badge Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={e => setFormBadge(e.target.value)}
                    placeholder="e.g. Turnkey Suite, Flagship Tech"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Executive Summary (1–2 Sentences) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  placeholder="Comprehensive physical deliverable summary for institutional decision makers..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Strict 3 Inclusions (Enforcing Invariant) */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Key Physical Inclusions (Strictly 3 Required)
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700">
                    {[formInclusions[0], formInclusions[1], formInclusions[2]].filter(s => s.trim()).length}/3 Complete
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={formInclusions[0]}
                    onChange={e => setFormInclusions([e.target.value, formInclusions[1], formInclusions[2]])}
                    placeholder="Inclusion 1 (e.g. 50x High-TFLOPS Workstations with Liquid Cooling)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    required
                    value={formInclusions[1]}
                    onChange={e => setFormInclusions([formInclusions[0], e.target.value, formInclusions[2]])}
                    placeholder="Inclusion 2 (e.g. Dedicated Server Rack, UPS Power Backup & Smart PDU)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    required
                    value={formInclusions[2]}
                    onChange={e => setFormInclusions([formInclusions[0], formInclusions[1], e.target.value])}
                    placeholder="Inclusion 3 (e.g. Faculty Master Training & AI Curriculum Stack)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Keywords Tag Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  NLP Search Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={formKeywordsText}
                  onChange={e => setFormKeywordsText(e.target.value)}
                  placeholder="e.g. ai lab, nvidia, gpu cluster, machine learning"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Priority & Active Toggles */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-700">Display Priority:</label>
                  <input
                    type="number"
                    value={formPriority}
                    onChange={e => setFormPriority(Number(e.target.value))}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={e => setFormActive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-gray-700">Active in Catalogue</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingCard ? 'Saving...' : editingCard ? 'Update Card' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delete Solution Card</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete this card? References to this card in cross-sell lists will be cleanly removed, and the RAM index will recompile immediately.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCard(deleteConfirmId)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
