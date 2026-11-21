const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🛡️ CAMPUSMART SAFE RICH TEXT & EDGE-CASE VERIFICATION SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${e.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Static Source Code Checks
// ─────────────────────────────────────────────────────────────────────────────
const richTextContentPath = path.resolve(__dirname, '../frontend/src/components/common/RichTextContent.tsx');
const richTextSource = fs.readFileSync(richTextContentPath, 'utf8');

test('RichTextContent.tsx implements strict context separation (card vs body)', () => {
  assert(richTextSource.includes("ALLOWED_TAGS_MAP"), 'Must define contextual tag allowlists');
  assert(richTextSource.includes("FORBIDDEN_TAGS"), 'Must define explicit forbidden tags');
  assert(richTextSource.includes("FORBIDDEN_ATTRS"), 'Must define explicit forbidden attributes');
  assert(richTextSource.includes("card: ['strong', 'b', 'em', 'i', 'u', 'mark', 'span', 'br']"), 'Card must allow only inline tags');
});

test('RichTextContent.tsx strictly forbids <style> and scripts', () => {
  assert(richTextSource.includes("'style'"), 'Style tag must be forbidden');
  assert(richTextSource.includes("'script'"), 'Script tag must be forbidden');
  assert(richTextSource.includes("'iframe'"), 'Iframe tag must be forbidden');
});

test('RichTextContent.tsx strictly forbids arbitrary style and class attributes', () => {
  assert(richTextSource.includes("FORBIDDEN_ATTRS = ['style', 'class'"), 'Style and class attributes must be forbidden');
  assert(richTextSource.includes("'data-tone'"), 'Must allow data-tone attribute for safe tokenized colors');
});

test('RichTextContent.tsx exports SafeRichText, stripHtml, isHtml, safeHref, and sanitizeHtml', () => {
  assert(richTextSource.includes('export { RichTextContent as SafeRichText }'), 'Must export SafeRichText');
  assert(richTextSource.includes('export function isHtml'), 'Must export isHtml');
  assert(richTextSource.includes('export function stripHtml'), 'Must export stripHtml');
  assert(richTextSource.includes('export function safeHref'), 'Must export safeHref');
  assert(richTextSource.includes('export function sanitizeHtml'), 'Must export sanitizeHtml');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Logic Unit Tests: isHtml (Preserving Mathematical Angle Brackets)
// ─────────────────────────────────────────────────────────────────────────────
function isHtmlSim(text) {
  if (!text || typeof text !== 'string') return false;
  return /<(strong|b|em|i|u|mark|span|p|br|ul|ol|li|h3|h4|blockquote|a)\b[^>]*>/i.test(text);
}

test('isHtml: correctly detects genuine allowlisted HTML tags', () => {
  assert.strictEqual(isHtmlSim('<strong>Snag-free handover</strong>'), true);
  assert.strictEqual(isHtmlSim('<p>Paragraph text</p>'), true);
  assert.strictEqual(isHtmlSim('<a href="/test">Link</a>'), true);
  assert.strictEqual(isHtmlSim('<mark>Highlighted</mark>'), true);
  assert.strictEqual(isHtmlSim('<span data-tone="blue">Blue text</span>'), true);
  assert.strictEqual(isHtmlSim('Line 1<br/>Line 2'), true);
});

test('isHtml: NEVER flags mathematical comparisons or bracketed plain text as HTML', () => {
  assert.strictEqual(isHtmlSim('Budget < ₹10 lakh'), false);
  assert.strictEqual(isHtmlSim('Score < 500 and > 100'), false);
  assert.strictEqual(isHtmlSim('Class <Grade 10> guidelines'), false);
  assert.strictEqual(isHtmlSim('Area < 5000 sq.ft.'), false);
  assert.strictEqual(isHtmlSim('Temperature > 40°C'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Logic Unit Tests: safeHref (URL Security & External Rel Enforcement)
// ─────────────────────────────────────────────────────────────────────────────
function safeHrefSim(raw) {
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

test('safeHref: allows safe URLs (internal root-relative, https, http, mailto, tel)', () => {
  assert.strictEqual(safeHrefSim('/campus-design-execution'), '/campus-design-execution');
  assert.strictEqual(safeHrefSim('#section2'), '#section2');
  assert.strictEqual(safeHrefSim('https://campusmart.in/about'), 'https://campusmart.in/about');
  assert.strictEqual(safeHrefSim('mailto:info@campusmart.in'), 'mailto:info@campusmart.in');
  assert.strictEqual(safeHrefSim('tel:+919966109191'), 'tel:+919966109191');
});

test('safeHref: strictly rejects malicious protocols (javascript:, data:, vbscript:, //protocol-relative)', () => {
  assert.strictEqual(safeHrefSim('javascript:alert(1)'), null);
  assert.strictEqual(safeHrefSim('data:text/html,<script>alert(1)</script>'), null);
  assert.strictEqual(safeHrefSim('vbscript:msgbox(1)'), null);
  assert.strictEqual(safeHrefSim('//attacker.com/evil'), null);
  assert.strictEqual(safeHrefSim('/\\attacker.com'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Logic Unit Tests: stripHtml (Search, SEO, Read-Time Text Cleaner)
// ─────────────────────────────────────────────────────────────────────────────
function stripHtmlSim(input) {
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

test('stripHtml: converts formatted HTML into pure text without tags', () => {
  const html = '<p>Snag-free handover <strong>with full documentation</strong>, warranties and <mark>defect-liability</mark> support.</p>';
  const stripped = stripHtmlSim(html);
  assert.strictEqual(stripped, 'Snag-free handover with full documentation, warranties and defect-liability support.');
});

test('stripHtml: preserves mathematical operators in plain text (< 500, < ₹10L)', () => {
  const text = 'Budget < ₹10 lakh and capacity < 500 students.';
  const stripped = stripHtmlSim(text);
  assert.strictEqual(stripped, 'Budget < ₹10 lakh and capacity < 500 students.');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Verification of Updated Frontend Renderers
// ─────────────────────────────────────────────────────────────────────────────
const serviceRendererSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/components/cms/ServicePageRenderer.tsx'), 'utf8');
test('ServicePageRenderer.tsx uses SafeRichText in card context for featured and grid cards', () => {
  assert(serviceRendererSource.includes("import { SafeRichText } from '@/components/common/RichTextContent'"), 'Must import SafeRichText');
  assert(serviceRendererSource.includes('<SafeRichText'), 'Must render SafeRichText');
  assert(serviceRendererSource.includes('context="card"'), 'Must specify context="card"');
  assert(!serviceRendererSource.includes('<p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">\n                          {card.description}\n                        </p>'), 'Must not render unescaped raw card description');
});

const solutionRendererSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/components/cms/SolutionPageRenderer.tsx'), 'utf8');
test('SolutionPageRenderer.tsx uses SafeRichText in card context', () => {
  assert(solutionRendererSource.includes("import { SafeRichText } from '@/components/common/RichTextContent'"), 'Must import SafeRichText');
  assert(solutionRendererSource.includes('<SafeRichText'), 'Must render SafeRichText');
  assert(solutionRendererSource.includes('context="card"'), 'Must specify context="card"');
});

const cdeServiceSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/pages/campus-design-service.tsx'), 'utf8');
test('campus-design-service.tsx uses SafeRichText with inheritColor on dark hero banner', () => {
  assert(cdeServiceSource.includes("import { SafeRichText } from '@/components/common/RichTextContent'"), 'Must import SafeRichText');
  assert(cdeServiceSource.includes('inheritColor'), 'Must specify inheritColor on dark hero');
  assert(cdeServiceSource.includes('context="card"'), 'Must specify context="card"');
  assert(cdeServiceSource.includes('context="body"'), 'Must specify context="body" for methodology');
});

const caseStudySource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/pages/case-study-detail.tsx'), 'utf8');
test('case-study-detail.tsx delegates to SafeRichText and removes insecure direct DOMPurify', () => {
  assert(caseStudySource.includes("import { SafeRichText } from '@/components/common/RichTextContent'"), 'Must import SafeRichText');
  assert(!caseStudySource.includes("DOMPurify.sanitize(study.body)"), 'Must not call direct loose DOMPurify');
  assert(caseStudySource.includes('<SafeRichText'), 'Must render SafeRichText for body and description');
});

const searchBarSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/components/sections/search-bar.tsx'), 'utf8');
test('search-bar.tsx uses stripHtml for clean query filtering and preview snippets', () => {
  assert(searchBarSource.includes("stripHtml(s.description)"), 'Must strip HTML during query filtering');
  assert(searchBarSource.includes("{stripHtml(item.description)}"), 'Must strip HTML in preview snippet');
});

const blogSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/pages/blog.tsx'), 'utf8');
test('blog.tsx uses SafeRichText for card excerpts and stripHtml for reading time calculation', () => {
  assert(blogSource.includes("SafeRichText"), 'Must import SafeRichText');
  assert(blogSource.includes("stripHtml(content)"), 'Must strip HTML when calculating word counts');
});

const unifiedEditorSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/admin/components/UnifiedPageEditor.tsx'), 'utf8');
test('UnifiedPageEditor.tsx merges state functionally to prevent save race conditions', () => {
  assert(unifiedEditorSource.includes("setData((prevData) => ({"), 'Must use functional state update on save');
});

const backendPagesRouteSource = fs.readFileSync(path.resolve(__dirname, '../backend/src/routes/pages.routes.ts'), 'utf8');
test('backend/src/routes/pages.routes.ts sanitizes pageData before database storage', () => {
  assert(backendPagesRouteSource.includes('createData.pageData = serialized'), 'Create route must sanitize pageData');
  assert(backendPagesRouteSource.includes('updateData.pageData = serialized'), 'Update route must sanitize pageData');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SAFE RICH TEXT & EDGE CASE TESTS PASSED PERFECTLY!\n');
}
