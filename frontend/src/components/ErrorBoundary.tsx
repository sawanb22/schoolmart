import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export const CHUNK_RELOAD_KEY = 'cm_chunk_reload_ts';
export const RELOAD_DEBOUNCE_MS = 30000;

export function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = String(error.message || '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('dynamically imported')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkError: isChunkLoadError(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);

    // Auto-heal chunk errors on stale deployments: at most 1 reload per 30s
    if (isChunkLoadError(error)) {
      try {
        const lastReload = parseInt(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0', 10);
        const now = Date.now();
        if (now - lastReload > RELOAD_DEBOUNCE_MS) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
          window.location.reload();
        }
      } catch {
        // Ignore sessionStorage or reload exceptions in restricted environments
      }
    }
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      // ignore
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 text-center">
          <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">
              An unexpected error occurred while rendering the page.
            </p>
            {isDev && this.state.error?.message && (
              <div
                data-testid="error-message"
                className="bg-slate-100 p-3 rounded-lg text-left text-xs font-mono text-slate-700 overflow-auto max-h-32 mb-6"
              >
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
