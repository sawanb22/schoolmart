# SDD Task 3 Report: Schema: New Tables, JSONB, Versions

- **Task:** T3 – Schema: New Tables, JSONB, Versions
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T3)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `198f0c4068cbccfa7a905be5eb7b37f443b74704`
- **Created Commit:** `cf77156` (T3: Schema: new tables, jsonb, versions)
- **Status:** DONE

---

## 1. Executive Summary
Task T3 evolved the SchoolMart database schema to support the hybrid CMS architecture. Six relational models (`PageItem`, `PageCategory`, `PageItemCategory`, `SlugRedirect`, `PageRevision`, and `CmsState`) were introduced into `schema.prisma`. The legacy `page.pageData` column was safely migrated from raw string to native PostgreSQL `JSONB` using a hand-crafted non-destructive `USING` cast without dropping `pageData`.

A robust preflight check verified that all 130 existing dev database pages with non-null `pageData` parsed as valid JSON objects. The migration was rehearsed against an isolated Neon test database with 100% data retention (130/130 pages) before being applied to the development database following a fresh backup. All backend reads and writes were converted to use native objects and the shared `parsePageData` parser, completely eliminating `pageData:\s*JSON\.stringify` across `backend/src` and `backend/prisma` (0 matches). Public API endpoints were routed through legacy response serialization to guarantee that frontend consumers receiving Page objects continue to receive the expected stringified JSON format.

All 56 backend tests across 7 test suites passed, all 26 characterization contract snapshots remain 100% green without modification, and Playwright smoke tests verified 206/206 executed routes without regression.

---

## 2. Detailed Execution Steps & Actions Taken

### Step 1: Preflight JSON Integrity Check
- Created automated diagnostic tool `backend/scripts/check-pagedata-json.ts`.
- Configured with `dns.setDefaultResultOrder('ipv4first')` to ensure reliable network connection to Neon poolers on Windows Node.js.
- Queried all pages in the development database.
- Results:
  - Total pages inspected: 130
  - Pages with non-null `pageData`: 130
  - Successfully parsed as valid JSON objects: 130 (100%)
  - Invalid or corrupted JSON entries: 0

### Step 2: Prisma Schema Evolution (`backend/prisma/schema.prisma`)
- Added relational columns to `Page`:
  - `contentModel String @default("document")`
  - `pageData Json?` (converted from `String?`)
  - `version Int @default(1)`
  - Index `@@index([published], map: "Page_published_idx")`
  - Relational fields: `items PageItem[]`, `categories PageCategory[]`, `revisions PageRevision[]`.
- Introduced new models:
  - `PageItem`: relational child item storing `collection`, `slug`, `title`, `summary`, `imageUrl`, `href`, `badge`, `sortOrder`, `published`, `data Json`, `detail Json`, and `version`. Unique constraint on `[pageId, slug]`.
  - `PageCategory`: relational category taxonomy per page with unique `[pageId, slug]`.
  - `PageItemCategory`: join table for `PageItem` and `PageCategory` with composite primary key `@@id([itemId, categoryId])`.
  - `SlugRedirect`: URL redirection table with unique `fromPath`.
  - `PageRevision`: append-only audit trail capturing versioned page JSON snapshots.
  - `CmsState`: singleton table (`id: 1`, `version: 1`, `updatedAt`) for rapid cache invalidation.
- Generated updated Prisma client via `npx prisma generate`.

### Step 3: Migration SQL Handcrafting & Invariant I2
- Created migration directory `backend/prisma/migrations/20261121120000_hybrid_cms_tables/migration.sql`.
- Generated structural diff from schema and hand-crafted the column alteration to guarantee zero data loss:
  ```sql
  ALTER TABLE "page" ALTER COLUMN "pageData" TYPE JSONB
    USING (CASE WHEN "pageData" IS NULL OR btrim("pageData") = '' THEN NULL ELSE "pageData"::jsonb END);
  ```
- Appended singleton state initialization:
  ```sql
  INSERT INTO "cmsstate" ("id","version","updatedAt") VALUES (1, 1, NOW()) ON CONFLICT ("id") DO NOTHING;
  ```
- Verified that `migration.sql` contains NO `DROP COLUMN "pageData"`.

### Step 4: Shared JSON Parser & Legacy Response Serializer
- Created `backend/src/lib/page-data.ts`:
  - `parsePageData(v: unknown): Record<string, unknown>` safely parses objects, JSON strings, double-encoded strings, null, and undefined, guaranteeing a plain object is always returned.
- Created `backend/src/services/page-content/page-response.ts`:
  - `toLegacyPageResponse<T extends { pageData: any }>(page: T)`: formats `pageData` as `string | null` (`pageData ? JSON.stringify(page.pageData) : null`) so existing API consumers receive identical payload shapes.
  - `toLegacyPagesResponse`: arrays helper for bulk page responses.

### Step 5: Backend Read/Write & Seed Modernization
- Updated `backend/src/routes/pages.routes.ts`:
  - `GET /` and `GET /published`: routed through `toLegacyPagesResponse`.
  - `GET /:idOrSlug`: routed through `toLegacyPageResponse`.
  - `POST /` and `PUT /:id`: parses request `pageData` with `parsePageData` before writing as `Prisma.InputJsonValue`; responses wrapped with `toLegacyPageResponse`.
  - `GET /hub/catalog`: reads page `pageData` with `parsePageData`.
- Updated `backend/src/services/bootstrap-pages.ts`:
  - Default pages written using parsed plain objects (`Prisma.InputJsonValue`), eliminating all `JSON.stringify` on write.
  - Page reads updated to parse with `parsePageData`.
- Updated `backend/prisma/seed.ts` and `backend/src/runSeed.ts`:
  - Replaced stringified `pageData` with plain objects.
- Updated `backend/tests/helpers/db.ts`:
  - `resetContentTables()` now truncates `"pageitemcategory","pagecategory","pageitem","pagerevision","slugredirect","page","sitecontent","searchcard","cmsstate" RESTART IDENTITY CASCADE` and reseeds `cmsstate (1, 1)`.
- Enforced zero stringification matches: searching `backend/src` and `backend/prisma` for `pageData:\s*JSON\.stringify` returns exactly 0 matches.

### Step 6: Backup, Test Rehearsal & Dev Migration Deploy
1. **Dev Database Backup:**
   - Ran `npm run db:export --prefix backend`.
   - Verified `backend/prisma/database-export.json` (1,309,504 bytes, 130 pages).
2. **Rehearsal on Isolated Neon Test Database:**
   - Restored baseline dev export into isolated test database.
   - Executed `npx prisma migrate deploy` against test database.
   - Checked data retention: 130 pages with non-null `pageData` before migration = 130 pages after migration (100% data retention).
   - Verified Invariant I2 on test database: 0 rows where `jsonb_typeof("pageData") <> 'object'`.
3. **Application to Dev Database:**
   - Executed `npx prisma migrate deploy` against dev database.
   - Checked data retention: 130 pages with non-null `pageData` (100% preserved).
   - Ran `check-pagedata-json.ts`: 130/130 valid JSON objects, 0 invalid.
   - Dev database `CmsState` singleton confirmed active (`id: 1, version: 1`).

### Step 7: New Test Suites & Snapshot Normalization
- Created `backend/tests/lib/page-data.test.ts`:
  - 10 unit tests verifying object inputs, single-encoded strings, double-encoded strings, null/undefined, numbers, booleans, arrays, and malformed JSON.
- Created `backend/tests/schema/constraints.test.ts`:
  - 6 integration tests verifying duplicate `(pageId, slug)` rejection on `pageitem` and `pagecategory` (Prisma P2002), cross-page slug reuse, cascade deletion across all child tables, and unique constraint on `slugredirect.fromPath`.
- Created `backend/tests/schema/jsonb-integrity.test.ts`:
  - 3 tests verifying Invariant I2 via raw SQL (`jsonb_typeof <> 'object' = 0`), JSONB object typing, and default `{}` values for `pageitem.data` and `pageitem.detail`.
- Contract Snapshots (`backend/tests/contract/legacy-pages.contract.test.ts`):
  - Handled PostgreSQL JSONB object key normalization in `normalizePageResponse` by preserving original fixture key ordering.
  - All 26 legacy characterization snapshot files remain 100% green without modification.
- Hardened server networking:
  - Added `dns.setDefaultResultOrder('ipv4first')` in `backend/src/server.ts` to prevent Windows Node.js IPv6 socket timeouts on Neon connection poolers.

---

## 3. Test Results Summary

### Backend Vitest Suite (`npm run test --prefix backend`)
```
 Test Files  7 passed (7)
      Tests  56 passed (56)
   Duration  85.01s
```
- `tests/services/bootstrap-pages.test.ts` (3 tests passed)
- `tests/pages/no-side-effects.test.ts` (1 test passed)
- `tests/schema/jsonb-integrity.test.ts` (3 tests passed)
- `tests/contract/legacy-pages.contract.test.ts` (26 tests passed)
- `tests/schema/constraints.test.ts` (6 tests passed)
- `tests/smoke.test.ts` (7 tests passed)
- `tests/lib/page-data.test.ts` (10 tests passed)

### Playwright E2E Smoke Suite (`npx playwright test tests/e2e/smoke.spec.ts`)
- Executed routes: 206 passed / 206 executed
- Baseline known failures skipped: 3 (`/ai-digital-design-supply`, `/tech-infra`, `/digital/16-latetest`)

### TypeScript Compilation (`npm run build --prefix backend`)
- `prisma generate && tsc`: 0 compilation errors.

---

## 4. Acceptance Criteria Verification Checklist

- [x] **Migration SQL Non-Destructive Cast:** Migration contains `ALTER COLUMN "pageData" TYPE JSONB USING (CASE WHEN ...)` and NO `DROP COLUMN "pageData"`.
- [x] **Rehearsal & Deploy Verified:** Rehearsal on test DB and deploy on dev DB completed; 130/130 pages with non-null `pageData` preserved (100% data retention).
- [x] **Zero Stringify Matches:** Searching `backend/src` and `backend/prisma` for `pageData:\s*JSON\.stringify` returns 0 matches.
- [x] **Invariant I2 Holds:** `backend/tests/schema/jsonb-integrity.test.ts` passes (`jsonb_typeof("pageData") <> 'object'` returns 0).
- [x] **All Backend Tests Pass:** 56/56 tests pass across 7 test files. All 26 contract snapshots green without modification.
- [x] **TypeScript Compilation:** `npm run build --prefix backend` completes with 0 errors.
- [x] **Zero Remote Push:** `git push` was not executed.
- [x] **Git Safety:** `backend/.env` is untouched and uncommitted.

---

## 5. Deviations & Observations
1. **JSONB Key Ordering in PostgreSQL:** PostgreSQL `JSONB` normalizes object keys internally upon storage. In `tests/contract/legacy-pages.contract.test.ts`, the `normalizePageResponse` utility was enhanced with `orderKeysLike` to re-order parsed JSON keys matching the original fixture template before snapshot comparison. This preserved the exact contract semantics while leaving all 26 characterization snapshots completely untouched.
2. **Neon IPv6 Socket Timeouts on Windows:** Added `dns.setDefaultResultOrder('ipv4first')` to `backend/src/server.ts` to prevent transient Node.js IPv6 connection drops on Windows when connecting to Neon AWS pooler hostnames.
