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

  const navElements = await page.evaluate(() => {
    // Traverse body children down to 3 levels
    const getTree = (el, depth = 0) => {
      if (depth > 4) return null;
      const comp = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        id: el.id,
        class: el.className,
        bg: comp.backgroundColor,
        color: comp.color,
        children: Array.from(el.children).slice(0, 5).map(c => getTree(c, depth + 1))
      };
    };

    const body = document.body;
    return Array.from(body.children).slice(0, 6).map(c => ({
      tag: c.tagName,
      id: c.id,
      className: typeof c.className === 'string' ? c.className : '',
      bg: window.getComputedStyle(c).backgroundColor,
      color: window.getComputedStyle(c).color,
      firstChildren: Array.from(c.children).slice(0, 4).map(sub => ({
        tag: sub.tagName,
        class: typeof sub.className === 'string' ? sub.className : '',
        bg: window.getComputedStyle(sub).backgroundColor,
        color: window.getComputedStyle(sub).color
      }))
    }));
  });

  console.log('Nav Elements Structure:', JSON.stringify(navElements, null, 2));

  await browser.close();
})();
