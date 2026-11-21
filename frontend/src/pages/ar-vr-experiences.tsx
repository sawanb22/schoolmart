import ServicePageRenderer from '@/components/cms/ServicePageRenderer';
import type { ServiceCardItem, ServicePageStyles } from '@/components/cms/ServicePageRenderer';
import {
  AR_VR_PAGE_SLUG,
  slugifyArVrTitle,
  type ArVrCard,
  type ArVrStyles,
} from './ar-vr-experiences.data';

export { AR_VR_PAGE_SLUG, slugifyArVrTitle };
export type { ArVrCard, ArVrStyles, ServiceCardItem, ServicePageStyles };

const ArVrExperiences = () => {
  return <ServicePageRenderer slug={AR_VR_PAGE_SLUG} />;
};

export default ArVrExperiences;
