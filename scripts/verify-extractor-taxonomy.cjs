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

// Let's test PageSolutionsExtractor with sample pages
const samplePages = [
  { id: 1, title: 'AI & ML Labs', slug: 'ai-ml', published: true, pageData: JSON.stringify({ cards: [{ title: 'GPU Computing Cluster', description: 'High density GPU compute lab' }] }) },
  { id: 2, title: 'Campus Design', slug: 'campus-design', published: true, pageData: JSON.stringify({ cards: [{ title: 'Master Planning Blueprint', description: 'Comprehensive campus master planning' }] }) },
  { id: 3, title: 'Setup Your College', slug: 'setup-college', published: true, pageData: JSON.stringify({ cards: [{ title: 'Regulatory Compliance & AICTE', description: 'University affiliation roadmap' }] }) },
  { id: 4, title: 'Campus Automation', slug: 'campus-automation', published: true, pageData: JSON.stringify({ cards: [{ title: 'Campus ERP & SIS Cloud', description: 'Student information system' }] }) },
  { id: 5, title: 'Innovation Ecosystems', slug: 'innovation', published: true, pageData: JSON.stringify({ cards: [{ title: 'Incubation Centre & Startup Bay', description: 'Student founder maker spaces' }] }) },
  { id: 6, title: 'Sports Infrastructure', slug: 'sports-infra', published: true, pageData: JSON.stringify({ cards: [{ title: 'Synthetic Astroturf Football Ground', description: 'FIFA certified synthetic turf' }] }) },
  { id: 7, title: 'Laboratories', slug: 'labs', published: true, pageData: JSON.stringify({ cards: [{ title: 'Advanced Chemistry Fume Hood Lab', description: 'Organic synthesis lab bench' }] }) },
  { id: 8, title: 'Libraries', slug: 'libraries', published: true, pageData: JSON.stringify({ cards: [{ title: 'Automated RFID Self-Checkout Gate', description: 'Smart library book management' }] }) },
  { id: 9, title: 'Collaboration Spaces', slug: 'collaboration', published: true, pageData: JSON.stringify({ cards: [{ title: 'Executive Student Lounge Pod', description: 'Recreational student lounge' }] }) },
  { id: 10, title: 'Furniture Solutions', slug: 'furniture', published: true, pageData: JSON.stringify({ cards: [{ title: 'Ergonomic Dual Classroom Desk', description: 'Classroom bench and desk' }] }) },
];

const cards = PageSolutionsExtractor.extractFromPages(samplePages);
console.log('Extracted cards count:', cards.length);
for (const c of cards) {
  console.log(`- Card: "${c.title}" -> Category: [${c.categorySlug}], Subcategory: [${c.subcategorySlug}]`);
}
