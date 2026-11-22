import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  change?: string | number;
  changeType?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  changeType = 'neutral',
  onClick,
  className,
}: StatCardProps) {
  const isClickable = Boolean(onClick);

  const changeStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    negative: 'bg-red-50 text-red-700 border-red-200/80',
    neutral: 'bg-stone-100 text-stone-600 border-stone-200',
  }[changeType];

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'bg-white rounded-xl border border-stone-200 p-5 shadow-xs transition-all flex flex-col justify-between text-left',
        isClickable &&
          'cursor-pointer hover:border-stone-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-stone-900">{value}</p>
        </div>

        {Icon ? (
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] border border-blue-100/60 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        ) : null}
      </div>

      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-stone-100 text-xs">
          {change !== undefined && (
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold border',
                changeStyles
              )}
            >
              {change}
            </span>
          )}
          {subtitle && <span className="text-stone-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
