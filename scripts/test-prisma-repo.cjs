const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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

const { PrismaSolutionsRepository } = require('../backend/src/services/solutions-finder/prisma-solutions.repository.ts');
const { SolutionsIndexService } = require('../backend/src/services/solutions-finder/solutions-index.service.ts');
const { IntentScorerService } = require('../backend/src/services/solutions-finder/intent-scorer.service.ts');
const { LocalRuleNLPProvider } = require('../backend/src/services/solutions-finder/ai-providers/local-nlp.provider.ts');

async function test() {
  try {
    const repo = new PrismaSolutionsRepository(prisma);
    console.log('Testing fetchActiveCards()...');
    const cards = await repo.fetchActiveCards();
    console.log('Total active cards returned:', cards.length);
    console.log('Sample card categories:', [...new Set(cards.map(c => c.categorySlug))]);

    const index = new SolutionsIndexService(repo);
    await index.rebuild();
    console.log('Indexed cards count:', index.getCards().length);

    const provider = new LocalRuleNLPProvider();
    const scorer = new IntentScorerService(index, provider);

    // Test with empty query (like opening /find-solutions directly!)
    console.log('\n--- Testing with empty query (direct navigation to /find-solutions) ---');
    const emptyProposal = await scorer.generateProposal({});
    console.log('Empty query curated solutions count:', emptyProposal.curatedSolutions.length);
    console.log('Empty query unmatchedFallback:', emptyProposal.unmatchedFallback);
    console.log('Empty query cards:', emptyProposal.curatedSolutions.map(c => c.title));

    // Test with query
    console.log('\n--- Testing with query: "AI lab for engineering" ---');
    const aiProposal = await scorer.generateProposal({
      queryText: 'AI lab for engineering college with GPU workstations',
      institutionHint: 'engineering',
      categoryHint: 'ai-tech'
    });
    console.log('AI query curated solutions count:', aiProposal.curatedSolutions.length);
    console.log('AI query cards:', aiProposal.curatedSolutions.map(c => c.title));

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
