import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import http from 'http';
import fs from 'fs';

function fetchEndpoint(slug: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3001/api/pages/${slug}`, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ statusCode: res.statusCode || 0, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data: rawData });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${slug}`));
    });
  });
}

async function verifyAll15Environments() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING ALL 15 ENVIRONMENTS (30 SLUGS) VIA BACKEND API (PORT 3001) 🧪');
  console.log('========================================================================\n');

  const jsonPath = path.resolve(__dirname, 'data', 'sportsurf_batch3_environments.json');
  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  let totalPassed = 0;
  let totalChecked = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slugs = [item.slug, item.cleanSlug];

    for (const slug of slugs) {
      totalChecked++;
      try {
        const { statusCode, data } = await fetchEndpoint(slug);
        if (statusCode !== 200) {
          console.error(`❌ [${statusCode}] ${slug} - Failed!`);
          continue;
        }

        const pd = typeof data.pageData === 'string' ? JSON.parse(data.pageData) : (data.pageData || {});
        const hasContent = Boolean(data.content && data.content.length > 50);
        const hasCta = Boolean(pd.ctaTitle && pd.ctaButtonLabel && pd.ctaHref);
        const hasSpecs = Array.isArray(pd.technicalParameters) && pd.technicalParameters.length > 0;

        if (hasContent && hasCta && hasSpecs && data.published && data.template === 'article') {
          totalPassed++;
          console.log(`✅ [${totalPassed}/30] 200 OK: ${slug} (${data.title.substring(0, 45)}...)`);
        } else {
          console.error(`⚠️ Content/CTA missing for ${slug}`);
        }
      } catch (err: any) {
        console.error(`❌ Error fetching ${slug}: ${err.message}`);
      }
    }
  }

  console.log('\n========================================================================');
  console.log(`Results: ${totalPassed}/${totalChecked} slugs verified with HTTP 200 and complete payload.`);
  console.log('========================================================================\n');

  if (totalPassed !== totalChecked) {
    process.exit(1);
  }
}

verifyAll15Environments();
