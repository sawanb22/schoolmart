import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  Heart,
  ArrowRight,
  Sparkles,
  Send,
} from 'lucide-react';
import api from '@/api/client';
import { MediaImage } from '@/components/ui/media-image';
import { MASTER_CATEGORIES, HIGHER_ED_INSTITUTIONS, OTHER_INSTITUTIONS } from '@/components/sections/search-bar';

// DTO interfaces matching backend/src/services/solutions-finder/types/solutions-search.types.ts
interface RequirementSummary {
  intentSummary: string;
  institutionId: string;
  institutionLabel: string;
  categoryId: string;
  categoryLabel: string;
  scale?: string | null;
  scopeTags: string[];
  headline?: string;
  narrative?: string;
  userTags?: string[];
}

interface CuratedSolution {
  cardSlug: string;
  targetUrl: string;
  title: string;
  summary: string;
  inclusions: string[];
  badge?: string | null;
  imageUrl?: string | null;
  categorySlug: string;
  whyRelevant: string;
  score: number;
}

interface ComplementarySolution {
  cardSlug: string;
  targetUrl: string;
  title: string;
  badge?: string | null;
  imageUrl?: string | null;
  categorySlug: string;
  description?: string;
}

interface ProposalCaseStudy {
  title: string;
  slug: string;
  imageUrl?: string | null;
  badge?: string;
  description?: string;
}

interface ProposalResponse {
  success: boolean;
  traceId: string;
  executionTimeMs: number;
  unmatchedFallback: boolean;
  provider: string;
  confidenceScore: number;
  requirementSummary: RequirementSummary;
  curatedSolutions: CuratedSolution[];
  complementaryInfra: ComplementarySolution[];
  caseStudies: ProposalCaseStudy[];
}

function getAssignedPractice(categoryId?: string, categoryLabel?: string): string {
  switch (categoryId) {
    case 'furniture':
      return 'Furniture & Interiors Desk';
    case 'sports-infra':
      return 'Sports & Athletics Practice';
    case 'ai-tech':
      return 'AI & Technology Desk';
    case 'labs':
      return 'Laboratories & Research Desk';
    case 'campus-design':
      return 'Architecture & Master Planning Desk';
    case 'libraries':
      return 'Library & Knowledge Hubs Desk';
    case 'automation':
      return 'Campus Automation & Security Desk';
    case 'additional-infra':
      return 'Student Amenities & Hostels Desk';
    case 'strategic-services':
      return 'Institutional Strategy Desk';
    case 'renovation':
      return 'Modernisation & Civil Projects Desk';
    default:
      return `${categoryLabel || 'Campus Infrastructure'} Desk`;
  }
}

function getDisplayCategory(proposal: ProposalResponse | null, selectedCat: string): string {
  if (!proposal) return 'Campus Solutions';
  if (selectedCat && selectedCat.includes('::')) {
    return selectedCat.split('::')[1];
  }
  const tags = proposal.requirementSummary.userTags || [];
  if (tags.length > 0) {
    const candidate = tags.find((t) => t !== proposal.requirementSummary.institutionLabel && t !== proposal.requirementSummary.scale);
    if (candidate) return candidate;
  }
  return proposal.requirementSummary.categoryLabel || 'Campus Solutions';
}

export default function FindSolutions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || searchParams.get('query') || '';
  const institutionParam = searchParams.get('institution') || 'all';
  const categoryParam = searchParams.get('category') || 'all';

  // Proposal State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);

  // In-page Refinement Controls (Sticky Context Bar)
  const [refineQuery, setRefineQuery] = useState<string>(queryParam);
  const [refineInstitution, setRefineInstitution] = useState<string>(institutionParam);
  const [refineCategory, setRefineCategory] = useState<string>(categoryParam);
  const [showRefineBar, setShowRefineBar] = useState<boolean>(false);

  // Wishlist bookmark state
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  // Selected cards for Consultation Request (Section E)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // Consultation Form State (Client 10-Field Intake)
  const [formName, setFormName] = useState<string>('');
  const [formInstitution, setFormInstitution] = useState<string>('');
  const [formDesignation, setFormDesignation] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formProjectType, setFormProjectType] = useState<string>('New Campus');
  const [formBudget, setFormBudget] = useState<string>('');
  const [formTimeline, setFormTimeline] = useState<string>('');
  const [formMessage, setFormMessage] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formSubmittedCode, setFormSubmittedCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync refine inputs when URL changes
  useEffect(() => {
    setRefineQuery(queryParam);
    setRefineInstitution(institutionParam);
    setRefineCategory(categoryParam);
  }, [queryParam, institutionParam, categoryParam]);

  // Fetch proposal from live search API
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (queryParam) params.q = queryParam;
    if (institutionParam && institutionParam !== 'all') params.institution = institutionParam;
    if (categoryParam && categoryParam !== 'all') params.category = categoryParam;

    api.get<ProposalResponse>('/solutions-finder/search', {
      params,
      signal: controller.signal,
    })
      .then((res) => {
        setProposal(res.data);
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        console.error('Failed to load solutions proposal:', err);
        setError('Unable to load institutional solutions proposal. Please try adjusting your search terms.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [queryParam, institutionParam, categoryParam]);

  const handleApplyRefinements = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams();

    let targetCategory = refineCategory;
    let subcategorySearchTerm = '';

    if (refineCategory && refineCategory.includes('::')) {
      const [catId, subName] = refineCategory.split('::');
      targetCategory = catId;
      subcategorySearchTerm = subName;
    }

    let finalQuery = refineQuery.trim();
    if (!finalQuery && subcategorySearchTerm) {
      finalQuery = subcategorySearchTerm;
    }

    if (finalQuery) nextParams.set('q', finalQuery);
    if (refineInstitution && refineInstitution !== 'all') nextParams.set('institution', refineInstitution);
    if (targetCategory && targetCategory !== 'all') nextParams.set('category', targetCategory);

    setSearchParams(nextParams);
    setShowRefineBar(false);
  };

  const toggleWishlist = (cardSlug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(cardSlug)) {
        next.delete(cardSlug);
      } else {
        next.add(cardSlug);
      }
      return next;
    });
  };

  const toggleCardSelection = (cardSlug: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardSlug)) {
        next.delete(cardSlug);
      } else {
        next.add(cardSlug);
      }
      return next;
    });
  };

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
      setFormError('Please fill in your full name, official email, and contact phone number.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const selectedScopeDetails = (proposal?.curatedSolutions || [])
        .filter((c) => selectedCards.has(c.cardSlug))
        .map((c) => c.title);

      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        institutionName: formInstitution.trim() || proposal?.requirementSummary.institutionLabel || 'Educational Institution',
        designation: formDesignation.trim() || 'Institution Representative',
        location: formLocation.trim() || 'Not Specified',
        projectType: formProjectType,
        budget: formBudget || 'Under finalization',
        timeline: formTimeline || 'Next academic session',
        message: `${formMessage.trim()}\n\nSelected Infrastructure Scope:\n- ${
          selectedScopeDetails.join('\n- ') || 'Turnkey Campus Consultation'
        }`,
        metadata: {
          traceId: proposal?.traceId || `trace-${Date.now()}`,
          selectedSolutions: Array.from(selectedCards),
          source: 'solutions-finder-consultation',
        },
      };

      await api.post('/inquiries', payload);

      const traceSuffix = (proposal?.traceId || 'CM8F2A').slice(-6).toUpperCase();
      setFormSubmittedCode(`CM-TRACE-${traceSuffix}`);
    } catch (err: any) {
      console.error('Failed to submit consultation request:', err);
      setFormError(err.response?.data?.error || 'Failed to submit requirement. Please try again or contact us directly.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      {/* ───────────────────────────────────────────────────────────────────
          MAIN PAGE CONTENT
         ─────────────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {loading && (
          <div className="space-y-8 animate-pulse">
            <div className="h-44 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-8 w-2/3 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-white rounded-xl border border-slate-200" />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <h2 className="text-xl font-bold text-red-950 font-poppins">{error}</h2>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Retry Search
            </button>
          </div>
        )}

        {proposal && !loading && (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                SECTION A: STANDALONE CAMPUS REQUIREMENT BRIEF COMPONENT
               ══════════════════════════════════════════════════════════════════ */}
            <section className="w-full" aria-label="Campus Requirement Summary">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_28px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
                
                {/* Upper Editorial Summary Zone */}
                <div className="p-6 sm:px-8 sm:py-7">
                  {/* Eyebrow & Single-Line Edit Trigger */}
                  <div className="flex items-center justify-between gap-4 mb-3.5">
                    <div className="inline-flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-[2px] bg-[#FFD700] ring-1 ring-amber-500/40 shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-slate-500 whitespace-nowrap">
                        Campus Requirement Brief
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRefineBar((prev) => !prev)}
                      id="editBtn"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{showRefineBar ? 'Close Editor' : 'Edit Requirement'}</span>
                    </button>
                  </div>

                  {/* Main Title, Synthesised Consultant Summary & Primary Action */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start lg:items-end">
                    <div className="lg:col-span-8">
                      <h1 className="font-poppins text-xl sm:text-2xl lg:text-[26px] font-bold text-slate-900 tracking-[-0.02em] leading-snug">
                        {proposal.requirementSummary.headline || `Solutions for your ${proposal.requirementSummary.institutionLabel}`}
                      </h1>
                      <p className="mt-1.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-3xl">
                        {proposal.requirementSummary.narrative ||
                          `We understand that you are looking for ${proposal.requirementSummary.categoryLabel.toLowerCase()} solutions for your institution.`}
                      </p>
                    </div>

                    <div className="lg:col-span-4 flex lg:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const consultation = document.getElementById('consultation-form');
                          if (consultation) consultation.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-[13px] transition whitespace-nowrap w-full sm:w-auto cursor-pointer shadow-xs"
                      >
                        <span>Request Custom BoQ / Layout</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Optional User Note Row (Automatically shown if query was entered) */}
                  {queryParam && queryParam.trim().length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5 text-xs">
                      <span className="font-semibold text-slate-400 uppercase tracking-[0.08em] text-[10px] shrink-0">
                        Submitted Note:
                      </span>
                      <p className="text-slate-600 italic leading-relaxed">
                        “{queryParam}”
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible Inline Requirement Editor */}
                {showRefineBar && (
                  <div className="bg-slate-50/95 border-t border-slate-200 px-6 sm:px-8 py-5 transition-all animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
                        Update Requirement Parameters
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRefineBar(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleApplyRefinements} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Institution Type
                          </label>
                          <select
                            value={refineInstitution}
                            onChange={(e) => setRefineInstitution(e.target.value)}
                            className="w-full rounded-lg border border-slate-300/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                          >
                            <option value="all">All Institutions</option>
                            <optgroup label="Higher Education">
                              {HIGHER_ED_INSTITUTIONS.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.label}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Other Institutions">
                              {OTHER_INSTITUTIONS.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.label}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div className="md:col-span-4">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Requirement Category &amp; Subcategory
                          </label>
                          <select
                            value={refineCategory}
                            onChange={(e) => setRefineCategory(e.target.value)}
                            className="w-full rounded-lg border border-slate-300/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                          >
                            <option value="all">All Categories &amp; Facilities</option>
                            {MASTER_CATEGORIES.map((cat) => (
                              <optgroup key={cat.id} label={cat.label}>
                                <option value={cat.id}>All {cat.shortLabel || cat.label}</option>
                                {cat.subcategories.map((sub) => (
                                  <option key={`${cat.id}::${sub}`} value={`${cat.id}::${sub}`}>
                                    ↳ {sub}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-4">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Specific Requirement &amp; Scope Note
                          </label>
                          <input
                            type="text"
                            value={refineQuery}
                            onChange={(e) => setRefineQuery(e.target.value)}
                            placeholder="e.g. 40 chairs for lecture hall, indoor badminton arena..."
                            className="w-full rounded-lg border border-slate-300/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRefineBar(false)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="py-2.5 px-6 rounded-lg bg-[#FFD700] hover:bg-[#F2C200] text-slate-900 font-bold text-xs transition cursor-pointer shadow-xs hover:shadow"
                        >
                          Update Brief
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Clean 3-Column Specification Ledger (Click to modify parameters) */}
                <div
                  onClick={() => setShowRefineBar((prev) => !prev)}
                  title="Click to modify requirement parameters"
                  className="bg-[#FAFAFB] border-t border-slate-200/90 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 cursor-pointer hover:bg-slate-100/40 transition-colors"
                >
                  {/* Column 1: Institution */}
                  <div className="px-6 sm:px-8 py-4 text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Institution
                    </span>
                    <span className="mt-1 block text-[13px] font-bold text-slate-900 truncate">
                      {proposal.requirementSummary.institutionLabel || 'All Educational Institutions'}
                    </span>
                  </div>

                  {/* Column 2: Requirement Category */}
                  <div className="px-6 sm:px-8 py-4 text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Requirement Category
                    </span>
                    <span className="mt-1 block text-[13px] font-bold text-slate-900 truncate">
                      {getDisplayCategory(proposal, refineCategory)}
                    </span>
                  </div>

                  {/* Column 3: Assigned Practice */}
                  <div className="px-6 sm:px-8 py-4 text-left flex flex-col justify-center">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Assigned Practice
                    </span>
                    <span className="mt-1 block text-[13px] font-bold text-slate-800 truncate">
                      {getAssignedPractice(proposal.requirementSummary.categoryId, proposal.requirementSummary.categoryLabel)}
                    </span>
                  </div>
                </div>

              </div>
            </section>

            {/* UNMATCHED BESPOKE FALLBACK ALERT */}
            {proposal.unmatchedFallback && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start space-x-3 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <span className="font-bold block">Bespoke Architectural Scope Detected</span>
                  <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                    No standard pre-packaged catalog directly mirrors your specific brief. We have assembled recommended turnkey infrastructure below, and invite you to request a tailored architectural blueprint through our senior team in Section E.
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION B: RECOMMENDED SOLUTIONS
               ══════════════════════════════════════════════════════════════════ */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins">
                    Solutions We Recommend
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Explore the most relevant solutions based on your requirement.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Showing {proposal.curatedSolutions.length} Curated Turnkey Packages
                </span>
              </div>

              {/* Recommended Service Cards (3 to 6 cards in 3-column grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proposal.curatedSolutions.map((card) => {
                  const isSelected = selectedCards.has(card.cardSlug);
                  const isFavorited = wishlist.has(card.cardSlug);

                  return (
                    <article
                      key={card.cardSlug}
                      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md"
                    >
                      <div>
                        {/* Architectural / Product Image */}
                        <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden border-b border-slate-100 group">
                          {card.imageUrl ? (
                            <MediaImage
                              src={card.imageUrl}
                              alt={card.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              fallbackNode={
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                  <Building2 className="w-12 h-12" />
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <Building2 className="w-12 h-12" />
                            </div>
                          )}

                          {/* Focus Domain Badge */}
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs uppercase tracking-wider bg-slate-900 text-white font-mono">
                              {proposal.requirementSummary.categoryLabel}
                            </span>
                          </div>

                          {/* Wishlist Bookmark Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(card.cardSlug, e)}
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                              isFavorited
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-rose-500'
                            }`}
                            title="Save solution"
                            aria-label="Save solution"
                          >
                            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 space-y-4">
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-poppins leading-snug line-clamp-2">
                              {card.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3">
                              {card.summary}
                            </p>
                          </div>

                          {/* Key Inclusions (Rendered only if present on page) */}
                          {card.inclusions && card.inclusions.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block font-mono">
                                KEY INCLUSIONS
                              </span>
                              <ul className="space-y-1.5">
                                {card.inclusions.slice(0, 3).map((inc, i) => (
                                  <li key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="leading-snug break-words">{inc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Why this is relevant to the user's requirement */}
                          {card.whyRelevant && (
                            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block font-mono flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                WHY THIS IS RELEVANT
                              </span>
                              <p className="text-xs text-slate-700 leading-normal mt-1">
                                {card.whyRelevant}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions (Two Buttons) */}
                      <div className="p-5 pt-0 flex flex-col sm:flex-row items-center gap-2">
                        <Link
                          to={card.targetUrl}
                          className="w-full sm:flex-1 inline-flex items-center justify-center space-x-1.5 border border-slate-300 hover:border-slate-800 text-slate-800 hover:text-slate-900 font-bold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer text-center"
                        >
                          <span>Explore Solution</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isSelected) toggleCardSelection(card.cardSlug);
                            const consultation = document.getElementById('consultation-form');
                            if (consultation) consultation.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-full sm:flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Consultation Added' : 'Request Consultation'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                SECTION C: Complete Your Campus Infrastructure (Adjacent Campus Infrastructure)
                3 Full-Sized Hub Cards matching the design language of CampusMart Hub Pages
               ══════════════════════════════════════════════════════════════════ */}
            {proposal.complementaryInfra && proposal.complementaryInfra.length > 0 && (
              <section className="space-y-5 pt-6 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins">
                      Complete Your Campus Infrastructure
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Other facilities that can complement your requirement.
                    </p>
                  </div>
                  <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
                    Adjacent Campus Infrastructure
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {proposal.complementaryInfra.map((comp) => (
                    <article
                      key={comp.cardSlug}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl justify-between"
                    >
                      <Link to={comp.targetUrl} className="flex flex-col flex-1">
                        {/* Hub Card Image with MediaImage & Gradient Overlay */}
                        <div className="relative h-48 sm:h-52 bg-slate-100 overflow-hidden">
                          <MediaImage
                            src={comp.imageUrl || undefined}
                            alt={comp.title}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/15 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/95 text-slate-800 shadow-xs uppercase tracking-wider font-mono">
                              {comp.badge || 'Complementary Hub'}
                            </span>
                          </div>
                        </div>

                        {/* Hub Card Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-cm-blue transition-colors font-poppins leading-snug line-clamp-2">
                              {comp.title}
                            </h3>
                            {comp.description && (
                              <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                                {comp.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Hub Card Footer */}
                      <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <Link
                          to={comp.targetUrl}
                          className="text-xs font-bold text-slate-700 group-hover:text-cm-blue inline-flex items-center space-x-1.5 transition-colors"
                        >
                          <span>Explore Hub</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION D: Institutional Precedents & Delivery Verifications (3-Column Edge-to-Edge)
               ══════════════════════════════════════════════════════════════════ */}
            {proposal.caseStudies && proposal.caseStudies.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins">
                    Explore Relevant Projects & Ideas
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Campus architecture references, laboratory design concepts, and completed institutional case studies.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  {proposal.caseStudies.map((cs, index) => {
                    const isCompleted = cs.badge === 'COMPLETED PROJECT' || index === 0;

                    return (
                      <div
                        key={cs.slug}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all space-y-3 p-5 flex flex-col justify-between"
                      >
                        {cs.imageUrl && (
                          <div className="aspect-[16/10] rounded-lg overflow-hidden bg-slate-100">
                            <MediaImage
                              src={cs.imageUrl}
                              alt={cs.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded font-mono inline-block ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {isCompleted ? 'COMPLETED PROJECT' : 'CONCEPTUAL DESIGN'}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 font-poppins leading-snug">
                            {cs.title}
                          </h4>
                          {cs.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {cs.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <Link
                            to={`/case-studies/${cs.slug}`}
                            className="text-xs font-bold text-slate-700 hover:text-cm-blue inline-flex items-center space-x-1"
                          >
                            <span>{isCompleted ? 'View Case Study' : 'View Design Concept'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION E: Turnkey Consultation & Scope Request
               ══════════════════════════════════════════════════════════════════ */}
            <section
              id="consultation-form"
              className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins">
                  Have a Specific Campus Requirement? Let's Plan It Together.
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  Every institution has different space requirements, academic priorities and budgets. Share your project details and our team will help you identify the right infrastructure solutions.
                </p>
              </div>

              {formSubmittedCode ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-3 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="text-xl font-bold text-emerald-950 font-poppins">
                    Requirement Submitted Successfully
                  </h3>
                  <p className="text-sm text-emerald-800 max-w-lg mx-auto leading-relaxed">
                    Our Senior Education Infrastructure Directorate has received your requirement. A project specialist will connect with you within 24 business hours.
                  </p>
                  <div className="pt-2">
                    <span className="font-mono text-xs font-bold bg-white text-emerald-800 border border-emerald-300 px-3.5 py-1.5 rounded-md inline-block shadow-xs">
                      REFERENCE CODE: {formSubmittedCode}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConsultationSubmit} className="space-y-6">
                  {formError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
                      {formError}
                    </div>
                  )}

                  {/* Pre-Selected Solutions Tag Strip */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">
                      Selected Scope Items ({selectedCards.size})
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {proposal.curatedSolutions.map((card) => {
                        const isChecked = selectedCards.has(card.cardSlug);
                        return (
                          <button
                            key={card.cardSlug}
                            type="button"
                            onClick={() => toggleCardSelection(card.cardSlug)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                              isChecked
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-cm-blue" />
                            <span>{card.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 10 Clean Client-Specified Enquiry Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 2. Institution Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Institution Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formInstitution}
                        onChange={(e) => setFormInstitution(e.target.value)}
                        placeholder="e.g. Apex Institute of Technology"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 3. Designation */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={formDesignation}
                        onChange={(e) => setFormDesignation(e.target.value)}
                        placeholder="e.g. Dean / Principal / Trustee / Director"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 4. Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="dean@institution.edu.in"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 5. Mobile Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 6. Institution Location */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Institution Location (City / State)
                      </label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Pune, Maharashtra"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 7. Project Type */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Project Type
                      </label>
                      <select
                        value={formProjectType}
                        onChange={(e) => setFormProjectType(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      >
                        <option value="New Campus">New Campus</option>
                        <option value="Existing Campus">Existing Campus</option>
                        <option value="Expansion">Expansion</option>
                        <option value="Upgrade">Upgrade / Modernisation</option>
                      </select>
                    </div>

                    {/* 8. Approximate Project Budget (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approximate Project Budget (Optional)
                      </label>
                      <input
                        type="text"
                        value={formBudget}
                        onChange={(e) => setFormBudget(e.target.value)}
                        placeholder="e.g. ₹50 Lakhs / Under finalization"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 9. Project Timeline (Optional) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Project Timeline (Optional)
                      </label>
                      <input
                        type="text"
                        value={formTimeline}
                        onChange={(e) => setFormTimeline(e.target.value)}
                        placeholder="e.g. Within 3 months / Next Academic Session"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20"
                      />
                    </div>

                    {/* 10. Additional Requirements (Textarea) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Additional Requirements
                      </label>
                      <textarea
                        rows={3}
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder="Outline space dimensions, seat capacity, specific technical standards or accreditations..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cm-blue/20 font-sans"
                      />
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Transmits directly to SchoolMart educational infrastructure specialists. Zero third-party sharing.
                    </p>

                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-lg text-xs sm:text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {formSubmitting ? 'Submitting Requirement...' : 'Submit My Requirement'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                SECTION F: BESPOKE ARCHITECTURE & CUSTOM TENDER FALLBACK
               ══════════════════════════════════════════════════════════════════ */}
            {proposal.unmatchedFallback && (
              <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-5">
                <div className="flex items-start space-x-3">
                  <Building2 className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-xl font-bold font-poppins text-white">
                      Custom Architectural & Execution Scope Required
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                      Your institutional query describes specialized criteria outside standard pre-packaged catalogs. SchoolMart regularly engineers bespoke academic facilities, master plans, and regulatory compliance setups tailored to school and institutional criteria.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    Have an existing tender document, architectural blueprint, or council DPR? Connect directly with our Senior Engineering Directorate.
                  </div>
                  <Link
                    to="/contact-us?subject=Bespoke+Campus+Requirement"
                    className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-5 py-2.5 rounded-lg text-xs transition-colors shrink-0"
                  >
                    <span>Transmit Bespoke Tender Dossier</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
