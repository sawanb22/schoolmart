export function resolveMediaUrl(value?: string | null): string {
    if (!value) return '';
    
    // Normalize localhost:5000 or railway uploads to authoritative sportsurf CDN
    if (value.includes('/uploads/')) {
        const uploadIdx = value.indexOf('/uploads/');
        const subPath = value.substring(uploadIdx);
        return `https://sportsurf.in/new${subPath}`;
    }

    if (/^(https?:|data:|blob:)/i.test(value)) return value;

    const cleanPath = value.startsWith('/') ? value : `/${value}`;

    const base = import.meta.env.VITE_API_URL || '/api';
    const origin = base.startsWith('http')
        ? new URL(base).origin
        : (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

    if (!origin) return cleanPath;
    return new URL(cleanPath, `${origin}/`).toString();
}
