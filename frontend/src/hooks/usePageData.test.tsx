import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { queryClient } from '@/lib/query-client';
import { usePageData, clearPageDataCache, broadcastCmsInvalidation } from './usePageData';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('usePageData hook', () => {
  beforeEach(() => {
    queryClient.clear();
    clearPageDataCache();
  });

  it('causes exactly one network request when two components use the same slug', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/pages/shared-slug', () => {
        requestCount++;
        return HttpResponse.json({
          id: 10,
          slug: 'shared-slug',
          title: 'Shared Title',
          pageData: JSON.stringify({ hero: { title: 'Shared Hero' } }),
          published: true,
          contentModel: 'document',
          version: 1,
        });
      })
    );

    function ComponentA() {
      const { data, loading } = usePageData('shared-slug');
      if (loading) return <div>Loading A...</div>;
      return <div data-testid="comp-a">{data?.hero?.title}</div>;
    }

    function ComponentB() {
      const { data, loading } = usePageData('shared-slug');
      if (loading) return <div>Loading B...</div>;
      return <div data-testid="comp-b">{data?.hero?.title}</div>;
    }

    render(
      <Wrapper>
        <ComponentA />
        <ComponentB />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('comp-a')).toHaveTextContent('Shared Hero');
      expect(screen.getByTestId('comp-b')).toHaveTextContent('Shared Hero');
    });

    expect(requestCount).toBe(1);
  });

  it('makes zero new network requests when unmounting and remounting within staleTime', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/pages/remount-slug', () => {
        requestCount++;
        return HttpResponse.json({
          id: 11,
          slug: 'remount-slug',
          title: 'Remount Title',
          pageData: JSON.stringify({ hero: { title: 'Remount Hero' } }),
          published: true,
          contentModel: 'document',
          version: 1,
        });
      })
    );

    function TestComp() {
      const { data, loading } = usePageData('remount-slug');
      if (loading) return <div>Loading...</div>;
      return <div data-testid="remount-comp">{data?.hero?.title}</div>;
    }

    const { unmount } = render(
      <Wrapper>
        <TestComp />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('remount-comp')).toHaveTextContent('Remount Hero');
    });
    expect(requestCount).toBe(1);

    // Unmount
    unmount();

    // Remount within staleTime (60s)
    render(
      <Wrapper>
        <TestComp />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('remount-comp')).toHaveTextContent('Remount Hero');
    });

    // Still exactly 1 request!
    expect(requestCount).toBe(1);
  });

  it('triggers a refetch when broadcastCmsInvalidation is called', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/pages/invalidation-slug', () => {
        requestCount++;
        return HttpResponse.json({
          id: 12,
          slug: 'invalidation-slug',
          title: 'Invalidation Title',
          pageData: JSON.stringify({ version: requestCount }),
          published: true,
          contentModel: 'document',
          version: requestCount,
        });
      })
    );

    function InvalidateComp() {
      const { data, loading } = usePageData('invalidation-slug');
      if (loading) return <div>Loading...</div>;
      return <div data-testid="inval-comp">Version: {data?.version}</div>;
    }

    render(
      <Wrapper>
        <InvalidateComp />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('inval-comp')).toHaveTextContent('Version: 1');
    });
    expect(requestCount).toBe(1);

    // Broadcast invalidation for this slug
    broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'invalidation-slug' });

    await waitFor(() => {
      expect(screen.getByTestId('inval-comp')).toHaveTextContent('Version: 2');
    });
    expect(requestCount).toBe(2);
  });

  it('returns empty object {} with loading: false on error', async () => {
    server.use(
      http.get('/api/pages/error-slug', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    function ErrorComp() {
      const { data, loading } = usePageData('error-slug');
      return (
        <div>
          <div data-testid="loading-state">{String(loading)}</div>
          <div data-testid="data-keys">{Object.keys(data || {}).length}</div>
        </div>
      );
    }

    render(
      <Wrapper>
        <ErrorComp />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    }, { timeout: 4000 });

    expect(screen.getByTestId('data-keys')).toHaveTextContent('0');
  });

  it('maintains reference stability across re-renders when data has not changed', async () => {
    server.use(
      http.get('/api/pages/stability-slug', () => {
        return HttpResponse.json({
          id: 14,
          slug: 'stability-slug',
          title: 'Stable Title',
          pageData: JSON.stringify({ text: 'stable' }),
          published: true,
          contentModel: 'document',
          version: 1,
        });
      })
    );

    const results: unknown[] = [];

    function Child() {
      const res = usePageData('stability-slug');
      results.push(res);
      return <div data-testid="child-text">{res.data?.text}</div>;
    }

    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <div>
          <button data-testid="rerender-btn" onClick={() => setTick((t) => t + 1)}>
            Tick: {tick}
          </button>
          <Child />
        </div>
      );
    }

    render(
      <Wrapper>
        <Parent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('child-text')).toHaveTextContent('stable');
    });

    // Capture reference after data has settled
    const settledRef1 = results[results.length - 1];

    // Trigger parent re-render
    act(() => {
      screen.getByTestId('rerender-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('rerender-btn')).toHaveTextContent('Tick: 1');
    });

    const settledRef2 = results[results.length - 1];

    // Reference of returned { data, loading } should be identical
    expect(settledRef1).toBe(settledRef2);
  });
});
