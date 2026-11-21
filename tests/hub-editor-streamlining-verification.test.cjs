/**
 * tests/hub-editor-streamlining-verification.test.cjs
 * Comprehensive verification for Group 2 Hub Editor improvements:
 * 1. Hero & CTA button decoupling in GenericPageRenderer
 * 2. Bottom CTA horizontal flex layout (Image 1 match) in GenericPageRenderer
 * 3. Template Switcher locking on existing pages in UnifiedPageEditor
 * 4. Filter categories manager rename & deletion handling
 * 5. Removal of readTime from general cards
 * 6. Purge of phantom legacy blocks (brandName, navLinks, moreCards, journalFooter)
 * 7. Removal of dead toggles (hideCategories, hideMore, hideFooter)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 GROUP 2 HUB EDITOR & RENDERER STREAMLINING VERIFICATION');
console.log('================================================================\n');

const genericRendererPath = path.resolve('frontend/src/components/cms/GenericPageRenderer.tsx');
const genericRendererContent = fs.readFileSync(genericRendererPath, 'utf8');

const editorPath = path.resolve('frontend/src/admin/components/UnifiedPageEditor.tsx');
const editorContent = fs.readFileSync(editorPath, 'utf8');

// 1. GenericPageRenderer: Hero & CTA decoupling
test('GenericPageRenderer decouples hero button from CTA button', () => {
  assert.ok(
    !genericRendererContent.includes('const heroBtnLabel = pageData.heroButtonLabel || pageData.ctaButtonLabel'),
    'heroBtnLabel must NOT fall back to ctaButtonLabel'
  );
  assert.ok(
    genericRendererContent.includes('const heroBtnLabel = pageData.heroButtonLabel?.trim() || \'\''),
    'heroBtnLabel must read only pageData.heroButtonLabel'
  );
  assert.ok(
    genericRendererContent.includes('const heroBtnHref = pageData.heroButtonHref?.trim() || \'/contact-us\''),
    'heroBtnHref must read only pageData.heroButtonHref'
  );
});

// 2. GenericPageRenderer: Bottom CTA Layout Match
test('GenericPageRenderer uses horizontal 2-column flex layout for CTA section', () => {
  assert.ok(
    genericRendererContent.includes('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6'),
    'CTA container must use flex-col sm:flex-row sm:items-center sm:justify-between'
  );
  assert.ok(
    genericRendererContent.includes('text-left max-w-2xl'),
    'CTA content block must align text-left'
  );
  assert.ok(
    genericRendererContent.includes('shrink-0 pt-2 sm:pt-0'),
    'CTA button block must be shrink-0 on the right'
  );
});

// 3. UnifiedPageEditor: Template switcher locked on existing pages
test('UnifiedPageEditor locks layout structure switcher for existing pages', () => {
  assert.ok(
    editorContent.includes('Boolean(page.id && page.id !== 0)'),
    'Layout mode switcher checks if page.id exists'
  );
  assert.ok(
    editorContent.includes('Detail / Article Layout (Locked)'),
    'Locked badge displays for detail layout'
  );
  assert.ok(
    editorContent.includes('Hub / Card Grid Layout (Locked)'),
    'Locked badge displays for hub layout'
  );
});

// 4. UnifiedPageEditor: Category filter chips manager rename
test('UnifiedPageEditor renames Side Menu Categories to Filter Categories', () => {
  assert.ok(
    !editorContent.includes('Side Menu Categories ('),
    'Old "Side Menu Categories" label must be removed'
  );
  assert.ok(
    !editorContent.includes('Live Navigation Sidebar'),
    'Old "Live Navigation Sidebar" badge must be removed'
  );
  assert.ok(
    editorContent.includes('Filter Categories ('),
    'New "Filter Categories" label must be present'
  );
  assert.ok(
    editorContent.includes('Live Card Grid Filters'),
    'New "Live Card Grid Filters" badge must be present'
  );
});

// 5. UnifiedPageEditor: handleRemoveGlobalCategory cleans card.category as well
test('handleRemoveGlobalCategory cleans categories and individual card category', () => {
  assert.ok(
    editorContent.includes('next.category = \'\''),
    'handleRemoveGlobalCategory must clear card.category when it matches target'
  );
  assert.ok(
    editorContent.includes('onClick={() => handleRemoveGlobalCategory(cat)}'),
    'Category chip includes functional removal button'
  );
});

// 6. UnifiedPageEditor: readTime field removed from general cards
test('readTime field is removed from general card editor', () => {
  assert.ok(
    !editorContent.includes('label={page.slug === \'science-tech-labs\' ? \'Badge / Specs Label\' : \'Read Time\'}'),
    'Read Time label should not appear for general cards'
  );
  assert.ok(
    editorContent.includes('{page.slug === \'science-tech-labs\' && (\n                                                                <Field label="Badge / Specs Label" value={card.readTime'),
    'readTime is only kept as Badge / Specs Label for science-tech-labs'
  );
});

// 7. UnifiedPageEditor: Purged obsolete blocks
test('UnifiedPageEditor has purged obsolete blocks for setup-college, ugc-guidelines, innovation', () => {
  assert.ok(
    !editorContent.includes('{page.slug === \'setup-college\' && ('),
    'Legacy setup-college block must be purged'
  );
  assert.ok(
    !editorContent.includes('{(page.slug === \'ugc-guidelines\' || page.slug === \'innovation\') && ('),
    'Legacy ugc-guidelines and innovation block must be purged'
  );
  assert.ok(
    !editorContent.includes('Journal Footer'),
    'Journal Footer section must be purged'
  );
  assert.ok(
    !editorContent.includes('Footer distance practice guidance'),
    'Hardcoded footer placeholder must not exist'
  );
  assert.ok(
    !editorContent.includes('Brand Name'),
    'Phantom Brand Name input must be purged'
  );
  assert.ok(
    !editorContent.includes('Navigation Links'),
    'Phantom Navigation Links input must be purged'
  );
});

// 8. UnifiedPageEditor: Removed dead toggles
test('UnifiedPageEditor has removed dead toggles', () => {
  assert.ok(
    !editorContent.includes('hideMore'),
    'hideMore toggle must be removed'
  );
  assert.ok(
    !editorContent.includes('hideFooter'),
    'hideFooter toggle must be removed'
  );
});

// 9. UnifiedPageEditor: Standard Hero Banner is active for all Group 2 pages
test('Standard Hero Banner is accessible for ai-guide, ugc-guidelines, and innovation', () => {
  assert.ok(
    !editorContent.includes('page.slug !== \'ai-guide\' && page.slug !== \'ugc-guidelines\' && page.slug !== \'innovation\''),
    'Hero Banner Content should no longer exclude ai-guide, ugc-guidelines, or innovation'
  );
  assert.ok(
    editorContent.includes('label="Hero Button Label (Optional)"'),
    'Dedicated optional Hero Button Label field is available'
  );
});

// 10. UnifiedPageEditor: 1-Click Design Presets removed to prevent accidental overrides on edit
test('UnifiedPageEditor hides 1-Click Design Presets on edit', () => {
  assert.ok(
    !editorContent.includes('1-Click Design Presets'),
    '1-Click Design Presets block should be removed from page editor'
  );
  assert.ok(
    !editorContent.includes('AI & ML Tech Grid'),
    'Preset button "AI & ML Tech Grid" should not be present'
  );
  assert.ok(
    !editorContent.includes('Editorial Journal'),
    'Preset button "Editorial Journal" should not be present'
  );
  assert.ok(
    !editorContent.includes('Executive Advisory'),
    'Preset button "Executive Advisory" should not be present'
  );
});

// 11. UnifiedPageEditor & GenericPageRenderer: Arbitrary Hex & Color Pickers for Hero & CTA Bg
test('UnifiedPageEditor provides color picker and text hex inputs for Hero and CTA backgrounds', () => {
  assert.ok(
    editorContent.includes('normalizeColorHex(data.styles?.heroBg || defaultHeroBg, \'#fbf9f5\')'),
    'Hero background utilizes normalizeColorHex for color picker input'
  );
  assert.ok(
    editorContent.includes('normalizeColorHex(data.styles?.ctaBg || defaultCtaBg, \'#002a6c\')'),
    'CTA background utilizes normalizeColorHex for color picker input'
  );
  assert.ok(
    editorContent.includes('value={data.styles?.heroBg ?? defaultHeroBg}'),
    'Hero background has hex text input'
  );
  assert.ok(
    editorContent.includes('value={data.styles?.ctaBg ?? defaultCtaBg}'),
    'CTA background has hex text input'
  );
  assert.ok(
    genericRendererContent.includes('function isDarkColor(color?: string)'),
    'GenericPageRenderer includes isDarkColor helper for arbitrary hex themes'
  );
});

// 12. UnifiedPageEditor & GenericPageRenderer: Introductory Content / Overview removed
test('Introductory Content / Overview section is removed from editor and hub layout', () => {
  assert.ok(
    !editorContent.includes('Introductory Content / Overview (Optional)'),
    'Introductory Content section should be removed from UnifiedPageEditor'
  );
  assert.ok(
    !editorContent.includes('label="Section Heading (Optional)"'),
    'Section Heading input should be removed from UnifiedPageEditor'
  );
  assert.ok(
    !editorContent.includes('Introductory Body Text'),
    'Introductory Body Text input should be removed from UnifiedPageEditor'
  );
  const hubLayoutSection = genericRendererContent.split('// 2. STANDARD HUB / GRID LAYOUT')[1] || '';
  assert.ok(
    !hubLayoutSection.includes('showBody'),
    'GenericPageRenderer standard hub layout does not render showBody overview box'
  );
});

// 13. GenericPageRenderer: Minimal hero layout button is right-aligned & vertically centered
test('GenericPageRenderer minimal hero aligns text on left and hero button on right with vertical centering', () => {
  assert.ok(
    genericRendererContent.includes('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6'),
    'Minimal hero container uses flex-col sm:flex-row sm:items-center sm:justify-between'
  );
  assert.ok(
    genericRendererContent.includes('shrink-0 pt-2 sm:pt-0'),
    'Minimal hero button is shrink-0 on the right'
  );
  assert.ok(
    genericRendererContent.includes('whitespace-nowrap'),
    'Minimal hero button has whitespace-nowrap'
  );
});

// 14. GenericPageRenderer: CTA Banner styling matches Sports Infra (Navy #002a6c, mb-10, rounded-[2rem])
test('GenericPageRenderer CTA strip matches single solution vertical spacing & Campus Navy', () => {
  assert.ok(
    genericRendererContent.includes("ctaBgTheme === 'blue'\n    ? '#002a6c'"),
    'Default blue CTA resolves to Campus Navy #002a6c'
  );
  assert.ok(
    genericRendererContent.includes("mt-10 sm:mt-12 mb-10"),
    'CTA container has outer vertical margin mt-10 sm:mt-12 mb-10'
  );
  assert.ok(
    genericRendererContent.includes("rounded-[2rem]"),
    'CTA card uses rounded-[2rem] matching Sports Infra'
  );
  assert.ok(
    genericRendererContent.includes("${showCta ? 'pb-0' : 'pb-16'}"),
    'Main container removes bottom padding when CTA strip is present to eliminate excessive white gap'
  );
});

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL HUB EDITOR & RENDERER STREAMLINING TESTS PASSED PERFECTLY!\n');
}
