import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import CollegesUniversitiesForSale from './colleges-universities-for-sale';

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

describe('CollegesUniversitiesForSale Page (v2 Summary Shape)', () => {
  const mockCollegesV2 = {
    page: {
      id: 5,
      slug: 'colleges-universities-for-sale',
      title: 'Colleges & Universities for Sale',
      template: 'colleges-universities-for-sale',
      contentModel: 'structured',
      version: 1,
      updatedAt: '2026-11-21T00:00:00.000Z',
    },
    settings: {
      heroTitle: 'Verified Educational Institutions for Acquisition',
      heroSubtitle: 'Complete confidentiality and due diligence support.',
    },
    collections: {
      cards: [
        {
          id: 501,
          slug: 'cbse-school-haryana',
          title: 'CBSE Secondary School in Haryana',
          summary: 'Established K-12 campus on 12 acres with 1400+ students.',
          imageUrl: '/uploads/school-haryana.jpg',
          data: {
            location: 'Gurugram, Haryana',
            region: 'North',
            askingPrice: 'INR 25 Cr',
            sales: 'INR 4.5 Cr',
            margin: '35%',
            rating: '8.4',
            premium: true,
          },
        },
        {
          id: 502,
          slug: 'engineering-college-pune',
          title: 'Engineering College Campus in Pune',
          summary: 'AICTE approved engineering institute with operational labs and hostels.',
          imageUrl: '/uploads/college-pune.jpg',
          data: {
            location: 'Pune, Maharashtra',
            region: 'West',
            askingPrice: 'INR 60 Cr',
            sales: 'INR 12 Cr',
            margin: '42%',
            rating: '9.1',
          },
        },
      ],
    },
    categories: [{ id: 1, name: 'North', slug: 'north' }, { id: 2, name: 'West', slug: 'west' }],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/pages/colleges-universities-for-sale', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json(mockCollegesV2);
        }
        return HttpResponse.json({ error: 'Legacy requested' }, { status: 400 });
      })
    );
  });

  it('renders listing cards and financial/location fields from v2 summary shape', async () => {
    renderWithProviders(<CollegesUniversitiesForSale />);

    await waitFor(() => {
      expect(screen.getByText('CBSE Secondary School in Haryana')).toBeInTheDocument();
    });

    expect(screen.getByText('Engineering College Campus in Pune')).toBeInTheDocument();
    expect(screen.getByText('Gurugram, Haryana')).toBeInTheDocument();
    expect(screen.getByText('Pune, Maharashtra')).toBeInTheDocument();
    expect(screen.getByText('INR 25 Cr')).toBeInTheDocument();
    expect(screen.getByText('INR 60 Cr')).toBeInTheDocument();
  });
});
