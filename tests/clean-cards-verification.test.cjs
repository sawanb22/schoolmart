/**
 * clean-cards-verification.test.cjs
 * Comprehensive verification that cards render cleanly across all pages:
 * [Image] -> [Title] -> [Description] -> [CTA]
 * Category pills, step numbers, and read times are removed from inside card tiles.
 * Top/side filter bars remain intact.
 * Accounts for Unified Master Engine architecture (ServicePageRenderer, SolutionPageRenderer, GenericPageRenderer).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

console.log('\n--- 1. Service Subpages Verification ---');

test('campus-design-execution.tsx: delegates to ServicePageRenderer with clean cards', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/campus-design-execution.tsx'), 'utf8');
  assert(file.includes('ServicePageRenderer'), 'Delegates to ServicePageRenderer');
  assert(!file.includes('Step {stepNumber}'), 'Should not contain Step {stepNumber}');
});

test('sports-design-execution.tsx: delegates to ServicePageRenderer with clean cards', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/sports-design-execution.tsx'), 'utf8');
  assert(file.includes('ServicePageRenderer'), 'Delegates to ServicePageRenderer');
  assert(!file.includes('Step {stepNumber}'), 'Should not contain Step {stepNumber}');
});

test('ai-digital-design-supply.tsx: featured card has no category badge', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/ai-digital-design-supply.tsx'), 'utf8');
  assert(!file.includes('Featured &middot;'), 'Should not contain Featured &middot;');
  assert(!file.includes('{category}\n                      </span>'), 'Should not contain {category} badge in card');
});

test('furniture-design-supply.tsx: grid cards have no category span', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/furniture-design-supply.tsx'), 'utf8');
  assert(!file.includes('text-cm-red">{card.categories?.[0]'), 'Should not contain category span');
  assert(file.includes('categoryOptions.map'), 'Category filter bar must remain intact');
});

test('campus-master-planning.tsx: featured and grid cards have no category badges', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/campus-master-planning.tsx'), 'utf8');
  assert(!file.includes('Featured · {featured.categories'), 'Featured card should not contain category badge');
  assert(!file.includes('{category}\n                        </span>'), 'Grid card should not contain category badge');
  assert(file.includes('filterOptions.map'), 'Filter options must remain intact');
});

console.log('\n--- 2. Solution & Hub Pages Verification ---');

test('ai-ml.tsx: featured and grid cards have no category badges', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/ai-ml.tsx'), 'utf8');
  assert(!file.includes('Featured &middot;'), 'Featured card should not contain category badge');
  assert(!file.includes('{card.categories[0]}'), 'Grid cards should not contain category badge');
  assert(file.includes('categoryOptions.map'), 'Category filter chips must remain intact');
});

test('tech-infra.tsx: delegates to SolutionPageRenderer with clean cards', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/tech-infra.tsx'), 'utf8');
  assert(file.includes('SolutionPageRenderer'), 'Delegates to SolutionPageRenderer');
});

test('sports-infra.tsx: delegates to SolutionPageRenderer with clean cards', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/sports-infra.tsx'), 'utf8');
  assert(file.includes('SolutionPageRenderer'), 'Delegates to SolutionPageRenderer');
});

test('libraries.tsx: delegates to SolutionPageRenderer with clean cards', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/libraries.tsx'), 'utf8');
  assert(file.includes('SolutionPageRenderer'), 'Delegates to SolutionPageRenderer');
});

test('labs.tsx: delegates to SolutionPageRenderer with clean cards', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/labs.tsx'), 'utf8');
  assert(file.includes('SolutionPageRenderer'), 'Delegates to SolutionPageRenderer');
});

test('SolutionPageRenderer.tsx: master engine renders clean card tiles without category clutter', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/components/cms/SolutionPageRenderer.tsx'), 'utf8');
  assert(!file.includes('<Star className="h-3.5 w-3.5"'), 'Should not contain Star category badge in cards');
  assert(file.includes('categoryOptions.map'), 'Category filter sidebar remains intact');
});

test('ServicePageRenderer.tsx: master engine renders clean card tiles without category or step clutter', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/components/cms/ServicePageRenderer.tsx'), 'utf8');
  assert(!file.includes('Step {stepNumber}'), 'Should not contain Step {stepNumber}');
  assert(file.includes('categoryOptions.map'), 'Filter options remain intact');
});

console.log('\n--- 3. Generic CMS Renderer Verification ---');

test('GenericPageRenderer.tsx: cards have no over-image category badge', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/components/cms/GenericPageRenderer.tsx'), 'utf8');
  assert(!file.includes('{card.category && ('), 'Should not contain card.category badge over image');
  assert(file.includes('card.title'), 'Card title must remain intact');
  assert(file.includes('Learn More'), 'CTA must remain intact');
});

console.log('\n--- 4. Editorial & Guide Pages Unified Verification ---');

test('UniversalArticleDetail.tsx: clean article reading typography without badge clutter', () => {
  const file = fs.readFileSync(path.join(__dirname, '../frontend/src/components/cms/UniversalArticleDetail.tsx'), 'utf8');
  assert(file.includes('GenericPageRenderer'), 'Renders via GenericPageRenderer master engine');
  assert(file.includes('← Back') || file.includes('hubTitle'), 'Back navigation to hub intact');
});

console.log('\n===========================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('===========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
