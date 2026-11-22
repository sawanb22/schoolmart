import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium, type FullConfig } from '@playwright/test';
import {
  API,
  ARTIFACTS_DIR,
  BACKEND_PORT,
  QA_ADMIN_EMAIL,
  SITE,
  STORAGE_STATE_FILE,
  assertSafeDbUrl,
  baseTestDbUrl,
  e2eSchema,
  schemaDbUrl,
} from './lib/env';
import { hashPassword, newPrisma, takeSnapshot } from './lib/db';
import { seedHubs } from './lib/fixtures';

/**
 * 1. Safety guard: abort if the DB url is anything but the disposable test DB (never ep-green-morning).
 * 2. Seed baseline hub pages inside the private schema, snapshot them.
 * 3. Upsert the QA admin (random password kept only in process env for this run).
 * 4. Prove the running backend is bound to the same private schema (API login works),
 *    then log in through the real admin UI and keep the browser storage state.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  // ---- guard (run before anything touches a database) ----
  assertSafeDbUrl(baseTestDbUrl(), 'DATABASE_URL_TEST');
  assertSafeDbUrl(schemaDbUrl(), 'schema database url');
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ep-green-morning')) {
    throw new Error('[SAFETY] DATABASE_URL in the runner environment points at production. Aborting.');
  }
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const runId = Date.now().toString(36).slice(-6);
  process.env.CMS_E2E_RUN_ID = runId;

  const prisma = newPrisma();
  try {
    // Is the backend really running against the private schema? (tables exist there)
    const pageCount = await prisma.page.count();
    console.log(`[cms-e2e] schema "${e2eSchema()}" ready, ${pageCount} pages bootstrapped by the backend`);

    const created = await seedHubs(prisma);
    console.log(`[cms-e2e] seeded hub pages: ${created.join(', ') || '(none, already present)'}`);

    await takeSnapshot(prisma);

    const password = crypto.randomBytes(14).toString('hex');
    process.env.CMS_E2E_ADMIN_PASSWORD = password;
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email: QA_ADMIN_EMAIL },
      create: { name: 'QA Admin', email: QA_ADMIN_EMAIL, passwordHash, role: 'admin', emailVerified: true },
      update: { passwordHash, role: 'admin', emailVerified: true },
    });

    // The backend must see the user we just wrote => it uses the same DB + schema.
    const res = await fetch(`${API}/auth/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: QA_ADMIN_EMAIL, password }),
    });
    if (!res.ok) {
      throw new Error(`[SAFETY] QA admin API login failed (${res.status}); backend is not bound to the test schema. Aborting.`);
    }
    const body: any = await res.json();
    process.env.CMS_E2E_ADMIN_TOKEN = body.accessToken;

    // ---- real admin UI login, capture storage state ----
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ baseURL: SITE, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const apiHosts = new Set<string>();
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (u.pathname.startsWith('/api/')) apiHosts.add(u.host);
      });
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="email"]').fill(QA_ADMIN_EMAIL);
      await page.getByPlaceholder('Enter your admin password').fill(password);
      await page.getByRole('button', { name: /Sign In to Admin Portal/i }).click();
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 90_000 });
      await context.storageState({ path: STORAGE_STATE_FILE });

      const hosts = [...apiHosts];
      console.log(`[cms-e2e] browser API hosts during admin login: ${hosts.join(', ')}`);
      if (!hosts.includes(`localhost:${BACKEND_PORT}`) || hosts.some((h) => h !== `localhost:${BACKEND_PORT}`)) {
        throw new Error(
          `[SAFETY] browser API traffic must go only to localhost:${BACKEND_PORT}, saw: ${hosts.join(', ') || '(none)'}`
        );
      }
      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    await prisma.$disconnect();
  }
}
