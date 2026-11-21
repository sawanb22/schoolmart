const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('RUNNING TEST SUITE: Group 5 Service Suite Unification & New Page Templates Verification');
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
const serviceRendererPath = path.join(ROOT, 'frontend', 'src', 'components', 'cms', 'ServicePageRenderer.tsx');
const cdePath = path.join(ROOT, 'frontend', 'src', 'pages', 'campus-design-execution.tsx');
const cfdPath = path.join(ROOT, 'frontend', 'src', 'pages', 'campus-furniture-design.tsx');
const sdePath = path.join(ROOT, 'frontend', 'src', 'pages', 'sports-design-execution.tsx');
const aiDigitalPath = path.join(ROOT, 'frontend', 'src', 'pages', 'ai-digital-design-supply.tsx');
const arVrPath = path.join(ROOT, 'frontend', 'src', 'pages', 'ar-vr-experiences.tsx');
const campusDesignPath = path.join(ROOT, 'frontend', 'src', 'pages', 'campus-design.tsx');
const furniturePath = path.join(ROOT, 'frontend', 'src', 'pages', 'furniture.tsx');
const pagesManagerPath = path.join(ROOT, 'frontend', 'src', 'admin', 'pages', 'PagesManager.tsx');
const appPath = path.join(ROOT, 'frontend', 'src', 'App.tsx');

// Read contents
const serviceRendererContent = fs.readFileSync(serviceRendererPath, 'utf8');
const cdeContent = fs.readFileSync(cdePath, 'utf8');
const cfdContent = fs.readFileSync(cfdPath, 'utf8');
const sdeContent = fs.readFileSync(sdePath, 'utf8');
const aiDigitalContent = fs.readFileSync(aiDigitalPath, 'utf8');
const arVrContent = fs.readFileSync(arVrPath, 'utf8');
const campusDesignContent = fs.readFileSync(campusDesignPath, 'utf8');
const furnitureContent = fs.readFileSync(furniturePath, 'utf8');
const pagesManagerContent = fs.readFileSync(pagesManagerPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

// --- 1. ServicePageRenderer Master Engine Checks ---
runTest('ServicePageRenderer exists and exports ServicePageRenderer as default', () => {
  assert.ok(fs.existsSync(serviceRendererPath), 'ServicePageRenderer.tsx must exist');
  assert.ok(serviceRendererContent.includes('export default ServicePageRenderer'), 'Must export ServicePageRenderer as default');
});

runTest('ServicePageRenderer enforces 12-card pagination with usePagination and PaginationControl', () => {
  assert.ok(serviceRendererContent.includes('const PAGE_SIZE = 12;'), 'PAGE_SIZE must be 12');
  assert.ok(serviceRendererContent.includes('usePagination(filteredCards, PAGE_SIZE)'), 'Must use usePagination');
  assert.ok(serviceRendererContent.includes('<PaginationControl'), 'Must render PaginationControl');
});

runTest('ServicePageRenderer implements responsive category filter bar', () => {
  assert.ok(serviceRendererContent.includes('overflow-x-auto'), 'Must support horizontal scroll on mobile');
  assert.ok(serviceRendererContent.includes('setActiveCategory(category)'), 'Pill click must set active category');
  assert.ok(serviceRendererContent.includes('setPage(1)'), 'Category click must reset page to 1');
});

runTest('ServicePageRenderer cleanly eliminates sequential number badges (#01, #02, etc.) from cards', () => {
  assert.ok(!serviceRendererContent.includes('#{cardIndex}'), 'Must not display sequential number badge on service cards');
});

runTest('ServicePageRenderer standardizes bottom CTA strip to 2-column flex layout', () => {
  assert.ok(serviceRendererContent.includes('sm:flex-row sm:items-center sm:justify-between'), 'Must use 2-column flex layout');
  assert.ok(serviceRendererContent.includes('rounded-[2rem]'), 'Must have rounded-[2rem] curvature');
  assert.ok(serviceRendererContent.includes('max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 mb-10'), 'Must have standard margins');
});

runTest('ServicePageRenderer eliminates hardcoded icons and unwanted middle sections', () => {
  assert.ok(!serviceRendererContent.includes('<Trophy'), 'Must not contain hardcoded icons');
  assert.ok(!serviceRendererContent.includes('philosophyBullets'), 'Must not contain philosophy bullets');
  assert.ok(!serviceRendererContent.includes('section2Cards'), 'Must not contain additional cards section');
});

// --- 2. Group 5 Delegation Checks ---
runTest('campus-design-execution.tsx delegates to ServicePageRenderer (< 40 lines)', () => {
  assert.ok(cdeContent.includes('import ServicePageRenderer'), 'Must import ServicePageRenderer');
  assert.ok(cdeContent.includes('<ServicePageRenderer slug={slug} />'), 'Must delegate to ServicePageRenderer');
  assert.ok(cdeContent.includes('export { CDE_PAGE_SLUG, slugifyStepTitle }'), 'Must export slugifyStepTitle');
  assert.ok(cdeContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('campus-furniture-design.tsx delegates to ServicePageRenderer (< 40 lines)', () => {
  assert.ok(cfdContent.includes('import ServicePageRenderer'), 'Must import ServicePageRenderer');
  assert.ok(cfdContent.includes('<ServicePageRenderer slug={FURNITURE_DESIGN_PAGE_SLUG} />'), 'Must delegate to ServicePageRenderer');
  assert.ok(cfdContent.includes('slugifyFurnitureDesignTitle'), 'Must export slugifyFurnitureDesignTitle');
  assert.ok(cfdContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('sports-design-execution.tsx delegates to ServicePageRenderer (< 40 lines)', () => {
  assert.ok(sdeContent.includes('import ServicePageRenderer'), 'Must import ServicePageRenderer');
  assert.ok(sdeContent.includes('<ServicePageRenderer slug={SDE_PAGE_SLUG} />'), 'Must delegate to ServicePageRenderer');
  assert.ok(sdeContent.includes('slugifySportsStepTitle'), 'Must export slugifySportsStepTitle');
  assert.ok(sdeContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('ai-digital-design-supply.tsx delegates to ServicePageRenderer (< 50 lines)', () => {
  assert.ok(aiDigitalContent.includes('import ServicePageRenderer'), 'Must import ServicePageRenderer');
  assert.ok(aiDigitalContent.includes('<ServicePageRenderer slug={AI_DIGITAL_SUPPLY_PAGE_SLUG} />'), 'Must delegate to ServicePageRenderer');
  assert.ok(aiDigitalContent.includes('slugifyAiDigitalSupplyTitle'), 'Must export slugifyAiDigitalSupplyTitle');
  assert.ok(aiDigitalContent.split('\n').length < 50, 'File must be concise (< 50 lines)');
});

runTest('ar-vr-experiences.tsx delegates to ServicePageRenderer (< 40 lines)', () => {
  assert.ok(arVrContent.includes('import ServicePageRenderer'), 'Must import ServicePageRenderer');
  assert.ok(arVrContent.includes('<ServicePageRenderer slug={AR_VR_PAGE_SLUG} />'), 'Must delegate to ServicePageRenderer');
  assert.ok(arVrContent.includes('slugifyArVrTitle'), 'Must export slugifyArVrTitle');
  assert.ok(arVrContent.split('\n').length < 40, 'File must be concise (< 40 lines)');
});

runTest('campus-design.tsx delegates to campus-design-execution cleanly', () => {
  assert.ok(campusDesignContent.includes("slug=\"campus-design\""), 'Must delegate with slug="campus-design"');
});

// --- 3. PagesManager "+ New Page" Template Choice Checks ---
runTest('PagesManager offers all 4 unified template choices in "+ New Page" modal', () => {
  assert.ok(pagesManagerContent.includes("setNewPageType('article')"), 'Must support article template');
  assert.ok(pagesManagerContent.includes("setNewPageType('grid')"), 'Must support grid template');
  assert.ok(pagesManagerContent.includes("setNewPageType('solution-hub')"), 'Must support solution-hub template');
  assert.ok(pagesManagerContent.includes("setNewPageType('service-suite')"), 'Must support service-suite template');
});

runTest('PagesManager configures tailored initialPageData for solution-hub and service-suite', () => {
  assert.ok(pagesManagerContent.includes("newPageType === 'solution-hub'"), 'Must have solution-hub initialPageData');
  assert.ok(pagesManagerContent.includes("newPageType === 'service-suite'"), 'Must have service-suite initialPageData');
  assert.ok(pagesManagerContent.includes('template: newPageType'), 'Must save chosen template on page creation');
});

// --- 4. App.tsx Dynamic Routing Checks ---
runTest('App.tsx DynamicPageRoute routes solution-hub and service-suite to their renderers', () => {
  assert.ok(appContent.includes("templateId === 'solution-hub'"), 'Must route templateId solution-hub');
  assert.ok(appContent.includes("<SolutionPageRenderer"), 'Must render SolutionPageRenderer');
  assert.ok(appContent.includes("templateId === 'service-suite'"), 'Must route templateId service-suite');
  assert.ok(appContent.includes("<ServicePageRenderer"), 'Must render ServicePageRenderer');
});

// --- 5. Safety Invariants ---
runTest('Safety Invariant: furniture.tsx is preserved and not converted into a delegate', () => {
  assert.ok(!furnitureContent.includes('ServicePageRenderer'), 'furniture.tsx must NOT delegate to ServicePageRenderer');
  assert.ok(furnitureContent.includes('furniture'), 'furniture.tsx content must be preserved');
});

// --- Summary ---
console.log('\n================================================================');
console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} Passed (${totalTests - passedTests} Failed)`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
