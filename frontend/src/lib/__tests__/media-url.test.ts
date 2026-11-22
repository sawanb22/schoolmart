import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveMediaUrl } from '../media-url';

describe('resolveMediaUrl', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:3001/api');
        vi.stubEnv('VITE_MEDIA_BASE_URL', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns empty string for empty, undefined, or null input', () => {
        expect(resolveMediaUrl('')).toBe('');
        expect(resolveMediaUrl(null)).toBe('');
        expect(resolveMediaUrl(undefined)).toBe('');
    });

    it('preserves absolute http/https URLs that do not contain /uploads/', () => {
        const external = 'https://images.unsplash.com/photo-12345?auto=format';
        expect(resolveMediaUrl(external)).toBe(external);
    });

    it('preserves data: and blob: URLs', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
        const blobUrl = 'blob:http://localhost:5173/abc-123';
        expect(resolveMediaUrl(dataUrl)).toBe(dataUrl);
        expect(resolveMediaUrl(blobUrl)).toBe(blobUrl);
    });

    it('resolves /uploads/ path against API origin when VITE_MEDIA_BASE_URL is not set', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.campusmart.in/api');
        vi.stubEnv('VITE_MEDIA_BASE_URL', '');

        const url = resolveMediaUrl('/uploads/media/sample.jpg');
        expect(url).toBe('https://api.campusmart.in/uploads/media/sample.jpg');
    });

    it('resolves /uploads/ path against VITE_MEDIA_BASE_URL when configured', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.campusmart.in/api');
        vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://cdn.schoolmart.in');

        const url = resolveMediaUrl('/uploads/media/sample.jpg');
        expect(url).toBe('https://cdn.schoolmart.in/uploads/media/sample.jpg');
    });

    it('handles legacy localhost or relative upload URLs by extracting the /uploads/ subpath', () => {
        vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://media.schoolmart.in/');

        const legacyLocal = resolveMediaUrl('http://localhost:5000/uploads/1776230256967-images.jpg');
        expect(legacyLocal).toBe('https://media.schoolmart.in/uploads/1776230256967-images.jpg');
    });

    it('resolves non-upload relative paths against API origin', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.campusmart.in/api');
        const url = resolveMediaUrl('documents/catalog.pdf');
        expect(url).toBe('https://api.campusmart.in/documents/catalog.pdf');
    });

    it('NEVER hardcodes sportsurf.in unless input explicitly contained it', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:3001/api');
        vi.stubEnv('VITE_MEDIA_BASE_URL', '');

        const url1 = resolveMediaUrl('/uploads/media/test.png');
        expect(url1).not.toContain('sportsurf.in');

        const url2 = resolveMediaUrl('http://localhost:5000/uploads/old.png');
        expect(url2).not.toContain('sportsurf.in');
    });
});
