const fs = require('fs');
const path = require('path');

const runSeedPath = path.join(__dirname, '../backend/src/runSeed.ts');
const content = fs.readFileSync(runSeedPath, 'utf8');

// Parse keys and titles from corePages
const corePagesMatch = content.match(/const corePages\s*=\s*\[([\s\S]*?)\];/);
if (!corePagesMatch) {
  console.log('Could not find corePages');
  process.exit(1);
}

const pages = eval('[' + corePagesMatch[1] + ']');
console.log('Total Core Pages:', pages.length);

// Also look at frontend/src/pages .data.ts files
const pagesDir = path.join(__dirname, '../frontend/src/pages');
const dataFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.data.ts'));
console.log('Total Data Files in frontend:', dataFiles.length);

for (const p of pages) {
  console.log(`- ${p.slug.padEnd(30)} -> Title: "${p.title}" | Template: "${p.template}"`);
}
