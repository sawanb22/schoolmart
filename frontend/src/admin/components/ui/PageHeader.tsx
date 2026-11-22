import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-stone-200',
        className
      )}
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle ? (
          <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">{subtitle}</p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}
