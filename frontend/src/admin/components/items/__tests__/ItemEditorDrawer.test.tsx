import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import ItemEditorDrawer from '../ItemEditorDrawer';

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

describe('ItemEditorDrawer Component', () => {
  const baseItem: any = {
    id: 42,
    pageId: 1,
    collection: 'cards',
    slug: 'robotics-lab',
    title: 'Robotics Lab',
    summary: 'High-tech robotics',
    imageUrl: '/uploads/robotics.jpg',
    href: '/labs/robotics-lab',
    badge: 'Trending',
    categories: ['Engineering'],
    published: true,
    sortOrder: 0,
    version: 3,
    data: {},
    detail: {
      detailContent: 'Initial lab equipment list',
    },
    card: {
      title: 'Robotics Lab',
      slug: 'robotics-lab',
      description: 'High-tech robotics',
      image: '/uploads/robotics.jpg',
      href: '/labs/robotics-lab',
      badge: 'Trending',
      categories: ['Engineering'],
      detailContent: 'Initial lab equipment list',
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PATCH with version and card on Save and notifies onSaved', async () => {
    let patchPayload: any = null;
    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();

    server.use(
      http.patch('*/api/admin/pages/1/items/42', async ({ request }) => {
        patchPayload = await request.json();
        return HttpResponse.json({
          id: 42,
          version: 4,
          card: patchPayload.card,
        });
      })
    );

    renderWithProviders(
      <ItemEditorDrawer
        pageId={1}
        pageSlug="labs"
        collection="cards"
        item={baseItem}
        isOpen={true}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: /Edit: Robotics Lab/i })).toBeInTheDocument();

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(patchPayload).toBeDefined();
      expect(patchPayload.version).toBe(3);
      expect(patchPayload.card.title).toBe('Robotics Lab');
      expect(onSavedMock).toHaveBeenCalled();
    });
  });

  it('displays ConflictDialog on HTTP 409 version_conflict and reloads latest when requested', async () => {
    const remoteItem = {
      ...baseItem,
      version: 5,
      card: {
        ...baseItem.card,
        title: 'Robotics Lab (Updated by Another Admin)',
        detailContent: 'Remote edited equipment list',
      },
    };

    server.use(
      http.patch('*/api/admin/pages/1/items/42', () => {
        return HttpResponse.json(
          {
            error: 'version_conflict',
            current: remoteItem,
          },
          { status: 409 }
        );
      })
    );

    renderWithProviders(
      <ItemEditorDrawer
        pageId={1}
        pageSlug="labs"
        collection="cards"
        item={baseItem}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // Click Save to trigger 409
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Version Conflict on/i)).toBeInTheDocument();
      expect(screen.getByText(/Reload Latest/i)).toBeInTheDocument();
      expect(screen.getByText(/Overwrite With Mine/i)).toBeInTheDocument();
    });

    // Click "Reload Latest"
    const reloadBtn = screen.getByText(/Reload Latest/i);
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      // Conflict dialog should close and card title should be updated to remote title
      expect(screen.queryByText(/Version Conflict on/i)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Edit: Robotics Lab \(Updated by Another Admin\)/i })).toBeInTheDocument();
    });
  });

  it('resends with remote version when Overwrite With Mine is confirmed in ConflictDialog', async () => {
    let patchCount = 0;
    let lastSentVersion: number | null = null;
    const remoteItem = {
      ...baseItem,
      version: 7,
      card: {
        ...baseItem.card,
        title: 'Concurrent Remote Title',
      },
    };

    server.use(
      http.patch('*/api/admin/pages/1/items/42', async ({ request }) => {
        patchCount++;
        const body: any = await request.json();
        lastSentVersion = body.version;

        if (patchCount === 1) {
          return HttpResponse.json(
            { error: 'version_conflict', current: remoteItem },
            { status: 409 }
          );
        }

        return HttpResponse.json({
          id: 42,
          version: 8,
          card: body.card,
        });
      })
    );

    renderWithProviders(
      <ItemEditorDrawer
        pageId={1}
        pageSlug="labs"
        collection="cards"
        item={baseItem}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // Initial save (triggers 409)
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Version Conflict on/i)).toBeInTheDocument();
    });

    // Click "Overwrite With Mine"
    const overwriteBtn = screen.getByText(/Overwrite With Mine/i);
    fireEvent.click(overwriteBtn);

    // Conflict dialog asks for confirmation
    const confirmOverwriteBtn = screen.getByRole('button', { name: /Yes, Confirm Overwrite/i });
    fireEvent.click(confirmOverwriteBtn);

    await waitFor(() => {
      expect(patchCount).toBe(2);
      expect(lastSentVersion).toBe(7); // Used remote version to overwrite
    });
  });
});
