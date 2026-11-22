import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { queryClient } from '@/lib/query-client';
import ServiceDetailPage from './ServiceDetailPage';

function renderWithProviders(ui: ReactElement, { initialEntries = ['/labs/robotics-lab'] } = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/:categorySlug/:itemSlug" element={ui} />
          <Route path="/labs/new-robotics" element={<div data-testid="redirected-page">Redirected Target</div>} />
          <Route path="/labs" element={<div data-testid="parent-hub">Parent Hub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ServiceDetailPage Component', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders the title and body from the item endpoint with exactly one /api/pages/* request', async () => {
    let pagesApiRequests = 0;

    server.use(
      http.get('/api/pages/:hubSlug/items/:itemSlug', ({ params }) => {
        pagesApiRequests++;
        if (params.hubSlug === 'labs' && params.itemSlug === 'robotics-lab') {
          return HttpResponse.json({
            hub: {
              id: 1,
              slug: 'labs',
              title: 'Laboratory Solutions',
              template: 'labs',
              cta: {
                ctaTitle: 'Build Modern Labs',
                ctaSubtitle: 'Expert setup',
                ctaButtonLabel: 'Get Consultation',
                ctaHref: '/contact-us',
              },
            },
            item: {
              id: 101,
              slug: 'robotics-lab',
              collection: 'cards',
              title: 'Advanced Robotics Lab',
              summary: 'Equipped with robot arms and sensors.',
              imageUrl: '/images/robotics.jpg',
              badge: 'STEM',
              categories: ['Robotics'],
              data: {},
              detail: {
                useCustomDetail: true,
                detailContent: '<p>Comprehensive hands-on robotics curriculum</p>',
              },
            },
          });
        }
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders(<ServiceDetailPage categorySlug="labs" categoryTitle="Laboratory Solutions" />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Robotics Lab')).toBeInTheDocument();
    });

    expect(screen.getByText('Comprehensive hands-on robotics curriculum')).toBeInTheDocument();
    expect(screen.getByText('Robotics')).toBeInTheDocument();
    expect(screen.getByText('Build Modern Labs')).toBeInTheDocument();
    expect(screen.getByText('Get Consultation')).toBeInTheDocument();
    expect(pagesApiRequests).toBe(1);
  });

  it('handles redirectTo and navigates to the new URL', async () => {
    server.use(
      http.get('/api/pages/labs/items/old-robotics', () => {
        return HttpResponse.json({
          redirectTo: '/labs/new-robotics',
        });
      })
    );

    renderWithProviders(
      <ServiceDetailPage categorySlug="labs" categoryTitle="Laboratory Solutions" />,
      { initialEntries: ['/labs/old-robotics'] }
    );

    await waitFor(() => {
      expect(screen.getByTestId('redirected-page')).toBeInTheDocument();
    });
  });

  it('shows the not-found UI on 404 and makes exactly one request', async () => {
    let pagesApiRequests = 0;

    server.use(
      http.get('/api/pages/labs/items/unknown-module', () => {
        pagesApiRequests++;
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders(
      <ServiceDetailPage categorySlug="labs" categoryTitle="Laboratory Solutions" />,
      { initialEntries: ['/labs/unknown-module'] }
    );

    await waitFor(() => {
      expect(screen.getByText("That module couldn't be found.")).toBeInTheDocument();
    });

    expect(screen.getByText('Back to Laboratory Solutions')).toBeInTheDocument();
    expect(pagesApiRequests).toBe(1);
  });

  it('displays the AI Solutions Finder Context Notice when ref parameters are present', async () => {
    server.use(
      http.get('/api/pages/labs/items/ai-lab', () => {
        return HttpResponse.json({
          hub: { id: 1, slug: 'labs', title: 'Labs' },
          item: {
            id: 102,
            slug: 'ai-lab',
            collection: 'cards',
            title: 'AI Lab Station',
            summary: 'Deep learning rigs.',
            categories: ['AI'],
            data: {},
            detail: {},
          },
        });
      })
    );

    renderWithProviders(
      <ServiceDetailPage categorySlug="labs" categoryTitle="Laboratory Solutions" />,
      { initialEntries: ['/labs/ai-lab?ref_intent=BTech+AI+Syllabus&ref_inst=Apex+Institute&ref_qty=20'] }
    );

    await waitFor(() => {
      expect(screen.getByText('AI Lab Station')).toBeInTheDocument();
    });

    expect(screen.getByText('Matched Institutional Scope')).toBeInTheDocument();
    expect(screen.getByText('BTech AI Syllabus')).toBeInTheDocument();
    expect(screen.getByText('(Apex Institute)')).toBeInTheDocument();
    expect(screen.getByText('Scope: 20 Units')).toBeInTheDocument();
  });
});
