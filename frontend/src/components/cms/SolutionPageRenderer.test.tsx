import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import SolutionPageRenderer from './SolutionPageRenderer';

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

describe('SolutionPageRenderer (v2 Summary Shape)', () => {
  const mockLabsV2 = {
    page: {
      id: 1,
      slug: 'labs',
      title: 'Laboratories',
      template: 'solution-hub',
      contentModel: 'structured',
      version: 1,
      updatedAt: '2026-11-21T00:00:00.000Z',
    },
    settings: {
      heroTitle: 'Advanced Science & Tech Labs',
      heroSubtitle: 'State-of-the-art educational equipment',
      section1Title: 'Explore Laboratory Facilities',
      styles: {
        showFilters: true,
      },
    },
    collections: {
      cards: [
        {
          id: 101,
          slug: 'robotics-station',
          title: 'Robotics Station',
          summary: 'Hands-on robotics and automation kits.',
          imageUrl: '/uploads/robotics.jpg',
          href: '/labs/robotics-station',
          badge: 'STEM',
          categories: ['Robotics'],
          data: {},
        },
        {
          id: 102,
          slug: 'biology-workbench',
          title: 'Biology Workbench',
          summary: 'High-precision microscopes and specimen kits.',
          imageUrl: '/uploads/biology.jpg',
          href: '/labs/biology-workbench',
          badge: 'Bio',
          categories: ['Life Sciences'],
          data: {},
        },
        {
          id: 103,
          slug: 'coding-lab',
          title: 'AI & Coding Lab',
          summary: 'Modern workstations with GPU clusters.',
          imageUrl: '/uploads/coding.jpg',
          href: '/labs/coding-lab',
          badge: 'Tech',
          categories: ['Robotics'],
          data: {},
        },
      ],
    },
    categories: [
      { id: 1, name: 'Robotics', slug: 'robotics' },
      { id: 2, name: 'Life Sciences', slug: 'life-sciences' },
    ],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/pages/labs', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json(mockLabsV2);
        }
        return HttpResponse.json({ error: 'Legacy requested' }, { status: 400 });
      })
    );
  });

  it('renders cards from v2 summary response', async () => {
    renderWithProviders(<SolutionPageRenderer slug="labs" />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Science & Tech Labs')).toBeInTheDocument();
    });

    // Default category 'Robotics' is selected first
    expect(screen.getByText('Robotics Station')).toBeInTheDocument();
    expect(screen.getByText('AI & Coding Lab')).toBeInTheDocument();
  });

  it('renders category filter pills and sidebar', async () => {
    renderWithProviders(<SolutionPageRenderer slug="labs" />);

    await waitFor(() => {
      expect(screen.getByText('Explore Laboratory Facilities')).toBeInTheDocument();
    });

    const roboticsButtons = screen.getAllByRole('button', { name: 'Robotics' });
    expect(roboticsButtons.length).toBeGreaterThan(0);

    const lifeSciencesButtons = screen.getAllByRole('button', { name: 'Life Sciences' });
    expect(lifeSciencesButtons.length).toBeGreaterThan(0);
  });

  it('filters cards when switching category pills', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SolutionPageRenderer slug="labs" />);

    await waitFor(() => {
      expect(screen.getByText('Robotics Station')).toBeInTheDocument();
    });

    // Click Life Sciences filter pill
    const lifeSciencesButtons = screen.getAllByRole('button', { name: 'Life Sciences' });
    await user.click(lifeSciencesButtons[0]);

    // Biology Workbench should now be visible
    expect(screen.getByText('Biology Workbench')).toBeInTheDocument();
    // Robotics cards should be filtered out
    expect(screen.queryByText('Robotics Station')).not.toBeInTheDocument();
    expect(screen.queryByText('AI & Coding Lab')).not.toBeInTheDocument();
  });
});
