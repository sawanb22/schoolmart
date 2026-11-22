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

  it('shows the server error and no conflict dialog when a save is rejected', async () => {
    const onSavedMock = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.patch('*/api/admin/pages/1/items/42', () => {
        return HttpResponse.json(
          { error: 'slug_taken', message: 'Slug collision' },
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
        onSaved={onSavedMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('slug_taken')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Version Conflict/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Overwrite With Mine/i)).not.toBeInTheDocument();
    expect(onSavedMock).not.toHaveBeenCalled();
  });

  it('saves with an out-of-date item version without any conflict prompt (last write wins)', async () => {
    let patchCount = 0;
    const onSavedMock = vi.fn();

    server.use(
      http.patch('*/api/admin/pages/1/items/42', async ({ request }) => {
        patchCount++;
        const body: any = await request.json();
        // Server ignores the version and applies the write
        return HttpResponse.json({ id: 42, version: 9, card: body.card });
      })
    );

    renderWithProviders(
      <ItemEditorDrawer
        pageId={1}
        pageSlug="labs"
        collection="cards"
        item={{ ...baseItem, version: 1 }}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={onSavedMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(patchCount).toBe(1);
      expect(onSavedMock).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Version Conflict/i)).not.toBeInTheDocument();
  });
});
