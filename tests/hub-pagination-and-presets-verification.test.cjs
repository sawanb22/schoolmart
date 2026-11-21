/**
 * Hub Template Unification, Pagination & 1-Click Style Presets Verification Suite
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('🧪 HUB UNIFICATION, 12-CARD PAGINATION & PRESETS VERIFICATION');
console.log('================================================================\n');

// 1. Obsolete static files deleted
const obsoleteHubFiles = [
  'frontend/src/pages/ai-guide.tsx',
  'frontend/src/pages/setup-college.tsx',
  'frontend/src/pages/ugc-guidelines.tsx',
  'frontend/src/pages/innovation.tsx',
  'frontend/src/pages/resources.tsx',
  'frontend/src/pages/collaboration.tsx',
  'frontend/src/pages/collaboration.data.ts'
];

obsoleteHubFiles.forEach(file => {
  runTest(`Obsolete hub file is deleted: ${file}`, () => {
    assert.strictEqual(fs.existsSync(file), false, `File ${file} should have been deleted`);
  });
});

// 2. App.tsx routing and template resolution
const appContent = fs.readFileSync('frontend/src/App.tsx', 'utf8');

runTest('App.tsx removed obsolete hub entries from PageTemplates', () => {
  const hubs = ['ai-guide', 'setup-college', 'ugc-guidelines', 'innovation', 'resources', 'collaboration'];
  hubs.forEach(hub => {
    const regex = new RegExp(`'${hub}':\\s*lazy\\(`, 'm');
    assert.strictEqual(regex.test(appContent), false, `PageTemplates should not contain '${hub}'`);
  });
});

runTest('App.tsx DynamicPageRoute uses PageCardGridSkeleton on loading (pageStatus === 0)', () => {
  assert.ok(appContent.includes('PageCardGridSkeleton cardCount={6}'), 'DynamicPageRoute must render PageCardGridSkeleton with 6 cards on initial loading');
});

runTest('App.tsx DynamicPageRoute falls back to GenericPageRenderer for dynamic CMS pages', () => {
  assert.ok(appContent.includes('<GenericPageRenderer page={pageRecord} pageData={parsedPageData} />'), 'DynamicPageRoute must render GenericPageRenderer');
});

// 3. GenericPageRenderer pagination & font expansion
const rendererContent = fs.readFileSync('frontend/src/components/cms/GenericPageRenderer.tsx', 'utf8');

runTest('GenericPageRenderer imports usePagination and PaginationControl', () => {
  assert.ok(rendererContent.includes("import { usePagination } from '@/hooks/usePagination';"), 'Must import usePagination');
  assert.ok(rendererContent.includes("import { PaginationControl } from '@/components/common/PaginationControl';"), 'Must import PaginationControl');
});

runTest('GenericPageRenderer enforces 12-card page size limit', () => {
  assert.ok(rendererContent.includes('PAGE_SIZE = 12'), 'Must set PAGE_SIZE to 12');
  assert.ok(rendererContent.includes('usePagination(restCards, PAGE_SIZE)'), 'Must pass restCards and PAGE_SIZE to usePagination');
});

runTest('GenericPageRenderer automatically resets page to 1 when category filter changes', () => {
  assert.ok(rendererContent.includes('setPage(1)'), 'Must reset page to 1 on activeCategory change');
});

runTest('GenericPageRenderer renders PaginationControl when totalPages > 1', () => {
  assert.ok(rendererContent.includes('{totalPages > 1 && ('), 'Must conditionally render PaginationControl when totalPages > 1');
});

runTest('GenericPageRenderer supports expanded font options (inter, dmsans, etc.)', () => {
  assert.ok(rendererContent.includes("'inter'"), 'Must support inter font');
  assert.ok(rendererContent.includes("'dmsans'"), 'Must support dmsans font');
  assert.ok(rendererContent.includes('font-inter'), 'Must map inter to font-inter');
  assert.ok(rendererContent.includes('font-dmsans'), 'Must map dmsans to font-dmsans');
});

// 4. UnifiedPageEditor presets & live mini preview
const editorContent = fs.readFileSync('frontend/src/admin/components/UnifiedPageEditor.tsx', 'utf8');

runTest('UnifiedPageEditor hides 1-Click Design Presets on edit to avoid accidental overrides', () => {
  assert.ok(!editorContent.includes('1-Click Design Presets'), 'Must not contain 1-Click Design Presets header during editing');
  assert.ok(!editorContent.includes('AI &amp; ML Tech Grid'), 'Must not contain AI & ML Tech Grid preset');
  assert.ok(!editorContent.includes('Editorial Journal'), 'Must not contain Editorial Journal preset');
  assert.ok(!editorContent.includes('Executive Advisory'), 'Must not contain Executive Advisory preset');
});

runTest('UnifiedPageEditor includes expanded font options in select menus', () => {
  assert.ok(editorContent.includes('value="inter"'), 'Heading/body font select must include Inter');
  assert.ok(editorContent.includes('value="dmsans"'), 'Heading/body font select must include DM Sans');
  assert.ok(editorContent.includes('value="poppins"'), 'Must include Poppins');
  assert.ok(editorContent.includes('value="grotesk"'), 'Must include Space Grotesk');
  assert.ok(editorContent.includes('value="playfair"'), 'Must include Playfair Display');
});

runTest('UnifiedPageEditor includes Live Mini Preview Card in styles section', () => {
  assert.ok(editorContent.includes('Live Mini Preview Card (Visual Output)'), 'Must render Live Mini Preview Card');
  assert.ok(editorContent.includes('Active Configuration'), 'Must display active configuration summary');
});

// 5. Tailwind Configuration
const tailwindPath = fs.existsSync('frontend/tailwind.config.js') ? 'frontend/tailwind.config.js' : 'tailwind.config.js';
const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');

runTest('tailwind.config.js includes inter and dmsans font families', () => {
  assert.ok(tailwindContent.includes("'inter': ['Inter', 'sans-serif']"), 'Must define inter font family');
  assert.ok(tailwindContent.includes("'dmsans': ['\"DM Sans\"', 'sans-serif']"), 'Must define dmsans font family');
});

// 6. Backend routes requiredDefaults
const routesContent = fs.readFileSync('backend/src/routes/pages.routes.ts', 'utf8');

runTest('backend/src/routes/pages.routes.ts includes all 6 hub pages in requiredDefaults', () => {
  const hubs = [
    ['ai-guide', 'AI Implementation Guide'],
    ['setup-college', 'Setup Your College'],
    ['ugc-guidelines', 'UGC Guidelines'],
    ['innovation', 'Innovation'],
    ['resources', 'Resources & Guides'],
    ['collaboration', 'Collaboration Spaces']
  ];
  hubs.forEach(([slug, title]) => {
    assert.ok(routesContent.includes(`['${slug}', '${title}']`), `requiredDefaults must contain ['${slug}', '${title}']`);
  });
});

// 7. Safety Invariants Check
runTest('Safety Invariant: Product / Infrastructure solution pages remain separate and untouched', () => {
  const productPages = [
    'frontend/src/pages/sports-infra.tsx',
    'frontend/src/pages/labs.tsx',
    'frontend/src/pages/libraries.tsx',
    'frontend/src/pages/tech-infra.tsx',
    'frontend/src/pages/furniture.tsx',
    'frontend/src/pages/campus-furniture-design.tsx'
  ];
  productPages.forEach(p => {
    assert.ok(fs.existsSync(p), `Product page ${p} must remain intact`);
  });
});

runTest('Safety Invariant: Functional portal pages remain separate and untouched', () => {
  const functionalPages = [
    'frontend/src/pages/job-openings.tsx',
    'frontend/src/pages/classifieds.tsx',
    'frontend/src/pages/colleges-universities-for-sale.tsx',
    'frontend/src/pages/contact-us.tsx',
    'frontend/src/pages/request-quote.tsx',
    'frontend/src/pages/shop.tsx'
  ];
  functionalPages.forEach(p => {
    assert.ok(fs.existsSync(p), `Functional page ${p} must remain intact`);
  });
});

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED / ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL HUB UNIFICATION, PAGINATION & PRESET TESTS PASSED PERFECTLY!\n');
}
