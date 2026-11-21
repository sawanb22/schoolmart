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
  project: path.resolve('./backend/tsconfig.json'),
});

const { PageSolutionsExtractor } = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/page-solutions-extractor'));
const { LocalRuleNLPProvider } = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/ai-providers/local-nlp.provider'));
const { InMemorySolutionsRepository } = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/in-memory-solutions.repository'));
const { SolutionsIndexService } = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/solutions-index.service'));
const { IntentScorerService } = require(path.resolve(__dirname, '../backend/src/services/solutions-finder/intent-scorer.service'));

async function check() {
  const extractor = new PageSolutionsExtractor();
  const sportsPage = {
    id: 37,
    title: 'Sports Infrastructure',
    slug: 'sports-infra',
    template: 'sports-infra',
    sections: [
      {
        section_key: 'sports_facilities',
        title: 'Campus Sporting Arenas & Courts',
        content: {
          facilities: [
            { title: 'Basketball Court', slug: 'basketball-court', subtitle: 'FIBA-compliant wooden and acrylic cushioned surfaces' },
            { title: 'Indoor Badminton Arena', slug: 'indoor-badminton-arena', subtitle: 'BWF-standard shock-absorbing vinyl mats paired with anti-glare high-bay LED' },
            { title: 'Tennis Court', slug: 'tennis-court', subtitle: 'ITF-approved multi-layer synthetic acrylic surfaces' },
            { title: 'Football Turf', slug: 'football-turf', subtitle: 'FIFA-standard artificial turf and drainage' },
            { title: 'Olympic Swimming Pool', slug: 'olympic-swimming-pool', subtitle: 'FINA-standard 50m pool with filtration' }
          ]
        }
      },
      {
        section_key: 'court_layouts',
        title: 'Architectural & Regulation Court Layouts',
        content: {
          description: 'BWF, FIBA, FIFA and World Athletics court blueprints, spectator seating geometry, player locker facilities.'
        }
      }
    ]
  };

  const aiPage = {
    id: 10,
    title: 'Turnkey AI Centre of Excellence & High-Density GPU Pods',
    slug: 'ai-ml',
    template: 'solution-standard',
    sections: [{ section_key: 'overview', title: 'AI Pods', content: { text: 'Deep learning clusters' } }]
  };

  const sportsCards = extractor.extractFromPage(sportsPage);
  const aiCards = extractor.extractFromPage(aiPage);

  const repo = new InMemorySolutionsRepository([...sportsCards, ...aiCards]);
  repo.setPublishedSlugs(['sports-infra', 'ai-ml']);
  const indexService = new SolutionsIndexService(repo);
  const nlp = new LocalRuleNLPProvider();
  const scorer = new IntentScorerService(nlp, repo, indexService);

  const res = await scorer.scoreAndRank({
    query: 'seting bedminton court indoor',
    institutionType: 'all',
    categoryHint: 'sports-infra'
  });

  console.log('QUERY: "seting bedminton court indoor"');
  console.log('CATEGORY HINT: sports-infra\n');
  console.log('--- SECTION A (Intent Header) ---');
  console.log('Headline:', res.intent.headline);
  console.log('Narrative:', res.intent.narrative);
  console.log('Tags:', res.intent.tags);

  console.log('\n--- SECTION B (Curated Recommended Cards: 6 Cards) ---');
  res.curatedSolutions.forEach((c, idx) => {
    console.log(`Card #${idx + 1}: ${c.title}`);
    console.log(`    Target URL: /${c.targetSlug}`);
    console.log(`    Category: ${c.category}`);
    console.log(`    Why Relevant: ${c.whyRelevant}`);
  });
}
check();
