# SDD Task Brief: T1 – Backend Test Harness and Clean Migration Baseline

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T1)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-1-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `21268a73fe1c107bfbaad8a4e8d3568d407ff29e`

---

## Objective
Establish an isolated, automated Vitest backend test suite with strict safety guards preventing execution against the development database, split the Express entrypoint into clean `app.ts` and `server.ts` modules, and baseline the Prisma migration history to pure PostgreSQL.

---

## Pre-Configured Test Database Environment
`DATABASE_URL_TEST` and `TEST_DB_CONFIRM=yes-reset-this-db` are ALREADY configured in `backend/.env`.
- Test branch: `test-hybrid-cms` (`br-sparkling-morning-bi11w2j6`)
- Connection string: `postgresql://neondb_owner:npg_7FrswUTbh8qc@ep-super-paper-bijxp4ij.c-5.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require`

---

## Detailed Steps

1. **Split the Backend Entrypoint:**
   - Create `backend/src/app.ts`:
     - Move everything from `backend/src/index.ts` that builds and configures the Express application into `app.ts`.
     - Export `app` (the Express Application) as default and/or named export.
     - Do NOT call `listen` or initialize background services (like solutions indexer) in `app.ts`.
   - Create `backend/src/server.ts`:
     - Import `app` from `./app`.
     - Run `solutionsIndexService.rebuild()` or initialize startup background tasks.
     - Call `app.listen(PORT, ...)` logging the server start.
     - Do NOT use `require.main === module` guards (Phusion Passenger loads via its own runner).
   - In `backend/src/index.ts`:
     - Make it a one-line forwarder: `import './server';` so any existing `node index.js` commands still work.
   - Update `backend/package.json`:
     - `"start": "node dist/server.js"`
     - `"dev": "ts-node-dev --respawn --transpile-only src/server.ts"`

2. **Install Test Dependencies:**
   - In `backend`: install `vitest`, `supertest`, `@types/supertest`, `fast-check` as devDependencies (`npm install -D vitest supertest @types/supertest fast-check --prefix backend`).

3. **Build the Backend Test Harness:**
   - Create `backend/vitest.config.ts`:
     - `fileParallelism: false`
     - `testTimeout: 30000`
     - `globalSetup: 'tests/global-setup.ts'`
   - Create `backend/tests/global-setup.ts`:
     - Implement the 3-point safety guard function:
       1. Throw if `process.env.DATABASE_URL_TEST` is unset or empty.
       2. Throw if `process.env.TEST_DB_CONFIRM !== 'yes-reset-this-db'`.
       3. Throw if `DATABASE_URL_TEST` equals `DATABASE_URL` or `DATABASE_URL_UNPOOLED` (compare after stripping query strings/parameters).
     - Export the guard function so it can be unit-tested.
     - Set `process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_TEST` and `process.env.NODE_ENV = 'test'`.
     - Execute `npx prisma migrate reset --force --skip-seed --skip-generate` synchronously using Node's `child_process.execSync` passing the test env.
   - Create `backend/tests/helpers/db.ts`:
     - `resetContentTables()`:
       Until T3 adds new tables, only truncate existing content tables:
       `TRUNCATE "page", "sitecontent", "searchcard" RESTART IDENTITY CASCADE;` (add `cmsstate` if exists, or check tables first).
     - `seedPagesFromFixtures(names: string[])`: helper stub for T2.
   - Create `backend/tests/helpers/auth.ts`:
     - Creates test tokens using `JWT_SECRET`.
   - Create `backend/tests/helpers/app.ts`:
     - Re-exports `app` from `../../src/app`.
   - Update `package.json` scripts:
     - `backend/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`
     - Root `package.json`: `"test:backend": "npm run test --prefix backend"`, `"test:legacy": "node tests/clean-cards-verification.test.cjs"`. Keep root `"test"` invoking backend tests (and later frontend tests in T9).

4. **Verify Schema Drift & Baseline Prisma Migration:**
   - Run: `npx prisma migrate diff --from-url "$env:DATABASE_URL_UNPOOLED" --to-schema-datamodel prisma/schema.prisma --script`
   - If diff only adds safe indexes or comments, align `schema.prisma`. If it attempts to drop or alter columns with data, stop and record.
   - Archive old migrations:
     - Create `backend/prisma/migrations_archive/`.
     - Move existing `backend/prisma/migrations/2026*` into `backend/prisma/migrations_archive/` using `git mv` (or filesystem move and stage).
     - Keep `migration_lock.toml` in `backend/prisma/migrations/`.
   - Create baseline migration:
     - Generate `backend/prisma/migrations/20261121000000_baseline_postgres/migration.sql` from current `schema.prisma` using:
       `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
       (Write output using Node `fs.writeFileSync` to guarantee UTF-8 encoding).
   - Baseline dev database:
     - First, verify backup exists from T0 (`backend/prisma/database-export.json`).
     - Clear stale migration history in dev database:
       Execute `DELETE FROM "_prisma_migrations";` using `npx prisma db execute --stdin` or prisma client.
     - Mark baseline as applied:
       `npx prisma migrate resolve --applied 20261121000000_baseline_postgres`.
     - Verify `npx prisma migrate status` reports "Database schema is up to date!".
   - Add note in `backend/prisma/sql/README.md`:
     `Historical one-off scripts. Not part of the migration path. Do not run.`

5. **Test Backup Restoration on Test Database:**
   - Verify that `npm run db:restore` can restore `backend/prisma/database-export.json` into the test database (with `DATABASE_URL` pointed at test DB).
   - Afterwards, run `npx prisma migrate reset --force --skip-seed` on the test DB so it remains clean for tests.

6. **Implement Tests (`backend/tests/smoke.test.ts`):**
   - Test 1: `GET /health` returns 200 `{ status: 'ok' }`.
   - Test 2: `GET /api/pages/faq` returns 200 (or resolves properly).
   - Test 3: Unit test the safety guard function from `tests/global-setup.ts`:
     - throws when `TEST_DB_CONFIRM` is unset
     - throws when `DATABASE_URL_TEST` is empty
     - throws when `DATABASE_URL_TEST` matches `DATABASE_URL`
     - passes when inputs are distinct and confirmed

7. **Compile & Verify:**
   - `npm run build --prefix backend` (`npx tsc --noEmit`) must pass with 0 errors.
   - `npm run test --prefix backend` must pass with 3+ tests.

8. **Commit:**
   - Commit with message:
     `T1: Backend test harness and clean migration baseline`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-1-report.md`.

---

## Acceptance Criteria
- [ ] `npm run test --prefix backend` passes with 3 or more tests.
- [ ] `npx prisma migrate status` against dev reports `Database schema is up to date!`.
- [ ] On the test database, `npx prisma migrate reset --force --skip-seed` applies only `20261121000000_baseline_postgres`.
- [ ] `npm run build --prefix backend` compiles cleanly.
- [ ] Zero remote push strictly enforced (`git push` is forbidden).
- [ ] Commit `T1: Backend test harness and clean migration baseline` created.
