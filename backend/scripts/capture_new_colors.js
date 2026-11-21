const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Full top header area screenshot
  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/verified_new_green_header.png',
    clip: { x: 0, y: 0, width: 1440, height: 350 }
  });
  console.log('Saved verified_new_green_header.png');

  // 2. Hover over Corporate to show dropdown
  const links = await page.$$('header a, header button');
  for (const l of links) {
    const text = await page.evaluate(el => el.textContent, l);
    if (text && text.toUpperCase().includes('CORPORATE')) {
      await l.hover();
      console.log('Hovered over Corporate!');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/verified_green_header_dropdown.png',
    clip: { x: 0, y: 0, width: 1440, height: 400 }
  });
  console.log('Saved verified_green_header_dropdown.png');

  // 3. Scroll to footer and screenshot
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/verified_new_slate_footer.png',
    clip: { x: 0, y: 350, width: 1440, height: 550 }
  });
  console.log('Saved verified_new_slate_footer.png');

  await browser.close();
})();
