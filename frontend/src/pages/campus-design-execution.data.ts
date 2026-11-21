export interface CampusDesignExecutionDeliverable {
  title: string;
  desc: string;
  phaseLabel?: string;
}

export interface CampusDesignExecutionCard {
  title: string;
  description?: string;
  image?: string;
  category?: string;
  categories?: string[];
  href?: string;
  slug?: string;
  tag?: string;
  active?: boolean;
  methodology?: string;
  longDescription?: string;
  methodologyHeading?: string;
  deliverablesHeading?: string;
  deliverables?: CampusDesignExecutionDeliverable[];
  ctaTitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  hideCompliance?: boolean;
  hideRelatedBlog?: boolean;
  hideHero?: boolean;
  hideMethodology?: boolean;
  hideDeliverables?: boolean;
  hideActionBar?: boolean;
}

export interface CampusDesignExecutionStyles {
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

export interface CampusDesignExecutionPageData {
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  heroButtonLabel?: string;
  heroButtonHref?: string;
  section1Title?: string;
  stepCountLabel?: string;
  readMoreLabel?: string;
  cards?: CampusDesignExecutionCard[];
  styles?: CampusDesignExecutionStyles;
  hideHero?: boolean;
  hideFilters?: boolean;
  hideMethodology?: boolean;
  hideDeliverables?: boolean;
  hideActionBar?: boolean;
  hideCompliance?: boolean;
  hideRelatedBlog?: boolean;
  hideCta?: boolean;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  subpageCtaTitle?: string;
  subpageCtaHref?: string;
  subpageCtaButtonLabel?: string;
  methodologyHeading?: string;
  deliverablesHeading?: string;
}

export const CDE_PAGE_SLUG = 'campus-design-execution';

export function slugifyStepTitle(title?: string): string {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'step'
  );
}

