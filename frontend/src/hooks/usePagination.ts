import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationReturn<T> {
  page: number;
  totalPages: number;
  paginatedItems: T[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  nextPage: () => void;
  prevPage: () => void;
}

/**
 * Generic pagination hook for managing list pagination with safe page bounds clamping.
 *
 * @param items Array of items to paginate
 * @param pageSize Number of items per page (default: 12)
 * @param initialPage Starting page number (default: 1)
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = 12,
  initialPage: number = 1
): UsePaginationReturn<T> {
  const [page, setPage] = useState(initialPage);

  const totalPages = Math.ceil(items.length / pageSize);

  // Safe page bounds clamping: if page > totalPages && totalPages > 0, clamp to totalPages. If items is empty, page is 1.
  const safePage = items.length === 0
    ? 1
    : totalPages > 0
    ? Math.min(Math.max(1, page), totalPages)
    : 1;

  const paginatedItems = useMemo(() => {
    return items.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [items, safePage, pageSize]);

  const nextPage = useCallback(() => {
    setPage((curr) => (totalPages > 0 ? Math.min(curr + 1, totalPages) : 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((curr) => Math.max(curr - 1, 1));
  }, []);

  return {
    page: safePage,
    totalPages,
    paginatedItems,
    setPage,
    nextPage,
    prevPage,
  };
}

export default usePagination;
