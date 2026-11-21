const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(err);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 BATCH ARTICLE MIGRATION & UNIFICATION VERIFICATION SUITE');
console.log('================================================================');

// 1. Check obsolete files are deleted
const obsoleteFiles = [
  '../frontend/src/pages/privacy-policy.tsx',
  '../frontend/src/pages/terms-of-use.tsx',
  '../frontend/src/pages/payment-policy.tsx',
  '../frontend/src/pages/replacement-return.tsx',
  '../frontend/src/pages/order-rejection.tsx',
  '../frontend/src/pages/ai-guide-article.tsx',
  '../frontend/src/pages/setup-college-article.tsx',
  '../frontend/src/pages/ugc-guideline-article.tsx',
  '../frontend/src/pages/innovation-detail.tsx',
];

for (const relPath of obsoleteFiles) {
  const fullPath = path.resolve(__dirname, relPath);
  const baseName = path.basename(relPath);
  test(`Obsolete file ${baseName} is deleted from codebase`, () => {
    assert(!fs.existsSync(fullPath), `${baseName} should no longer exist`);
  });
}

// 2. Check UniversalArticleDetail component
const universalDetailPath = path.resolve(__dirname, '../frontend/src/components/cms/UniversalArticleDetail.tsx');
const universalDetailSource = fs.readFileSync(universalDetailPath, 'utf8');

test('UniversalArticleDetail.tsx exists and is implemented', () => {
  assert(fs.existsSync(universalDetailPath), 'UniversalArticleDetail.tsx must exist');
  assert(universalDetailSource.includes('export default function UniversalArticleDetail'), 'Must export UniversalArticleDetail');
  assert(universalDetailSource.includes('GenericPageRenderer'), 'Must use GenericPageRenderer');
  assert(universalDetailSource.includes('usePageData'), 'Must use usePageData');
  assert(universalDetailSource.includes('backLink'), 'Must provide backLink to GenericPageRenderer');
});

// 3. Check GenericPageRenderer supports backLink
const genericRendererPath = path.resolve(__dirname, '../frontend/src/components/cms/GenericPageRenderer.tsx');
const genericRendererSource = fs.readFileSync(genericRendererPath, 'utf8');

test('GenericPageRenderer.tsx supports backLink prop and renders back arrow', () => {
  assert(genericRendererSource.includes('backLink?:'), 'GenericPageProps must declare backLink');
  assert(genericRendererSource.includes('backLink.href'), 'GenericPageRenderer must render backLink.href');
  assert(genericRendererSource.includes('ArrowLeft'), 'GenericPageRenderer must render ArrowLeft icon');
});

// 4. Check App.tsx configuration
const appPath = path.resolve(__dirname, '../frontend/src/App.tsx');
const appSource = fs.readFileSync(appPath, 'utf8');

test('App.tsx wires UniversalArticleDetail for all 4 sub-article routes', () => {
  assert(appSource.includes('UniversalArticleDetail'), 'App.tsx must import UniversalArticleDetail');
  assert(appSource.includes('path="/innovation/:trackSlug" element={<Layout><UniversalArticleDetail'), 'Innovation route must use UniversalArticleDetail');
  assert(appSource.includes('path="/ai-guide/:articleSlug" element={<Layout><UniversalArticleDetail'), 'AI Guide route must use UniversalArticleDetail');
  assert(appSource.includes('path="/setup-college/:articleSlug" element={<Layout><UniversalArticleDetail'), 'Setup College route must use UniversalArticleDetail');
  assert(appSource.includes('path="/ugc-guidelines/:articleSlug" element={<Layout><UniversalArticleDetail'), 'UGC Guidelines route must use UniversalArticleDetail');
});

test('App.tsx does not retain obsolete PageTemplates for policy pages', () => {
  assert(!appSource.includes("'privacy-policy':"), 'privacy-policy must not be hardcoded in PageTemplates');
  assert(!appSource.includes("'terms-of-use':"), 'terms-of-use must not be hardcoded in PageTemplates');
  assert(!appSource.includes("'payment-policy':"), 'payment-policy must not be hardcoded in PageTemplates');
  assert(!appSource.includes("'replacement-return':"), 'replacement-return must not be hardcoded in PageTemplates');
  assert(!appSource.includes("'order-rejection':"), 'order-rejection must not be hardcoded in PageTemplates');
});

// 5. Check backend routes configuration
const backendRoutesPath = path.resolve(__dirname, '../backend/src/routes/pages.routes.ts');
const backendRoutesSource = fs.readFileSync(backendRoutesPath, 'utf8');

test('backend/src/routes/pages.routes.ts includes all 5 policy pages in ARTICLE_PAGE_SLUGS', () => {
  assert(backendRoutesSource.includes("'privacy-policy'"), 'privacy-policy must be in ARTICLE_PAGE_SLUGS');
  assert(backendRoutesSource.includes("'terms-of-use'"), 'terms-of-use must be in ARTICLE_PAGE_SLUGS');
  assert(backendRoutesSource.includes("'payment-policy'"), 'payment-policy must be in ARTICLE_PAGE_SLUGS');
  assert(backendRoutesSource.includes("'replacement-return'"), 'replacement-return must be in ARTICLE_PAGE_SLUGS');
  assert(backendRoutesSource.includes("'order-rejection'"), 'order-rejection must be in ARTICLE_PAGE_SLUGS');
});

test('backend/src/routes/pages.routes.ts includes all 5 policy pages in requiredDefaults and does not shadow it', () => {
  const matches = backendRoutesSource.match(/const requiredDefaults/g);
  assert.strictEqual(matches ? matches.length : 0, 1, 'requiredDefaults must be declared exactly once in top-level scope without shadowing');
});

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL BATCH MIGRATION TESTS PASSED PERFECTLY!\n');
}
