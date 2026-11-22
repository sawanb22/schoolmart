/**
 * Shared pageData JSON parser.
 * Safely parses objects, JSON strings, double-encoded strings, null, and undefined
 * into a plain JavaScript Record<string, unknown>.
 */
export function parsePageData(v: unknown): Record<string, unknown> {
    if (v === null || v === undefined) {
        return {};
    }

    if (typeof v === 'object') {
        if (Array.isArray(v)) {
            return {};
        }
        return v as Record<string, unknown>;
    }

    if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed === '') {
            return {};
        }

        try {
            let parsed = JSON.parse(trimmed);

            // Handle double-encoded JSON string
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed.trim());
                } catch {
                    return {};
                }
            }

            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }

            return {};
        } catch {
            return {};
        }
    }

    return {};
}
