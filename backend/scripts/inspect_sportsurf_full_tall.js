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

  // Capture full page
  await page.screenshot({ path: 'C:/Users/Administrator/Desktop/sportsurf_full_page_tall.png', fullPage: true });
  console.log('Saved sportsurf_full_page_tall.png');

  // Also inspect specific elements on sportsurf
  const details = await page.evaluate(() => {
    const header = document.querySelector('header');
    const headerBg = header ? window.getComputedStyle(header).backgroundColor : null;

    const topBar = document.querySelector('.top-bar, [class*="top"]');
    const topBarBg = topBar ? window.getComputedStyle(topBar).backgroundColor : null;

    // Check hero banner background and colors
    const hero = document.querySelector('[class*="hero"], [class*="banner"]');
    const heroBg = hero ? window.getComputedStyle(hero).backgroundColor : null;

    // Check footer
    const footer = document.querySelector('footer');
    const footerBg = footer ? window.getComputedStyle(footer).backgroundColor : null;

    // Check buttons
    const buttons = Array.from(document.querySelectorAll('button, a.btn, [class*="btn"]')).map(b => {
      const cs = window.getComputedStyle(b);
      return {
        text: b.textContent.trim().slice(0, 30),
        bg: cs.backgroundColor,
        color: cs.color,
        border: cs.borderColor
      };
    }).filter(b => b.text.length > 0).slice(0, 15);

    return {
      headerBg,
      topBarBg,
      heroBg,
      footerBg,
      buttons
    };
  });

  console.log('DOM Details:', JSON.stringify(details, null, 2));

  await browser.close();
})();
