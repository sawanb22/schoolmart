import https from 'https';
import fs from 'fs';
import path from 'path';

function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching all products from sportsurf...');
  const products = await getJson('https://sportsurf.in/new/api/products');
  if (Array.isArray(products)) {
    console.log(`Total products: ${products.length}`);
    const catMap = new Map<string, number>();
    products.forEach((p: any) => {
      const c = p.category || p.categoryName || 'uncategorized';
      catMap.set(c, (catMap.get(c) || 0) + 1);
    });
    console.log('Categories distribution:');
    catMap.forEach((count, cat) => console.log(`  - ${cat}: ${count} products`));

    // Save full JSON to backend/scripts/data/sportsurf_products.json
    const outPath = path.resolve(__dirname, 'data', 'sportsurf_products.json');
    fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
    console.log(`Saved ${products.length} products to ${outPath}`);

    // Print sample of first product
    console.log('\nSample Product Schema:');
    console.log(JSON.stringify(products[0], null, 2));
  } else {
    console.log('Products response was not an array:', products);
  }
}

main().catch(console.error);
