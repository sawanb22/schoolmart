import puppeteer from 'puppeteer';

async function verifyFooter() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Check Homepage footer
  console.log('Navigating to Homepage...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2000));
  
  const footerElem = await page.$('footer');
  if (footerElem) {
    await footerElem.screenshot({ path: 'C:/Users/Administrator/Desktop/verified_footer_live.png' });
    console.log('Footer screenshot saved: verified_footer_live.png');
  }

  // 2. Login to admin and check Site Content footer editor
  console.log('Logging in to admin...');
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.type('input[type="email"]', 'admin@schoolmart.in');
  await page.type('input[type="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));
  
  console.log('Navigating to /admin/site-content...');
  await page.goto('http://localhost:5173/admin/site-content', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  // Click on Footer tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('Footer') || text.includes('Footer Settings'))) {
      await btn.click();
      console.log('Clicked Footer Settings tab');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'C:/Users/Administrator/Desktop/verified_admin_footer_editor.png', fullPage: false });
  console.log('Admin footer screenshot saved: verified_admin_footer_editor.png');

  await browser.close();
}

verifyFooter().catch(console.error);
