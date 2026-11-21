const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('https://sportsurf.in/new', { waitUntil: 'networkidle2' });

  const structure = await page.evaluate(() => {
    const rootDiv = document.querySelector('#root > div');
    if (!rootDiv) return 'no #root > div';

    return Array.from(rootDiv.children).map((c, idx) => {
      const comp = window.getComputedStyle(c);
      return {
        idx,
        tag: c.tagName,
        className: typeof c.className === 'string' ? c.className : '',
        bg: comp.backgroundColor,
        color: comp.color,
        desc: c.innerText ? c.innerText.slice(0, 60).replace(/\n/g, ' ') : ''
      };
    });
  });

  console.log('Structure inside #root > div:', JSON.stringify(structure, null, 2));

  await browser.close();
})();
