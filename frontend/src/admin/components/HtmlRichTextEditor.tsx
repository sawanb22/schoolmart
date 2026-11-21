import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Heading,
  Link2,
  List,
  Quote,
  RemoveFormatting,
  Eye,
  Code,
  Palette,
} from 'lucide-react';
import RichTextContent, { safeHref } from '@/components/common/RichTextContent';
import {
  cleanPastedHtml,
  balanceTags,
  countWordsAndChars,
} from '@/lib/richtext-normalizer';

export interface HtmlRichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  helperText?: string;
  className?: string;
  id?: string;
}

/**
 * HtmlRichTextEditor
 * Robust, production-grade rich formatting editor for CMS content fields.
 * Supports:
 * - Direct plain text with natural Enters and line breaks.
 * - In-mid-air HTML tags (<strong>, <em>, <u>, <mark>, <span data-tone>, <a>, <ul>, etc.).
 * - Intelligent paste cleaning (strips MS Word, Google Docs, and Notion clutter).
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U).
 * - Automatic tag balancing to prevent layout breakage.
 * - Live word and character counting (Unicode / Indic aware).
 * - Live formatted preview toggle.
 */
export default function HtmlRichTextEditor({
  value = '',
  onChange,
  label,
  placeholder = 'Write content here (plain text or formatted HTML)...',
  rows = 4,
  helperText,
  className = '',
  id,
}: HtmlRichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerContainerRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Dismiss color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerContainerRef.current && !colorPickerContainerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const PRESET_COLORS = [
    { label: 'SchoolMart Blue', color: '#0057a8', tone: 'blue' },
    { label: 'Emerald', color: '#059669', tone: 'emerald' },
    { label: 'Amber', color: '#d97706', tone: 'amber' },
    { label: 'Crimson', color: '#dc2626', tone: 'crimson' },
    { label: 'Purple', color: '#7c3aed', tone: 'purple' },
    { label: 'Slate', color: '#475569', tone: 'slate' },
  ];

  // Helper to wrap current selection with prefix and suffix
  const wrapSelection = (prefix: string, suffix: string, defaultPlaceholder: string = 'text') => {
    if (showPreview) {
      setShowPreview(false);
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || '';
    const selectedText = text.substring(start, end);
    const contentToWrap = selectedText || defaultPlaceholder;
    const replacement = `${prefix}${contentToWrap}${suffix}`;

    const nextValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(nextValue);

    // Preserve focus and select the wrapped content
    requestAnimationFrame(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + contentToWrap.length;
      textarea.setSelectionRange(newStart, newEnd);
    });
  };

  const handleBold = () => wrapSelection('<strong>', '</strong>', 'bold text');
  const handleItalic = () => wrapSelection('<em>', '</em>', 'italic text');
  const handleUnderline = () => wrapSelection('<u>', '</u>', 'underlined text');
  const handleHighlight = () =>
    wrapSelection(
      '<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-medium">',
      '</mark>',
      'highlighted text'
    );
  const handleColorSelect = (tone: string) => {
    wrapSelection(`<span data-tone="${tone}">`, '</span>', 'colored text');
    setShowColorPicker(false);
  };
  const handleHeading = () =>
    wrapSelection(
      '<h3 class="text-lg font-bold text-slate-900 mt-3 mb-1">',
      '</h3>',
      'Subheading'
    );

  const handleLink = () => {
    if (showPreview) {
      setShowPreview(false);
    }
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || '';
    const selectedText = text.substring(start, end);

    const url = window.prompt(
      'Enter hyperlink URL (e.g. /ai-stations, /contact-us, or https://example.com):',
      'https://'
    );
    if (!url || !url.trim()) return;

    const validatedUrl = safeHref(url);
    if (!validatedUrl) {
      alert('Please enter a valid link (starting with /, #, https://, http://, mailto:, or tel:).');
      return;
    }

    const linkText = selectedText || 'link text';
    const escapedLinkText = linkText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const replacement = `<a href="${validatedUrl}">${escapedLinkText}</a>`;
    const nextValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const newStart = start + replacement.indexOf(escapedLinkText);
      const newEnd = newStart + escapedLinkText.length;
      textarea.setSelectionRange(newStart, newEnd);
    });
  };

  const handleList = () => {
    if (showPreview) {
      setShowPreview(false);
    }
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || '';
    const selectedText = text.substring(start, end);

    let replacement: string;
    if (selectedText.trim()) {
      const lines = selectedText.split('\n').filter((l) => l.trim().length > 0);
      const items = lines.map((l) => {
        const escaped = l.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `  <li>${escaped}</li>`;
      }).join('\n');
      replacement = `<ul>\n${items}\n</ul>`;
    } else {
      replacement = `<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>`;
    }

    const nextValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    });
  };

  const handleCallout = () =>
    wrapSelection(
      '<blockquote>',
      '</blockquote>',
      'Important callout or key takeaway...'
    );

  const handleClearFormatting = () => {
    if (showPreview) {
      setShowPreview(false);
    }
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || '';

    // Strip recognized HTML tags while preserving mathematical comparisons (< 500, etc.)
    const tagStripper = (str: string) =>
      str.replace(/<\/?(strong|b|em|i|u|mark|span|p|br|ul|ol|li|h[1-6]|blockquote|a|div)\b[^>]*>/gi, '');

    if (start === end) {
      const stripped = tagStripper(text);
      onChange(stripped);
      return;
    }

    const selectedText = text.substring(start, end);
    const stripped = tagStripper(selectedText);
    const nextValue = text.substring(0, start) + stripped + text.substring(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + stripped.length);
    });
  };

  // Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleBold();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleItalic();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUnderline();
      }
    }
  };

  // Intelligent Paste Handling (strips Word / Google Docs / Notion junk)
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlData = e.clipboardData.getData('text/html');
    if (!htmlData) return; // Allow natural plain text paste

    const cleaned = cleanPastedHtml(htmlData).trim();
    // Only intercept if cleaning produced meaningful clean markup that differs from raw plain text
    if (cleaned && (cleaned.includes('<') && cleaned.includes('>'))) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = value || '';
      const nextValue = text.substring(0, start) + cleaned + text.substring(end);
      onChange(nextValue);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + cleaned.length, start + cleaned.length);
      });
    }
  };

  // Auto-balance tags on blur so unclosed tags don't break page structure
  const handleBlur = () => {
    if (value && value.includes('<')) {
      const balanced = balanceTags(value);
      if (balanced !== value) {
        onChange(balanced);
      }
    }
  };

  const { words, chars } = countWordsAndChars(value);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-bold text-gray-700 flex items-center justify-between"
        >
          <span>{label}</span>
          {helperText && (
            <span className="text-gray-400 font-normal text-[10px] uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
              {helperText}
            </span>
          )}
        </label>
      )}

      <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
        {/* Formatting Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 px-2.5 py-2 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={handleBold}
              title="Bold (Ctrl+B / <strong>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors font-bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleItalic}
              title="Italic (Ctrl+I / <em>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleUnderline}
              title="Underline (Ctrl+U / <u>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleHighlight}
              title="Highlight (<mark>)"
              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            <div ref={colorPickerContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                onMouseDown={(e) => e.preventDefault()}
                title="Text Color"
                className={`p-1.5 rounded-lg transition-colors ${
                  showColorPicker
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-700 hover:text-blue-600 hover:bg-slate-200/70'
                }`}
              >
                <Palette className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <div className="absolute left-0 top-full mt-1.5 p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 flex items-center gap-1.5">
                  {PRESET_COLORS.map(({ label, color, tone }) => (
                    <button
                      key={color}
                      type="button"
                      title={`${label} (${color})`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleColorSelect(tone)}
                      style={{ backgroundColor: color }}
                      className="w-5 h-5 rounded-full border border-white ring-1 ring-slate-300 hover:scale-110 transition-transform cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={handleHeading}
              title="Heading (<h3>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <Heading className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleLink}
              title="Hyperlink (<a>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleList}
              title="Bullet List (<ul>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCallout}
              title="Callout Box (<blockquote>)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <Quote className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={handleClearFormatting}
              title="Clear HTML formatting tags"
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <RemoveFormatting className="w-4 h-4" />
            </button>
          </div>

          {/* Live Preview Toggle Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                showPreview
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
              title={showPreview ? 'Switch to Raw Text Editor' : 'Toggle Live Formatted Preview'}
            >
              {showPreview ? (
                <>
                  <Code className="w-3.5 h-3.5" /> Edit Raw Text
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Live Preview
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor Body: Textarea OR Live Preview */}
        {showPreview ? (
          <div className="p-4 min-h-[120px] max-h-[360px] overflow-y-auto bg-slate-50/60 rounded-b-2xl border-t border-slate-100">
            {value && value.trim().length > 0 ? (
              <RichTextContent content={value} />
            ) : (
              <span className="text-gray-400 italic text-xs">Nothing to preview. Enter text above.</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id={id}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full p-3.5 text-sm font-sans focus:outline-none transition-all resize-y bg-white text-slate-800 leading-relaxed"
          />
        )}

        {/* Editor Status Bar: Word & Character Counter */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 border-t border-slate-200/80 text-[11px] text-slate-400 font-medium">
          <span className="text-slate-400">
            {showPreview ? 'Viewing live rendered output' : 'Shift+Enter for line break • Enter for new paragraph'}
          </span>
          <div className="flex items-center gap-2">
            <span>{words} {words === 1 ? 'word' : 'words'}</span>
            <span>•</span>
            <span>{chars} {chars === 1 ? 'char' : 'chars'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
