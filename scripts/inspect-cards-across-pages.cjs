const fs = require('fs');
const runSeedContent = fs.readFileSync('backend/src/runSeed.ts', 'utf8');

const startIdx = runSeedContent.indexOf('const PAGE_DATA:');
const endIdx = runSeedContent.indexOf('\nasync function seed()');
const snippet = runSeedContent.slice(startIdx, endIdx);

// Remove 'const PAGE_DATA: Record<string, any> = '
const jsonLike = snippet.replace(/const PAGE_DATA:[\s\S]*?=\s*\{/, '{').replace(/;[\s\n]*$/, '');
const rawPageData = eval('(' + jsonLike + ')');

console.log('Successfully loaded PAGE_DATA for', Object.keys(rawPageData).length, 'pages:');

for (const [slug, data] of Object.entries(rawPageData)) {
  const cards = data.cards || data.sections || [];
  console.log(`\n📄 [${slug}] (heroTitle: "${data.heroTitle || 'N/A'}") -> ${cards.length} items`);
  for (const c of cards) {
    console.log(`   - "${c.title || c.heading || c.name}" | categories: ${JSON.stringify(c.categories || c.category || null)} | href: ${c.href || 'none'}`);
  }
}
