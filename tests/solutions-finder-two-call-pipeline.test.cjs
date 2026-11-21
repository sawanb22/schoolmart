const assert = require('assert');
const fs = require('fs');
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
    console.error(`❌ FAIL: ${name}\n   Error: ${err.message}`);
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

console.log('================================================================');
console.log('🧪 TWO-CALL AI SOLUTIONS FINDER & CLIENT SECTIONS TEST SUITE');
console.log('================================================================');

(async function main() {
  console.log('\n--- 1. AI Call 1 (Discovery & Section A Synthesis) ---');

  const provider = new LocalRuleNLPProvider();

  const mockCatalog = [
    { slug: 'ai-ml', title: 'AI & Machine Learning', categorySlug: 'ai-tech' },
    { slug: 'smart-classrooms', title: 'Smart Classrooms', categorySlug: 'ai-tech' },
    { slug: 'labs', title: 'Science & Engineering Labs', categorySlug: 'labs' },
    { slug: 'furniture', title: 'Campus Furniture', categorySlug: 'furniture' },
    { slug: 'campus-design', title: 'Campus Design', categorySlug: 'campus-design' },
  ];

  await runAsyncTest('AI Call 1: Extracts Section A headline, narrative and strictly authentic userTags', async () => {
    const res = await provider.discoverSolutions({
      queryText: 'Engineering college setting up a 40-seat AI lab',
      institutionHint: 'engineering',
      categoryHint: 'ai-tech',
      catalog: mockCatalog,
    });

    assert.ok(res.sectionA.headline.includes('Engineering'), 'Headline should reference Engineering');
    assert.ok(res.sectionA.narrative.includes('AI') || res.sectionA.narrative.includes('ai-tech'), 'Narrative should mention AI');
    assert.ok(res.sectionA.userTags.includes('Engineering & Technical Colleges'), 'Tags should have institution');
    assert.ok(res.sectionA.userTags.includes('40 seat'), 'Tags should have detected scale tag');
    assert.ok(res.selectedPageSlugs.includes('ai-ml'), 'Should select ai-ml from catalog');
  });

  await runAsyncTest('AI Call 1: Does NOT fabricate scale tags if not present in user query', async () => {
    const res = await provider.discoverSolutions({
      queryText: 'Looking for modern university furniture',
      institutionHint: 'universities',
      catalog: mockCatalog,
    });

    assert.strictEqual(res.scale, null);
    const hasNumericTag = res.sectionA.userTags.some(t => /\d+/.test(t));
    assert.strictEqual(hasNumericTag, false, 'Should not have numeric scale tag when unstated');
  });

  console.log('\n--- 2. AI Call 2 (Authentic Page Content Extraction & Reasoning) ---');

  await runAsyncTest('AI Call 2: Extracts inclusions strictly from page snippets and omits when absent', async () => {
    const pageWithSnippets = {
      slug: 'ai-ml',
      title: 'AI & Machine Learning',
      heroTitle: 'AI & Machine Learning Lab',
      heroSubtitle: 'Turnkey high-performance computing setups.',
      contentSnippets: [
        'AI Learning Stations: Interactive environments',
        'ML Experimentation Labs: Deep learning clusters',
        'Coding Platform Integration',
      ],
    };

    const emptyPage = {
      slug: 'empty-hub',
      title: 'Empty Hub',
      heroTitle: 'Empty Hub Overview',
      heroSubtitle: 'Overview description without sub-modules.',
      contentSnippets: [],
    };

    const res = await provider.extractPageCards({
      userRequirement: '40-seat AI lab for engineering college',
      institutionLabel: 'Engineering & Technical Colleges',
      pages: [pageWithSnippets, emptyPage],
    });

    assert.strictEqual(res.cards.length, 2);

    // Page 1 has 3 authentic inclusions
    const card1 = res.cards[0];
    assert.strictEqual(card1.inclusions.length, 3);
    assert.strictEqual(card1.inclusions[0], 'AI Learning Stations');
    assert.ok(card1.whyRelevant.length > 10, 'Must have consultant whyRelevant reasoning');

    // Page 2 has ZERO inclusions (Strict: never fake inclusions)
    const card2 = res.cards[1];
    assert.strictEqual(card2.inclusions.length, 0, 'Must return empty inclusions array when page has no sub-cards');
  });

  console.log('\n--- 3. End-to-End Proposal Assembler (Sections B, C, D) ---');

  const mockCards = [
    {
      id: 1,
      cardSlug: 'ai-ml-hub',
      targetSlug: 'ai-ml',
      categorySlug: 'ai-tech',
      secondaryCategorySlugs: [],
      title: 'AI & Machine Learning Lab',
      summary: 'Complete AI lab planning, workstations, and GPU infrastructure.',
      inclusions: ['AI Learning Stations', 'GPU Computing', 'ML Platforms'],
      badge: 'Flagship',
      imageUrl: '/img/ai.jpg',
      keywords: ['ai', 'gpu', 'workstation'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: ['smart-classrooms-hub', 'eng-labs-hub', 'campus-furniture-hub'],
      priority: 95,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      cardSlug: 'smart-classrooms-hub',
      targetSlug: 'smart-classrooms',
      categorySlug: 'ai-tech',
      secondaryCategorySlugs: [],
      title: 'Smart Classroom Infrastructure',
      summary: 'Interactive displays, AV systems and technology-enabled teaching spaces.',
      inclusions: ['Interactive Displays', 'Digital Podiums', 'Lecture Capture'],
      badge: 'High Demand',
      imageUrl: '/img/smart.jpg',
      keywords: ['smart', 'classroom', 'av'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: [],
      priority: 90,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      cardSlug: 'eng-labs-hub',
      targetSlug: 'labs',
      categorySlug: 'labs',
      secondaryCategorySlugs: [],
      title: 'Advanced Engineering Labs',
      summary: 'Specialised IoT, robotics, and testing benches.',
      inclusions: ['Robotics Benches', 'IoT Workstations', 'Safety Exhaust'],
      badge: 'Research Grade',
      imageUrl: '/img/labs.jpg',
      keywords: ['labs', 'engineering', 'robotics'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: [],
      priority: 85,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 4,
      cardSlug: 'campus-furniture-hub',
      targetSlug: 'furniture',
      categorySlug: 'furniture',
      secondaryCategorySlugs: [],
      title: 'University & Lab Furniture',
      summary: 'Modular ergonomic lab workstations and faculty seating.',
      inclusions: ['Lab Workbenches', 'Acoustic Chairs', 'Wire Trays'],
      badge: 'Ergonomic',
      imageUrl: '/img/furniture.jpg',
      keywords: ['furniture', 'desks', 'chairs'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: [],
      priority: 80,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 5,
      cardSlug: 'campus-networking-hub',
      targetSlug: 'automation',
      categorySlug: 'automation',
      secondaryCategorySlugs: [],
      title: 'Campus Networking & IT Infrastructure',
      summary: 'Gigabit fiber optic backbone, server racks, and high-density campus Wi-Fi.',
      inclusions: ['Fiber Backbone', 'Server Racks', 'Enterprise Wi-Fi'],
      badge: 'Infrastructure',
      imageUrl: '/img/network.jpg',
      keywords: ['networking', 'wifi', 'server'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: [],
      priority: 75,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 6,
      cardSlug: 'campus-library-hub',
      targetSlug: 'libraries',
      categorySlug: 'libraries',
      secondaryCategorySlugs: [],
      title: 'Digital Library & Research Resources',
      summary: 'Automated RFID book management and digital e-resource reading spaces.',
      inclusions: ['RFID Gates', 'Automated Kiosks', 'Reading Commons'],
      badge: 'Knowledge Hub',
      imageUrl: '/img/library.jpg',
      keywords: ['library', 'books', 'research'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: [],
      priority: 70,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 7,
      cardSlug: 'auditorium-complex-hub',
      targetSlug: 'turnkey-projects',
      categorySlug: 'turnkey-projects',
      secondaryCategorySlugs: [],
      title: 'Multipurpose Auditoriums & Convention Centres',
      summary: 'Acoustic engineering, tiered theatrical seating, and professional stage lighting.',
      inclusions: ['Acoustic Paneling', 'Tiered Seating', 'Stage AV'],
      badge: 'Turnkey Suite',
      imageUrl: '/img/auditorium.jpg',
      keywords: ['auditorium', 'theatre', 'convention'],
      institutionTypes: ['engineering'],
      relatedCardSlugs: [],
      priority: 65,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCaseStudies = [
    {
      id: 1,
      title: 'National Institute AI & Advanced Computing Center',
      slug: 'national-institute-ai-center',
      imageUrl: '/img/case1.jpg',
      description: 'Turnkey 120-workstation GPU laboratory installation with raised acoustic flooring.',
      active: true,
    },
    {
      id: 2,
      title: 'Apex University Robotics & AI Hub Master Plan',
      slug: 'apex-robotics-hub',
      imageUrl: '/img/case2.jpg',
      description: '3D architectural spatial concept with integrated server rooms and glass observation galleries.',
      active: true,
    },
  ];

  const repo = new InMemorySolutionsRepository(
    mockCards,
    ['ai-ml', 'smart-classrooms', 'labs', 'furniture', 'automation', 'libraries', 'turnkey-projects'],
    null,
    mockCaseStudies
  );

  const indexService = new SolutionsIndexService(repo);
  await indexService.rebuild();

  const scorer = new IntentScorerService(indexService, provider);

  await runAsyncTest('Proposal Assembler: Assembles Section B with authentic inclusions and consultant reasoning', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'Engineering college looking for 40-seat AI lab',
      institutionHint: 'engineering',
      categoryHint: 'ai-tech',
    });

    assert.ok(proposal.curatedSolutions.length >= 1, 'Must have curated solutions in Section B');
    const primary = proposal.curatedSolutions[0];
    assert.strictEqual(primary.targetUrl, '/ai-ml', 'Explore Solution must point to Hub page');
    assert.ok(primary.inclusions.length <= 3, 'Inclusions must not exceed 3');
    assert.ok(primary.whyRelevant.includes('computing') || primary.whyRelevant.includes('AI'), 'Consultant reason must be relevant');
  });

  await runAsyncTest('Proposal Assembler: Section C returns strictly 3 full-sized hub cards from adjacent categories', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'Engineering college looking for 40-seat AI lab',
      institutionHint: 'engineering',
      categoryHint: 'ai-tech',
    });

    assert.strictEqual(proposal.complementaryInfra.length, 3, 'Section C must contain strictly 3 cards to fill width');

    const curatedSlugs = new Set(proposal.curatedSolutions.map(c => c.cardSlug));
    for (const comp of proposal.complementaryInfra) {
      assert.ok(!curatedSlugs.has(comp.cardSlug), 'Section C must not duplicate Section B cards');
      assert.notStrictEqual(comp.categorySlug, 'ai-tech', 'Section C cards must be from adjacent categories');
      assert.ok(comp.description && comp.description.length > 5, 'Must have description for full-sized card render');
    }
  });

  await runAsyncTest('Proposal Assembler: Section D distinguishes Completed Project from Conceptual Design', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'Engineering college looking for 40-seat AI lab',
    });

    assert.ok(proposal.caseStudies.length >= 2, 'Section D must return case studies');
    const completed = proposal.caseStudies.find(cs => cs.badge === 'COMPLETED PROJECT');
    const conceptual = proposal.caseStudies.find(cs => cs.badge === 'CONCEPTUAL DESIGN');

    assert.ok(completed, 'Must have COMPLETED PROJECT badge');
    assert.ok(conceptual, 'Must have CONCEPTUAL DESIGN badge');
  });

  console.log('\n--- 4. Frontend UI Invariants (FindSolutions.tsx) ---');

  const frontendSource = fs.readFileSync(path.resolve(__dirname, '../frontend/src/pages/FindSolutions.tsx'), 'utf8');

  runTest('Frontend: Purged all developer robotic elements from customer UI', () => {
    assert.ok(!frontendSource.includes('DOSSIER REF:'), 'Must not display DOSSIER REF');
    assert.ok(!frontendSource.includes('DETECTED QUANTITY:'), 'Must not display DETECTED QUANTITY');
    assert.ok(!frontendSource.includes('[-] 40 [+]'), 'Must not contain robotic quantity stepper');
  });

  runTest('Frontend: Section B provides Explore Solution and Request Consultation buttons', () => {
    assert.ok(frontendSource.includes('Solutions We Recommend'), 'Section B client heading missing');
    assert.ok(frontendSource.includes('Explore Solution'), 'Explore Solution button missing');
    assert.ok(frontendSource.includes('Request Consultation'), 'Request Consultation button missing');
  });

  runTest('Frontend: Section C renders Complete Your Campus Infrastructure with 3 columns', () => {
    assert.ok(frontendSource.includes('Complete Your Campus Infrastructure'), 'Section C client heading missing');
    assert.ok(frontendSource.includes('grid-cols-1 md:grid-cols-3'), 'Section C 3-column edge-to-edge grid missing');
    assert.ok(frontendSource.includes('Explore Hub'), 'Explore Hub link missing');
  });

  runTest('Frontend: Section D renders Explore Relevant Projects & Ideas with status badges', () => {
    assert.ok(frontendSource.includes('Explore Relevant Projects & Ideas'), 'Section D client heading missing');
    assert.ok(frontendSource.includes('COMPLETED PROJECT'), 'Completed project badge missing');
    assert.ok(frontendSource.includes('CONCEPTUAL DESIGN'), 'Conceptual design badge missing');
  });

  runTest('Frontend: Section E renders Have a Specific Campus Requirement? with 10 fields', () => {
    assert.ok(frontendSource.includes("Have a Specific Campus Requirement? Let's Plan It Together."), 'Section E client heading missing');
    assert.ok(frontendSource.includes('formDesignation'), 'Designation field missing');
    assert.ok(frontendSource.includes('formProjectType'), 'Project Type field missing');
    assert.ok(frontendSource.includes('formBudget'), 'Budget field missing');
    assert.ok(frontendSource.includes('formTimeline'), 'Timeline field missing');
    assert.ok(frontendSource.includes('Submit My Requirement'), 'Submit My Requirement button missing');
  });

  console.log('================================================================');
  console.log(`📊 TOTAL RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
})();
