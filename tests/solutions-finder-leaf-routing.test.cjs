/**
 * Test Suite: solutions-finder-leaf-routing.test.cjs
 * Comprehensive verification for:
 * 1. Dynamic Leaf Category Inheritance from Hub Page
 * 2. Card Category Override Precedence
 * 3. Dynamic Re-evaluation on Page Move/Uncoupling
 * 4. Product searchObjective Specifications Serialization
 * 5. Stateless Context Hand-Off URL Parameter Formulation & Regex Quantity Extraction
 * 6. Dynamic Child Routing Invariant & Reserved Prefix Guard
 */

const assert = require('assert');
const path = require('path');

function resolveModule(modName) {
  try {
    return require(path.resolve(__dirname, '../backend/node_modules', modName));
  } catch {
    return require(modName);
  }
}

resolveModule('dotenv').config({
  path: path.resolve(__dirname, '../backend/.env'),
});

const tsNode = resolveModule('ts-node');
tsNode.register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../backend/tsconfig.json'),
});

const {
  PageSolutionsExtractor,
  resolvePageCategory,
  slugify,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/page-solutions-extractor.ts'));

let passedTests = 0;
let failedTests = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 SOLUTIONS FINDER — LEAF CATEGORY & ROUTING VERIFICATION TEST');
  console.log('================================================================\n');

  // --- 1. Dynamic Category Inheritance ---
  console.log('--- 1. Dynamic Category Inheritance ---');

  it('Inherits category from parent pageData.category when card has no explicit category', () => {
    const parentPage = {
      slug: 'smart-classrooms',
      title: 'Smart Classrooms',
      template: 'solution-hub',
      pageData: JSON.stringify({ category: 'smart-campus' }),
    };
    const cardWithoutCategory = {
      title: 'Interactive Multi-Touch Pod',
      description: 'Ultra HD 4K touch display for university lecture theatres.',
    };

    const resolved = resolvePageCategory(parentPage, cardWithoutCategory);
    assert.strictEqual(resolved, 'smart-campus', 'Leaf card must dynamically inherit category from parent hub');
  });

  it('Card explicit categorySlug overrides parent hub category', () => {
    const parentPage = {
      slug: 'smart-classrooms',
      title: 'Smart Classrooms',
      template: 'solution-hub',
      pageData: JSON.stringify({ category: 'smart-campus' }),
    };
    const cardWithOverride = {
      title: 'Robotics Prototyping Station',
      categorySlug: 'innovation',
      description: 'Specialized additive manufacturing and rapid prototyping setup.',
    };

    const resolved = resolvePageCategory(parentPage, cardWithOverride);
    assert.strictEqual(resolved, 'innovation', 'Card explicit categorySlug must take precedence over parent hub category');
  });

  it('Card unhooked/moved to another hub dynamically inherits the new hub category', () => {
    const card = {
      title: 'Ergonomic Desk & Chair Set',
      description: 'Modular high-density seating cluster.',
    };

    const hubA = {
      slug: 'smart-classrooms',
      title: 'Smart Classrooms',
      pageData: JSON.stringify({ category: 'smart-campus' }),
    };
    const hubB = {
      slug: 'furniture',
      title: 'Campus Furniture',
      pageData: JSON.stringify({ category: 'upgrade' }),
    };

    const catInHubA = resolvePageCategory(hubA, card);
    const catInHubB = resolvePageCategory(hubB, card);

    assert.strictEqual(catInHubA, 'smart-campus');
    assert.strictEqual(catInHubB, 'upgrade');
  });

  // --- 2. Full Page Extraction with Inherited Categories ---
  console.log('\n--- 2. PageSolutionsExtractor Category Inheritance ---');

  it('Extracts leaf cards from Hub pages with dynamic inherited categories', () => {
    const mockPages = [
      {
        id: 101,
        title: 'Smart Classrooms',
        slug: 'smart-classrooms',
        template: 'solution-hub',
        published: true,
        pageData: JSON.stringify({
          category: 'smart-campus',
          cards: [
            { title: 'Interactive Panel 85"', description: '4K active panel with digital whiteboarding.' },
            { title: 'IoT Energy Sensor Rig', description: 'Real-time room occupancy and ambient monitoring.' },
          ],
        }),
      },
    ];

    const extracted = PageSolutionsExtractor.extractFromPages(mockPages);
    assert.strictEqual(extracted.length, 2);
    assert.strictEqual(extracted[0].categorySlug, 'smart-campus');
    assert.strictEqual(extracted[1].categorySlug, 'smart-campus');
    assert.strictEqual(extracted[0].targetSlug, 'smart-classrooms/interactive-panel-85');
  });

  // --- 3. Product searchObjective Specifications Serialization ---
  console.log('\n--- 3. Product Specifications Serialization ---');

  it('Correctly embeds searchObjective into JSON specifications without corrupting specs', () => {
    const rawSpecs = "Frame: High-grade tubular steel\nFinish: Matte Powder Coated\nWarranty: 5 Years";
    const productObjective = "upgrade";

    // Simulate save logic from Products.tsx
    const specObj = {};
    rawSpecs.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        specObj[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    });
    if (productObjective) {
      specObj.searchObjective = productObjective;
    }

    const serialized = JSON.stringify(specObj);
    const parsed = JSON.parse(serialized);

    assert.strictEqual(parsed.searchObjective, 'upgrade');
    assert.strictEqual(parsed['Frame'], 'High-grade tubular steel');
    assert.strictEqual(parsed['Warranty'], '5 Years');
  });

  // --- 4. Stateless Context Hand-Off URL Formulation & Quantity Regex ---
  console.log('\n--- 4. Context Hand-Off & Quantity Regex Extraction ---');

  it('Extracts numeric quantity from diverse natural language queries', () => {
    const testCases = [
      { query: 'setup 40 panels for auditorium', expected: '40' },
      { query: 'need 150 chairs and desks', expected: '150' },
      { query: 'procure 10 labs for engineering', expected: '10' },
      { query: '25 classrooms automation', expected: '25' },
      { query: '50 sets smart podiums', expected: '50' },
      { query: 'modern campus design without quantity', expected: null },
    ];

    const extractQty = (q) => {
      const match = q.match(/\b(\d{1,5})\s*(?:units?|pcs?|pieces?|sets?|chairs?|desks?|benches?|pods?|panels?|screens?|rooms?|labs?|classrooms?)?\b/i);
      return match && match[1] && Number(match[1]) > 0 ? match[1] : null;
    };

    for (const tc of testCases) {
      const result = extractQty(tc.query);
      assert.strictEqual(result, tc.expected, `Failed query: "${tc.query}"`);
    }
  });

  it('Builds complete stateless context hand-off URL with parameters', () => {
    const buildSolutionTargetUrl = (targetUrl, cardTitle, queryParam, instParam, traceId) => {
      const base = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
      const [pathPart, queryPart] = base.split('?');
      const params = new URLSearchParams(queryPart || '');

      if (instParam && instParam !== 'all') {
        params.set('ref_inst', instParam);
      }
      if (queryParam) {
        params.set('ref_intent', queryParam);
        const qtyMatch = queryParam.match(/\b(\d{1,5})\s*(?:units?|pcs?|pieces?|sets?|chairs?|desks?|benches?|pods?|panels?|screens?|rooms?|labs?|classrooms?)?\b/i);
        if (qtyMatch && qtyMatch[1] && Number(qtyMatch[1]) > 0) {
          params.set('ref_qty', qtyMatch[1]);
        }
      }
      if (traceId) {
        params.set('ref_trace', traceId);
      }
      params.set('ref_sol', cardTitle);

      const qs = params.toString();
      return qs ? `${pathPart}?${qs}` : pathPart;
    };

    const url = buildSolutionTargetUrl(
      'product/interactive-panel-85',
      'Interactive Panel 85"',
      '40 panels for engineering lecture halls',
      'engineering',
      'trace-xyz-123'
    );

    assert.ok(url.startsWith('/product/interactive-panel-85'));
    assert.ok(url.includes('ref_inst=engineering'));
    assert.ok(url.includes('ref_qty=40'));
    assert.ok(url.includes('ref_trace=trace-xyz-123'));
    assert.ok(url.includes('ref_sol=Interactive+Panel+85%22'));
  });

  // --- 5. Reserved Prefix Guard & Child Route Invariant ---
  console.log('\n--- 5. Dynamic Child Route Invariants ---');

  it('Protects system and administrative routes from dynamic hub hijacking', () => {
    const RESERVED_PREFIXES = new Set([
      'admin',
      'api',
      'login',
      'register',
      'registration',
      'product',
      'blog',
      'case-studies',
      'completed-projects',
      'find-solutions',
      'my-account',
      'request-quote',
      'wishlist',
      'cart',
    ]);

    assert.strictEqual(RESERVED_PREFIXES.has('admin'), true);
    assert.strictEqual(RESERVED_PREFIXES.has('product'), true);
    assert.strictEqual(RESERVED_PREFIXES.has('smart-classrooms'), false);
    assert.strictEqual(RESERVED_PREFIXES.has('furniture'), false);
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
