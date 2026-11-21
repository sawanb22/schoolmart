const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://sportsurf.in/new', { waitUntil: 'networkidle2' });
  const meta = await page.evaluate(() => {
    const icons = Array.from(document.querySelectorAll('link[rel*="icon"], link[rel="manifest"]')).map(l => ({ rel: l.rel, href: l.href }));
    const logos = Array.from(document.querySelectorAll('img[src*="logo"], header img')).map(img => ({ src: img.src, alt: img.alt }));
    const title = document.title;
    return { title, icons, logos };
  });
  console.log('Sportsurf Meta & Icons:', JSON.stringify(meta, null, 2));
  await browser.close();
})();
