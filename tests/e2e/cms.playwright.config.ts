import { defineConfig, devices } from '@playwright/test';
import {
  ARTIFACTS_DIR,
  BACKEND_PORT,
  FRONTEND_DIR,
  FRONTEND_PORT,
  REPO_ROOT,
  API,
  SITE,
  assertSafeDbUrl,
  backendEnv,
  baseTestDbUrl,
  schemaDbUrl,
} from './cms/lib/env';
import path from 'node:path';

/**
 * Isolated CMS end-to-end configuration.
 *
 * Own servers on NEW ports (backend 3101, frontend 5174), never reused, wired to the
 * disposable test database only. Run with:
 *   npx playwright test -c tests/e2e/cms.playwright.config.ts
 */

// Guard evaluated at config load (runner and every worker): abort if the URL is not the test DB.
assertSafeDbUrl(baseTestDbUrl(), 'DATABASE_URL_TEST');
assertSafeDbUrl(schemaDbUrl(), 'schema database url');

export default defineConfig({
  testDir: path.join(REPO_ROOT, 'tests', 'e2e', 'cms'),
  // Deliberately NOT *.spec.ts: the default root playwright.config.ts globs tests/e2e/**/*.spec.ts
  // and must never pick this suite up (it would run against the dev servers / production DB).
  testMatch: /cms-flows\.e2e\.ts$/,
  outputDir: path.join(ARTIFACTS_DIR, 'test-results'),
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(ARTIFACTS_DIR, 'results.json') }],
  ],
  globalSetup: path.join(REPO_ROOT, 'tests', 'e2e', 'cms', 'global-setup.ts'),
  globalTeardown: path.join(REPO_ROOT, 'tests', 'e2e', 'cms', 'global-teardown.ts'),
  use: {
    baseURL: SITE,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'off',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'node tests/e2e/cms/lib/start-backend.cjs',
      cwd: REPO_ROOT,
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 240_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: backendEnv(),
    },
    {
      command: `node ../node_modules/vite/bin/vite.js --port ${FRONTEND_PORT} --strictPort`,
      cwd: FRONTEND_DIR,
      url: SITE,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      // Process env beats frontend/.env* in Vite. The value includes /api (axios baseURL).
      env: { VITE_API_URL: API },
    },
  ],
});
