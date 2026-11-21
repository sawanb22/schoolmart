const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 SUBPAGE UNIFICATION & CARD ACCORDION VERIFICATION SUITE');
console.log('================================================================');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

// Read relevant files
const appContent = fs.readFileSync('frontend/src/App.tsx', 'utf8');
const uadContent = fs.readFileSync('frontend/src/components/cms/UniversalArticleDetail.tsx', 'utf8');
const upeContent = fs.readFileSync('frontend/src/admin/components/UnifiedPageEditor.tsx', 'utf8');
const pmContent = fs.readFileSync('frontend/src/admin/pages/PagesManager.tsx', 'utf8');

// --- 1. App.tsx Group 5 Subpage Routing Tests ---
test('App.tsx: /campus-design/:serviceSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/campus-design/:serviceSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-design"'), 'Must wire campus-design to UniversalArticleDetail');
  assert.ok(!appContent.includes('<Route path="/campus-design/:serviceSlug" element={<Layout><CampusDesignService'), 'Must not route to old CampusDesignService');
});

test('App.tsx: /campus-design-execution/:stepSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/campus-design-execution/:stepSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-design-execution"'), 'Must wire campus-design-execution to UniversalArticleDetail');
});

test('App.tsx: /campus-master-planning/:serviceSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/campus-master-planning/:serviceSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-master-planning"'), 'Must wire campus-master-planning to UniversalArticleDetail');
});

test('App.tsx: /campus-furniture-design/:rangeSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/campus-furniture-design/:rangeSlug" element={<Layout><UniversalArticleDetail hubSlug="campus-furniture-design"'), 'Must wire campus-furniture-design to UniversalArticleDetail');
});

test('App.tsx: /sports-design-execution/:stepSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/sports-design-execution/:stepSlug" element={<Layout><UniversalArticleDetail hubSlug="sports-design-execution"'), 'Must wire sports-design-execution to UniversalArticleDetail');
});

test('App.tsx: /ai-digital-design-supply/:solutionSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/ai-digital-design-supply/:solutionSlug" element={<Layout><UniversalArticleDetail hubSlug="ai-digital-design-supply"'), 'Must wire ai-digital-design-supply to UniversalArticleDetail');
});

test('App.tsx: /ar-vr-experiences/:experienceSlug routes to UniversalArticleDetail', () => {
  assert.ok(appContent.includes('<Route path="/ar-vr-experiences/:experienceSlug" element={<Layout><UniversalArticleDetail hubSlug="ar-vr-experiences"'), 'Must wire ar-vr-experiences to UniversalArticleDetail');
});

// --- 2. UniversalArticleDetail.tsx Zero-Data-Loss Tests ---
test('UniversalArticleDetail: normalizes raw article slug with slash trimming', () => {
  assert.ok(uadContent.includes("replace(/^\\/+|\\/+$/g, '')"), 'Must trim leading and trailing slashes from slug');
});

test('UniversalArticleDetail: synthesizes methodology and description into article body', () => {
  assert.ok(uadContent.includes('resolvedArticle.methodology'), 'Must resolve methodology');
  assert.ok(uadContent.includes('resolvedArticle.description'), 'Must resolve description');
});

test('UniversalArticleDetail: synthesizes structured deliverables into article body without data loss', () => {
  assert.ok(uadContent.includes('Array.isArray(resolvedArticle.deliverables)'), 'Must check for deliverables array');
  assert.ok(uadContent.includes('Key Milestones & Deliverables'), 'Must format deliverables section heading');
  assert.ok(uadContent.includes('d.phaseLabel'), 'Must preserve milestone phase label');
});

test('UniversalArticleDetail: matches card slug, title slug, and href leaf', () => {
  assert.ok(uadContent.includes('s === normalizedSlug'), 'Must match card slug');
  assert.ok(uadContent.includes('t === normalizedSlug'), 'Must match slugified title');
  assert.ok(uadContent.includes('hLeaf === normalizedSlug'), 'Must match href leaf');
});

// --- 3. UnifiedPageEditor.tsx Accordion & Slug Validation Tests ---
test('UnifiedPageEditor: implements collapsible card accordion state (default collapsed)', () => {
  assert.ok(upeContent.includes('const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);'), 'Must default expandedCardIndex to null');
  assert.ok(upeContent.includes('const isExpanded = expandedCardIndex === i;'), 'Must evaluate isExpanded per card');
});

test('UnifiedPageEditor: entire card strip is clickable to toggle expansion', () => {
  assert.ok(upeContent.includes('onClick={() => setExpandedCardIndex(isExpanded ? null : i)}'), 'Clicking strip must toggle expansion');
  assert.ok(upeContent.includes('role="button"'), 'Strip must be accessible button role');
});

test('UnifiedPageEditor: strip displays sequence badge, title, status toggle, and edit button', () => {
  assert.ok(upeContent.includes('#{String(i + 1).padStart(2, \'0\')}'), 'Must display formatted #01, #02 sequence badge');
  assert.ok(upeContent.includes('card.title || \'Untitled Card\''), 'Must display card title with fallback');
  assert.ok(upeContent.includes('Edit Subpage'), 'Must include Edit Subpage action button');
  assert.ok(upeContent.includes('e.stopPropagation()'), 'Action buttons must stop propagation so strip click is not triggered');
});

test('UnifiedPageEditor: handleEditSubpage validates empty slug before navigation', () => {
  assert.ok(upeContent.includes('const [slugValidationErrors, setSlugValidationErrors] = useState'), 'Must manage slug validation errors');
  assert.ok(upeContent.includes('Please enter a URL slug or hook this card to an existing page before editing its subpage.'), 'Must display warning message on empty slug');
  assert.ok(upeContent.includes('setExpandedCardIndex(index);'), 'Must auto-expand card on validation error');
});

test('UnifiedPageEditor: provides hook dropdown and live URL preview inside expanded card', () => {
  assert.ok(upeContent.includes('Hook to Existing Page'), 'Must offer hook dropdown inside card');
  assert.ok(upeContent.includes('Live Subpage URL: /{page.slug}/'), 'Must display live subpage URL indicator');
});

test('UnifiedPageEditor: removes 400+ lines of bespoke uneditable subpage bloat', () => {
  assert.ok(!upeContent.includes('Inside Subpage / Step Details Content'), 'Must not contain bespoke Subpage Details block');
  assert.ok(!upeContent.includes('Campus Design Subpages - Global Compliance & Case Studies Blocks'), 'Must not contain bespoke global compliance block');
  assert.ok(!upeContent.includes('Execution Subpages - Global Defaults & CTA'), 'Must not contain bespoke execution global block');
});

test('UnifiedPageEditor: implements atomic updateCard avoiding state closure race conditions', () => {
  assert.ok(upeContent.includes('const updateCard = (i: number, patch: Record<string, any>) =>'), 'Must define atomic updateCard');
  assert.ok(upeContent.includes('currentCards[i] = { ...currentCards[i], ...patch };'), 'Must patch card fields atomically');
});

test('UnifiedPageEditor: supports deleting and clearing card slug cleanly without sticking to slash', () => {
  assert.ok(upeContent.includes("updateCard(i, { slug: '', href: '' });"), 'Must clear both slug and href when emptied');
  assert.ok(upeContent.includes("card.slug !== undefined && card.slug !== null ? card.slug : (card.href ? card.href.replace(/^\\/+/"), 'Must show clean slug value without forced slash');
});

test('UnifiedPageEditor: handleEditSubpage supports auto-creating subpage article when missing', () => {
  assert.ok(upeContent.includes("api.post('/pages',"), 'Must call api.post to create article page if not existing');
  assert.ok(upeContent.includes("template: 'article'"), 'Must specify article template for subpages');
});

test('ServicePageRenderer: cleanly eliminates sequential number badges (#01, #02, etc.) from cards across all group pages', () => {
  const sprContent = fs.readFileSync('frontend/src/components/cms/ServicePageRenderer.tsx', 'utf8');
  assert.ok(!sprContent.includes('#{cardIndex}'), 'Must not display sequential #{cardIndex} badge on cards');
});

// --- 4. PagesManager.tsx Cleanup Tests ---
test('PagesManager: removes hardcoded 4 PAGES subpages drawer', () => {
  assert.ok(!pmContent.includes('CAMPUS_DESIGN_CHILD_SUBPAGES'), 'Must not define static child subpages array');
  assert.ok(!pmContent.includes('Linked Subpages & Steps'), 'Must not render hardcoded linked subpages drawer');
});

test('PagesManager: passes onSelectPage to UnifiedPageEditor for smooth page transitions', () => {
  assert.ok(pmContent.includes('onSelectPage={(targetPage) => setEditingPage(targetPage)}'), 'Must pass onSelectPage to UnifiedPageEditor');
});

test('PagesManager: handleCloseEditor cleanly deletes edit param and closes editor', () => {
  assert.ok(pmContent.includes("handleCloseEditor"), 'Must implement handleCloseEditor');
  assert.ok(pmContent.includes("nextParams.delete('edit')"), 'Must delete edit search param on close');
  assert.ok(pmContent.includes("onClose={handleCloseEditor}"), 'Must pass handleCloseEditor to UnifiedPageEditor');
});

test('UnifiedPageEditor: handleEditSubpage opens subpage in a new tab preserving hub editor state', () => {
  assert.ok(upeContent.includes("window.open(`/admin/pages?edit="), 'Must open subpage editor in a new tab');
  assert.ok(upeContent.includes("window.open('about:blank', '_blank')"), 'Must open blank tab synchronously to prevent popup blocker');
});

test('UnifiedPageEditor: addCard automatically expands new card for instant editing', () => {
  assert.ok(upeContent.includes("setExpandedCardIndex(nextIndex);"), 'Must expand newly added card');
});

console.log('================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SUBPAGE UNIFICATION & ACCORDION TESTS PASSED PERFECTLY!\n');
}
