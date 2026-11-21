import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import CampusMasterPlanning from './campus-master-planning';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SiteContentProvider>
        <WishlistProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </WishlistProvider>
      </SiteContentProvider>
    </QueryClientProvider>
  );
}

describe('CampusMasterPlanning Step Hub (v2 Summary Shape)', () => {
  const mockHubV2 = {
    page: {
      id: 2,
      slug: 'campus-master-planning',
      title: 'Campus Master Planning',
      template: 'campus-master-planning',
      contentModel: 'structured',
      version: 1,
      updatedAt: '2026-11-21T00:00:00.000Z',
    },
    settings: {
      heroTitle: 'Visionary Campus Master Planning',
      heroSubtitle: 'Sequenced land, buildings, and budget for modern institutions.',
      styles: {
        showFeatured: false,
        showFilters: true,
      },
    },
    collections: {
      cards: [
        {
          id: 201,
          slug: 'architectural-zoning',
          title: 'Architectural Zoning & Phasing',
          summary: 'Long-term campus zoning guidelines.',
          imageUrl: '/uploads/zoning.jpg',
          href: '/request-quote',
          categories: ['Planning'],
          data: {},
        },
        {
          id: 202,
          slug: 'landscape-master-plan',
          title: 'Landscape Master Plan',
          summary: 'Pedestrian circulation and green infrastructure.',
          imageUrl: '/uploads/landscape.jpg',
          categories: ['Infrastructure'],
          data: {},
        },
      ],
    },
    categories: [
      { id: 1, name: 'Planning', slug: 'planning' },
      { id: 2, name: 'Infrastructure', slug: 'infrastructure' },
    ],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/pages/campus-master-planning', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json(mockHubV2);
        }
        return HttpResponse.json({ error: 'Legacy requested' }, { status: 400 });
      })
    );
  });

  it('renders card titles, summaries, and hero from v2 summary shape', async () => {
    renderWithProviders(<CampusMasterPlanning />);

    await waitFor(() => {
      expect(screen.getByText('Visionary Campus Master Planning')).toBeInTheDocument();
    });

    expect(screen.getByText('Architectural Zoning & Phasing')).toBeInTheDocument();
    expect(screen.getByText('Long-term campus zoning guidelines.')).toBeInTheDocument();

    expect(screen.getByText('Landscape Master Plan')).toBeInTheDocument();
    expect(screen.getByText('Pedestrian circulation and green infrastructure.')).toBeInTheDocument();
  });

  it('verifies card links use card.href when defined, else fall back to /hub/slug', async () => {
    renderWithProviders(<CampusMasterPlanning />);

    await waitFor(() => {
      expect(screen.getByText('Architectural Zoning & Phasing')).toBeInTheDocument();
    });

    // Card 1 has explicit href: '/request-quote'
    const quoteLinks = screen.getAllByRole('link', { name: /Architectural Zoning & Phasing/i });
    expect(quoteLinks.length).toBeGreaterThan(0);
    expect(quoteLinks[0]).toHaveAttribute('href', '/request-quote');

    // Card 2 has no href, so link falls back to /campus-master-planning/landscape-master-plan
    const fallbackLinks = screen.getAllByRole('link', { name: /Landscape Master Plan/i });
    expect(fallbackLinks.length).toBeGreaterThan(0);
    expect(fallbackLinks[0]).toHaveAttribute('href', '/campus-master-planning/landscape-master-plan');
  });
});
