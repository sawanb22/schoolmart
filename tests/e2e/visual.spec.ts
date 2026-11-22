import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface RouteEntry {
  path: string;
  kind: 'page' | 'detail' | 'static';
  expectTitle: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const goldenRoutesPath = path.resolve(__dirname, 'golden-routes.json');
const routes: RouteEntry[] = JSON.parse(fs.readFileSync(goldenRoutesPath, 'utf8'));

// Main visual targets
const BASE_VISUAL_ROUTES = [
  '/',
  '/labs',
  '/ai-ml',
  '/campus-master-planning',
  '/faq',
  '/job-openings',
  '/catalogues',
  '/colleges-universities-for-sale',
  '/privacy-policy',
];

// 1 detail page per hub kind (first entry of each kind in the golden list)
const detailRoutes = routes.filter((r) => r.kind === 'detail');
const hubDetailMap = new Map<string, string>();
for (const r of detailRoutes) {
  const parts = r.path.split('/').filter(Boolean);
  const hub = parts[0];
  if (!hubDetailMap.has(hub)) {
    hubDetailMap.set(hub, r.path);
  }
}
const detailTargets = Array.from(hubDetailMap.values());

const ALL_VISUAL_TARGETS = Array.from(new Set([...BASE_VISUAL_ROUTES, ...detailTargets]));

test.describe('Visual Regression Baselines', () => {
  for (const routePath of ALL_VISUAL_TARGETS) {
    const slugName = routePath === '/' ? 'home' : routePath.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_');

    test(`Visual: ${routePath}`, async ({ page }) => {
      // 1. Reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // 2. Navigate and wait for networkidle
      try {
        await page.goto(routePath, { waitUntil: 'networkidle', timeout: 25000 });
      } catch {
        await page.waitForLoadState('domcontentloaded');
      }

      // 3. Freeze any infinite animations/transitions for stable snapshotting
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
            animation-play-state: paused !important;
            transition-duration: 0s !important;
          }
        `,
      });

      // 4. Wait 2500ms for animations and layout to settle
      await page.waitForTimeout(2500);

      // 5. Full-page screenshot with maxDiffPixelRatio: 0.02, animations: 'disabled'
      await expect(page).toHaveScreenshot(`${slugName}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
        timeout: 20000,
      });
    });
  }
});
