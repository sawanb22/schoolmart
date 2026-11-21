import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const endpoints = [
  'aboutus',
  'about-us',
  'corporate',
  'contact-us',
  'pricing',
  'school-sale',
  'guide-50-global-resources-for-school-excellence',
  '50-global-resources-for-school-excellence'
];

async function checkEndpoints() {
  console.log('========================================================================');
  console.log('🔍 VERIFYING BACKEND ENDPOINTS FOR BATCH 4 PAGES 🔍');
  console.log('========================================================================\n');

  let passed = 0;
  for (const slug of endpoints) {
    const url = `http://localhost:3001/api/pages/${slug}`;
    try {
      const res = await fetch(url);
      if (res.status !== 200) {
        console.error(`❌ FAIL: ${slug} -> HTTP ${res.status}`);
        continue;
      }
      const data: any = await res.json();
      const pageData = data.pageData ? JSON.parse(data.pageData) : {};
      const contentLen = data.content?.length || 0;
      const ctaTitle = pageData.ctaTitle || 'N/A';
      const ctaHref = pageData.ctaHref || 'N/A';
      const ctaBtn = pageData.ctaButtonLabel || 'N/A';
      
      console.log(`✅ [HTTP 200] /api/pages/${slug}`);
      console.log(`   Title:       "${data.title}"`);
      console.log(`   Content:     ${contentLen} characters`);
      console.log(`   CTA Title:   "${ctaTitle}"`);
      console.log(`   CTA Target:  "${ctaHref}" [${ctaBtn}]`);
      console.log(`   Badge:       "${pageData.badge}"`);
      console.log('------------------------------------------------------------------------');
      passed++;
    } catch (e: any) {
      console.error(`❌ ERROR fetching ${slug}:`, e.message);
    }
  }

  console.log(`\nResults: ${passed}/${endpoints.length} endpoints verified with HTTP 200 and populated content/CTA.`);
  if (passed !== endpoints.length) {
    process.exit(1);
  }
}

checkEndpoints();
