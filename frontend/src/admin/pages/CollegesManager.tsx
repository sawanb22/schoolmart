import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ExternalLink,
  FileText,
  Upload,
  Star,
  Check,
  AlertCircle,
  Settings,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import api from '../api/client';
import {
  fetchAdminPageItems,
  createAdminPageItem,
  updateAdminPageItem,
  deleteAdminPageItem,
  reorderAdminPageItems,
  fetchAdminPageCategories,
  createAdminPageCategory,
} from '../api/pageItems';
import MediaImageField from '../components/MediaImageField';
import HtmlRichTextEditor from '../components/HtmlRichTextEditor';
import RichTextContent from '@/components/common/RichTextContent';
import { PaginationControl } from '@/components/common/PaginationControl';
import { resolveMediaUrl } from '../../lib/media-url';
import { broadcastCmsInvalidation, clearPageDataCache } from '@/hooks/usePageData';

export type Region = 'North' | 'South' | 'East' | 'West';

export interface CollegeListing {
  id?: number;
  version?: number;
  title: string;
  category?: string;
  location?: string;
  region?: Region;
  rating?: string;
  sales?: string;
  margin?: string;
  askingPrice?: string;
  premium?: boolean;
  image?: string;
  images?: string[];
  description: string;
  ndaUrl?: string;
  mandateUrl?: string;
}

interface PageData {
  heroTitle?: string;
  heroSubtitle?: string;
  filterLabel?: string;
  cardDetailsButtonLabel?: string;
  cardContactButtonLabel?: string;
  categories?: string[];
  cards?: CollegeListing[];
  [key: string]: any;
}

interface PageRecord {
  id: number;
  title: string;
  slug: string;
  template: string;
  published: boolean;
  contentModel?: string;
  version?: number;
  pageData: PageData | string;
}

const REGION_OPTIONS: Region[] = ['North', 'South', 'East', 'West'];

const DEFAULT_CATEGORIES: string[] = [
  'CBSE Schools',
  'Playschools & K-12',
  'Private Universities',
  'Residential Schools',
  'International Schools',
  'Colleges & Higher Education',
];

const EMPTY_LISTING: CollegeListing = {
  title: '',
  category: '',
  location: '',
  region: 'North',
  rating: '7.5',
  sales: '',
  margin: '',
  askingPrice: '',
  premium: false,
  image: '',
  images: [],
  description: '',
  ndaUrl: '',
  mandateUrl: '',
};

export default function CollegesManager() {
  const [pageRecord, setPageRecord] = useState<PageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Core Data
  const [cards, setCards] = useState<CollegeListing[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Pagination & Gallery
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');

  // Page Header & Controls Settings
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [cardDetailsButtonLabel, setCardDetailsButtonLabel] = useState('');
  const [cardContactButtonLabel, setCardContactButtonLabel] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Table Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'All' | Region>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<CollegeListing>(EMPTY_LISTING);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<'nda' | 'mandate' | null>(null);

  const ndaInputRef = useRef<HTMLInputElement>(null);
  const mandateInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // 1. Fetch Page Record from Cloud Database
  const fetchPage = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pages/colleges-universities-for-sale');
      if (data) {
        setPageRecord(data);
        setIsPublished(Boolean(data.published));
        const pd: PageData = typeof data.pageData === 'string' ? JSON.parse(data.pageData || '{}') : (data.pageData || {});

        setHeroTitle(pd.heroTitle || 'Businesses for Sale and Investment');
        setHeroSubtitle(
          pd.heroSubtitle ||
            'Showing businesses for sale and investment. Buy or invest in a business listed by direct business owners and business brokers.'
        );
        setFilterLabel(pd.filterLabel || 'cbse schools');
        setCardDetailsButtonLabel(pd.cardDetailsButtonLabel || 'View Full Details');
        setCardContactButtonLabel(pd.cardContactButtonLabel || 'Contact Business');

        if (data.contentModel === 'structured') {
          // Structured Page: Read items and categories from relational endpoints
          const [itemsRes, catsRes] = await Promise.all([
            fetchAdminPageItems(data.id, 'cards', 'card'),
            fetchAdminPageCategories(data.id).catch(() => ({ categories: [] })),
          ]);

          const loadedCards: CollegeListing[] = itemsRes.items.map((it) => {
            const c = it.card || it.data || {};
            return {
              id: it.id,
              version: it.version,
              title: it.title || c.title || '',
              description: it.summary || c.description || '',
              image: it.imageUrl || c.image || '',
              images: Array.isArray(c.images) && c.images.length > 0 ? c.images : (it.imageUrl ? [it.imageUrl] : []),
              category: (it.categories && it.categories[0]) || c.category || '',
              location: c.location || '',
              region: c.region || 'North',
              rating: c.rating || '7.5',
              sales: c.sales || '',
              margin: c.margin || '',
              askingPrice: c.askingPrice || '',
              premium: Boolean(c.premium),
              ndaUrl: c.ndaUrl || '',
              mandateUrl: c.mandateUrl || '',
            };
          });
          setCards(loadedCards);

          const catNames = catsRes.categories.map((c) => c.name);
          setCategories(catNames.length > 0 ? catNames : DEFAULT_CATEGORIES.filter((c) => c !== 'General'));
        } else {
          const rawCards = Array.isArray(pd.cards) ? pd.cards : [];
          const initialCards: CollegeListing[] = rawCards.map((c) => ({
            ...c,
            category: c.category === 'General' ? '' : (c.category || ''),
            images: Array.isArray(c.images) && c.images.length > 0
              ? c.images.filter(Boolean)
              : (c.image ? [c.image] : []),
          }));
          setCards(initialCards);

          // Derive categories: Strictly respect pd.categories from database if present; otherwise default
          const existingCats = Array.isArray(pd.categories) && pd.categories.length > 0
            ? pd.categories.filter((c) => c !== 'General')
            : DEFAULT_CATEGORIES.filter((c) => c !== 'General');
          setCategories(existingCats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load colleges page:', err);
      showToast(err?.response?.data?.error || 'Failed to load page data from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, []);

  // 2. Save Updated Data to Cloud Database (Zero schema migrations)
  const saveToDatabase = async (nextCards: CollegeListing[], nextCategories: string[], nextPublished?: boolean) => {
    if (!pageRecord) return;
    setSaving(true);
    try {
      const currentPd: PageData =
        typeof pageRecord.pageData === 'string' ? JSON.parse(pageRecord.pageData || '{}') : (pageRecord.pageData || {});

      const updatedPageData: PageData = {
        ...currentPd,
        heroTitle,
        heroSubtitle,
        filterLabel,
        cardDetailsButtonLabel,
        cardContactButtonLabel,
      };

      if (pageRecord.contentModel !== 'structured') {
        updatedPageData.cards = nextCards;
        updatedPageData.categories = nextCategories;
      }

      const publishedState = typeof nextPublished === 'boolean' ? nextPublished : isPublished;

      const putBody: Record<string, any> = {
        published: publishedState,
        pageData: updatedPageData,
      };
      if (pageRecord.version !== undefined) {
        putBody.version = pageRecord.version;
      }

      const { data: updatedRecord } = await api.put(`/pages/${pageRecord.id}`, putBody);

      setPageRecord(updatedRecord);
      setCards(nextCards);
      setCategories(nextCategories);
      setIsPublished(publishedState);

      // Invalidate caches in active tab & cross-tab immediately
      clearPageDataCache('colleges-universities-for-sale');
      broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'colleges-universities-for-sale' });

      showToast('All changes saved to cloud database successfully.');
      return true;
    } catch (err: any) {
      console.error('Failed to save colleges data:', err);
      showToast(err?.response?.data?.error || 'Failed to save changes to database', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 3. Document PDF Upload Handler
  const handleDocumentUpload = async (e: ChangeEvent<HTMLInputElement>, target: 'nda' | 'mandate') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF documents are supported for due diligence agreements.');
      e.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds the 25MB limit.');
      e.target.value = '';
      return;
    }

    setUploadingDoc(target);
    const body = new FormData();
    body.append('file', file);

    try {
      const { data } = await api.post('/pages/upload-document', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.url) {
        if (target === 'nda') {
          setFormData((prev) => ({ ...prev, ndaUrl: data.url }));
        } else {
          setFormData((prev) => ({ ...prev, mandateUrl: data.url }));
        }
        showToast(`${target.toUpperCase()} document uploaded successfully.`);
      }
    } catch (err: any) {
      console.error(`Failed to upload ${target} PDF:`, err);
      showToast(err?.response?.data?.error || `Failed to upload ${target.toUpperCase()} document`, 'error');
    } finally {
      setUploadingDoc(null);
      e.target.value = '';
    }
  };

  // 4. Modal Open Handlers
  const handleAddNew = () => {
    setEditingIndex(null);
    setFormData({
      ...EMPTY_LISTING,
      category: categories[0] || '',
      images: [],
      image: '',
    });
    setFormErrors({});
    setCustomCategoryInput('');
    setNewGalleryImageUrl('');
    setModalOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const target = cards[index];
    const initialImages = Array.isArray(target.images) && target.images.length > 0
      ? [...target.images]
      : (target.image ? [target.image] : []);
    setFormData({
      ...target,
      images: initialImages,
      image: initialImages[0] || target.image || '',
    });
    setFormErrors({});
    setCustomCategoryInput('');
    setNewGalleryImageUrl('');
    setModalOpen(true);
  };

  const handleDuplicate = async (index: number) => {
    const source = cards[index];
    const clone: CollegeListing = {
      ...source,
      title: `${source.title} (Copy)`,
      images: Array.isArray(source.images) ? [...source.images] : (source.image ? [source.image] : []),
    };

    if (pageRecord?.contentModel === 'structured') {
      try {
        setSaving(true);
        const res = await createAdminPageItem(pageRecord.id, {
          collection: 'cards',
          card: clone,
          position: index + 1,
        });
        const newListing: CollegeListing = {
          id: res.id,
          version: res.version,
          ...clone,
        };
        const nextCards = [...cards];
        nextCards.splice(index + 1, 0, newListing);
        setCards(nextCards);
        clearPageDataCache('colleges-universities-for-sale');
        broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'colleges-universities-for-sale' });
        showToast('Listing duplicated successfully.');
      } catch (err: any) {
        showToast(err?.response?.data?.error || 'Failed to duplicate listing', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    const nextCards = [...cards];
    nextCards.splice(index + 1, 0, clone);
    await saveToDatabase(nextCards, categories);
  };

  const handleDelete = async (index: number) => {
    const target = cards[index];
    const ok = window.confirm(
      `Are you sure you want to delete "${target.title}"?\nThis removes the institution from the cloud database.`
    );
    if (!ok) return;

    if (pageRecord?.contentModel === 'structured') {
      try {
        setSaving(true);
        if (target.id) {
          await deleteAdminPageItem(pageRecord.id, target.id, target.version);
        }
        const nextCards = cards.filter((_, i) => i !== index);
        setCards(nextCards);
        clearPageDataCache('colleges-universities-for-sale');
        broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'colleges-universities-for-sale' });
        showToast('Listing deleted successfully.');
      } catch (err: any) {
        showToast(err?.response?.data?.error || 'Failed to delete listing', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    const nextCards = cards.filter((_, i) => i !== index);
    await saveToDatabase(nextCards, categories);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;

    if (pageRecord?.contentModel === 'structured') {
      try {
        setSaving(true);
        const nextCards = [...cards];
        const temp = nextCards[index];
        nextCards[index] = nextCards[targetIndex];
        nextCards[targetIndex] = temp;
        const orderedIds = nextCards.map((c) => c.id).filter((id): id is number => id !== undefined);
        await reorderAdminPageItems(pageRecord.id, 'cards', orderedIds);
        setCards(nextCards);
        clearPageDataCache('colleges-universities-for-sale');
        broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'colleges-universities-for-sale' });
        showToast('Listings reordered successfully.');
      } catch (err: any) {
        showToast(err?.response?.data?.error || 'Failed to reorder listings', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    const nextCards = [...cards];
    const temp = nextCards[index];
    nextCards[index] = nextCards[targetIndex];
    nextCards[targetIndex] = temp;

    await saveToDatabase(nextCards, categories);
  };

  const handleTogglePremiumDirect = async (index: number) => {
    if (pageRecord?.contentModel === 'structured') {
      const target = cards[index];
      if (target.id) {
        try {
          setSaving(true);
          const updatedCard = { ...target, premium: !target.premium };
          const res = await updateAdminPageItem(pageRecord.id, target.id, {
            version: target.version ?? 1,
            card: updatedCard,
          });
          const nextCards = cards.map((c, i) => (i === index ? { ...c, premium: !c.premium, version: res.version } : c));
          setCards(nextCards);
          clearPageDataCache('colleges-universities-for-sale');
          broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'colleges-universities-for-sale' });
          showToast(`Premium status updated for ${target.title}.`);
        } catch (err: any) {
          showToast(err?.response?.data?.error || 'Failed to update premium status', 'error');
        } finally {
          setSaving(false);
        }
        return;
      }
    }

    const nextCards = cards.map((c, i) => (i === index ? { ...c, premium: !c.premium } : c));
    await saveToDatabase(nextCards, categories);
  };

  // 5. Form Validation & Submission
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = 'Institutional Title is required.';
    }
    if (!formData.description.trim()) {
      errors.description = 'Executive summary / description is required.';
    }
    if (formData.region && !REGION_OPTIONS.includes(formData.region)) {
      errors.region = 'Please select a valid geographical region.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    // Resolve final category: NEVER default to 'General'
    let finalCategory = customCategoryInput.trim() || formData.category?.trim() || '';
    if (finalCategory === 'General') {
      finalCategory = '';
    }
    let nextCategories = [...categories];
    if (customCategoryInput.trim()) {
      finalCategory = customCategoryInput.trim();
      if (!nextCategories.some((c) => c.toLowerCase() === finalCategory.toLowerCase())) {
        nextCategories.push(finalCategory);
      }
    }

    const finalImages = Array.isArray(formData.images) && formData.images.length > 0
      ? formData.images.filter(Boolean)
      : (formData.image ? [formData.image] : []);

    const cleanedCard: CollegeListing = {
      ...formData,
      title: formData.title.trim(),
      category: finalCategory,
      image: finalImages[0] || '',
      images: finalImages,
      location: formData.location?.trim() || '',
      sales: formData.sales?.trim() || '',
      margin: formData.margin?.trim() || '',
      askingPrice: formData.askingPrice?.trim() || '',
      rating: formData.rating?.trim() || '7.0',
      description: formData.description.trim(),
    };

    if (pageRecord?.contentModel === 'structured') {
      try {
        setSaving(true);
        if (customCategoryInput.trim() && !categories.includes(finalCategory)) {
          await createAdminPageCategory(pageRecord.id, finalCategory).catch(() => {});
          setCategories(nextCategories);
        }

        if (editingIndex === null) {
          const res = await createAdminPageItem(pageRecord.id, {
            collection: 'cards',
            card: cleanedCard,
            position: 0,
          });
          const newListing: CollegeListing = {
            id: res.id,
            version: res.version,
            ...cleanedCard,
          };
          setCards([newListing, ...cards]);
          showToast('New institutional listing created successfully.');
        } else {
          const existing = cards[editingIndex];
          if (existing.id) {
            const res = await updateAdminPageItem(pageRecord.id, existing.id, {
              version: existing.version ?? 1,
              card: cleanedCard,
            });
            const updatedListing: CollegeListing = {
              id: res.id,
              version: res.version,
              ...cleanedCard,
            };
            setCards(cards.map((c, i) => (i === editingIndex ? updatedListing : c)));
            showToast('Institutional listing updated successfully.');
          }
        }
        clearPageDataCache('colleges-universities-for-sale');
        broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'colleges-universities-for-sale' });
        setModalOpen(false);
      } catch (err: any) {
        console.error('Failed to save college listing:', err);
        showToast(err?.response?.data?.error || 'Failed to save listing to database', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    let nextCards: CollegeListing[];
    if (editingIndex === null) {
      // Prepend newest listing at top of database array
      nextCards = [cleanedCard, ...cards];
    } else {
      nextCards = cards.map((c, i) => (i === editingIndex ? cleanedCard : c));
    }

    const success = await saveToDatabase(nextCards, nextCategories);
    if (success) {
      setModalOpen(false);
    }
  };

  // 6. Filter and Search Logic
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        card.title.toLowerCase().includes(q) ||
        (card.location && card.location.toLowerCase().includes(q)) ||
        (card.category && card.category.toLowerCase().includes(q)) ||
        card.description.toLowerCase().includes(q);

      const matchesRegion = regionFilter === 'All' || card.region === regionFilter;
      const matchesCategory =
        categoryFilter === 'All' ||
        (categoryFilter === 'Uncategorized' ? !card.category : card.category === categoryFilter);

      return matchesSearch && matchesRegion && matchesCategory;
    });
  }, [cards, searchQuery, regionFilter, categoryFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, regionFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const paginatedCards = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCards.slice(start, start + PAGE_SIZE);
  }, [filteredCards, page]);

  // Counts
  const premiumCount = useMemo(() => cards.filter((c) => c.premium).length, [cards]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading institutional sale listings from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Page Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Colleges & Universities for Sale</h1>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isPublished
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isPublished ? 'Live on Site' : 'Draft / Offline'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage dynamic institutional sale opportunities, valuation metrics, NDA & mandate documents
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const nextState = !isPublished;
              saveToDatabase(cards, categories, nextState);
            }}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition shadow-xs cursor-pointer ${
              isPublished
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Toggle whether the page is visible to the public or saved as offline draft"
          >
            {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPublished ? 'Take Offline' : 'Publish Live'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsDrawer((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Page Settings</span>
          </button>

          <a
            href="/colleges-universities-for-sale"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>View Live</span>
          </a>

          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Institution</span>
          </button>
        </div>
      </div>

      {/* Hero & Page Header Settings Collapsible Drawer */}
      {showSettingsDrawer && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-4 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Page Header & Button Labels</h3>
              <p className="text-xs text-slate-500">Configure public storefront hero banners and CTA button copy</p>
            </div>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hero Title</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="Businesses for Sale and Investment"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Filter Label Badge</label>
              <input
                type="text"
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="cbse schools"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hero Subtitle</label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="Showing businesses for sale and investment..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Details Button Label</label>
              <input
                type="text"
                value={cardDetailsButtonLabel}
                onChange={(e) => setCardDetailsButtonLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="View Full Details"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Button Label</label>
              <input
                type="text"
                value={cardContactButtonLabel}
                onChange={(e) => setCardContactButtonLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="Contact Business"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveToDatabase(cards, categories)}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Page Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Listings</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{cards.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Premium Assets</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{premiumCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Categories</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{categories.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Active Regions</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{REGION_OPTIONS.length}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search institutions by name, location, or summary..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Region Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Region:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Regions</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} India
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="All">All Categories</option>
              <option value="Uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/admin/categories?page=colleges-universities-for-sale"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50 transition"
            title="Manage and reorder categories on dedicated Categories page"
          >
            <span>Manage Categories</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Institutional Listings Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No institutions found matching criteria.</p>
            <p className="text-xs text-slate-400">Try clearing your filters or add a new institutional asset.</p>
            <button
              onClick={handleAddNew}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Institution</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Order</th>
                  <th className="py-3 px-4 w-20">Preview</th>
                  <th className="py-3 px-4">Institution Title & Details</th>
                  <th className="py-3 px-4">Category & Region</th>
                  <th className="py-3 px-4">Financials & Valuation</th>
                  <th className="py-3 px-4">Documents</th>
                  <th className="py-3 px-4 text-center">Premium</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCards.map((card, idx) => {
                  const originalIndex = cards.indexOf(card);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      {/* Order Controls */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(originalIndex, 'up')}
                            disabled={originalIndex === 0 || saving}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500"
                            title="Move listing up in display order"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(originalIndex, 'down')}
                            disabled={originalIndex === cards.length - 1 || saving}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500"
                            title="Move listing down in display order"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="relative w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {card.image ? (
                            <img
                              src={resolveMediaUrl(card.image)}
                              alt={card.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <GraduationCap className="w-6 h-6" />
                            </div>
                          )}
                          {Array.isArray(card.images) && card.images.length > 1 && (
                            <span
                              className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded-tl flex items-center gap-0.5"
                              title={`${card.images.length} photos in gallery`}
                            >
                              <Camera className="w-2.5 h-2.5" />
                              {card.images.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Title & Summary */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 leading-snug break-words">{card.title}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2 break-words">
                          <RichTextContent content={card.description} context="card" />
                        </div>
                        {card.location && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            <span className="truncate">{card.location}</span>
                          </div>
                        )}
                      </td>

                      {/* Category & Region */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {card.category ? (
                          <div className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold mb-1">
                            {card.category}
                          </div>
                        ) : (
                          <div className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium mb-1">
                            Uncategorized
                          </div>
                        )}
                        <div className="text-xs text-slate-500 font-medium">
                          {card.region ? `${card.region} India` : 'All India'}
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">
                          Price: <span className="text-[#087ea4]">{card.askingPrice || 'On request'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sales: <span className="font-semibold text-slate-700">{card.sales || 'N/A'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Margin: <span className="font-bold text-emerald-600">{card.margin || 'N/A'}</span>
                        </div>
                        {card.rating && (
                          <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{card.rating}</span>
                          </div>
                        )}
                      </td>

                      {/* Documents Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {card.ndaUrl ? (
                            <a
                              href={resolveMediaUrl(card.ndaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              <FileText className="w-3 h-3 text-blue-500" />
                              <span>NDA Attached</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">No NDA</span>
                          )}

                          {card.mandateUrl ? (
                            <a
                              href={resolveMediaUrl(card.mandateUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>Mandate Attached</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">No Mandate</span>
                          )}
                        </div>
                      </td>

                      {/* Premium Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePremiumDirect(originalIndex)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                            card.premium
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title="Toggle Premium badge"
                        >
                          {card.premium ? 'Premium' : 'Standard'}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(originalIndex)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                            title="Edit listing"
                          >
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(originalIndex)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                            title="Duplicate listing"
                          >
                            <Copy className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(originalIndex)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete listing"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Summary */}
        {filteredCards.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredCards.length)} of {filteredCards.length} institutions
            </span>
            <PaginationControl
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              scrollToTop={false}
              className="mt-0 pt-0 border-t-0"
            />
          </div>
        )}
      </div>

      {/* Add / Edit Listing Modal Form */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl my-8 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {editingIndex === null ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {editingIndex === null ? 'Add College / University Listing' : 'Edit Institutional Listing'}
                  </h2>
                  <p className="text-xs text-slate-500">Configure valuation, executive summary, media and due diligence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* SECTION 1: IDENTITY */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Institutional Identity</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Institutional Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Private University @ Gujarat or CBSE School for Sale"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                        formErrors.title ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200'
                      } focus:outline-none focus:ring-2`}
                    />
                    {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Geographical Region *</label>
                    <select
                      value={formData.region || 'North'}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value as Region })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r} India
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City / State Location</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Bahraich, Uttar Pradesh or Ahmedabad"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category Classification</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="">-- Select Category (or leave Uncategorized) --</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Or Add New Category</label>
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="e.g. Medical College or Polytechnic"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: FINANCIALS & VALUATION */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Financial Metrics & Valuation</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Asking Price</label>
                    <input
                      type="text"
                      value={formData.askingPrice || ''}
                      onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                      placeholder="INR 20 Cr"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Run Rate Sales</label>
                    <input
                      type="text"
                      value={formData.sales || ''}
                      onChange={(e) => setFormData({ ...formData, sales: e.target.value })}
                      placeholder="INR 2.6 crore"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">EBITDA Margin</label>
                    <input
                      type="text"
                      value={formData.margin || ''}
                      onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
                      placeholder="40 %"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Asset Rating</label>
                    <input
                      type="text"
                      value={formData.rating || ''}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="7.5"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.premium)}
                      onChange={(e) => setFormData({ ...formData, premium: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">Mark as Premium Opportunity</span>
                    <span className="text-xs text-slate-400 font-normal">(Renders bright green corner badge on card)</span>
                  </label>
                </div>
              </div>

              {/* SECTION 3: MEDIA & LEGAL DUE DILIGENCE */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Campus Photo & Due Diligence Documents</span>
                </h3>

                <div className="space-y-4">
                  {/* Multi-Image Campus Photo Gallery */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>Campus Photo Gallery (Slide-able)</span>
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Upload multiple photos for this campus. The first photo serves as the primary cover card.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                        {Array.isArray(formData.images) && formData.images.length > 0
                          ? formData.images.length
                          : formData.image
                          ? 1
                          : 0}{' '}
                        photo(s)
                      </span>
                    </div>

                    {/* Current Gallery Thumbnails Grid */}
                    {Array.isArray(formData.images) && formData.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {formData.images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="group relative rounded-xl border-2 overflow-hidden bg-white shadow-xs transition-all flex flex-col justify-between"
                            style={{ borderColor: imgIdx === 0 ? '#10b981' : '#e2e8f0' }}
                          >
                            <div className="relative h-24 w-full bg-slate-100">
                              <img
                                src={resolveMediaUrl(imgUrl)}
                                alt={`Photo ${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {imgIdx === 0 && (
                                <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs">
                                  Primary Cover
                                </span>
                              )}
                              <span className="absolute bottom-1 right-1 bg-slate-900/70 text-white text-[9px] font-bold px-1 rounded">
                                #{imgIdx + 1}
                              </span>
                            </div>

                            <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1 text-slate-600">
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={imgIdx === 0}
                                  onClick={() => {
                                    const next = [...formData.images!];
                                    const [temp] = next.splice(imgIdx, 1);
                                    next.splice(imgIdx - 1, 0, temp);
                                    setFormData({ ...formData, images: next, image: next[0] });
                                  }}
                                  title="Move Left"
                                  className="p-1 hover:bg-slate-200 rounded disabled:opacity-20 disabled:hover:bg-transparent"
                                >
                                  <ArrowUp className="w-3 h-3 -rotate-90" />
                                </button>
                                <button
                                  type="button"
                                  disabled={imgIdx === formData.images!.length - 1}
                                  onClick={() => {
                                    const next = [...formData.images!];
                                    const [temp] = next.splice(imgIdx, 1);
                                    next.splice(imgIdx + 1, 0, temp);
                                    setFormData({ ...formData, images: next, image: next[0] });
                                  }}
                                  title="Move Right"
                                  className="p-1 hover:bg-slate-200 rounded disabled:opacity-20 disabled:hover:bg-transparent"
                                >
                                  <ArrowDown className="w-3 h-3 -rotate-90" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                {imgIdx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...formData.images!];
                                      const [temp] = next.splice(imgIdx, 1);
                                      next.unshift(temp);
                                      setFormData({ ...formData, images: next, image: next[0] });
                                    }}
                                    title="Set as Primary Cover"
                                    className="text-[10px] text-emerald-600 hover:underline font-bold px-1"
                                  >
                                    Make Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = formData.images!.filter((_, i) => i !== imgIdx);
                                    setFormData({ ...formData, images: next, image: next[0] || '' });
                                  }}
                                  title="Remove Photo"
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Photo to Gallery */}
                    <div className="pt-2 border-t border-slate-200/60">
                      <MediaImageField
                        label="Add Photo to Gallery (Upload or URL)"
                        value={newGalleryImageUrl}
                        onChange={(val) => {
                          if (!val) return;
                          const currentImages = Array.isArray(formData.images)
                            ? [...formData.images]
                            : formData.image
                            ? [formData.image]
                            : [];
                          if (!currentImages.includes(val)) {
                            currentImages.push(val);
                          }
                          setFormData({
                            ...formData,
                            images: currentImages,
                            image: currentImages[0] || val,
                          });
                          setNewGalleryImageUrl('');
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* NDA Document Upload */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-slate-800 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Confidential NDA Document (PDF)</span>
                        </label>
                        {formData.ndaUrl && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                            Attached
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formData.ndaUrl || ''}
                        onChange={(e) => setFormData({ ...formData, ndaUrl: e.target.value })}
                        placeholder="/uploads/documents/nda-123.pdf"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs mb-2 font-mono"
                      />
                      <input
                        type="file"
                        ref={ndaInputRef}
                        accept="application/pdf,.pdf"
                        onChange={(e) => handleDocumentUpload(e, 'nda')}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => ndaInputRef.current?.click()}
                          disabled={uploadingDoc === 'nda'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{uploadingDoc === 'nda' ? 'Uploading...' : 'Upload NDA PDF'}</span>
                        </button>
                        {formData.ndaUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, ndaUrl: '' })}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mandate Document Upload */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-slate-800 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Direct Mandate Document (PDF)</span>
                        </label>
                        {formData.mandateUrl && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                            Attached
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formData.mandateUrl || ''}
                        onChange={(e) => setFormData({ ...formData, mandateUrl: e.target.value })}
                        placeholder="/uploads/documents/mandate-123.pdf"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs mb-2 font-mono"
                      />
                      <input
                        type="file"
                        ref={mandateInputRef}
                        accept="application/pdf,.pdf"
                        onChange={(e) => handleDocumentUpload(e, 'mandate')}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => mandateInputRef.current?.click()}
                          disabled={uploadingDoc === 'mandate'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{uploadingDoc === 'mandate' ? 'Uploading...' : 'Upload Mandate PDF'}</span>
                        </button>
                        {formData.mandateUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, mandateUrl: '' })}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: REUSABLE RICH TEXT DESCRIPTION */}
              <div className="pt-4 border-t border-slate-100">
                <HtmlRichTextEditor
                  label="Executive Summary & Detailed Description *"
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  placeholder="Provide detailed information regarding land area, student capacity, classrooms, labs, affiliations..."
                  rows={5}
                  helperText="Format text with bold, italic, bullet lists, or headings. Changes render in real time."
                />
                {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleFormSubmit}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                {saving ? 'Saving to Database...' : editingIndex === null ? 'Add to Database' : 'Update Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
