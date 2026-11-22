import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import UnifiedPageEditor from '../UnifiedPageEditor';

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

describe('UnifiedPageEditor Structured Page Save & Optimistic Locking', () => {
  const structuredPage = {
    id: 10,
    slug: 'labs',
    title: 'Science & Tech Labs',
    contentModel: 'structured',
    template: 'hub',
    version: 4,
    published: true,
    pageData: JSON.stringify({
      heroTitle: 'Innovative Laboratories',
      cards: [{ title: 'Legacy Card That Should Be Stripped' }],
      categories: ['Science', 'Robotics'],
      faqs: [{ question: 'FAQ item' }],
    }),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('strips all collection keys and categories from PUT payload and sends version on structured page save', async () => {
    let capturedPutPayload: any = null;

    server.use(
      http.get('*/api/pages', () => {
        return HttpResponse.json([structuredPage]);
      }),
      http.get('*/api/admin/pages/10/items', () => {
        return HttpResponse.json({ items: [] });
      }),
      http.get('*/api/admin/pages/10/categories', () => {
        return HttpResponse.json({ categories: [] });
      }),
      http.put('*/api/pages/10', async ({ request }) => {
        capturedPutPayload = await request.json();
        return HttpResponse.json({
          id: 10,
          title: capturedPutPayload.title,
          version: 5,
          pageData: capturedPutPayload.pageData,
        });
      })
    );

    renderWithProviders(
      <UnifiedPageEditor
        page={structuredPage as any}
        isStandalone={true}
      />
    );

    const saveButtons = screen.getAllByRole('button', { name: /Save All Changes/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(capturedPutPayload).toBeDefined();
    });

    expect(capturedPutPayload.version).toBe(4);

    const parsedPageData = JSON.parse(capturedPutPayload.pageData);
    expect(parsedPageData.heroTitle).toBe('Innovative Laboratories');

    // Invariant: collections must be stripped
    expect(parsedPageData.cards).toBeUndefined();
    expect(parsedPageData.section2Cards).toBeUndefined();
    expect(parsedPageData.moreCards).toBeUndefined();
    expect(parsedPageData.featured).toBeUndefined();
    expect(parsedPageData.faqs).toBeUndefined();
    expect(parsedPageData.openings).toBeUndefined();
    expect(parsedPageData.caseStudies).toBeUndefined();
    expect(parsedPageData.categories).toBeUndefined();
  });

  it('handles HTTP 409 version_conflict and displays page-level ConflictDialog', async () => {
    server.use(
      http.get('*/api/pages', () => {
        return HttpResponse.json([structuredPage]);
      }),
      http.get('*/api/admin/pages/10/items', () => {
        return HttpResponse.json({ items: [] });
      }),
      http.get('*/api/admin/pages/10/categories', () => {
        return HttpResponse.json({ categories: [] });
      }),
      http.put('*/api/pages/10', () => {
        return HttpResponse.json(
          {
            error: 'version_conflict',
            current: {
              ...structuredPage,
              version: 5,
              title: 'Remote Updated Title',
            },
          },
          { status: 409 }
        );
      })
    );

    renderWithProviders(
      <UnifiedPageEditor
        page={structuredPage as any}
        isStandalone={true}
      />
    );

    const saveButtons = screen.getAllByRole('button', { name: /Save All Changes/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Page Conflict Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Another administrator or process modified this page/i)).toBeInTheDocument();
    });
  });
});
