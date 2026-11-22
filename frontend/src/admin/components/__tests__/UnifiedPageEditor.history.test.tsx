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

describe('UnifiedPageEditor Revision History & Restore (T13)', () => {
  const testPage = {
    id: 10,
    slug: 'labs',
    title: 'Science & Tech Labs',
    contentModel: 'structured',
    template: 'hub',
    version: 4,
    published: true,
    pageData: JSON.stringify({
      heroTitle: 'Innovative Laboratories',
    }),
  };

  const mockRevisions = [
    {
      id: 102,
      version: 4,
      reason: 'item-create',
      authorId: 1,
      createdAt: '2026-11-21T18:00:00.000Z',
    },
    {
      id: 101,
      version: 3,
      reason: 'settings',
      authorId: null,
      createdAt: '2026-11-21T17:30:00.000Z',
    },
    {
      id: 100,
      version: 2,
      reason: 'pre-migration',
      authorId: null,
      createdAt: '2026-11-21T17:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('opens history panel, displays revisions list, and executes restore with current version', async () => {
    let capturedRestorePayload: any = null;
    let restoreCalled = false;

    server.use(
      http.get('*/api/pages', () => {
        return HttpResponse.json([testPage]);
      }),
      http.get('*/api/admin/pages/10/items', () => {
        return HttpResponse.json({ items: [] });
      }),
      http.get('*/api/admin/pages/10/categories', () => {
        return HttpResponse.json({ categories: [] });
      }),
      http.get('*/api/admin/pages/10/revisions', () => {
        return HttpResponse.json({ revisions: mockRevisions });
      }),
      http.post('*/api/admin/pages/10/revisions/101/restore', async ({ request }) => {
        capturedRestorePayload = await request.json();
        restoreCalled = true;
        return HttpResponse.json({
          page: {
            ...testPage,
            title: 'Restored Science Labs',
            version: 5,
            pageData: JSON.stringify({ heroTitle: 'Restored Hero Title' }),
          },
          restoredRevisionId: 101,
        });
      })
    );

    // Mock window.confirm to approve restore
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(
      <UnifiedPageEditor
        page={{ ...testPage } as any}
        isStandalone={true}
      />
    );

    // 1. Click History button in toolbar
    const historyButton = screen.getByRole('button', { name: /History/i });
    expect(historyButton).toBeInTheDocument();
    fireEvent.click(historyButton);

    // 2. Verify panel opens and lists revisions
    await waitFor(() => {
      expect(screen.getByText(/Revision History/i)).toBeInTheDocument();
      expect(screen.getByText('item-create')).toBeInTheDocument();
      expect(screen.getByText('pre-migration')).toBeInTheDocument();
    });

    expect(screen.getByText(/Current Editor:/i)).toBeInTheDocument();
    expect(screen.getAllByText('v4').length).toBeGreaterThanOrEqual(1);

    // 3. Find Restore buttons
    const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
    expect(restoreButtons.length).toBeGreaterThanOrEqual(3);

    // Click restore on the second revision (revId: 101)
    fireEvent.click(restoreButtons[1]);

    await waitFor(() => {
      expect(restoreCalled).toBe(true);
      expect(capturedRestorePayload).toBeDefined();
    });

    // Verify current page version (4) was sent in payload
    expect(capturedRestorePayload.version).toBe(4);

    // Verify success banner appears
    await waitFor(() => {
      expect(screen.getByText(/Restore Succeeded/i)).toBeInTheDocument();
    });
  }, 15000);

  it('handles HTTP 409 conflict when restoring with stale page version', async () => {
    server.use(
      http.get('*/api/pages', () => {
        return HttpResponse.json([testPage]);
      }),
      http.get('*/api/admin/pages/10/items', () => {
        return HttpResponse.json({ items: [] });
      }),
      http.get('*/api/admin/pages/10/categories', () => {
        return HttpResponse.json({ categories: [] });
      }),
      http.get('*/api/admin/pages/10/revisions', () => {
        return HttpResponse.json({ revisions: mockRevisions });
      }),
      http.post('*/api/admin/pages/10/revisions/101/restore', () => {
        return HttpResponse.json(
          {
            error: 'version_conflict',
            current: 7,
          },
          { status: 409 }
        );
      })
    );

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(
      <UnifiedPageEditor
        page={{ ...testPage } as any}
        isStandalone={true}
      />
    );

    // Open History panel
    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    await waitFor(() => {
      expect(screen.getByText('item-create')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
    fireEvent.click(restoreButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/Conflict Warning/i)).toBeInTheDocument();
      expect(screen.getByText(/Version Conflict \(409\)/i)).toBeInTheDocument();
    });
  }, 15000);
});
