const fs = require('fs');
const content = fs.readFileSync('./tests/solutions-finder-edge-cases-e2e.test.cjs', 'utf8');
const modified = content.replace(
  'const r1 = proposal.curatedSolutions[0];',
  `console.log('=== EXACT CARDS RENDERED ON UI ===');
  proposal.curatedSolutions.forEach((c, idx) => {
    console.log('[' + (idx + 1) + '] ' + c.title);
    console.log('    URL: ' + c.targetUrl);
    console.log('    Category: ' + c.categorySlug);
    console.log('    Why Relevant: ' + c.whyRelevant);
  });
  console.log('=== STRATEGIC HUBS (SECTION C) ===');
  proposal.strategicHubs.forEach((h, idx) => {
    console.log('[' + (idx + 1) + '] ' + h.title + ' -> /' + h.slug + ' (' + h.category + ')');
  });
  const r1 = proposal.curatedSolutions[0];`
);
fs.writeFileSync('./tests/temp-run.cjs', modified);
require('./temp-run.cjs');
fs.unlinkSync('./tests/temp-run.cjs');
