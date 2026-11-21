import https from 'https';
import fs from 'fs';
import path from 'path';

function fetchUrl(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const endpoints = [
    'https://sportsurf.in/new/api/pages/furniture',
    'https://sportsurf.in/new/api/pages/resource-furniture-design-planning-',
    'https://sportsurf.in/new/api/categories',
    'https://sportsurf.in/new/api/products?limit=10',
    'https://sportsurf.in/new/api/pages/hub/catalog?hub=furniture'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Fetching ${ep}...`);
      const res = await fetchUrl(ep);
      console.log(`Status: ${res.status}`);
      const snippet = typeof res.data === 'string' ? res.data.slice(0, 200) : JSON.stringify(res.data).slice(0, 300);
      console.log(`Snippet: ${snippet}\n`);
      
      const filename = path.basename(ep.split('?')[0]) + '.json';
      fs.writeFileSync(path.resolve(__dirname, 'data', 'sportsurf_' + filename), JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      console.error(`Error fetching ${ep}:`, e.message);
    }
  }
}

main().catch(console.error);
