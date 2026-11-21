import { useQuery } from '@tanstack/react-query';
import { fetchResolve, type ResolveResult } from '@/api/cms';
import { queryClient } from '@/lib/query-client';

export function useResolvePath(path: string) {
  return useQuery<ResolveResult>({
    queryKey: ['resolve', path],
    queryFn: async () => {
      const result = await fetchResolve(path);
      if (result?.type === 'page' && result.page && result.slug) {
        queryClient.setQueryData(['pageRecord', result.slug], result.page);
        let parsedPageData: Record<string, unknown> = {};
        if (typeof result.page.pageData === 'string') {
          try {
            parsedPageData = JSON.parse(result.page.pageData);
          } catch {
            parsedPageData = {};
          }
        } else if (result.page.pageData && typeof result.page.pageData === 'object') {
          parsedPageData = result.page.pageData as Record<string, unknown>;
        }
        queryClient.setQueryData(['page', result.slug], parsedPageData);
      }
      return result;
    },
    enabled: !!path,
  });
}
