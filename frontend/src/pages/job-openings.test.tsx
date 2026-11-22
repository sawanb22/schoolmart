import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import JobOpenings from './job-openings';

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

describe('JobOpenings Page (v2 Summary Shape)', () => {
  const mockOpeningsV2 = {
    page: {
      id: 4,
      slug: 'job-openings',
      title: 'Careers & Job Openings',
      template: 'job-openings',
      contentModel: 'structured',
      version: 1,
      updatedAt: '2026-11-21T00:00:00.000Z',
    },
    settings: {
      heroTitle: 'Join the SchoolMart Team',
      heroSubtitle: 'Build future-ready learning spaces across India.',
    },
    collections: {
      openings: [
        {
          id: 401,
          slug: 'senior-educational-architect',
          title: 'Senior Educational Architect',
          summary: 'Lead campus master planning and infrastructure architecture.',
          data: {
            id: 'job-401',
            title: 'Senior Educational Architect',
            department: 'Architecture & Design',
            location: 'New Delhi, India',
            type: 'Full-time',
            experience: '5+ years',
            description: 'Lead campus master planning and infrastructure architecture.',
            requirements: ['B.Arch degree', 'AutoCAD proficiency'],
            active: true,
          },
        },
        {
          id: 402,
          slug: 'stem-lab-installer',
          title: 'STEM Lab Installation Specialist',
          summary: 'Commission robotics and composite skill labs in schools.',
          data: {
            id: 'job-402',
            title: 'STEM Lab Installation Specialist',
            department: 'Operations',
            location: 'Bengaluru, India',
            type: 'Full-time',
            experience: '3+ years',
            description: 'Commission robotics and composite skill labs in schools.',
            requirements: ['Electronics or Mechanical background'],
            active: true,
          },
        },
      ],
    },
    categories: [],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/pages/job-openings', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('v') === '2') {
          return HttpResponse.json(mockOpeningsV2);
        }
        return HttpResponse.json({ error: 'Legacy requested' }, { status: 400 });
      })
    );
  });

  it('renders job openings list with roles, departments, and locations', async () => {
    renderWithProviders(<JobOpenings />);

    await waitFor(() => {
      expect(screen.getByText('Senior Educational Architect')).toBeInTheDocument();
    });

    expect(screen.getByText('STEM Lab Installation Specialist')).toBeInTheDocument();
    expect(screen.getByText(/Architecture & Design/i)).toBeInTheDocument();
    expect(screen.getByText(/New Delhi, India/i)).toBeInTheDocument();
    expect(screen.getByText(/Bengaluru, India/i)).toBeInTheDocument();
  });
});
