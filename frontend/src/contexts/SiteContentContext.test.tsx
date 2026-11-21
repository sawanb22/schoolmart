import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { queryClient } from '@/lib/query-client';
import { SiteContentProvider, useSiteContent } from './SiteContentContext';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SiteContentProvider>
        {children}
      </SiteContentProvider>
    </QueryClientProvider>
  );
}

describe('SiteContentContext', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('triggers exactly one /content network request for multiple consumers', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/content', () => {
        requestCount++;
        return HttpResponse.json({
          site_name: 'Test CampusMart',
          header_tagline: 'Best campus equipment',
        });
      })
    );

    function Consumer1() {
      const { content, loading } = useSiteContent();
      if (loading) return <div>Loading 1...</div>;
      return <div data-testid="c1">{content.site_name}</div>;
    }

    function Consumer2() {
      const { content, loading } = useSiteContent();
      if (loading) return <div>Loading 2...</div>;
      return <div data-testid="c2">{content.site_name}</div>;
    }

    function Consumer3() {
      const { content, loading } = useSiteContent();
      if (loading) return <div>Loading 3...</div>;
      return <div data-testid="c3">{content.site_name}</div>;
    }

    render(
      <Wrapper>
        <Consumer1 />
        <Consumer2 />
        <Consumer3 />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('c1')).toHaveTextContent('Test CampusMart');
      expect(screen.getByTestId('c2')).toHaveTextContent('Test CampusMart');
      expect(screen.getByTestId('c3')).toHaveTextContent('Test CampusMart');
    });

    expect(requestCount).toBe(1);
  });

  it('maintains context value reference stability across parent re-renders', async () => {
    server.use(
      http.get('/api/content', () => {
        return HttpResponse.json({
          site_name: 'Stable Brand',
        });
      })
    );

    const valuesSeen: unknown[] = [];

    function ChildConsumer() {
      const ctx = useSiteContent();
      valuesSeen.push(ctx);
      return <div data-testid="brand">{ctx.content.site_name}</div>;
    }

    function ParentWithState() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <button data-testid="btn-parent-update" onClick={() => setCount((c) => c + 1)}>
            Count: {count}
          </button>
          <ChildConsumer />
        </div>
      );
    }

    render(
      <Wrapper>
        <ParentWithState />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('brand')).toHaveTextContent('Stable Brand');
    });

    const refBefore = valuesSeen[valuesSeen.length - 1];

    act(() => {
      screen.getByTestId('btn-parent-update').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-parent-update')).toHaveTextContent('Count: 1');
    });

    const refAfter = valuesSeen[valuesSeen.length - 1];

    // Reference of { content, loading, refresh } is stable!
    expect(refBefore).toBe(refAfter);
  });

  it('triggers a network refetch when refresh() is invoked', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/content', () => {
        requestCount++;
        return HttpResponse.json({
          site_name: `Brand Version ${requestCount}`,
        });
      })
    );

    function RefreshingComponent() {
      const { content, loading, refresh } = useSiteContent();
      return (
        <div>
          <div data-testid="loading-flag">{String(loading)}</div>
          <div data-testid="site-name">{content.site_name}</div>
          <button data-testid="refresh-btn" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
      );
    }

    render(
      <Wrapper>
        <RefreshingComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('site-name')).toHaveTextContent('Brand Version 1');
    });
    expect(requestCount).toBe(1);

    act(() => {
      screen.getByTestId('refresh-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('site-name')).toHaveTextContent('Brand Version 2');
    });
    expect(requestCount).toBe(2);
  });
});
