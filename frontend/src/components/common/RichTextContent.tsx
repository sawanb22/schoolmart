import DOMPurify from 'dompurify';
import { clsx } from 'clsx';
import {
  normalizeRichText,
  stripHtml,
  isHtml,
  safeHref,
  sanitizeHtmlInternal,
  type RichTextContext,
  type CmsContentValue,
} from '@/lib/richtext-normalizer';

export { DOMPurify };
export type { RichTextContext, CmsContentValue };

// Allowlist and security configuration (referenced by legacy verification suites)
export const FORBIDDEN_TAGS = [
  'style',
  'script',
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
  'img',
  'video',
  'audio',
];

export const FORBIDDEN_ATTRS = ['onload', 'onerror', 'onclick', 'onmouseover'];

export const DOMPURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'class', 'style'],
  FORBID_TAGS: FORBIDDEN_TAGS,
  FORBID_ATTR: FORBIDDEN_ATTRS,
};

export interface RichTextContentProps {
  content?: CmsContentValue;
  context?: RichTextContext;
  className?: string;
  as?: 'div' | 'p' | 'span';
  inheritColor?: boolean;
}

// Re-export utility functions so consumers have unbroken backward compatibility
export { isHtml, stripHtml, safeHref };

export function sanitizeHtml(rawHtml?: string | null, context: RichTextContext = 'body'): string {
  if (!rawHtml) return '';
  return sanitizeHtmlInternal(rawHtml, context);
}

/**
 * Universal robust rich text renderer for CampusMart CMS content.
 * Supports legacy strings, plain text with newlines, mixed in-mid-air HTML,
 * and structured { format, value } objects.
 *
 * Context-aware:
 * - 'card': Strictly inline formatting rendered inside <span> (line-clamp & flex safe).
 * - 'body': Full block formatting rendered inside <div> or semantic container with paragraph spacing.
 */
export default function RichTextContent({
  content,
  context = 'body',
  className = '',
  as,
  inheritColor = false,
}: RichTextContentProps) {
  if (content === null || content === undefined) return null;

  const rawValue = typeof content === 'object' && content !== null && 'value' in content
    ? content.value
    : typeof content === 'string'
      ? content
      : String(content || '');

  if (!rawValue || !rawValue.trim()) return null;

  // Canonical normalization: converts plain text, mixed in-mid-air tags, and HTML into safe, structured HTML
  const cleanHtml = normalizeRichText(content, context);
  if (!cleanHtml) return null;

  // Determine root HTML component
  const Component = as || (context === 'card' ? 'span' : 'div');

  // Common styling tokens
  const baseClasses = clsx(
    'rich-text-content',
    context === 'card'
      ? 'safe-rich-card inline'
      : 'safe-rich-body prose max-w-none leading-relaxed space-y-3 [&_p]:mb-3 [&_p:last-child]:mb-0',
    !inheritColor && context === 'body' && 'prose prose-slate max-w-none text-slate-700',
    // Safe tone styling tokens
    '[&_[data-tone="blue"]]:text-blue-600',
    '[&_[data-tone="emerald"]]:text-emerald-600',
    '[&_[data-tone="amber"]]:text-amber-600',
    '[&_[data-tone="crimson"]]:text-red-600',
    '[&_[data-tone="purple"]]:text-purple-600',
    '[&_[data-tone="slate"]]:text-slate-600',
    // Safe link and highlight styling
    '[&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium hover:[&_a]:text-blue-800',
    '[&_mark]:bg-amber-100 [&_mark]:text-amber-900 [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded',
    className
  );

  return (
    <Component
      className={baseClasses}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

// Named alias for backward compatibility
export { RichTextContent as SafeRichText };
