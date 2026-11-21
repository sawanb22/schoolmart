import sanitizeHtml from 'sanitize-html';
import { HTML_KEYS } from '../services/page-content/constants';

export const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'strike',
  'code', 'hr', 'br', 'div', 'table', 'thead', 'tbody',
  'tr', 'th', 'td', 'pre', 'blockquote', 'span', 'img', 'a',
];

export const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'name', 'target', 'class'],
  img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
  '*': ['class'],
};

export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto', 'tel'],
    img: ['http', 'https'],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

/**
 * Sanitizes rich text HTML according to the CMS security contract.
 * Strips script tags, onerror/event handlers, javascript: schemes, and disallowed elements.
 */
export function sanitizeRichHtml(html: unknown): string {
  if (html === null || html === undefined) {
    return '';
  }
  const str = typeof html === 'string' ? html : String(html);
  if (!str.trim()) {
    return '';
  }
  return sanitizeHtml(str, SANITIZE_OPTIONS);
}

/**
 * Recursively traverses objects/arrays and sanitizes any value whose key is in HTML_KEYS.
 */
export function sanitizeHtmlKeysDeep(val: unknown): unknown {
  if (val === null || val === undefined) {
    return val;
  }
  if (typeof val === 'string') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeHtmlKeysDeep);
  }
  if (typeof val === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if ((HTML_KEYS as readonly string[]).includes(k as any) && typeof v === 'string') {
        copy[k] = sanitizeRichHtml(v);
      } else {
        copy[k] = sanitizeHtmlKeysDeep(v);
      }
    }
    return copy;
  }
  return val;
}

/**
 * Sanitizes an item payload (or card payload) by sanitizing HTML_KEYS anywhere
 * within its data and detail objects, as well as any direct HTML_KEYS properties.
 */
export function sanitizeItemPayload<T extends Record<string, any>>(item: T): T {
  if (!item || typeof item !== 'object') {
    return item;
  }
  const result: Record<string, any> = { ...item };

  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    result.data = sanitizeHtmlKeysDeep(result.data);
  }

  if (result.detail && typeof result.detail === 'object' && !Array.isArray(result.detail)) {
    result.detail = sanitizeHtmlKeysDeep(result.detail);
  }

  for (const key of HTML_KEYS) {
    if (key in result && typeof result[key] === 'string') {
      result[key] = sanitizeRichHtml(result[key]);
    }
  }

  return result as T;
}

/**
 * Recursively sanitizes pageData settings and collections.
 */
export function sanitizePageData(pageData: Record<string, unknown>): Record<string, unknown> {
  if (!pageData || typeof pageData !== 'object' || Array.isArray(pageData)) {
    return pageData;
  }
  return sanitizeHtmlKeysDeep(pageData) as Record<string, unknown>;
}
