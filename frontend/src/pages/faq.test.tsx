import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import FaqPage from './faq';

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
        <MemoryRouter>{ui}</MemoryRouter>
      </SiteContentProvider>
    </QueryClientProvider>
  );
}

describe('FaqPage (v2 Summary Shape)', () => {
  const mockFaqV2 = {
    page: {
      id: 3,
      slug: 'faq',
      title: 'Frequently Asked Questions',
      template: 'faq',
      contentModel: 'structured',
      version: 1,
      updatedAt: '2026-11-21T00:00:00.000Z',
    },
    settings: {
      heroTitle: 'Frequently Asked Questions',
      heroSubtitle: 'Everything you need to know about our institutional services.',
    },
    collections: {
      faqs: [
        {
          id: 301,
          slug: 'lab-setup-timeline',
          title: 'What is the standard lab setup timeline?',
          summary: 'Typical turnaround is 3 to 6 weeks.',
          data: {
            question: 'What is the standard lab setup timeline?',
            answer: 'Typical turnaround is 3 to 6 weeks from layout finalization.',
          },
        },
        {
          id: 302,
          slug: 'furniture-warranty',
          title: 'Do you provide warranties on modular furniture?',
          summary: 'All furniture carries a 5-year warranty.',
          data: {
            question: 'Do you provide warranties on modular furniture?',
            answer: 'Yes, all heavy-duty institutional furniture carries a comprehensive 5-year warranty.',
          },
        },
      ],
    },
    categories: [],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/pages/faq', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json(mockFaqV2);
        }
        return HttpResponse.json({ error: 'Legacy requested' }, { status: 400 });
      })
    );
  });

  it('renders FAQ questions and answers from v2 summary shape with initial open item', async () => {
    renderWithProviders(<FaqPage />);

    await waitFor(() => {
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    expect(screen.getByText('What is the standard lab setup timeline?')).toBeInTheDocument();
    expect(screen.getByText('Do you provide warranties on modular furniture?')).toBeInTheDocument();

    // Default open item answer is visible
    expect(
      screen.getByText(/Typical turnaround is 3 to 6 weeks from layout finalization/i)
    ).toBeInTheDocument();
  });

  it('toggles accordion items when clicking triggers', async () => {
    renderWithProviders(<FaqPage />);

    await waitFor(() => {
      expect(screen.getByText('Do you provide warranties on modular furniture?')).toBeInTheDocument();
    });

    // Second item is initially closed
    expect(
      screen.queryByText(/Yes, all heavy-duty institutional furniture/i)
    ).not.toBeInTheDocument();

    // Click second trigger to open it
    const secondTrigger = screen.getByRole('button', {
      name: /Do you provide warranties on modular furniture/i,
    });
    fireEvent.click(secondTrigger);

    await waitFor(() => {
      expect(
        screen.getByText(/Yes, all heavy-duty institutional furniture carries a comprehensive 5-year warranty/i)
      ).toBeInTheDocument();
    });
  });
});
