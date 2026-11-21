import ServicePageRenderer from '@/components/cms/ServicePageRenderer';
import type { ServiceCardItem, ServicePageStyles } from '@/components/cms/ServicePageRenderer';

export interface AiDigitalSupplyCard {
  title: string;
  description?: string;
  image?: string;
  categories?: string[];
  href?: string;
  slug?: string;
}

export interface AiDigitalSupplyStyles {
  headingFont?: 'playfair' | 'grotesk' | 'poppins' | 'opensans' | 'system';
  bodyFont?: 'opensans' | 'poppins' | 'grotesk' | 'system';
  primaryColor?: string;
  heroBg?: 'white' | 'amber' | 'slate' | 'blue' | 'stone' | string;
  ctaBg?: 'blue' | 'stone' | 'amber' | 'slate' | string;
  heroLayout?: 'minimal' | 'split-right' | 'split-left' | 'centered';
  cardColumns?: '2' | '3' | '4';
  showFeatured?: boolean;
  showFilters?: boolean;
}

export const AI_DIGITAL_SUPPLY_PAGE_SLUG = 'ai-digital-design-supply';

export function slugifyAiDigitalSupplyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'solution'
  );
}

export type { ServiceCardItem, ServicePageStyles };

const AIDigitalDesignSupply = () => {
  return <ServicePageRenderer slug={AI_DIGITAL_SUPPLY_PAGE_SLUG} />;
};

export default AIDigitalDesignSupply;
