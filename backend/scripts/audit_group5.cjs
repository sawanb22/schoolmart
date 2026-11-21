const fs = require('fs');

const files = [
  'src/pages/campus-design-execution.tsx',
  'src/pages/campus-furniture-design.tsx',
  'src/pages/sports-design-execution.tsx',
  'src/pages/ai-digital-design-supply.tsx',
  'src/pages/ar-vr-experiences.tsx'
];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  console.log('=== FILE:', f, '===');
  const slugMatch = content.match(/[A-Z_]+_PAGE_SLUG\s*=\s*['"]([^'"]+)['"]/);
  const slugifyMatch = content.match(/function (slugify[A-Za-z]+)\(/);
  const cardLinkMatch = content.match(/const cardLink = ([\s\S]*?);/);
  console.log('Slug constant:', slugMatch ? slugMatch[0] : 'None');
  console.log('Slugify function:', slugifyMatch ? slugifyMatch[1] : 'None');
  if (cardLinkMatch) {
    console.log('cardLink:', cardLinkMatch[0].replace(/\s+/g, ' '));
  }
}
