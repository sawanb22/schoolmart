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

  const rootVars = await page.evaluate(() => {
    const root = document.querySelector(':root');
    const cs = window.getComputedStyle(root);
    const varNames = [
      '--sm-green', '--sm-blue', '--sm-navy', '--sm-yellow', '--sm-orange',
      '--primary', '--secondary', '--accent', '--background', '--foreground',
      '--cm-blue', '--cm-yellow'
    ];
    const out = {};
    for (const v of varNames) {
      out[v] = cs.getPropertyValue(v).trim();
    }
    return out;
  });

  console.log('Root CSS Variables on sportsurf:', JSON.stringify(rootVars, null, 2));

  await browser.close();
})();
