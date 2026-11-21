const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Check Homepage header
  console.log('Navigating to Homepage...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Capture header strip
  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/verified_new_header_live.png',
    clip: { x: 0, y: 0, width: 1440, height: 260 }
  });
  console.log('Saved verified_new_header_live.png');

  // Hover over Corporate to show dropdown
  const corporateLink = await page.$('header a[href="/corporate"], header .nav-link');
  if (corporateLink) {
    await corporateLink.hover();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: 'C:/Users/Administrator/Desktop/verified_new_header_dropdown.png',
      clip: { x: 0, y: 0, width: 1440, height: 350 }
    });
    console.log('Saved verified_new_header_dropdown.png');
  }

  // 2. Login to admin and check Site Content Header editor
  console.log('Logging in to admin...');
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admin@schoolmart.in');
  await page.type('input[type="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Navigating to /admin/site-content...');
  await page.goto('http://localhost:5173/admin/site-content', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to Header Navigation section
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h2'));
    const navHeading = headings.find(h => h.textContent.includes('Main Header Navigation Strip'));
    if (navHeading) {
      navHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'C:/Users/Administrator/Desktop/verified_admin_header_editor.png' });
  console.log('Saved verified_admin_header_editor.png');

  await browser.close();
})();
