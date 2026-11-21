const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Login
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admin@schoolmart.in');
  await page.type('input[type="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // 2. Open composite-skill-lab editor
  await page.goto('http://localhost:5173/admin/pages?slug=composite-skill-lab', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to #sec-cta
  await page.evaluate(() => {
    const el = document.getElementById('sec-cta');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/verified_admin_cta_inputs.png'
  });
  console.log('Saved verified_admin_cta_inputs.png on Desktop');
  await browser.close();
})();
