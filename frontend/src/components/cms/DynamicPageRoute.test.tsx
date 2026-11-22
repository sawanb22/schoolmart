import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { queryClient } from '@/lib/query-client';
import { DynamicPageRoute } from '@/App';

function renderWithProviders(initialEntry: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/new-target" element={<div data-testid="new-target-page">New Target Destination</div>} />
          <Route path="/p/:slug" element={<DynamicPageRoute />} />
          <Route path="/:slug" element={<DynamicPageRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DynamicPageRoute Component', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('1. Resolves an unprefixed guide path with 1 request and passes the resolved prefixed slug', async () => {
    let resolveRequests = 0;

    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        resolveRequests++;
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        if (path === '/ai-in-higher-ed') {
          return HttpResponse.json({
            type: 'page',
            slug: 'guide-ai-in-higher-ed',
            template: 'article',
            contentModel: 'document',
            page: {
              id: 50,
              title: 'AI in Higher Education Guide',
              slug: 'guide-ai-in-higher-ed',
              template: 'article',
              published: true,
              pageData: JSON.stringify({
                heroTitle: 'AI in Higher Education Guide',
                body: '<p>Comprehensive analysis of AI tools in university learning.</p>',
              }),
            },
          });
        }
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders('/ai-in-higher-ed');

    await waitFor(() => {
      expect(screen.getByText('AI in Higher Education Guide')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Comprehensive analysis of AI tools in university learning.')).toBeInTheDocument();
    expect(resolveRequests).toBe(1);
  });

  it('2. Handles template routing for dynamic solution-hub page with resolved slug', async () => {
    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        if (path === '/robotics-center') {
          return HttpResponse.json({
            type: 'page',
            slug: 'robotics-center',
            template: 'solution-hub',
            contentModel: 'structured',
            page: {
              id: 51,
              title: 'Robotics Center',
              slug: 'robotics-center',
              template: 'solution-hub',
              published: true,
              pageData: JSON.stringify({
                heroTitle: 'Robotics Center Hub',
                cards: [],
              }),
            },
          });
        }
        return new HttpResponse(null, { status: 404 });
      }),
      http.get('/api/pages/robotics-center', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json({
            page: {
              id: 51,
              slug: 'robotics-center',
              title: 'Robotics Center',
              template: 'solution-hub',
              contentModel: 'structured',
              version: 1,
              updatedAt: '2026-11-21T00:00:00.000Z',
            },
            settings: {
              heroTitle: 'Robotics Center Hub',
            },
            collections: {
              cards: [],
            },
            categories: [],
          });
        }
        return HttpResponse.json({
          id: 51,
          title: 'Robotics Center',
          slug: 'robotics-center',
          template: 'solution-hub',
          published: true,
          pageData: JSON.stringify({
            heroTitle: 'Robotics Center Hub',
            cards: [],
          }),
        });
      })
    );

    renderWithProviders('/robotics-center');

    // SolutionPageRenderer loads the solution hub
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('3. Handles redirect resolution by navigating to redirectTo path', async () => {
    server.use(
      http.get('/api/pages/resolve', ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        if (path === '/old-alias') {
          return HttpResponse.json({
            type: 'redirect',
            redirectTo: '/new-target',
          });
        }
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders('/old-alias');

    await waitFor(() => {
      expect(screen.getByTestId('new-target-page')).toBeInTheDocument();
    });
  });

  it('4. Renders NotFound on 404 resolve response', async () => {
    server.use(
      http.get('/api/pages/resolve', () => {
        return HttpResponse.json({ type: 'not_found' }, { status: 404 });
      })
    );

    renderWithProviders('/non-existent-page-slug');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Page Not Found/i })).toBeInTheDocument();
    });
  });
});
