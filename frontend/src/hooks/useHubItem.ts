import { useQuery } from '@tanstack/react-query';
import { fetchHubItem } from '@/api/cms';

export function useHubItem(hubSlug: string, itemSlug: string) {
  return useQuery({
    queryKey: ['hubItem', hubSlug, itemSlug],
    queryFn: () => fetchHubItem(hubSlug, itemSlug),
    enabled: !!hubSlug && !!itemSlug,
  });
}
