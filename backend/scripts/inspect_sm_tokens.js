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

  const cssTokens = await page.evaluate(() => {
    const results = {
      smColors: {},
      classesFound: [],
      rules: []
    };

    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('sm-')) {
            results.rules.push({
              selector: rule.selectorText,
              cssText: rule.cssText
            });
          }
        }
      } catch (e) {
        // cross-origin stylesheet
      }
    }

    // Also inspect common sm- classes by creating temporary elements
    const testClasses = [
      'bg-sm-green', 'text-sm-green', 'border-sm-green',
      'bg-sm-blue', 'text-sm-blue', 'border-sm-blue',
      'bg-sm-navy', 'text-sm-navy', 'border-sm-navy',
      'bg-sm-yellow', 'text-sm-yellow', 'border-sm-yellow',
      'bg-sm-red', 'text-sm-red',
      'bg-sm-orange', 'text-sm-orange',
      'bg-sm-cyan', 'text-sm-cyan',
      'bg-sm-purple', 'text-sm-purple',
      'bg-sm-lime', 'text-sm-lime'
    ];

    testClasses.forEach(cls => {
      const el = document.createElement('div');
      el.className = cls;
      document.body.appendChild(el);
      const comp = window.getComputedStyle(el);
      if (cls.startsWith('bg-') && comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        results.smColors[cls] = comp.backgroundColor;
      }
      if (cls.startsWith('text-') && comp.color && comp.color !== 'rgb(51, 51, 51)') {
        results.smColors[cls] = comp.color;
      }
      if (cls.startsWith('border-') && comp.borderColor && comp.borderColor !== 'rgb(224, 224, 224)') {
        results.smColors[cls] = comp.borderColor;
      }
      document.body.removeChild(el);
    });

    return results;
  });

  console.log('CSS Tokens Found:', JSON.stringify(cssTokens, null, 2));

  await browser.close();
})();
