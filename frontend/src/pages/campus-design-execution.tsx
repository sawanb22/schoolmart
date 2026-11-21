import ServicePageRenderer from '@/components/cms/ServicePageRenderer';
import type { ServiceCardItem, ServicePageStyles } from '@/components/cms/ServicePageRenderer';
import {
  CDE_PAGE_SLUG,
  slugifyStepTitle,
  type CampusDesignExecutionCard,
  type CampusDesignExecutionStyles,
} from './campus-design-execution.data';

export { CDE_PAGE_SLUG, slugifyStepTitle };
export type { CampusDesignExecutionCard, CampusDesignExecutionStyles, ServiceCardItem, ServicePageStyles };

interface CampusDesignExecutionProps {
  slug?: string;
}

const CampusDesignExecution = ({ slug = CDE_PAGE_SLUG }: CampusDesignExecutionProps) => {
  return <ServicePageRenderer slug={slug} />;
};

export default CampusDesignExecution;
