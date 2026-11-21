const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Find the Corporate nav link (case insensitive) and hover over it
  const links = await page.$$('header a, header button');
  let hovered = false;
  for (const l of links) {
    const text = await page.evaluate(el => el.textContent, l);
    if (text && text.toUpperCase().includes('CORPORATE')) {
      await l.hover();
      console.log('Hovered over CORPORATE! Text was:', text);
      hovered = true;
      break;
    }
  }
  console.log('Was hovered?', hovered);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/verified_corporate_dropdown_hover.png',
    clip: { x: 450, y: 30, width: 600, height: 300 }
  });
  console.log('Saved verified_corporate_dropdown_hover.png');

  await browser.close();
})();
