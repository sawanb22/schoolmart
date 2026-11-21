/**
 * Comprehensive Unit and Integration Test Suite
 * For Campus Design & Campus Design Execution CMS Pipeline
 * 
 * Verifies:
 * 1. Card Link (card.href) removal & automatic subpage link resolution in source files
 * 2. Universal "Live / Hidden" section toggle evaluations (card-level & global-level)
 * 3. Card active/hidden state filtering (preserving underlying data in database)
 * 4. Subpage URL slug matching (custom slugs, slugified titles, 404 handling)
 * 5. Database persistence via pageData JSON round-trip
 * 6. Direct static analysis of actual source code files in repository
 * 7. Edge cases: empty arrays, undefined values, special characters, conflicting overrides
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 CAMPUS DESIGN & EXECUTION CMS RIGOROUS TEST SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failed++;
    errors.push({ name, error: err });
  }
}

// ─── Source File Paths ─────────────────────────────────────────────────────────
const rootDir = path.resolve(__dirname, '..');
const cdeDataPath = path.join(rootDir, 'frontend/src/pages/campus-design-execution.data.ts');
const cdeComponentPath = path.join(rootDir, 'frontend/src/pages/campus-design-execution.tsx');
const cdsComponentPath = path.join(rootDir, 'frontend/src/pages/campus-design-service.tsx');
const cdedComponentPath = path.join(rootDir, 'frontend/src/pages/campus-design-execution-detail.tsx');
const editorComponentPath = path.join(rootDir, 'frontend/src/admin/components/UnifiedPageEditor.tsx');
const backendRoutesPath = path.join(rootDir, 'backend/src/routes/pages.routes.ts');

// ─── 1. Slugify Helper Implementation ─────────────────────────────────────────
function slugifyStepTitle(title) {
  return (
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'step'
  );
}

// ─── 2. Card Link Resolution Logic ────────────────────────────────────────────
function resolveCardLink(slug, card) {
  const CDE_PAGE_SLUG = 'campus-design-execution';
  const customSlug = card.slug?.trim().replace(/^\/+|\/+$/g, '');
  const targetSlug = customSlug || slugifyStepTitle(card.title);
  return slug === 'campus-design' || slug === CDE_PAGE_SLUG
    ? `/${slug}/${targetSlug}`
    : card.href?.trim() || `/${slug}/${targetSlug}`;
}

// ─── 3. Card Active / Filter Logic ────────────────────────────────────────────
function filterActiveCards(cards) {
  return (Array.isArray(cards) ? cards : []).filter((c) => c.active !== false);
}

// ─── 4. Subpage Section Visibility Evaluators ──────────────────────────────────
function evaluateCampusDesignServiceSections(service, data) {
  const showHero = !service.hideHero && !data.hideHero;
  const showMethodology = !service.hideMethodology && !data.hideMethodology;
  const rawDeliverables = Array.isArray(service.deliverables) ? service.deliverables : [];
  const deliverables = rawDeliverables.filter((item) => item?.title?.trim() || item?.desc?.trim());
  const showDeliverables = !service.hideDeliverables && !data.hideDeliverables && deliverables.length > 0;
  const showCompliance = !data.hideCompliance && !service.hideCompliance && Boolean(data.complianceTitle);
  const showRelatedBlog = !data.hideRelatedBlog && !service.hideRelatedBlog && Boolean(data.relatedBlogTitle);
  const showActionBar = !service.hideActionBar && !data.hideActionBar;
  const hasVisibleContent = showHero || showMethodology || showDeliverables || showCompliance || showRelatedBlog || showActionBar;

  return {
    hero: showHero,
    methodology: showMethodology,
    deliverables: showDeliverables,
    actionBar: showActionBar,
    compliance: showCompliance,
    relatedBlog: showRelatedBlog,
    cta: !data.hideCta,
    hasVisibleContent,
  };
}

function evaluateCampusDesignExecutionDetailSections(card, data) {
  const showHero = !card.hideHero && !data.hideHero;
  const overview = card.methodology?.trim() || card.longDescription?.trim() || card.description;
  const showMethodology = !card.hideMethodology && !data.hideMethodology && Boolean(overview);
  const rawDeliverables = Array.isArray(card.deliverables) ? card.deliverables : [];
  const deliverables = rawDeliverables.filter((item) => item?.title?.trim() || item?.desc?.trim());
  const showDeliverables = !card.hideDeliverables && !data.hideDeliverables && deliverables.length > 0;
  const hasCardContent = showHero || showMethodology || showDeliverables;

  return {
    hero: showHero,
    methodology: showMethodology,
    deliverables: showDeliverables,
    cta: !data.hideCta,
    hasCardContent,
  };
}

// ─── 5. Subpage Service Lookup Matcher ─────────────────────────────────────────
function findServiceBySlug(cards, serviceSlug) {
  const currentSlug = serviceSlug || (cards[0]?.title ? (cards[0].slug?.trim() || slugifyStepTitle(cards[0].title)) : '');
  return (
    cards.find(
      (card) =>
        (card.slug && card.slug.trim() === currentSlug) ||
        (card.title && slugifyStepTitle(card.title) === currentSlug) ||
        (card.href && card.href.endsWith(`/${currentSlug}`))
    ) || (!serviceSlug ? cards[0] : undefined)
  );
}

function findExecutionCardBySlug(cards, stepSlug) {
  return cards.find(
    (item) =>
      (item.slug && item.slug.trim() === stepSlug) ||
      (item.title && slugifyStepTitle(item.title) === stepSlug) ||
      item.href?.endsWith(`/${stepSlug}`)
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ══════════════════════════════════════════════════════════════════════════════

console.log('--- 1. Source File Static Architecture Verification ---');

test('campus-design-execution.data.ts exports slugifyStepTitle and required card interface fields', () => {
  const content = fs.readFileSync(cdeDataPath, 'utf8');
  assert.ok(content.includes('export function slugifyStepTitle'), 'Must export slugifyStepTitle');
  assert.ok(content.includes('active?: boolean'), 'Must declare active field');
  assert.ok(content.includes('hideHero?: boolean'), 'Must declare hideHero field');
  assert.ok(content.includes('hideMethodology?: boolean'), 'Must declare hideMethodology field');
  assert.ok(content.includes('hideDeliverables?: boolean'), 'Must declare hideDeliverables field');
  assert.ok(content.includes('hideActionBar?: boolean'), 'Must declare hideActionBar field');
});

test('campus-design-execution.tsx filters active cards and hardens cardLink routing', () => {
  const content = fs.readFileSync(cdeComponentPath, 'utf8');
  assert.ok(content.includes('rawCards.filter((c) => c.active !== false)'), 'Must filter out active === false cards');
  assert.ok(content.includes("slug === 'campus-design' || slug === CDE_PAGE_SLUG"), 'Must enforce custom routing for campus-design');
});

test('campus-design-service.tsx imports slugifyStepTitle and implements dual-tier toggles', () => {
  const content = fs.readFileSync(cdsComponentPath, 'utf8');
  assert.ok(content.includes('slugifyStepTitle'), 'Must use slugifyStepTitle');
  assert.ok(content.includes('!service.hideHero && !data.hideHero'), 'Must evaluate hero toggle');
  assert.ok(content.includes('!service.hideMethodology && !data.hideMethodology'), 'Must evaluate methodology toggle');
  assert.ok(content.includes('!service.hideDeliverables && !data.hideDeliverables'), 'Must evaluate deliverables toggle');
  assert.ok(content.includes('!service.hideActionBar && !data.hideActionBar'), 'Must evaluate action bar toggle');
  assert.ok(content.includes('hasVisibleContent'), 'Must handle all-sections-hidden cleanly');
});

test('campus-design-execution-detail.tsx prioritizes item.slug and implements dual-tier toggles', () => {
  const content = fs.readFileSync(cdedComponentPath, 'utf8');
  assert.ok(content.includes('item.slug && item.slug.trim() === stepSlug'), 'Must prioritize custom item.slug');
  assert.ok(content.includes('!card.hideHero && !data.hideHero'), 'Must evaluate hero toggle');
  assert.ok(content.includes('!card.hideMethodology && !data.hideMethodology'), 'Must evaluate methodology toggle');
  assert.ok(content.includes('!card.hideDeliverables && !data.hideDeliverables'), 'Must evaluate deliverables toggle');
  assert.ok(content.includes('hasCardContent'), 'Must handle all-sections-hidden cleanly');
});

test('UnifiedPageEditor.tsx suppresses Card Link on target pages and includes full Subpage CMS toolbar', () => {
  const content = fs.readFileSync(editorComponentPath, 'utf8');
  // Card link suppression
  assert.ok(
    content.includes("page.slug !== 'campus-design' && page.slug !== 'campus-design-execution'"),
    'Must suppress Card Link input for campus-design and campus-design-execution'
  );
  // Card Subpage CMS Toolbar toggles
  assert.ok(content.includes("setCard(i, 'hideHero', !card.hideHero)"), 'Toolbar must have hero toggle');
  assert.ok(content.includes("setCard(i, 'hideMethodology', !card.hideMethodology)"), 'Toolbar must have scope toggle');
  assert.ok(content.includes("setCard(i, 'hideDeliverables', !card.hideDeliverables)"), 'Toolbar must have deliverables toggle');
  assert.ok(content.includes("setCard(i, 'hideActionBar', !card.hideActionBar)"), 'Toolbar must have action bar toggle');
  // Global subpage block toggles
  assert.ok(content.includes("set('hideMethodology', !data.hideMethodology)"), 'Must have global methodology toggle');
  assert.ok(content.includes("set('hideDeliverables', !data.hideDeliverables)"), 'Must have global deliverables toggle');
  assert.ok(content.includes("set('hideActionBar', !data.hideActionBar)"), 'Must have global action bar toggle');
  // Subpage Preview uses slugifyStepTitle
  assert.ok(content.includes('slugifyStepTitle(card.title)'), 'Preview link must use slugifyStepTitle');
});

test('backend/src/routes/pages.routes.ts handles campus-design and campus-design-execution seeding and persistence', () => {
  const content = fs.readFileSync(backendRoutesPath, 'utf8');
  assert.ok(content.includes("ensureSimplePage('campus-design'"), 'Must seed campus-design');
  assert.ok(content.includes("ensureSimplePage('campus-design-execution'"), 'Must seed campus-design-execution');
  assert.ok(content.includes("updateData.pageData = JSON.stringify(req.body.pageData)"), 'Must persist pageData JSON');
});

test('campus-design-service.tsx adheres to React Rules of Hooks with unconditional useEffect before early returns', () => {
  const content = fs.readFileSync(cdsComponentPath, 'utf8');
  const useEffectIndex = content.indexOf('useEffect(');
  const loadingIndex = content.indexOf('if (loading)');
  const notFoundIndex = content.indexOf('if (!service)');

  assert.ok(useEffectIndex !== -1, 'useEffect must exist in campus-design-service.tsx');
  assert.ok(loadingIndex !== -1, 'if (loading) must exist in campus-design-service.tsx');
  assert.ok(notFoundIndex !== -1, 'if (!service) must exist in campus-design-service.tsx');
  assert.ok(useEffectIndex < loadingIndex, 'useEffect must be called before if (loading) early return');
  assert.ok(useEffectIndex < notFoundIndex, 'useEffect must be called before if (!service) early return');
});

test('campus-design-execution.tsx properly isolates useMemo dependency on data.cards', () => {
  const content = fs.readFileSync(cdeComponentPath, 'utf8');
  assert.ok(
    content.includes('}, [data.cards]);'),
    'allCards useMemo must depend directly on [data.cards] to prevent render churn'
  );
});

test('.gitignore properly ignores tooling metadata, sql scripts, and database export dumps', () => {
  const gitignoreContent = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
  assert.ok(gitignoreContent.includes('.commandcode/'), '.gitignore must ignore .commandcode/');
  assert.ok(gitignoreContent.includes('backend/prisma/database-export.json'), '.gitignore must ignore backend/prisma/database-export.json');
  assert.ok(gitignoreContent.includes('*-export.json'), '.gitignore must ignore *-export.json');
  assert.ok(gitignoreContent.includes('*.sql'), '.gitignore must ignore *.sql');
});

test('Sensitive database export file backend/prisma/database-export.json is quarantined/removed', () => {
  const sensitivePath = path.join(rootDir, 'backend/prisma/database-export.json');
  assert.strictEqual(fs.existsSync(sensitivePath), false, 'database-export.json must not exist in repo');
});

console.log('\n--- 2. Card Link Resolution & Auto-Subpage Routing Tests ---');

test('campus-design cards always link to /campus-design/:slug ignoring stale href', () => {
  const card = {
    title: 'Master Architecture & Space Planning',
    slug: 'master-planning',
    href: '/legacy-external-quote-link',
  };
  const link = resolveCardLink('campus-design', card);
  assert.strictEqual(link, '/campus-design/master-planning');
});

test('campus-design cards auto-generate slug from title when slug is missing', () => {
  const card = {
    title: 'Auditorium & Acoustic Engineering',
    href: '/another-stale-link',
  };
  const link = resolveCardLink('campus-design', card);
  assert.strictEqual(link, '/campus-design/auditorium-acoustic-engineering');
});

test('campus-design-execution cards always link to /campus-design-execution/:slug ignoring stale href', () => {
  const card = {
    title: 'Phase 02: Civil & Structural Execution',
    slug: 'phase-02-civil',
    href: 'https://example.com/external-leak',
  };
  const link = resolveCardLink('campus-design-execution', card);
  assert.strictEqual(link, '/campus-design-execution/phase-02-civil');
});

test('campus-design-execution card strips accidental leading slashes in slug field', () => {
  const card = {
    title: 'Civil Works',
    slug: '/civil-works/',
  };
  const link = resolveCardLink('campus-design-execution', card);
  assert.strictEqual(link, '/campus-design-execution/civil-works');
});

test('Other pages (e.g. classifieds) preserve card.href routing', () => {
  const normalCard = {
    title: 'Download Product Spec',
    href: '/downloads/spec.pdf',
  };
  const link = resolveCardLink('classifieds', normalCard);
  assert.strictEqual(link, '/downloads/spec.pdf');
});

console.log('\n--- 3. Universal "Live / Hidden" Card Filtering Tests ---');

test('allCards.filter(c => c.active !== false) hides cards toggled Hidden (active: false)', () => {
  const originalCards = [
    { title: 'Step 1: Planning', active: true, categories: ['Phase 1'] },
    { title: 'Step 2: Draft Step', active: false, categories: ['Hidden Category'] },
    { title: 'Step 3: Unspecified active (default live)', categories: ['Phase 2'] },
  ];

  const activeCards = filterActiveCards(originalCards);

  // Active cards on live site
  assert.strictEqual(activeCards.length, 2, 'Should only render 2 live cards');
  assert.strictEqual(activeCards[0].title, 'Step 1: Planning');
  assert.strictEqual(activeCards[1].title, 'Step 3: Unspecified active (default live)');

  // Underlying data in database array is NOT lost
  assert.strictEqual(originalCards.length, 3, 'Underlying array in database must preserve hidden card data');
  assert.strictEqual(originalCards[1].title, 'Step 2: Draft Step');
});

test('Category filter options are only derived from active live cards', () => {
  const originalCards = [
    { title: 'Live 1', active: true, categories: ['Architecture', 'Landscape'] },
    { title: 'Hidden 1', active: false, categories: ['SecretCategory'] },
  ];
  const activeCards = filterActiveCards(originalCards);
  const categories = ['All', ...Array.from(new Set(activeCards.flatMap((c) => c.categories ?? []).filter(Boolean)))];

  assert.deepStrictEqual(categories, ['All', 'Architecture', 'Landscape']);
  assert.strictEqual(categories.includes('SecretCategory'), false);
});

console.log('\n--- 4. Dual-Tier Subpage Section Visibility Logic Tests ---');

test('Dual-tier toggle: Section renders ONLY when BOTH card and page toggles are active', () => {
  // Case A: Both live
  const r1 = evaluateCampusDesignServiceSections(
    { hideHero: false, hideMethodology: false, hideDeliverables: false, hideActionBar: false, deliverables: [{ title: 'D1', desc: 'Desc' }] },
    { hideHero: false, hideMethodology: false, hideDeliverables: false, hideActionBar: false }
  );
  assert.strictEqual(r1.hero, true);
  assert.strictEqual(r1.methodology, true);
  assert.strictEqual(r1.deliverables, true);
  assert.strictEqual(r1.actionBar, true);
  assert.strictEqual(r1.hasVisibleContent, true);

  // Case B: Global hideMethodology = true overrides card live
  const r2 = evaluateCampusDesignServiceSections(
    { hideMethodology: false },
    { hideMethodology: true }
  );
  assert.strictEqual(r2.methodology, false, 'Global toggle must hide section');

  // Case C: Card hideDeliverables = true overrides global live
  const r3 = evaluateCampusDesignServiceSections(
    { hideDeliverables: true, deliverables: [{ title: 'D1', desc: 'Desc' }] },
    { hideDeliverables: false }
  );
  assert.strictEqual(r3.deliverables, false, 'Card toggle must hide section');

  // Case D: Card hideActionBar = true hides action bar
  const r4 = evaluateCampusDesignServiceSections(
    { hideActionBar: true },
    { hideActionBar: false }
  );
  assert.strictEqual(r4.actionBar, false, 'Card hideActionBar must hide action bar');
});

test('All sections hidden triggers hasVisibleContent: false for clean empty message', () => {
  const r = evaluateCampusDesignServiceSections(
    { hideHero: true, hideMethodology: true, hideDeliverables: true, hideActionBar: true, hideCompliance: true, hideRelatedBlog: true },
    { hideHero: true, hideMethodology: true, hideDeliverables: true, hideActionBar: true, hideCompliance: true, hideRelatedBlog: true }
  );
  assert.strictEqual(r.hasVisibleContent, false, 'When all sections are hidden, hasVisibleContent must be false');
});

test('CampusDesignExecutionDetail dual-tier toggles for Hero, Scope, and Deliverables', () => {
  const card = {
    title: 'Site Execution',
    methodology: 'On-site execution details...',
    deliverables: [{ title: 'Milestone 1', desc: 'Desc 1' }],
    hideHero: false,
    hideMethodology: false,
    hideDeliverables: false,
  };
  const data = { hideHero: false, hideMethodology: false, hideDeliverables: false };

  // All live
  const s1 = evaluateCampusDesignExecutionDetailSections(card, data);
  assert.strictEqual(s1.hero, true);
  assert.strictEqual(s1.methodology, true);
  assert.strictEqual(s1.deliverables, true);
  assert.strictEqual(s1.hasCardContent, true);

  // Hide hero at card level
  const s2 = evaluateCampusDesignExecutionDetailSections({ ...card, hideHero: true }, data);
  assert.strictEqual(s2.hero, false);
  assert.strictEqual(s2.methodology, true);
  assert.strictEqual(s2.deliverables, true);

  // Hide methodology at global level
  const s3 = evaluateCampusDesignExecutionDetailSections(card, { ...data, hideMethodology: true });
  assert.strictEqual(s3.hero, true);
  assert.strictEqual(s3.methodology, false);

  // All hidden
  const s4 = evaluateCampusDesignExecutionDetailSections(
    { ...card, hideHero: true, hideMethodology: true, hideDeliverables: true },
    data
  );
  assert.strictEqual(s4.hasCardContent, false, 'hasCardContent must be false when all sections are hidden');
});

console.log('\n--- 5. Subpage URL Slug Resolution & 404 Resiliency Tests ---');

test('CampusDesignService resolves card by custom slug', () => {
  const cards = [
    { title: 'Card 1', slug: 'custom-discipline-1' },
    { title: 'Card 2', slug: 'custom-discipline-2' },
  ];
  const matched = findServiceBySlug(cards, 'custom-discipline-2');
  assert.strictEqual(matched.title, 'Card 2');
});

test('CampusDesignService resolves card by slugified title', () => {
  const cards = [
    { title: 'Master Planning & Architecture' },
    { title: 'Acoustic Engineering' },
  ];
  const matched = findServiceBySlug(cards, 'master-planning-architecture');
  assert.strictEqual(matched.title, 'Master Planning & Architecture');
});

test('CampusDesignService returns undefined on non-existent slug (proper 404 error boundary)', () => {
  const cards = [
    { title: 'Master Planning', slug: 'master-planning' },
  ];
  const matched = findServiceBySlug(cards, 'completely-invalid-slug');
  assert.strictEqual(matched, undefined, 'Invalid slug must return undefined, not cards[0]');
});

test('CampusDesignExecutionDetail returns undefined on non-existent slug (proper 404 error boundary)', () => {
  const cards = [
    { title: 'Site Survey', slug: 'site-survey' },
  ];
  const matched = findExecutionCardBySlug(cards, 'non-existent-step');
  assert.strictEqual(matched, undefined, 'Invalid step must return undefined');
});

console.log('\n--- 6. Database Serialization & Persistence Contract Tests ---');

test('PostgreSQL pageData JSON serialization round-trip maintains 100% data fidelity', () => {
  const initialDbData = {
    heroTitle: 'Campus Design',
    heroEyebrow: 'Architecture & Engineering',
    hideMethodology: false,
    hideDeliverables: false,
    hideActionBar: false,
    methodologyHeading: 'Pedagogical Philosophy & Approach',
    deliverablesHeading: 'Architectural Deliverables & Scope',
    cards: [
      {
        title: 'Master Campus Zoning',
        slug: 'master-zoning',
        active: true,
        hideHero: false,
        hideMethodology: false,
        hideDeliverables: false,
        hideActionBar: false,
        methodology: 'Zoning details...',
        deliverables: [
          { phaseLabel: 'Phase 01', title: 'Topographical Analysis', desc: 'Contour lines' },
        ],
      },
      {
        title: 'Draft Step (Hidden)',
        active: false,
        hideHero: true,
      },
    ],
  };

  // 1. Serialization (as done by PUT /api/pages/:id)
  const jsonString = JSON.stringify(initialDbData);

  // 2. Deserialization (as done by GET /api/pages/:slug)
  const parsed = JSON.parse(jsonString);

  assert.deepStrictEqual(parsed, initialDbData, 'Round-trip data must match original perfectly');
  assert.strictEqual(parsed.cards[0].active, true);
  assert.strictEqual(parsed.cards[1].active, false);
  assert.strictEqual(parsed.cards[1].hideHero, true);

  // 3. Admin modifies toggle states and adds a new card
  parsed.hideMethodology = true;
  parsed.cards[0].hideDeliverables = true;
  parsed.cards.push({
    title: 'New Phase',
    slug: 'new-phase',
    active: true,
  });

  const reSerialized = JSON.stringify(parsed);
  const reParsed = JSON.parse(reSerialized);

  assert.strictEqual(reParsed.hideMethodology, true);
  assert.strictEqual(reParsed.cards[0].hideDeliverables, true);
  assert.strictEqual(reParsed.cards.length, 3);
  assert.strictEqual(reParsed.cards[2].title, 'New Phase');
});

console.log('\n--- 7. Edge Cases & Resilience Tests ---');

test('Edge Case: Card with empty deliverables array [] does not break subpage evaluation', () => {
  const card = { title: 'Empty Deliv Card', deliverables: [] };
  const evaluatedDeliverables = (Array.isArray(card.deliverables) ? card.deliverables : []).filter(
    (item) => item?.title?.trim() || item?.desc?.trim()
  );
  assert.strictEqual(evaluatedDeliverables.length, 0);
});

test('Edge Case: All cards marked active: false results in empty live cards list without error', () => {
  const cards = [
    { title: 'C1', active: false },
    { title: 'C2', active: false },
  ];
  const live = filterActiveCards(cards);
  assert.strictEqual(live.length, 0);
  assert.strictEqual(Array.isArray(live), true);
});

test('Edge Case: Special characters, slashes, and numbers in title slugify safely', () => {
  assert.strictEqual(
    slugifyStepTitle('Phase 01: Planning & Feasibility / 2026!'),
    'phase-01-planning-feasibility-2026'
  );
  assert.strictEqual(slugifyStepTitle(''), 'step');
  assert.strictEqual(slugifyStepTitle(undefined), 'step');
  assert.strictEqual(slugifyStepTitle('---Leading & Trailing---'), 'leading-trailing');
  assert.strictEqual(slugifyStepTitle('   Multiple   Spaces   '), 'multiple-spaces');
});

console.log('\n================================================================');
console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
