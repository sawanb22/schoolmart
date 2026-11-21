const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admin@schoolmart.in');
  await page.type('input[type="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.goto('http://localhost:5173/admin/site-content', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Find the Footer section and scroll into view
  const scrolled = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h2'));
    const footerHeading = headings.find(h => h.textContent.includes('Footer Settings'));
    if (footerHeading) {
      footerHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
      return true;
    }
    return false;
  });
  console.log('Scrolled to footer settings:', scrolled);
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'C:/Users/Administrator/Desktop/verified_admin_footer_tab1.png' });
  console.log('Saved Tab 1');

  // Click on Categories tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const catBtn = buttons.find(b => b.textContent.includes('Category Columns'));
    if (catBtn) catBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'C:/Users/Administrator/Desktop/verified_admin_footer_tab2.png' });
  console.log('Saved Tab 2');

  await browser.close();
})();
