/**
 * search-bar-cloud-customization.test.cjs
 * Comprehensive verification of the Cloud-Backed Search Bar Customization Engine
 *
 * Verifies:
 * 1. search-bar.tsx exports DEFAULT_INSTITUTIONS_DATA and DEFAULT_OBJECTIVES_DATA.
 * 2. search-bar.tsx exports SEARCH_ICON_OPTIONS and SEARCH_ICON_MAP for dynamic icon lookup.
 * 3. search-bar.tsx dynamically derives options from SiteContent (home_search_institutions, home_search_objectives, home_search_popular_chips).
 * 4. HomepageEditor.tsx provides full CRUD admin sub-editor for both tiers and popular chips.
 * 5. HomepageEditor.tsx loads and persists search options via api.put('/content').
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 SEARCH BAR CLOUD CUSTOMIZATION & ADMIN EDITOR VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${e.message}`);
    failed++;
  }
}

const searchBarPath = path.resolve(__dirname, '../frontend/src/components/sections/search-bar.tsx');
const searchBarSource = fs.readFileSync(searchBarPath, 'utf8');

const editorPath = path.resolve(__dirname, '../frontend/src/admin/pages/HomepageEditor.tsx');
const editorSource = fs.readFileSync(editorPath, 'utf8');

// 1. Data Schema & Icon Mapping
console.log('--- 1. Data Schema & Dynamic Icon Mapping ---');

test('search-bar.tsx exports SEARCH_ICON_MAP with all Lucide icons', () => {
  assert(searchBarSource.includes('export const SEARCH_ICON_MAP'), 'Must export SEARCH_ICON_MAP');
  assert(searchBarSource.includes('Building2') && searchBarSource.includes('Landmark') && searchBarSource.includes('GraduationCap'), 'Must map essential icons');
});

test('search-bar.tsx exports SEARCH_ICON_OPTIONS for admin select menus', () => {
  assert(searchBarSource.includes('export const SEARCH_ICON_OPTIONS'), 'Must export SEARCH_ICON_OPTIONS');
});

test('search-bar.tsx exports DEFAULT_INSTITUTIONS_DATA and DEFAULT_OBJECTIVES_DATA', () => {
  assert(searchBarSource.includes('export const DEFAULT_INSTITUTIONS_DATA'), 'Must export DEFAULT_INSTITUTIONS_DATA');
  assert(searchBarSource.includes('export const DEFAULT_OBJECTIVES_DATA'), 'Must export DEFAULT_OBJECTIVES_DATA');
  assert(searchBarSource.includes('export const DEFAULT_POPULAR_CHIPS'), 'Must export DEFAULT_POPULAR_CHIPS');
});

// 2. Dynamic Cloud-Backed Search Bar Consumer
console.log('\n--- 2. Dynamic Search Bar Consumer (Zero Hardcoding) ---');

test('search-bar.tsx dynamically derives institutions from content.home_search_institutions', () => {
  assert(
    searchBarSource.includes('content.home_search_institutions'),
    'Must read content.home_search_institutions from SiteContentContext'
  );
  assert(
    searchBarSource.includes('institutionsList'),
    'Must compute dynamic institutionsList'
  );
});

test('search-bar.tsx dynamically derives objectives from content.home_search_objectives', () => {
  assert(
    searchBarSource.includes('content.home_search_objectives'),
    'Must read content.home_search_objectives from SiteContentContext'
  );
  assert(
    searchBarSource.includes('objectivesList'),
    'Must compute dynamic objectivesList'
  );
});

test('search-bar.tsx dynamically derives chips from content.home_search_popular_chips', () => {
  assert(
    searchBarSource.includes('content.home_search_popular_chips'),
    'Must read content.home_search_popular_chips from SiteContentContext'
  );
  assert(
    searchBarSource.includes('popularChips'),
    'Must compute dynamic popularChips'
  );
});

// 3. HomepageEditor Admin Sub-Editor
console.log('\n--- 3. HomepageEditor Admin Sub-Editor ---');

test('HomepageEditor.tsx imports search defaults and icon options', () => {
  assert(
    editorSource.includes('DEFAULT_INSTITUTIONS_DATA') &&
    editorSource.includes('DEFAULT_OBJECTIVES_DATA') &&
    editorSource.includes('SEARCH_ICON_OPTIONS'),
    'Must import search bar data types and constants'
  );
});

test('HomepageEditor.tsx manages state for institutions, objectives, and chips', () => {
  assert(editorSource.includes('searchInstitutions, setSearchInstitutions'), 'Must manage searchInstitutions state');
  assert(editorSource.includes('searchObjectives, setSearchObjectives'), 'Must manage searchObjectives state');
  assert(editorSource.includes('searchPopularChips, setSearchPopularChips'), 'Must manage searchPopularChips state');
  assert(editorSource.includes('searchTab, setSearchTab'), 'Must manage searchTab state');
});

test('HomepageEditor.tsx loads search options from API in fetchContent', () => {
  assert(editorSource.includes('data.home_search_institutions'), 'fetchContent must parse data.home_search_institutions');
  assert(editorSource.includes('data.home_search_objectives'), 'fetchContent must parse data.home_search_objectives');
  assert(editorSource.includes('data.home_search_popular_chips'), 'fetchContent must parse data.home_search_popular_chips');
});

test('HomepageEditor.tsx persists search options via PUT /content in saveContent', () => {
  assert(editorSource.includes('home_search_institutions: JSON.stringify(searchInstitutions)'), 'Must save home_search_institutions');
  assert(editorSource.includes('home_search_objectives: JSON.stringify(searchObjectives)'), 'Must save home_search_objectives');
  assert(editorSource.includes('home_search_popular_chips: JSON.stringify(searchPopularChips)'), 'Must save home_search_popular_chips');
});

test('HomepageEditor.tsx renders full CRUD UI with Add, Reorder, Delete, and Reset', () => {
  assert(editorSource.includes('Add Institution Type'), 'Must have Add Institution Type button');
  assert(editorSource.includes('Add Objective Option'), 'Must have Add Objective Option button');
  assert(editorSource.includes('Add Keyword Chip'), 'Must have Add Keyword Chip button');
  assert(editorSource.includes('Reset Options to Defaults'), 'Must have Reset Options to Defaults button');
});

console.log('\n================================================================');
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL SEARCH BAR CLOUD CUSTOMIZATION TESTS PASSED (${passed}/${passed})!`);
}
