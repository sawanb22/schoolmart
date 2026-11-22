import TopBar from '@/components/layout/topbar';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import CategoryBar from '@/components/sections/category-bar';
import TickerBar from '@/components/sections/ticker-bar';
import SearchBar from '@/components/sections/search-bar';
import HeroBanner from '@/components/sections/hero-banner';
import ServiceCards from '@/components/sections/service-cards';
import FeatureCards from '@/components/sections/feature-cards';
import Resources from '@/components/sections/resources';
import PartnershipForm from '@/components/sections/partnership-form';
import CollaborationsTicker from '@/components/sections/collaborations-ticker';
import { useSiteContent } from '@/contexts/SiteContentContext';
import Seo from '@/components/seo/Seo';
import usePageSeo from '@/hooks/usePageSeo';

export default function Home() {
  const { content } = useSiteContent();
  const styles = content.home_styles || {};
  const homeHero = content.home_hero || {};
  const homeSeo = content.home_seo || {};

  const seoProps = usePageSeo(
    {
      seoTitle: homeSeo.title,
      seoDescription: homeSeo.description,
      ogImage: homeSeo.ogImage || homeHero.image,
      heroTitle: homeHero.title || homeHero.headline,
      heroSubtitle: homeHero.subtitle || homeHero.description,
    },
    'CampusMart - India\'s Premier Higher Ed Setup & Procurement Platform',
    'Comprehensive institutional solutions, laboratory setups, sports infrastructure, smart classrooms, and procurement for universities and colleges across India.',
    '/'
  );

  const headingFontClass =
    styles.headingFont === 'playfair' ? 'font-playfair' :
    styles.headingFont === 'grotesk' ? 'font-grotesk' :
    styles.headingFont === 'opensans' ? 'font-opensans' :
    styles.headingFont === 'system' ? 'font-sans' : 'font-poppins';

  const bodyFontClass =
    styles.bodyFont === 'poppins' ? 'font-poppins' :
    styles.bodyFont === 'grotesk' ? 'font-grotesk' :
    styles.bodyFont === 'system' ? 'font-sans' : 'font-opensans';

  const primaryColor = styles.primaryColor || '#002B66';

  return (
    <div
      className={`min-h-screen w-full ${bodyFontClass} ${headingFontClass}`}
      style={{ '--primary-color': primaryColor } as React.CSSProperties}
    >
      <Seo {...seoProps} />
      <TopBar />
      <Header />
      {!styles.hideCategories && <CategoryBar />}
      {!styles.hideTicker && <TickerBar />}
      {!styles.hideSearchBar && <SearchBar />}
      {!styles.hideHero && <HeroBanner />}
      {!styles.hideServices && <ServiceCards />}
      {!styles.hideFeatures && <FeatureCards />}
      {!styles.hideResources && <Resources />}
      {!styles.hidePartnershipForm && <PartnershipForm />}
      {!styles.hideCollaborations && <CollaborationsTicker />}
      <Footer />
    </div>
  );
}

