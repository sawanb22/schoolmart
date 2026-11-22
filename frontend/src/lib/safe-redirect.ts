/**
 * Returns `raw` only when it is a same-site relative path such as `/catalogues?x=1`.
 * Rejects absolute URLs, protocol-relative URLs (`//host`), backslash tricks
 * (`/\host`) and control characters so a `?redirect=` value cannot send the
 * user to another origin.
 */
export const getSafeRedirect = (raw: string | null | undefined): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return null;
  return raw;
};

/** Builds `?redirect=<path>` for login / registration links. */
export const withRedirect = (basePath: string, redirectTo: string): string => {
  const safe = getSafeRedirect(redirectTo);
  return safe ? `${basePath}?redirect=${encodeURIComponent(safe)}` : basePath;
};
