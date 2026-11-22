import { cn } from '../../../lib/utils';

export type BadgeStatus =
  | 'published'
  | 'draft'
  | 'quote'
  | 'contact'
  | 'jobs'
  | 'application'
  | 'admin'
  | 'customer'
  | 'active'
  | 'inactive'
  | 'pending'
  | (string & {});

export interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

interface StatusStyleConfig {
  defaultLabel: string;
  dotClass: string;
  badgeClass: string;
}

const statusConfigs: Record<string, StatusStyleConfig> = {
  published: {
    defaultLabel: 'Published',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  active: {
    defaultLabel: 'Active',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  draft: {
    defaultLabel: 'Draft',
    dotClass: 'bg-stone-400',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
  },
  inactive: {
    defaultLabel: 'Inactive',
    dotClass: 'bg-stone-400',
    badgeClass: 'bg-stone-100 text-stone-500 border-stone-200',
  },
  pending: {
    defaultLabel: 'Pending',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  quote: {
    defaultLabel: 'Quote Request',
    dotClass: 'bg-blue-600',
    badgeClass: 'bg-blue-50 text-[#1e3a8a] border-blue-200/80',
  },
  contact: {
    defaultLabel: 'Contact',
    dotClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
  },
  jobs: {
    defaultLabel: 'Job Opportunity',
    dotClass: 'bg-violet-500',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/80',
  },
  application: {
    defaultLabel: 'Application',
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
  admin: {
    defaultLabel: 'Admin',
    dotClass: 'bg-[#1e3a8a]',
    badgeClass: 'bg-[#1e3a8a]/10 text-[#1e3a8a] border-[#1e3a8a]/20 font-semibold',
  },
  customer: {
    defaultLabel: 'Customer',
    dotClass: 'bg-teal-500',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase();
  const config = statusConfigs[normalizedKey] ?? {
    defaultLabel: status ? status.charAt(0).toUpperCase() + status.slice(1) : '',
    dotClass: 'bg-stone-400',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
  };

  const displayText = label ?? config.defaultLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide select-none',
        config.badgeClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />
      <span>{displayText}</span>
    </span>
  );
}
