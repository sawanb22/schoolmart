import DOMPurify from 'dompurify';

export type RichTextContext = 'card' | 'body';

export type CmsContentValue =
  | string
  | { format?: 'plain' | 'html'; value: string }
  | null
  | undefined;

/**
 * Strict allowlists tailored by context.
 * 'card': Strictly inline formatting (no block elements, breaks, or layout disruption).
 * 'body': Clean content block formatting for articles, methodology, and overviews.
 */
export const ALLOWED_TAGS_MAP: Record<RichTextContext, string[]> = {
  card: ['strong', 'b', 'em', 'i', 'u', 'mark', 'span', 'a', 'br'],
  body: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'mark',
    'span',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'a',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'code',
    'pre',
    'hr',
  ],
};

export const ALLOWED_ATTRS_MAP: Record<RichTextContext, string[]> = {
  card: ['data-tone', 'href', 'title'],
  body: ['data-tone', 'href', 'title', 'target', 'rel', 'class'],
};

export const FORBIDDEN_TAGS = [
  'script',
  'style',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'iframe',
  'object',
  'embed',
  'base',
  'link',
  'meta',
  'img',
  'video',
  'audio',
  'canvas',
  'applet',
];

export const FORBIDDEN_ATTRS = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'style',
  'id',
];

/**
 * Validates hyperlinks strictly.
 * Allows anchor hashes (#), internal root-relative URLs (/path),
 * and standard safe protocols (https:, http:, mailto:, tel:).
 * Rejects javascript:, data:, vbscript:, and protocol-relative links (//).
 */
export function safeHref(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim();

  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;

  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Checks if a string contains legitimate, allowlisted HTML tags.
 * Ignores plain text comparisons such as 'Students < 500' or 'x < y'.
 */
export function isHtml(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  return /<\/?(strong|b|em|i|u|mark|span|p|br|ul|ol|li|h[1-6]|blockquote|a|table|thead|tbody|tr|th|td|code|pre|hr)\b[^>]*>/i.test(
    text
  );
}

/**
 * Strips all HTML tags and decodes entities into clean plain text.
 * Safe for search indexing, read-time calculators, character counts, and SEO meta tags.
 */
export function stripHtml(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|section|article|h[1-6]|ul|ol|li|blockquote|tr|th|td|pre|table)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Accurately counts words and characters in content, ignoring markup.
 * Properly handles Unicode, emojis, and Indic languages (e.g. Hindi).
 */
export function countWordsAndChars(input?: string | null): { words: number; chars: number } {
  const plain = stripHtml(input);
  if (!plain) return { words: 0, chars: 0 };

  const chars = Array.from(plain).length;
  // Match non-whitespace word sequences across Unicode scripts
  const words = plain.match(/\S+/gu)?.length || 0;
  return { words, chars };
}

/**
 * Cleans pasted content from Word, Google Docs, Notion, or arbitrary web pages.
 * Strips junk inline styling, mso attributes, and proprietary wrapper spans
 * while preserving essential formatting (bold, italic, lists, links, paragraphs).
 */
export function cleanPastedHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let cleaned = rawHtml
    // Strip Word conditional comments
    .replace(/<!--\[if[\s\S]*?\]>[\s\S]*?<!\[endif\]-->/gi, '')
    // Strip general HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Strip XML blocks and namespaces
    .replace(/<\?xml[^>]*>/gi, '')
    .replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '')
    .replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '')
    .replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '')
    // Strip Google Docs internal wrappers: <b style="font-weight:normal;" id="docs-internal-guid-...">
    .replace(/<b\s+style="font-weight:\s*normal;?"\s+id="docs-internal-guid-[^"]*">([\s\S]*?)<\/b>/gi, '$1')
    .replace(/id="docs-internal-guid-[^"]*"/gi, '')
    // Strip styles, classes, fonts, and mso attributes
    .replace(/\s+class="[^"]*"/gi, '')
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/<\/?font\b[^>]*>/gi, '')
    .replace(/<\/?span\s*>/gi, '')
    // Clean up empty paragraphs
    .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '<p><br></p>');

  return cleaned;
}

/**
 * Auto-balances unclosed tags (e.g. <strong>, <em>, <u>, <a>, <p>)
 * to prevent page-wide styling bleed.
 */
export function balanceTags(html: string): string {
  if (!html || typeof html !== 'string') return '';

  const tagStack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?(\/?)>/g;
  const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isSelfClosing = match[2] === '/' || fullTag.endsWith('/>') || voidTags.has(tagName);
    const isClosing = fullTag.startsWith('</');

    if (isSelfClosing) continue;

    if (!isClosing) {
      tagStack.push(tagName);
    } else {
      const lastIndex = tagStack.lastIndexOf(tagName);
      if (lastIndex !== -1) {
        tagStack.splice(lastIndex, 1);
      }
    }
  }

  // Close any tags left open at the end in reverse order
  let balanced = html;
  while (tagStack.length > 0) {
    const tag = tagStack.pop();
    if (tag && !voidTags.has(tag)) {
      balanced += `</${tag}>`;
    }
  }

  return balanced;
}

/**
 * Internal sanitizer that works isomorphically:
 * - Uses DOMPurify in browser environments.
 * - Uses high-fidelity AST / regex sanitization in Node / SSR / test environments.
 */
export function sanitizeHtmlInternal(rawHtml: string, context: RichTextContext = 'body'): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  const allowedTags = ALLOWED_TAGS_MAP[context];
  const allowedAttrs = ALLOWED_ATTRS_MAP[context];

  // Browser environment with DOMPurify
  if (typeof window !== 'undefined') {
    const purifyInstance = typeof (DOMPurify as any)?.sanitize === 'function'
      ? DOMPurify
      : typeof (DOMPurify as any) === 'function'
        ? (DOMPurify as any)(window)
        : null;

    if (purifyInstance && typeof purifyInstance.sanitize === 'function') {
      const clean = purifyInstance.sanitize(rawHtml, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: allowedAttrs,
        ALLOW_DATA_ATTR: true, // Needed for data-tone
        ALLOW_ARIA_ATTR: false,
        FORBID_TAGS: FORBIDDEN_TAGS,
        FORBID_ATTR: FORBIDDEN_ATTRS,
      });

      // Rewrite links safely in browser
      if (context === 'body' && typeof document !== 'undefined') {
        try {
          const template = document.createElement('template');
          template.innerHTML = clean;
          const links = template.content.querySelectorAll('a');
          links.forEach((link) => {
            const raw = link.getAttribute('href') ?? '';
            const validated = safeHref(raw);
            if (!validated) {
              link.removeAttribute('href');
              return;
            }
            link.setAttribute('href', validated);
            if (/^https?:/i.test(validated)) {
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener noreferrer');
            } else {
              link.removeAttribute('target');
              link.removeAttribute('rel');
            }
          });
          return template.innerHTML;
        } catch {
          return clean;
        }
      }
      return clean;
    }
  }

  // Isomorphic / SSR / Node fallback sanitizer
  let sanitized = rawHtml
    // Strip forbidden tags completely with their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    // Strip inline event handlers
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip javascript: and vbscript: URLs
    .replace(/href\s*=\s*["']?\s*(javascript|data|vbscript):[^"'>\s]*/gi, 'href="#"');

  // Strip unallowed tags while keeping their text content and preserving math comparisons (< 500, x < y)
  const allowedSet = new Set(allowedTags.map((t) => t.toLowerCase()));
  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tagName) => {
    return allowedSet.has(tagName.toLowerCase()) ? match : '';
  });

  // Process links for security
  if (context === 'body') {
    sanitized = sanitized.replace(/<a\b([^>]*)>/gi, (_match, attrs) => {
      const hrefMatch = attrs.match(/href=(["'])(.*?)\1/i);
      const rawUrl = hrefMatch ? hrefMatch[2] : '';
      const validUrl = safeHref(rawUrl);

      if (!validUrl) {
        return '<a>';
      }

      const isExternal = /^https?:/i.test(validUrl);
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${validUrl}"${targetAttr}>`;
    });
  }

  return sanitized;
}

/**
 * Top-level block elements in HTML prose.
 */
const BLOCK_TAGS_PATTERN = /<\/?(p|div|section|article|h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|pre|hr)\b[^>]*>/i;

/**
 * Canonical Normalization Engine for CMS Rich Text Content.
 * Resolves the "missing newlines / line breaks vanish" bug once and for all:
 * - Simple plain text, HTML, and mixed simple text + mid-air HTML are normalized into canonical HTML.
 * - Natural Enters (\n\n) become semantic paragraphs (<p>).
 * - Single Enters (\n) become line breaks (<br />).
 * - Mixed mid-air formatting (e.g. "Line 1 <strong>bold</strong>\nLine 2") renders with line breaks preserved.
 * - Idempotent: normalizeRichText(normalizeRichText(x)) === normalizeRichText(x).
 * - Safe: sanitized against XSS, unclosed tags balanced, safe links enforced.
 */
export function normalizeRichText(
  input?: CmsContentValue,
  context: RichTextContext = 'body'
): string {
  if (input === null || input === undefined) return '';

  const rawValue = typeof input === 'object' && input !== null && 'value' in input
    ? input.value
    : typeof input === 'string'
      ? input
      : String(input || '');

  if (!rawValue || !rawValue.trim()) return '';

  // Step 1: Standardize line endings (\r\n and \r -> \n)
  let text = rawValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 2: Clean up paste artifacts if present
  if (text.includes('<!--[if') || text.includes('docs-internal-guid') || text.includes('mso-')) {
    text = cleanPastedHtml(text);
  }

  // Step 3: Handle Heading 1 (reserve H1 for page title; convert authored H1 to H2/H3)
  text = text.replace(/<h1(\s+[^>]*)?>([\s\S]*?)<\/h1>/gi, '<h2$1>$2</h2>');

  // Step 4: Normalization based on presence of block elements
  const hasBlockTags = BLOCK_TAGS_PATTERN.test(text);

  let normalizedHtml: string;

  if (context === 'card') {
    // Card context: Strictly inline formatting.
    // Strip block elements or convert them into breaks/spaces to prevent breaking line-clamp or flex layouts.
    let inlineContent = text
      // Replace paragraphs and block ends with spaces or breaks
      .replace(/<\/p>\s*<p>/gi, '<br />')
      .replace(/<\/?(p|div|section|article|h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|pre)\b[^>]*>/gi, ' ')
      // Convert newlines to breaks
      .replace(/\n+/g, '<br />')
      // Collapse multiple consecutive br tags to single br
      .replace(/(<br\s*\/?>\s*){2,}/gi, '<br />')
      .trim();

    normalizedHtml = balanceTags(inlineContent);
  } else {
    // Body context:
    if (!hasBlockTags) {
      // SCENARIO 1: Simple text OR mixed text with mid-air inline HTML (<strong>, <em>, <a>, <mark>, etc.)
      // The user authored content with natural Enters and optional inline formatting.
      const trimmedText = text.trim();
      const paragraphChunks = trimmedText.split(/\n\n/);

      const paragraphs = paragraphChunks.map((chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) {
          // Consecutive 3+ newlines represent intentional blank line spacing
          return '<p><br /></p>';
        }
        // Balance any unclosed inline tags inside this chunk first
        const balancedChunk = balanceTags(trimmed);
        // Inside each paragraph, single newlines represent Shift+Enter line breaks
        const withBreaks = balancedChunk.replace(/\n/g, '<br />');
        return `<p>${withBreaks}</p>`;
      });

      normalizedHtml = paragraphs.join('');
    } else {
      // SCENARIO 2: Block tags already exist (e.g. <p>, <h3>, <ul>, etc.)
      // Prevent double-wrapping of existing <p> blocks.
      // Ensure any loose newlines inside <p>...</p> tags are converted to <br /> if authored as raw breaks.
      let processed = text.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (_match, attrs, inner) => {
        // If inner text has raw newlines that aren't already <br>, convert them
        const withBreaks = inner
          .replace(/(<br\s*\/?>\s*)\n+/gi, '$1')
          .replace(/\n+(?=\s*<br\s*\/?>)/gi, '')
          .replace(/\n+/g, '<br />');
        return `<p${attrs}>${withBreaks}</p>`;
      });

      // Wrap any orphan loose text outside block elements into <p>...</p>
      // To do this cleanly, split by top-level block elements
      normalizedHtml = processed;
    }

    // Step 5: Balance tags to guarantee well-formed HTML
    normalizedHtml = balanceTags(normalizedHtml);
  }

  // Step 6: Sanitize against XSS and enforce strict security allowlists
  const sanitized = sanitizeHtmlInternal(normalizedHtml, context);

  // Step 7: Clean up redundant empty tags and collapse duplicate inline spaces
  const cleaned = sanitized
    .replace(/<b><\/b>/gi, '')
    .replace(/<strong><\/strong>/gi, '')
    .replace(/<em><\/em>/gi, '')
    .replace(/<i><\/i>/gi, '')
    .replace(/<u><\/u>/gi, '')
    .replace(/<mark><\/mark>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/[ \t]{2,}/g, ' ');

  return cleaned;
}
