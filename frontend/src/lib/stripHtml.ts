/**
 * Fast, robust utility to strip HTML tags and decode common entities.
 * Safe for search indexing, read-time calculation, and SEO meta tags.
 */
export function stripHtml(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|section|h[1-6]|ul|ol|li|blockquote)\b[^>]*>/gi, ' ')
    .replace(/<\/?(strong|b|em|i|u|mark|span|a)\b[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default stripHtml;
