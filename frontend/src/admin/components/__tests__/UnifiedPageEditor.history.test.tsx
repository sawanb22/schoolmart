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

describe('UnifiedPageEditor Page History (read-only activity log)', () => {
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
      reason: 'item-create',
      summary: 'Added card "Physics Lab"',
      authorId: 1,
      authorName: 'Asha Rao',
      createdAt: '2026-11-21T18:00:00.000Z',
    },
    {
      id: 101,
      reason: 'settings',
      summary: 'Edited page settings',
      authorId: null,
      authorName: 'System',
      createdAt: '2026-11-21T17:30:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('opens the History panel from the toolbar and lists changes without any restore option', async () => {
    let restoreCalled = false;

    server.use(
      http.get('*/api/pages', () => HttpResponse.json([testPage])),
      http.get('*/api/admin/pages/10/items', () => HttpResponse.json({ items: [] })),
      http.get('*/api/admin/pages/10/categories', () => HttpResponse.json({ categories: [] })),
      http.get('*/api/admin/pages/10/revisions', () => HttpResponse.json({ revisions: mockRevisions })),
      http.post('*/api/admin/pages/10/revisions/:revId/restore', () => {
        restoreCalled = true;
        return HttpResponse.json({}, { status: 404 });
      })
    );

    renderWithProviders(
      <UnifiedPageEditor
        page={{ ...testPage } as any}
        isStandalone={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    await waitFor(() => {
      expect(screen.getByText('Added card "Physics Lab"')).toBeInTheDocument();
    });

    expect(screen.getByText('Edited page settings')).toBeInTheDocument();
    expect(screen.getByText(/by Asha Rao/)).toBeInTheDocument();
    expect(screen.getByText(/by System/)).toBeInTheDocument();
    expect(screen.getByText(/Shows the last 20 changes to this page\./i)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Restore/i })).not.toBeInTheDocument();
    expect(restoreCalled).toBe(false);
  }, 15000);
});
