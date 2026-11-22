import { useQuery } from '@tanstack/react-query';
import { fetchHub } from '@/api/cms';

export function useHub(slug: string) {
  return useQuery({
    queryKey: ['hub', slug],
    queryFn: () => fetchHub(slug),
    enabled: !!slug,
  });
}
