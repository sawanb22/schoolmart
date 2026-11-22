/**
 * Playwright fixtures + UI/API helpers for the CMS e2e suite.
 *
 * Every test starts from the baseline snapshot (restoreSnapshot), uses real UI actions in the
 * admin app for the behaviour under test, and verifies through the public UI, the HTTP APIs and
 * the database. Helpers never weaken an assertion; they only locate things and wait.
 */
import { test as base, expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  API,
  ARTIFACTS_DIR,
  BACKEND_PORT,
  FRONTEND_PORT,
  SITE,
  STORAGE_STATE_FILE,
  assertSafeDbUrl,
  baseTestDbUrl,
  schemaDbUrl,
  type HubSlug,
} from './env';
import { loadSnapshot, newPrisma, restoreSnapshot, type Prisma } from './db';

export { expect };

/* ------------------------------------------------------------------ */
/* Run guard: the suite only makes sense under its own config          */
/* ------------------------------------------------------------------ */

export function assertRunningUnderCmsConfig(): void {
  if (!process.env.CMS_E2E_RUN_ID || !process.env.CMS_E2E_ADMIN_TOKEN) {
    throw new Error(
      'CMS e2e suite must be started with: npx playwright test -c tests/e2e/cms.playwright.config.ts (globalSetup did not run).'
    );
  }
  assertSafeDbUrl(baseTestDbUrl(), 'DATABASE_URL_TEST');
  assertSafeDbUrl(schemaDbUrl(), 'schema database url');
}

export function runId(): string {
  return process.env.CMS_E2E_RUN_ID || 'norun';
}

/* ------------------------------------------------------------------ */
/* Session: contexts, dialogs, network guard                           */
/* ------------------------------------------------------------------ */

export interface TrackedPage {
  page: Page;
  dialogs: string[];
}

export class Session {
  private contexts: BrowserContext[] = [];
  readonly violations: string[] = [];
  readonly apiHosts = new Set<string>();

  constructor(private readonly browser: Browser) {}

  private async makeContext(admin: boolean, guard = true): Promise<BrowserContext> {
    const context = await this.browser.newContext({
      baseURL: SITE,
      viewport: { width: 1440, height: 900 },
      storageState: admin ? STORAGE_STATE_FILE : undefined,
    });
    const leavesIsolatedStack = (url: URL) =>
      url.port === '3001' ||
      url.port === '5173' ||
      (url.port === String(FRONTEND_PORT) && url.pathname.startsWith('/api/'));
    if (guard) {
      // Anything that would leave the isolated stack is blocked and recorded as a violation.
      // NOTE: Playwright disables the browser HTTP cache while routing is active, so cache-sensitive
      // checks use guard=false contexts (violations are then detected, not blocked).
      await context.route(leavesIsolatedStack, (route) => {
        this.violations.push(route.request().url());
        return route.abort();
      });
    } else {
      context.on('request', (req) => {
        try {
          if (leavesIsolatedStack(new URL(req.url()))) this.violations.push(req.url());
        } catch {
          /* ignore */
        }
      });
    }
    context.on('request', (req) => {
      try {
        const u = new URL(req.url());
        if (u.pathname.startsWith('/api/')) this.apiHosts.add(u.host);
      } catch {
        /* ignore */
      }
    });
    this.contexts.push(context);
    return context;
  }

  adminContext(): Promise<BrowserContext> {
    return this.makeContext(true);
  }

  publicContext(opts: { cacheable?: boolean } = {}): Promise<BrowserContext> {
    return this.makeContext(false, !opts.cacheable);
  }

  async track(context: BrowserContext): Promise<TrackedPage> {
    const page = await context.newPage();
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(`${d.type()}: ${d.message()}`);
      await d.accept();
    });
    return { page, dialogs };
  }

  async adminPage(): Promise<TrackedPage> {
    return this.track(await this.adminContext());
  }

  /** cacheable=true keeps the browser HTTP cache active (needed to observe Cache-Control staleness). */
  async publicPage(opts: { cacheable?: boolean } = {}): Promise<TrackedPage> {
    return this.track(await this.publicContext(opts));
  }

  async closeAll(onFailureScreenshotPrefix?: string): Promise<void> {
    let n = 0;
    for (const c of this.contexts) {
      for (const p of c.pages()) {
        if (!onFailureScreenshotPrefix) continue;
        n += 1;
        try {
          await p.screenshot({ path: `${onFailureScreenshotPrefix}-${n}.png`, fullPage: false, timeout: 10_000 });
        } catch {
          /* page may be closed */
        }
      }
    }
    for (const c of this.contexts) {
      try {
        await c.close();
      } catch {
        /* ignore */
      }
    }
    this.contexts = [];
  }
}

export const test = base.extend<{ session: Session }, { db: Prisma }>({
  db: [
    async ({}, use) => {
      assertRunningUnderCmsConfig();
      const prisma = newPrisma();
      await use(prisma);
      await prisma.$disconnect();
    },
    { scope: 'worker' },
  ],
  session: async ({ browser, db }, use, testInfo) => {
    assertRunningUnderCmsConfig();
    await restoreSnapshot(db, loadSnapshot());
    const session = new Session(browser);
    await use(session);
    // Network isolation: every API call must have gone to the isolated backend.
    const foreign = [...session.apiHosts].filter((h) => h !== `localhost:${BACKEND_PORT}`);
    const failed = testInfo.status !== testInfo.expectedStatus;
    const shotPrefix = failed
      ? path.join(ARTIFACTS_DIR, `${testInfo.title.split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, '')}-failure`)
      : undefined;
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    await session.closeAll(shotPrefix);
    if (session.violations.length || foreign.length) {
      testInfo.annotations.push({
        type: 'ISOLATION-VIOLATION',
        description: `blocked=${session.violations.join(',')} foreignApiHosts=${foreign.join(',')}`,
      });
    }
    expect(session.violations, 'requests that tried to leave the isolated stack').toEqual([]);
    expect(foreign, 'API hosts other than the isolated backend').toEqual([]);
  },
});

export function note(type: string, description: string): void {
  test.info().annotations.push({ type, description });
}

/* ------------------------------------------------------------------ */
/* HTTP API helpers                                                    */
/* ------------------------------------------------------------------ */

export async function apiJson(
  pathname: string,
  opts: { auth?: boolean; method?: string; body?: unknown } = {}
): Promise<{ status: number; headers: Headers; json: any }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth) headers.authorization = `Bearer ${process.env.CMS_E2E_ADMIN_TOKEN}`;
  const res = await fetch(`${API}${pathname}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, json };
}

export async function fetchCatalog(
  hub?: string
): Promise<{ hubs: any[]; items: any[]; cacheControl: string | null; pragma: string | null; expires: string | null }> {
  const qs = new URLSearchParams({ _: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
  if (hub) qs.set('hub', hub);
  const r = await apiJson(`/pages/hub/catalog?${qs.toString()}`);
  if (r.status !== 200) throw new Error(`catalog returned ${r.status}`);
  return {
    hubs: r.json.hubs || [],
    items: r.json.items || [],
    cacheControl: r.headers.get('cache-control'),
    pragma: r.headers.get('pragma'),
    expires: r.headers.get('expires'),
  };
}

export function catalogHub(cat: { hubs: any[] }, hub: string): any {
  return cat.hubs.find((h) => h.id === hub);
}

export async function searchFinder(q: string): Promise<any> {
  const r = await apiJson(`/solutions-finder/search?q=${encodeURIComponent(q)}&_=${Date.now()}`);
  return { status: r.status, body: r.json };
}

export function searchHitsFor(body: any, needle: { title?: string; slug?: string }): any[] {
  const pool = [...(body?.curatedSolutions || []), ...(body?.complementaryInfra || [])];
  return pool.filter(
    (c: any) =>
      (needle.title && c.title === needle.title) ||
      (needle.slug && (String(c.cardSlug || '').includes(needle.slug) || String(c.targetUrl || '').includes(needle.slug)))
  );
}

/** Polls the finder until the predicate holds or the deadline passes. Returns the last body. */
export async function pollSearch(
  q: string,
  needle: { title?: string; slug?: string },
  want: 'present' | 'absent',
  timeoutMs = 25_000
): Promise<{ ok: boolean; body: any; attempts: number }> {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  let body: any = null;
  while (Date.now() < deadline) {
    attempts += 1;
    const r = await searchFinder(q);
    body = r.body;
    const present = searchHitsFor(body, needle).length > 0;
    if ((want === 'present') === present) return { ok: true, body, attempts };
    await new Promise((res) => setTimeout(res, 1500));
  }
  return { ok: false, body, attempts };
}

/* ------------------------------------------------------------------ */
/* Public site helpers                                                 */
/* ------------------------------------------------------------------ */

export async function openHub(page: Page, slug: HubSlug | string): Promise<void> {
  await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });
  // Hero heading is rendered only after page data has loaded (skeleton has no h1).
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function publicChips(page: Page): Promise<string[]> {
  const texts = await page.locator('aside button').allInnerTexts();
  return texts.map((t) => t.trim()).filter(Boolean);
}

export async function visibleCardTitles(page: Page): Promise<string[]> {
  const texts = await page.locator('main a h3').allInnerTexts();
  return texts.map((t) => t.trim());
}

export async function clickChip(page: Page, name: string): Promise<void> {
  await page.locator('aside').getByRole('button', { name, exact: true }).click();
}

export interface Reachability {
  reachable: boolean;
  where: string | null;
  defaultView: string[];
  chips: string[];
}

/** Where on the public hub grid can a visitor see this card? (default view, or after clicking any chip) */
export async function reachableOnHub(page: Page, hub: string, title: string): Promise<Reachability> {
  await openHub(page, hub);
  const defaultView = await visibleCardTitles(page);
  const chips = await publicChips(page);
  if (defaultView.includes(title)) return { reachable: true, where: 'default view', defaultView, chips };
  for (const chip of chips) {
    await clickChip(page, chip);
    const titles = await visibleCardTitles(page);
    if (titles.includes(title)) return { reachable: true, where: `chip "${chip}"`, defaultView, chips };
  }
  return { reachable: false, where: null, defaultView, chips };
}

export interface DetailResult {
  found: boolean;
  heading: string;
}

export async function openDetail(page: Page, hub: string, slug: string): Promise<DetailResult> {
  await page.goto(`/${hub}/${slug}`, { waitUntil: 'domcontentloaded' });
  const notFound = page.getByText("That module couldn't be found.");
  const heading = page.locator('main main h1, main h1').first();
  await expect(notFound.or(heading).first()).toBeVisible({ timeout: 60_000 });
  // The skeleton can briefly precede the real result; settle first.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  if (await notFound.isVisible().catch(() => false)) return { found: false, heading: '' };
  return { found: true, heading: ((await heading.innerText().catch(() => '')) || '').trim() };
}

/* ------------------------------------------------------------------ */
/* Admin: Categories page                                              */
/* ------------------------------------------------------------------ */

export async function gotoCategories(page: Page, slug: string): Promise<void> {
  await page.goto(`/admin/categories?page=${slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Registered Live Categories')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/Loading categories for/)).toHaveCount(0);
}

export async function categoriesListed(page: Page): Promise<string[]> {
  return page.$$eval('button[title^="Rename \\""]', (els) => els.map((e) => (e.getAttribute('title') || '').slice(8, -1)));
}

export async function categoriesAddInput(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder(/^e\.g\. Cybersecurity/).fill(name);
  await page.getByRole('button', { name: /Add Category/ }).click();
}

export async function categoriesSave(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /^\s*Save .*Categories\s*$/ });
  await expect(button).toBeEnabled();
  const put = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/pages\/\d+$/.test(new URL(r.url()).pathname));
  await button.click();
  const res = await put;
  expect(res.status(), 'Categories page PUT /api/pages/:id').toBe(200);
  await expect(page.getByText(/Categories for .* saved!/)).toBeVisible();
}

export async function categoriesRename(page: Page, from: string, to: string): Promise<void> {
  await page.locator(`button[title='Rename "${from}"']`).click();
  const input = page.locator('input.border-blue-400');
  await input.fill(to);
  await input.press('Enter');
}

export async function categoriesDelete(page: Page, name: string): Promise<void> {
  await page.locator(`button[title='Delete "${name}"']`).click();
}

/* ------------------------------------------------------------------ */
/* Admin: Page editor (UnifiedPageEditor)                              */
/* ------------------------------------------------------------------ */

export async function gotoEditor(page: Page, pageId: number): Promise<void> {
  await page.goto(`/admin/pages/${pageId}/edit`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/^Edit Page:/)).toBeVisible({ timeout: 90_000 });
}

export function cardRows(page: Page): Locator {
  return page.locator('[id^="card-item-"]');
}

export function cardRow(page: Page, title: string): Locator {
  return cardRows(page).filter({ has: page.getByText(title, { exact: true }) }).first();
}

export async function expandCard(row: Locator): Promise<void> {
  const header = row.locator('[role="button"][aria-expanded]').first();
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
}

export async function setCardTitle(row: Locator, title: string): Promise<void> {
  await row.locator('input[placeholder="Card Title"]').fill(title);
}

export async function setCardDescription(row: Locator, text: string): Promise<void> {
  await row.locator('textarea[placeholder="Card teaser description..."]').fill(text);
}

export function cardCategoryPill(row: Locator, name: string): Locator {
  return row.getByRole('button', { name, exact: true });
}

export async function editorAddCard(page: Page): Promise<Locator> {
  const before = await cardRows(page).count();
  await page.getByRole('button', { name: /^\s*New Card\s*$/ }).click();
  await expect(cardRows(page)).toHaveCount(before + 1);
  const row = page.locator(`#card-item-${before}`);
  await expect(row.locator('input[placeholder="Card Title"]')).toBeVisible();
  return row;
}

export async function editorSave(page: Page): Promise<void> {
  const put = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/pages\/\d+$/.test(new URL(r.url()).pathname));
  await page.getByRole('button', { name: /Save Page Changes/ }).click();
  const res = await put;
  expect(res.status(), 'Editor PUT /api/pages/:id').toBe(200);
  // The sticky header button reads "(check) Changes Saved!"; a second bottom button reads "(check) All Changes Saved!".
  await expect(page.getByRole('button', { name: /Changes Saved/ }).first()).toBeVisible();
}

export async function editorCardTitles(page: Page): Promise<string[]> {
  const rows = cardRows(page);
  const n = await rows.count();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(((await rows.nth(i).locator('[role="button"][aria-expanded] span.font-bold').first().innerText()) || '').trim());
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Unique names                                                        */
/* ------------------------------------------------------------------ */

export function qaCat(tag: string): string {
  return `QA Cat ${runId()} ${tag}`;
}

export function qaCard(tag: string): string {
  return `QA Card ${runId()} ${tag}`;
}
