import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: AdminPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers with ellipsis windowing
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const showLeftEllipsis = page > 4;
    const showRightEllipsis = page < totalPages - 3;

    pages.push(1);

    if (showLeftEllipsis) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (showRightEllipsis) {
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3',
        className
      )}
    >
      <div className="text-xs text-stone-500 font-medium">
        Showing <span className="font-semibold text-stone-900">{startItem}–{endItem}</span> of{' '}
        <span className="font-semibold text-stone-900">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous Page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-stone-700 disabled:cursor-not-allowed shadow-2xs transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {totalPages > 1 && (
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((item, idx) => {
              if (item === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-7 flex items-center justify-center text-xs text-stone-400 select-none"
                  >
                    …
                  </span>
                );
              }

              const isCurrent = item === page;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center',
                    isCurrent
                      ? 'bg-[#1e3a8a] text-white border border-[#1e3a8a] shadow-2xs'
                      : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || totalPages === 0}
          aria-label="Next Page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-stone-700 disabled:cursor-not-allowed shadow-2xs transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
