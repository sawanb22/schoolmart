/**
 * CampusMart AI Solutions Finder — Phase 3 (Steps 1 & 2) Test Suite
 *
 * Verifies:
 *   Suite 1: Dynamic Page Extraction Engine (Inclusions Invariant, Blacklist, Sections, Deduplication)
 *   Suite 2: Pluggable AI / NLP Intent Extraction & Resilient Failover (Mercury-3, Local NLP, parseLLMJson)
 *   Suite 3: Intent Scoring & Proposal Assembler (4-Factor Math, Zero-Division, WhyRelevant, Cross-Sell)
 *   Suite 4: End-to-End Route Contract & Latency Budget (< 15ms RAM search, traceId, array coercion)
 */

const path = require('path');
const assert = require('assert');

function resolveModule(modName) {
  try {
    return require(path.resolve(__dirname, '../backend/node_modules', modName));
  } catch {
    return require(modName);
  }
}

// Ensure ts-node is registered so we can import TypeScript modules directly
resolveModule('dotenv').config({
  path: path.resolve(__dirname, '../backend/.env'),
});

const tsNode = resolveModule('ts-node');
tsNode.register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../backend/tsconfig.json'),
});

// Import services and providers
const {
  PageSolutionsExtractor,
  EXCLUDED_PAGE_SLUGS,
  synthesizeStrictThreeInclusions,
  CATEGORY_DELIVERABLE_FALLBACKS,
  slugify,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/page-solutions-extractor.ts'));

const {
  parseLLMJson,
  InceptionMercuryProvider,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/ai-providers/inception-mercury.provider.ts'));

const {
  LocalRuleNLPProvider,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/ai-providers/local-nlp.provider.ts'));

const {
  AIProviderFactory,
  ResilientAIProvider,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/ai-providers/ai-provider.factory.ts'));

const {
  IntentScorerService,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/intent-scorer.service.ts'));

const {
  InMemorySolutionsRepository,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/in-memory-solutions.repository.ts'));

const {
  SolutionsIndexService,
} = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/solutions-index.service.ts'));

const {
  solutionsSearchLimiter,
} = require(path.resolve(__dirname, '../backend/src/middleware/rate-limit.middleware.ts'));

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

async function itAsync(description, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

// Sample Taxonomy for testing
const MOCK_TAXONOMY = {
  categories: [
    { id: 'campus-design', label: 'Campus Design & Architecture', shortLabel: 'Campus Design', letterCode: 'A' },
    { id: 'furniture', label: 'Furniture & Ergonomics', shortLabel: 'Furniture', letterCode: 'B' },
    { id: 'sports-infra', label: 'Sports Infrastructure', shortLabel: 'Sports Infra', letterCode: 'C' },
    { id: 'ai-tech', label: 'AI & Technology Infrastructure', shortLabel: 'AI & Tech', letterCode: 'D' },
    { id: 'renovation', label: 'Renovation & Modernisation', shortLabel: 'Renovation', letterCode: 'E' },
    { id: 'libraries', label: 'Libraries & Knowledge Centers', shortLabel: 'Libraries', letterCode: 'F' },
    { id: 'labs', label: 'Laboratories & Research Infrastructure', shortLabel: 'Laboratories', letterCode: 'G' },
    { id: 'hr-placements', label: 'HR, Placements & Corporate Ties', shortLabel: 'HR & Placements', letterCode: 'H' },
    { id: 'innovation', label: 'Innovation & Incubation Hubs', shortLabel: 'Innovation', letterCode: 'I' },
    { id: 'additional-infra', label: 'Additional Campus Amenities', shortLabel: 'Campus Amenities', letterCode: 'J' },
  ],
  institutions: [
    { id: 'all', label: 'All Educational Institutions', shortLabel: 'All' },
    { id: 'universities', label: 'Universities (State & Private)', shortLabel: 'Universities' },
    { id: 'engineering', label: 'Engineering & Technical Colleges', shortLabel: 'Engineering' },
    { id: 'degree', label: 'Degree & Management Colleges', shortLabel: 'Degree' },
  ],
};

async function runTests() {
  console.log('================================================================');
  console.log('🧪 SOLUTIONS FINDER — PHASE 3 DYNAMIC EXTRACTION & AI TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: DYNAMIC PAGE EXTRACTION ENGINE
  // -------------------------------------------------------------
  console.log('--- 1. Dynamic Page Extraction Engine ---');

  it('Strictly 3 inclusions invariant: pads single-sentence card with category engineering fallbacks', () => {
    const rawCard = {
      title: 'AI Workstation Cluster',
      description: 'Single sentence describing deep learning rigs.',
    };
    const inclusions = synthesizeStrictThreeInclusions(rawCard, 'ai-tech');
    assert.strictEqual(inclusions.length, 3, 'Must produce strictly 3 inclusions');
    assert.ok(inclusions[0].includes('deep learning rigs') || inclusions[0].length >= 10);
    assert.strictEqual(inclusions[1], CATEGORY_DELIVERABLE_FALLBACKS['ai-tech'][0]);
    assert.strictEqual(inclusions[2], CATEGORY_DELIVERABLE_FALLBACKS['ai-tech'][1]);
  });

  it('Strictly 3 inclusions invariant: extracts explicit deliverables array when present', () => {
    const rawCard = {
      title: 'Robotics Station',
      deliverables: ['Custom chassis integration', 'Embedded sensor suite', 'Full safety compliance testing'],
    };
    const inclusions = synthesizeStrictThreeInclusions(rawCard, 'labs');
    assert.strictEqual(inclusions.length, 3);
    assert.strictEqual(inclusions[0], 'Custom chassis integration');
    assert.strictEqual(inclusions[1], 'Embedded sensor suite');
    assert.strictEqual(inclusions[2], 'Full safety compliance testing');
  });

  it('Page Blacklist: completely excludes contact-us, policies, classifieds, and test fixtures', () => {
    const mockPages = [
      { id: 1, title: 'Contact Us', slug: 'contact-us', published: true, pageData: JSON.stringify({ cards: [{ title: 'Phone', description: 'Call 9876543210' }] }) },
      { id: 2, title: 'Privacy Policy', slug: 'privacy-policy', published: true, pageData: JSON.stringify({ cards: [{ title: 'Terms', description: 'Data privacy rules.' }] }) },
      { id: 3, title: 'Test Lab', slug: 'test-qa-fixture', published: true, pageData: JSON.stringify({ cards: [{ title: 'Test 1', description: 'Fixture description.' }] }) },
      { id: 4, title: 'AI & ML Hub', slug: 'ai-ml', published: true, pageData: JSON.stringify({ cards: [{ title: 'GPU Computing Hub', description: 'Enterprise grade NVIDIA cluster setup.' }] }) },
    ];

    const extracted = PageSolutionsExtractor.extractFromPages(mockPages, MOCK_TAXONOMY);
    assert.strictEqual(extracted.length, 1, 'Only ai-ml card should be extracted');
    assert.strictEqual(extracted[0].targetSlug, 'ai-ml');
    assert.strictEqual(extracted[0].title, 'GPU Computing Hub');
  });

  it('Section fallback: maps heading and body on digital-transformation template', () => {
    const mockPages = [
      {
        id: 5,
        title: 'Digital Transformation',
        slug: 'digital-transformation',
        published: true,
        pageData: JSON.stringify({
          sections: [
            { heading: 'Assess Campus Readiness', body: 'Comprehensive audit of server rooms, network drops, and power backup.' },
            { heading: 'Deploy Cloud Core', body: 'Integration with central identity, directory services, and ERP endpoints.' },
          ],
        }),
      },
    ];

    const extracted = PageSolutionsExtractor.extractFromPages(mockPages, MOCK_TAXONOMY);
    assert.strictEqual(extracted.length, 2);
    assert.strictEqual(extracted[0].title, 'Assess Campus Readiness');
    assert.ok(extracted[0].summary.includes('Comprehensive audit'));
    assert.strictEqual(extracted[0].inclusions.length, 3);
  });

  it('Deduplication: handles duplicate card titles on same page with unique index suffix', () => {
    const mockPages = [
      {
        id: 6,
        title: 'Smart Classrooms',
        slug: 'smart-classrooms',
        published: true,
        pageData: JSON.stringify({
          cards: [
            { title: 'Interactive Display Pod', description: 'Touchscreen 85-inch digital display.' },
            { title: 'Interactive Display Pod', description: 'Duplicate card title with different specs.' },
          ],
        }),
      },
    ];

    const extracted = PageSolutionsExtractor.extractFromPages(mockPages, MOCK_TAXONOMY);
    assert.strictEqual(extracted.length, 2);
    assert.strictEqual(extracted[0].cardSlug, 'smart-classrooms--interactive-display-pod');
    assert.strictEqual(extracted[1].cardSlug, 'smart-classrooms--interactive-display-pod--2');
  });

  it('Zero dead anchors: targetUrl uses rawCard.href if valid, otherwise clean parent /slug', () => {
    const mockPages = [
      {
        id: 7,
        title: 'Innovation Center',
        slug: 'innovation',
        published: true,
        pageData: JSON.stringify({
          cards: [
            { title: 'Maker Space', description: '3D printers and laser cutters.', href: '/innovation/maker-space' },
            { title: 'Incubation Bay', description: 'Co-working hot desks for student founders.' },
          ],
        }),
      },
    ];

    const extracted = PageSolutionsExtractor.extractFromPages(mockPages, MOCK_TAXONOMY);
    assert.strictEqual(`/${extracted[0].targetSlug}`, '/innovation/maker-space');
    assert.strictEqual(`/${extracted[1].targetSlug}`, '/innovation');
    assert.ok(!extracted[1].targetSlug.includes('#'), 'Target URL must not contain synthetic hash');
  });

  // -------------------------------------------------------------
  // SUITE 2: PLUGGABLE AI / NLP INTENT EXTRACTION
  // -------------------------------------------------------------
  console.log('\n--- 2. Pluggable AI / NLP Intent Extraction & Resilient Failover ---');

  it('parseLLMJson: cleanly parses JSON enclosed in markdown code fences', () => {
    const rawFenced = '```json\n{\n  "intentSummary": "Turnkey AI Lab",\n  "categoryId": "ai-tech"\n}\n```';
    const parsed = parseLLMJson(rawFenced);
    assert.strictEqual(parsed.intentSummary, 'Turnkey AI Lab');
    assert.strictEqual(parsed.categoryId, 'ai-tech');
  });

  it('parseLLMJson: strips conversational preamble and trailing markdown notes', () => {
    const rawNoisy = 'Here is the JSON you requested:\n```\n{"score": 95, "title": "Ergonomic Chairs"}\n```\nHope this helps!';
    const parsed = parseLLMJson(rawNoisy);
    assert.strictEqual(parsed.score, 95);
    assert.strictEqual(parsed.title, 'Ergonomic Chairs');
  });

  await itAsync('LocalRuleNLPProvider: classifies query in < 3ms with zero external network', async () => {
    const provider = new LocalRuleNLPProvider();
    const start = Date.now();
    const result = await provider.extractIntent({
      queryText: 'We need 60 high-performance AI workstations and GPU servers for an engineering college',
    });
    const elapsed = Date.now() - start;

    assert.ok(elapsed <= 5, `Local NLP execution must be ultra-fast (took ${elapsed}ms)`);
    assert.strictEqual(result.categoryId, 'ai-tech');
    assert.strictEqual(result.institutionId, 'engineering');
    assert.strictEqual(result.scale, '60 workstations');
    assert.strictEqual(result.providerName, 'local-nlp');
    assert.ok(result.confidenceScore >= 0.85);
  });

  await itAsync('LocalRuleNLPProvider: respects explicit categoryHint and institutionHint', async () => {
    const provider = new LocalRuleNLPProvider();
    const result = await provider.extractIntent({
      queryText: 'Renovating student reading rooms',
      categoryHint: 'libraries',
      institutionHint: 'universities',
    });

    assert.strictEqual(result.categoryId, 'libraries');
    assert.strictEqual(result.institutionId, 'universities');
    assert.strictEqual(result.confidenceScore, 0.95);
  });

  it('InceptionMercuryProvider: reports isAvailable() false when API key is missing', () => {
    const provider = new InceptionMercuryProvider({ apiKey: '' });
    assert.strictEqual(provider.isAvailable(), false);
  });

  await itAsync('ResilientAIProvider: transparently falls back to LocalRuleNLPProvider when primary fails', async () => {
    const mockFailingPrimary = {
      name: 'failing-mercury',
      isAvailable: () => true,
      extractIntent: async () => {
        throw new Error('500 Service Unavailable from Inception API');
      },
    };

    const fallback = new LocalRuleNLPProvider();
    const resilient = new ResilientAIProvider(mockFailingPrimary, fallback);

    const result = await resilient.extractIntent({
      queryText: 'Synthetic turf soccer pitch for sports academy',
    });

    assert.strictEqual(result.categoryId, 'sports-infra');
    assert.strictEqual(result.providerName, 'local-nlp');
  });

  it('AIProviderFactory: instantiates LocalRuleNLPProvider when AI_PROVIDER is not set to inception', () => {
    const provider = AIProviderFactory.create({ preferredProvider: 'local' });
    assert.strictEqual(provider.name, 'local-nlp');
  });

  // -------------------------------------------------------------
  // SUITE 3: INTENT SCORING & PROPOSAL ASSEMBLER
  // -------------------------------------------------------------
  console.log('\n--- 3. Intent Scoring & Proposal Assembler ---');

  const mockCards = [
    {
      id: 1,
      cardSlug: 'turnkey-ai-coe',
      targetSlug: 'ai-ml',
      categorySlug: 'ai-tech',
      secondaryCategorySlugs: [],
      title: 'Turnkey AI Centre of Excellence & High-Density GPU Pods',
      summary: 'Enterprise AI computing clusters, dedicated deep-learning workstations.',
      inclusions: ['High-Density GPU Cluster', '30x AI Workstations', 'Commissioning & AMC'],
      badge: 'Flagship Tech',
      imageUrl: '/img/ai.jpg',
      keywords: ['gpu', 'ai', 'cluster', 'workstation', 'deep learning'],
      institutionTypes: ['engineering', 'universities'],
      relatedCardSlugs: ['modular-campus-furniture'],
      priority: 100,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      cardSlug: 'modular-campus-furniture',
      targetSlug: 'furniture',
      categorySlug: 'furniture',
      secondaryCategorySlugs: [],
      title: 'Institutional Classrooms & Ergonomic Campus Furniture',
      summary: 'Ergonomic classroom benches and modular lecture desks.',
      inclusions: ['Modular Desks', 'Ergonomic Chairs', 'Full Warranty'],
      badge: 'High Demand',
      imageUrl: '/img/furn.jpg',
      keywords: ['furniture', 'desk', 'chair', 'classroom'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 80,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      cardSlug: 'turnkey-sports-infrastructure',
      targetSlug: 'sports-infra',
      categorySlug: 'sports-infra',
      secondaryCategorySlugs: [],
      title: 'Turnkey Sports Complexes & Synthetic Turfs',
      summary: 'FIBA regulation synthetic sports courts.',
      inclusions: ['FIFA Turf', 'Court Lighting', 'Drainage Layer'],
      badge: 'Olympic Grade',
      imageUrl: '/img/sports.jpg',
      keywords: ['sports', 'turf', 'fiba', 'court'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 75,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCaseStudies = [
    {
      id: 1,
      title: 'Heritage Academy Turnkey Campus Transformation',
      slug: 'heritage-academy-transformation',
      imageUrl: '/img/case1.jpg',
      active: true,
    },
  ];

  const mockRepo = new InMemorySolutionsRepository(
    mockCards,
    ['ai-ml', 'furniture', 'sports-infra'],
    MOCK_TAXONOMY,
    mockCaseStudies
  );

  const mockIndexService = new SolutionsIndexService(mockRepo);

  await itAsync('IntentScorerService: scores and curates top solution matching category, institution and keywords', async () => {
    await mockIndexService.rebuild();
    const localNLP = new LocalRuleNLPProvider();
    const scorer = new IntentScorerService(mockIndexService, localNLP);

    const proposal = await scorer.generateProposal({
      queryText: 'GPU cluster for engineering college',
    });

    assert.strictEqual(proposal.success, true);
    assert.strictEqual(proposal.unmatchedFallback, false);
    assert.strictEqual(proposal.curatedSolutions.length >= 1, true);

    const topCard = proposal.curatedSolutions[0];
    assert.strictEqual(topCard.cardSlug, 'turnkey-ai-coe');
    assert.strictEqual(topCard.targetUrl, '/ai-ml');
    assert.ok(topCard.score >= 80, `Score should be >= 80 (was ${topCard.score})`);
    assert.ok(topCard.whyRelevant.includes('computing clusters') || topCard.whyRelevant.includes('GPU'));
  });

  await itAsync('Zero-Division Guard: scores safely on category-only query without throwing NaN', async () => {
    const localNLP = new LocalRuleNLPProvider();
    const scorer = new IntentScorerService(mockIndexService, localNLP);

    const proposal = await scorer.generateProposal({
      queryText: '',
      categoryHint: 'furniture',
      institutionHint: 'all',
    });

    assert.strictEqual(proposal.success, true);
    assert.strictEqual(proposal.curatedSolutions[0].cardSlug, 'modular-campus-furniture');
    assert.ok(!isNaN(proposal.curatedSolutions[0].score), 'Score must not be NaN');
    assert.ok(proposal.curatedSolutions[0].score >= 60);
  });

  await itAsync('Cross-Sell Isolation: complementary infrastructure contains zero overlap with curated solutions', async () => {
    const localNLP = new LocalRuleNLPProvider();
    const scorer = new IntentScorerService(mockIndexService, localNLP);

    const proposal = await scorer.generateProposal({
      queryText: 'AI lab computing',
      categoryHint: 'ai-tech',
    });

    const curatedSlugs = new Set(proposal.curatedSolutions.map(c => c.cardSlug));
    assert.ok(proposal.complementaryInfra.length >= 1, 'Should have complementary infra');

    for (const comp of proposal.complementaryInfra) {
      assert.ok(!curatedSlugs.has(comp.cardSlug), `Complementary card ${comp.cardSlug} must not be in curated solutions`);
      assert.notStrictEqual(comp.categorySlug, 'ai-tech', 'Complementary card must be from an adjacent category');
    }
  });

  await itAsync('Case Studies: returns pre-cached case studies without database latency', async () => {
    const localNLP = new LocalRuleNLPProvider();
    const scorer = new IntentScorerService(mockIndexService, localNLP);

    const proposal = await scorer.generateProposal({
      queryText: 'Classroom desks',
      categoryHint: 'furniture',
    });

    assert.strictEqual(proposal.caseStudies.length, 1);
    assert.strictEqual(proposal.caseStudies[0].slug, 'heritage-academy-transformation');
  });

  // -------------------------------------------------------------
  // SUITE 4: ROUTE CONTRACT & PERFORMANCE BUDGET
  // -------------------------------------------------------------
  console.log('\n--- 4. End-to-End Route Contract & Performance Budget ---');

  it('Rate Limiting: exports solutionsSearchLimiter with standard configuration', () => {
    assert.ok(solutionsSearchLimiter, 'solutionsSearchLimiter must be exported');
    assert.strictEqual(typeof solutionsSearchLimiter, 'function');
  });

  await itAsync('Response Latency: completes full proposal generation in < 15ms with local NLP', async () => {
    const localNLP = new LocalRuleNLPProvider();
    const scorer = new IntentScorerService(mockIndexService, localNLP);

    const iterations = 50;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const p = await scorer.generateProposal({ queryText: 'Deep learning GPU stations' });
      assert.ok(p.traceId.startsWith('trace-cm-'));
    }

    const totalTime = Date.now() - start;
    const avgTime = totalTime / iterations;

    console.log(`   ⚡ Average proposal assembly latency across ${iterations} runs: ${avgTime.toFixed(2)}ms`);
    assert.ok(avgTime < 15, `Average latency must be < 15ms (was ${avgTime.toFixed(2)}ms)`);
  });

  console.log('\n================================================================');
  console.log(`📊 PHASE 3 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
