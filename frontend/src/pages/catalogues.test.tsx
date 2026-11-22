import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import Catalogues from './catalogues';

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
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Catalogues Page (v2 Summary Shape)', () => {
  const mockCataloguesV2 = {
    page: {
      id: 6,
      slug: 'catalogues',
      title: 'Catalogues & Case Studies',
      template: 'catalogues',
      contentModel: 'structured',
      version: 1,
      updatedAt: '2026-11-21T00:00:00.000Z',
    },
    settings: {
      heroTitle: 'Product Catalogues & Spec Sheets',
      heroSubtitle: 'Download verified brochures and technical equipment guidelines.',
      caseStudiesTitle: 'Featured Institutional Case Studies',
      caseStudiesSubtitle: 'Proven infrastructure execution across accredited campuses.',
    },
    collections: {
      cards: [
        {
          id: 601,
          slug: 'stem-lab-catalogue',
          title: 'STEM & Robotics Lab Catalogue',
          summary: 'Complete equipment specs and bill of materials.',
          imageUrl: '/uploads/stem-cat.jpg',
          data: {
            downloadLink: '/files/stem-catalogue.pdf',
          },
        },
        {
          id: 602,
          slug: 'vocational-workshop-brochure',
          title: 'Vocational Workshop Brochure',
          summary: 'Industrial carpentry and electronics training equipment.',
          imageUrl: '/uploads/vocational.jpg',
          data: {
            downloadLink: '/files/vocational.pdf',
          },
        },
      ],
      caseStudies: [
        {
          id: 701,
          slug: 'heritage-school-lab-transformation',
          title: 'Heritage School Lab Transformation',
          summary: 'Turnkey rollout of 3 composite robotics studios in 30 days.',
          imageUrl: '/uploads/case-heritage.jpg',
          data: {
            category: 'Turnkey Lab Setup',
            active: true,
          },
        },
      ],
    },
    categories: [],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/pages/catalogues', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json(mockCataloguesV2);
        }
        return HttpResponse.json({ error: 'Legacy requested' }, { status: 400 });
      })
    );
  });

  it('renders catalogue cards and case studies from v2 summary shape', async () => {
    renderWithProviders(<Catalogues />);

    await waitFor(() => {
      expect(screen.getByText('Product Catalogues & Spec Sheets')).toBeInTheDocument();
    });

    // Cards
    expect(screen.getByText('STEM & Robotics Lab Catalogue')).toBeInTheDocument();
    expect(screen.getByText('Vocational Workshop Brochure')).toBeInTheDocument();

    // Case studies
    expect(screen.getByText('Featured Institutional Case Studies')).toBeInTheDocument();
    expect(screen.getByText('Heritage School Lab Transformation')).toBeInTheDocument();
    expect(screen.getByText('Turnkey Lab Setup')).toBeInTheDocument();
  });
});
