# SchoolMart Hybrid CMS & Production Readiness Execution Log

- **Plan:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md`
- **Branch:** `feat/hybrid-cms`
- **Target Stack:** Express 5, Prisma 6, PostgreSQL (Neon / cPanel shared hosting), Vite 7, React 19
- **Started:** 2026-11-21

---

## T0 – Baseline capture and safety net – DONE
- Date: 2026-11-21
- Commit: `4cb956c3315bea688a9c1cda5531e6a61926e06d`
- Backup used (if DB touched): N/A (read-only dev DB queries). Dev DB backed up to `backend/prisma/database-export.json` (1,306,510 bytes, 1275.89 KB, 130 pages, 33 sitecontent rows, 17 categories, 129 products).
- Files changed (summary):
  - Created baseline reports in `docs/plans/baseline/`: `legacy-tests.md`, `bundle.md`, `requests.md`, `lighthouse.md`.
  - Created golden route inventory generator `backend/scripts/export-route-inventory.ts` and output `tests/e2e/golden-routes.json` (209 routes).
  - Configured `@playwright/test` and `playwright.config.ts`.
  - Added Playwright test suites `tests/e2e/smoke.spec.ts`, `tests/e2e/visual.spec.ts`, and known failures tracker `tests/e2e/known-failures.json`.
  - Captured 20 full-page visual regression snapshots in `tests/e2e/visual.spec.ts-snapshots/`.
  - Added request measurement tool `tests/e2e/measure-requests.mjs` and lighthouse runner `scripts/measure-lighthouse.mjs`.
  - Updated `frontend/vite.config.js` to proxy preview `/api` and `/uploads` to port 3001.
  - Updated `.gitignore` to allow `docs/plans/` documentation and ignore Playwright test-results.
- Tests added:
  - `tests/e2e/smoke.spec.ts` (209 route tests: 206 passed, 3 skipped as known baseline failures)
  - `tests/e2e/visual.spec.ts` (20 visual snapshot tests: 20 passed)
- Test results:
  - Legacy tests: 30 passed / 48 total (informational baseline recorded in `docs/plans/baseline/legacy-tests.md`)
  - Root test (`npm test`): 14 passed / 14 total
  - Playwright smoke test: 206 passed / 206 executed (3 known failures skipped: `/ai-digital-design-supply`, `/tech-infra`, `/digital/16-latetest`)
  - Playwright visual test: 20 passed / 20 snapshots generated
- Metrics (if the task has any):
  - Frontend bundle: 155 JS chunks, 1751.62 KB total (entry chunk `index-YIu4sroq.js`: 435.59 KB)
  - ESLint: 562 problems (531 errors, 31 warnings)
  - Cold load API requests: Home `/` (3 calls), Labs `/labs` (4 calls), Labs Item `/labs/composite-skill-lab` (4 calls), Prefixed Dynamic `/50-global-resources-for-school-excellence` (6 calls)
  - Home image transfer: 20 images, 2382.91 KB (2.33 MB)
  - Mobile performance (median): Home (Perf: 91, LCP: 1096 ms, CLS: 0.001, TBT: 281 ms), Labs Hub (Perf: 98, LCP: 1128 ms, CLS: 0.000, TBT: 225 ms, SEO: 67)
- Deviations from plan and why:
  - Lighthouse CLI simulated throttling timed out on Windows headless DevTools protocol connections (`PROTOCOL_TIMEOUT`); as explicitly provided in the brief, performance metrics and Core Web Vitals were captured via Playwright CDP / Chrome PerformanceObserver using Pixel 7 mobile viewport emulation.
  - In `smoke.spec.ts` and `visual.spec.ts`, imported `fileURLToPath` from `url` since project is ESM (`"type": "module"`).
- Found, not fixed:
  - 3 routes failed smoke testing on initial baseline run and are catalogued in `tests/e2e/known-failures.json`:
    - `/ai-digital-design-supply`: missing expected heading matching route expectation.
    - `/tech-infra`: missing expected heading matching route expectation.
    - `/digital/16-latetest`: database card slug contains trailing dash (`16-latetest-`), causing normalized detail slug mismatch.
  - In `DynamicPageRoute`, multiple sequential API attempts occur for prefixed dynamic pages (e.g. 6 requests on `/50-global-resources-for-school-excellence`).
