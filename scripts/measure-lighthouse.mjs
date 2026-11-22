import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const baselineDir = path.resolve(rootDir, 'docs/plans/baseline');

if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => resolve(res.statusCode < 500));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkUrl(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measurePageWithPlaywright(url, runs = 3) {
  console.log(`Measuring performance via Playwright CDP & Web Vitals for ${url} (${runs} runs)...`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const results = [];

  for (let run = 1; run <= runs; run++) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 }, // Pixel 7 mobile viewport
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    });
    const page = await context.newPage();

    // Inject Web Vitals observer script before page loads
    await page.addInitScript(() => {
      window.__webVitals = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        tbt: 0,
        longTasks: [],
      };

      try {
        const poFCP = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              window.__webVitals.fcp = entry.startTime;
            }
          }
        });
        poFCP.observe({ type: 'paint', buffered: true });

        const poLCP = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            window.__webVitals.lcp = entry.startTime;
          }
        });
        poLCP.observe({ type: 'largest-contentful-paint', buffered: true });

        const poCLS = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__webVitals.cls += entry.value;
            }
          }
        });
        poCLS.observe({ type: 'layout-shift', buffered: true });

        const poLong = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration > 50) {
              window.__webVitals.tbt += (entry.duration - 50);
              window.__webVitals.longTasks.push(entry.duration);
            }
          }
        });
        poLong.observe({ type: 'longtask', buffered: true });
      } catch (e) {}
    });

    const startNav = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await page.waitForTimeout(3000);

    const vitals = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        ...window.__webVitals,
        ttfb: nav.responseStart ? Math.round(nav.responseStart) : 0,
        domInteractive: nav.domInteractive ? Math.round(nav.domInteractive) : 0,
        loadEventEnd: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
      };
    });

    // Simple performance score estimate based on Core Web Vitals weights:
    // LCP (25%), TBT (30%), CLS (15%), FCP (10%), Speed Index (10%), etc.
    let score = 100;
    if (vitals.lcp > 2500) score -= Math.min(30, ((vitals.lcp - 2500) / 1000) * 10);
    if (vitals.tbt > 200) score -= Math.min(30, ((vitals.tbt - 200) / 100) * 8);
    if (vitals.cls > 0.1) score -= Math.min(20, ((vitals.cls - 0.1) / 0.1) * 15);
    score = Math.max(10, Math.round(score));

    // SEO checks
    const seoData = await page.evaluate(() => {
      let checks = 0;
      let total = 6;
      if (document.title && document.title.length > 5) checks++;
      if (document.querySelector('meta[name="description"]')?.getAttribute('content')) checks++;
      if (document.querySelector('meta[name="viewport"]')) checks++;
      if (document.querySelector('h1')) checks++;
      if (document.querySelector('html[lang]')) checks++;
      if (document.querySelector('link[rel="canonical"]')) checks++;
      return Math.round((checks / total) * 100);
    });

    results.push({
      run,
      perfScore: score,
      lcp: Math.round(vitals.lcp || (Date.now() - startNav)),
      cls: Number((vitals.cls || 0).toFixed(3)),
      tbt: Math.round(vitals.tbt || 0),
      fcp: Math.round(vitals.fcp || 0),
      ttfb: vitals.ttfb,
      seoScore: seoData,
    });

    await context.close();
  }

  await browser.close();
  return results;
}

async function main() {
  let backendProc = null;
  let previewProc = null;

  try {
    const backendUp = await checkUrl('http://localhost:3001/health');
    if (!backendUp) {
      console.log('Starting dev backend on port 3001...');
      backendProc = spawn('npm', ['run', 'dev', '--prefix', 'backend'], {
        cwd: rootDir,
        shell: true,
        stdio: 'ignore',
      });
    }

    const previewUp = await checkUrl('http://localhost:4173');
    if (!previewUp) {
      console.log('Building frontend and starting preview server on port 4173...');
      execSync('npm run build:frontend', { cwd: rootDir, stdio: 'inherit' });
      previewProc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
        cwd: path.resolve(rootDir, 'frontend'),
        shell: true,
        stdio: 'ignore',
      });
    }

    await waitForUrl('http://localhost:3001/health');
    await waitForUrl('http://localhost:4173');
    console.log('Backend and preview servers are ready.');

    // Measure Home Page (3 runs)
    const homeRuns = await measurePageWithPlaywright('http://localhost:4173/', 3);

    // Measure Labs Page (3 runs)
    const labsRuns = await measurePageWithPlaywright('http://localhost:4173/labs', 3);

    // Calculate medians
    const homeMedian = {
      perfScore: median(homeRuns.map((r) => r.perfScore)),
      lcp: median(homeRuns.map((r) => r.lcp)),
      cls: median(homeRuns.map((r) => r.cls)),
      tbt: median(homeRuns.map((r) => r.tbt)),
      fcp: median(homeRuns.map((r) => r.fcp)),
    };

    const labsMedian = {
      perfScore: median(labsRuns.map((r) => r.perfScore)),
      lcp: median(labsRuns.map((r) => r.lcp)),
      cls: median(labsRuns.map((r) => r.cls)),
      tbt: median(labsRuns.map((r) => r.tbt)),
      fcp: median(labsRuns.map((r) => r.fcp)),
      seo: median(labsRuns.map((r) => r.seoScore)),
    };

    // Format markdown report
    let md = '# Baseline Lighthouse & Core Web Vitals Metrics\n\n';
    md += `- **Date:** ${new Date().toISOString()}\n`;
    md += `- **Form Factor:** Mobile (Pixel 7 viewport 412x915)\n`;
    md += `- **Server:** Vite Preview (Port 4173) + Express Backend (Port 3001)\n`;
    md += `- **Measurement Tool:** Playwright CDP / Chrome PerformanceObserver (Windows Headless Baseline)\n\n`;

    md += '## Summary (Median of 3 Runs)\n\n';
    md += '| Page | Path | Performance (0-100) | LCP (ms) | CLS | TBT (ms) | FCP (ms) | SEO Score |\n';
    md += '|---|---|---|---|---|---|---|---|\n';
    md += `| Home | \`/\` | **${homeMedian.perfScore}** | ${homeMedian.lcp} ms | ${homeMedian.cls} | ${homeMedian.tbt} ms | ${homeMedian.fcp} ms | – |\n`;
    md += `| Labs Hub | \`/labs\` | **${labsMedian.perfScore}** | ${labsMedian.lcp} ms | ${labsMedian.cls} | ${labsMedian.tbt} ms | ${labsMedian.fcp} ms | **${labsMedian.seo}** |\n\n`;

    md += '## Per-Run Breakdown\n\n';
    md += '### Home Page (`/`)\n\n';
    md += '| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) |\n';
    md += '|---|---|---|---|---|---|---|\n';
    homeRuns.forEach((r) => {
      md += `| Run ${r.run} | ${r.perfScore} | ${r.lcp} ms | ${r.cls} | ${r.tbt} ms | ${r.fcp} ms | ${r.ttfb} ms |\n`;
    });
    md += '\n';

    md += '### Labs Hub (`/labs`)\n\n';
    md += '| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) | SEO Score |\n';
    md += '|---|---|---|---|---|---|---|---|\n';
    labsRuns.forEach((r) => {
      md += `| Run ${r.run} | ${r.perfScore} | ${r.lcp} ms | ${r.cls} | ${r.tbt} ms | ${r.fcp} ms | ${r.ttfb} ms | ${r.seoScore}/100 |\n`;
    });
    md += '\n';

    const outMd = path.join(baselineDir, 'lighthouse.md');
    fs.writeFileSync(outMd, md, 'utf8');
    console.log(`Successfully wrote ${outMd}`);
    console.log(md);
  } finally {
    if (previewProc) {
      console.log('Stopping preview server...');
      previewProc.kill();
    }
    if (backendProc) {
      console.log('Stopping backend server...');
      backendProc.kill();
    }
  }
}

main().catch((err) => {
  console.error('Performance measurement failed:', err);
  process.exit(1);
});
