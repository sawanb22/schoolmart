import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { queryClient } from '@/lib/query-client';
import { useResolvePath } from './useResolvePath';
import { usePageData } from './usePageData';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useResolvePath hook', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('resolves a path, seeds query cache, and ensures subsequent usePageData makes 0 network requests', async () => {
    let pageRequestCount = 0;
    let resolveRequestCount = 0;

    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        resolveRequestCount++;
        const url = new URL(request.url);
        const pathParam = url.searchParams.get('path');
        if (pathParam === '/seed-test') {
          return HttpResponse.json({
            type: 'page',
            slug: 'seed-test',
            template: 'solution-hub',
            contentModel: 'structured',
            page: {
              id: 99,
              slug: 'seed-test',
              title: 'Seeded Title',
              pageData: JSON.stringify({ hero: { title: 'Preloaded via Resolve' } }),
              published: true,
              version: 1,
            },
          });
        }
        return new HttpResponse(null, { status: 404 });
      }),
      http.get('/api/pages/seed-test', () => {
        pageRequestCount++;
        return HttpResponse.json({
          id: 99,
          slug: 'seed-test',
          title: 'Direct Fetch Title',
          pageData: JSON.stringify({ hero: { title: 'Fetched from API' } }),
          published: true,
          version: 1,
        });
      })
    );

    function ResolveConsumer() {
      const { data, isLoading } = useResolvePath('/seed-test');
      if (isLoading) return <div>Resolving...</div>;
      return <div data-testid="resolve-status">{data?.type}</div>;
    }

    function PageDataConsumer() {
      const { data, loading } = usePageData('seed-test');
      if (loading) return <div>Loading page data...</div>;
      return <div data-testid="pagedata-hero">{data?.hero?.title}</div>;
    }

    const { unmount } = render(
      <Wrapper>
        <ResolveConsumer />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('resolve-status')).toHaveTextContent('page');
    });

    expect(resolveRequestCount).toBe(1);
    expect(pageRequestCount).toBe(0);

    unmount();

    // Now render PageDataConsumer for 'seed-test'
    render(
      <Wrapper>
        <PageDataConsumer />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('pagedata-hero')).toHaveTextContent('Preloaded via Resolve');
    });

    // Zero network requests made to /api/pages/seed-test because cache was seeded!
    expect(pageRequestCount).toBe(0);
  });

  it('handles 404 not_found gracefully without throwing and returns type: not_found', async () => {
    server.use(
      http.get('/api/pages/resolve', () => {
        return HttpResponse.json({ type: 'not_found' }, { status: 404 });
      })
    );

    function NotFoundConsumer() {
      const { data, isLoading, isError } = useResolvePath('/non-existent-path');
      if (isLoading) return <div>Resolving...</div>;
      return (
        <div>
          <div data-testid="is-error">{String(isError)}</div>
          <div data-testid="res-type">{data?.type}</div>
        </div>
      );
    }

    render(
      <Wrapper>
        <NotFoundConsumer />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-error')).toHaveTextContent('false');
      expect(screen.getByTestId('res-type')).toHaveTextContent('not_found');
    });
  });
});
