import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import HistoryPanel from '../HistoryPanel';

function renderPanel(isOpen = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryPanel isOpen={isOpen} onClose={vi.fn()} pageId={7} pageSlug="labs" />
    </QueryClientProvider>
  );
}

describe('HistoryPanel (read-only activity log)', () => {
  it('renders each change summary with the author name and has no Restore button', async () => {
    server.use(
      http.get('*/api/admin/pages/7/revisions', () =>
        HttpResponse.json({
          revisions: [
            {
              id: 2,
              reason: 'item-update',
              summary: 'Edited card "Robotics Lab"',
              authorId: 5,
              authorName: 'Asha Rao',
              createdAt: '2026-11-21T18:00:00.000Z',
            },
            {
              id: 1,
              reason: 'category-delete',
              summary: 'Deleted category "Old Stuff"',
              authorId: null,
              authorName: 'System',
              createdAt: '2026-11-21T17:00:00.000Z',
            },
          ],
        })
      )
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Edited card "Robotics Lab"')).toBeInTheDocument();
    });

    expect(screen.getByText('Deleted category "Old Stuff"')).toBeInTheDocument();
    expect(screen.getByText(/by Asha Rao/)).toBeInTheDocument();
    expect(screen.getByText(/by System/)).toBeInTheDocument();
    expect(screen.getByText(/Shows the last 20 changes to this page\./i)).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Restore/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Conflict/i)).not.toBeInTheDocument();
  });

  it('shows "No changes recorded yet." when the log is empty', async () => {
    server.use(
      http.get('*/api/admin/pages/7/revisions', () => HttpResponse.json({ revisions: [] }))
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('No changes recorded yet.')).toBeInTheDocument();
    });
  });

  it('renders nothing when closed', () => {
    renderPanel(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
