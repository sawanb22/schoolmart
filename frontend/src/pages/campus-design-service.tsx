import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Send, X, BookOpen, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '@/api/client';
import { usePageData } from '@/hooks/usePageData';
import { resolveMediaUrl } from '@/lib/media-url';
import { slugifyStepTitle } from './campus-design-execution.data';
import { SafeRichText } from '@/components/common/RichTextContent';

interface DeliverableItem {
  title: string;
  desc: string;
  phaseLabel?: string;
}

interface ServiceCard {
  title: string;
  description?: string;
  image?: string;
  href?: string;
  slug?: string;
  tag?: string;
  active?: boolean;
  categories?: string[];
  methodology?: string;
  methodologyHeading?: string;
  deliverablesHeading?: string;
  deliverables?: DeliverableItem[];
  hideCompliance?: boolean;
  hideRelatedBlog?: boolean;
  hideHero?: boolean;
  hideMethodology?: boolean;
  hideDeliverables?: boolean;
  hideActionBar?: boolean;
  ctaTitle?: string;
  ctaHref?: string;
  ctaButtonLabel?: string;
}

interface CampusDesignPageStyles {
  headingFont?: string;
  bodyFont?: string;
  primaryColor?: string;
}

interface CampusDesignPageData {
  cards?: ServiceCard[];
  styles?: CampusDesignPageStyles;
  hideHero?: boolean;
  hideMethodology?: boolean;
  hideDeliverables?: boolean;
  hideActionBar?: boolean;
  hideCompliance?: boolean;
  complianceTitle?: string;
  complianceDescription?: string;
  hideRelatedBlog?: boolean;
  relatedBlogTitle?: string;
  relatedBlogSubtitle?: string;
  relatedBlogHref?: string;
  relatedBlogButtonLabel?: string;
  contactHref?: string;
  contactButtonLabel?: string;
  quoteButtonLabel?: string;
  ctaButtonLabel?: string;
  hideCta?: boolean;
  subpageCtaTitle?: string;
  ctaTitle?: string;
  subpageCtaHref?: string;
  ctaHref?: string;
  subpageCtaButtonLabel?: string;
  methodologyHeading?: string;
  deliverablesHeading?: string;
}

const CampusDesignService = () => {
  const { serviceSlug } = useParams();
  const { data, loading } = usePageData<CampusDesignPageData>('campus-design');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', institution: '', pincode: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const cards: ServiceCard[] = Array.isArray(data?.cards) ? data.cards : [];
  const currentSlug = serviceSlug || (cards[0]?.title ? (cards[0].slug?.trim() || slugifyStepTitle(cards[0].title)) : '');
  const service =
    cards.find(
      (card) =>
        (card.slug && card.slug.trim() === currentSlug) ||
        (card.title && slugifyStepTitle(card.title) === currentSlug) ||
        (card.href && card.href.endsWith(`/${currentSlug}`)),
    ) || (!serviceSlug ? cards[0] : undefined);

  useEffect(() => {
    if (service && !serviceSlug && service.title) {
      window.history.replaceState(null, '', `/campus-design/${service.slug?.trim() || slugifyStepTitle(service.title)}`);
    }
  }, [service, serviceSlug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50/60 py-8 sm:py-12 text-slate-800 animate-pulse">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-4 w-48 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-200" />
          </div>
          <article className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="aspect-[21/9] min-h-[260px] sm:min-h-[380px] w-full bg-slate-200" />
            <div className="p-6 sm:p-10 space-y-8">
              <div className="space-y-3">
                <div className="h-7 w-2/3 rounded-lg bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-200" />
                <div className="h-4 w-5/6 rounded bg-slate-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-28 rounded-2xl bg-slate-100" />
                <div className="h-28 rounded-2xl bg-slate-100" />
              </div>
            </div>
          </article>
        </div>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-slate-800">Service not found</h1>
        <p className="text-gray-600">That campus design service couldn't be found.</p>
        <Link to="/campus-design" className="btn-primary">Back to Campus Design Overview</Link>
      </main>
    );
  }

  const serviceTitle = service.title || '';
  const tag = service.tag?.trim() || service.categories?.[0]?.trim() || '';
  const methodology = service.methodology?.trim() || service.description || '';
  const rawDeliverables: DeliverableItem[] = Array.isArray(service.deliverables) ? service.deliverables : [];
  const deliverables = rawDeliverables.filter((item) => item?.title?.trim() || item?.desc?.trim());

  const styles = data.styles || {};
  const headingFontClass =
    styles.headingFont === 'playfair'
      ? 'font-playfair'
      : styles.headingFont === 'grotesk'
      ? 'font-grotesk'
      : styles.headingFont === 'opensans'
      ? 'font-opensans'
      : styles.headingFont === 'system'
      ? 'font-sans'
      : 'font-poppins';

  const bodyFontClass =
    styles.bodyFont === 'poppins'
      ? 'font-poppins'
      : styles.bodyFont === 'grotesk'
      ? 'font-grotesk'
      : styles.bodyFont === 'system'
      ? 'font-sans'
      : 'font-opensans';


  const methodologyHeading = service.methodologyHeading?.trim() || data.methodologyHeading?.trim() || 'Pedagogical Philosophy & Approach';
  const deliverablesHeading = service.deliverablesHeading?.trim() || data.deliverablesHeading?.trim() || 'Architectural Deliverables & Scope';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/contact/quote', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        institution: formData.institution.trim(),
        pincode: formData.pincode.trim(),
        items: serviceTitle,
        message: `Service: ${serviceTitle}\n${formData.message.trim()}`,
      });
      setSubmitted(true);
    } catch (requestError: unknown) {
      const serverMsg = (requestError as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(serverMsg || 'Failed to submit your quotation request. Please check your phone number and details.');
    } finally {
      setSubmitting(false);
    }
  };

  const heroImage = resolveMediaUrl(service.image) || service.image || '';

  const showHero = !service.hideHero && !data.hideHero;
  const showMethodology = !service.hideMethodology && !data.hideMethodology;
  const showDeliverables = !service.hideDeliverables && !data.hideDeliverables && deliverables.length > 0;
  const showCompliance = !data.hideCompliance && !service.hideCompliance && Boolean(data.complianceTitle);
  const showRelatedBlog = !data.hideRelatedBlog && !service.hideRelatedBlog && Boolean(data.relatedBlogTitle);
  const showActionBar = !service.hideActionBar && !data.hideActionBar;
  const hasVisibleContent = showHero || showMethodology || showDeliverables || showCompliance || showRelatedBlog || showActionBar;

  return (
    <main className={`min-h-screen bg-slate-50/60 py-8 sm:py-12 text-slate-800 ${bodyFontClass}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/campus-design" className="inline-flex items-center gap-2 text-cm-blue font-bold text-sm hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Campus Design Overview
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Design & Architecture
          </span>
        </div>

        {/* Article Container */}
        {!hasVisibleContent ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center text-slate-500 shadow-sm">
            This subpage content is currently marked as hidden by the administrator.
          </div>
        ) : (
          <article className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Hero Banner */}
            {showHero && (
            <div className="relative aspect-[21/9] min-h-[260px] sm:min-h-[380px] w-full overflow-hidden bg-slate-900">
              {heroImage && (
                <img
                  src={heroImage}
                  alt={serviceTitle}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 text-white">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cm-yellow text-slate-950 text-xs font-black uppercase tracking-wider mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> {tag}
                </span>
                <h1 className={`${headingFontClass} text-3xl sm:text-5xl font-black tracking-tight text-white`}>{serviceTitle}</h1>
                {service.description && (
                  <SafeRichText
                    content={service.description}
                    context="card"
                    inheritColor
                    className="mt-2 text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed block"
                  />
                )}
              </div>
            </div>
          )}

          {/* Article Body */}
          <div className="p-6 sm:p-10 space-y-10">
            {/* Overview & Methodology */}
            {!service.hideMethodology && !data.hideMethodology && (
              <div>
                <h2 className={`${headingFontClass} text-2xl font-bold text-cm-blue-dark tracking-tight mb-4`}>{methodologyHeading}</h2>
                <SafeRichText
                  content={methodology}
                  context="body"
                  className="text-base sm:text-lg text-slate-600 leading-relaxed"
                />
              </div>
            )}

            {/* Core Deliverables Grid */}
            {!service.hideDeliverables && !data.hideDeliverables && deliverables.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <Layers className="w-5 h-5 text-cm-blue" />
                  <h3 className={`${headingFontClass} text-xl font-bold text-slate-950`}>{deliverablesHeading}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {deliverables.map((item, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition">
                      <span className="text-xs font-black text-cm-blue uppercase tracking-wider block mb-1">
                        {item.phaseLabel?.trim() || `${String(idx + 1).padStart(2, '0')}. Phase`}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mb-1.5">{item.title}</h4>
                      <SafeRichText
                        content={item.desc}
                        context="card"
                        className="text-sm text-slate-600 leading-relaxed block"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standards & Compliance */}
            {!data.hideCompliance && !service.hideCompliance && Boolean(data.complianceTitle) && (
              <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-cm-blue shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{data.complianceTitle}</h4>
                    {data.complianceDescription && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{data.complianceDescription}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Read Related Blog Insights Card */}
            {!data.hideRelatedBlog && !service.hideRelatedBlog && Boolean(data.relatedBlogTitle) && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-cm-blue-dark text-white flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-cm-yellow" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{data.relatedBlogTitle}</h4>
                    {data.relatedBlogSubtitle && (
                      <p className="text-xs sm:text-sm text-white/70 mt-1">{data.relatedBlogSubtitle}</p>
                    )}
                  </div>
                </div>
                <Link
                  to={data.relatedBlogHref || '/blog'}
                  className="shrink-0 px-5 py-2.5 rounded-full bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  {data.relatedBlogButtonLabel || 'Read Blog Insights'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Action Bar */}
            {!service.hideActionBar && !data.hideActionBar && (
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link to="/campus-design" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition">
                  &larr; View all campus design disciplines
                </Link>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    to={data.contactHref || '/contact-us'}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm text-center hover:bg-slate-50 transition"
                  >
                    {data.contactButtonLabel || 'Contact Design Team'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(true)}
                    className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                  >
                    {data.quoteButtonLabel || data.ctaButtonLabel || 'Request a Project Quote'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      )}

        {/* Bottom CTA Banner */}
        {!data.hideCta && (
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-cm-blue-dark to-cm-blue p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <p className="text-sm font-semibold text-white sm:text-base">
              {service.ctaTitle || data.subpageCtaTitle || data.ctaTitle || `Ready to start your ${serviceTitle.toLowerCase()} project?`}
            </p>
            <Link
              to={service.ctaHref || data.subpageCtaHref || data.ctaHref || '/request-quote'}
              className="btn-secondary inline-flex flex-shrink-0 items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              {service.ctaButtonLabel || data.subpageCtaButtonLabel || data.ctaButtonLabel || 'Get a Project Quote'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* On-Demand Quotation Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 p-6 bg-slate-50">
              <div>
                <span className="text-xs font-bold text-cm-blue uppercase tracking-wider">Quotation Request</span>
                <h3 className="text-xl font-bold text-slate-950 mt-1">{serviceTitle}</h3>
                <p className="text-xs text-slate-500">Provide your campus details for a tailored architectural proposal.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowQuoteModal(false); setSubmitted(false); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                  <h4 className="text-xl font-bold text-slate-950 mb-1">Request Received</h4>
                  <p className="text-sm text-slate-600 mb-6">Our chief campus architect will contact you within 24 hours with feasibility guidelines for {serviceTitle}.</p>
                  <button
                    type="button"
                    onClick={() => { setShowQuoteModal(false); setSubmitted(false); }}
                    className="btn-primary w-full"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{error}</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-xs">Full Name *</label>
                      <input className="form-input text-sm" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label text-xs">Email *</label>
                      <input type="email" className="form-input text-sm" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-xs">Phone *</label>
                      <input type="tel" pattern="(?:\+?91[\s\-]?)?0?[0-9\s\-]{10,14}" className="form-input text-sm" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className="form-label text-xs">Pincode *</label>
                      <input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} className="form-input text-sm" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label text-xs">Institution / Organization *</label>
                    <input className="form-input text-sm" required value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} placeholder="University / College / School name" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Requirements *</label>
                    <textarea className="form-input text-sm min-h-[90px]" required placeholder={`Tell us about your campus acreage, student capacity, or ${serviceTitle.toLowerCase()} goals...`} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 text-sm shadow-sm disabled:opacity-60">
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Send Quotation Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default CampusDesignService;
