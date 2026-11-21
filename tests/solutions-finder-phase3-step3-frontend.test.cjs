/**
 * tests/solutions-finder-phase3-step3-frontend.test.cjs
 * Comprehensive verification for Phase 3 Step 3:
 * - Anti-Slop Lexical Invariant & Editorial Standards
 * - Structural Integrity & Section A-F Data Flow
 * - Strict Inclusions (<=3 non-empty deliverables)
 * - Safe targetUrl routing and zero-broken-link invariants
 * - Lead submission inquiry payload contract (POST /api/inquiries)
 * - App.tsx and SearchBar routing wiring
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 SOLUTIONS FINDER — PHASE 3 STEP 3 FRONTEND & ANTI-SLOP TESTS');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(description, testFn) {
  try {
    testFn();
    console.log(`✅ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${err.message}`);
    failCount++;
  }
}

// Read Source Files
const findSolutionsPath = path.resolve(__dirname, '../frontend/src/pages/FindSolutions.tsx');
const searchBarPath = path.resolve(__dirname, '../frontend/src/components/sections/search-bar.tsx');
const appTsxPath = path.resolve(__dirname, '../frontend/src/App.tsx');

const findSolutionsSource = fs.readFileSync(findSolutionsPath, 'utf8');
const searchBarSource = fs.readFileSync(searchBarPath, 'utf8');
const appTsxSource = fs.readFileSync(appTsxPath, 'utf8');

// --- 1. ANTI-SLOP LEXICAL & TYPOGRAPHIC INVARIANTS ---
console.log('--- 1. Anti-Slop Lexical & Typographic Invariants ---');

runTest('Forbidden robotic terms do not exist in FindSolutions.tsx', () => {
  const forbiddenPatterns = [
    /\bcontextual relevance\b/i,
    /\bneural\b/i,
    /\balgorithm\b/i,
    /\bai powered\b/i,
    /\bai score\b/i,
    /\b\d{1,3}%\s*match\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    const match = findSolutionsSource.match(pattern);
    assert.strictEqual(
      match,
      null,
      `Found forbidden robotic slop in FindSolutions.tsx matching ${pattern}: "${match ? match[0] : ''}"`
    );
  }
});

runTest('Forbidden typographical AI tells (middle dot, spaced em-dash, trailing arrow slop) do not exist in text copy', () => {
  // Middle dot · is forbidden in prose
  assert.ok(!findSolutionsSource.includes('·'), 'Found forbidden middle dot (·) in FindSolutions.tsx');

  // Spaced em-dash " — " is forbidden
  assert.ok(!findSolutionsSource.includes(' — '), 'Found forbidden spaced em-dash ( — ) in FindSolutions.tsx');

  // Trailing arrow slop "→" is forbidden in user-facing button / link text
  assert.ok(!findSolutionsSource.includes('→'), 'Found forbidden trailing arrow (→) in FindSolutions.tsx');
});

// --- 2. ARCHITECTURAL INTEGRITY: ALL 6 SECTIONS (A through F) ---
console.log('\n--- 2. Architectural Integrity: Sections A through F ---');

runTest('Section A (Requirement Scope Summary) is implemented with institutional tags and refinement toggle', () => {
  assert.ok(findSolutionsSource.includes('Requirement Scope Summary'), 'Section A heading missing');
  assert.ok(findSolutionsSource.includes('scopeTags.map'), 'Section A scope tags iteration missing');
  assert.ok(findSolutionsSource.includes('Refine Parameters'), 'Section A refinement toggle missing');
});

runTest('Section B (Curated Turnkey Packages) renders inclusions, whyRelevant, and multi-select checkbox', () => {
  assert.ok(findSolutionsSource.includes('Curated Turnkey Packages'), 'Section B heading missing');
  assert.ok(findSolutionsSource.includes('.slice(0, 3)'), 'Section B strictly 3 inclusions guard missing');
  assert.ok(findSolutionsSource.includes('whyRelevant'), 'Section B whyRelevant field missing');
  assert.ok(findSolutionsSource.includes('toggleCardSelection'), 'Section B multi-select consultation toggle missing');
});

runTest('Section C (Adjacent Campus Infrastructure) renders cross-sell recommendations with direct routing', () => {
  assert.ok(findSolutionsSource.includes('Adjacent Campus Infrastructure'), 'Section C heading missing');
  assert.ok(findSolutionsSource.includes('complementaryInfra.map'), 'Section C items iteration missing');
  assert.ok(findSolutionsSource.includes('targetUrl'), 'Section C targetUrl route link missing');
});

runTest('Section D (Institutional Precedents & Delivery Verifications) links to case studies', () => {
  assert.ok(findSolutionsSource.includes('Institutional Precedents'), 'Section D heading missing');
  assert.ok(findSolutionsSource.includes('caseStudies.map'), 'Section D case studies iteration missing');
});

runTest('Section E (Turnkey Consultation & Scope Request) binds selected cards and POSTs to /inquiries', () => {
  assert.ok(findSolutionsSource.includes('Turnkey Consultation & Scope Request'), 'Section E heading missing');
  assert.ok(findSolutionsSource.includes("api.post('/inquiries'"), 'Section E inquiries API post missing');
  assert.ok(findSolutionsSource.includes('formSubmittedCode'), 'Section E confirmation code missing');
  assert.ok(findSolutionsSource.includes('CM-TRACE-'), 'Section E trace reference format missing');
});

runTest('Section F (Bespoke Architecture Fallback) provides human consultation route when unmatched', () => {
  assert.ok(findSolutionsSource.includes('Custom Architectural & Execution Scope Required'), 'Section F heading missing');
  assert.ok(findSolutionsSource.includes('/contact-us?subject=Bespoke+Campus+Requirement'), 'Section F fallback route missing');
});

// --- 3. DATA VALIDATION & ERROR HANDLING ---
console.log('\n--- 3. Data Validation & Error Handling ---');

runTest('Form validates required fields (name, email, phone) before submitting', () => {
  assert.ok(
    findSolutionsSource.includes('!formName.trim() || !formEmail.trim() || !formPhone.trim()'),
    'Missing required field validation check in consultation submission'
  );
  assert.ok(
    findSolutionsSource.includes('Please fill in your full name, official email, and contact phone number.'),
    'Missing error message for incomplete contact form'
  );
});

runTest('Network error handling and loading skeletons exist for graceful degradation', () => {
  assert.ok(findSolutionsSource.includes('Unable to load institutional solutions proposal'), 'Missing user-friendly error message');
  assert.ok(findSolutionsSource.includes('animate-pulse'), 'Missing loading skeleton states');
  assert.ok(findSolutionsSource.includes('AbortController'), 'Missing fetch cancellation guard on unmount/re-query');
});

// --- 4. ROUTING INTEGRATION ---
console.log('\n--- 4. Routing Integration ---');

runTest('App.tsx registers /find-solutions route with FindSolutions page component', () => {
  assert.ok(appTsxSource.includes("path=\"/find-solutions\""), 'Missing /find-solutions route in App.tsx');
  assert.ok(appTsxSource.includes('FindSolutions'), 'Missing FindSolutions component import in App.tsx');
});

runTest('SearchBar navigates to /find-solutions on submit with query parameters', () => {
  assert.ok(searchBarSource.includes("navigate(`/find-solutions?${params.toString()}`)"), 'SearchBar submit navigation missing');
  assert.ok(searchBarSource.includes("navigate(`/find-solutions?${p.toString()}`)"), 'SearchBar quick chip navigation missing');
});

// --- SUMMARY ---
console.log('\n================================================================');
console.log(`📊 PHASE 3 STEP 3 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
