import fs from 'fs';
import path from 'path';

const dataPath = path.resolve(__dirname, 'data', 'sportsurf_products.json');
const allProducts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const furniture = allProducts.filter((p: any) => p.category && p.category.toLowerCase() === 'furniture');
console.log('Total furniture products:', furniture.length);

const subcatDistribution: Record<string, any[]> = {};
furniture.forEach((p: any) => {
  const sub = p.subcategory || 'OTHER';
  if (!subcatDistribution[sub]) subcatDistribution[sub] = [];
  subcatDistribution[sub].push(p);
});

for (const [sub, prods] of Object.entries(subcatDistribution)) {
  console.log(`\n=== Subcategory: ${sub} (${prods.length} items) ===`);
  prods.slice(0, 3).forEach((p: any) => {
    console.log(`- [${p.name}] slug: ${p.slug}, price: ${p.price}, img: ${p.image?.slice(0, 60)}...`);
  });
}
