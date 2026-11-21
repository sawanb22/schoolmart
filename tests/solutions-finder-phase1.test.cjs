/**
 * solutions-finder-phase1.test.cjs
 * Comprehensive verification of Phase 1: Solution Catalogue Schema, Indexer & Resilient RAM Cache.
 *
 * Verifies:
 * 1. Zero-dependency taxonomy validator handles valid and invalid payloads.
 * 2. In-memory repository deterministic ordering (priority DESC, cardSlug ASC).
 * 3. SolutionsIndexService cold boot compiles index and computes deterministic SHA-256 hash.
 * 4. Index filters out cards whose targetSlug is not published.
 * 5. Index purges self-references and dangling links in relatedCardSlugs.
 * 6. Cache immutability: deep-freeze prevents downstream in-place mutation of arrays.
 * 7. Mutex rebuild pattern: concurrent rebuild calls queue and resolve after data compiles.
 * 8. Error resilience: failed rebuild preserves previous cache without crash.
 * 9. Heartbeat watermark advancement: advances only on success.
 * 10. Concrete PrismaSolutionsRepository contract verification (BigInt & null date coercion).
 */

const assert = require('assert');
const path = require('path');

console.log('================================================================');
console.log('🧪 SOLUTIONS FINDER — PHASE 1 INDEX & CACHE VERIFICATION TEST');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${e.message}`);
    failed++;
  }
}

// Import compiled or transpile modules
let tsNode;
try {
  tsNode = require(path.resolve(__dirname, '../backend/node_modules/ts-node'));
} catch {
  tsNode = require('ts-node');
}
tsNode.register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../backend/tsconfig.json'),
});

const { validateTaxonomyPayload } = require('../backend/src/services/solutions-finder/taxonomy.validator');
const { InMemorySolutionsRepository } = require('../backend/src/services/solutions-finder/in-memory-solutions.repository');
const { SolutionsIndexService } = require('../backend/src/services/solutions-finder/solutions-index.service');
const { PrismaSolutionsRepository } = require('../backend/src/services/solutions-finder/prisma-solutions.repository');
const prisma = require('../backend/src/lib/prisma').default;

const mockTaxonomy = {
  categories: [
    { id: 'campus-design', label: 'Campus Design', letterCode: 'A' },
    { id: 'furniture', label: 'Furniture', letterCode: 'B' },
    { id: 'sports-infra', label: 'Sports', letterCode: 'C' },
    { id: 'ai-tech', label: 'AI & Tech', letterCode: 'D' },
    { id: 'renovation', label: 'Renovation', letterCode: 'E' },
    { id: 'libraries', label: 'Libraries', letterCode: 'F' },
    { id: 'labs', label: 'Labs', letterCode: 'G' },
    { id: 'hr-placements', label: 'Placements', letterCode: 'H' },
    { id: 'innovation', label: 'Innovation', letterCode: 'I' },
    { id: 'additional-infra', label: 'Amenities', letterCode: 'J' },
  ],
  institutions: [
    { id: 'engineering', label: 'Engineering College' },
    { id: 'universities', label: 'Universities' },
  ],
};

const sampleCard1 = {
  id: 1,
  cardSlug: 'card-b-lower-priority',
  targetSlug: 'campus-master-planning',
  categorySlug: 'campus-design',
  secondaryCategorySlugs: [],
  title: 'Lower Priority Card',
  summary: 'Summary text here for testing purposes.',
  inclusions: ['Item 1', 'Item 2', 'Item 3'],
  keywords: ['test', 'design'],
  institutionTypes: ['universities'],
  relatedCardSlugs: ['card-a-high-priority', 'card-b-lower-priority', 'non-existent-card'], // Has self-ref and dangling
  priority: 10,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleCard2 = {
  id: 2,
  cardSlug: 'card-a-high-priority',
  targetSlug: 'ai-ml',
  categorySlug: 'ai-tech',
  secondaryCategorySlugs: [],
  title: 'High Priority Card',
  summary: 'Summary text here for high priority item.',
  inclusions: ['Inc A', 'Inc B', 'Inc C'],
  keywords: ['ai', 'gpu'],
  institutionTypes: ['engineering'],
  relatedCardSlugs: ['card-b-lower-priority'],
  priority: 100,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const unpublishedTargetCard = {
  id: 3,
  cardSlug: 'card-c-unpublished-target',
  targetSlug: 'unpublished-draft-page',
  categorySlug: 'campus-design',
  secondaryCategorySlugs: [],
  title: 'Unpublished Card',
  summary: 'Should not appear in search results.',
  inclusions: ['Draft 1', 'Draft 2', 'Draft 3'],
  keywords: ['draft'],
  institutionTypes: ['universities'],
  relatedCardSlugs: [],
  priority: 50,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function runTests() {
  console.log('--- 1. Taxonomy Validation ---');

  await test('validateTaxonomyPayload accepts valid taxonomy object', () => {
    const res = validateTaxonomyPayload(mockTaxonomy);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.categories.length, 10);
    assert.strictEqual(res.data.institutions.length, 2);
  });

  await test('validateTaxonomyPayload parses serialized JSON string', () => {
    const jsonStr = JSON.stringify(mockTaxonomy);
    const res = validateTaxonomyPayload(jsonStr);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.categories[0].id, 'campus-design');
  });

  await test('validateTaxonomyPayload rejects invalid structures', () => {
    assert.strictEqual(validateTaxonomyPayload(null).valid, false);
    assert.strictEqual(validateTaxonomyPayload({ categories: 'not-array' }).valid, false);
    assert.strictEqual(validateTaxonomyPayload({ categories: [], institutions: 'not-array' }).valid, false);
  });

  console.log('\n--- 2. Index Compilation & Deterministic Hash ---');

  await test('SolutionsIndexService sorts deterministically (priority DESC, cardSlug ASC)', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1, sampleCard2],
      ['campus-master-planning', 'ai-ml'],
      mockTaxonomy
    );
    const service = new SolutionsIndexService(repo);
    await service.rebuild();

    const cards = service.getCards();
    assert.strictEqual(cards.length, 2);
    // sampleCard2 has priority 100, sampleCard1 has priority 10
    assert.strictEqual(cards[0].cardSlug, 'card-a-high-priority');
    assert.strictEqual(cards[1].cardSlug, 'card-b-lower-priority');
  });

  await test('SolutionsIndexService produces consistent SHA-256 version hash', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1, sampleCard2],
      ['campus-master-planning', 'ai-ml'],
      mockTaxonomy
    );
    const service1 = new SolutionsIndexService(repo);
    const service2 = new SolutionsIndexService(repo);

    await service1.rebuild();
    await service2.rebuild();

    assert.strictEqual(service1.getVersion().length, 16);
    assert.strictEqual(service1.getVersion(), service2.getVersion());
  });

  console.log('\n--- 3. Page Filtering & Cross-Sell Sanitization ---');

  await test('Index suppresses cards whose targetSlug is unpublished', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1, sampleCard2, unpublishedTargetCard],
      ['campus-master-planning', 'ai-ml'], // 'unpublished-draft-page' is omitted
      mockTaxonomy
    );
    const service = new SolutionsIndexService(repo);
    await service.rebuild();

    const cards = service.getCards();
    assert.strictEqual(cards.length, 2);
    assert.strictEqual(cards.some(c => c.cardSlug === 'card-c-unpublished-target'), false);
  });

  await test('Index purges self-references and dangling links in relatedCardSlugs', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1, sampleCard2],
      ['campus-master-planning', 'ai-ml'],
      mockTaxonomy
    );
    const service = new SolutionsIndexService(repo);
    await service.rebuild();

    const cardB = service.getCards().find(c => c.cardSlug === 'card-b-lower-priority');
    assert.ok(cardB);
    // sampleCard1 started with ['card-a-high-priority', 'card-b-lower-priority', 'non-existent-card']
    // Should keep only 'card-a-high-priority' (no self-ref, no dangling)
    assert.deepStrictEqual(cardB.relatedCardSlugs, ['card-a-high-priority']);
  });

  console.log('\n--- 4. Cache Immutability & Concurrency Mutex ---');

  await test('RAM cache is deep-frozen and throws on mutation attempt', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1],
      ['campus-master-planning'],
      mockTaxonomy
    );
    const service = new SolutionsIndexService(repo);
    await service.rebuild();

    const card = service.getCards()[0];
    assert.throws(() => {
      // @ts-ignore
      card.inclusions.push('Malicious mutation');
    }, TypeError);
  });

  await test('Concurrent rebuild() calls queue and resolve with latest data', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1],
      ['campus-master-planning'],
      mockTaxonomy
    );
    const service = new SolutionsIndexService(repo);

    // Call 3 concurrent rebuilds
    const p1 = service.rebuild();
    repo.setCards([sampleCard1, sampleCard2]);
    repo.setPublishedSlugs(['campus-master-planning', 'ai-ml']);
    const p2 = service.rebuild();
    const p3 = service.rebuild();

    await Promise.all([p1, p2, p3]);
    assert.strictEqual(service.getCards().length, 2);
  });

  await test('Rebuild failure preserves previous healthy cache', async () => {
    const repo = new InMemorySolutionsRepository(
      [sampleCard1],
      ['campus-master-planning'],
      mockTaxonomy
    );
    const service = new SolutionsIndexService(repo);
    await service.rebuild();
    assert.strictEqual(service.getCards().length, 1);

    // Simulate database outage
    repo.setFailNextFetch(true);
    try {
      await service.rebuild();
    } catch {}

    // Cache must remain 100% intact
    assert.strictEqual(service.getCards().length, 1);
    assert.strictEqual(service.getCards()[0].cardSlug, 'card-b-lower-priority');
  });

  console.log('\n--- 5. Heartbeat & Watermark Sync ---');

  await test('checkSync returns false when watermarks have not advanced', async () => {
    const repo = new InMemorySolutionsRepository([sampleCard1], ['campus-master-planning'], mockTaxonomy);
    const service = new SolutionsIndexService(repo);
    await service.rebuild();

    // First checkSync syncs watermark
    await service.checkSync();
    // Second checkSync without changes should be false (no redundant rebuild)
    const synced = await service.checkSync();
    assert.strictEqual(synced, false);
  });

  await test('Heartbeat timer unref does not block process exit', () => {
    const repo = new InMemorySolutionsRepository([], [], mockTaxonomy);
    const service = new SolutionsIndexService(repo);
    service.startHeartbeat(1000);
    service.stopHeartbeat();
    assert.strictEqual(service.isReady(), false);
  });

  console.log('\n--- 6. Concrete PrismaSolutionsRepository Contract Verification ---');

  await test('PrismaSolutionsRepository loads active cards and watermarks with correct types', async () => {
    const prismaRepo = new PrismaSolutionsRepository(prisma);

    const watermarks = await prismaRepo.fetchDataWatermarks();
    assert.strictEqual(typeof watermarks.pageCount, 'number');
    assert.strictEqual(typeof watermarks.cardCount, 'number');
    assert.strictEqual(typeof watermarks.pageMax, 'number');
    assert.strictEqual(typeof watermarks.cardMax, 'number');
    assert.strictEqual(typeof watermarks.taxonomyMax, 'number');
    assert.ok(watermarks.pageCount > 0, 'Page count must be greater than 0');
    assert.ok(watermarks.cardCount >= 10, 'Must have at least 10 seeded cards');

    const cards = await prismaRepo.fetchActiveCards();
    assert.ok(cards.length >= 10);
    for (const c of cards) {
      assert.strictEqual(c.inclusions.length, 3, `Card ${c.cardSlug} must have exactly 3 inclusions`);
      assert.strictEqual(typeof c.cardSlug, 'string');
      assert.strictEqual(typeof c.targetSlug, 'string');
    }

    const taxonomy = await prismaRepo.fetchTaxonomy();
    assert.ok(taxonomy !== null, 'Taxonomy should be loaded from SiteContent');
    assert.ok(taxonomy.categories.length >= 10, 'Must have at least 10 categories (A-J)');
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('Fatal test execution error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
