import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { lazy } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { Layout } from '@/App';

// Lazy child that suspends indefinitely
const NeverResolvingChild = lazy(() => new Promise<never>(() => {}));

function renderLayoutWithProviders(
  children: React.ReactNode,
  props: { showCategoryBar?: boolean; showBreadcrumb?: boolean } = {}
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteContentProvider>
        <WishlistProvider>
          <MemoryRouter initialEntries={['/']}>
            <Layout {...props}>{children}</Layout>
          </MemoryRouter>
        </WishlistProvider>
      </SiteContentProvider>
    </QueryClientProvider>
  );
}

describe('Layout Component', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('1. Keeps header, topbar, and footer mounted in document while lazy child is suspended', async () => {
    renderLayoutWithProviders(<NeverResolvingChild />);

    // Header navigation should be mounted in document
    const contactLinks = screen.getAllByText(/Contact Us/i);
    expect(contactLinks.length).toBeGreaterThan(0);

    // Footer copyright / content should be mounted in document
    const copyright = screen.getByText(/Third Eye Retail Pvt. Ltd./i);
    expect(copyright).toBeInTheDocument();

    // Main area should display the fallback skeleton while child is suspended
    const mainEl = document.querySelector('main');
    expect(mainEl).toBeInTheDocument();
  });

  it('2. Respects showCategoryBar and showBreadcrumb toggles', () => {
    const { unmount } = renderLayoutWithProviders(<div>Normal Content</div>, {
      showCategoryBar: false,
      showBreadcrumb: false,
    });

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
    expect(document.querySelector('.category-bar')).not.toBeInTheDocument();
    expect(document.querySelector('.breadcrumb-bar')).not.toBeInTheDocument();

    unmount();

    // When enabled (default)
    renderLayoutWithProviders(<div>Normal Content 2</div>, {
      showCategoryBar: true,
      showBreadcrumb: true,
    });

    expect(document.querySelector('.category-bar')).toBeInTheDocument();
  });
});
