import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import ItemsManager from '../ItemsManager';

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

describe('ItemsManager Component', () => {
  const mockItems = [
    {
      id: 101,
      pageId: 1,
      collection: 'cards',
      slug: 'physics-lab',
      title: 'Physics Laboratory',
      summary: 'State of the art lab',
      imageUrl: '/uploads/physics.png',
      href: '/labs/physics-lab',
      badge: 'Popular',
      categories: ['Science'],
      published: true,
      sortOrder: 0,
      version: 1,
      card: {
        title: 'Physics Laboratory',
        slug: 'physics-lab',
        description: 'State of the art lab',
        image: '/uploads/physics.png',
        categories: ['Science'],
      },
    },
    {
      id: 102,
      pageId: 1,
      collection: 'cards',
      slug: 'chemistry-lab',
      title: 'Chemistry Laboratory',
      summary: 'Equipped chemical benches',
      imageUrl: '/uploads/chem.png',
      href: '/labs/chemistry-lab',
      badge: null,
      categories: ['Science'],
      published: false,
      sortOrder: 1,
      version: 1,
      card: {
        title: 'Chemistry Laboratory',
        slug: 'chemistry-lab',
        description: 'Equipped chemical benches',
        image: '/uploads/chem.png',
        categories: ['Science'],
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders item list with title, slug, and published status', async () => {
    server.use(
      http.get('*/api/admin/pages/1/items', () => {
        return HttpResponse.json({ items: mockItems });
      })
    );

    renderWithProviders(
      <ItemsManager
        pageId={1}
        pageSlug="labs"
        collection="cards"
        label="Lab Cards"
      />
    );

    expect(screen.getByText('Loading items...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Physics Laboratory')).toBeInTheDocument();
      expect(screen.getByText('Chemistry Laboratory')).toBeInTheDocument();
    });

    expect(screen.getByText('/physics-lab')).toBeInTheDocument();
    expect(screen.getByText('/chemistry-lab')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('opens item drawer when "New Item" is clicked', async () => {
    server.use(
      http.get('*/api/admin/pages/1/items', () => {
        return HttpResponse.json({ items: mockItems });
      })
    );

    renderWithProviders(
      <ItemsManager
        pageId={1}
        pageSlug="labs"
        collection="cards"
        label="Lab Cards"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Physics Laboratory')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /New Item/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /New Item/i })).toBeInTheDocument();
    });
  });

  it('calls reorder API when move down button is clicked', async () => {
    let reorderedPayload: any = null;

    server.use(
      http.get('*/api/admin/pages/1/items', () => {
        return HttpResponse.json({ items: mockItems });
      }),
      http.put('*/api/admin/pages/1/items/reorder', async ({ request }) => {
        reorderedPayload = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    renderWithProviders(
      <ItemsManager
        pageId={1}
        pageSlug="labs"
        collection="cards"
        label="Lab Cards"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Physics Laboratory')).toBeInTheDocument();
    });

    const moveDownBtns = screen.getAllByTitle('Move down');
    fireEvent.click(moveDownBtns[0]);

    await waitFor(() => {
      expect(reorderedPayload).toEqual({
        collection: 'cards',
        orderedIds: [102, 101],
      });
    });
  });

  it('confirms and calls delete API when delete button is clicked', async () => {
    let deletedId: string | null = null;
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    server.use(
      http.get('*/api/admin/pages/1/items', () => {
        return HttpResponse.json({ items: mockItems });
      }),
      http.delete('*/api/admin/pages/1/items/:itemId', ({ params }) => {
        deletedId = String(params.itemId);
        return HttpResponse.json({ success: true });
      })
    );

    renderWithProviders(
      <ItemsManager
        pageId={1}
        pageSlug="labs"
        collection="cards"
        label="Lab Cards"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Physics Laboratory')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle('Delete this card');
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(deletedId).toBe('101');
    });
  });

  it('auto-opens drawer when targetCardSlug matches an item', async () => {
    server.use(
      http.get('*/api/admin/pages/1/items', () => {
        return HttpResponse.json({ items: mockItems });
      })
    );

    renderWithProviders(
      <ItemsManager
        pageId={1}
        pageSlug="labs"
        collection="cards"
        label="Lab Cards"
        targetCardSlug="chemistry-lab"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Edit: Chemistry Laboratory/i })).toBeInTheDocument();
    });
  });
});
