import assert from 'node:assert/strict';
import {
  normalizeRichText,
  stripHtml,
  isHtml,
  safeHref,
  cleanPastedHtml,
  balanceTags,
  countWordsAndChars,
} from '../../frontend/src/lib/richtext-normalizer.ts';

console.log('================================================================');
console.log('   CAMPUSMART CMS RICH-TEXT ALL-IN-ONE ROBUST TEST SUITE        ');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// ============================================================================
// CATEGORY A: WHITESPACE AND NEWLINES
// ============================================================================
console.log('Category A: Whitespace and Newlines');

test('A1: Single Enter (\\n) converts to <br /> inside paragraph', () => {
  const input = 'First line\nSecond line';
  const out = normalizeRichText(input);
  assert.equal(out, '<p>First line<br />Second line</p>');
});

test('A2: Double Enter (\\n\\n) creates distinct paragraphs', () => {
  const input = 'First paragraph\n\nSecond paragraph';
  const out = normalizeRichText(input);
  assert.equal(out, '<p>First paragraph</p><p>Second paragraph</p>');
});

test('A3: 3+ consecutive Enters preserve intentional blank vertical spacing', () => {
  const input = 'Paragraph 1\n\n\n\nParagraph 2';
  const out = normalizeRichText(input);
  assert.equal(out, '<p>Paragraph 1</p><p><br /></p><p>Paragraph 2</p>');
});

test('A4: Windows CRLF (\\r\\n) and classic Mac (\\r) normalized identically to \\n', () => {
  const inputCrlf = 'Line 1\r\nLine 2\r\n\r\nLine 3';
  const inputCr = 'Line 1\rLine 2\r\rLine 3';
  const expected = '<p>Line 1<br />Line 2</p><p>Line 3</p>';
  assert.equal(normalizeRichText(inputCrlf), expected);
  assert.equal(normalizeRichText(inputCr), expected);
});

test('A5: Leading and trailing newlines trimmed cleanly without empty phantom tags', () => {
  const input = '\n\n\nHello CampusMart\n\n\n';
  const out = normalizeRichText(input);
  assert.equal(out, '<p>Hello CampusMart</p>');
});

test('A6: Whitespace-only or empty content returns empty string', () => {
  assert.equal(normalizeRichText(''), '');
  assert.equal(normalizeRichText('   \n\t  \n  '), '');
  assert.equal(normalizeRichText(null), '');
  assert.equal(normalizeRichText(undefined), '');
});

test('A7: Consecutive <br><br> normalized consistently without infinite multiplication', () => {
  const input = '<p>Line 1<br><br>Line 2</p>';
  const out = normalizeRichText(input);
  assert.ok(out.includes('<p>Line 1<br><br>Line 2</p>'));
});

// ============================================================================
// CATEGORY B: PLAIN TEXT VS HTML VS MIXED (IN-MID-AIR TAGS)
// ============================================================================
console.log('\nCategory B: Plain text vs HTML vs Mixed (In-Mid-Air Tags)');

test('B1: Pure plain text renders as semantic paragraph', () => {
  const input = 'Simple direct description of college campus.';
  const out = normalizeRichText(input);
  assert.equal(out, '<p>Simple direct description of college campus.</p>');
});

test('B2: Mixed simple text with in-mid-air inline tags preserves line breaks and formatting', () => {
  // THIS IS THE USER'S EXACT PRIMARY BUG SCENARIO
  const input = 'Welcome to <strong>CampusMart</strong> education portal.\nClick below to consult our advisors.\n\nExclusive partnership available.';
  const out = normalizeRichText(input);
  assert.equal(
    out,
    '<p>Welcome to <strong>CampusMart</strong> education portal.<br />Click below to consult our advisors.</p><p>Exclusive partnership available.</p>'
  );
});

test('B3: Literal mathematical characters (< and >) are preserved and not swallowed', () => {
  const input = 'Institutions with students < 500 and valuation > INR 20 Cr.';
  const out = normalizeRichText(input);
  assert.ok(out.includes('< 500'));
  assert.ok(out.includes('> INR 20 Cr.'));
});

test('B4: HTML entities (&amp;, &lt;, &copy;) preserved without double-encoding', () => {
  const input = 'Academics &amp; Research &copy; 2026 CampusMart';
  const out = normalizeRichText(input);
  assert.ok(out.includes('&amp;'));
  assert.ok(out.includes('&copy;'));
  assert.ok(!out.includes('&amp;amp;'));
});

test('B5: Structured object format { format, value } supported transparently', () => {
  const inputObj = { format: 'plain', value: 'First line\nSecond line' };
  const out = normalizeRichText(inputObj);
  assert.equal(out, '<p>First line<br />Second line</p>');
});

// ============================================================================
// CATEGORY C: FORMATTING AND STRUCTURE
// ============================================================================
console.log('\nCategory C: Formatting and Structure');

test('C1: Nested tags (bold inside italic inside underline) balance cleanly', () => {
  const input = '<u><em><strong>Multi-styled text</strong></em></u>';
  const out = normalizeRichText(input);
  assert.ok(out.includes('<u><em><strong>Multi-styled text</strong></em></u>'));
});

test('C2: Unclosed tags automatically balanced to prevent page bleed', () => {
  const input = 'Important notice: <strong>CBSE Affiliation pending';
  const balanced = balanceTags(input);
  assert.equal(balanced, 'Important notice: <strong>CBSE Affiliation pending</strong>');

  const normalized = normalizeRichText(input);
  assert.equal(normalized, '<p>Important notice: <strong>CBSE Affiliation pending</strong></p>');
});

test('C3: Empty formatting tags stripped cleanly', () => {
  const input = 'Valid text <b></b><strong></strong><em></em><u></u> end.';
  const out = normalizeRichText(input);
  assert.equal(out, '<p>Valid text end.</p>');
});

test('C4: Authored H1 downgraded to H2 to protect page-level H1 title hierarchy', () => {
  const input = '<h1>Main Title In Content</h1><p>Body copy here.</p>';
  const out = normalizeRichText(input);
  assert.ok(out.includes('<h2>Main Title In Content</h2>'));
  assert.ok(!out.includes('<h1>'));
});

test('C5: Lists and blockquotes preserved with proper semantics', () => {
  const input = '<ul>\n  <li>Campus 1</li>\n  <li>Campus 2</li>\n</ul>\n<blockquote>Key takeaway</blockquote>';
  const out = normalizeRichText(input);
  assert.ok(out.includes('<ul>'));
  assert.ok(out.includes('<li>Campus 1</li>'));
  assert.ok(out.includes('<blockquote>Key takeaway</blockquote>'));
});

// ============================================================================
// CATEGORY D: PASTE HANDLING
// ============================================================================
console.log('\nCategory D: Paste Handling (Word / Google Docs / Web)');

test('D1: Microsoft Word Mso comments, XML tags, and styles are stripped', () => {
  const wordHtml = `
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View></w:WordDocument></xml><![endif]-->
    <p class="MsoNormal" style="font-family: Calibri; font-size: 11pt; mso-fareast-language: EN-US;">
      <strong>Clean text from Word</strong> with <em>formatting</em>.
    </p>
  `;
  const cleaned = cleanPastedHtml(wordHtml);
  assert.ok(!cleaned.includes('mso'));
  assert.ok(!cleaned.includes('<![endif]-->'));
  assert.ok(!cleaned.includes('font-family'));
  assert.ok(cleaned.includes('<strong>Clean text from Word</strong>'));
});

test('D2: Google Docs internal guid wrappers and spans are stripped', () => {
  const gdocsHtml = '<b style="font-weight:normal;" id="docs-internal-guid-12345678-abcd"><span>Google Docs Content</span></b>';
  const cleaned = cleanPastedHtml(gdocsHtml);
  assert.ok(!cleaned.includes('docs-internal-guid'));
  assert.ok(!cleaned.includes('font-weight:normal'));
  assert.ok(cleaned.includes('Google Docs Content'));
});

// ============================================================================
// CATEGORY E: SECURITY (XSS AND INJECTION DEFENSE)
// ============================================================================
console.log('\nCategory E: Security (XSS and Injection Defense)');

test('E1: Dangerous script tags stripped completely', () => {
  const input = 'Safe text <script>alert("XSS")</script> more text.';
  const out = normalizeRichText(input);
  assert.ok(!out.includes('<script>'));
  assert.ok(!out.includes('alert'));
  assert.ok(out.includes('Safe text more text.'));
});

test('E2: Inline event handlers (onerror, onclick, onload) stripped completely', () => {
  const input = '<p><span onclick="alert(1)" onmouseover="stealData()">Click me</span></p>';
  const out = normalizeRichText(input);
  assert.ok(!out.includes('onclick'));
  assert.ok(!out.includes('onmouseover'));
  assert.ok(!out.includes('stealData'));
});

test('E3: javascript: and data: pseudo-protocols in links blocked', () => {
  const input = '<a href="javascript:alert(1)">Exploit</a> and <a href="data:text/html,<script>alert(1)</script>">Data URI</a>';
  const out = normalizeRichText(input);
  assert.ok(!out.includes('javascript:'));
  assert.ok(!out.includes('data:text/html'));
});

test('E4: External links automatically receive target="_blank" and rel="noopener noreferrer"', () => {
  const input = '<a href="https://example.com/partner">Visit Partner</a>';
  const out = normalizeRichText(input);
  assert.ok(out.includes('target="_blank"'));
  assert.ok(out.includes('rel="noopener noreferrer"'));
});

test('E5: Internal root-relative links and hashes stay in same tab', () => {
  const input = '<a href="/contact-us">Contact</a> and <a href="#faq">FAQ</a>';
  const out = normalizeRichText(input);
  assert.ok(out.includes('href="/contact-us"'));
  assert.ok(out.includes('href="#faq"'));
  assert.ok(!out.includes('target="_blank"'));
});

// ============================================================================
// CATEGORY F: ROUND-TRIP AND IDEMPOTENCE
// ============================================================================
console.log('\nCategory F: Round-Trip and Idempotence');

test('F1: Idempotence invariant: normalize(normalize(x)) === normalize(x)', () => {
  const rawInputs = [
    'Simple single line.',
    'First paragraph\n\nSecond paragraph with <strong>bold</strong>.',
    'Line 1\nLine 2\nLine 3',
    '<h3>Heading</h3><p>Prose with <a href="https://campusmart.in">link</a>.</p>',
    'Mixed <em>styled</em> text.\nNew line.',
  ];

  for (const raw of rawInputs) {
    const once = normalizeRichText(raw);
    const twice = normalizeRichText(once);
    assert.equal(twice, once, `Idempotence failed for input: ${raw}`);
  }
});

// ============================================================================
// CATEGORY G: RENDER PARITY ACROSS CONTEXTS (CARD VS BODY VS STRIPPED)
// ============================================================================
console.log('\nCategory G: Render Parity Across Contexts (Card vs Body vs Stripped)');

test('G1: Card context strips block elements to protect line-clamp and flex layouts', () => {
  const input = '<p>Main campus description.</p><p>Second block details.</p><h3>Key Highlights</h3>';
  const outCard = normalizeRichText(input, 'card');
  assert.ok(!outCard.includes('<p>'));
  assert.ok(!outCard.includes('</p>'));
  assert.ok(!outCard.includes('<h3>'));
  assert.ok(outCard.includes('Main campus description.'));
  assert.ok(outCard.includes('Second block details.'));
});

test('G2: stripHtml extracts clean plain text for search indices and read-time stats', () => {
  const input = '<h3>Bahraich CBSE School</h3><p>Day &amp; boarding with <strong>800+</strong> students.<br />State-of-the-art labs.</p>';
  const stripped = stripHtml(input);
  assert.equal(stripped, 'Bahraich CBSE School Day & boarding with 800+ students. State-of-the-art labs.');
});

// ============================================================================
// CATEGORY H: UNICODE, INDIC SCRIPTS, AND BOUNDARIES
// ============================================================================
console.log('\nCategory H: Unicode, Indic Scripts, and Boundaries');

test('H1: Hindi and Indic scripts render with pristine unicode preservation', () => {
  const input = 'कैम्पसमार्ट शिक्षा संस्थान एवं विश्वविद्यालय परामर्श\n\nभारत के प्रमुख शैक्षणिक संस्थान बिक्री एवं साझेदारी के लिए उपलब्ध हैं।';
  const out = normalizeRichText(input);
  assert.ok(out.includes('<p>कैम्पसमार्ट शिक्षा संस्थान एवं विश्वविद्यालय परामर्श</p>'));
  assert.ok(out.includes('<p>भारत के प्रमुख शैक्षणिक संस्थान बिक्री एवं साझेदारी के लिए उपलब्ध हैं।</p>'));
});

test('H2: Emojis and multi-byte characters preserved intact', () => {
  const input = '🎓 Top Ranked University • 🏫 40-Acre Campus • 🌟 NAAC A++ Grade';
  const out = normalizeRichText(input);
  assert.ok(out.includes('🎓 Top Ranked University • 🏫 40-Acre Campus • 🌟 NAAC A++ Grade'));
});

test('H3: Large payload (100KB+) normalizes in milliseconds without stack overflow', () => {
  const largeParagraph = 'CampusMart empowers higher educational institutions with turnkey solutions.\n'.repeat(1500);
  const startTime = Date.now();
  const out = normalizeRichText(largeParagraph);
  const elapsed = Date.now() - startTime;
  assert.ok(out.length > 50000);
  assert.ok(elapsed < 2000, `Large payload took ${elapsed}ms (expected < 2000ms)`);
});

// ============================================================================
// CATEGORY I: WORD AND CHARACTER COUNTING
// ============================================================================
console.log('\nCategory I: Word and Character Counting');

test('I1: Accurate word and character counts ignoring markup tags', () => {
  const input = '<p>Welcome to <strong>CampusMart India</strong>!</p>';
  const { words, chars } = countWordsAndChars(input);
  assert.equal(words, 4); // "Welcome", "to", "CampusMart", "India!"
  assert.equal(chars, 28); // "Welcome to CampusMart India!" has exactly 28 characters
});

test('I2: Accurate counts for Hindi content', () => {
  const input = '<p>कैम्पसमार्ट शिक्षा संस्थान</p>';
  const { words, chars } = countWordsAndChars(input);
  assert.equal(words, 3);
  assert.ok(chars > 0);
});

// ============================================================================
// CATEGORY J: LEGACY CONTENT MIGRATION & IDEMPOTENT RENDER
// ============================================================================
console.log('\nCategory J: Legacy Content Migration');

test('J1: Legacy content already containing manual <br> tags does not double-space', () => {
  const legacyInput = '<p>CBSE School with 800+ students.<br>Day and boarding facility in Bahraich.</p>';
  const out = normalizeRichText(legacyInput);
  assert.equal(out, '<p>CBSE School with 800+ students.<br>Day and boarding facility in Bahraich.</p>');
});

console.log('\n================================================================');
console.log(`✓ ALL ${passedCount} / ${totalCount} TESTS PASSED WITH 100% SUCCESS!`);
console.log('================================================================\n');
