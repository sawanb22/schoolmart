import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

export interface PaginationControlProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollToTop?: boolean;
  className?: string;
  primaryColor?: string;
}

export function PaginationControl({
  page,
  totalPages,
  onPageChange,
  scrollToTop = true,
  className,
  primaryColor,
}: PaginationControlProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    onPageChange(newPage);
    if (scrollToTop && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <Pagination className={cn('mt-8 border-t border-slate-200 pt-6 px-2', className)}>
      <PaginationContent className="flex items-center gap-1">
        <PaginationItem>
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Go to previous page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
        </PaginationItem>

        {visiblePages.map((p, idx, arr) => {
          const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <PaginationItem>
                  <span className="px-1 text-slate-400 text-xs select-none" aria-hidden="true">
                    ...
                  </span>
                </PaginationItem>
              )}
              <PaginationItem>
                <button
                  type="button"
                  onClick={() => handlePageChange(p)}
                  aria-current={page === p ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                  style={page === p && primaryColor ? { backgroundColor: primaryColor, color: '#fff' } : undefined}
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center',
                    page === p
                      ? !primaryColor
                        ? 'bg-cm-blue text-white shadow-xs'
                        : 'text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {p}
                </button>
              </PaginationItem>
            </React.Fragment>
          );
        })}

        <PaginationItem>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Go to next page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default PaginationControl;
