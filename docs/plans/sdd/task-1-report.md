# SDD Task 1 Report: Backend Test Harness and Clean Migration Baseline

- **Task:** T1 – Backend Test Harness and Clean Migration Baseline
- **Date:** 2026-11-21
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `21268a73fe1c107bfbaad8a4e8d3568d407ff29e`
- **Status:** DONE

---

## 1. Executive Summary
Task T1 established an isolated, automated Vitest backend test harness with a 3-point database safety guard preventing test runs against the development database. The Express backend was cleanly split into `app.ts` (application definition and middleware routing) and `server.ts` (listener and background job initialization), preserving compatibility through `index.ts`. Historical MySQL migrations were archived, and a pure PostgreSQL baseline migration was generated and verified against both development and isolated test databases with zero schema drift.

---

## 2. Detailed Execution Steps & Actions Taken

### Step 1: Backend Entrypoint Refactoring
- Created `backend/src/app.ts`:
  - Extracted Express application setup, security middleware (`helmet`), CORS configuration, rate limiters, static uploads serving, `/health` and `/shop` routes, and all API route mounts.
  - Exported `app`, `authLimiter`, and `otpLimiter`. Removed server listening and background indexing logic.
- Created `backend/src/server.ts`:
  - Imported `app` and `solutionsIndexService`.
  - Started the HTTP server on `PORT` and initialized `solutionsIndexService.rebuild()` followed by nightly sync scheduling without `require.main === module` guards.
- Updated `backend/src/index.ts`:
  - Converted into a one-line forwarder: `import './server';`.
- Updated `backend/package.json`:
  - `"start": "node dist/server.js"`
  - `"dev": "ts-node-dev --respawn --transpile-only src/server.ts"`
- Verified clean compilation with `npm run build --prefix backend`.

### Step 2: Test Dependencies Installation
- Installed devDependencies into `backend/package.json`:
  - `vitest` (v5.1.1)
  - `supertest` (v7.3.2)
  - `@types/supertest` (v7.2.1)
  - `fast-check` (v4.10.3)

### Step 3: Backend Test Harness & Safety Guards
- Created `backend/vitest.config.ts`:
  - Configured `fileParallelism: false`, `testTimeout: 30000`, and `globalSetup: 'tests/global-setup.ts'`.
- Created `backend/tests/global-setup.ts`:
  - Implemented and exported the 3-point safety guard function `assertTestDatabaseSafety(env)`:
    1. Rejects if `DATABASE_URL_TEST` is unset or empty.
    2. Rejects if `TEST_DB_CONFIRM !== 'yes-reset-this-db'`.
    3. Rejects if `DATABASE_URL_TEST` matches `DATABASE_URL` or `DATABASE_URL_UNPOOLED` (normalized by stripping URL parameters).
  - Configured `setup()` to enforce safety, override `process.env.DATABASE_URL` and `process.env.DATABASE_URL_UNPOOLED` with `DATABASE_URL_TEST`, set `NODE_ENV = 'test'`, and run `npx prisma migrate reset --force --skip-seed --skip-generate` synchronously via `child_process.execSync`.
- Created `backend/tests/helpers/db.ts`:
  - `resetContentTables()`: truncates `"page"`, `"sitecontent"`, and `"searchcard"` with `RESTART IDENTITY CASCADE`.
  - `seedPagesFromFixtures()`: helper stub for upcoming T2 fixture tests.
- Created `backend/tests/helpers/auth.ts`:
  - Helper functions `createTestToken` and `createAdminToken` using `JWT_SECRET`.
- Created `backend/tests/helpers/app.ts`:
  - Re-exports `app` from `../../src/app`.
- Updated `package.json` scripts:
  - `backend/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.
  - Root `package.json`: `"test": "npm run test:backend"`, `"test:backend": "npm run test --prefix backend"`, `"test:legacy": "node tests/clean-cards-verification.test.cjs"`.

### Step 4: Schema Drift Verification & Clean PostgreSQL Baseline Migration
- Verified schema drift:
  - Ran `prisma migrate diff` comparing dev database (`DATABASE_URL_UNPOOLED`) to `prisma/schema.prisma`. Output: `-- This is an empty migration.` (0 schema drift).
- Archived historical migrations:
  - Created `backend/prisma/migrations_archive/`.
  - Moved legacy MySQL-era migrations (`20260810110539_init_mysql`, `20260831120000_add_category_page`, `20260831140000_wishlist_design_items`, `20260909120000_add_job_application_resume`) to `backend/prisma/migrations_archive/` using `git mv`.
  - Kept `migration_lock.toml` (`provider = "postgresql"`) in `backend/prisma/migrations/`.
- Generated pure PostgreSQL baseline migration:
  - Created `backend/prisma/migrations/20261121000000_baseline_postgres/migration.sql` (12,308 bytes) from current `schema.prisma`.
- Baselined development database:
  - Verified `backend/prisma/database-export.json` backup exists.
  - Cleared stale migrations and marked `20261121000000_baseline_postgres` as applied via `prisma migrate resolve --applied 20261121000000_baseline_postgres`.
  - Ran `prisma migrate status` against dev DB: confirmed `1 migration found in prisma/migrations` and `Database schema is up to date!`.
- Added note in `backend/prisma/sql/README.md`:
  `Historical one-off scripts. Not part of the migration path. Do not run.`

### Step 5: Test Database Backup Restoration Verification
- Tested backup restore against the isolated test database (`ep-super-paper-bijxp4ij.c-5.ap-southeast-1.aws.neon.tech`):
  - Reset test DB to baseline migration.
  - Restored full dataset from `backend/prisma/database-export.json`.
  - Verified record counts: 130 Pages, 129 Products, 17 Categories, 33 SiteContent rows.
  - Hardened `backend/scripts/restore-database.js` with `dns.setDefaultResultOrder('ipv4first')` and `withRetry` logic to protect against remote transient socket drops during high-volume sequential upserts.
  - Reset test DB back to clean state.

### Step 6: Test Suite Implementation & Execution
- Created `backend/tests/smoke.test.ts`:
  - Test 1: `GET /health` returns 200 with `{ status: 'ok' }` and timestamp.
  - Test 2: `GET /api/pages/faq` returns 200 and resolves `{ slug: 'faq', title: 'Frequently Asked Questions' }`.
  - Test 3-7: Unit tests for `assertTestDatabaseSafety`:
    - Throws when `TEST_DB_CONFIRM` is unset or invalid.
    - Throws when `DATABASE_URL_TEST` is unset or empty.
    - Throws when `DATABASE_URL_TEST` matches `DATABASE_URL` (including parameter stripping).
    - Throws when `DATABASE_URL_TEST` matches `DATABASE_URL_UNPOOLED`.
    - Passes cleanly when distinct and confirmed.

---

## 3. Test Results Summary
- `npm run test --prefix backend`: **7 passed / 7 tests** in 16.7s
- Root `npm test`: **7 passed / 7 tests**
- Root `npm run test:legacy`: **14 passed / 14 tests**
- `npm run build --prefix backend`: TypeScript compiled with **0 errors**.
- `npx prisma migrate status`: Dev database reported **Database schema is up to date!**.

---

## 4. Acceptance Criteria Verification

| Acceptance Criterion | Result | Evidence |
|---|:---:|---|
| `npm run test --prefix backend` passes with 3 or more tests | PASS | 7 tests passed |
| `npx prisma migrate status` against dev reports `Database schema is up to date!` | PASS | Confirmed via `prisma migrate status` |
| On the test database, `npx prisma migrate reset --force --skip-seed` applies only `20261121000000_baseline_postgres` | PASS | Verified in restore check and Vitest global setup |
| `npm run build --prefix backend` compiles cleanly | PASS | TypeScript check and build passed with 0 errors |
| Zero remote push strictly enforced (`git push` is forbidden) | PASS | No git push performed |
| Commit `T1: Backend test harness and clean migration baseline` created | READY | Staged and ready to commit |

---

## 5. Deviations or Concerns
- In `backend/scripts/restore-database.js`, added `dns.setDefaultResultOrder('ipv4first')` and `withRetry` wrapper around database upserts to prevent `P1001`/`P1017` connection interruptions during high-frequency bulk network restoration against cloud-hosted Neon databases.
