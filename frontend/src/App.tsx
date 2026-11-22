import { BrowserRouter, Routes, Route, useLocation, useParams, Navigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { lazy } from '@/lib/lazy-with-retry';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { PageCardGridSkeleton } from '@/components/ui/page-skeleton';
import { useResolvePath } from '@/hooks/useResolvePath';

// Layout
import TopBar from '@/components/layout/topbar';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import ScrollToTop from '@/components/layout/scroll-to-top';
import CategoryBar from '@/components/sections/category-bar';
import BreadcrumbBar from '@/components/layout/breadcrumb-bar';

// Core Pages (Always present)
const Home = lazy(() => import('@/pages/home'));
const Login = lazy(() => import('@/pages/login'));
const Registration = lazy(() => import('@/pages/registration'));
const NotFound = lazy(() => import('@/pages/not-found'));
const AdminRoutes = lazy(() => import('@/admin/AdminRoutes'));
const BlogPost = lazy(() => import('@/pages/blog-post'));
const CaseStudyDetail = lazy(() => import('@/pages/case-study-detail'));
const SmartClassrooms = lazy(() => import('@/pages/smart-classrooms'));
const UniversalArticleDetail = lazy(() => import('@/components/cms/UniversalArticleDetail'));
const GenericPageRenderer = lazy(() => import('@/components/cms/GenericPageRenderer'));
const SolutionPageRenderer = lazy(() => import('@/components/cms/SolutionPageRenderer'));
const ServicePageRenderer = lazy(() => import('@/components/cms/ServicePageRenderer'));
const CompletedProjectDetail = lazy(() => import('@/pages/completed-project-detail'));
const FindSolutions = lazy(() => import('@/pages/FindSolutions'));
const DynamicChildPageRoute = lazy(() => import('@/components/cms/DynamicChildPageRoute'));

// Existing page templates map
const PageTemplates: Record<string, any> = {
  'ai-digital-design-supply': lazy(() => import('@/pages/ai-digital-design-supply')),
  'ai-ml': lazy(() => import('@/pages/ai-ml')),
  'ai-stations': lazy(() => import('@/pages/ai-stations')),
  'assessment-system': lazy(() => import('@/pages/assessment-system')),
  'blog': lazy(() => import('@/pages/blog')),
  'ar-vr-experiences': lazy(() => import('@/pages/ar-vr-experiences')),
  'campus-automation': lazy(() => import('@/pages/campus-automation')),
  'campus-design-execution': lazy(() => import('@/pages/campus-design-execution')),
  'campus-master-planning': lazy(() => import('@/pages/campus-master-planning')),
  'campus-furniture-design': lazy(() => import('@/pages/campus-furniture-design')),
  'campus-design': lazy(() => import('@/pages/campus-design')),
  'catalogues': lazy(() => import('@/pages/catalogues')),
  'classifieds': lazy(() => import('@/pages/classifieds')),
  'colleges-universities-for-sale': lazy(() => import('@/pages/colleges-universities-for-sale')),
  'collaboration-spaces': lazy(() => import('@/pages/collaboration-spaces')),
  'contact-us': lazy(() => import('@/pages/contact-us')),
  'about-us': lazy(() => import('@/pages/about-us')),
  'digital-transformation': lazy(() => import('@/pages/digital-transformation')),
  'faq': lazy(() => import('@/pages/faq')),
  'furniture-design-supply': lazy(() => import('@/pages/furniture-design-supply')),
  'furniture': lazy(() => import('@/pages/furniture')),
  'science-tech-labs': lazy(() => import('@/pages/science-tech-labs')),
  'job-openings': lazy(() => import('@/pages/job-openings')),
  'labs': lazy(() => import('@/pages/labs')),
  'libraries': lazy(() => import('@/pages/libraries')),
  'library-management': lazy(() => import('@/pages/library-management')),
  'lms': lazy(() => import('@/pages/lms')),
  'lookbook': lazy(() => import('@/pages/lookbook')),
  'my-account': lazy(() => import('@/pages/my-account')),
  'new-environments': lazy(() => import('@/pages/new-environments')),
  'partnership': lazy(() => import('@/pages/partnership')),
  'partner-with-colleges': lazy(() => import('@/pages/partner-with-colleges')),
  'product-catalog': lazy(() => import('@/pages/product-catalog')),
  'request-quote': lazy(() => import('@/pages/request-quote')),
  'sports-design-execution': lazy(() => import('@/pages/sports-design-execution')),
  'sports-infra': lazy(() => import('@/pages/sports-infra')),
  'tech-infra': lazy(() => import('@/pages/tech-infra')),
  'smart-classrooms': SmartClassrooms,
  'home': Home,
};

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-cm-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function Layout({
  children,
  showCategoryBar = true,
  showBreadcrumb = true,
}: {
  children: React.ReactNode;
  showCategoryBar?: boolean;
  showBreadcrumb?: boolean;
}) {
  const location = useLocation();
  if (!location.pathname.startsWith('/admin') && location.pathname !== location.pathname.toLowerCase()) {
    return <Navigate to={location.pathname.toLowerCase() + location.search} replace />;
  }
  const isAuthPage = ['/login', '/register', '/registration'].includes(location.pathname);

  return (
    <div className={`min-h-screen flex flex-col ${isAuthPage ? 'auth-page-shell' : ''}`}>
      <TopBar />
      <Header />
      {showCategoryBar && <CategoryBar />}
      {showBreadcrumb && <BreadcrumbBar />}
      <main className="flex-1">
        <Suspense fallback={<PageCardGridSkeleton cardCount={6} />}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export const DynamicPageRoute = () => {
  const { slug } = useParams();
  const path = slug ? `/${slug}` : '';
  const { data: resolveResult, isLoading } = useResolvePath(path);

  if (isLoading) return <PageCardGridSkeleton cardCount={6} />;

  if (resolveResult?.type === 'redirect' && resolveResult.redirectTo) {
    return <Navigate to={resolveResult.redirectTo} replace />;
  }

  if (!resolveResult || resolveResult.type !== 'page' || !resolveResult.page) {
    return <NotFound />;
  }

  const pageRecord = resolveResult.page;
  const resolvedSlug = resolveResult.slug || (pageRecord.slug as string) || slug || '';
  const templateId = (resolveResult.template || pageRecord.template) as string | undefined;

  // Resolve existing template component if specified (with alias normalization)
  const resolvedTemplate = templateId
    ? (PageTemplates[templateId]
       || (templateId === 'sports-infrastructure' ? PageTemplates['sports-infra'] : null)
       || (templateId === 'lab-products' ? PageTemplates['labs'] : null)
       || (templateId === 'library-products' ? PageTemplates['libraries'] : null)
       || (templateId === 'sports-products' ? PageTemplates['sports-infra'] : null)
       || (templateId === 'tech-infra-products' ? PageTemplates['tech-infra'] : null)
       || (templateId === 'home' || resolvedSlug === 'home' ? Home : null))
    : null;

  if (resolvedTemplate) {
    const Component = resolvedTemplate;
    return <Component />;
  }

  // Route by templateId for dynamically created pages
  if (templateId === 'solution-hub') {
    return <SolutionPageRenderer slug={resolvedSlug} />;
  }
  if (templateId === 'service-suite') {
    return <ServicePageRenderer slug={resolvedSlug} />;
  }

  // Gracefully render dynamic CMS page content using GenericPageRenderer (SOLID SRP fallback)
  let parsedPageData = {};
  try {
    parsedPageData =
      typeof pageRecord.pageData === 'string'
        ? JSON.parse(pageRecord.pageData)
        : (pageRecord.pageData as Record<string, unknown>) || {};
  } catch {
    parsedPageData = {};
  }

  return <GenericPageRenderer page={pageRecord as any} pageData={parsedPageData} />;
};

const ProductDetail = lazy(() => import('@/pages/product-detail'));
const PartnershipModelDetail = lazy(() => import('@/pages/partnership-model-detail'));
const CollaborationDetail = lazy(() => import('@/pages/collaboration-detail'));
const AiMlDetail = lazy(() => import('@/pages/ai-ml-detail'));
const LibraryManagementDetail = lazy(() => import('@/pages/library-management-detail'));
const ScienceTechLabsDetail = lazy(() => import('@/pages/science-tech-labs-detail'));
const CollaborationSpacesDetail = lazy(() => import('@/pages/collaboration-spaces-detail'));
const AiStationsDetail = lazy(() => import('@/pages/ai-stations-detail'));
const DigitalTransformationDetail = lazy(() => import('@/pages/digital-transformation-detail'));
const NewEnvironmentsDetail = lazy(() => import('@/pages/new-environments-detail'));
const SportsInfraDetail = lazy(() => import('@/pages/sports-infra-detail'));
const TechInfraDetail = lazy(() => import('@/pages/tech-infra-detail'));
const LabsDetail = lazy(() => import('@/pages/labs-detail'));
const LibrariesDetail = lazy(() => import('@/pages/libraries-detail'));
const CampusAutomationDetail = lazy(() => import('@/pages/campus-automation-detail'));

const ExternalRedirect = ({ url }: { url: string }) => {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SiteContentProvider>
        <WishlistProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Core Pages */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Layout><Login /></Layout>} />
              <Route path="/register" element={<Layout><Registration /></Layout>} />
              <Route path="/registration" element={<Layout><Registration /></Layout>} />
              <Route path="/product/:slug" element={<Layout><ProductDetail /></Layout>} />
              <Route path="/blog/:slug" element={<Layout><BlogPost /></Layout>} />
              <Route path="/case-studies/:slug" element={<Layout><CaseStudyDetail /></Layout>} />
              <Route path="/completed-projects/:projectSlug" element={<Layout><CompletedProjectDetail /></Layout>} />
              <Route path="/partner-with-colleges/:modelSlug" element={<Layout><PartnershipModelDetail /></Layout>} />
              <Route path="/campus-design-execution/:stepSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-design-execution" hubTitle="Campus Design & Execution" defaultCtaHref="/request-quote" defaultCtaLabel="Get a Project Quote" /></Layout>} />
              <Route path="/sports-design-execution/:stepSlug" element={<Layout><UniversalArticleDetail hubSlug="sports-design-execution" hubTitle="Sports Design & Execution" defaultCtaHref="/request-quote" defaultCtaLabel="Request a Quote" /></Layout>} />
              <Route path="/collaboration/:itemSlug" element={<Layout><CollaborationDetail /></Layout>} />
              <Route path="/innovation/:trackSlug" element={<Layout><UniversalArticleDetail hubSlug="innovation" hubTitle="Innovation Hub" defaultCtaHref="/partnership" defaultCtaLabel="Partner With Us" /></Layout>} />
              <Route path="/ai-ml/:moduleSlug" element={<Layout><AiMlDetail /></Layout>} />
              <Route path="/library-management/:moduleSlug" element={<Layout><LibraryManagementDetail /></Layout>} />
              <Route path="/innovation-centres/:spaceSlug" element={<Navigate to="/innovation" replace />} />
              <Route path="/innovation-centres" element={<Navigate to="/innovation" replace />} />
              <Route path="/science-tech-labs/:labSlug" element={<Layout><ScienceTechLabsDetail /></Layout>} />
              <Route path="/campus-master-planning/:serviceSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-master-planning" hubTitle="Campus Master Planning" defaultCtaHref="/request-quote" defaultCtaLabel="Get a Project Quote" /></Layout>} />
              <Route path="/ar-vr-experiences/:experienceSlug" element={<Layout><UniversalArticleDetail hubSlug="ar-vr-experiences" hubTitle="AR/VR Experiences" defaultCtaHref="/request-quote" defaultCtaLabel="Request a Quote" /></Layout>} />
              <Route path="/campus-furniture-design/:rangeSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-furniture-design" hubTitle="Campus Furniture Design" defaultCtaHref="/request-quote" defaultCtaLabel="Request a Quote" /></Layout>} />
              <Route path="/furniture-design-supply/:solutionSlug" element={<Layout><UniversalArticleDetail hubSlug="furniture-design-supply" hubTitle="Furniture Design & Supply" defaultCtaHref="/request-quote" defaultCtaLabel="Request a Quote" /></Layout>} />
              <Route path="/ai-digital-design-supply/:solutionSlug" element={<Layout><UniversalArticleDetail hubSlug="ai-digital-design-supply" hubTitle="AI Digital Design & Supply" defaultCtaHref="/request-quote" defaultCtaLabel="Request a Quote" /></Layout>} />
              <Route path="/collaboration-spaces/:spaceSlug" element={<Layout><CollaborationSpacesDetail /></Layout>} />
              <Route path="/ai-stations/:stationSlug" element={<Layout><AiStationsDetail /></Layout>} />
              <Route path="/digital-transformation/:cardSlug" element={<Layout><DigitalTransformationDetail /></Layout>} />
              <Route path="/new-environments/:spaceSlug" element={<Layout><NewEnvironmentsDetail /></Layout>} />
              <Route path="/sports-infra/:facilitySlug" element={<Layout><SportsInfraDetail /></Layout>} />
              <Route path="/tech-infra/:solutionSlug" element={<Layout><TechInfraDetail /></Layout>} />
              <Route path="/labs/:labSlug" element={<Layout><LabsDetail /></Layout>} />
              <Route path="/libraries/:featureSlug" element={<Layout><LibrariesDetail /></Layout>} />
              <Route path="/campus-automation/:moduleSlug" element={<Layout><CampusAutomationDetail /></Layout>} />
              <Route path="/campus-design/:serviceSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-design" hubTitle="Campus Design" defaultCtaHref="/request-quote" defaultCtaLabel="Get a Project Quote" /></Layout>} />
              <Route path="/smart-classrooms" element={<Layout><SmartClassrooms /></Layout>} />
              <Route path="/ai-guide/:articleSlug" element={<Layout><UniversalArticleDetail hubSlug="ai-guide" hubTitle="AI Guide" /></Layout>} />
              <Route path="/setup-college/:articleSlug" element={<Layout><UniversalArticleDetail hubSlug="setup-college" hubTitle="Setup Your College" /></Layout>} />
              <Route path="/ugc-guidelines/:articleSlug" element={<Layout><UniversalArticleDetail hubSlug="ugc-guidelines" hubTitle="UGC Guidelines" /></Layout>} />
              <Route path="/find-solutions" element={<Layout><FindSolutions /></Layout>} />
              <Route path="/ar-vr-learning" element={<Navigate to="/ar-vr-experiences" replace />} />
              <Route path="/furniture-design-supply" element={<Navigate to="/campus-furniture-design" replace />} />
              <Route path="/campus-sale" element={<Navigate to="/school-sale" replace />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/wishlist" element={<Navigate to="/my-account?tab=wishlist" replace />} />
              <Route path="/cart" element={<Navigate to="/my-account?tab=wishlist" replace />} />
              <Route path="/blogs" element={<Navigate to="/blog" replace />} />
              <Route path="/tech-infra/products" element={<Navigate to="/tech-infra" replace />} />
              <Route path="/ai-ml/products" element={<Navigate to="/ai-ml" replace />} />
              <Route path="/lab-products" element={<Navigate to="/labs" replace />} />
              <Route path="/labs/products" element={<Navigate to="/labs" replace />} />
              <Route path="/library-products" element={<Navigate to="/libraries" replace />} />
              <Route path="/libraries/products" element={<Navigate to="/libraries" replace />} />
              <Route path="/sports-products" element={<Navigate to="/sports" replace />} />
              <Route path="/sports-infra/products" element={<Navigate to="/sports" replace />} />
              <Route path="/sports-infrastructure" element={<Navigate to="/sports" replace />} />
              <Route path="/sports-infrastructure/:facilitySlug" element={<Navigate to="/sports" replace />} />
              <Route path="/innovation-centers" element={<Navigate to="/innovation" replace />} />
              <Route path="/innovation-centers/:spaceSlug" element={<Navigate to="/innovation" replace />} />
              <Route path="/services" element={<Navigate to="/campus-design-execution" replace />} />
              <Route path="/solutions" element={<Navigate to="/labs" replace />} />
              <Route path="/shop" element={<ExternalRedirect url="https://schoolmart.store" />} />

              {/* Static pages explicitly mapped so they always work */}
              {Object.keys(PageTemplates).map((path) => {
                const Component = PageTemplates[path];
                return <Route key={path} path={`/${path}`} element={<Layout><Component /></Layout>} />
              })}

              {/* Dynamic /p/:slug Route matching tile/batch article pages */}
              <Route path="/p/:slug" element={<Layout><DynamicPageRoute /></Layout>} />

              {/* Dynamic Catch-All Route matching DB Pages (fallback) */}
              <Route path="/:slug" element={<Layout><DynamicPageRoute /></Layout>} />

              {/* Dynamic Universal Child Route matching DB Hub + Item Pages */}
              <Route path="/:hubSlug/:itemSlug" element={<Layout><DynamicChildPageRoute /></Layout>} />

              {/* Global Wildcard Catch-All for Multi-Segment Unmatched Routes */}
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WishlistProvider>
    </SiteContentProvider>
  </QueryClientProvider>
  );
}

export default App;
