import { getUserToken } from './auth-session';
import { resolveMediaUrl } from './media-url';

/**
 * Resolves an uploaded private file and attaches the current user's token for
 * browser navigations. Plain links and window.open cannot send an Authorization
 * header, so the backend also accepts this query parameter for protected PDFs.
 */
export function protectedFileUrl(value?: string | null, token = getUserToken()): string {
  const resolved = resolveMediaUrl(value);
  if (!resolved || !token) return resolved;

  const hashIndex = resolved.indexOf('#');
  const baseUrl = hashIndex === -1 ? resolved : resolved.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : resolved.slice(hashIndex);
  const separator = baseUrl.includes('?') ? '&' : '?';

  return `${baseUrl}${separator}token=${encodeURIComponent(token)}${hash}`;
}
