const assert = require('assert');
const path = require('path');

function resolveModule(modName) {
  try {
    return require(path.resolve(__dirname, '../backend/node_modules', modName));
  } catch {
    return require(modName);
  }
}

const tsNode = resolveModule('ts-node');
tsNode.register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../backend/tsconfig.json'),
});

const { PageSolutionsExtractor } = require('../backend/src/services/solutions-finder/page-solutions-extractor');
const { LocalRuleNLPProvider } = require('../backend/src/services/solutions-finder/ai-providers/local-nlp.provider');
const { InMemorySolutionsRepository } = require('../backend/src/services/solutions-finder/in-memory-solutions.repository');
const { SolutionsIndexService } = require('../backend/src/services/solutions-finder/solutions-index.service');
const { IntentScorerService } = require('../backend/src/services/solutions-finder/intent-scorer.service');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}\n   Error: ${err.stack || err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}\n   Error: ${err.stack || err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('================================================================');
  console.log('🧪 VERIFY: BADMINTON #1 RANKING, LEAF ROUTE & CATEGORY ISOLATION');
  console.log('================================================================\n');

  // 1. Test PageSolutionsExtractor Leaf Routing for sports-infra facility cards
  console.log('--- 1. Leaf Target Route Resolution ---');
  const mockSportsInfraPage = {
    id: 37,
    title: 'Sports Infrastructure',
    slug: 'sports-infra',
    template: 'sports-infra',
    published: true,
    pageData: JSON.stringify({
      heroTitle: 'Sports Infrastructure',
      cards: [
        {
          title: 'Basketball Court',
          description: 'FIBA-compliant wooden and acrylic cushioned surfaces engineered for shock absorption.',
          image: '/img/basketball.jpg',
        },
        {
          title: 'Indoor Badminton Arena',
          description: 'BWF-standard shock-absorbing vinyl mats paired with anti-glare high-bay sports LED illumination and acoustic dampening.',
          image: '/img/badminton.jpg',
        },
        {
          title: 'Football Ground',
          description: 'FIFA-standard artificial turf with sub-base drainage and floodlighting.',
          image: '/img/football.jpg',
        },
      ],
    }),
  };

  const extracted = PageSolutionsExtractor.extractFromPages([mockSportsInfraPage]);
  runTest('PageSolutionsExtractor assigns canonical leaf targetSlug for facility cards', () => {
    const badminton = extracted.find(c => c.title === 'Indoor Badminton Arena');
    assert.ok(badminton, 'Badminton card must be extracted');
    assert.strictEqual(badminton.targetSlug, 'sports-infra/indoor-badminton-arena', 'Must link directly to facility leaf route');

    const basketball = extracted.find(c => c.title === 'Basketball Court');
    assert.ok(basketball, 'Basketball card must be extracted');
    assert.strictEqual(basketball.targetSlug, 'sports-infra/basketball-court', 'Must link directly to facility leaf route');
  });

  // 2. Setup Full Index with sports cards and cross-category AI CoE card
  console.log('\n--- 2. End-to-End Proposal with Misspelled Query ---');

  const allCards = [
    ...extracted,
    {
      id: 4,
      cardSlug: 'turnkey-sports-infrastructure',
      targetSlug: 'sports-infra',
      categorySlug: 'sports-infra',
      secondaryCategorySlugs: [],
      title: 'Turnkey Outdoor & Indoor Campus Sports Infrastructure',
      summary: 'Olympic-specification synthetic running tracks, multi-sport indoor courts, and floodlight illumination.',
      inclusions: ['Synthetic Athletic Running Tracks', 'Multi-Sport Wooden Courts', 'FIFA Turf & Lighting'],
      badge: 'Turnkey Suite',
      imageUrl: '/img/sports-hub.jpg',
      keywords: ['sports', 'synthetic track', 'badminton court', 'indoor stadium', 'cricket ground'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['campus-student-amenities-hub', 'modular-campus-furniture-hub'],
      priority: 95, // High priority
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Cross-category high priority card (AI CoE)
    {
      id: 5,
      cardSlug: 'turnkey-ai-coe',
      targetSlug: 'ai-ml',
      categorySlug: 'ai-tech',
      secondaryCategorySlugs: [],
      title: 'Turnkey AI Centre of Excellence & High-Density GPU Pods',
      summary: 'Enterprise AI computing clusters, deep-learning workstations, and GPU infrastructure.',
      inclusions: ['GPU Compute Clusters', 'Deep Learning Racks', 'Edge IoT Labs'],
      badge: 'Flagship CoE',
      imageUrl: '/img/ai-coe.jpg',
      keywords: ['ai', 'gpu cluster', 'machine learning', 'centre of excellence'],
      institutionTypes: ['all'], // 'all' institutions
      relatedCardSlugs: [],
      priority: 100, // Maximum editorial priority!
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Complementary amenities hub for Section C
    {
      id: 20,
      cardSlug: 'campus-student-amenities-hub',
      targetSlug: 'additional-infra',
      categorySlug: 'additional-infra',
      secondaryCategorySlugs: [],
      title: 'Student Life, Hostels & Dining Infrastructure',
      summary: 'Modern campus hostels, student wellness centers, and recreational amenities.',
      inclusions: ['Hostel Living Spaces', 'Student Lounges', 'Wellness & Infirmary'],
      badge: 'Student Living',
      imageUrl: '/img/amenities.jpg',
      keywords: ['amenities', 'hostel', 'wellness', 'student life'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 80,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 21,
      cardSlug: 'modular-campus-furniture-hub',
      targetSlug: 'furniture',
      categorySlug: 'furniture',
      secondaryCategorySlugs: [],
      title: 'Institutional Modular Campus Furniture',
      summary: 'Ergonomic classroom seating and institutional furniture.',
      inclusions: ['Ergonomic Seating', 'Study Pods', 'Modular Workbenches'],
      badge: 'Furniture Suite',
      imageUrl: '/img/furniture.jpg',
      keywords: ['furniture', 'chairs', 'desks'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 75,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 22,
      cardSlug: 'campus-automation-hub',
      targetSlug: 'automation',
      categorySlug: 'automation',
      secondaryCategorySlugs: [],
      title: 'Campus Automation & Smart Surveillance',
      summary: 'Smart campus CCTV, RFID access, and IoT automation.',
      inclusions: ['Smart CCTV', 'RFID Access', 'Energy Management'],
      badge: 'Smart Campus',
      imageUrl: '/img/automation.jpg',
      keywords: ['automation', 'security', 'cctv'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 70,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const repo = new InMemorySolutionsRepository(
    allCards,
    ['sports-infra', 'ai-tech', 'additional-infra', 'furniture', 'automation'],
    null,
    []
  );

  const indexService = new SolutionsIndexService(repo);
  await indexService.rebuild();

  const provider = new LocalRuleNLPProvider();
  const scorer = new IntentScorerService(indexService, provider);

  await runAsyncTest('Proposal places Indoor Badminton Arena at #1 for query: "seting bedminton court indoor"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'seting bedminton court indoor',
      institutionHint: 'all',
      categoryHint: 'sports-infra',
    });

    assert.ok(proposal.curatedSolutions.length >= 2, 'Must return curated solutions');

    // 1. Badminton must be #1!
    const rank1 = proposal.curatedSolutions[0];
    assert.strictEqual(rank1.title, 'Indoor Badminton Arena', 'Indoor Badminton Arena must be in 1st place');
    assert.strictEqual(rank1.targetUrl, '/sports-infra/indoor-badminton-arena', 'Must link directly to /sports-infra/indoor-badminton-arena');
    assert.ok(rank1.whyRelevant.includes('badminton'), 'whyRelevant rationale must explicitly reference badminton');

    // 2. Category Isolation: AI CoE must NOT leak into Section B
    const aiCoEInResults = proposal.curatedSolutions.find(c => c.cardSlug === 'turnkey-ai-coe' || c.categorySlug === 'ai-tech');
    assert.strictEqual(aiCoEInResults, undefined, 'Turnkey AI CoE must be strictly blocked from sports results');

    // 3. Section C must have strictly 3 full-sized hub cards from complementary categories
    assert.strictEqual(proposal.complementaryInfra.length, 3, 'Section C must contain strictly 3 complementary hubs');
    const compCategories = new Set(proposal.complementaryInfra.map(c => c.categorySlug));
    assert.strictEqual(compCategories.has('sports-infra'), false, 'Section C must not duplicate the active category');
  });

  console.log('\n================================================================');
  console.log(`📊 TOTAL RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
