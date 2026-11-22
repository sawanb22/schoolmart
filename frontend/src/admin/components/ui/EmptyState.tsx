import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-stone-200 bg-white/60 my-2',
        className
      )}
    >
      {Icon ? (
        <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/60 text-stone-400 flex items-center justify-center mb-3.5 shrink-0">
          <Icon className="w-6 h-6 text-stone-500" />
        </div>
      ) : null}

      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>

      {description ? (
        <p className="text-xs text-stone-500 max-w-sm mt-1 leading-relaxed">{description}</p>
      ) : null}

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#172554] shadow-2xs transition-colors"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
