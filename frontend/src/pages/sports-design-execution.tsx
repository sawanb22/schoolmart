import ServicePageRenderer from '@/components/cms/ServicePageRenderer';
import type { ServiceCardItem, ServicePageStyles } from '@/components/cms/ServicePageRenderer';
import {
  SDE_PAGE_SLUG,
  slugifySportsStepTitle,
  type SportsDesignExecutionCard,
  type SportsDesignExecutionStyles,
} from './sports-design-execution.data';

export { SDE_PAGE_SLUG, slugifySportsStepTitle };
export type { SportsDesignExecutionCard, SportsDesignExecutionStyles, ServiceCardItem, ServicePageStyles };

const SportsDesignExecution = () => {
  return <ServicePageRenderer slug={SDE_PAGE_SLUG} />;
};

export default SportsDesignExecution;
