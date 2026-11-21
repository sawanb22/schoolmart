import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Eye,
  ArrowRight,
  Armchair,
  Microscope,
  Monitor,
  Volleyball,
  Cpu,
  BookOpen,
  ShoppingBag,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageData } from '@/hooks/usePageData';
import MediaImage from '@/components/ui/media-image';

interface DivisionItem {
  title: string;
  slug: string;
  description: string;
  iconName: string;
  badge?: string;
}

const DEFAULT_DIVISIONS: DivisionItem[] = [
  {
    title: 'Furniture',
    slug: 'furniture',
    description: 'Classroom desks, ergonomic faculty chairs, collaborative pods, and institutional furnishings.',
    iconName: 'Armchair',
    badge: 'Campus Core',
  },
  {
    title: 'Science Labs',
    slug: 'labs',
    description: 'Physics, chemistry, biology, and STEM apparatus with heavy-duty laboratory workbenches.',
    iconName: 'Microscope',
    badge: 'STEM & Labs',
  },
  {
    title: 'Smart Classrooms',
    slug: 'smart-classrooms',
    description: 'Interactive flat panels, digital podiums, acoustic panels, and smart presentation solutions.',
    iconName: 'Monitor',
    badge: 'Digital AV',
  },
  {
    title: 'Sports Infra',
    slug: 'sports',
    description: 'Multi-sport synthetic courts, indoor wooden gymnasium flooring, and athletics equipment.',
    iconName: 'Volleyball',
    badge: 'Athletics & PE',
  },
  {
    title: 'Tech Infra',
    slug: 'tech-infra',
    description: 'Campus networking, server racks, digital signage, surveillance, and IT infrastructure.',
    iconName: 'Cpu',
    badge: 'Enterprise IT',
  },
  {
    title: 'Libraries',
    slug: 'libraries',
    description: 'Modular high-density shelving, digital RFID kiosks, collaboration hubs, and quiet study pods.',
    iconName: 'BookOpen',
    badge: 'Learning Hubs',
  },
];

const DIVISION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Armchair,
  Microscope,
  Monitor,
  Volleyball,
  Cpu,
  BookOpen,
};

const DEFAULTS = {
  heroTitle: 'Product Catalog 2025',
  heroSubtitle: 'Complete product range for educational institutions.',
  heroImage: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  section1Title: 'Download Our Latest Catalog',
};

const ProductCatalog = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { data } = usePageData('product-catalog');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
      if (gridRef.current) {
        gsap.fromTo(
          gridRef.current.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, delay: 0.2, ease: 'power2.out' }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  const heroTitle = data.heroTitle ?? DEFAULTS.heroTitle;
  const heroSubtitle = data.heroSubtitle ?? DEFAULTS.heroSubtitle;
  const heroImage = data.heroImage ?? DEFAULTS.heroImage;
  const section1Title = data.section1Title ?? DEFAULTS.section1Title;

  const rawDivisions = data.divisions || data.categories;
  const divisions: DivisionItem[] = Array.isArray(rawDivisions) && rawDivisions.length > 0
    ? rawDivisions
    : DEFAULT_DIVISIONS;

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 px-4 sm:px-6 lg:px-8">
        <div ref={heroRef} className="bg-cm-yellow rounded-2xl py-8 sm:py-10 md:py-12 px-6 sm:px-8 lg:px-12 max-w-5xl mx-auto shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 text-cm-blue-dark text-xs font-bold uppercase tracking-wider mb-4">
              <ShoppingBag className="w-3.5 h-3.5 text-cm-blue" />
              <span>Campus Procurement Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cm-blue-dark mb-4 tracking-tight leading-tight">
              {heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-cm-blue-dark/75 max-w-3xl mx-auto leading-relaxed">
              {heroSubtitle}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/shop?category=all"
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:brightness-110 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Browse All Products Online</span>
              </Link>
              <Link
                to="/catalogues"
                className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm hover:scale-105 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>PDF Catalogues</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Product Divisions Quick-Grid */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-cm-blue-dark tracking-tight">
              {data.categoriesSectionTitle || 'Browse by Product Division'}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              {data.categoriesSectionSubtitle ||
                'Select a product division to view online catalog items, check specifications, or order institutional supplies.'}
            </p>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {divisions.map((div) => {
              const Icon = DIVISION_ICONS[div.iconName] || Armchair;
              return (
                <Link
                  key={div.slug}
                  to={`/shop?category=${div.slug}`}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-cm-blue/40 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-cm-blue flex items-center justify-center transition-colors group-hover:bg-cm-blue group-hover:text-white">
                        <Icon className="w-6 h-6" />
                      </div>
                      {div.badge && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-cm-blue transition-colors">
                          {div.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-cm-blue-dark group-hover:text-cm-blue transition-colors mb-2">
                      {div.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                      {div.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-cm-blue">
                    <span>Browse Products</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Catalogue PDF Download CTA */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2">
              <MediaImage
                src={heroImage}
                alt={heroTitle}
                className="w-full h-64 sm:h-72 object-cover rounded-xl shadow-sm"
              />
            </div>
            <div className="w-full md:w-1/2 text-left space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider">
                <Download className="w-3.5 h-3.5" />
                <span>Download Catalogues</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-cm-blue-dark">
                {section1Title}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Browse our complete range of products, detailed blueprints, and solution guides in ready-to-print or digital format.
              </p>
              <div className="pt-2">
                <Link to="/catalogues" className="btn-primary inline-flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span>View PDF</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProductCatalog;
