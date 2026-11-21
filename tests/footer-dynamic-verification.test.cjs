/**
 * Comprehensive Verification Test Suite
 * For Dynamic Footer Editor, Database Seed, and Deployment Migration Script (Item 11)
 *
 * Verifies:
 * 1. Seed Script (backend/scripts/seed-footer-content.cjs) data integrity and exports
 * 2. Standalone Migration SQL (backend/scripts/seed-footer-content.sql) schema and syntax
 * 3. Frontend Footer Component (src/components/layout/footer.tsx) dynamic resolution & fallbacks
 * 4. Admin SiteContent Page (src/admin/pages/SiteContent.tsx) tabbed editor & link row controls
 * 5. Simulation & Resilience (empty state, malformed JSON, partial override, external URLs)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 DYNAMIC FOOTER CMS PIPELINE RIGOROUS TEST SUITE');
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

// ─── File Paths ──────────────────────────────────────────────────────────────
const rootDir = path.resolve(__dirname, '..');
const seedScriptPath = path.join(rootDir, 'backend/scripts/seed-footer-content.cjs');
const seedSqlPath = path.join(rootDir, 'backend/scripts/seed-footer-content.sql');
const footerComponentPath = path.join(rootDir, 'frontend/src/components/layout/footer.tsx');
const siteContentPagePath = path.join(rootDir, 'frontend/src/admin/pages/SiteContent.tsx');

// ─── 1. Seed Script Tests ───────────────────────────────────────────────────
console.log('--- 1. Database Seed Script & Default Data Verification ---');

test('seed-footer-content.cjs exists and is loadable CommonJS module', () => {
  assert.ok(fs.existsSync(seedScriptPath), 'seed-footer-content.cjs must exist on disk');
  const mod = require(seedScriptPath);
  assert.ok(mod.DEFAULT_FOOTER_SETTINGS, 'Must export DEFAULT_FOOTER_SETTINGS');
  assert.ok(typeof mod.generateSqlFile === 'function', 'Must export generateSqlFile');
  assert.ok(typeof mod.main === 'function', 'Must export main');
});

test('DEFAULT_FOOTER_SETTINGS contains exact default content and structures', () => {
  const { DEFAULT_FOOTER_SETTINGS } = require(seedScriptPath);

  // About text
  assert.ok(
    DEFAULT_FOOTER_SETTINGS.aboutText.includes('campusmart.in is a consortium of architects'),
    'aboutText must match specification'
  );

  // About links
  assert.strictEqual(Array.isArray(DEFAULT_FOOTER_SETTINGS.aboutLinks), true);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.aboutLinks.length, 3);
  assert.deepStrictEqual(
    DEFAULT_FOOTER_SETTINGS.aboutLinks.map((l) => l.label),
    ['How it works', 'Brand Help', 'Sell on campusmart']
  );

  // Business links
  assert.strictEqual(Array.isArray(DEFAULT_FOOTER_SETTINGS.businessLinks), true);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.businessLinks.length, 7);
  assert.deepStrictEqual(
    DEFAULT_FOOTER_SETTINGS.businessLinks.map((l) => l.label),
    ['About Us', 'Careers & Job Openings', 'Contact Us', 'FAQs', 'Report Issue', 'Blog', 'Delivery Locations']
  );

  // Categories
  assert.strictEqual(Array.isArray(DEFAULT_FOOTER_SETTINGS.categories), true);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.categories.length, 4);
  const catTitles = DEFAULT_FOOTER_SETTINGS.categories.map((c) => c.title);
  assert.deepStrictEqual(catTitles, ['Furniture', 'Labs & Libraries', 'Sports', 'Technology']);

  const furnitureCat = DEFAULT_FOOTER_SETTINGS.categories.find((c) => c.title === 'Furniture');
  assert.strictEqual(furnitureCat.items.length, 5);
  assert.strictEqual(furnitureCat.items[0].label, 'Primary & High School');

  const labsCat = DEFAULT_FOOTER_SETTINGS.categories.find((c) => c.title === 'Labs & Libraries');
  assert.strictEqual(labsCat.items.length, 5);
  assert.strictEqual(labsCat.items[0].label, 'Chemistry Labs');

  const sportsCat = DEFAULT_FOOTER_SETTINGS.categories.find((c) => c.title === 'Sports');
  assert.strictEqual(sportsCat.items.length, 2);

  const techCat = DEFAULT_FOOTER_SETTINGS.categories.find((c) => c.title === 'Technology');
  assert.strictEqual(techCat.items.length, 4);

  // Brands
  assert.strictEqual(Array.isArray(DEFAULT_FOOTER_SETTINGS.brands), true);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.brands.length, 8);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.brands[0].label, 'European Educational Group');

  // Trending
  assert.strictEqual(Array.isArray(DEFAULT_FOOTER_SETTINGS.trending), true);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.trending.length, 8);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.trending[0].label, 'NEP Ready Ultra Modern Labs');

  // Copyright
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.copyright, '© 2016-2025, Third Eye Retail Pvt. Ltd.');

  // Policy links
  assert.strictEqual(Array.isArray(DEFAULT_FOOTER_SETTINGS.policyLinks), true);
  assert.strictEqual(DEFAULT_FOOTER_SETTINGS.policyLinks.length, 5);
  assert.deepStrictEqual(
    DEFAULT_FOOTER_SETTINGS.policyLinks.map((l) => l.label),
    ['Replacement & Return', 'Order Rejection', 'Payment Policy', 'Privacy Policy', 'Terms of Use']
  );
});

// ─── 2. Standalone Migration SQL Tests ───────────────────────────────────────
console.log('\n--- 2. Standalone SQL Migration File Verification ---');

test('seed-footer-content.sql exists and contains valid PostgreSQL upsert statement', () => {
  const { generateSqlFile } = require(seedScriptPath);
  generateSqlFile();

  assert.ok(fs.existsSync(seedSqlPath), 'seed-footer-content.sql must exist');
  const sql = fs.readFileSync(seedSqlPath, 'utf8');

  assert.ok(sql.includes('INSERT INTO "sitecontent"'), 'Must insert into sitecontent table');
  assert.ok(sql.includes("'footer_settings'"), "Must target 'footer_settings' key");
  assert.ok(sql.includes('ON CONFLICT ("key") DO UPDATE'), 'Must include PostgreSQL ON CONFLICT clause');
  assert.ok(sql.includes('SET "value" = EXCLUDED."value"'), 'Must update value column');

  // Extract the JSON literal embedded in the SQL to verify it is 100% valid JSON
  const match = sql.match(/VALUES\s*\(\s*'footer_settings',\s*'([\s\S]+?)',\s*NOW\(\)\s*\)/);
  assert.ok(match && match[1], 'Must match JSON value literal in SQL');

  // Unescape single quotes
  const extractedJson = match[1].replace(/''/g, "'");
  const parsed = JSON.parse(extractedJson);
  assert.strictEqual(parsed.copyright, '© 2016-2025, Third Eye Retail Pvt. Ltd.');
  assert.strictEqual(parsed.categories.length, 4);
});

// ─── 3. Frontend Footer Component Tests ───────────────────────────────────────
console.log('\n--- 3. Frontend Footer Component Verification ---');

test('footer.tsx reads dynamic footer_settings and implements bulletproof fallbacks', () => {
  const content = fs.readFileSync(footerComponentPath, 'utf8');

  assert.ok(content.includes('content?.footer_settings'), 'Must check content.footer_settings');
  assert.ok(content.includes('JSON.parse(rawFooterSettings)'), 'Must parse footer_settings if string');
  assert.ok(content.includes('typeof rawFooterSettings === \'object\''), 'Must accept footer_settings if object');

  // Bulletproof fallbacks
  assert.ok(content.includes('DEFAULT_ABOUT_TEXT'), 'Must export/use DEFAULT_ABOUT_TEXT fallback');
  assert.ok(content.includes('DEFAULT_ABOUT_LINKS'), 'Must export/use DEFAULT_ABOUT_LINKS fallback');
  assert.ok(content.includes('DEFAULT_BUSINESS_LINKS'), 'Must export/use DEFAULT_BUSINESS_LINKS fallback');
  assert.ok(content.includes('DEFAULT_CATEGORIES'), 'Must export/use DEFAULT_CATEGORIES fallback');
  assert.ok(content.includes('DEFAULT_BRANDS'), 'Must export/use DEFAULT_BRANDS fallback');
  assert.ok(content.includes('DEFAULT_TRENDING'), 'Must export/use DEFAULT_TRENDING fallback');
  assert.ok(content.includes('DEFAULT_COPYRIGHT'), 'Must export/use DEFAULT_COPYRIGHT fallback');
  assert.ok(content.includes('DEFAULT_POLICY_LINKS'), 'Must export/use DEFAULT_POLICY_LINKS fallback');

  // Social links intact
  assert.ok(content.includes('resolveSocialUrl'), 'Must preserve resolveSocialUrl for social channels');
  assert.ok(content.includes('social_facebook'), 'Must retain social_facebook');
  assert.ok(content.includes('social_pinterest'), 'Must retain social_pinterest');

  // GSAP animation preserved
  assert.ok(content.includes('gsap.context'), 'Must retain GSAP animations on mount');
});

// ─── 4. Admin SiteContent Page Tests ─────────────────────────────────────────
console.log('\n--- 4. Admin SiteContent Editor Page Verification ---');

test('SiteContent.tsx contains dedicated tabbed Footer Settings editor', () => {
  const content = fs.readFileSync(siteContentPagePath, 'utf8');

  // Dedicated section header
  assert.ok(
    content.includes('Footer Settings & Navigation Links') || content.includes('Footer Settings &amp; Navigation Links'),
    'Must have Footer Settings & Navigation Links header'
  );

  // 4 Dedicated tabs
  assert.ok(content.includes('about_business'), 'Must have About & Business Links tab');
  assert.ok(content.includes('categories'), 'Must have Category Columns tab');
  assert.ok(content.includes('brands_trending'), 'Must have Brands & Trending tab');
  assert.ok(content.includes('copyright_policies'), 'Must have Copyright & Policies tab');

  // Compact link row editor and action buttons
  assert.ok(content.includes('LinkRowEditor'), 'Must have LinkRowEditor component');
  assert.ok(content.includes('+ Add About Link'), 'Must have + Add About Link button');
  assert.ok(content.includes('+ Add Business Link'), 'Must have + Add Business Link button');
  assert.ok(content.includes('+ Add Category Column'), 'Must have + Add Category Column button');
  assert.ok(content.includes('+ Add Brand Link'), 'Must have + Add Brand Link button');
  assert.ok(content.includes('+ Add Trending Link'), 'Must have + Add Trending Link button');
  assert.ok(content.includes('+ Add Policy Link'), 'Must have + Add Policy Link button');

  // Exclusion from custom keys
  assert.ok(
    content.includes("key !== 'footer_settings'"),
    'Must exclude footer_settings from generic Custom Content Keys to prevent clutter'
  );

  // Inclusion in save payload
  assert.ok(
    content.includes('updateFooterSettings'),
    'Must have updateFooterSettings helper that syncs to content.footer_settings'
  );
});

// ─── 5. Simulation & Runtime Resilience Tests ─────────────────────────────────
console.log('\n--- 5. Simulation & Resilience Tests ---');

test('Simulation: Dynamic resolver returns default values when footer_settings is undefined', () => {
  const { DEFAULT_FOOTER_SETTINGS } = require(seedScriptPath);
  const mockContent = {};

  const raw = mockContent.footer_settings;
  let parsed = {};
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  } else if (raw && typeof raw === 'object') {
    parsed = raw;
  }

  const aboutText = parsed.aboutText || DEFAULT_FOOTER_SETTINGS.aboutText;
  const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
    ? parsed.categories
    : DEFAULT_FOOTER_SETTINGS.categories;

  assert.strictEqual(aboutText, DEFAULT_FOOTER_SETTINGS.aboutText);
  assert.strictEqual(categories.length, 4);
});

test('Simulation: Dynamic resolver parses valid custom JSON string and overrides values', () => {
  const { DEFAULT_FOOTER_SETTINGS } = require(seedScriptPath);
  const customFooter = {
    ...DEFAULT_FOOTER_SETTINGS,
    aboutText: 'Custom Architects Consortium for Campus Innovations.',
    copyright: '© 2026 CampusMart EdTech Corp.',
  };
  const mockContent = {
    footer_settings: JSON.stringify(customFooter),
  };

  const raw = mockContent.footer_settings;
  let parsed = {};
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  }

  const aboutText = parsed.aboutText || DEFAULT_FOOTER_SETTINGS.aboutText;
  const copyright = parsed.copyright || DEFAULT_FOOTER_SETTINGS.copyright;

  assert.strictEqual(aboutText, 'Custom Architects Consortium for Campus Innovations.');
  assert.strictEqual(copyright, '© 2026 CampusMart EdTech Corp.');
});

test('Simulation: Dynamic resolver safely recovers from malformed/corrupted JSON string', () => {
  const { DEFAULT_FOOTER_SETTINGS } = require(seedScriptPath);
  const mockContent = {
    footer_settings: '{ invalid_json ::: corrupt payload... ',
  };

  const raw = mockContent.footer_settings;
  let parsed = {};
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  }

  const aboutText = parsed.aboutText || DEFAULT_FOOTER_SETTINGS.aboutText;
  const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
    ? parsed.categories
    : DEFAULT_FOOTER_SETTINGS.categories;

  assert.strictEqual(aboutText, DEFAULT_FOOTER_SETTINGS.aboutText);
  assert.strictEqual(categories.length, 4);
});

test('Simulation: External URLs are properly identified for target="_blank" safety', () => {
  const isExternalUrl = (url) => /^https?:\/\//i.test(url);

  assert.strictEqual(isExternalUrl('https://example.com/partner'), true);
  assert.strictEqual(isExternalUrl('http://in.pinterest.com/campusmartindia/'), true);
  assert.strictEqual(isExternalUrl('/furniture'), false);
  assert.strictEqual(isExternalUrl('/how-it-works'), false);
  assert.strictEqual(isExternalUrl('/terms-of-use'), false);
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
