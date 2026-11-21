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
const knownFailuresPath = path.resolve(__dirname, 'known-failures.json');

const routes: RouteEntry[] = JSON.parse(fs.readFileSync(goldenRoutesPath, 'utf8'));
const knownFailures: string[] = fs.existsSync(knownFailuresPath)
  ? JSON.parse(fs.readFileSync(knownFailuresPath, 'utf8'))
  : [];

export const IGNORED_CONSOLE_PATTERNS = [
  /favicon\.ico/i,
  /sportsurf\.in/i,
  /Failed to load resource/i,
  /Download the React DevTools/i,
  /kimi-plugin/i,
  /ResizeObserver loop/i,
  /hydration/i,
  /404 \(Not Found\)/i,
  /Failed to fetch/i,
  /net::ERR_/i,
];

test.describe('Smoke Suite - Golden Routes', () => {
  for (const route of routes) {
    const isKnownFailure = knownFailures.includes(route.path);

    test(`${route.kind}: ${route.path}`, async ({ page }) => {
      if (isKnownFailure) {
        test.skip(true, `Known baseline failure: ${route.path}`);
      }

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          const isIgnored = IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
          if (!isIgnored) {
            consoleErrors.push(text);
          }
        }
      });

      // 1. Visit path, wait for networkidle with 20s timeout
      try {
        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 20000 });
      } catch (e) {
        await page.waitForLoadState('domcontentloaded');
      }

      // Small settle delay for client-side routing & effects
      await page.waitForTimeout(500);

      // 2. Assert page does NOT have error / not-found markers
      const body = page.locator('body');
      await expect(body).not.toContainText('Article not found', { timeout: 3000 });
      await expect(body).not.toContainText('Page Not Found', { timeout: 3000 });
      await expect(body).not.toContainText('Something went wrong', { timeout: 3000 });

      // 3. Assert h1 or visible expectTitle exists
      const cleanTitle = (route.expectTitle || '').trim();
      if (cleanTitle.length > 0) {
        const target = page.locator('h1').or(page.getByText(cleanTitle, { exact: false })).first();
        await expect(target).toBeVisible({ timeout: 8000 });
      } else {
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
      }

      // Record any unignored console errors in test output if desired
      if (consoleErrors.length > 0) {
        console.warn(`[Console Errors on ${route.path}]:`, consoleErrors);
      }
    });
  }
});
