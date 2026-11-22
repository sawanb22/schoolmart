import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { queryClient } from '@/lib/query-client';
import UniversalArticleDetail from './UniversalArticleDetail';

function renderWithProviders(ui: ReactElement, { initialEntries = ['/innovation/grant-track'] } = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/:hubSlug/:articleSlug" element={ui} />
          <Route path="/innovation/new-track" element={<div data-testid="redirected-track">Redirected Track</div>} />
          <Route path="/innovation" element={<div data-testid="hub-home">Hub Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UniversalArticleDetail Component', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('1. Renders standalone page from resolve response in <= 2 requests', async () => {
    let requestsCount = 0;

    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        requestsCount++;
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        if (path === '/innovation/standalone-page') {
          return HttpResponse.json({
            type: 'page',
            slug: 'standalone-page',
            template: 'article',
            page: {
              id: 200,
              title: 'Standalone Innovation Guide',
              slug: 'standalone-page',
              template: 'article',
              published: true,
              pageData: JSON.stringify({
                heroTitle: 'Standalone Innovation Guide',
                body: '<p>Direct standalone page content</p>',
              }),
            },
          });
        }
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders(
      <UniversalArticleDetail hubSlug="innovation" hubTitle="Innovation Hub" />,
      { initialEntries: ['/innovation/standalone-page'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Standalone Innovation Guide')).toBeInTheDocument();
    });

    expect(screen.getByText('Direct standalone page content')).toBeInTheDocument();
    expect(requestsCount).toBeLessThanOrEqual(2);
    expect(requestsCount).toBe(1);
  });

  it('2. Resolves hub item and queries item endpoint in exactly 2 requests', async () => {
    let resolveRequests = 0;
    let itemRequests = 0;

    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        resolveRequests++;
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        if (path === '/innovation/grant-track') {
          return HttpResponse.json({
            type: 'item',
            hubSlug: 'innovation',
            itemSlug: 'grant-track',
            template: 'article',
          });
        }
        return new HttpResponse(null, { status: 404 });
      }),
      http.get('/api/pages/innovation/items/grant-track', () => {
        itemRequests++;
        return HttpResponse.json({
          hub: {
            id: 20,
            slug: 'innovation',
            title: 'Innovation Hub',
            heroImage: '/images/innovation-hero.jpg',
            cta: {
              ctaTitle: 'Apply for Innovation Grant',
              ctaSubtitle: 'Deadline: Dec 31',
              ctaButtonLabel: 'Apply Now',
              ctaHref: '/apply-grant',
            },
          },
          item: {
            id: 301,
            slug: 'grant-track',
            collection: 'cards',
            title: 'Institutional Seed Grant Track',
            summary: 'Grants up to 50 Lakhs for campus incubation centers.',
            badge: 'GRANTS',
            categories: ['Funding'],
            data: {},
            detail: {
              methodology: '<p>Seed grant application lifecycle.</p>',
            },
          },
        });
      })
    );

    renderWithProviders(
      <UniversalArticleDetail hubSlug="innovation" hubTitle="Innovation Hub" />,
      { initialEntries: ['/innovation/grant-track'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Institutional Seed Grant Track')).toBeInTheDocument();
    });

    expect(screen.getByText('Seed grant application lifecycle.')).toBeInTheDocument();
    expect(screen.getByText('Funding')).toBeInTheDocument();
    expect(screen.getByText('Apply for Innovation Grant')).toBeInTheDocument();
    expect(resolveRequests + itemRequests).toBe(2);
  });

  it('3. Navigates on redirect resolve response in <= 2 requests', async () => {
    let requestsCount = 0;

    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        requestsCount++;
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        if (path === '/innovation/old-track') {
          return HttpResponse.json({
            type: 'redirect',
            redirectTo: '/innovation/new-track',
          });
        }
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders(
      <UniversalArticleDetail hubSlug="innovation" hubTitle="Innovation Hub" />,
      { initialEntries: ['/innovation/old-track'] }
    );

    await waitFor(() => {
      expect(screen.getByTestId('redirected-track')).toBeInTheDocument();
    });

    expect(requestsCount).toBe(1);
  });

  it('4. Shows not-found UI when resolve returns not_found in <= 2 requests', async () => {
    let requestsCount = 0;

    server.use(
      http.get('/api/pages/resolve', () => {
        requestsCount++;
        return HttpResponse.json({ type: 'not_found' }, { status: 404 });
      })
    );

    renderWithProviders(
      <UniversalArticleDetail hubSlug="innovation" hubTitle="Innovation Hub" />,
      { initialEntries: ['/innovation/missing-article'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Article not found')).toBeInTheDocument();
    });

    expect(screen.getByText("That guide or article couldn't be found.")).toBeInTheDocument();
    expect(screen.getByText('Back to Innovation Hub')).toBeInTheDocument();
    expect(requestsCount).toBe(1);
  });
});
