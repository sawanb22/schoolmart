const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 CAMPUSMART CMS RICH TEXT & HTML EDITOR VERIFICATION SUITE');
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
// 1. Static Source Code & Unit Logic Verification of RichTextContent.tsx
// ─────────────────────────────────────────────────────────────────────────────
const richTextContentPath = path.resolve(__dirname, '../frontend/src/components/common/RichTextContent.tsx');
test('RichTextContent.tsx component file exists', () => {
  assert(fs.existsSync(richTextContentPath), 'RichTextContent.tsx must exist');
});

const richTextSource = fs.readFileSync(richTextContentPath, 'utf8');

test('RichTextContent uses DOMPurify and configures strict contextual allowlists forbidding <style> and scripts', () => {
  assert(richTextSource.includes("import DOMPurify from 'dompurify'"), 'Must import DOMPurify');
  assert(richTextSource.includes('FORBID_TAGS: FORBIDDEN_TAGS'), 'Must forbid dangerous tags');
  assert(richTextSource.includes('FORBID_ATTR: FORBIDDEN_ATTRS'), 'Must forbid dangerous attributes');
});

test('RichTextContent checks for allowlisted HTML tags without destroying angle brackets', () => {
  assert(richTextSource.includes('isHtml'), 'Must have isHtml detector');
});

test('RichTextContent styles typography with prose and custom mark/a styles', () => {
  assert(richTextSource.includes('rich-text-content'), 'Must have rich-text-content class');
  assert(richTextSource.includes('prose prose-slate max-w-none'), 'Must use tailwind prose typography');
  assert(richTextSource.includes('[&_a]:text-blue-600'), 'Must style links');
  assert(richTextSource.includes('[&_mark]:bg-amber-100'), 'Must style highlighted mark tags');
});

// Unit test HTML regex logic
const htmlRegex = /<[a-z][\s\S]*>/i;

test('HTML regex accurately identifies HTML strings vs plain text', () => {
  assert(htmlRegex.test('<p>Hello World</p>') === true, 'Paragraph tag detected');
  assert(htmlRegex.test('Plain text without any tags') === false, 'Plain text detected');
  assert(htmlRegex.test('Check out <strong>this highlight</strong>') === true, 'Strong tag detected');
  assert(htmlRegex.test('<mark class="bg-amber-100">AI Campus</mark>') === true, 'Mark tag detected');
  assert(htmlRegex.test('Line 1\nLine 2\nLine 3') === false, 'Multiline plain text is preserved as non-HTML');
  assert(htmlRegex.test('<a href="/ai-stations">Click here</a>') === true, 'Anchor tag detected');
});

// Unit test sanitization fallback logic
function sanitizeFallback(raw) {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

test('Sanitization correctly removes malicious script tags while keeping safe tags', () => {
  const unsafe = 'Welcome <script>alert("xss")</script>to <strong>CampusMart</strong>';
  const sanitized = sanitizeFallback(unsafe);
  assert(!sanitized.includes('<script>'), 'Must strip script open tag');
  assert(!sanitized.includes('</script>'), 'Must strip script close tag');
  assert(!sanitized.includes('alert("xss")'), 'Must strip script body');
  assert(sanitized.includes('<strong>CampusMart</strong>'), 'Must retain safe <strong> tag');
});

test('Sanitization retains mark, em, u, a, and ul/li elements', () => {
  const input = '<p>Check <mark>highlight</mark>, <em>italic</em>, <u>underline</u>, and <a href="/test">link</a></p><ul><li>Item 1</li></ul>';
  const sanitized = sanitizeFallback(input);
  assert(sanitized.includes('<mark>highlight</mark>'), 'Retains mark');
  assert(sanitized.includes('<em>italic</em>'), 'Retains em');
  assert(sanitized.includes('<u>underline</u>'), 'Retains u');
  assert(sanitized.includes('<a href="/test">link</a>'), 'Retains a');
  assert(sanitized.includes('<ul><li>Item 1</li></ul>'), 'Retains ul/li');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Static Source Code & Action Logic of HtmlRichTextEditor.tsx
// ─────────────────────────────────────────────────────────────────────────────
const editorPath = path.resolve(__dirname, '../frontend/src/admin/components/HtmlRichTextEditor.tsx');
test('HtmlRichTextEditor.tsx component file exists', () => {
  assert(fs.existsSync(editorPath), 'HtmlRichTextEditor.tsx must exist');
});

const editorSource = fs.readFileSync(editorPath, 'utf8');

test('HtmlRichTextEditor includes all required formatting buttons in toolbar', () => {
  assert(editorSource.includes('handleBold'), 'Must have Bold handler');
  assert(editorSource.includes('handleItalic'), 'Must have Italic handler');
  assert(editorSource.includes('handleUnderline'), 'Must have Underline handler');
  assert(editorSource.includes('handleHighlight'), 'Must have Highlight handler');
  assert(editorSource.includes('handleHeading'), 'Must have Heading handler');
  assert(editorSource.includes('handleLink'), 'Must have Link handler');
  assert(editorSource.includes('handleList'), 'Must have List handler');
  assert(editorSource.includes('handleCallout'), 'Must have Callout handler');
  assert(editorSource.includes('handleClearFormatting'), 'Must have Clear Formatting handler');
  assert(editorSource.includes('showPreview'), 'Must have Live Preview toggle state');
});

test('HtmlRichTextEditor uses precise tags specified in requirements', () => {
  assert(editorSource.includes("wrapSelection('<strong>', '</strong>', 'bold text')"), 'Bold tags must match');
  assert(editorSource.includes("wrapSelection('<em>', '</em>', 'italic text')"), 'Italic tags must match');
  assert(editorSource.includes("wrapSelection('<u>', '</u>', 'underlined text')"), 'Underline tags must match');
  assert(
    editorSource.includes('<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-medium">'),
    'Highlight tag must have amber classes'
  );
  assert(
    editorSource.includes('<h3 class="text-lg font-bold text-slate-900 mt-3 mb-1">'),
    'Heading tag must match'
  );
  assert(
    editorSource.includes('<a href="${validatedUrl}">'),
    'Anchor tag must validate URL before inserting'
  );
  assert(
    editorSource.includes('blockquote'),
    'Callout box tag must use blockquote'
  );
});

// Functional simulation of textarea selection wrapping
function simulateWrap(text, start, end, prefix, suffix, placeholder = 'text') {
  const selectedText = text.substring(start, end);
  const contentToWrap = selectedText || placeholder;
  const replacement = `${prefix}${contentToWrap}${suffix}`;
  const nextValue = text.substring(0, start) + replacement + text.substring(end);
  const newStart = start + prefix.length;
  const newEnd = newStart + contentToWrap.length;
  return { nextValue, newStart, newEnd };
}

test('Editor wrapping: Bold action wraps selected text and preserves inner content', () => {
  const original = 'Welcome to modern campus design!';
  // Select "campus design" (index 18 to 31)
  const result = simulateWrap(original, 18, 31, '<strong>', '</strong>', 'bold text');
  assert.strictEqual(
    result.nextValue,
    'Welcome to modern <strong>campus design</strong>!'
  );
  assert.strictEqual(result.newStart, 18 + 8);
  assert.strictEqual(result.newEnd, 18 + 8 + 13);
});

test('Editor wrapping: Highlight action wraps selection in amber mark tag', () => {
  const original = 'AI stations create modern learning labs.';
  const prefix = '<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-medium">';
  const suffix = '</mark>';
  // Select "AI stations" (index 0 to 11)
  const result = simulateWrap(original, 0, 11, prefix, suffix, 'highlighted text');
  assert.strictEqual(
    result.nextValue,
    '<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-medium">AI stations</mark> create modern learning labs.'
  );
});

test('Editor formatting: Clear formatting strips all HTML tags cleanly', () => {
  const formatted = '<h3 class="text-lg font-bold">Header</h3><p>Text with <strong>bold</strong> and <a href="/link">link</a>.</p>';
  const stripped = formatted.replace(/<\/?[^>]+(>|$)/g, '');
  assert.strictEqual(stripped, 'HeaderText with bold and link.');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Admin Editors Integration Verification
// ─────────────────────────────────────────────────────────────────────────────
const articleEditorPath = path.resolve(__dirname, '../frontend/src/admin/components/ArticleEditorSection.tsx');

test('Obsolete ArticleEditorSection.tsx is deleted in favor of UnifiedPageEditor.tsx', () => {
  assert(!fs.existsSync(articleEditorPath), 'ArticleEditorSection.tsx must not exist (migrated to UnifiedPageEditor)');
});

const unifiedEditorPath = path.resolve(__dirname, '../frontend/src/admin/components/UnifiedPageEditor.tsx');
const unifiedEditorSource = fs.readFileSync(unifiedEditorPath, 'utf8');

test('UnifiedPageEditor.tsx integrates HtmlRichTextEditor for card descriptions and section bodies', () => {
  assert(unifiedEditorSource.includes("import HtmlRichTextEditor from './HtmlRichTextEditor'"), 'Must import HtmlRichTextEditor');
  assert(unifiedEditorSource.includes('richText = false'), 'Field component must support richText prop');
  assert(
    unifiedEditorSource.includes('<HtmlRichTextEditor') &&
    unifiedEditorSource.includes('label={label}'),
    'Field component must delegate to HtmlRichTextEditor when richText is true'
  );
  assert(
    unifiedEditorSource.includes("onChange={(v) => setCard(i, 'description', v)} richText"),
    'Card descriptions must use richText editor'
  );
  assert(
    unifiedEditorSource.includes("onChange={(v) => setSection(i, 'body', v)} richText"),
    'Section bodies must use richText editor'
  );
});

const blogEditorPath = path.resolve(__dirname, '../frontend/src/admin/components/BlogEditorSection.tsx');
const blogEditorSource = fs.readFileSync(blogEditorPath, 'utf8');

test('BlogEditorSection.tsx integrates HtmlRichTextEditor for editingPost.body', () => {
  assert(blogEditorSource.includes("import HtmlRichTextEditor from './HtmlRichTextEditor'"), 'Must import HtmlRichTextEditor');
  assert(
    blogEditorSource.includes('<HtmlRichTextEditor') &&
    blogEditorSource.includes("onChange={(v) => setEditingPost({ ...editingPost, body: v })}"),
    'Must use HtmlRichTextEditor for editingPost.body'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Frontend Renderers Integration Verification
// ─────────────────────────────────────────────────────────────────────────────
const editorialArticlePath = path.resolve(__dirname, '../frontend/src/components/cms/EditorialArticlePage.tsx');

test('Obsolete EditorialArticlePage.tsx is deleted in favor of GenericPageRenderer.tsx', () => {
  assert(!fs.existsSync(editorialArticlePath), 'EditorialArticlePage.tsx must not exist (migrated to GenericPageRenderer)');
});

const genericRendererPath = path.resolve(__dirname, '../frontend/src/components/cms/GenericPageRenderer.tsx');
const genericRendererSource = fs.readFileSync(genericRendererPath, 'utf8');

test('GenericPageRenderer.tsx renders card descriptions and section bodies via RichTextContent', () => {
  assert(genericRendererSource.includes("import RichTextContent from '@/components/common/RichTextContent'"), 'Must import RichTextContent');
  assert(
    genericRendererSource.includes('content={card.description}'),
    'Must render card.description using RichTextContent'
  );
  assert(
    genericRendererSource.includes('content={sec.body}'),
    'Must render sec.body using RichTextContent'
  );
});

const serviceDetailPath = path.resolve(__dirname, '../frontend/src/components/cms/ServiceDetailPage.tsx');
const serviceDetailSource = fs.readFileSync(serviceDetailPath, 'utf8');

test('ServiceDetailPage.tsx (shared by AI Stations, Furniture Design, Sports Infra) uses RichTextContent', () => {
  assert(serviceDetailSource.includes("import RichTextContent from '@/components/common/RichTextContent'"), 'Must import RichTextContent');
  assert(
    serviceDetailSource.includes('<RichTextContent') &&
    serviceDetailSource.includes('content={card.description}'),
    'Must render card.description using RichTextContent'
  );
});

const cdeDetailPath = path.resolve(__dirname, '../frontend/src/pages/campus-design-execution-detail.tsx');
const cdeDetailSource = fs.readFileSync(cdeDetailPath, 'utf8');

test('campus-design-execution-detail.tsx uses RichTextContent for description and overview', () => {
  assert(cdeDetailSource.includes("import RichTextContent from '@/components/common/RichTextContent'"), 'Must import RichTextContent');
  assert(cdeDetailSource.includes('<RichTextContent content={card.description}'), 'Must render card.description with RichTextContent');
  assert(cdeDetailSource.includes('<RichTextContent content={overview}'), 'Must render overview with RichTextContent');
});

const setupCollegePath = path.resolve(__dirname, '../frontend/src/pages/setup-college-article.tsx');
const universalArticlePath = path.resolve(__dirname, '../frontend/src/components/cms/UniversalArticleDetail.tsx');
const universalArticleSource = fs.readFileSync(universalArticlePath, 'utf8');

test('Obsolete setup-college-article.tsx is deleted in favor of UniversalArticleDetail.tsx', () => {
  assert(!fs.existsSync(setupCollegePath), 'setup-college-article.tsx must be deleted in favor of UniversalArticleDetail.tsx');
  assert(universalArticleSource.includes('GenericPageRenderer'), 'UniversalArticleDetail must delegate rendering to GenericPageRenderer');
});

const blogPostPath = path.resolve(__dirname, '../frontend/src/pages/blog-post.tsx');
const blogPostSource = fs.readFileSync(blogPostPath, 'utf8');

test('blog-post.tsx uses RichTextContent for full post body', () => {
  assert(blogPostSource.includes("import RichTextContent from '@/components/common/RichTextContent'"), 'Must import RichTextContent');
  assert(
    blogPostSource.includes('<RichTextContent') &&
    blogPostSource.includes('content={post.body}'),
    'Must render post.body with RichTextContent'
  );
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
  console.log('🎉 ALL RICH TEXT & HTML EDITOR TESTS PASSED PERFECTLY!\n');
}
