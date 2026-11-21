const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Scroll to footer element
  const footer = await page.$('footer');
  if (footer) {
    await footer.scrollIntoView();
    await new Promise(r => setTimeout(r, 800));
    await footer.screenshot({ path: 'C:/Users/Administrator/Desktop/verified_new_slate_footer.png' });
    console.log('Saved actual footer screenshot!');
  }

  await browser.close();
})();
