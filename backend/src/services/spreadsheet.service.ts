interface SpreadsheetRow {
    type: 'Contact Enquiry' | 'Quote Request';
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    institution?: string | null;
    subject?: string | null;
    role?: string | null;
    resumeOriginalName?: string | null;
    items?: string | null;
    message: string;
    createdAt: Date;
}

/**
 * Neutralize formula injection triggers (=, +, -, @, \t, \r)
 * by prepending a single quote (') so spreadsheets treat the cell strictly as plain text.
 */
export function sanitizeForSpreadsheet<T extends string | null | undefined>(val: T): T {
    if (!val || typeof val !== 'string') return val;
    const trimmed = val.trim();
    if (/^[=+@\-\t\r]/.test(trimmed)) {
        return `'${trimmed}` as T;
    }
    return val;
}

/**
 * Mirrors successfully saved enquiries to Google Sheets when configured.
 * Database persistence remains the source of truth if the webhook is absent
 * or temporarily unavailable.
 */
export async function syncToSpreadsheet(row: SpreadsheetRow): Promise<void> {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        const sanitizedRow = {
            ...row,
            name: sanitizeForSpreadsheet(row.name) || '',
            email: sanitizeForSpreadsheet(row.email) || '',
            phone: sanitizeForSpreadsheet(row.phone),
            institution: sanitizeForSpreadsheet(row.institution),
            subject: sanitizeForSpreadsheet(row.subject),
            role: sanitizeForSpreadsheet(row.role),
            resumeOriginalName: sanitizeForSpreadsheet(row.resumeOriginalName),
            items: sanitizeForSpreadsheet(row.items),
            message: sanitizeForSpreadsheet(row.message) || '',
            secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
            createdAt: row.createdAt.toISOString(),
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitizedRow),
        });

        const result = await response.json() as { ok?: boolean; error?: string };
        if (!response.ok || result.ok !== true) {
            console.error('Google Sheets sync failed:', result.error || `HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Google Sheets sync failed:', error);
    }
}
