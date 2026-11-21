import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import CollegesManager from '../CollegesManager';

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

describe('CollegesManager Admin Page (Structured Writes)', () => {
  const mockStructuredPage = {
    id: 5,
    slug: 'colleges-universities-for-sale',
    title: 'Colleges & Universities for Sale',
    contentModel: 'structured',
    template: 'colleges-universities-for-sale',
    version: 3,
    published: true,
    pageData: JSON.stringify({
      heroTitle: 'Verified Educational Institutions for Acquisition',
      heroSubtitle: 'Complete confidentiality and due diligence support.',
    }),
  };

  const mockItems = [
    {
      id: 501,
      pageId: 5,
      collection: 'cards',
      slug: 'delhi-engineering-college',
      title: 'Delhi Engineering College',
      summary: 'Accredited campus in NCR',
      imageUrl: '/uploads/college1.jpg',
      href: '/colleges-universities-for-sale/delhi-engineering-college',
      categories: ['Colleges & Higher Education'],
      sortOrder: 0,
      version: 2,
      published: true,
      card: {
        title: 'Delhi Engineering College',
        description: 'Accredited campus in NCR',
        location: 'Delhi NCR',
        region: 'North',
        sales: 'INR 15 Cr',
        margin: '25%',
        askingPrice: 'INR 60 Cr',
        rating: '8.2',
        premium: false,
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('reads from items and categories API and submits new listing via POST /api/admin/pages/:pageId/items', async () => {
    let capturedItemPayload: any = null;
    let putPageCalled = false;

    server.use(
      http.get('*/api/pages/colleges-universities-for-sale', () => {
        return HttpResponse.json(mockStructuredPage);
      }),
      http.get('*/api/admin/pages/5/items', () => {
        return HttpResponse.json({ items: mockItems });
      }),
      http.get('*/api/admin/pages/5/categories', () => {
        return HttpResponse.json({ categories: [{ id: 1, name: 'Colleges & Higher Education' }] });
      }),
      http.post('*/api/admin/pages/5/items', async ({ request }) => {
        capturedItemPayload = await request.json();
        return HttpResponse.json({
          id: 502,
          version: 1,
          ...capturedItemPayload.card,
        });
      }),
      http.put('*/api/pages/5', () => {
        putPageCalled = true;
        return HttpResponse.json(mockStructuredPage);
      })
    );

    renderWithProviders(<CollegesManager />);

    await waitFor(() => {
      expect(screen.getByText('Delhi Engineering College')).toBeInTheDocument();
    });

    // Click "Add Institution"
    const addBtn = screen.getByRole('button', { name: /Add Institution/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Add College / University Listing')).toBeInTheDocument();
    });

    // Fill required form fields
    const titleInput = screen.getByPlaceholderText(/Private University @ Gujarat/i);
    fireEvent.change(titleInput, { target: { value: 'Mumbai Business School' } });

    const descInput = screen.getByPlaceholderText(/Provide detailed information regarding land area/i);
    fireEvent.change(descInput, { target: { value: 'Premier B-school campus with full AICTE approval.' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Add to Database/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(capturedItemPayload).toBeDefined();
    });

    expect(capturedItemPayload.collection).toBe('cards');
    expect(capturedItemPayload.card.title).toBe('Mumbai Business School');
    expect(capturedItemPayload.card.description).toBe('Premier B-school campus with full AICTE approval.');

    // Crucial check: whole-page PUT /api/pages/5 must NOT be called for item creation on structured pages
    expect(putPageCalled).toBe(false);
  });

  it('updates an existing listing via PATCH /api/admin/pages/:pageId/items/:itemId', async () => {
    let capturedPatchPayload: any = null;
    let putPageCalled = false;

    server.use(
      http.get('*/api/pages/colleges-universities-for-sale', () => {
        return HttpResponse.json(mockStructuredPage);
      }),
      http.get('*/api/admin/pages/5/items', () => {
        return HttpResponse.json({ items: mockItems });
      }),
      http.get('*/api/admin/pages/5/categories', () => {
        return HttpResponse.json({ categories: [{ id: 1, name: 'Colleges & Higher Education' }] });
      }),
      http.patch('*/api/admin/pages/5/items/501', async ({ request }) => {
        capturedPatchPayload = await request.json();
        return HttpResponse.json({
          id: 501,
          version: 3,
          card: capturedPatchPayload.card,
        });
      }),
      http.put('*/api/pages/5', () => {
        putPageCalled = true;
        return HttpResponse.json(mockStructuredPage);
      })
    );

    renderWithProviders(<CollegesManager />);

    await waitFor(() => {
      expect(screen.getByText('Delhi Engineering College')).toBeInTheDocument();
    });

    // Click Edit button on the listing
    const editBtn = screen.getByTitle('Edit listing');
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Edit Institutional Listing')).toBeInTheDocument();
    });

    // Update title
    const titleInput = screen.getByPlaceholderText(/Private University @ Gujarat/i);
    fireEvent.change(titleInput, { target: { value: 'Delhi Engineering College (Updated)' } });

    // Submit update
    const updateBtn = screen.getByRole('button', { name: /Update Listing/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(capturedPatchPayload).toBeDefined();
    });

    expect(capturedPatchPayload.version).toBe(2);
    expect(capturedPatchPayload.card.title).toBe('Delhi Engineering College (Updated)');
    expect(putPageCalled).toBe(false);
  });
});
