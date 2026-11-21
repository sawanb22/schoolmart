const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to https://sportsurf.in/new ...');
  await page.goto('https://sportsurf.in/new', { waitUntil: 'networkidle2', timeout: 45000 });

  // Extract all nav/header links and hierarchy
  const navData = await page.evaluate(() => {
    const results = [];
    // Check header, nav, or any top bar
    const navElements = Array.from(document.querySelectorAll('header, nav, [class*="nav"], [class*="menu"], [class*="header"]'));
    
    // Find all links in header/nav
    const headerLinks = Array.from(document.querySelectorAll('header a, nav a, .navbar a'));
    const linkList = headerLinks.map(a => ({
      text: (a.textContent || '').trim().replace(/\s+/g, ' '),
      href: a.getAttribute('href'),
      className: a.className
    })).filter(l => l.text.length > 0);

    return {
      title: document.title,
      links: linkList
    };
  });

  console.log('Document Title:', navData.title);
  console.log('\nFound Header / Nav Links (' + navData.links.length + '):');
  navData.links.forEach((l, i) => {
    console.log(`[${i+1}] "${l.text}" -> ${l.href}`);
  });

  // Take a screenshot of the top navigation bar of sportsurf.in/new
  await page.screenshot({
    path: 'C:/Users/Administrator/Desktop/sportsurf_original_header.png',
    clip: { x: 0, y: 0, width: 1440, height: 250 }
  });
  console.log('\nSaved screenshot: C:/Users/Administrator/Desktop/sportsurf_original_header.png');

  await browser.close();
})();
