import fs from 'fs';
import path from 'path';

const dataPath = path.resolve(__dirname, 'data', 'sportsurf_products.json');
const products = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const furniture = products.filter((p: any) => p.category && p.category.toLowerCase() === 'furniture');
console.log('Total furniture items count:', furniture.length);

const subcats = new Map<string, number>();
furniture.forEach((p: any) => {
  const s = p.subcategory || 'General';
  subcats.set(s, (subcats.get(s) || 0) + 1);
});

console.log('Furniture subcategories breakdown:');
subcats.forEach((count, s) => console.log(`  - ${s}: ${count} products`));

console.log('\nSample 5 furniture items:');
furniture.slice(0, 5).forEach((p: any, idx: number) => {
  console.log(`[${idx + 1}] Name: ${p.name} | Subcategory: ${p.subcategory} | Slug: ${p.slug} | Price: ${p.price}`);
  console.log(`    Image: ${p.image}`);
  console.log(`    Description: ${p.description?.slice(0, 80)}...`);
});

// Also check uncategorized products to see if any are furniture
const uncat = products.filter((p: any) => !p.category || p.category === 'uncategorized');
console.log('\nUncategorized count:', uncat.length);
if (uncat.length > 0) {
  console.log('Sample uncategorized:');
  uncat.slice(0, 5).forEach((p: any) => {
    console.log(`  - Name: ${p.name} | Subcat: ${p.subcategory} | Slug: ${p.slug}`);
  });
}
