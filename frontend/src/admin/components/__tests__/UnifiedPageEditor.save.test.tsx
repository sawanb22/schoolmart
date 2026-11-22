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

describe('UnifiedPageEditor Structured Page Save (last write wins)', () => {
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

  it('strips all collection keys and categories from PUT payload on structured page save', async () => {
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

    // Last write wins: the editor no longer sends a version
    expect(capturedPutPayload.version).toBeUndefined();

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

  it('save never shows "Page Conflict Detected" and succeeds with a stale page version', async () => {
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
        // Server is at a newer version than the editor; it still accepts the write
        return HttpResponse.json({
          id: 10,
          title: capturedPutPayload.title,
          version: 8,
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
      expect(capturedPutPayload).not.toBeNull();
      expect(screen.getAllByText(/All Changes Saved/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/Page Conflict Detected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Another administrator or process modified this page/i)).not.toBeInTheDocument();
  });

  it('does not offer the Load Starter Template button', () => {
    server.use(
      http.get('*/api/pages', () => HttpResponse.json([structuredPage])),
      http.get('*/api/admin/pages/10/items', () => HttpResponse.json({ items: [] })),
      http.get('*/api/admin/pages/10/categories', () => HttpResponse.json({ categories: [] }))
    );

    renderWithProviders(
      <UnifiedPageEditor
        page={structuredPage as any}
        isStandalone={true}
      />
    );

    expect(screen.queryByText(/Starter Template/i)).not.toBeInTheDocument();
  });
});
