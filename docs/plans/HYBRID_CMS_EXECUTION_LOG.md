# SchoolMart Hybrid CMS & Production Readiness Execution Log

- **Plan:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md`
- **Branch:** `feat/hybrid-cms`
- **Target Stack:** Express 5, Prisma 6, PostgreSQL (Neon / cPanel shared hosting), Vite 7, React 19
- **Started:** 2026-11-21

---

## T0 – Baseline capture and safety net – DONE
- Date: 2026-11-21
- Commit: `0604f48b4ec8747144549b39a9e0c8dde74f00b0`
- Review Status: APPROVED (commits 0389522..0604f48, review clean, 0 critical, 0 important)
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

---

## T1 – Backend Test Harness and Clean Migration Baseline – DONE
- Date: 2026-11-21
- Commit: Pending (T1 commit)
- Review Status: APPROVED (commits 21268a7..6ab584c, review clean, 0 critical, 0 important)
- Backup used (if DB touched): Verified `backend/prisma/database-export.json` on test database via `npm run db:restore`. Dev database baselined cleanly without data loss.
- Files changed (summary):
  - Split `backend/src/index.ts` into `backend/src/app.ts` (Express app configuration) and `backend/src/server.ts` (HTTP listen & solutions indexer boot). Made `index.ts` a one-line forwarder.
  - Installed `vitest`, `supertest`, `@types/supertest`, and `fast-check` in `backend`.
  - Created `backend/vitest.config.ts`, `backend/tests/global-setup.ts` with 3-point database safety guard and synchronous test database migration reset.
  - Added test helpers `backend/tests/helpers/db.ts`, `backend/tests/helpers/auth.ts`, and `backend/tests/helpers/app.ts`.
  - Added `backend/tests/smoke.test.ts` (7 tests verifying `/health`, `/api/pages/faq`, and the 3-point safety guard suite).
  - Archived legacy MySQL migrations into `backend/prisma/migrations_archive/`.
  - Created pure PostgreSQL baseline migration `backend/prisma/migrations/20261121000000_baseline_postgres/migration.sql` (12,308 bytes).
  - Baselined development database and marked `20261121000000_baseline_postgres` as applied; confirmed 0 schema drift.
  - Tested database restore against isolated test database (`br-sparkling-morning-bi11w2j6`), hardened `backend/scripts/restore-database.js` with IPv4-first and retry logic.
  - Added `backend/prisma/sql/README.md`.
  - Updated `backend/package.json` scripts (`"test": "vitest run"`, `"test:watch": "vitest"`, `"start": "node dist/server.js"`, `"dev": "ts-node-dev --respawn --transpile-only src/server.ts"`).
  - Updated root `package.json` scripts (`"test": "npm run test:backend"`, `"test:backend": "npm run test --prefix backend"`, `"test:legacy": "node tests/clean-cards-verification.test.cjs"`).
- Tests added:
  - `backend/tests/smoke.test.ts` (7 tests: health check, FAQ CMS route, 5 safety guard unit tests)
- Test results:
  - `npm run test --prefix backend`: 7 passed / 7 total
  - `npm test`: 7 passed / 7 total
  - `npm run test:legacy`: 14 passed / 14 total
  - `npm run build --prefix backend`: 0 compilation errors
  - `npx prisma migrate status`: Database schema is up to date!
- Metrics (if the task has any):
  - Baseline migration size: 12,308 bytes
  - Vitest backend suite execution: ~16.7s (including automated test database reset)
- Deviations from plan and why:
  - In `backend/scripts/restore-database.js`, added `dns.setDefaultResultOrder('ipv4first')` and `withRetry` around upserts to prevent remote connection drops (`P1001`/`P1017`) during high-frequency bulk restore loops.
- Found, not fixed:
  - None.

---

## T2 – Characterization Tests and Removal of GET Side Effects – DONE
- Date: 2026-11-21
- Commit: `ccd219c` (T2: Characterization tests and removal of GET side effects)
- Review Status: APPROVED (commits c43fe98..ccd219c, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (read-only dev DB queries for fixture extraction; tests run strictly against isolated test DB `DATABASE_URL_TEST`).
- Files changed (summary):
  - Created `backend/scripts/export-page-fixtures.ts` to export real page fixtures from dev DB.
  - Exported 14 real page fixtures to `backend/tests/fixtures/pages/` (`labs`, `ai-ml`, `campus-master-planning`, `campus-design-execution`, `faq`, `job-openings`, `catalogues`, `colleges-universities-for-sale`, `sports-infra`, `libraries`, `tech-infra`, `privacy-policy`, `guide-50-global-resources-for-school-excellence`, `resource-composite-skill-lab`).
  - Added 10 synthetic edge-case fixtures to `backend/tests/fixtures/pages/` (`edge-duplicate-titles`, `edge-no-card-slugs`, `edge-category-mix`, `edge-section2-only`, `edge-featured-duplicate`, `edge-featured-empty`, `edge-null-entries`, `edge-faq-no-title`, `edge-script-injection`, `edge-unicode-titles`).
  - Created fixture seeding helper `backend/tests/helpers/seed-fixtures.ts`.
  - Created characterization snapshot suite `backend/tests/contract/legacy-pages.contract.test.ts` and generated 26 file snapshots in `backend/tests/contract/__snapshots__/` (covering 24 page fixtures + `hub/catalog` + `hub/catalog?hub=labs`).
  - Extracted page seeding logic into dedicated service `backend/src/services/bootstrap-pages.ts` exporting `bootstrapPages(): Promise<{ created: string[], updated: string[] }>` with concurrency safety (Prisma P2002 handling and re-read).
  - Updated `backend/src/server.ts` to execute `await bootstrapPages()` prior to `app.listen()`.
  - Updated `backend/prisma/seed.ts` and `backend/src/runSeed.ts` to invoke `await bootstrapPages()`.
  - Eliminated all database side effects from public GET routes in `backend/src/routes/pages.routes.ts` (`GET /published`, `GET /:idOrSlug`); zero `ensure*` functions remain in route files. Admin `GET /` calls `bootstrapPages()`.
  - Created verification suite `backend/tests/pages/no-side-effects.test.ts` proving Invariant I1 (row counts and max updatedAt unchanged across public endpoints; missing `faq` returns 404 without resurrection).
  - Created unit & concurrency suite `backend/tests/services/bootstrap-pages.test.ts` verifying empty DB bootstrapping, idempotency on subsequent runs, and race-free concurrent execution (`Promise.all`).
  - Updated `backend/tests/smoke.test.ts` to bootstrap defaults in `beforeAll` without relying on legacy GET side effects.
- Tests added:
  - `backend/tests/contract/legacy-pages.contract.test.ts` (26 tests)
  - `backend/tests/services/bootstrap-pages.test.ts` (3 tests)
  - `backend/tests/pages/no-side-effects.test.ts` (1 test)
- Test results:
  - `npm run test --prefix backend`: 37 passed / 37 total (4 test files)
  - `npm run build --prefix backend`: 0 compilation errors
- Metrics:
  - Contract snapshots: 26 JSON snapshot files committed under `backend/tests/contract/__snapshots__/`
  - Zero regex matches for `ensure(Simple|Article|CollegeSale|Partner|JobOpenings)Page` in `backend/src/routes`
- Deviations from plan and why:
  - `toMatchFileSnapshot` in Vitest returns a Promise and must be awaited (`await expect(...).toMatchFileSnapshot(...)`), which was properly applied.
- Found, not fixed:
  - None.

---

## T3 – Schema: New Tables, JSONB, Versions – DONE
- Date: 2026-11-21
- Commit: `17040ae` (T3: Schema: new tables, jsonb, versions)
- Review Status: APPROVED (commits 198f0c4..17040ae, review clean, 0 critical, 0 important)
- Backup used (if DB touched): Fresh dev DB export created at `backend/prisma/database-export.json` (1,309,504 bytes, 130 pages) prior to `prisma migrate deploy`. Rehearsed migration on isolated Neon test database with 100% data retention before applying to dev database.
- Files changed (summary):
  - Updated `backend/prisma/schema.prisma` with 6 relational CMS models (`PageItem`, `PageCategory`, `PageItemCategory`, `SlugRedirect`, `PageRevision`, `CmsState`) and updated `Page` model (`contentModel`, `pageData Json?`, `version`, index on `published`).
  - Created hand-crafted migration `backend/prisma/migrations/20261121120000_hybrid_cms_tables/migration.sql` with non-destructive `USING` cast for `pageData` to `JSONB` without column drop, and initialized singleton `CmsState` (id: 1, version: 1).
  - Created shared parser `backend/src/lib/page-data.ts` (`parsePageData`) and legacy response serializer `backend/src/services/page-content/page-response.ts` (`toLegacyPageResponse`, `toLegacyPagesResponse`).
  - Modernized backend reads and writes in `backend/src/routes/pages.routes.ts`, `backend/src/services/bootstrap-pages.ts`, `backend/prisma/seed.ts`, and `backend/src/runSeed.ts` to use native objects and `parsePageData`, eliminating all `pageData:\s*JSON\.stringify` (0 matches).
  - Updated `backend/src/server.ts` with `dns.setDefaultResultOrder('ipv4first')` to prevent Windows IPv6 pooler connection drops.
  - Updated `backend/tests/helpers/db.ts` to cascade-truncate all 9 content tables and re-seed `cmsstate` (1, 1).
  - Updated `backend/scripts/export-database.js` and `backend/scripts/restore-database.js` to handle both pre-migration and post-migration schemas seamlessly.
  - Added preflight validator `backend/scripts/check-pagedata-json.ts` (130/130 pages valid JSON).
  - Created test suites `backend/tests/lib/page-data.test.ts` (10 tests), `backend/tests/schema/constraints.test.ts` (6 tests), and `backend/tests/schema/jsonb-integrity.test.ts` (3 tests).
  - Enhanced snapshot normalization in `backend/tests/contract/legacy-pages.contract.test.ts` to handle PostgreSQL JSONB key reordering without modifying the 26 snapshot files.
- Tests added:
  - `backend/tests/lib/page-data.test.ts` (10 tests)
  - `backend/tests/schema/constraints.test.ts` (6 tests)
  - `backend/tests/schema/jsonb-integrity.test.ts` (3 tests)
- Test results:
  - `npm run test --prefix backend`: 56 passed / 56 total (7 test files)
  - `npm run build --prefix backend`: 0 compilation errors
  - `npx playwright test tests/e2e/smoke.spec.ts`: 206 passed / 206 executed (3 known failures skipped)
- Metrics:
  - Non-null `pageData` retention: 130/130 dev pages preserved (100%)
  - Invariant I2 count (`jsonb_typeof("pageData") <> 'object'`): 0
  - Matches for `pageData:\s*JSON\.stringify` across backend: 0
- Deviations from plan and why:
  - Enhanced `normalizePageResponse` in `legacy-pages.contract.test.ts` with `orderKeysLike` helper to handle PostgreSQL JSONB internal key sorting so that all 26 existing contract snapshot files remain unmodified and 100% green.
  - Added `dns.setDefaultResultOrder('ipv4first')` to `backend/src/server.ts` to prevent Node.js IPv6 socket timeouts on Windows connecting to Neon AWS pooler hostnames.
- Found, not fixed:
  - None.

---

## T4 – Migration Script: Blobs to Rows – DONE
- Date: 2026-11-21
- Commit: `1c8c88a` (T4: Migration script: blobs to rows)
- Review Status: APPROVED (commits 654340e..1c8c88a)
- Backup used (if DB touched): N/A (read-only dev DB queries for dry-run; `--apply` strictly forbidden on dev DB in T4 and executed only against isolated test DB `DATABASE_URL_TEST`).
- Files changed (summary):
  - Created `backend/src/services/page-content/constants.ts` defining canonical collections, column keys, detail keys, HTML keys, document slugs, and payload limits.
  - Created `backend/src/services/page-content/legacy-mapper.ts` implementing `slugify`, `normalizeSlug`, `classifyPage`, `splitItem`, `splitLegacyPageData`, `buildItem`, and `buildLegacyPageData`.
  - Created `backend/tests/helpers/legacy-equivalence.ts` implementing `assertLegacyEquivalent` enforcing the 5 permitted normalization differences.
  - Created `backend/src/services/page-content/structured-writer.ts` implementing transactional `writeStructuredPage` with bulk `createMany` joins.
  - Created `backend/scripts/migrate-page-items.ts` with `--dry-run`, `--apply`, `--page=<slug>`, `--force`, `--output=<path>`, and programmatic `runMigration`.
  - Executed dev database dry run: output saved to `backend/scripts/output/migrate-page-items-dev-dryrun.json`.
  - Created unit tests `backend/tests/page-content/legacy-mapper.test.ts` (19 tests: 50 slugify parity samples, edge fixtures, classification).
  - Created fast-check property test suite `backend/tests/page-content/legacy-mapper.property.test.ts` with 200 runs each for P1 (round-trip I4), P2 (slug uniqueness), P3 (determinism), and P4 (detail isolation).
  - Created migration CLI integration tests `backend/tests/scripts/migrate-page-items.test.ts` (6 tests: dry-run zero mutations, `--apply` counts, idempotence, pre-migration revision snapshots, `--force` re-migration, document page isolation).
- Tests added:
  - `backend/tests/page-content/legacy-mapper.test.ts` (19 tests)
  - `backend/tests/page-content/legacy-mapper.property.test.ts` (4 property tests, 200 runs each = 800 executions)
  - `backend/tests/scripts/migrate-page-items.test.ts` (6 tests)
- Test results:
  - `npm run test --prefix backend`: 85 passed / 85 total (10 test files)
  - `npm run build --prefix backend`: 0 compilation errors
  - Fast-check property runs: 800/800 passed (P1–P4 at 200 runs each)
- Metrics:
  - Dev DB dry run: 130 total pages (11 structured, 119 document, 57 items, 49 categories, 0 warnings, 0 errors)
  - Round-trip Invariant I4 equivalence: verified on all 11 dev structured pages and across 200 arbitrary generated payloads
- Deviations from plan and why:
  - Added `{ maxWait: 15000, timeout: 60000 }` to `db.$transaction` in `migrate-page-items.ts` and optimized join insertions to `createMany` to avoid interactive transaction timeouts on Neon across network regions.
- Found, not fixed:
  - None.



