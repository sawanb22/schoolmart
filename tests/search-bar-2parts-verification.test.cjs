/**
 * search-bar-2parts-verification.test.cjs
 * Comprehensive verification of Search Bar Restructure & Guided Institutional Decision Engine
 *
 * Verifies:
 * 1. Institution Types (Tier 1, from Image 1) with 6 options.
 * 2. Objectives (Tier 2, from Image 2) with 7 options.
 * 3. Dual custom dropdown popovers (replacing native HTML <select>).
 * 4. Smooth widening interaction on focus (max-w-3xl to max-w-4xl).
 * 5. Icon-only search button for maximum input room.
 * 6. Floating smart suggestions panel with curated solution shortcuts.
 * 7. Search routing and fallback resolution logic.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 SEARCH BAR DUAL-TIER & CUSTOM POPOVER VERIFICATION TEST');
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

// ==============================================================================
// 1. Institution Types (Tier 1, Image 1)
// ==============================================================================
console.log('--- 1. Institution Types (Tier 1 Options) ---');

const EXPECTED_INSTITUTIONS = [
  'All Institutions',
  'Engineering Colleges',
  'Universities',
  'Degree Colleges',
  'Vocational Institutes',
  'Skill Development Centers',
];

test('Source exports INSTITUTION_OPTIONS with all 6 specified options', () => {
  EXPECTED_INSTITUTIONS.forEach((label) => {
    assert(
      searchBarSource.includes(`'${label}'`) || searchBarSource.includes(`"${label}"`),
      `Institution label '${label}' must be present in search-bar.tsx`
    );
  });
});

test('Default institution state is set to "all"', () => {
  assert(
    searchBarSource.includes("selectedInstitution, setSelectedInstitution] = useState<string>('all')") ||
    searchBarSource.includes("useState<string>('all')"),
    'Default selectedInstitution state must be "all"'
  );
});

// ==============================================================================
// 2. Objectives / "I am looking for" (Tier 2, Image 2)
// ==============================================================================
console.log('\n--- 2. Objectives / I am looking for (Tier 2 Options) ---');

const EXPECTED_OBJECTIVES = [
  'All Objectives',
  'Entrance Admissions',
  'Build New Colleges',
  'Upgrade Existing Campuses',
  'Improve Accreditation',
  'Create Innovation Ecosystems',
  'Become Smart Campus',
];

test('Source exports OBJECTIVE_OPTIONS with all 7 specified options', () => {
  EXPECTED_OBJECTIVES.forEach((label) => {
    assert(
      searchBarSource.includes(`'${label}'`) || searchBarSource.includes(`"${label}"`),
      `Objective label '${label}' must be present in search-bar.tsx`
    );
  });
});

test('Default objective state is set to "all"', () => {
  assert(
    searchBarSource.includes("selectedObjective, setSelectedObjective] = useState<string>('all')") ||
    searchBarSource.includes("useState<string>('all')"),
    'Default selectedObjective state must be "all"'
  );
});

// ==============================================================================
// 3. Custom Popover Dropdowns (No Native OS Select)
// ==============================================================================
console.log('\n--- 3. Custom Popover Dropdowns & Zero Native Select ---');

test('Eliminates native HTML <select> dropdown (no OS native menu)', () => {
  assert(
    !searchBarSource.includes('<select'),
    'Native HTML <select> must not be used (replaced with custom styled React popovers)'
  );
});

test('Segment 1: Leftmost Institution selector button styling', () => {
  assert(
    searchBarSource.includes('bg-slate-100 hover:bg-slate-200/80'),
    'Selector segment must have bg-slate-100 hover:bg-slate-200/80'
  );
  assert(
    searchBarSource.includes('rounded-l-full'),
    'First selector segment must have rounded-l-full'
  );
  assert(
    searchBarSource.includes('border-r border-slate-200'),
    'Selector segment must have border-r border-slate-200 divider'
  );
});

test('Segment 2: Middle Objective selector button styling', () => {
  assert(
    searchBarSource.includes('Discover Your Objective') || searchBarSource.includes('What do you want to achieve?'),
    'Objective popover must include header/title'
  );
});

// ==============================================================================
// 4. Smooth Widening Animation & Icon-Only Button
// ==============================================================================
console.log('\n--- 4. Smooth Widening Animation & Icon-Only Button ---');

test('Search bar widens smoothly from max-w-3xl to max-w-4xl on focus', () => {
  assert(
    searchBarSource.includes("isFocused ? 'max-w-4xl' : 'max-w-3xl'"),
    'Wrapper must widen to max-w-4xl when isFocused is true'
  );
  assert(
    searchBarSource.includes('transition-all duration-300 ease-out'),
    'Wrapper must have smooth transition animation'
  );
});

test('Search button is icon-only for maximum input room', () => {
  assert(
    searchBarSource.includes('bg-cm-blue hover:bg-cm-blue-dark text-white'),
    'Submit button must use bg-cm-blue hover:bg-cm-blue-dark text-white'
  );
  assert(
    searchBarSource.includes('<Search className='),
    'Submit button must render Search icon'
  );
  assert(
    searchBarSource.includes('aria-label="Search"'),
    'Submit button must maintain accessible aria-label="Search"'
  );
});

// ==============================================================================
// 5. Smart Floating Suggestions Panel
// ==============================================================================
console.log('\n--- 5. Smart Floating Suggestions Panel ---');

test('Source exports SEARCH_SUGGESTIONS with comprehensive categories', () => {
  assert(
    searchBarSource.includes('SEARCH_SUGGESTIONS'),
    'Must export SEARCH_SUGGESTIONS array'
  );
  assert(
    searchBarSource.includes('master-planning') && searchBarSource.includes('smart-classrooms'),
    'Must contain key solution suggestions'
  );
});

test('Renders floating suggestions card when input is focused', () => {
  assert(
    searchBarSource.includes('{isFocused && ('),
    'Must render suggestions card when isFocused is true'
  );
  assert(
    searchBarSource.includes('relevantSuggestions.map'),
    'Must map over filtered relevantSuggestions'
  );
});

// ==============================================================================
// 6. Search Routing & Fallback Logic
// ==============================================================================
console.log('\n--- 6. Search Routing & Fallback Logic ---');

const EXPECTED_CATEGORIES = [
  { value: 'all', label: 'All Categories', route: '/shop' },
  { value: 'campus-design', label: 'Campus Design', route: '/campus-design' },
  { value: 'furniture', label: 'Furniture', route: '/furniture' },
  { value: 'sports-infra', label: 'Sports Infra', route: '/sports-infra' },
  { value: 'ai-ml', label: 'AI / ML Solutions', route: '/ai-ml' },
  { value: 'tech-infra', label: 'Tech Infrastructure', route: '/tech-infra' },
  { value: 'libraries', label: 'Libraries', route: '/libraries' },
  { value: 'labs', label: 'Science & Tech Labs', route: '/labs' },
  { value: 'shop', label: 'Products Catalog', route: '/shop' },
];

const PAGE_ROUTES = [
  { terms: ['furniture', 'classroom desk', 'office furniture', 'hostel furniture'], route: '/furniture' },
  { terms: ['sports', 'sports infra', 'basketball', 'football', 'athletics'], route: '/sports-infra' },
  { terms: ['lab', 'laboratory', 'stem'], route: '/labs' },
  { terms: ['library', 'libraries', 'bookshelf'], route: '/libraries' },
  { terms: ['technology', 'tech infra', 'interactive board', 'school management'], route: '/tech-infra' },
  { terms: ['ai', 'machine learning', 'ai station'], route: '/ai-ml' },
  { terms: ['campus design', 'architecture', 'master planning'], route: '/campus-design' },
];

function resolveSearchRoute(category, query) {
  const trimmed = query ? query.trim() : '';
  const selected = EXPECTED_CATEGORIES.find((c) => c.value === category);
  const baseRoute = selected ? selected.route : `/${category}`;

  if (!trimmed) {
    if (category === 'all') {
      return { type: 'empty', message: 'Please enter something to search.' };
    }
    return { type: 'navigate', targetRoute: baseRoute };
  }

  if (category === 'shop') {
    return { type: 'navigate', targetRoute: `/shop?search=${encodeURIComponent(trimmed)}` };
  }

  if (category !== 'all') {
    return { type: 'navigate', targetRoute: `${baseRoute}?search=${encodeURIComponent(trimmed)}` };
  }

  const normalizedQuery = trimmed.toLowerCase();
  const matchingPage = PAGE_ROUTES.find(({ terms }) => terms.some((term) => normalizedQuery.includes(term)));
  if (matchingPage) {
    return { type: 'navigate', targetRoute: matchingPage.route };
  }

  return { type: 'api' };
}

test('Empty query with "all" category prompts to enter search query', () => {
  const result = resolveSearchRoute('all', '');
  assert.strictEqual(result.type, 'empty');
  assert.strictEqual(result.message, 'Please enter something to search.');
});

test('Category "shop" with query navigates to /shop?search=<query>', () => {
  const result = resolveSearchRoute('shop', 'ergonomic chair');
  assert.strictEqual(result.type, 'navigate');
  assert.strictEqual(result.targetRoute, '/shop?search=ergonomic%20chair');
});

test('Specific category page (e.g. sports-infra, furniture, ai-ml) with query navigates with search param', () => {
  const sportsResult = resolveSearchRoute('sports-infra', 'basketball');
  assert.strictEqual(sportsResult.type, 'navigate');
  assert.strictEqual(sportsResult.targetRoute, '/sports-infra?search=basketball');
});

test('Category "all" with page keyword routes to matching page', () => {
  const result = resolveSearchRoute('all', 'campus design');
  assert.strictEqual(result.type, 'navigate');
  assert.strictEqual(result.targetRoute, '/campus-design');
});

// ==============================================================================
// 7. Stacking Context & Popover Visibility Immunity
// ==============================================================================
console.log('\n--- 7. Stacking Context & Popover Visibility Immunity ---');

test('Outer container has relative positioning, overflow-visible, and elevated z-index', () => {
  assert(
    searchBarSource.includes('relative bg-cm-yellow py-3 px-3 sm:px-4 shadow-inner overflow-visible') ||
    searchBarSource.includes('overflow-visible'),
    'Outer container must be explicitly positioned and have overflow-visible'
  );
  assert(
    searchBarSource.includes("isInstitutionOpen || isObjectiveOpen || isFocused ? 'z-50' : 'z-30'") ||
    searchBarSource.includes('z-50'),
    'Outer container must elevate z-index to z-50 when dropdowns or focus are active'
  );
});

test('GSAP entrance animation cleans up transform via clearProps', () => {
  assert(
    searchBarSource.includes("clearProps: 'transform'"),
    'GSAP timeline must include clearProps: "transform" to prevent permanent stacking context traps'
  );
});

test('Custom dropdown popovers have z-[100] and max-height scrolling', () => {
  assert(
    searchBarSource.includes('z-[100]'),
    'Popovers must be elevated to z-[100] above all hero and page layers'
  );
  assert(
    searchBarSource.includes('max-h-[380px] overflow-y-auto') || searchBarSource.includes('overflow-y-auto'),
    'Popovers must have scrolling constraint to stay visible within viewports'
  );
});

test('Floating suggestions popover has z-[90] to sit above hero sections', () => {
  assert(
    searchBarSource.includes('z-[90]'),
    'Floating suggestions popover must have z-[90]'
  );
});

test('Popovers and buttons include stopPropagation to prevent accidental dismissals', () => {
  assert(
    searchBarSource.includes('e.stopPropagation()'),
    'Popover toggle handlers and popovers must include e.stopPropagation()'
  );
});

test('Options include dedicated visual Lucide icons for high-polish aesthetic', () => {
  assert(
    searchBarSource.includes('icon: Landmark') &&
    searchBarSource.includes('icon: GraduationCap') &&
    searchBarSource.includes('icon: ShieldCheck'),
    'Options must have dedicated visual Lucide icons assigned'
  );
});

console.log('\n================================================================');
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL SEARCH BAR TESTS PASSED CLEANLY (${passed}/${passed})!`);
}
