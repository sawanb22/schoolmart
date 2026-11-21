import puppeteer from 'puppeteer-core';
import path from 'path';

async function capture() {
  const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\c8046279-62f3-4d81-8bf6-671719dfb2ec';
  const fullPagePath = path.join(artifactDir, 'schoolmart_home_full.png');
  const heroPath = path.join(artifactDir, 'schoolmart_home_hero.png');
  const tilesPath = path.join(artifactDir, 'schoolmart_home_tiles.png');
  const productsPartnersPath = path.join(artifactDir, 'schoolmart_home_bottom.png');

  console.log('[INFO] Launching Chrome via Puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  console.log('[INFO] Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait 3 seconds for content & image assets to load
  await new Promise(r => setTimeout(r, 3000));

  // Force all GSAP / animated elements to be fully visible and rendered
  await page.evaluate(() => {
    // If GSAP is present, advance all scrolltriggers to complete
    try {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.opacity === '0') {
          el.style.opacity = '1';
        }
        if (el.style.transform && el.style.transform.includes('translate')) {
          el.style.transform = 'none';
        }
      });
    } catch (e) {
      console.error(e);
    }
  });

  console.log('[INFO] Capturing hero viewport...');
  await page.screenshot({ path: heroPath, fullPage: false });

  // Scroll to tiles section and capture
  console.log('[INFO] Capturing tiles viewport...');
  await page.evaluate(() => {
    const tilesSection = document.querySelector('section.bg-\\[\\#f0f2f5\\]');
    if (tilesSection) tilesSection.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: tilesPath, fullPage: false });

  // Scroll to bottom section and capture
  console.log('[INFO] Capturing bottom viewport (Partnership & Collaborations)...');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight - 1400);
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: productsPartnersPath, fullPage: false });

  // Full page capture
  console.log('[INFO] Capturing complete full page...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));

  // Ensure every image and element is fully un-hidden
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.opacity === '0') el.style.opacity = '1';
      if (el.classList.contains('opacity-0')) el.classList.remove('opacity-0');
    });
  });

  await page.screenshot({ path: fullPagePath, fullPage: true });

  console.log(`[PASS] Saved screenshots to artifact directory:`);
  console.log(`  - ${fullPagePath}`);
  console.log(`  - ${heroPath}`);
  console.log(`  - ${tilesPath}`);
  console.log(`  - ${productsPartnersPath}`);

  await browser.close();
}

capture().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
