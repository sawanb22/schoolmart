import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPageLegacy } from '@/api/cms';
import { queryClient } from '@/lib/query-client';
import { broadcastCmsInvalidation } from '@/lib/cms-channel';

export { broadcastCmsInvalidation };

const EMPTY = Object.freeze({});

/**
 * Clear the page data cache. Call this after CMS updates.
 */
export function clearPageDataCache(slug?: string) {
  if (slug) {
    queryClient.removeQueries({ queryKey: ['page', slug] });
    queryClient.removeQueries({ queryKey: ['pageRecord', slug] });
  } else {
    queryClient.removeQueries({ queryKey: ['page'] });
    queryClient.removeQueries({ queryKey: ['pageRecord'] });
  }
}

/**
 * Hook that fetches `pageData` JSON for a given slug using TanStack Query.
 * Returns backward-compatible { data, loading } shape with reference stability.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePageData<T = Record<string, any>>(slug: string): {
  data: T;
  loading: boolean;
} {
  const { data, isPending, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => {
      const res = await fetchPageLegacy(slug);
      queryClient.setQueryData(['pageRecord', slug], res.record);
      return (res.pageData ?? EMPTY) as T;
    },
    enabled: !!slug,
  });

  const resolvedData = (isError ? EMPTY : (data ?? EMPTY)) as T;
  const resolvedLoading = !isError && isPending && !!slug;

  return useMemo(
    () => ({
      data: resolvedData,
      loading: resolvedLoading,
    }),
    [resolvedData, resolvedLoading]
  );
}
