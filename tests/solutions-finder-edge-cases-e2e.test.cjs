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
  console.log('🧪 COMPREHENSIVE END-TO-END PIPELINE EDGE CASES TEST SUITE');
  console.log('================================================================\n');

  // Build representative pages across all core campus domains
  const mockPages = [
    {
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
            description: 'FIBA-compliant wooden and acrylic cushioned surfaces engineered for shock absorption and heavy competition.',
            image: '/img/basketball.jpg',
          },
          {
            title: 'Indoor Badminton Arena',
            description: 'BWF-standard shock-absorbing vinyl mats paired with anti-glare high-bay sports LED illumination and acoustic dampening.',
            image: '/img/badminton.jpg',
          },
          {
            title: 'Football Ground',
            description: 'FIFA-standard artificial turf and natural grass pitches with laser-leveled sub-base drainage and floodlighting systems.',
            image: '/img/football.jpg',
          },
          {
            title: 'Tennis Court',
            description: 'ITF-approved multi-layer synthetic acrylic surfaces offering true ball response, high-traction grip, and all-weather durability.',
            image: '/img/tennis.jpg',
          },
          {
            title: 'Swimming Pool',
            description: 'Semi-Olympic aquatic facilities with commercial sand filtration, anti-slip surrounds, and competitive lane markers.',
            image: '/img/pool.jpg',
          },
          {
            title: 'Athletics Track',
            description: 'IAAF-certified seamless polyurethane running tracks designed for maximum energy return and athlete joint safety.',
            image: '/img/track.jpg',
          },
        ],
      }),
    },
    {
      id: 19,
      title: 'Campus Furniture Solutions',
      slug: 'furniture',
      template: 'furniture',
      published: true,
      pageData: JSON.stringify({
        heroTitle: 'Campus Furniture Solutions',
        cards: [
          {
            title: 'Ergonomic Classroom Seating',
            description: 'Posture-friendly student desks and chairs sized for college classrooms with durable metal frames.',
            image: '/img/classroom-seating.jpg',
          },
          {
            title: 'Executive Faculty Chair & Cabin Furniture',
            description: 'High-back ergonomic mesh chairs with adjustable lumbar support and executive office desks for professors.',
            image: '/img/faculty-chair.jpg',
          },
          {
            title: 'Auditorium Tiered Seating',
            description: 'Acoustic cushioned auditorium chairs with auto-tip mechanism and anti-panic writing tablets.',
            image: '/img/auditorium-seating.jpg',
          },
          {
            title: 'Modular Science Lab Workbench & Tables',
            description: 'Chemical-resistant phenolic resin laboratory tables and heavy-duty science workbenches with utility raceways.',
            image: '/img/lab-table.jpg',
          },
          {
            title: 'Hostel Bed & Study Table Cluster',
            description: 'Heavy gauge steel bunk beds, study tables, and personal wardrobe storage units for student residences.',
            image: '/img/hostel-furniture.jpg',
          },
          {
            title: 'Cafeteria Dining Table & Stools',
            description: 'Stainless steel easy-clean cafeteria dining tables with attached swivel round seats for high-density dining halls.',
            image: '/img/dining-table.jpg',
          },
        ],
      }),
    },
    {
      id: 21,
      title: 'Laboratory Solutions',
      slug: 'labs',
      template: 'labs',
      published: true,
      pageData: JSON.stringify({
        heroTitle: 'Laboratory Solutions',
        cards: [
          {
            title: 'Advanced Chemistry Laboratory',
            description: 'Ducted fume hoods, emergency safety eyewash stations, acid-resistant drainage, and centralized gas manifolds.',
            image: '/img/chem-lab.jpg',
          },
          {
            title: 'Physics & Optics Laboratory',
            description: 'Vibration-isolated optical breadboards, darkroom light traps, spectrometer mounts, and laser calibration tables.',
            image: '/img/physics-lab.jpg',
          },
          {
            title: 'Robotics & Maker Space Workshop',
            description: 'Industrial 3D printers, CNC milling units, soldering stations, and rapid electronic prototyping benches.',
            image: '/img/robotics-lab.jpg',
          },
        ],
      }),
    },
  ];

  // Extract dynamic cards
  const extractedCards = PageSolutionsExtractor.extractFromPages(mockPages);

  // Add macro flagship SearchCards
  const allCards = [
    ...extractedCards,
    {
      id: 1,
      cardSlug: 'turnkey-campus-master-planning',
      targetSlug: 'campus-master-planning',
      categorySlug: 'campus-design',
      secondaryCategorySlugs: [],
      title: 'Turnkey Campus Master Planning & Architectural Execution',
      summary: 'Comprehensive 50-year institutional master blueprints, zoning circulation, and architectural civil execution.',
      inclusions: ['Architectural Blueprint', 'Zoning & Circulation Plans', 'BOQ & Tender Specifications'],
      badge: 'Flagship Suite',
      imageUrl: '/img/master-plan.jpg',
      keywords: ['master planning', 'architecture', 'civil', 'campus layout', 'building'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['modular-campus-furniture', 'turnkey-sports-infrastructure'],
      priority: 100,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      cardSlug: 'modular-campus-furniture',
      targetSlug: 'furniture',
      categorySlug: 'furniture',
      secondaryCategorySlugs: [],
      title: 'Institutional Classrooms & Ergonomic Campus Furniture',
      summary: 'Ergonomic classroom seating, modular student desks, and faculty workstation fitouts.',
      inclusions: ['Ergonomic Desks & Benches', 'Modular Faculty Workstations', 'Assembly & 5-Year Warranty'],
      badge: 'High Demand',
      imageUrl: '/img/modular-furniture.jpg',
      keywords: ['furniture', 'desks', 'benches', 'chairs', 'classroom seating', 'auditorium chairs', 'tables'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['turnkey-campus-master-planning', 'turnkey-digital-knowledge-hub'],
      priority: 95,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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
      keywords: ['sports', 'synthetic track', 'badminton court', 'football turf', 'indoor stadium', 'cricket ground'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['campus-student-amenities-hub', 'modular-campus-furniture'],
      priority: 95,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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
      keywords: ['ai', 'gpu cluster', 'machine learning', 'centre of excellence', 'deep learning'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['nextgen-smart-classrooms'],
      priority: 100,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 6,
      cardSlug: 'nextgen-smart-classrooms',
      targetSlug: 'smart-classrooms',
      categorySlug: 'ai-tech',
      secondaryCategorySlugs: [],
      title: 'Next-Gen Interactive Digital Smart Classrooms',
      summary: 'Interactive flat panels, PTZ lecture capture tracking cameras, and unified audiovisual touch control.',
      inclusions: ['86" Interactive Flat Panels', 'AI PTZ Lecture Tracking', 'Acoustic Sound Podiums'],
      badge: 'High Demand',
      imageUrl: '/img/smart-classroom.jpg',
      keywords: ['smart classrooms', 'interactive panels', 'lecture capture', 'digital boards'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['turnkey-ai-coe'],
      priority: 90,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 7,
      cardSlug: 'turnkey-digital-knowledge-hub',
      targetSlug: 'libraries',
      categorySlug: 'libraries',
      secondaryCategorySlugs: [],
      title: 'Digital Knowledge Centers & Modern Library Infrastructure',
      summary: 'Automated RFID self-check kiosks, digital cataloguing systems, and quiet reading study pods.',
      inclusions: ['RFID Self-Checkout Kiosks', 'Automated Security Gates', 'Acoustic Reading Commons'],
      badge: 'Knowledge Hub',
      imageUrl: '/img/library.jpg',
      keywords: ['library', 'rfid', 'digital library', 'e-resources', 'reading pods'],
      institutionTypes: ['all'],
      relatedCardSlugs: ['modular-campus-furniture'],
      priority: 85,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 20,
      cardSlug: 'campus-student-amenities-hub',
      targetSlug: 'additional-infra',
      categorySlug: 'additional-infra',
      secondaryCategorySlugs: [],
      title: 'Student Life, Hostels & Dining Infrastructure',
      summary: 'Modern student hostels, centralized campus food courts, and medical infirmaries.',
      inclusions: ['Student Hostel Fitouts', 'Food Court Stations', 'Campus Health Infirmary'],
      badge: 'Student Living',
      imageUrl: '/img/amenities.jpg',
      keywords: ['amenities', 'hostel', 'cafeteria', 'wellness', 'student life'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 80,
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
      summary: 'Campus ERP systems, smart biometric access, and solar energy IoT monitoring.',
      inclusions: ['Campus Cloud ERP', 'Biometric & RFID Gates', 'Smart Energy Sensors'],
      badge: 'Smart Campus',
      imageUrl: '/img/automation.jpg',
      keywords: ['automation', 'erp', 'security', 'cctv', 'surveillance'],
      institutionTypes: ['all'],
      relatedCardSlugs: [],
      priority: 75,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const repo = new InMemorySolutionsRepository(
    allCards,
    ['sports-infra', 'furniture', 'labs', 'ai-tech', 'ai-ml', 'smart-classrooms', 'libraries', 'campus-design', 'campus-master-planning', 'additional-infra', 'automation'],
    null,
    []
  );

  const indexService = new SolutionsIndexService(repo);
  await indexService.rebuild();

  const provider = new LocalRuleNLPProvider();
  const scorer = new IntentScorerService(indexService, provider);

  // ============================================================================
  // EDGE CASE SUITE 1: SPORTS (Badminton, Basketball, Tennis, Football, Track)
  // ============================================================================
  console.log('--- 1. Sports Edge Cases ---');

  await runAsyncTest('Edge Case 1.1: "seting bedminton court indoor" (with typos)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'seting bedminton court indoor',
      institutionHint: 'all',
      categoryHint: 'sports-infra',
    });

    assert.ok(proposal.curatedSolutions.length >= 3, 'Must return at least 3 curated cards');
    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Indoor Badminton Arena', 'Rank 1 must be Indoor Badminton Arena');
    assert.strictEqual(r1.targetUrl, '/sports-infra/indoor-badminton-arena', 'Must link directly to badminton leaf route');
    assert.strictEqual(r1.inclusions.length, 3, 'Must have strictly 3 inclusions');
    assert.ok(r1.whyRelevant.toLowerCase().includes('badminton'), 'Rationale must be badminton-specific');

    // Category isolation check: no AI cards in sports search
    const hasAi = proposal.curatedSolutions.some(c => c.categorySlug === 'ai-tech');
    assert.strictEqual(hasAi, false, 'Sports search must have zero AI category cards');
  });

  await runAsyncTest('Edge Case 1.2: "basktball" (single word typo, open category)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'basktball',
      institutionHint: 'all',
      categoryHint: 'all',
    });

    assert.ok(proposal.curatedSolutions.length >= 2);
    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Basketball Court', 'Rank 1 must be Basketball Court');
    assert.strictEqual(r1.targetUrl, '/sports-infra/basketball-court');
    assert.ok(r1.whyRelevant.toLowerCase().includes('basketball') || r1.whyRelevant.toLowerCase().includes('court'));
  });

  await runAsyncTest('Edge Case 1.3: "football ground with fifa turf"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'football ground with fifa turf',
      institutionHint: 'all',
      categoryHint: 'sports-infra',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Football Ground', 'Rank 1 must be Football Ground');
    assert.strictEqual(r1.targetUrl, '/sports-infra/football-ground');
  });

  // ============================================================================
  // EDGE CASE SUITE 2: SEATING & CHAIRS (Auditorium, Classroom, Faculty)
  // ============================================================================
  console.log('\n--- 2. Seating & Chair Edge Cases ---');

  await runAsyncTest('Edge Case 2.1: "auditorium seating for 500 students" (seating + scale number)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'auditorium seating for 500 students',
      institutionHint: 'universities',
      categoryHint: 'furniture',
    });

    assert.ok(proposal.curatedSolutions.length >= 3);
    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Auditorium Tiered Seating', 'Rank 1 must be Auditorium Tiered Seating');
    assert.strictEqual(r1.targetUrl, '/furniture/auditorium-tiered-seating');
    assert.strictEqual(proposal.requirementSummary.scale, '500 students', 'Must extract scale "500 students"');
    assert.strictEqual(proposal.requirementSummary.categoryId, 'furniture');
  });

  await runAsyncTest('Edge Case 2.2: "ergonomic faculty chair with lumbar support" (particular chair)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'ergonomic faculty chair with lumbar support',
      institutionHint: 'engineering',
      categoryHint: 'furniture',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Executive Faculty Chair & Cabin Furniture', 'Rank 1 must be Faculty Chair');
    assert.strictEqual(r1.targetUrl, '/furniture/executive-faculty-chair-cabin-furniture');
    assert.strictEqual(r1.inclusions.length, 3);
  });

  await runAsyncTest('Edge Case 2.3: "classroom seating for collegiate students"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'classroom seating for collegiate students',
      institutionHint: 'all',
      categoryHint: 'furniture',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Ergonomic Classroom Seating', 'Rank 1 must be Ergonomic Classroom Seating');
    assert.strictEqual(r1.targetUrl, '/furniture/ergonomic-classroom-seating');
  });

  await runAsyncTest('Edge Case 2.4: "campus furniture and student desks" (general furniture search)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'campus furniture and student desks',
      institutionHint: 'all',
      categoryHint: 'furniture',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.ok(r1.title.includes('Furniture') || r1.title.includes('Seating'), 'Rank 1 must be furniture-related');
    assert.strictEqual(r1.categorySlug, 'furniture');
    assert.ok(r1.targetUrl.startsWith('/furniture'));
  });

  // ============================================================================
  // EDGE CASE SUITE 3: TABLES & WORKBENCHES (Lab, Cafeteria, Study)
  // ============================================================================
  console.log('\n--- 3. Table & Workbench Edge Cases ---');

  await runAsyncTest('Edge Case 3.1: "modular science lab workbench & tables" (tables in furniture/labs)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'modular science lab workbench & tables',
      institutionHint: 'engineering',
      categoryHint: 'furniture',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Modular Science Lab Workbench & Tables');
    assert.strictEqual(r1.targetUrl, '/furniture/modular-science-lab-workbench-tables');
    assert.strictEqual(r1.inclusions.length, 3);
  });

  await runAsyncTest('Edge Case 3.2: "cafeteria dining table and dining hall seating"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'cafeteria dining table and dining hall seating',
      institutionHint: 'all',
      categoryHint: 'furniture',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Cafeteria Dining Table & Stools');
    assert.strictEqual(r1.targetUrl, '/furniture/cafeteria-dining-table-stools');
  });

  // ============================================================================
  // EDGE CASE SUITE 4: SCIENCE & HEALTHCARE LABS
  // ============================================================================
  console.log('\n--- 4. Science & Healthcare Labs Edge Cases ---');

  await runAsyncTest('Edge Case 4.1: "advanced chemistry lab with fume hoods" (chemistry lab setup)', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'advanced chemistry lab with fume hoods',
      institutionHint: 'all',
      categoryHint: 'labs',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Advanced Chemistry Laboratory');
    assert.strictEqual(r1.targetUrl, '/labs/advanced-chemistry-laboratory');
    assert.ok(r1.whyRelevant.toLowerCase().includes('lab') || r1.whyRelevant.toLowerCase().includes('national'));
  });

  await runAsyncTest('Edge Case 4.2: "robotics maker space workshop with 3d printers"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'robotics maker space workshop with 3d printers',
      institutionHint: 'engineering',
      categoryHint: 'labs',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Robotics & Maker Space Workshop');
    assert.strictEqual(r1.targetUrl, '/labs/robotics-maker-space-workshop');
  });

  // ============================================================================
  // EDGE CASE SUITE 5: AI & DIGITAL TECHNOLOGY
  // ============================================================================
  console.log('\n--- 5. AI & Digital Tech Edge Cases ---');

  await runAsyncTest('Edge Case 5.1: "high density gpu cluster for ai deep learning"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'high density gpu cluster for ai deep learning',
      institutionHint: 'all',
      categoryHint: 'ai-tech',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Turnkey AI Centre of Excellence & High-Density GPU Pods');
    assert.strictEqual(r1.targetUrl, '/ai-ml');
    assert.ok(r1.whyRelevant.toLowerCase().includes('computing') || r1.whyRelevant.toLowerCase().includes('ai'));
  });

  await runAsyncTest('Edge Case 5.2: "interactive digital smart classrooms with panel 86 inch"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'interactive digital smart classrooms with panel 86 inch',
      institutionHint: 'all',
      categoryHint: 'ai-tech',
    });

    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Next-Gen Interactive Digital Smart Classrooms');
    assert.strictEqual(r1.targetUrl, '/smart-classrooms');
  });

  // ============================================================================
  // EDGE CASE SUITE 6: FULL UI SECTION INVARIANTS (Sections A, B, C)
  // ============================================================================
  console.log('\n--- 6. End-to-End UI Presentation Invariants ---');

  await runAsyncTest('Edge Case 6.1: Section A contains genuine consultative headline, narrative & tags', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'Setup an Olympic swimming pool and fitness gym for sports college',
      institutionHint: 'all',
      categoryHint: 'sports-infra',
    });

    // Section A Invariants
    assert.ok(proposal.requirementSummary.headline.length > 5, 'Must have consultative headline');
    assert.ok(proposal.requirementSummary.narrative.length > 15, 'Must have executive narrative');
    assert.ok(proposal.requirementSummary.userTags.length >= 1, 'Must have user tags');
    assert.ok(!proposal.requirementSummary.narrative.includes('undefined'));
    assert.ok(!proposal.requirementSummary.headline.includes('undefined'));
    assert.ok(!proposal.requirementSummary.headline.toLowerCase().includes('turnkey'), 'Section A headline must be free of turnkey jargon');
    assert.ok(!proposal.requirementSummary.narrative.toLowerCase().includes('turnkey'), 'Section A narrative must be free of turnkey jargon');

    // Section B Invariants
    assert.ok(proposal.curatedSolutions.length >= 3 && proposal.curatedSolutions.length <= 6, 'Curated solutions count must be 3 to 6');
    proposal.curatedSolutions.forEach((c, idx) => {
      assert.ok(c.title && c.title.length > 3, `Card ${idx} must have non-empty title`);
      assert.ok(c.targetUrl && c.targetUrl.startsWith('/'), `Card ${idx} targetUrl must be a valid path: ${c.targetUrl}`);
      assert.strictEqual(c.inclusions.length, 3, `Card ${idx} must have strictly 3 inclusions`);
      assert.ok(c.whyRelevant && c.whyRelevant.length > 10, `Card ${idx} must have whyRelevant rationale`);
    });

    // Section C Invariants (Strictly 3 full-sized hub cards from complementary categories)
    assert.strictEqual(proposal.complementaryInfra.length, 3, 'Section C must contain strictly 3 complementary hub cards');
    const compCats = proposal.complementaryInfra.map(c => c.categorySlug);
    const uniqueCats = new Set(compCats);
    assert.strictEqual(uniqueCats.size, 3, 'Section C cards must all come from distinct complementary categories');
    assert.strictEqual(uniqueCats.has('sports-infra'), false, 'Section C must not duplicate the active category');
  });

  await runAsyncTest('Edge Case 6.2: Anti-jargon, natural grammar and explicit scale for "i needs 40 chairs"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'i needs 40 chairs',
      institutionHint: 'all',
      categoryHint: 'furniture',
    });

    // Headline check
    assert.ok(proposal.requirementSummary.headline.startsWith('Solutions for your'), 'Headline must start with Solutions for your...');
    assert.ok(!proposal.requirementSummary.headline.toLowerCase().includes('turnkey'), 'Headline must have zero turnkey jargon');

    // Narrative check: MUST NOT contain conversational noise
    assert.ok(!proposal.requirementSummary.narrative.includes('i needs'), 'Narrative must strip raw "i needs" noise');
    assert.ok(!proposal.requirementSummary.narrative.includes('looking to establish i needs'), 'Must not have broken grammar concatenation');
    assert.ok(!proposal.requirementSummary.narrative.toLowerCase().includes('turnkey'), 'Narrative must have zero turnkey jargon');

    // Scale check: scale MUST be extracted because it was explicitly stated
    assert.strictEqual(proposal.requirementSummary.scale, '40 chairs', 'Scale must be accurately extracted from 40 chairs');
    assert.ok(proposal.requirementSummary.narrative.includes('40 chairs'), 'Narrative must mention the explicit scale');
  });

  await runAsyncTest('Edge Case 6.3: Non-forced scale for "seting bedminton court indoor"', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'seting bedminton court indoor',
      institutionHint: 'all',
      categoryHint: 'sports-infra',
    });

    // Scale check: Must NOT force or hallucinate a scale if user did not provide numbers
    assert.strictEqual(proposal.requirementSummary.scale, null, 'Must NOT force a scale when no numbers are provided');
    assert.ok(!proposal.requirementSummary.narrative.includes('undefined'), 'No undefined in narrative');
    assert.ok(!proposal.requirementSummary.narrative.toLowerCase().includes('turnkey'), 'Narrative must have zero turnkey jargon');
    assert.ok(proposal.requirementSummary.narrative.toLowerCase().includes('badminton'), 'Narrative must cleanly reference badminton');
  });

  await runAsyncTest('Edge Case 6.4: Conversational prefix and punctuation stripping ("??? please provide 100 student desks and chairs for new campus !!!")', async () => {
    const proposal = await scorer.generateProposal({
      queryText: '??? please provide 100 student desks and chairs for new campus !!!',
      institutionHint: 'all',
      categoryHint: 'furniture',
    });

    assert.ok(proposal.requirementSummary.headline.startsWith('Solutions for your'), 'Headline must be properly formatted');
    assert.ok(!proposal.requirementSummary.narrative.includes('please provide'), 'Conversational prefix must be stripped');
    assert.ok(!proposal.requirementSummary.narrative.includes('???'), 'Punctuation noise must be stripped');
    assert.ok(!proposal.requirementSummary.narrative.toLowerCase().includes('turnkey'), 'Narrative must have zero turnkey jargon');
    assert.ok(proposal.requirementSummary.scale && proposal.requirementSummary.scale.includes('100'), 'Must extract scale 100');
  });

  await runAsyncTest('Edge Case 6.5: Empty or whitespace query resilience ("   ")', async () => {
    const proposal = await scorer.generateProposal({
      queryText: '   ',
      institutionHint: 'all',
      categoryHint: 'all',
    });

    assert.ok(proposal.success, 'Proposal must succeed even with whitespace query');
    assert.ok(proposal.requirementSummary.headline.length > 5, 'Must have a default headline');
    assert.ok(!proposal.requirementSummary.headline.includes('undefined'), 'Headline must not contain undefined');
    assert.ok(proposal.curatedSolutions.length >= 3, 'Must return default curated solutions');
    assert.strictEqual(proposal.requirementSummary.scale, null, 'Scale must be null for empty query');
  });

  await runAsyncTest('Edge Case 6.6: Medical college domain detection ("medical college looking for anatomy lab and dissection tables")', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'medical college looking for anatomy lab and dissection tables',
      institutionHint: null,
      categoryHint: null,
    });

    assert.strictEqual(proposal.requirementSummary.institutionId, 'medical', 'Must identify medical college');
    assert.ok(proposal.requirementSummary.headline.toLowerCase().includes('medical'), 'Headline must reference medical college');
    assert.strictEqual(proposal.requirementSummary.scale, null, 'Must NOT force a scale');
    assert.ok(!proposal.requirementSummary.narrative.toLowerCase().includes('turnkey'), 'Narrative must have zero turnkey jargon');
  });

  await runAsyncTest('Edge Case 6.7: Single word queries ("chair", "badminton", "table")', async () => {
    const chairProposal = await scorer.generateProposal({ queryText: 'chair', institutionHint: 'all', categoryHint: 'all' });
    assert.strictEqual(chairProposal.requirementSummary.scale, null, 'Scale must be null for "chair"');
    assert.ok(!chairProposal.requirementSummary.narrative.toLowerCase().includes('turnkey'));
    assert.strictEqual(chairProposal.curatedSolutions[0].categorySlug, 'furniture');

    const badmintonProposal = await scorer.generateProposal({ queryText: 'badminton', institutionHint: 'all', categoryHint: 'all' });
    assert.strictEqual(badmintonProposal.requirementSummary.scale, null, 'Scale must be null for "badminton"');
    assert.strictEqual(badmintonProposal.curatedSolutions[0].title, 'Indoor Badminton Arena');

    const tableProposal = await scorer.generateProposal({ queryText: 'table', institutionHint: 'all', categoryHint: 'all' });
    assert.strictEqual(tableProposal.requirementSummary.scale, null, 'Scale must be null for "table"');
    assert.strictEqual(tableProposal.curatedSolutions[0].categorySlug, 'furniture');
  });

  await runAsyncTest('Edge Case 6.8: Large scale with commas ("auditorium seating for 1,200 students")', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'auditorium seating for 1,200 students',
      institutionHint: 'all',
      categoryHint: 'furniture',
    });

    assert.ok(proposal.requirementSummary.scale.includes('1,200'), 'Must capture scale with comma format: 1,200');
    assert.ok(proposal.requirementSummary.narrative.includes('1,200'), 'Narrative must include scale');
  });

  // ============================================================================
  // EDGE CASE SUITE 7: UNMATCHED FALLBACK & OPEN PROMPT WITHOUT HINTS
  // ============================================================================
  console.log('\n--- 7. Unmatched Fallback & Zero-Hint Resilience ---');

  await runAsyncTest('Edge Case 7.1: Zero-match exotic query ("xylophone quantum accelerator") gracefully falls back', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'xylophone quantum accelerator',
      institutionHint: null,
      categoryHint: null,
    });

    assert.ok(proposal.curatedSolutions.length >= 3, 'Must return fallback cards rather than failing');
    assert.strictEqual(proposal.complementaryInfra.length, 3, 'Section C must still return strictly 3 hub cards');
  });

  await runAsyncTest('Edge Case 7.2: Open query without category or institution hints ("bedminton")', async () => {
    const proposal = await scorer.generateProposal({
      queryText: 'bedminton',
      institutionHint: null,
      categoryHint: null,
    });

    assert.ok(proposal.curatedSolutions.length >= 1);
    const r1 = proposal.curatedSolutions[0];
    assert.strictEqual(r1.title, 'Indoor Badminton Arena', 'Rank 1 must be Badminton even with zero hints provided');
    assert.strictEqual(r1.targetUrl, '/sports-infra/indoor-badminton-arena');
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
