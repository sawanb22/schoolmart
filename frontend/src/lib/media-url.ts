/**
 * Resolves media URLs (images, documents, uploads) to their fully qualified URL.
 *
 * Behavior:
 * 1. Empty / null values return empty string.
 * 2. Uploads paths (containing `/uploads/`):
 *    - If `VITE_MEDIA_BASE_URL` is configured, prefixes with `VITE_MEDIA_BASE_URL`.
 *    - Otherwise, resolves against the API server origin (or window origin).
 * 3. Absolute URLs (`http:`, `https:`, `data:`, `blob:`) return as-is.
 * 4. Other relative paths resolve against the API server origin.
 *
 * NOTE: Never hardcodes sportsurf.in or any third-party domain.
 */
export function resolveMediaUrl(value?: string | null): string {
    if (!value) return '';

    // Handle uploads paths
    if (value.includes('/uploads/')) {
        const uploadIdx = value.indexOf('/uploads/');
        const subPath = value.substring(uploadIdx); // e.g. "/uploads/media/foo.jpg"

        const mediaBase = import.meta.env?.VITE_MEDIA_BASE_URL;
        if (mediaBase && typeof mediaBase === 'string' && mediaBase.trim()) {
            const cleanBase = mediaBase.trim().replace(/\/+$/, '');
            const cleanSub = subPath.startsWith('/') ? subPath : `/${subPath}`;
            return `${cleanBase}${cleanSub}`;
        }

        // Fallback to API server origin or window origin
        const apiBase = import.meta.env?.VITE_API_URL || '/api';
        const origin = apiBase.startsWith('http')
            ? new URL(apiBase).origin
            : (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

        if (!origin) return subPath;
        return new URL(subPath.replace(/^\//, ''), `${origin.replace(/\/+$/, '')}/`).toString();
    }

    // Absolute URLs, data URLs, blob URLs
    if (/^(https?:|data:|blob:)/i.test(value)) {
        return value;
    }

    const cleanPath = value.startsWith('/') ? value : `/${value}`;

    const base = import.meta.env?.VITE_API_URL || '/api';
    const origin = base.startsWith('http')
        ? new URL(base).origin
        : (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

    if (!origin) return cleanPath;
    return new URL(cleanPath.replace(/^\//, ''), `${origin.replace(/\/+$/, '')}/`).toString();
}
