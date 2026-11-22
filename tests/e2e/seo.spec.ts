import { test, expect } from '@playwright/test';

interface GoldenSeoRoute {
  path: string;
  expectedPath: string;
}

const GOLDEN_ROUTES: GoldenSeoRoute[] = [
  { path: '/', expectedPath: '/' },
  { path: '/labs', expectedPath: '/labs' },
  { path: '/labs/composite-skill-lab', expectedPath: '/labs/composite-skill-lab' },
  { path: '/furniture', expectedPath: '/furniture' },
  { path: '/faq', expectedPath: '/faq' },
];

test.describe('SEO Metadata & Canonical Link Verification (T16)', () => {
  const titlesByRoute: Record<string, string> = {};

  for (const route of GOLDEN_ROUTES) {
    test(`Golden Route [${route.path}] has valid SEO title, canonical link, and meta description`, async ({ page }) => {
      // 1. Visit path and wait for network idle or dom content loaded
      try {
        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        await page.waitForLoadState('domcontentloaded');
      }

      // 2. Wait for React 19 document metadata hoisting
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1, { timeout: 30000 });

      // 3. Verify document title
      await expect(page).toHaveTitle(/CampusMart/i, { timeout: 30000 });
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.trim().length).toBeGreaterThan(0);
      titlesByRoute[route.path] = title;

      // 4. Verify canonical link
      const canonicalHref = await canonical.getAttribute('href');
      expect(canonicalHref).toBeTruthy();

      if (route.expectedPath === '/') {
        expect(canonicalHref).toMatch(/campusmart\.in\/?$/);
      } else {
        expect(canonicalHref).toMatch(new RegExp(`${route.expectedPath}$`));
      }

      // 4. Verify OpenGraph metadata
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
      const ogTitleContent = await ogTitle.getAttribute('content');
      expect(ogTitleContent).toContain('CampusMart');

      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveCount(1);
      const ogUrlContent = await ogUrl.getAttribute('content');
      expect(ogUrlContent).toBe(canonicalHref);
    });
  }

  test('Golden routes have distinct, non-duplicate document titles', async ({ page }) => {
    // If not all routes were visited in the previous tests (e.g. run independently), collect any missing titles
    for (const route of GOLDEN_ROUTES) {
      if (!titlesByRoute[route.path]) {
        try {
          await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await expect(page).toHaveTitle(/CampusMart/i, { timeout: 30000 });
          titlesByRoute[route.path] = await page.title();
        } catch {
          // If navigation fails, let assertion handle it
        }
      }
    }

    const titles = Object.values(titlesByRoute);
    expect(titles.length).toBe(GOLDEN_ROUTES.length);

    // Verify all titles are unique
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  test('Utility page (/login) contains noindex robots meta tag', async ({ page }) => {
    try {
      await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
    } catch {
      await page.waitForLoadState('domcontentloaded');
    }

    await page.waitForTimeout(300);

    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveCount(1);
    const robotsContent = await robotsMeta.getAttribute('content');
    expect(robotsContent).toBe('noindex, nofollow');
  });
});
