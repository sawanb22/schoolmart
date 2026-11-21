const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  console.log('Navigating to https://sportsurf.in/new ...');
  try {
    await page.goto('https://sportsurf.in/new', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    console.log('Navigation warning:', err.message);
  }

  // Take full screenshot of sportsurf homepage
  await page.screenshot({ path: 'C:/Users/Administrator/Desktop/sportsurf_homepage_full.png', fullPage: false });
  console.log('Saved sportsurf_homepage_full.png');

  // Extract key elements computed styles
  const analysis = await page.evaluate(() => {
    const results = {};

    // Helper
    const getStyles = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const comp = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        className: el.className,
        backgroundColor: comp.backgroundColor,
        color: comp.color,
        fontFamily: comp.fontFamily,
        fontSize: comp.fontSize,
        borderColor: comp.borderColor,
      };
    };

    // Top bar
    results.topBar = getStyles('.top-bar, [class*="topbar"], [class*="top-bar"], header > div:first-child');
    
    // Header
    results.header = getStyles('header, .main-header, [class*="header"]');
    
    // Nav links
    const navLink = document.querySelector('header a, nav a');
    if (navLink) {
      const comp = window.getComputedStyle(navLink);
      results.navLink = {
        color: comp.color,
        fontFamily: comp.fontFamily,
        fontSize: comp.fontSize,
        textTransform: comp.textTransform
      };
    }

    // Ticker bar
    results.ticker = getStyles('[class*="ticker"], [class*="announcement"], [class*="updates"]');

    // Search bar container
    results.search = getStyles('[class*="search"], form[class*="search"]');

    // Category bar
    results.categoryBar = getStyles('[class*="category"], [class*="cat-"]');

    // Footer
    results.footer = getStyles('footer, [class*="footer"]');

    // All distinct background colors on page
    const allEls = Array.from(document.querySelectorAll('*'));
    const bgColors = new Set();
    allEls.forEach(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        bgColors.add(bg);
      }
    });
    results.uniqueBackgrounds = Array.from(bgColors).slice(0, 30);

    return results;
  });

  console.log('Analysis result:', JSON.stringify(analysis, null, 2));

  // Also write to a json file
  fs.writeFileSync('C:/Users/Administrator/Desktop/sportsurf_color_analysis.json', JSON.stringify(analysis, null, 2));

  await browser.close();
})();
