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
- Commit: `f514044` (T4: Migration script: blobs to rows)
- Review Status: APPROVED (commits 654340e..f514044, review clean, 0 critical, 0 important)
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

---

## T5 – Read Path from Tables, Legacy Write Adapter, Item Endpoint, Data Cut-Over – DONE
- Date: 2026-11-21
- Commit: `c1c7fd9` (T5: Read path from tables, legacy write adapter, item endpoint, data cut-over)
- Review Status: APPROVED (commits ef315d3..c1c7fd9, review clean, 0 critical, 0 important)
- Backup used (if DB touched): Fresh dev DB export created at `backend/prisma/database-export.json` (1,407,690 bytes, 1374.70 KB, 130 pages) prior to executing `migrate-page-items.ts --apply` on dev database.
- Files changed (summary):
  - Created `backend/src/services/page-content/page-content.service.ts` implementing `loadPage` (single Prisma query with joins and alias resolution for `sports` <-> `sports-infra` and `sell-on-schoolmart` <-> `sell-on-campusmart`), `getPageLegacy` (clean legacy reconstruction with `buildLegacyPageData`), `getHubV2` (Invariant I5: zero `detail` keys, clean hub v2 shape), `findItem` (exact slug -> `SlugRedirect` -> fallback title/href leaf), and `getItem` (with 301 redirects and 404s).
  - Created `backend/src/services/page-content/after-content-write.ts` implementing global write hook with atomic `CmsState.version` bump (Invariant I6) and 2000 ms debounced `solutionsIndexService.rebuild()`.
  - Updated `backend/src/services/page-content/page-response.ts` (`toLegacyPageResponse`) to omit relational CMS attributes (`items`, `categories`, `revisions`) from legacy page response shapes.
  - Implemented rollback mode `--rollback [--page=<slug>]` in `backend/scripts/migrate-page-items.ts` restoring `pre-migration` snapshots, deleting items/categories, restoring `contentModel='document'`, and bumping versions.
  - Updated `backend/src/routes/pages.routes.ts`:
    - Mounted `GET /:slug/items/:itemSlug` before `/:idOrSlug`.
    - Updated `GET /:idOrSlug` to route `?v=2` to `getHubV2` and legacy to `getPageLegacy`.
    - Added optimistic concurrency locking (`version` check -> HTTP 409 `version_conflict`) and legacy write adapter (re-splitting incoming `pageData` blobs to relational tables via `writeStructuredPage`) in `PUT /:id`.
    - Integrated `afterContentWrite` in `POST /`, `PUT /:id`, and `DELETE /:id`.
  - Updated `backend/src/routes/content.routes.ts` to call `afterContentWrite` in `PUT /` and `PUT /:key`.
  - Configured `postman/collections/campusmart-pages-api.json` covering public and admin CMS endpoints, Hub v2, item endpoint, and 409 version conflict test.
  - Hardened backend test harness: updated `backend/tests/helpers/auth.ts` (`seedAdminUser`, `getAdminToken`), unified `prisma` singleton in `backend/tests/helpers/db.ts` with IPv4-first, and increased hook timeouts in `backend/vitest.config.mts`.
  - Executed dev database cut-over with `--apply`: 130 total pages processed, 11 structured pages migrated, 119 document pages skipped, 57 items created, 49 categories created, 0 warnings, 0 errors. Report saved to `backend/scripts/output/migrate-page-items-2026-11-21T11-54-42-549Z.json`.
  - Verified Invariant I7 with Playwright smoke suite: 206 routes passed / 206 executed (3 known baseline failures skipped), 0 regressions.
- Tests added:
  - `backend/tests/contract/legacy-pages.contract.test.ts` (Dual mode: Mode 1 with 26 unmigrated snapshots + Mode 2 with 24 migrated `assertLegacyEquivalent` tests = 50 tests)
  - `backend/tests/page-content/hub-v2.test.ts` (7 tests: shape, Invariant I5 recursive zero-detail verification, public/admin visibility, category ordering, document fallback)
  - `backend/tests/page-content/item-endpoint.test.ts` (7 tests: exact slug, SlugRedirect 301, title-slug fallback, href-leaf fallback, public/admin 404, alias resolution)
  - `backend/tests/page-content/legacy-write-adapter.test.ts` (4 tests: full blob write item diffing, settings-only update, 409 version conflict, version increment)
  - `backend/tests/page-content/cms-version.test.ts` (5 tests: Invariant I6 version increment on POST page, PUT page, DELETE page, PUT content, PUT content key)
  - `backend/tests/scripts/migrate-rollback.test.ts` (2 tests: full DB rollback deep-equal pageData verification, single-page `--page=<slug>` rollback)
- Test results:
  - `npm run test --prefix backend`: 134 passed / 134 total (15 test files)
  - `npm run build --prefix backend`: 0 compilation errors
  - `npx playwright test tests/e2e/smoke.spec.ts`: 206 passed / 206 executed (3 known baseline failures skipped), 0 regressions
- Metrics:
  - Dev database cut-over: 11 structured pages, 119 document pages, 57 items, 49 categories, 0 warnings, 0 errors
  - Vitest test suites: 15/15 test files passed, 134/134 unit and contract tests passed
  - Invariant I5 (zero detail in Hub v2): 0 detail occurrences across public and admin responses
  - Invariant I6 (write bumps version): verified across all 5 CMS write routes
  - Invariant I7 (smoke test stability): 206/206 routes pass with 0 regressions
- Deviations from plan and why:
  - Vitest hook timeouts on Windows connecting to Neon Postgres pooler required increasing vitest timeouts to 60s/120s and scoping test suite fixtures so each suite seeds only the pages it needs.
  - In `PageResponse`, removed relational properties (`items`, `categories`, `revisions`) from `toLegacyPageResponse` so legacy endpoints remain byte-for-byte identical to pre-migration schemas.
- Found, not fixed:
  - Visual regression suite (`visual.spec.ts`) exhibits subpixel and height diffs on Windows due to uncommitted working-copy styling changes in `frontend/src/` outside T5 scope; smoke test suite (`smoke.spec.ts`) proved all 206 routes continue to resolve cleanly with 0 regressions (Invariant I7).

---

## T6 – Admin Item and Category API with Validation and Locking – DONE
- Date: 2026-11-21
- Commit: `829c243` (T6: Admin item and category API with validation and locking)
- Review Status: APPROVED (commits 124b903..829c243, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (Admin tests run strictly against isolated test DB `DATABASE_URL_TEST`).
- Files changed (summary):
  - Installed and pinned `zod@3.23.8`, `sanitize-html@2.14.0`, and `@types/sanitize-html@2.16.2` in `backend/package.json`.
  - Created `backend/src/services/page-content/schemas.ts` defining Zod validation schemas (`ItemInputSchema`, `ItemPatchSchema`, `CardInputSchema`, `CategoryInputSchema`, `CategoryPatchSchema`, `ReorderSchema`, `SettingsSchema`) and byte-length guards (`MAX_PAGEDATA_BYTES` = 512 KB, `MAX_ITEM_JSON_BYTES` = 256 KB).
  - Created `backend/src/lib/sanitize.ts` with `sanitizeRichHtml` using `sanitize-html` with safe markup whitelist, stripping dangerous scripts, event handlers (`on*`), and `javascript:`/`vbscript:` protocols. Added recursive cleaners `sanitizeItemPayload` and `sanitizePageData`.
  - Replaced legacy regex `<script\b[^<]*` in `backend/src/routes/pages.routes.ts` with `sanitizePageData` and `sanitizeRichHtml`. Verified 0 matches across `backend/src`.
  - Created `backend/src/routes/admin-page-items.routes.ts` mounted at `/api/admin/pages` in `backend/src/app.ts`, enforcing `verifyToken`, `requireAdmin`, and `Cache-Control: no-store` (Invariant I8).
  - Implemented optimistic concurrency locking via Prisma `updateMany` returning HTTP 409 `{ error: 'version_conflict', current }` on stale version, automatic `SlugRedirect` generation with circular loop prevention, contiguous 0..n-1 reordering for items and categories, and CMS write hook integration.
  - Updated `postman/collections/campusmart-pages-api.json` with 12 admin requests under 'Admin Items & Categories'.
  - Added resilient retry wrapper `withRetry` in `backend/tests/helpers/db.ts` for remote PostgreSQL connection stability.
- Tests added:
  - `backend/tests/admin-items/items-lifecycle.test.ts` (9 tests: CRUD, card split, format=card round-trip, page_not_structured)
  - `backend/tests/admin-items/optimistic-locking.test.ts` (4 tests: stale version 409 with current, concurrent PATCH race where exactly one gets 200 and one 409, DELETE stale version 409, DELETE matching version 204)
  - `backend/tests/admin-items/reorder.test.ts` (4 tests: items reordering, category reordering, contiguous 0..n-1 sortOrder, 400 on duplicate/missing/foreign IDs)
  - `backend/tests/admin-items/slugs-and-redirects.test.ts` (4 tests: duplicate slug 409 on POST and PATCH, `SlugRedirect` creation, public resolution to `{ redirectTo }`, loop elimination on A->B->A)
  - `backend/tests/admin-items/categories.test.ts` (5 tests: CRUD, auto-create on item assignment, rename preserves item links, delete cascades links only)
  - `backend/tests/admin-items/validation-and-sanitizer.test.ts` (6 tests: oversize payload 400, settings passthrough with known type check, sanitizer tag preservation, 200 fast-check property runs)
  - `backend/tests/admin-items/auth-guard.test.ts` (20 tests: 401 unauthenticated and 403 non-admin on all 10 admin routes, Invariant I8)
  - `backend/tests/admin-items/cms-write-hook.test.ts` (7 tests: `CmsState.version` increment on every item and category write)
- Test results:
  - `npm run test --prefix backend`: 193 passed / 193 total (23 test files)
  - `npm run build --prefix backend`: 0 compilation errors
  - Script regex search (`<script\b[^<]*`): 0 matches in `backend/src`
- Metrics:
  - New test suites: 8 test files, 59 new tests
  - Invariant I8: 10/10 admin endpoints reject unauthenticated (401) and non-admin (403)
  - Optimistic locking: 409 version conflict verified under concurrent execution
  - Script tag injection: 200 fast-check property test iterations verified safe
- Deviations from plan and why:
  - Added `withRetry` helper to `resetContentTables` in `backend/tests/helpers/db.ts` to absorb intermittent Neon remote TCP connection drops during high-frequency truncate operations.
- Found, not fixed:
  - None.

---

## T7 – Backend Consumers Read from Tables – DONE
- Date: 2026-11-21
- Commit: `27f4310` (T7: Backend consumers read from tables)
- Review Status: APPROVED (commits 8de212e..27f4310, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (read-only queries and tests strictly against isolated test DB DATABASE_URL_TEST).
- Files changed (summary):
  - Updated `backend/src/services/solutions-finder/types/solutions-card.types.ts`: added `cmsVersion?: number` to `DataWatermarks`.
  - Updated `backend/src/services/solutions-finder/solutions-repository.interface.ts`: added `fetchCmsVersion?(): Promise<number>`.
  - Updated `backend/src/services/solutions-finder/in-memory-solutions.repository.ts`: implemented `cmsVersion` tracking, `setCmsVersion()`, `fetchCmsVersion()`, and updated `fetchDataWatermarks()`.
  - Updated `backend/src/services/solutions-finder/prisma-solutions.repository.ts`:
    - Updated `fetchActiveCards()` to query structured pages with `categories` and `items` (with join categories) and synthesize legacy blob inputs via `buildLegacyPageData`.
    - Added `withDbRetry` helper around all remote PostgreSQL queries for network resilience.
    - Updated `fetchDataWatermarks()` to include `cmsVersion` from `CmsState` singleton `id: 1`.
    - Added `fetchCmsVersion()`.
  - Updated `backend/src/services/solutions-finder/solutions-index.service.ts`:
    - Added `lastCmsVersion`, `memoizedCmsVersion`, and customizable clock.
    - Added `cmsVersion` validation and advancement to `isValidWatermarks` and `hasWatermarkAdvanced`.
    - Implemented `ensureFresh()` with 5000 ms in-process memoization behind the rebuild mutex lock.
    - Added `getLastCmsVersion()`, `setClock()`, `resetFreshnessMemo()`.
  - Updated `backend/src/routes/solutions-finder.routes.ts`:
    - Added `await solutionsIndexService.ensureFresh()` at start of search handlers (`handleSolutionsSearch`).
  - Updated `backend/src/services/solutions-finder/intent-scorer.service.ts`:
    - Optimized auto-rebuild check to inspect `!this.indexService.isReady()` rather than empty card array, preventing redundant rebuilds on empty datasets.
  - Updated `backend/src/services/solutions-finder/page-solutions-extractor.ts`:
    - Enhanced `resolvePageCategory` to inspect `rawCard.categories` array in addition to `rawCard.category`, guaranteeing 100% output parity between pre-migration JSON blobs and post-migration relational rows.
  - Modernized `backend/src/routes/pages.routes.ts`:
    - Rewrote `/hub/catalog` to fetch items and categories from `PageItem` and `PageCategory` for structured hubs (`labs`, `sports-infra`, `tech-infra`, `libraries`), and format item IDs as `pi-${item.id}` (while preserving `prod-${id}` for furniture).
    - Removed hardcoded `HUB_METADATA.defaultCategories` lists (verified 0 matches for `defaultCategories: \[`).
  - Updated `backend/src/services/page-content/constants.ts`:
    - Added `LEGACY_HUB_DEFAULT_CATEGORIES` for fallback hub category mapping.
  - Verified debounced index rebuild in `backend/src/services/page-content/after-content-write.ts` (2000 ms module timer using `setTimeout` with `unref()`).
  - Updated `backend/tests/helpers/auth.ts`: wrapped `prisma.user.upsert` with `withRetry` for remote Neon connection resilience.
  - Created test suite `backend/tests/solutions/extractor-golden.test.ts` (2 tests: unmigrated snapshot freeze + post-migration 100% parity verification against `backend/tests/solutions/__snapshots__/extractor-golden.json`).
  - Created test suite `backend/tests/pages/hub-catalog.test.ts` (2 tests: verified full catalog and hub=labs match T2 contract snapshots).
  - Created test suite `backend/tests/solutions/debounce.test.ts` (2 tests: fake-timers debouncing 5 writes in 1s into 1 rebuild after 2000ms, and cancelPendingSolutionsRebuild).
  - Created test suite `backend/tests/solutions/ensure-fresh.test.ts` (2 tests: 5s memoized serving without rebuild, and rebuild trigger on SQL version bump after memo window expires).
- Tests added:
  - `backend/tests/solutions/extractor-golden.test.ts` (2 tests)
  - `backend/tests/pages/hub-catalog.test.ts` (2 tests)
  - `backend/tests/solutions/debounce.test.ts` (2 tests)
  - `backend/tests/solutions/ensure-fresh.test.ts` (2 tests)
- Test results:
  - `npm run test --prefix backend`: 201 passed / 201 total (27 test files, 100% green)
  - `npm run build --prefix backend`: 0 compilation errors
  - Search for `defaultCategories: \[` in `backend/src/routes/pages.routes.ts`: 0 matches
- Metrics:
  - New test suites: 4 test files, 8 new tests
  - Extractor golden snapshot parity: 100% deep equality across all 24 page fixtures
  - Solutions Finder sample queries: "stem lab" (5 solutions, conf 0.85), "synthetic turf" (3 solutions, conf 0.85), "digital library" (3 solutions, conf 0.85)
- Deviations from plan and why:
  - Added check for `rawCard.categories` in `PageSolutionsExtractor.resolvePageCategory` so that cards reconstructed from relational tables where categories are normalized into arrays retain the exact same category resolution and deliverables as pre-migration fixtures.
  - Wrapped remote Neon database queries in `PrismaSolutionsRepository` and `tests/helpers/auth.ts` with retry wrappers (`withDbRetry`) to handle transient TCP drops on remote Neon Postgres connections.
- Found, not fixed:
  - None.

---

## T8 – HTTP performance: compression, caching, ETag, resolve endpoint – DONE
- Date: 2026-11-21
- Commit: `78854947be1bd8eff9e9700d37db89ae574a361d` (T8: HTTP performance: compression, caching, ETag, resolve endpoint)
- Review Status: APPROVED (commits 1ecbbe9..7885494, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (read-only dev DB queries; tests run strictly against isolated test DB DATABASE_URL_TEST).
- Files changed (summary):
  - Updated `backend/package.json` and `backend/package-lock.json`: installed `compression`, `lru-cache`, `@types/compression`.
  - Updated `backend/src/app.ts`: added `app.use(compression())` after `helmet`.
  - Created `backend/src/services/cms-cache.ts`: multi-process cache manager (`cmsLruCache`, max 500 entries) synchronized via database `CmsState.version` (id: 1) memoized for 1000 ms; deterministic weak ETag `W/"cms-<version>-<sha1(originalUrl).slice(0, 12)>"`; `publicCmsCache()` middleware returning `Cache-Control: public, no-cache`, stripping `Pragma`/`Expires`, returning HTTP 304 on matching `If-None-Match`, and bypassing LRU for requests with `Authorization` headers.
  - Updated `backend/src/services/page-content/after-content-write.ts`: added `await bumpCmsVersion(tx)` to content mutation lifecycle hook.
  - Updated `backend/src/services/page-content/page-content.service.ts`: implemented `resolvePath(pathStr, options)` resolving single-segment and two-segment dynamic paths with aliases, redirects, prefixes, and hub item resolution in <= 3 database queries.
  - Updated `backend/src/routes/content.routes.ts`: applied `publicCmsCache()` to `GET /api/content`.
  - Updated `backend/src/routes/pages.routes.ts`: mounted `GET /resolve` before `/:idOrSlug`, applied `publicCmsCache()` to `/published`, `/hub/catalog`, `/resolve`, `/:slug/items/:itemSlug`, and `/:idOrSlug`, and removed legacy hardcoded `Cache-Control: public, max-age=60...`.
  - Non-CMS routes (`/api/auth/*`, `/api/admin/*`, `/api/wishlist`, `/api/orders`, `/api/products`) strictly preserve `Cache-Control: no-store`.
  - Created test suite `backend/tests/http/compression.test.ts` (1 test: gzip response compression).
  - Created test suite `backend/tests/http/cache.test.ts` (6 tests: 200 with ETag and `public, no-cache`, 304 on `If-None-Match`, mutation invalidation, multi-process raw SQL version bump + clock advance, auth LRU bypass, non-CMS `no-store`).
  - Created test suite `backend/tests/pages/resolve.test.ts` (13 tests: single-segment rules, two-segment rules, redirects, draft access, and <= 3 query budget assertion).
- Tests added:
  - `backend/tests/http/compression.test.ts` (1 test)
  - `backend/tests/http/cache.test.ts` (6 tests)
  - `backend/tests/pages/resolve.test.ts` (13 tests)
- Test results:
  - `npm run test --prefix backend`: 221 passed / 221 total (30 test files, 100% green)
  - `npm run build --prefix backend`: 0 compilation errors
- Metrics:
  - New test suites: 3 test files, 20 new tests
  - Route resolution query budget: verified <= 3 database queries for both 1-segment and 2-segment routes
  - Cache revalidation: HTTP 304 with 0 database queries beyond version check
- Deviations from plan and why:
  - None.
- Found, not fixed:
  - None.

---

## T9 – TanStack Query behind the existing hooks – DONE
- Date: 2026-11-21
- Commit: `f70dbe40879fbeb710a12258d5a2dd2d353fb070` (T9: TanStack Query behind the existing hooks)
- Review Status: APPROVED (commits bca11bb..f70dbe4, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (read-only dev DB queries; backend tests isolated to DATABASE_URL_TEST).
- Files changed (summary):
  - Updated `package.json` and `package-lock.json`: added root scripts `"test": "npm run test:backend && npm run test:frontend"` and `"test:frontend": "npm run test --prefix frontend"`.
  - Updated `frontend/package.json`: pinned exact runtime dependency `@tanstack/react-query: "5.67.2"`; installed `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw`.
  - Updated `frontend/tsconfig.app.json`: added `"types": ["vite/client", "@testing-library/jest-dom"]`.
  - Created `frontend/vitest.config.ts`: configured Vitest with JSDOM, setupFiles, and `@` path alias.
  - Created `frontend/src/test/setup.ts`, `frontend/src/test/msw/server.ts`, `frontend/src/test/msw/handlers.ts`: MSW v2 mock server with automatic lifecycle hooks.
  - Created `frontend/src/lib/query-client.ts`: singleton `QueryClient` with `staleTime: 60_000`, `gcTime: 600_000`, `refetchOnWindowFocus: false`, `retry: 1`.
  - Created `frontend/src/lib/cms-channel.ts`: centralized broadcast channel & invalidation dispatcher/subscriber.
  - Created `frontend/src/api/cms.ts`: fetchers `fetchPageLegacy`, `fetchHub`, `fetchHubItem`, `fetchResolve`.
  - Updated `frontend/src/App.tsx`: wrapped `<QueryClientProvider client={queryClient}>` outside `<SiteContentProvider>`.
  - Updated `frontend/src/hooks/usePageData.ts`: refactored to `useQuery(['page', slug])`, seeds `['pageRecord', slug]`, preserves generic `<T = Record<string, any>>` for 100% backward compatibility, returns `{ data, loading }` with frozen `EMPTY` object.
  - Created `frontend/src/hooks/useHub.ts`, `frontend/src/hooks/useHubItem.ts`, `frontend/src/hooks/useResolvePath.ts`: query-based implementations with instant cache seeding on path resolve.
  - Updated `frontend/src/contexts/SiteContentContext.tsx`: `useQuery(['siteContent'])`, memoized value, listens to CMS invalidation.
  - Updated `frontend/src/contexts/WishlistContext.tsx`: handles storage/auth events cleanly.
  - Updated `frontend/src/components/layout/topbar.tsx`: removed redundant mount-time wishlist fetch.
  - Updated `frontend/src/lib/auth-session.ts`: clean error handling in session clearing.
  - Updated `docs/plans/baseline/requests.md`: logged request reduction metrics.
  - Created test suites:
    - `frontend/src/lib/cms-channel.test.ts` (3 tests)
    - `frontend/src/hooks/useResolvePath.test.tsx` (2 tests)
    - `frontend/src/contexts/SiteContentContext.test.tsx` (3 tests)
    - `frontend/src/hooks/usePageData.test.tsx` (5 tests)
  - Created verification script `tests/e2e/verify-revisit.mjs`.
  - Created task report `docs/plans/sdd/task-9-report.md`.
- Tests added:
  - 4 frontend test files, 13 new unit/integration tests (100% passing).
- Test results:
  - `npm run test:frontend`: 13 passed / 13 total (4 test files, 100% green).
  - `npm run typecheck:frontend`: 0 errors.
  - `npm run build:frontend`: Vite production build passed in 25.74s with 0 errors.
  - ESLint: 0 errors, 0 warnings across all modified and created files.
- Metrics:
  - Cold load API requests on Home `/`: reduced from 3 to 2 (-33%).
  - Revisit to `/labs` within 60s: 0 network requests to `/api/pages/labs` (100% cached).
- Deviations from plan and why:
  - In `usePageData.ts` and `SiteContentContext.tsx`, retained `Record<string, any>` as default type parameter to prevent breaking dozens of existing page components that access dynamic/untyped CMS properties.
- Found, not fixed:
  - None.










---

## T10 – Detail pages and dynamic routing use the item and resolve endpoints – DONE
- Date: 2026-11-21
- Commit: `0020eb6` (T10: Detail pages and dynamic routing use the item and resolve endpoints)
- Review Status: APPROVED (commits 9df8177..c8f3670, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (read-only dev DB queries; backend tests isolated to DATABASE_URL_TEST).
- Files changed (summary):
  - Created `frontend/src/components/cms/article-view-model.ts`: pure extraction of `buildArticleViewModel(card, hub, options)` supporting category resolution, body derivation with lead paragraph formatting, deliverables HTML generation, cta overrides, modern `hub.cta` nested fallbacks, admin edit links, and backLinks.
  - Created `frontend/src/lib/item-to-card.ts`: pure `itemToCard(item, options)` mapper mirroring backend `buildItem` (data, detail, title derived state, slug, summary -> description, imageUrl -> image, href, badge, categories).
  - Created `backend/tests/fixtures/generate-item-fixtures.test.ts` & generated `frontend/src/test/fixtures/items/items.json`: 46 fixtures covering all structured pages and edge cases.
  - Updated `frontend/src/components/cms/ServiceDetailPage.tsx`: switched to `useHubItem(categorySlug, itemSlug)`, handles `redirectTo`, maps item with `itemToCard(item, { includeDetail: true })`, falls back to `hub.cta` CTA defaults, preserves AI Solutions Finder context notice.
  - Updated `frontend/src/components/cms/UniversalArticleDetail.tsx`: replaced sequential `api.get` probes and `usePageData` with `useResolvePath('/' + hubSlug + '/' + itemSlug)`, handles `redirect` (`<Navigate>`), `page` (`GenericPageRenderer`), and `item` (`useHubItem` + `buildArticleViewModel`).
  - Updated `frontend/src/App.tsx`: replaced 4-step probe fallback cascade in `DynamicPageRoute` with `useResolvePath('/' + slug)`; fixed prefixed-slug bug by passing resolved `result.slug` to templates (`SolutionPageRenderer`, `ServicePageRenderer`, etc.); handled redirects and not-found.
  - Updated `frontend/src/components/cms/DynamicChildPageRoute.tsx`: switched to `useResolvePath('/' + hubSlug + '/' + itemSlug)`, dispatches `ServiceDetailPage` or `UniversalArticleDetail` based on `hubTemplate`.
  - Updated `frontend/src/pages/partnership-model-detail.tsx` & `frontend/src/pages/campus-design-execution-detail.tsx`: adapted from whole-hub `usePageData` to `useHubItem`.
  - Updated `frontend/src/api/cms.ts`: caught 404 in `fetchHubItem` returning null without throwing, preventing unnecessary retry network requests.
  - Updated `frontend/src/test/setup.ts`: added standard `window.matchMedia` mock for jsdom environment.
  - Updated `backend/src/routes/pages.routes.ts`: increased `$transaction` timeout to 30s to prevent Neon internet round-trip timeouts during multi-entity batch updates.
  - Updated `docs/plans/baseline/requests.md`: recorded re-measured cold load request counts.
  - Created test suites:
    - `frontend/src/components/cms/article-view-model.test.ts` (12 tests)
    - `frontend/src/lib/item-to-card.test.ts` (9 tests)
    - `frontend/src/components/cms/ServiceDetailPage.test.tsx` (4 tests)
    - `frontend/src/components/cms/UniversalArticleDetail.test.tsx` (4 tests)
    - `frontend/src/components/cms/DynamicPageRoute.test.tsx` (4 tests)
  - Created task report `docs/plans/sdd/task-10-report.md`.
- Tests added:
  - 5 frontend test files, 33 new unit/integration tests (total 46 tests across 9 files in frontend, 100% passing).
- Test results:
  - `npm run test --prefix frontend`: 46 passed / 46 total (9 test files, 100% green).
  - `npm run typecheck:frontend`: 0 errors.
  - `npm run build:frontend`: Vite production build passed in 25.67s with 0 errors.
  - `npm run build:backend`: TypeScript & Prisma build passed with 0 errors.
  - Playwright smoke test (`npx playwright test tests/e2e/smoke.spec.ts`): 206 passed / 206 executed (3 known baseline failures skipped), 0 regressions.
- Metrics:
  - Cold load `/labs/composite-skill-lab` (Item Detail): whole-hub fetch eliminated; makes exactly 1 `/api/pages*` call + `/api/content`.
  - Cold load `/50-global-resources-for-school-excellence` (Prefixed Dynamic Page): 4-probe waterfall eliminated; makes exactly 1 `/api/pages*` resolve call + `/api/content`.
- Deviations from plan and why:
  - Increased Prisma `$transaction` timeout from default 5000ms to 30000ms in `pages.routes.ts` to accommodate multi-entity updates over Neon network latency on Windows local dev.
  - Added standard `window.matchMedia` stub to `frontend/src/test/setup.ts` to support GSAP ScrollTrigger in headless JSDOM test environments.
- Found, not fixed:
  - None.

---

## T11 – Hub pages use the v2 summary shape – DONE
- Date: 2026-11-22
- Commit: `f9db3df` (T11: Hub pages use the v2 summary shape)
- Review Status: APPROVED (commits d6c1b06..f9db3df, review clean, 0 critical, 0 important)
- Backup used (if DB touched): N/A (read-only dev DB queries; backend tests strictly isolated to DATABASE_URL_TEST).
- Files changed (summary):
  - Created `frontend/src/hooks/useHubLegacy.ts`: adapter hook mapping v2 summary payload (`useHub(slug)`) into legacy pageData shape with `itemToCard(item, { includeDetail: false })`, single-object `featured`, and memoized reference stability.
  - Defined `HUB_NEEDS_DETAIL` in `backend/src/services/page-content/constants.ts` (currently empty `new Set<string>([])` since all hub listings consume summary cards and detail views fetch via `useHubItem`).
  - Updated `backend/src/services/page-content/page-content.service.ts` to include `HUB_NEEDS_DETAIL`.
  - Updated `backend/src/routes/admin-page-items.routes.ts` with `{ maxWait: 10000, timeout: 20000 }` on Prisma transactions to prevent timeouts over remote Neon connections.
  - Created `backend/tests/fixtures/generate-hub-fixtures.test.ts` & generated `frontend/src/test/fixtures/hubs/hubs.json` (24 fixtures).
  - Migrated 22 components/pages from `usePageData` to `useHubLegacy`:
    - `frontend/src/components/cms/SolutionPageRenderer.tsx` (covers `labs`, `libraries`, `sports-infra`, `tech-infra`)
    - `frontend/src/components/cms/ServicePageRenderer.tsx` (covers `campus-design-execution`, `sports-design-execution`, `campus-furniture-design`, `ar-vr-experiences`, `ai-digital-design-supply`, `campus-design`)
    - `frontend/src/pages/ai-ml.tsx`
    - `frontend/src/pages/ai-stations.tsx`
    - `frontend/src/pages/campus-master-planning.tsx`
    - `frontend/src/pages/collaboration-spaces.tsx`
    - `frontend/src/pages/new-environments.tsx`
    - `frontend/src/pages/campus-automation.tsx`
    - `frontend/src/pages/digital-transformation.tsx`
    - `frontend/src/pages/smart-classrooms.tsx`
    - `frontend/src/pages/science-tech-labs.tsx`
    - `frontend/src/pages/assessment-system.tsx`
    - `frontend/src/pages/lms.tsx`
    - `frontend/src/pages/catalogues.tsx`
    - `frontend/src/pages/faq.tsx`
    - `frontend/src/pages/job-openings.tsx`
    - `frontend/src/pages/colleges-universities-for-sale.tsx`
    - `frontend/src/pages/partner-with-colleges.tsx`
    - `frontend/src/pages/furniture-design-supply.tsx`
    - `frontend/src/pages/library-management.tsx`
    - `frontend/src/pages/solutions.tsx`
    - `frontend/src/pages/services.tsx`
  - Kept document pages on `usePageData`: `about-us`, `contact-us`, `furniture`, `blog`, `classifieds`, `partnership`, `product-catalog`.
  - Created test suites:
    - `frontend/src/hooks/useHubLegacy.test.tsx` (12 tests)
    - `frontend/src/components/cms/SolutionPageRenderer.test.tsx` (3 tests)
    - `frontend/src/pages/campus-master-planning.test.tsx` (2 tests)
    - `frontend/src/pages/faq.test.tsx` (2 tests)
    - `frontend/src/pages/job-openings.test.tsx` (1 test)
    - `frontend/src/pages/colleges-universities-for-sale.test.tsx` (1 test)
    - `frontend/src/pages/catalogues.test.tsx` (1 test)
    - `backend/tests/page-content/payload-comparison.test.ts` (1 test)
  - Created task report `docs/plans/sdd/task-11-report.md`.
- Checklist Table:
  | Page / Component | Switched / Kept | Reason |
  | :--- | :--- | :--- |
  | `SolutionPageRenderer.tsx` (`labs`, `libraries`, `sports-infra`, `tech-infra`) | Switched | No detail keys used on hub view; cards use summary, tags, badge. |
  | `ServicePageRenderer.tsx` (`campus-design-execution`, `sports-design-execution`, etc.) | Switched | No detail keys used on hub view; tabbed cards use summary, tags. |
  | `ai-ml.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `ai-stations.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `campus-master-planning.tsx` | Switched | Step hub uses cards summary and href links; no detail keys. |
  | `collaboration-spaces.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `new-environments.tsx` | Switched | Renders cards summary, image, title; no detail keys. |
  | `campus-automation.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `digital-transformation.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `smart-classrooms.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `science-tech-labs.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `assessment-system.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `lms.tsx` | Switched | Renders cards summary, image, title, badge; no detail keys. |
  | `catalogues.tsx` | Switched | Renders catalogue cards and case studies summaries; no detail keys. |
  | `faq.tsx` | Switched | Renders faqs collection (question, answer in data); no detail keys. |
  | `job-openings.tsx` | Switched | Renders openings collection (role, department, location); no detail keys. |
  | `colleges-universities-for-sale.tsx` | Switched | Renders cards (location, askingPrice in data); no detail keys. |
  | `partner-with-colleges.tsx` | Switched | Renders partner cards summary, badge; no detail keys. |
  | `furniture-design-supply.tsx` | Switched | Renders cards summary, image, title; no detail keys. |
  | `library-management.tsx` | Switched | Renders cards summary, image, title; no detail keys. |
  | `solutions.tsx` | Switched | Renders solution cards summary, title; no detail keys. |
  | `services.tsx` | Switched | Renders service cards summary, title; no detail keys. |
  | `about-us.tsx` | Kept | Document page (classified as document in T4 report). |
  | `contact-us.tsx` | Kept | Document page (classified as document in T4 report). |
  | `furniture.tsx` | Kept | Document page (classified as document in T4 report). |
  | `blog.tsx` | Kept | Document page (classified as document in T4 report). |
  | `classifieds.tsx` | Kept | Document page (classified as document in T4 report). |
  | `partnership.tsx` | Kept | Document page (classified as document in T4 report). |
  | `product-catalog.tsx` | Kept | Document page (classified as document in T4 report). |
- Tests added:
  - 7 frontend test files (22 tests), 2 backend test files (2 tests).
- Test results:
  - `npm test --prefix frontend`: 16 passed / 16 total files, 68 passed / 68 total tests (100% green).
  - `npm test --prefix backend`: `hub-v2.test.ts` (7 passed), `items-lifecycle.test.ts` (9 passed), `payload-comparison.test.ts` (1 passed) on DATABASE_URL_TEST.
  - `npm run typecheck:frontend`: 0 errors.
  - `npm run build:frontend`: Vite production build passed in 28.16s with 0 errors.
  - Playwright smoke test (`npx playwright test tests/e2e/smoke.spec.ts`): 206 passed / 206 executed (3 known baseline failures skipped), 0 regressions.
- Metrics:
  - Payload size comparison:
    - `labs`: 5,789 B (legacy) -> 5,619 B (v2), saving 170 B (-2.9%).
    - `campus-design-execution`: 278 B (legacy) -> 247 B (v2), saving 31 B (-11.2%).
    - `campus-master-planning`: 273 B (legacy) -> 242 B (v2), saving 31 B (-11.4%).
- Deviations from plan and why:
  - None.
- Found, not fixed:
  - None.

---

## T12 – Admin per-item editing UI and strict structured writes – DONE
- Date: 2026-11-22
- Commit: `7e6658c` (T12: Admin per-item editing UI and strict structured writes)
- Review Status: APPROVED (commits b7e53f7..7e6658c, review clean, 0 critical, 0 important)
- Backup used: N/A (read-only dev DB; tests on isolated Neon branch DATABASE_URL_TEST)
- Audit of `UnifiedPageEditor.tsx`:
  - Primary Component: `UnifiedPageEditor` (lines 554–5552)
  - `cards`: Interactive Cards section (lines 4388–4947), card headers & reorder (lines 4514–4578), card fields editor (lines 4580–4941), expertise cards (lines 4081–4257).
  - `section2Cards`: Impact cards on `digital-transformation` (lines 4033–4078); handlers (lines 1210–1222).
  - `moreCards`: Sample data merge and sanitization (lines 146, 792, 1059–1086, 1520–1521).
  - `featured`: Laboratory featured (lines 3814–3821), Classifieds featured (lines 3878–3902), handler (lines 1157–1162).
  - `faqs`: FaqEditorSection (lines 3936–3940); synced in `save()` (lines 1478–1482).
  - `openings`: JobOpeningsEditorSection (lines 3907–3933); `onSyncOpenings` PUT /pages/:id (lines 3914–3918).
  - `caseStudies`: CaseStudiesEditorSection (lines 5402–5429); `onSyncCaseStudies` PUT /pages/:id (lines 5410–5414).
  - `categories`: CardCategoriesField (lines 4430–4499, 4921–4929); Classifieds categories (lines 3855–3876).
  - `save()` handler: Lines 1461–1561 (PUT /pages/:id with serialized pageData).
- Files changed (summary):
  - Created `frontend/src/admin/api/pageItems.ts`: typed admin API client for items and category endpoints.
  - Created `frontend/src/admin/components/items/CardFieldsEditor.tsx`: extracted reusable card fields editor supporting title, slug, href, summary, custom detail, before/after images, CTA strip, cover image, category pills, and PDF downloads.
  - Created `frontend/src/admin/components/items/ConflictDialog.tsx`: visual diff dialog for HTTP 409 conflict resolution ("Reload Latest", "Yes, Confirm Overwrite").
  - Created `frontend/src/admin/components/items/ItemEditorDrawer.tsx`: slide-over drawer with dirty tracking, version passing, and conflict handling.
  - Created `frontend/src/admin/components/items/CategoryManager.tsx`: TanStack Query CRUD + reorder manager for page categories.
  - Created `frontend/src/admin/components/items/ItemsManager.tsx`: per-item list view with status toggle, up/down reordering, delete confirmation, drawer editing, and deep linking.
  - Updated `frontend/src/admin/components/UnifiedPageEditor.tsx`: detects structured pages, embeds `CategoryManager` and `ItemsManager`, strips collection keys from whole-page save, passes `version`, handles 409 page conflicts, and wires structured job-openings/faqs/case-studies.
  - Updated `frontend/src/admin/pages/PagesManager.tsx`: parses `?edit=<slug>&card=<cardSlug>` and forwards `targetCardSlug` to `UnifiedPageEditor`.
  - Updated `frontend/src/admin/pages/Categories.tsx`: synchronizes categories via category endpoints and updates item categories via items API on structured pages.
  - Updated `frontend/src/admin/pages/CollegesManager.tsx`: reads cards and categories via items and category APIs, and executes create, update, delete, duplicate, reorder, and toggle-premium directly through items/category APIs.
  - Updated `backend/src/routes/pages.routes.ts`: enabled `CMS_STRICT_STRUCTURED_WRITES` (default true) rejecting collection keys in `POST /` and `PUT /:id` with 400 `collections_not_allowed`.
  - Updated `backend/src/services/page-content/page-content.service.ts`: populated `DETAIL_DROPPED` with non-hub-needs-detail slugs and drops detail for public requests while retaining for admin requests.
  - Created `backend/tests/admin-items/strict-mode.test.ts`: 6 tests verifying rejection of collections in strict mode, settings-only save, document page save, rollback env flag, and public vs admin detail dropping.
  - Created frontend test suites:
    - `frontend/src/admin/components/items/__tests__/ItemsManager.test.tsx` (5 tests)
    - `frontend/src/admin/components/items/__tests__/ItemEditorDrawer.test.tsx` (3 tests)
    - `frontend/src/admin/components/__tests__/UnifiedPageEditor.save.test.tsx` (2 tests)
    - `frontend/src/admin/pages/__tests__/CollegesManager.test.tsx` (2 tests)
  - Created Playwright E2E test `tests/e2e/admin-items.spec.ts`.
  - Created `docs/plans/sdd/task-12-report.md`.
- Tests added:
  - 4 frontend test files (12 tests), 1 backend test file (6 tests), 1 E2E Playwright test.
- Test results:
  - `npm test --prefix frontend`: 20 passed / 20 total files, 80 passed / 80 total tests (100% green).
  - `backend/tests/admin-items/strict-mode.test.ts`: 6 passed / 6 total tests on DATABASE_URL_TEST.
  - `backend/tests/page-content/legacy-write-adapter.test.ts`: 4 passed / 4 total tests on DATABASE_URL_TEST.
  - `npm run typecheck --prefix frontend`: 0 errors.
  - `tsc --noEmit` (backend): 0 errors.
  - `npm run build --prefix frontend`: Vite production build passed in 28.62s with 0 errors.
  - `npm run build --prefix backend`: TypeScript & Prisma build passed with 0 errors.
- Deviations from plan and why:
  - Fixed `UnifiedPageEditor.tsx` `save()` click handler where synthetic `MouseEvent` was passed as `versionOverride`, causing circular structure serialization failure. Explicitly check `typeof versionOverride === 'number'` and pass `onClick={() => save()}`.
- Found, not fixed:
  - None.

---

## T13 – Revisions and restore – DONE
- Date: 2026-11-22
- Commit: `bbcdde9` (T13: Revisions and restore)
- Review Status: APPROVED (commits 1aaa75b..bbcdde9, review clean, 0 critical, 0 important)
- Backup used: N/A (read-only dev DB; tests on isolated Neon branch DATABASE_URL_TEST)
- Files changed (summary):
  - `backend/src/services/page-content/after-content-write.ts`: Added automatic page revision snapshot creation inside `afterContentWrite` whenever `params.pageId` is present. Captures page attributes, settings via `parsePageData`, items with versions, categories, and categories list. Prunes non-`pre-migration` revisions beyond 30 while strictly preserving all `pre-migration` snapshots forever.
  - `backend/src/routes/admin-page-items.routes.ts`:
    - Replaced raw `tx.pageRevision.create` in 8 admin routes with `afterContentWrite(..., tx)` to guarantee atomic revision creation.
    - Implemented `GET /api/admin/pages/:pageId/revisions`: returns list of revisions `{ id, version, reason, authorId, createdAt }` ordered by `createdAt: desc, id: desc`.
    - Implemented `POST /api/admin/pages/:pageId/revisions/:revId/restore`: transactional restore verifying `page.version` (HTTP 409 conflict protection), purging current page items/categories, recreating categories and items with original IDs from snapshot, bumping restored item versions to `maxItemVersion + 1`, reconnecting join records, reseeding Postgres sequences (`pg_get_serial_sequence`), updating page version/settings, and triggering `afterContentWrite({ reason: 'restore' })`.
  - `backend/src/routes/pages.routes.ts`: Updated settings-only update on structured pages to pass `reason: 'settings'` to `afterContentWrite`.
  - `frontend/src/admin/api/pageItems.ts`: Added `PageRevision` interface and client methods `fetchAdminPageRevisions(pageId)` and `restoreAdminPageRevision(pageId, revId, version)`.
  - `frontend/src/admin/components/items/HistoryPanel.tsx`: Created slide-over History drawer displaying revision cards with formatted timestamps, author, reason badges, current version indicator, confirmation modal, conflict error alerts (409), and TanStack Query cache invalidations.
  - `frontend/src/admin/components/UnifiedPageEditor.tsx`: Added History button to editor toolbar, wired `<HistoryPanel />` with state, and added callback to update editor local state on successful restore.
  - `backend/tests/admin-items/revisions.test.ts`: Created backend unit test suite (5 tests covering all CMS write reasons, GET ordering, pruning retaining pre-migration revisions, restore ID/slug retention, sequence health, stale page 409, and stale item 409).
  - `frontend/src/admin/components/__tests__/UnifiedPageEditor.history.test.tsx`: Created frontend component test suite (2 tests covering revision history listing, restore invocation with current page version, cache invalidation, and 409 conflict handling).
  - `docs/plans/sdd/task-13-report.md`: Created detailed task execution report.
- Tests added:
  - `backend/tests/admin-items/revisions.test.ts` (5 tests)
  - `frontend/src/admin/components/__tests__/UnifiedPageEditor.history.test.tsx` (2 tests)
- Test results:
  - `backend/tests/admin-items/revisions.test.ts`: 5 passed / 5 total (100% green)
  - `frontend/src/admin/components/__tests__/UnifiedPageEditor.history.test.tsx`: 2 passed / 2 total (100% green)
  - Full frontend suite (`npm run test:frontend`): 21 passed / 21 files, 82 passed / 82 total tests (100% green)
  - Frontend typecheck (`npm run typecheck:frontend`): 0 errors
  - Backend typecheck (`tsc --noEmit`): 0 errors
  - Frontend Vite production build (`npm run build:frontend`): 0 errors, built cleanly in 5.66s
  - Playwright smoke test (`npx playwright test tests/e2e/smoke.spec.ts`): 206 passed / 206 executed (3 known baseline failures skipped), 0 regressions
- Acceptance Criteria Verified:
  - [x] Backend revisions and restore tests pass 100%.
  - [x] Frontend History panel component tests pass.
  - [x] Revisions pruning verified to never prune `pre-migration` snapshots.
  - [x] Sequence health verified after restore with clean item insertion.
  - [x] Stale page version and stale item version both return 409.
- Deviations from plan and why:
  - Item Version Preservation in Snapshots: In `after-content-write.ts`, added `version: item.version` to `snapshot.items`. This ensures that when restoring a page whose items were completely deleted, `maxItemVersion` accurately accounts for the snapshot's item versions (`maxItemVersion + 1`), guaranteeing that any stale open editor drawer attempting a PATCH receives HTTP 409 `version_conflict`.
- Found, not fixed:
  - None.

---

## T14 – Bundle and rendering performance – DONE
- Date: 2026-11-22
- Commit: d4d1232 (T14: Bundle and rendering performance)
- Review Status: APPROVED (commits f77569d..d4d1232, review clean, 0 critical, 0 important)
- Files changed (summary):
  - `frontend/vite.config.js`: Deleted obsolete configuration.
  - `frontend/vite.config.ts`: Consolidated into single canonical configuration; retained `/api` and `/uploads` proxies, made `kimi-plugin-inspect-react` strictly dev-only, set `build.target: 'es2020'`, and configured Rollup `manualChunks` (`react`, `router`, `query`, `gsap`, `radix`, `icons`).
  - `frontend/build.js`: Configured to use `vite.config.ts` and mode `production`.
  - `frontend/src/components/layout/topbar.tsx`: Replaced static GSAP import with async dynamic import; added `prefers-reduced-motion` check; animated transform/opacity with delay <= 0.05s from visible state.
  - `frontend/src/components/layout/header.tsx`: Replaced static GSAP import with async dynamic import; added `prefers-reduced-motion` check; animated transform/opacity with delay <= 0.05s from visible state.
  - `frontend/src/components/layout/footer.tsx`: Replaced static GSAP import with async dynamic import; added `prefers-reduced-motion` check; animated transform/opacity with delay <= 0.05s from visible state.
  - `frontend/src/components/sections/category-bar.tsx`: Replaced static GSAP import with async dynamic import; added `prefers-reduced-motion` check; animated transform/opacity with delay <= 0.05s from visible state.
  - `frontend/src/App.tsx`: Added `showCategoryBar?: boolean` and `showBreadcrumb?: boolean` props to `Layout`; wrapped `<main>` with `<Suspense fallback={<PageCardGridSkeleton cardCount={6} />}>`. Tested `/` via `Layout`; reverted to standalone `<Home />` per Step 5 criterion due to CSS encapsulation/font differences on `/`.
  - `frontend/index.html`: Optimized Google Fonts link to exactly 12 pairs (`Plus Jakarta Sans: 400,500,600,700`, `Poppins: 400,600,700`, `Open Sans: 400,600`, `Space Grotesk: 500,700`, `Playfair Display: 600`); removed bulky 643 KB `favicon.png` reference in favor of `/favicon.ico` and `/favicon-32x32.png`.
  - `frontend/src/components/ErrorBoundary.tsx`: Removed `reload()` calls from `render()`; debounced chunk reload attempts in `componentDidCatch` (max 1 reload per 30s using `sessionStorage.getItem('cm_chunk_reload_ts')`); hid error details when `!import.meta.env.DEV`.
  - `frontend/scripts/analyze.mjs`: Added script generating `frontend/dist/stats.html` using `rollup-plugin-visualizer`.
  - `frontend/scripts/check-bundle-budget.mjs`: Added automated bundle budget validator checking that entry + modulepreloads sum <= 170.00 KB gzip.
  - `frontend/package.json`: Added `rollup-plugin-visualizer` to devDependencies; added `"analyze"` script; chained `"build": "npm run typecheck && node build.js && node scripts/check-bundle-budget.mjs"`.
  - `frontend/src/components/__tests__/ErrorBoundary.test.tsx`: Created unit tests verifying single chunk reload attempt, no reload in render, and masking of error message in production mode.
  - `frontend/src/components/layout/__tests__/Layout.test.tsx`: Created tests verifying chrome remains mounted while lazy child routes are suspended.
  - `docs/plans/sdd/task-14-report.md`: Created detailed task report.
- Tests added:
  - `frontend/src/components/__tests__/ErrorBoundary.test.tsx` (3 tests)
  - `frontend/src/components/layout/__tests__/Layout.test.tsx` (2 tests)
- Test results:
  - Full frontend Vitest suite (`npm run test:frontend`): 23 test files passed, 87 passed / 87 total (100% green).
  - Frontend typecheck (`npm run typecheck:frontend`): 0 errors.
  - Automated bundle budget check (`node scripts/check-bundle-budget.mjs`): **132.45 KB Gzip** (under 170.00 KB budget, 37.55 KB head room).
  - Playwright smoke test (`npx playwright test tests/e2e/smoke.spec.ts`): 206 passed / 206 executed (3 known baseline failures skipped), 0 regressions.
- Metrics (Performance & Web Vitals via `scripts/measure-lighthouse.mjs`):
  - `/labs` Performance: **100** (was 98)
  - `/labs` Total Blocking Time (TBT): **55 ms** (was 225 ms, -75.6%)
  - `/labs` First Contentful Paint (FCP): **584 ms** (was 1,008 ms, -42.1%)
  - `/` Total Blocking Time (TBT): **105 ms** (was 281 ms, -62.6%)
  - `/` Largest Contentful Paint (LCP): **872 ms** (was 1,096 ms, -20.4%)
  - `/` First Contentful Paint (FCP): **872 ms** (was 1,096 ms, -20.4%)
  - GSAP excluded from critical path: **-45.13 KB gzip deferred** to async chunk.
- Acceptance Criteria Verified:
  - [x] Only `frontend/vite.config.ts` exists. `kimi-plugin-inspect-react` does not appear in production `dist`.
  - [x] Gzip entry + modulepreloads sum meets budget (132.45 KB <= 170 KB).
  - [x] ErrorBoundary and Layout component tests pass.
  - [x] Playwright smoke test suite passes without regression (206/206).
- Deviations from plan and why:
  - Step 5 Home chrome: Visual snapshot on `/` differed when routed inside `Layout` due to root container font inheritance and custom CSS variables in `home.tsx`. Following the explicit requirement in brief Step 5 ("Only keep this change if the `/` visual test passes. Otherwise revert this step and document why in log"), `/` continues to route directly to `<Home />`.
- Found, not fixed:
  - None.




