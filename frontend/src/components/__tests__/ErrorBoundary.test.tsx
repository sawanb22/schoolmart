import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, CHUNK_RELOAD_KEY } from '@/components/ErrorBoundary';

const ThrowingComponent = ({ error }: { error: Error }) => {
  throw error;
};

describe('ErrorBoundary Component', () => {
  let reloadMock: ReturnType<typeof vi.fn>;
  let originalLocation: Location;
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    originalLocation = window.location;
    reloadMock = vi.fn();

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadMock,
      },
    });

    // Suppress React boundary console.error during tests
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    consoleErrorMock.mockRestore();
    vi.restoreAllMocks();
  });

  it('1. Chunk-load error triggers at most 1 reload within 30s', () => {
    const chunkError = new Error('Failed to fetch dynamically imported module /assets/home.js');

    // First throw: should trigger reload and record timestamp in sessionStorage
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowingComponent error={chunkError} />
      </ErrorBoundary>
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    const ts = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    expect(ts).toBeTruthy();

    unmount();

    // Second throw immediately: should NOT trigger another reload (debounced for 30s)
    render(
      <ErrorBoundary>
        <ThrowingComponent error={chunkError} />
      </ErrorBoundary>
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('2. render() never calls window.location.reload()', () => {
    const error = new Error('Normal render error');
    const boundary = new ErrorBoundary({ children: <div /> });
    boundary.state = {
      hasError: true,
      error,
      isChunkError: true,
    };

    // Calling render directly
    const rendered = boundary.render();
    expect(rendered).toBeTruthy();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('3. Production mode hides error message; Dev mode shows it', () => {
    const error = new Error('Secret internal query failed with 500 error details');

    // Test Production Mode (import.meta.env.DEV = false)
    vi.stubEnv('DEV', false);

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    expect(screen.queryByText(/Secret internal query failed/)).not.toBeInTheDocument();

    // Test Dev Mode (import.meta.env.DEV = true)
    vi.stubEnv('DEV', true);

    rerender(
      <ErrorBoundary>
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText(/Secret internal query failed/)).toBeInTheDocument();
  });
});
