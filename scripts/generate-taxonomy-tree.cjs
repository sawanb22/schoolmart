const path = require('path');
const fs = require('fs');

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

const { PageSolutionsExtractor, MASTER_TAXONOMY_MAP } = require('../backend/src/services/solutions-finder/page-solutions-extractor');

// Load runSeed PAGE_DATA & corePages
const runSeedContent = fs.readFileSync('backend/src/runSeed.ts', 'utf8');
const startIdx = runSeedContent.indexOf('const PAGE_DATA:');
const endIdx = runSeedContent.indexOf('\nasync function seed()');
const snippet = runSeedContent.slice(startIdx, endIdx);
const jsonLike = snippet.replace(/const PAGE_DATA:[\s\S]*?=\s*\{/, '{').replace(/;[\s\n]*$/, '');
const rawPageData = eval('(' + jsonLike + ')');

const corePagesMatch = runSeedContent.match(/const corePages\s*=\s*\[([\s\S]*?)\];/);
const corePages = eval('[' + corePagesMatch[1] + ']');

const mockPages = corePages.map((p, idx) => ({
  id: idx + 1,
  title: p.title,
  slug: p.slug,
  template: p.template,
  published: true,
  pageData: rawPageData[p.slug] ? JSON.stringify(rawPageData[p.slug]) : null,
}));

const extractedCards = PageSolutionsExtractor.extractFromPages(mockPages);

console.log('Total extracted solution cards across live CMS pages:', extractedCards.length);

// Group by Category -> Subcategory -> Cards
const tree = {};
for (const [catId, def] of Object.entries(MASTER_TAXONOMY_MAP)) {
  tree[catId] = {
    label: def.label,
    subcategories: {},
  };
  for (const sub of def.subcategories) {
    tree[catId].subcategories[sub] = [];
  }
}

for (const card of extractedCards) {
  const cat = card.categorySlug;
  const sub = card.subcategorySlug || 'General';
  if (!tree[cat]) {
    tree[cat] = { label: cat, subcategories: {} };
  }
  if (!tree[cat].subcategories[sub]) {
    tree[cat].subcategories[sub] = [];
  }
  tree[cat].subcategories[sub].push({
    title: card.title,
    targetSlug: card.targetSlug,
    cardSlug: card.cardSlug,
  });
}

// Print tree
for (const [catId, catObj] of Object.entries(tree)) {
  console.log(`\n======================================================`);
  console.log(`📂 [${catId}] ${catObj.label.toUpperCase()}`);
  console.log(`======================================================`);
  for (const [subName, cardsList] of Object.entries(catObj.subcategories)) {
    console.log(`  ├── 🏷️  Subcategory: ${subName} (${cardsList.length} live cards)`);
    for (const c of cardsList) {
      console.log(`  │     • "${c.title}" -> /${c.targetSlug}`);
    }
  }
}
