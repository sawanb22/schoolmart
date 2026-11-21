# SDD Task 2 Report: Characterization Tests and Removal of GET Side Effects

- **Task:** T2 – Characterization Tests and Removal of GET Side Effects
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T2)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `c43fe9890f8457c3e5dfd35e16ecfbb33d6d03ca`
- **Created Commit:** `8682acd` (T2 commit)
- **Status:** DONE

---

## 1. Executive Summary
Task T2 froze the legacy public API contract for SchoolMart CMS pages and hub catalogs using Vitest file snapshots, extracted all database page bootstrapping and ensuring logic into a dedicated, race-free, idempotent startup service (`bootstrapPages`), and eliminated all database mutation side effects from public HTTP GET handlers (`/api/pages/published`, `/api/pages/:idOrSlug`, `/api/pages/hub/catalog`), enforcing Invariant I1 across the backend.

All 37 backend tests across 4 test suites (`legacy-pages.contract.test.ts`, `bootstrap-pages.test.ts`, `no-side-effects.test.ts`, and `smoke.test.ts`) are green, and backend TypeScript compiles with 0 errors.

---

## 2. Detailed Execution Steps & Actions Taken

### Step 1: Export Real Page Fixtures from Dev Database
- Created `backend/scripts/export-page-fixtures.ts`.
- Queried dev database (read-only) and generated fixtures in `backend/tests/fixtures/pages/<slug>.json` formatted as `{ title, slug, template, published, content, pageData }` where `pageData` is the original string.
- Exported target slugs:
  - `labs`, `campus-master-planning`, `campus-design-execution`, `faq`, `job-openings`, `catalogues`, `colleges-universities-for-sale`, `sports-infra`, `libraries`, `privacy-policy`.
  - Canonical fallback seed fixtures generated for `ai-ml` and `tech-infra` matching core seed specifications.
  - Exported real prefix pages: `guide-50-global-resources-for-school-excellence` and `resource-composite-skill-lab`.
- Total real/canonical fixtures: 14.

### Step 2: Synthetic Edge-Case Fixtures
Created 10 synthetic edge-case fixtures under `backend/tests/fixtures/pages/`:
1. `edge-duplicate-titles.json`: Multiple cards sharing the identical title (`Robotics Lab`).
2. `edge-no-card-slugs.json`: Cards omitting the `slug` property to test fallback slug generation.
3. `edge-category-mix.json`: Mixed card schemas (one with `category: string`, another with `categories: string[]`).
4. `edge-section2-only.json`: Pages specifying only `section2Cards` without top-level `cards`.
5. `edge-featured-duplicate.json`: A `featured` object that duplicates an existing card inside `cards`.
6. `edge-featured-empty.json`: Empty `featured: {}` object.
7. `edge-null-entries.json`: Collection arrays containing `null` values interspersed between valid items.
8. `edge-faq-no-title.json`: FAQ items with `question`/`answer` pairs but no `title`.
9. `edge-script-injection.json`: Detail HTML containing potential XSS payloads (`<script>alert(1)</script>`).
10. `edge-unicode-titles.json`: Titles containing emojis, accented characters, Devanagari, and Chinese characters (`Édition Française & 实验室 & 🚀`).

### Step 3: Characterization Contract Snapshots
- Created fixture seeding helper `backend/tests/helpers/seed-fixtures.ts` providing `loadAllPageFixtures`, `loadPageFixture`, and `seedPagesFromFixtures`.
- Created `backend/tests/contract/legacy-pages.contract.test.ts`:
  - Seeds all 24 page fixtures into the isolated test database before assertions.
  - Tests each slug with `GET /api/pages/<slug>`, strips transient fields (`id`, `createdAt`, `updatedAt`), parses `pageData` into stable JSON, and asserts against `backend/tests/contract/__snapshots__/<slug>.json` using `await expect(...).toMatchFileSnapshot(...)`.
  - Tests `GET /api/pages/hub/catalog` and `GET /api/pages/hub/catalog?hub=labs` against contract snapshots `hub-catalog.json` and `hub-catalog-labs.json`.
- Generated and committed 26 snapshot files under `backend/tests/contract/__snapshots__/`.

### Step 4: Extract Dedicated Page Bootstrap Service
- Created `backend/src/services/bootstrap-pages.ts` exporting:
  `bootstrapPages(): Promise<{ created: string[], updated: string[] }>`.
- Migrated all page creation and article upgrade logic from `pages.routes.ts`:
  - `colleges-universities-for-sale` with full `COLLEGE_SALE_DATA` default cards.
  - `partner-with-colleges`.
  - `job-openings`.
  - `partnership`.
  - `ARTICLE_PAGE_SLUGS` set and `createEmptyArticlePageData`.
  - `requiredDefaults` loop (29 default routes).
- Concurrency safety: wrapped page creations with `safeCreatePage` catching Prisma `P2002` unique constraint collisions and re-reading the row to guarantee race-free startup.

### Step 5: Startup & Seed Integration
- Updated `backend/src/server.ts` to call `await bootstrapPages()` before `app.listen()`.
- Updated `backend/prisma/seed.ts` and `backend/src/runSeed.ts` to execute `await bootstrapPages()`.

### Step 6: Removal of Database Side Effects from Public GET Routes (Invariant I1)
- In `backend/src/routes/pages.routes.ts`:
  - Removed all `ensureSimplePage`, `ensureArticlePage`, `ensureCollegeSalePage`, `ensurePartnerPage`, `ensureJobOpeningsPage`, and `restorePartnershipIdentity` functions.
  - Cleaned `GET /published` to strictly execute `prisma.page.findMany({ where: { published: true } })`.
  - Cleaned `GET /:idOrSlug` to query directly by numeric id or slug without mutating the database; non-existent slugs return 404 without database insertion.
  - Admin `GET /` calls `await bootstrapPages()` so authenticated admin page browsing maintains self-healing guarantees.
  - Searching `backend/src/routes` for `ensure(Simple|Article|CollegeSale|Partner|JobOpenings)Page` produces 0 matches.

### Step 7: Verification Suites
- `backend/tests/pages/no-side-effects.test.ts`:
  - Measures row count and `max(updatedAt)` on `page`.
  - Deletes `faq` and requests `GET /api/pages/faq` (returns 404).
  - Hits `GET /api/pages` (returns 401/403 unauthenticated), `GET /api/pages/published`, non-existent slug (404), and all seeded fixtures.
  - Asserts post-request row count and `max(updatedAt)` are strictly equal to initial state.
  - Verifies `faq` remains absent in the database.
- `backend/tests/services/bootstrap-pages.test.ts`:
  - Verifies all default pages are created on an empty database.
  - Verifies idempotency on second run (`created: []`, `updated: []`).
  - Verifies concurrent execution (`Promise.all([bootstrapPages(), bootstrapPages()])`) succeeds without unhandled errors or duplicate keys.
- `backend/tests/smoke.test.ts`:
  - Calls `bootstrapPages()` in `beforeAll` and confirms `/health` and `/api/pages/faq` return 200 properly.

---

## 3. Test Results Summary
Running `npm run test --prefix backend`:
```
 ✓ tests/contract/legacy-pages.contract.test.ts (26 tests)
 ✓ tests/services/bootstrap-pages.test.ts (3 tests)
 ✓ tests/pages/no-side-effects.test.ts (1 test)
 ✓ tests/smoke.test.ts (7 tests)

 Test Files  4 passed (4)
      Tests  37 passed (37)
```
Compilation with `npm run build --prefix backend`:
```
✔ Generated Prisma Client (v6.19.2) in 351ms
tsc: 0 compilation errors
```

---

## 4. Acceptance Criteria Checklist Verification
- [x] Contract snapshots are committed, with at least 14 tests (26 snapshot tests implemented & passing).
- [x] Invariant I1 holds (`backend/tests/pages/no-side-effects.test.ts` passes).
- [x] Searching `backend/src/routes` for `ensure(Simple|Article|CollegeSale|Partner|JobOpenings)Page` finds matches only in the admin `GET /` handler, or none (0 matches found).
- [x] `npm run test --prefix backend` passes with all tests green (37/37 tests pass).
- [x] `npm run build --prefix backend` compiles with 0 errors.
- [x] Zero remote push strictly enforced (`git push` has not been called).
- [x] Commit `T2: Characterization tests and removal of GET side effects` created.

---

## 5. Concerns and Deviations
- **Vitest `toMatchFileSnapshot` Promise**: Vitest's `toMatchFileSnapshot` is asynchronous and returns a Promise. The test suite correctly awaits all snapshot comparisons (`await expect(...).toMatchFileSnapshot(...)`).
- **Dev Database Missing Slugs**: Slugs `ai-ml` and `tech-infra` were defined in core codebase seed specifications (`backend/src/runSeed.ts`, `backend/scripts/seedPages.ts`) but were not present in the live development database. The fixture exporter incorporated their canonical seed data to guarantee 100% fixture coverage as required by the task brief.
