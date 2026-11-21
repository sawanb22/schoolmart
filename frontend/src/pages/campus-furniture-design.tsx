import ServicePageRenderer from '@/components/cms/ServicePageRenderer';
import type { ServiceCardItem, ServicePageStyles } from '@/components/cms/ServicePageRenderer';
import {
  FURNITURE_DESIGN_PAGE_SLUG,
  slugifyFurnitureDesignTitle,
  type FurnitureDesignCard,
  type FurnitureDesignStyles,
} from './campus-furniture-design.data';

export { FURNITURE_DESIGN_PAGE_SLUG, slugifyFurnitureDesignTitle };
export type { FurnitureDesignCard, FurnitureDesignStyles, ServiceCardItem, ServicePageStyles };

const CampusFurnitureDesign = () => {
  return <ServicePageRenderer slug={FURNITURE_DESIGN_PAGE_SLUG} />;
};

export default CampusFurnitureDesign;
