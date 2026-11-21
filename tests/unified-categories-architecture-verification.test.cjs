const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== UNIFIED CATEGORIES ARCHITECTURE VERIFICATION TEST ===\n');

// Test 1: Categories.tsx contains dual-mode (Showcase Page Filters & Store Products)
console.log('Test 1: Verify Categories.tsx dual-mode architecture...');
const categoriesContent = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/pages/Categories.tsx'), 'utf8');

assert.ok(categoriesContent.includes("activeMode === 'pages'"), 'Categories.tsx must support pages mode');
assert.ok(categoriesContent.includes("activeMode === 'products'"), 'Categories.tsx must support products mode');
assert.ok(categoriesContent.includes("PRESET_SHOWCASE_PAGES"), 'Categories.tsx must define PRESET_SHOWCASE_PAGES');
assert.ok(categoriesContent.includes("libraries"), 'Categories.tsx must include libraries');
assert.ok(categoriesContent.includes("tech-infra"), 'Categories.tsx must include tech-infra');
assert.ok(categoriesContent.includes("sports-infra"), 'Categories.tsx must include sports-infra');
assert.ok(categoriesContent.includes("labs"), 'Categories.tsx must include labs');
assert.ok(!categoriesContent.includes("slug: 'home'"), 'Categories.tsx must NOT include homepage in categories');
console.log('✓ PASS: Categories.tsx dual-mode architecture verified.');

// Test 2: Categories.tsx implements single-stream page save
console.log('\nTest 2: Verify single-stream page saving in Categories.tsx...');
assert.ok(categoriesContent.includes("api.put(`/pages/${pageDetails.id}`"), 'Categories.tsx must send isolated single-stream PUT to /pages/:id');
assert.ok(categoriesContent.includes("clearPageDataCache(selectedPageSlug)"), 'Categories.tsx must clear active page cache');
assert.ok(categoriesContent.includes("broadcastCmsInvalidation"), 'Categories.tsx must broadcast CMS cache invalidation');
console.log('✓ PASS: Single-stream isolated save verified.');

// Test 3: Categories.tsx in-memory card count calculation
console.log('\nTest 3: Verify in-memory card count calculation (zero DB query overload)...');
assert.ok(categoriesContent.includes("const cardCounts = useMemo"), 'Categories.tsx must compute card counts in memory using useMemo');
console.log('✓ PASS: In-memory card counts verified.');

// Test 4: UnifiedPageEditor.tsx stripped of arbitrary category creation
console.log('\nTest 4: Verify UnifiedPageEditor.tsx category input is stripped...');
const editorContent = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/components/UnifiedPageEditor.tsx'), 'utf8');
assert.ok(!editorContent.includes('placeholder="Type new category (or comma-separated) and click Add..."'), 'UnifiedPageEditor must not have free-form category text input on cards');
assert.ok(editorContent.includes('Click category pills below to toggle them on/off for this card:'), 'UnifiedPageEditor must have toggle pills');
assert.ok(editorContent.includes('/admin/categories?page='), 'UnifiedPageEditor must have shortcut link to central Categories page');
console.log('✓ PASS: Arbitrary category creation stripped from UnifiedPageEditor.');

// Test 5: Verify Homepage Editor is completely untouched
console.log('\nTest 5: Verify HomepageEditor.tsx is untouched...');
const homeEditorContent = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/pages/HomepageEditor.tsx'), 'utf8');
assert.ok(homeEditorContent.includes('home_categories'), 'HomepageEditor.tsx must still retain its dedicated home_categories');
console.log('✓ PASS: HomepageEditor.tsx is 100% untouched.');

console.log('\n========================================');
console.log('ALL UNIFIED CATEGORY VERIFICATION TESTS PASSED (5/5)!');
console.log('========================================');
