const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('RUNNING TEST SUITE: Solution Hub Unification & Responsiveness Verification');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  [PASS] Test ${totalTests}: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${description}`);
    console.error(`         Error: ${err.message}`);
  }
}

const ROOT = path.resolve(__dirname, '..');
const solutionRendererPath = path.join(ROOT, 'frontend', 'src', 'components', 'cms', 'SolutionPageRenderer.tsx');
const sportsInfraPath = path.join(ROOT, 'frontend', 'src', 'pages', 'sports-infra.tsx');
const labsPath = path.join(ROOT, 'frontend', 'src', 'pages', 'labs.tsx');
const librariesPath = path.join(ROOT, 'frontend', 'src', 'pages', 'libraries.tsx');
const techInfraPath = path.join(ROOT, 'frontend', 'src', 'pages', 'tech-infra.tsx');
const furniturePath = path.join(ROOT, 'frontend', 'src', 'pages', 'furniture.tsx');
const campusFurnitureDesignPath = path.join(ROOT, 'frontend', 'src', 'pages', 'campus-furniture-design.tsx');
const editorPath = path.join(ROOT, 'frontend', 'src', 'admin', 'components', 'UnifiedPageEditor.tsx');

// Read files
const solutionRendererContent = fs.readFileSync(solutionRendererPath, 'utf8');
const sportsInfraContent = fs.readFileSync(sportsInfraPath, 'utf8');
const labsContent = fs.readFileSync(labsPath, 'utf8');
const librariesContent = fs.readFileSync(librariesPath, 'utf8');
const techInfraContent = fs.readFileSync(techInfraPath, 'utf8');
const furnitureContent = fs.readFileSync(furniturePath, 'utf8');
const editorContent = fs.readFileSync(editorPath, 'utf8');

// --- 1. SolutionPageRenderer Master Engine Checks ---
runTest('SolutionPageRenderer exists and exports SolutionPageRenderer as default', () => {
  assert.ok(fs.existsSync(solutionRendererPath), 'SolutionPageRenderer.tsx must exist');
  assert.ok(solutionRendererContent.includes('export default SolutionPageRenderer'), 'Must export SolutionPageRenderer as default');
});

runTest('SolutionPageRenderer implements responsive mobile/tablet category bar (lg:hidden)', () => {
  assert.ok(solutionRendererContent.includes('lg:hidden'), 'Must have lg:hidden container for mobile viewports');
  assert.ok(solutionRendererContent.includes('overflow-x-auto'), 'Must support horizontal scroll for mobile category pills');
  assert.ok(solutionRendererContent.includes('setSelectedCategory(option)'), 'Mobile pill click must set selected category');
  assert.ok(solutionRendererContent.includes('setPage(1)'), 'Category selection must reset page to 1');
});

runTest('SolutionPageRenderer implements desktop sticky category sidebar (lg:block)', () => {
  assert.ok(solutionRendererContent.includes('hidden lg:block'), 'Must have hidden lg:block aside for desktop');
  assert.ok(solutionRendererContent.includes('sticky top-24'), 'Desktop sidebar must be sticky');
  assert.ok(solutionRendererContent.includes('Categories'), 'Sidebar must display Categories heading');
});

runTest('SolutionPageRenderer strictly enforces 12-card pagination with usePagination', () => {
  assert.ok(solutionRendererContent.includes('const PAGE_SIZE = 12;'), 'PAGE_SIZE must be 12');
  assert.ok(solutionRendererContent.includes('usePagination(filteredCards, PAGE_SIZE)'), 'usePagination must receive filteredCards and PAGE_SIZE');
  assert.ok(solutionRendererContent.includes('<PaginationControl'), 'Must render PaginationControl component');
});

runTest('SolutionPageRenderer standardizes bottom CTA strip to 2-column flex layout', () => {
  assert.ok(solutionRendererContent.includes('sm:flex-row sm:items-center sm:justify-between'), 'CTA must use 2-column flex layout');
  assert.ok(solutionRendererContent.includes('rounded-[2rem]'), 'CTA must feature rounded-[2rem] curvature');
  assert.ok(solutionRendererContent.includes('max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 mb-10'), 'CTA must have standard max-w-6xl and margins');
});

runTest('SolutionPageRenderer eliminates hardcoded CTA icons and divider lines', () => {
  assert.ok(!solutionRendererContent.includes('<Trophy'), 'CTA must not contain Trophy icon');
  assert.ok(!solutionRendererContent.includes('<Microscope'), 'CTA must not contain Microscope icon');
  assert.ok(!solutionRendererContent.includes('<BookOpen'), 'CTA must not contain BookOpen icon');
  assert.ok(!solutionRendererContent.includes('<Server'), 'CTA must not contain Server icon');
  // Check that the CTA section does not contain decorative divider lines
  const ctaSection = solutionRendererContent.split('{/* Call to Action')[1];
  assert.ok(!ctaSection.includes('h-1 w-24'), 'CTA must not contain hardcoded divider line');
  assert.ok(!ctaSection.includes('h-1 w-32'), 'CTA must not contain hardcoded divider line');
});

runTest('SolutionPageRenderer eliminates un-editable middle sections (features and philosophy)', () => {
  assert.ok(!solutionRendererContent.includes('hideFeatures'), 'Must omit features section');
  assert.ok(!solutionRendererContent.includes('hidePhilosophy'), 'Must omit philosophy section');
  assert.ok(!solutionRendererContent.includes('philosophyBullets'), 'Must omit philosophy bullets');
  assert.ok(!solutionRendererContent.includes('philosophyServices'), 'Must omit philosophy services');
});

runTest('SolutionPageRenderer supports Design Wishlist integration with LoginPromptModal', () => {
  assert.ok(solutionRendererContent.includes('useDesignWishlist(slug)'), 'Must connect useDesignWishlist for the page slug');
  assert.ok(solutionRendererContent.includes('<LoginPromptModal'), 'Must render LoginPromptModal');
  assert.ok(solutionRendererContent.includes('Add to wishlist'), 'Must provide Add to wishlist action');
  assert.ok(solutionRendererContent.includes('Added to wishlist'), 'Must show Added to wishlist indicator');
});

// --- 2. Solution Pages Delegation Checks ---
runTest('sports-infra.tsx delegates cleanly to SolutionPageRenderer', () => {
  assert.ok(sportsInfraContent.includes("import SolutionPageRenderer"), 'Must import SolutionPageRenderer');
  assert.ok(sportsInfraContent.includes("<SolutionPageRenderer slug={slug} />"), 'Must delegate to SolutionPageRenderer');
  assert.ok(sportsInfraContent.includes("export function slugifySportsInfraTitle"), 'Must export slugifySportsInfraTitle helper');
  assert.ok(sportsInfraContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('labs.tsx delegates cleanly to SolutionPageRenderer', () => {
  assert.ok(labsContent.includes("import SolutionPageRenderer"), 'Must import SolutionPageRenderer');
  assert.ok(labsContent.includes("<SolutionPageRenderer slug={slug} />"), 'Must delegate to SolutionPageRenderer');
  assert.ok(labsContent.includes("export function slugifyLabTitle"), 'Must export slugifyLabTitle helper');
  assert.ok(labsContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('libraries.tsx delegates cleanly to SolutionPageRenderer', () => {
  assert.ok(librariesContent.includes("import SolutionPageRenderer"), 'Must import SolutionPageRenderer');
  assert.ok(librariesContent.includes("<SolutionPageRenderer slug={slug} />"), 'Must delegate to SolutionPageRenderer');
  assert.ok(librariesContent.includes("export function slugifyLibraryTitle"), 'Must export slugifyLibraryTitle helper');
  assert.ok(librariesContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('tech-infra.tsx delegates cleanly to SolutionPageRenderer', () => {
  assert.ok(techInfraContent.includes("import SolutionPageRenderer"), 'Must import SolutionPageRenderer');
  assert.ok(techInfraContent.includes("<SolutionPageRenderer slug={slug} />"), 'Must delegate to SolutionPageRenderer');
  assert.ok(techInfraContent.includes("export function slugifyTechInfraTitle"), 'Must export slugifyTechInfraTitle helper');
  assert.ok(techInfraContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

// --- 3. UnifiedPageEditor Streamlining Checks ---
runTest('UnifiedPageEditor purges dead Additional Cards (section2Cards) block from generic pages', () => {
  assert.ok(!editorContent.includes('Additional Cards <span className="text-blue-500 ml-2">'), 'Dead Additional Cards block must be purged');
});

runTest('UnifiedPageEditor purges dead Philosophy Section (Static Lab / Evolution) block', () => {
  assert.ok(!editorContent.includes('Lab Evolution & Services Section'), 'Dead Lab Evolution section must be purged');
  assert.ok(!editorContent.includes('Static Lab to Innovation Centre.'), 'Obsolete placeholder must be purged');
});

runTest('UnifiedPageEditor removes obsolete visibility toggles for solution hub pages', () => {
  assert.ok(!editorContent.includes("page.slug === 'sports-infra' || isSmartClassroomsPage"), 'hideFeatures toggle must not target sports-infra');
  assert.ok(!editorContent.includes("(page.slug === 'libraries' || page.slug === 'labs' || isScienceTechLabsPage)"), 'hidePhilosophy toggle must not target libraries or labs');
});

// --- 4. Safety Constraints & Exclusions Invariants ---
runTest('Safety Invariant: furniture.tsx is strictly preserved and not delegated to SolutionPageRenderer', () => {
  assert.ok(!furnitureContent.includes("SolutionPageRenderer"), 'furniture.tsx must NOT delegate to SolutionPageRenderer');
  assert.ok(furnitureContent.includes("furniture"), 'furniture.tsx content must be preserved');
});

runTest('Safety Invariant: campus-furniture-design.tsx exists and is preserved', () => {
  assert.ok(fs.existsSync(campusFurnitureDesignPath), 'campus-furniture-design.tsx must exist');
});

// --- Summary ---
console.log('\n================================================================');
console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} Passed (${totalTests - passedTests} Failed)`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
