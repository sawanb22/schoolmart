import { chromium } from 'playwright';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

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
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const labsRequests = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/pages/labs')) {
        labsRequests.push({ url: req.url(), method: req.method(), time: Date.now() });
      }
    });

    console.log('1. First visit to /labs...');
    await page.goto('http://localhost:5173/labs', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const initialCount = labsRequests.length;
    console.log(`Initial /api/pages/labs request count: ${initialCount}`);

    console.log('2. Client-side navigating to /...');
    // Click on home link in header or navigate via History API
    await page.click('header a[href="/"]');
    await page.waitForTimeout(1500);

    console.log('3. Client-side navigating back to /labs within 60s...');
    const countBeforeRevisit = labsRequests.length;
    // Click on category bar / header link to /labs
    await page.click('a[href="/labs"]');
    await page.waitForTimeout(2000);

    const countAfterRevisit = labsRequests.length;
    const revisitRequests = countAfterRevisit - countBeforeRevisit;
    console.log(`New /api/pages/labs requests during revisit: ${revisitRequests}`);

    if (revisitRequests === 0) {
      console.log('VERIFIED: 0 network requests to /api/pages/labs upon client-side revisit within staleTime (60s)!');
    } else {
      console.error(`FAILED: Expected 0 requests on revisit, got ${revisitRequests}`);
      process.exit(1);
    }
  } finally {
    await browser.close();
    if (backendProc) backendProc.kill();
    if (frontendProc) frontendProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
