/**
 * CMS Dynamic Routing & Card Link Resolution Utilities
 * Single Source of Truth for card URLs, slug normalization, and external/internal routing.
 */

export interface CardLinkInfo {
    type: 'modal' | 'external' | 'internal';
    url?: string;
    slug?: string;
    badge: string;
    adminEditUrl?: string;
    previewUrl?: string;
}

export interface BackLinkInfo {
    href: string;
    label: string;
}

/**
 * Normalizes card hrefs to ensure internal subpages have a leading slash,
 * preserves protocols for external links, guards protocol-relative URLs (//),
 * strips javascript: schemes safely, and auto-corrects 'www.' links.
 */
export function normalizeCardHref(raw?: string): string {
    if (!raw) return '';
    let trimmed = raw.trim();
    if (!trimmed || trimmed === '#') {
        return trimmed;
    }

    // Strip javascript: pseudo-protocol schemes safely
    while (/^javascript:/i.test(trimmed)) {
        trimmed = trimmed.replace(/^javascript:\s*/i, '').trim();
    }
    // If empty or only void/semicolons/null/false/undefined remain after stripping, treat as modal trigger
    if (!trimmed || /^(?:void\s*(?:\(\s*[\w\d]*\s*\)|\d+)?|null|undefined|false|return\s+false|;|[\s();])*$/i.test(trimmed)) {
        return '';
    }

    // Guard protocol-relative URLs (e.g. //example.com/foo -> https://example.com/foo, ///example.com -> https://example.com)
    if (/^\/{2,}[^\/\s]+/i.test(trimmed)) {
        return `https://${trimmed.replace(/^\/+/, '')}`;
    }

    // Clean duplicate leading slashes if string consists solely of slashes
    if (/^\/+$/.test(trimmed)) {
        return '/';
    }

    // External protocols
    if (/^[a-z]+:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
        return trimmed;
    }

    // Auto-fix domain links without protocol (e.g. www.example.com)
    if (/^www\./i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    // Internal path: ensure single leading slash
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Checks if a URL is external (protocols, protocol-relative, or www.)
 */
export function isExternalLink(raw?: string): boolean {
    if (!raw) return false;
    let trimmed = raw.trim();
    // javascript: schemes are never external links
    if (/^javascript:/i.test(trimmed)) {
        return false;
    }
    // Protocol-relative URLs (e.g. //example.com or ///example.com)
    if (/^\/{2,}[^\/\s]+/i.test(trimmed)) {
        return true;
    }
    return /^[a-z]+:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed) || /^www\./i.test(trimmed);
}

/**
 * Classifies card link for admin badges and routing dispatch.
 */
export function inspectCardLink(rawLink?: string): CardLinkInfo {
    const normalized = normalizeCardHref(rawLink);

    if (!normalized || normalized === '#' || normalized === '/') {
        return {
            type: 'modal',
            badge: '⚡ Opens In-Page Enquiry Modal (No subpage needed)',
        };
    }
    if (isExternalLink(normalized)) {
        return {
            type: 'external',
            url: normalized,
            badge: '🌐 External Link',
        };
    }
    const slug = normalized.replace(/^\/+|\/+$/g, '').split(/[?#]/)[0];
    if (!slug) {
        return {
            type: 'modal',
            badge: '⚡ Opens In-Page Enquiry Modal (No subpage needed)',
        };
    }
    return {
        type: 'internal',
        slug,
        adminEditUrl: `/admin/pages/${slug}`,
        previewUrl: `/${slug}`,
        badge: `📄 Subpage: /${slug}`,
    };
}

/**
 * Resolves back breadcrumb and link destination for Article / Detail pages.
 */
export function resolveBackLink(pageData?: {
    backHref?: string;
    backLabel?: string;
    category?: string;
} | null): BackLinkInfo {
    const customHref = typeof pageData?.backHref === 'string' ? pageData.backHref.trim() : '';
    const customLabel = typeof pageData?.backLabel === 'string' ? pageData.backLabel.trim() : '';

    if (customHref) {
        return {
            href: normalizeCardHref(customHref),
            label: customLabel || 'Back',
        };
    }

    const category = typeof pageData?.category === 'string' ? pageData.category.toLowerCase() : '';

    // Collaboration Spaces vs Collaboration
    if (/\bcollaboration\s*spaces?\b/i.test(category)) {
        return { href: '/collaboration-spaces', label: 'Back to Collaboration Spaces' };
    }
    if (/\bcollaborat\w*\b/i.test(category)) {
        return { href: '/collaboration', label: 'Back to Collaborations' };
    }

    // AI & Machine Learning (matches "Artificial Intelligence", "Machine Learning", "AI", "ML")
    if (/\b(artificial\s+intelligence|machine\s+learning|ai|ml)\b/i.test(category)) {
        return { href: '/ai-ml', label: 'Back to AI & ML' };
    }

    // Classifieds / Opportunities
    if (/\b(classifieds?|opportunit\w*)\b/i.test(category)) {
        return { href: '/classifieds', label: 'Back to Opportunities' };
    }

    // Services
    if (/\bservices?\b/i.test(category)) {
        return { href: '/services', label: 'Back to Services' };
    }

    // Solutions
    if (/\bsolutions?\b/i.test(category)) {
        return { href: '/solutions', label: 'Back to Solutions' };
    }

    // Partnership Programs
    if (/\b(partnerships?|partner\w*)\b/i.test(category)) {
        return { href: '/partner-with-colleges', label: 'Back to Partnerships' };
    }

    // Job Openings & Careers
    if (/\b(jobs?|careers?)\b/i.test(category)) {
        return { href: '/job-openings', label: 'Back to Job Openings' };
    }

    // Colleges / Universities for Sale
    if (/\b(colleges?|universit\w*|for\s+sale|institutions?)\b/i.test(category)) {
        return { href: '/colleges-universities-for-sale', label: 'Back to Colleges for Sale' };
    }

    // Campus Design Execution & Planning
    if (/\b(designs?|campus\s+planning)\b/i.test(category)) {
        return { href: '/campus-design', label: 'Back to Campus Design' };
    }

    // Furniture
    if (/\bfurniture\b/i.test(category)) {
        return { href: '/furniture', label: 'Back to Furniture' };
    }

    // Sports Infra (Word boundary \b ensures words like "Passport" do not match "sport")
    if (/\bsports?\b/i.test(category)) {
        return { href: '/sports-infra', label: 'Back to Sports Infra' };
    }

    // Laboratories (Word boundary \b ensures words like "Syllabus" do not match "lab")
    if (/\b(labs?|laborator\w*)\b/i.test(category)) {
        return { href: '/labs', label: 'Back to Laboratories' };
    }

    // Libraries
    if (/\blibrar\w*\b/i.test(category)) {
        return { href: '/libraries', label: 'Back to Libraries' };
    }

    // Clean fallback based on category or default
    return {
        href: '/classifieds',
        label: pageData?.category && pageData.category !== 'Overview' && pageData.category !== 'Campus Innovation'
            ? `Back to ${pageData.category}`
            : 'Back to Opportunities',
    };
}
