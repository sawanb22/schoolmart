import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { useHubLegacy, hubV2ToLegacyPageData } from './useHubLegacy';
import hubsFixtures from '@/test/fixtures/hubs/hubs.json';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useHubLegacy and hubV2ToLegacyPageData', () => {
  describe('Parity with backend buildLegacyPageData on fixtures', () => {
    it('accurately reproduces expectedLegacyNoDetail for all 24 page fixtures', () => {
      expect(hubsFixtures.length).toBeGreaterThan(20);

      for (const fixture of hubsFixtures) {
        const actual = hubV2ToLegacyPageData(fixture.v2Payload);
        expect(actual).toEqual(fixture.expectedLegacyNoDetail);
      }
    });

    it('ensures no detail keys leak into converted collection cards', () => {
      const labsFixture = hubsFixtures.find((f) => f.slug === 'labs');
      expect(labsFixture).toBeDefined();

      const legacy = hubV2ToLegacyPageData(labsFixture!.v2Payload);
      expect(Array.isArray(legacy.cards)).toBe(true);

      for (const card of legacy.cards) {
        expect(card).not.toHaveProperty('detail');
        expect(card).not.toHaveProperty('body');
        expect(card).not.toHaveProperty('methodology');
        expect(card).not.toHaveProperty('deliverables');
        expect(card).not.toHaveProperty('detailContent');
        expect(card).not.toHaveProperty('useCustomDetail');
      }
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('correctly maps category objects into string[] array of names', () => {
      const v2 = {
        settings: { heroTitle: 'Category Test' },
        collections: {},
        categories: [
          { id: 1, name: 'Robotics', slug: 'robotics' },
          { id: 2, name: 'AI & Data', slug: 'ai-data' },
        ],
      };
      const result = hubV2ToLegacyPageData(v2);
      expect(result.categories).toEqual(['Robotics', 'AI & Data']);
    });

    it('maps featured as a single card object from collections.featured[0]', () => {
      const v2 = {
        settings: { heroTitle: 'Featured Test' },
        collections: {
          featured: [
            {
              id: 10,
              slug: 'featured-lab',
              title: 'Featured Lab',
              summary: 'Featured summary',
              imageUrl: '/uploads/featured.png',
              data: { customField: 'value' },
            },
          ],
        },
        categories: [],
      };
      const result = hubV2ToLegacyPageData(v2);
      expect(result.featured).toEqual({
        title: 'Featured Lab',
        slug: 'featured-lab',
        description: 'Featured summary',
        image: '/uploads/featured.png',
        customField: 'value',
      });
    });

    it('falls back to settings.featured if collections.featured is empty', () => {
      const v2 = {
        settings: {
          heroTitle: 'Featured Fallback',
          featured: { title: 'Settings Featured' },
        },
        collections: {},
        categories: [],
      };
      const result = hubV2ToLegacyPageData(v2);
      expect(result.featured).toEqual({ title: 'Settings Featured' });
    });

    it('falls back to settings collections and categories if v2 collections are empty', () => {
      const v2 = {
        settings: {
          heroTitle: 'Fallback Test',
          cards: [{ title: 'Fallback Card' }],
          categories: ['Fallback Cat'],
        },
        collections: {},
        categories: [],
      };
      const result = hubV2ToLegacyPageData(v2);
      expect(result.cards).toEqual([{ title: 'Fallback Card' }]);
      expect(result.categories).toEqual(['Fallback Cat']);
    });

    it('cleans up collection and category keys when neither collections nor settings define them', () => {
      const v2 = {
        settings: { heroTitle: 'Empty Collections' },
        collections: { cards: [] },
        categories: [],
      };
      const result = hubV2ToLegacyPageData(v2);
      expect(result).not.toHaveProperty('cards');
      expect(result).not.toHaveProperty('featured');
      expect(result).not.toHaveProperty('categories');
    });

    it('handles null or invalid input gracefully', () => {
      expect(hubV2ToLegacyPageData(null)).toEqual({});
      expect(hubV2ToLegacyPageData(undefined)).toEqual({});
      expect(hubV2ToLegacyPageData('invalid' as any)).toEqual({});
    });
  });

  describe('useHubLegacy hook behavior', () => {
    it('fetches v2 summary payload and converts to legacy format', async () => {
      server.use(
        http.get('/api/pages/test-hub', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('v') === '2') {
            return HttpResponse.json({
              page: { id: 1, slug: 'test-hub', title: 'Test Hub' },
              settings: { heroTitle: 'Welcome to Test Hub' },
              collections: {
                cards: [
                  {
                    id: 1,
                    slug: 'card-1',
                    title: 'Card 1',
                    summary: 'Card 1 summary',
                    imageUrl: '/card1.jpg',
                    data: {},
                  },
                ],
              },
              categories: [{ id: 1, name: 'General', slug: 'general' }],
            });
          }
          return HttpResponse.json({ error: 'Not v2' }, { status: 400 });
        })
      );

      const { result } = renderHook(() => useHubLegacy('test-hub'), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.heroTitle).toBe('Welcome to Test Hub');
      expect(result.current.data.categories).toEqual(['General']);
      expect(result.current.data.cards).toEqual([
        {
          title: 'Card 1',
          slug: 'card-1',
          description: 'Card 1 summary',
          image: '/card1.jpg',
        },
      ]);
    });

    it('returns empty object with loading: false for empty slug', () => {
      const { result } = renderHook(() => useHubLegacy(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({});
    });

    it('returns empty object with loading: false on API error', async () => {
      server.use(
        http.get('/api/pages/error-hub', () => {
          return HttpResponse.json({ error: 'Internal Error' }, { status: 500 });
        })
      );

      const { result } = renderHook(() => useHubLegacy('error-hub'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({});
    });

    it('maintains memoized reference stability when query cache does not change', async () => {
      server.use(
        http.get('/api/pages/stable-hub', () => {
          return HttpResponse.json({
            page: { id: 1, slug: 'stable-hub' },
            settings: { heroTitle: 'Stable' },
            collections: { cards: [] },
            categories: [],
          });
        })
      );

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useHubLegacy('stable-hub'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstData = result.current.data;
      rerender();
      const secondData = result.current.data;

      expect(firstData).toBe(secondData);
    });
  });
});
