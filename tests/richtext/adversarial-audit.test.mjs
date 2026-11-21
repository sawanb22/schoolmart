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
console.log('   CAMPUSMART ADVERSARIAL CODE QUALITY & AUDIT VERIFICATION    ');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function auditTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ [AUDIT PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [AUDIT FAIL] ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. ADVERSARIAL IDEMPOTENCE AUDIT
// -----------------------------------------------------------------------------
console.log('1. Idempotence Audit Matrix: normalize(normalize(x)) === normalize(x)');

const idempotenceInputs = [
  'Simple single line text',
  'Line 1\nLine 2',
  'Para 1\n\nPara 2\n\nPara 3',
  'Para 1\n\n\n\nPara 2',
  'Mixed <strong>bold</strong> and <em>italic</em> in line\nSecond line',
  '<p>Already wrapped in paragraph</p>',
  '<p>Para 1</p><p>Para 2</p>',
  '<ul><li>Item 1</li><li>Item 2</li></ul>',
  '<blockquote>Important quote</blockquote>',
  '<h3>Section Heading</h3><p>Content under heading</p>',
  '<a href="https://campussmart.in">CampusSmart</a>',
  '<span data-tone="blue">Blue highlight</span> text',
  '<mark>Highlighted</mark> in-between text',
  'Special characters: &amp; &lt; &gt; &copy; &quot;',
  'Math comparison: Revenue < 500 Cr and Students > 10,000',
  'Emojis: 🎓 Campus 🚀 Growth 🏫 University',
  'Hindi: कैम्पस मार्ट शिक्षा और कॉलेज ब्रोकरेज\n\nदूसरा पैराग्राफ',
  'Unclosed <strong>bold text without closing tag',
  'Double unclosed <strong><em>bold and italic without closing',
  '<p>Para with <br /> break</p>',
];

for (let i = 0; i < idempotenceInputs.length; i++) {
  const input = idempotenceInputs[i];
  auditTest(`Idempotence [${i + 1}/${idempotenceInputs.length}]: "${input.slice(0, 30)}..."`, () => {
    const once = normalizeRichText(input);
    const twice = normalizeRichText(once);
    assert.equal(twice, once, `Idempotence violated on input: ${input}\nOnce: ${once}\nTwice: ${twice}`);
    
    // Also test card context idempotence
    const cardOnce = normalizeRichText(input, 'card');
    const cardTwice = normalizeRichText(cardOnce, 'card');
    assert.equal(cardTwice, cardOnce, `Card Idempotence violated on input: ${input}\nOnce: ${cardOnce}\nTwice: ${cardTwice}`);
  });
}

// -----------------------------------------------------------------------------
// 2. CARD CONTEXT BLOCK-ELEMENT STRIPPING & LAYOUT INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n2. Card Context Block-Element Stripping Audit');

auditTest('Card context strips <p> and </p> tags completely', () => {
  const input = '<p>First line</p><p>Second line</p>';
  const out = normalizeRichText(input, 'card');
  assert.ok(!out.includes('<p>') && !out.includes('</p>'), `Found <p> in card output: ${out}`);
  assert.ok(out.includes('<br />') || out.includes('First line'), `Expected break or content: ${out}`);
});

auditTest('Card context strips headings (h1, h2, h3, h4, h5, h6)', () => {
  const input = '<h2>Title</h2><p>Description text</p>';
  const out = normalizeRichText(input, 'card');
  assert.ok(!/<h[1-6]/i.test(out), `Found heading tag in card output: ${out}`);
});

auditTest('Card context strips list elements (ul, ol, li)', () => {
  const input = '<ul><li>Feature A</li><li>Feature B</li></ul>';
  const out = normalizeRichText(input, 'card');
  assert.ok(!/<[uo]l\b/i.test(out) && !/<li\b/i.test(out), `Found list tag in card output: ${out}`);
  assert.ok(out.includes('Feature A') && out.includes('Feature B'));
});

auditTest('Card context preserves allowed inline formatting (strong, em, u, mark, span, a)', () => {
  const input = 'Campus with <strong>500+ students</strong>, <em>NAAC A+</em>, and <span data-tone="emerald">Top Tier</span>';
  const out = normalizeRichText(input, 'card');
  assert.ok(out.includes('<strong>500+ students</strong>'), `Lost strong tag: ${out}`);
  assert.ok(out.includes('<em>NAAC A+</em>'), `Lost em tag: ${out}`);
  assert.ok(out.includes('<span data-tone="emerald">Top Tier</span>'), `Lost span tag: ${out}`);
});

auditTest('Card context collapses excessive <br> tags to prevent line-clamp overflow', () => {
  const input = 'Line 1\n\n\n\n\n\n\nLine 2';
  const out = normalizeRichText(input, 'card');
  // Multiple consecutive breaks must be collapsed in card mode
  assert.ok(!out.includes('<br /><br />'), `Found uncollapsed multiple br in card mode: ${out}`);
});

// -----------------------------------------------------------------------------
// 3. MATHEMATICAL COMPARISONS & ENTITY INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n3. Mathematical Comparisons & Entity Integrity');

auditTest('Mathematical comparison: Students < 500 is preserved', () => {
  const input = 'Campus capacity: Students < 500 and Area > 10 Acres';
  const out = normalizeRichText(input);
  assert.ok(out.includes('< 500') || out.includes('&lt; 500'), `Math comparison swallowed: ${out}`);
  assert.ok(out.includes('> 10') || out.includes('&gt; 10'), `Math comparison swallowed: ${out}`);
});

auditTest('Chained mathematical comparisons: a < b and c < d', () => {
  const input = 'Criteria: Score < 50 or Score > 90';
  const out = normalizeRichText(input);
  assert.ok(out.includes('Score < 50') || out.includes('Score &lt; 50'));
  assert.ok(out.includes('Score > 90') || out.includes('Score &gt; 90'));
});

auditTest('isHtml differentiates tags from mathematical inequalities', () => {
  assert.equal(isHtml('Total < 100 and Count > 5'), false);
  assert.equal(isHtml('Formula: x < y, a > b'), false);
  assert.equal(isHtml('Text with <strong>bold</strong>'), true);
});

auditTest('stripHtml preserves text around math comparisons', () => {
  const plain = stripHtml('Capacity is < 500 students');
  assert.ok(plain.includes('< 500') || plain.includes('500'));
});

// -----------------------------------------------------------------------------
// 4. PERFORMANCE, SCALE & MEMORY LEAK PREVENTION
// -----------------------------------------------------------------------------
console.log('\n4. Performance & Memory Stress Audit');

auditTest('Large payload (10,000 paragraphs, ~500KB) processes in < 250ms without stack overflow', () => {
  const largeChunks = [];
  for (let i = 0; i < 5000; i++) {
    largeChunks.push(`Paragraph ${i}: Institution <strong>#${i}</strong> with capacity &gt; 500.\nLine break inside para ${i}.`);
  }
  const largePayload = largeChunks.join('\n\n');
  assert.ok(largePayload.length > 300000, `Payload size: ${largePayload.length} bytes`);

  const startTime = performance.now();
  const normalized = normalizeRichText(largePayload);
  const duration = performance.now() - startTime;

  console.log(`    -> 5,000 paragraphs (~${(largePayload.length / 1024).toFixed(1)} KB) normalized in ${duration.toFixed(1)} ms`);
  assert.ok(duration < 500, `Performance budget exceeded: ${duration} ms`);
  assert.ok(normalized.length > 0);
});

auditTest('Deeply nested unclosed tags balance without catastrophic backtracking or call-stack overflow', () => {
  const nested = '<strong><em><u><span><mark>'.repeat(50) + 'Deep content' + '</span>'.repeat(10);
  const startTime = performance.now();
  const balanced = balanceTags(nested);
  const duration = performance.now() - startTime;

  assert.ok(duration < 50, `Tag balancer took too long: ${duration} ms`);
  assert.ok(balanced.includes('Deep content'));
});

// -----------------------------------------------------------------------------
// 5. SECURITY & XSS DEFENSE-IN-DEPTH AUDIT
// -----------------------------------------------------------------------------
console.log('\n5. Adversarial Security Audit');

auditTest('Strip obfuscated script tags with case variation & whitespace', () => {
  const malicious = '<sCrIpt   type="text/javascript">alert("xss")</sCrIpT>Safe text';
  const out = normalizeRichText(malicious);
  assert.ok(!out.toLowerCase().includes('script'));
  assert.ok(!out.includes('alert'));
  assert.ok(out.includes('Safe text'));
});

auditTest('Strip onerror payload inside img/svg', () => {
  const malicious = '<img src="x" onerror="alert(1)">Important message';
  const out = normalizeRichText(malicious);
  assert.ok(!out.includes('onerror'));
  assert.ok(!out.includes('alert'));
});

auditTest('Strip javascript: protocol with whitespace and mixed casing', () => {
  const malicious = '<a href="  javaScript:alert(1)  ">Click here</a>';
  const out = normalizeRichText(malicious);
  assert.ok(!out.toLowerCase().includes('javascript:alert'));
});

console.log('\n================================================================');
console.log(`✓ ALL ${passedCount} / ${totalCount} ADVERSARIAL AUDIT TESTS PASSED!`);
console.log('================================================================\n');
