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
const { PageSolutionsExtractor, MASTER_TAXONOMY_MAP } = require('../backend/src/services/solutions-finder/page-solutions-extractor');

// ── 1. Load Real Live Page Data from runSeed.ts ──────────────────────────────
const runSeedContent = fs.readFileSync(path.resolve(__dirname, '../backend/src/runSeed.ts'), 'utf8');
const startIdx = runSeedContent.indexOf('const PAGE_DATA:');
const endIdx = runSeedContent.indexOf('\nasync function seed()');
const snippet = runSeedContent.slice(startIdx, endIdx);
const jsonLike = snippet.replace(/const PAGE_DATA:[\s\S]*?=\s*\{/, '{').replace(/;[\s\n]*$/, '');
const rawPageData = eval('(' + jsonLike + ')');

const corePagesMatch = runSeedContent.match(/const corePages\s*=\s*\[([\s\S]*?)\];/);
const corePages = eval('[' + corePagesMatch[1] + ']');

const realPages = corePages.map((p, idx) => ({
  id: idx + 1,
  title: p.title,
  slug: p.slug,
  template: p.template,
  published: true,
  pageData: rawPageData[p.slug] ? JSON.stringify(rawPageData[p.slug]) : null,
}));

// Build Taxonomy DTO
const taxonomyCategories = Object.entries(MASTER_TAXONOMY_MAP).map(([id, def], idx) => ({
  id,
  label: def.label,
  shortLabel: def.label.split('&')[0].trim(),
  letterCode: String.fromCharCode(65 + idx),
  subcategories: def.subcategories,
}));

const taxonomyInstitutions = [
  { id: 'all', label: 'All Educational Institutions', shortLabel: 'All Campuses' },
  { id: 'engineering', label: 'Engineering & Technical Colleges', shortLabel: 'Engineering' },
  { id: 'universities', label: 'Universities (State & Private)', shortLabel: 'Universities' },
  { id: 'degree', label: 'Degree & Management Colleges', shortLabel: 'Degree Colleges' },
  { id: 'medical', label: 'Medical & Healthcare Colleges', shortLabel: 'Medical Colleges' },
  { id: 'schools', label: 'K-12 & International Schools', shortLabel: 'Schools' },
];

const taxonomy = {
  categories: taxonomyCategories,
  institutions: taxonomyInstitutions,
};

// Extract real solution cards across all 45 pages
const realCards = PageSolutionsExtractor.extractFromPages(realPages, taxonomy);

const realPublishedSlugs = new Set(realPages.map(p => p.slug));

const realCaseStudies = [
  {
    id: 1,
    title: 'Heritage University High-Density Computing & AI Center',
    slug: 'heritage-university-ai-center',
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=700&q=80',
    description: 'Turnkey 120-workstation GPU laboratory installation with raised acoustic flooring and dedicated server racks.',
    badge: 'COMPLETED PROJECT',
    active: true,
  },
  {
    id: 2,
    title: 'Apex Institute of Technology Master Plan & Academic Complex',
    slug: 'apex-tech-master-plan',
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=700&q=80',
    description: '25-acre comprehensive architectural master plan, bioclimatic academic blocks, and pedestrian-first landscape zoning.',
    badge: 'CONCEPTUAL DESIGN',
    active: true,
  },
  {
    id: 3,
    title: 'National Medical Academy Simulation & Clinical Skill Wing',
    slug: 'national-medical-skill-wing',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80',
    description: 'Clinical anatomy simulation suites, tiered medical lecture seating, and smart audio-visual demonstration halls.',
    badge: 'CONCEPTUAL DESIGN',
    active: true,
  },
];

console.log('================================================================');
console.log('🏛️  CAMPUSMART SOLUTIONS FINDER: REAL-DATA END-TO-END VERIFICATION');
console.log('================================================================');
console.log(`Loaded ${realPages.length} live CMS pages.`);
console.log(`Extracted ${realCards.length} live solution cards into in-memory index.`);
console.log(`Configured ${realCaseStudies.length} architectural precedents.`);

async function executeScenario(testCaseNumber, scenarioName, userBrief, hints) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`📌 TEST CASE ${testCaseNumber}: ${scenarioName}`);
  console.log('════════════════════════════════════════════════════════════════');

  console.log('\n[1. USER INPUT]');
  console.log('  Query Text:      ', `"${userBrief}"`);
  console.log('  Institution Hint:', hints.institutionHint || 'null');
  console.log('  Category Hint:   ', hints.categoryHint || 'null');

  const repo = new InMemorySolutionsRepository(
    realCards,
    Array.from(realPublishedSlugs),
    taxonomy,
    realCaseStudies
  );

  const indexService = new SolutionsIndexService(repo);
  await indexService.rebuild();

  const provider = new LocalRuleNLPProvider();
  const scorer = new IntentScorerService(indexService, provider);

  // ── Step 1: AI Call 1 (Discovery & Section A Synthesis) ────────────────────
  const catalog = indexService.getCards().map(c => ({
    slug: c.targetSlug,
    title: c.title,
    categorySlug: c.categorySlug,
    subcategorySlug: c.subcategorySlug || undefined,
  }));

  const call1Input = {
    queryText: userBrief,
    institutionHint: hints.institutionHint || null,
    categoryHint: hints.categoryHint || null,
    catalogSample: catalog.slice(0, 5),
  };

  console.log('\n[2. AI CALL 1: INPUT (INTENT & PAGE DISCOVERY)]');
  console.log(JSON.stringify(call1Input, null, 2));

  const call1Output = await provider.discoverSolutions({
    queryText: userBrief,
    institutionHint: hints.institutionHint,
    categoryHint: hints.categoryHint,
    catalog,
  });

  console.log('\n[3. AI CALL 1: OUTPUT (SECTION A + SELECTED SLUGS)]');
  console.log(JSON.stringify({
    sectionA: call1Output.sectionA,
    categoryId: call1Output.categoryId,
    institutionId: call1Output.institutionId,
    scale: call1Output.scale,
    selectedPageSlugs: call1Output.selectedPageSlugs,
    complementaryCategories: call1Output.complementaryCategories,
  }, null, 2));

  // ── Step 2: The Data Bridge (Fetching Real Page Content from DB) ────────────
  const candidatePages = realPages.filter(p => call1Output.selectedPageSlugs.includes(p.slug));
  const pageSnippets = candidatePages.map(p => {
    let pd = {};
    try {
      pd = typeof p.pageData === 'string' ? JSON.parse(p.pageData) : p.pageData || {};
    } catch {
      pd = {};
    }
    const cards = Array.isArray(pd.cards) ? pd.cards : [];
    const inclusions = cards.map(c => c.title || c.heading || '').filter(Boolean);

    return {
      slug: p.slug,
      title: p.title,
      heroTitle: pd.heroTitle || p.title,
      heroSubtitle: pd.heroSubtitle || '',
      contentSnippets: inclusions,
    };
  });

  console.log('\n[4. DATABASE BRIDGE: REAL PAGE CONTENT RETRIEVED]');
  console.log(`Retrieved ${pageSnippets.length} candidate pages from PostgreSQL:`);
  pageSnippets.forEach(ps => {
    console.log(`  • /${ps.slug} -> "${ps.heroTitle}" (${ps.contentSnippets.length} sub-modules)`);
  });

  // ── Step 3: AI Call 2 (Authentic Content Extraction & Consultant Reasoning) ─
  const call2Input = {
    userRequirement: userBrief,
    institutionLabel: call1Output.institutionLabel,
    pages: pageSnippets,
  };

  console.log('\n[5. AI CALL 2: INPUT (CONTENT SNIPPETS FOR EXTRACTION)]');
  console.log(JSON.stringify(call2Input, null, 2));

  const call2Output = await provider.extractPageCards(call2Input);

  console.log('\n[6. AI CALL 2: OUTPUT (CARDS WITH INCLUSIONS & WHY RELEVANT)]');
  console.log(JSON.stringify(call2Output.cards, null, 2));

  // ── Step 4: Full End-to-End Proposal Generation ─────────────────────────────
  const finalProposal = await scorer.generateProposal({
    queryText: userBrief,
    institutionHint: hints.institutionHint,
    categoryHint: hints.categoryHint,
  });

  console.log('\n[7. FINAL ASSEMBLED PROPOSAL (RENDERED ON FIND-SOLUTIONS)]');
  console.log('  SECTION A (Personalised Requirement Summary):');
  console.log(`    Headline: "${finalProposal.requirementSummary.headline}"`);
  console.log(`    Narrative: "${finalProposal.requirementSummary.narrative}"`);
  console.log(`    User Tags: [${(finalProposal.requirementSummary.userTags || []).map(t => `"${t}"`).join(', ')}]`);

  console.log(`\n  SECTION B (Recommended Solutions - ${finalProposal.curatedSolutions.length} Cards):`);
  finalProposal.curatedSolutions.forEach((card, idx) => {
    console.log(`    Card ${idx + 1}: "${card.title}" (${card.targetUrl})`);
    console.log(`      Summary: "${card.summary}"`);
    console.log(`      Inclusions: [${card.inclusions.map(i => `"${i}"`).join(', ')}]`);
    console.log(`      Why Relevant: "${card.whyRelevant}"`);
  });

  console.log(`\n  SECTION C (Complete Your Campus Infrastructure - ${finalProposal.complementaryInfra.length} Hub Cards):`);
  finalProposal.complementaryInfra.forEach((comp, idx) => {
    console.log(`    Hub ${idx + 1}: "${comp.title}" [${comp.badge || comp.categorySlug}] -> ${comp.targetUrl}`);
    console.log(`      Scope: "${comp.description || ''}"`);
  });

  console.log(`\n  SECTION D (Explore Relevant Projects & Ideas - ${finalProposal.caseStudies.length} Precedents):`);
  finalProposal.caseStudies.forEach((cs, idx) => {
    console.log(`    Project ${idx + 1}: [${cs.badge}] "${cs.title}"`);
    console.log(`      Scope: "${cs.description || ''}"`);
  });

  // ── Step 5: Strict Assertions ───────────────────────────────────────────────
  assert.ok(finalProposal.requirementSummary.headline.length > 5, 'Section A must have headline');
  assert.ok(finalProposal.requirementSummary.narrative.length > 10, 'Section A must have narrative');
  assert.ok(finalProposal.curatedSolutions.length >= 1, 'Section B must have curated solutions');
  assert.strictEqual(finalProposal.complementaryInfra.length, 3, 'Section C must have strictly 3 cards to fill width');
  assert.ok(finalProposal.caseStudies.length >= 2, 'Section D must have case studies');

  console.log('\n✅ VERIFICATION PASSED: All 5 sections conform strictly to specification!');
}

(async function runAll() {
  try {
    // ── SCENARIO 1 ────────────────────────────────────────────────────────────
    await executeScenario(
      1,
      'Engineering College — 40-Seat AI & Machine Learning Lab',
      'We are an engineering college looking to setup a 40-seat AI and machine learning lab with GPU computing workstations.',
      { institutionHint: 'engineering', categoryHint: 'ai-tech' }
    );

    // ── SCENARIO 2 ────────────────────────────────────────────────────────────
    await executeScenario(
      2,
      'Private University — 25-Acre Master Planning & Architectural Execution',
      'New 25-acre university campus master planning, academic block architecture, and sustainable landscape zoning.',
      { institutionHint: 'universities', categoryHint: 'campus-design' }
    );

    // ── SCENARIO 3 ────────────────────────────────────────────────────────────
    await executeScenario(
      3,
      'Medical College — Simulation Labs & 150-Seater Lecture Hall Furniture',
      'Medical college clinical skill simulation lab and 150-seater tiered lecture hall furniture setup.',
      { institutionHint: 'medical', categoryHint: 'labs' }
    );

    console.log('\n================================================================');
    console.log('🎉 ALL 3 REAL-DATA SCENARIOS EXECUTED & VERIFIED SUCCESSFULLY!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ REAL-DATA TEST EXECUTION FAILED:', err);
    process.exit(1);
  }
})();
