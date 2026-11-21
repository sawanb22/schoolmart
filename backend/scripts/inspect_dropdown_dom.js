const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  const links = await page.$$('header a, header button');
  for (const l of links) {
    const text = await page.evaluate(el => el.textContent, l);
    if (text && text.toUpperCase().includes('CORPORATE')) {
      await l.hover();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  const dropStyles = await page.evaluate(() => {
    const wrapper = document.querySelector('header .animate-fade-in');
    const card = wrapper ? wrapper.querySelector('div') : null;
    return {
      wrapper: wrapper ? {
        className: wrapper.className,
        opacity: window.getComputedStyle(wrapper).opacity,
        zIndex: window.getComputedStyle(wrapper).zIndex
      } : null,
      card: card ? {
        className: card.className,
        bg: window.getComputedStyle(card).backgroundColor,
        opacity: window.getComputedStyle(card).opacity,
        boxShadow: window.getComputedStyle(card).boxShadow
      } : null
    };
  });
  console.log('Dropdown styles:', JSON.stringify(dropStyles, null, 2));

  await browser.close();
})();
