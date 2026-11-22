import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const baselineDir = path.resolve(rootDir, 'docs/plans/baseline');

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServer(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function main() {
  let backendProc = null;
  let frontendProc = null;

  const backendUp = await checkServer('http://localhost:3001/health');
  if (!backendUp) {
    console.log('Starting backend server...');
    backendProc = spawn('npm', ['run', 'dev', '--prefix', 'backend'], {
      cwd: rootDir,
      shell: true,
      stdio: 'ignore',
    });
  }

  const frontendUp = await checkServer('http://localhost:5173');
  if (!frontendUp) {
    console.log('Starting frontend server...');
    frontendProc = spawn('npm', ['run', 'dev', '--prefix', 'frontend'], {
      cwd: rootDir,
      shell: true,
      stdio: 'ignore',
    });
  }

  console.log('Waiting for servers to be ready...');
  await waitForServer('http://localhost:3001/health', 60000);
  await waitForServer('http://localhost:5173', 60000);
  console.log('Servers are ready.');

  const browser = await chromium.launch();
  const baseURL = 'http://localhost:5173';

  const targets = [
    { name: 'Home Page', path: '/' },
    { name: 'Labs Hub', path: '/labs' },
    { name: 'Labs Item Detail', path: '/labs/composite-skill-lab' },
    { name: 'Prefixed Dynamic Page (without prefix)', path: '/50-global-resources-for-school-excellence' },
  ];

  const results = [];
  let homeImageMetrics = { count: 0, totalBytes: 0, urls: [] };

  try {
    for (const target of targets) {
      console.log(`Measuring cold load: ${target.name} (${target.path})...`);
      // Create new isolated context for cold load (no cache)
      const context = await browser.newContext();
      const page = await context.newPage();

      const apiRequests = [];
      const imageResponses = [];

      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/')) {
          apiRequests.push({ url, method: req.method() });
        }
      });

      if (target.path === '/') {
        page.on('response', async (res) => {
          const req = res.request();
          if (req.resourceType() === 'image') {
            try {
              const body = await res.body();
              imageResponses.push({ url: req.url(), bytes: body.length });
            } catch {
              const cl = res.headers()['content-length'];
              const bytes = cl ? parseInt(cl, 10) : 0;
              imageResponses.push({ url: req.url(), bytes });
            }
          }
        });
      }

      await page.goto(`${baseURL}${target.path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
        await page.waitForLoadState('domcontentloaded');
      });

      // Settle wait
      await page.waitForTimeout(2000);

      if (target.path === '/') {
        const totalImageBytes = imageResponses.reduce((sum, img) => sum + img.bytes, 0);
        homeImageMetrics = {
          count: imageResponses.length,
          totalBytes: totalImageBytes,
          urls: imageResponses,
        };
      }

      results.push({
        target: target.name,
        path: target.path,
        apiCount: apiRequests.length,
        apiRequests,
      });

      await context.close();
    }
  } finally {
    await browser.close();
    if (backendProc) backendProc.kill();
    if (frontendProc) frontendProc.kill();
  }

  // Generate markdown report
  let md = '# Baseline Network Request Metrics\n\n';
  md += `- **Date:** ${new Date().toISOString()}\n`;
  md += `- **Environment:** Local development (Frontend: Vite 5173, Backend: Express 3001)\n`;
  md += `- **Measurement Type:** Cold loads with empty cache (new browser context per target)\n\n`;

  md += '## Cold Load API Request Counts (/api/*)\n\n';
  md += '| Page | Path | API Requests Count |\n';
  md += '|---|---|---|\n';
  for (const r of results) {
    md += `| ${r.target} | \`${r.path}\` | **${r.apiCount}** |\n`;
  }
  md += '\n';

  md += '## Cold Load Image Transfer (Home Page `/`)\n\n';
  const imgKb = (homeImageMetrics.totalBytes / 1024).toFixed(2);
  const imgMb = (homeImageMetrics.totalBytes / (1024 * 1024)).toFixed(2);
  md += `- **Total Images Loaded:** ${homeImageMetrics.count}\n`;
  md += `- **Total Image Bytes:** ${imgKb} KB (${imgMb} MB / ${homeImageMetrics.totalBytes.toLocaleString()} bytes)\n\n`;

  md += '## Detailed API Requests per Page\n\n';
  for (const r of results) {
    md += `### ${r.target} (\`${r.path}\`)\n\n`;
    md += `- Total calls: ${r.apiCount}\n`;
    if (r.apiRequests.length > 0) {
      for (const req of r.apiRequests) {
        md += `  - \`${req.method}\` ${req.url.replace('http://localhost:5173', '')}\n`;
      }
    } else {
      md += '  - (None)\n';
    }
    md += '\n';
  }

  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  const outPath = path.join(baselineDir, 'requests.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`Saved baseline request metrics to ${outPath}`);
  console.log(md);
}

main().catch((err) => {
  console.error('Error measuring requests:', err);
  process.exit(1);
});
