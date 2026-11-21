const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://sportsurf.in/new', { waitUntil: 'networkidle2' });
  const searchEls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, [class*="search"], form')).map(el => ({
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className : '',
      placeholder: el.placeholder || '',
      parentClass: el.parentElement && typeof el.parentElement.className === 'string' ? el.parentElement.className : ''
    }));
  });
  console.log('Search elements on sportsurf:', JSON.stringify(searchEls, null, 2));
  await browser.close();
})();
