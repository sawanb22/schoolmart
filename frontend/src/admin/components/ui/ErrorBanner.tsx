import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  retry?: () => void;
  className?: string;
}

export function ErrorBanner({
  message,
  onDismiss,
  retry,
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-red-200 bg-red-50/80 text-red-900 text-xs shadow-2xs',
        className
      )}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        <span className="font-medium text-red-800 break-words">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {retry ? (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        ) : null}

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="p-1 rounded-md text-red-400 hover:text-red-700 hover:bg-red-100/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
