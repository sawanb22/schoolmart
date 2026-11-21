# SDD Task 7 Report: Backend Consumers Read from Tables

- **Task:** T7 – Backend Consumers Read from Tables
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T7)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `8de212e3e5518b5b5c907b8971f114620f3a61df`
- **Created Commit:** `0a7dba5` (T7: Backend consumers read from tables)
- **Status:** DONE

---

## 1. Executive Summary

Task T7 completes the transition of backend consumers from reading unstructured legacy JSON page blobs to reading structured content directly from the normalized relational tables (`PageItem`, `PageCategory`, `PageItemCategory`):

1. **Solutions Repository Table Integration (`PrismaSolutionsRepository`):**
   - Updated `fetchActiveCards()` to query structured pages with their associated `items` (including join categories) and `categories`.
   - Synthesizes legacy blob inputs for structured pages via `buildLegacyPageData(settings, items, categories, { includeDetail: true, publicOnly: true })` and passes them to `PageSolutionsExtractor.extractFromPages`.
   - Preserves manual pinned cards from `SearchCard` and manual keyword/institution overrides.
   - Preserved cardSlug generation as `${page.slug}--${slugify(title)}`, maintaining 100% equivalence.
2. **Golden Extraction Equality Snapshot (`extractor-golden.test.ts`):**
   - Implemented snapshot verification freezing all extracted cards before migration (`backend/tests/solutions/__snapshots__/extractor-golden.json`).
   - Verified that extracting cards from the relational tables post-migration produces a deep-equal output matching the pre-migration baseline (100% output parity across all 24 page fixtures).
3. **CmsState Version Watermarking & Query Freshness (`ensureFresh()`):**
   - Extended `DataWatermarks` with `cmsVersion` sourced from `CmsState` singleton (`id: 1`).
   - Implemented `SolutionsIndexService.ensureFresh()` with a 5000 ms in-process memoization window behind the index rebuild mutex lock.
   - Wired `await solutionsIndexService.ensureFresh()` into the search route handlers in `solutions-finder.routes.ts`.
4. **Modernization of Hub Catalog (`/api/pages/hub/catalog`):**
   - Inspected frontend consumers in `frontend/src/` (0 dependencies on catalog `id` format).
   - Modernized `/hub/catalog` to read structured hubs (`labs`, `sports-infra`, `tech-infra`, `libraries`) directly from `PageItem` and `PageCategory` tables.
   - Assigned item identifiers following the `pi-${item.id}` format (preserving `prod-${id}` for furniture products).
   - Removed all hardcoded `HUB_METADATA.defaultCategories` lists from `backend/src/routes/pages.routes.ts` (0 matches for `defaultCategories: \[`).
5. **Debounced Search Index Rebuilds (`after-content-write.ts`):**
   - Verified that `afterContentWrite` schedules search index rebuilds with a 2000 ms debounce timer using unref'd timeouts, preventing thrashing on burst CMS mutations.
6. **Full Suite Verification:**
   - All 27 backend test files passed (201/201 tests passed, 100% green).
   - TypeScript build completed with 0 compilation errors (`npm run build --prefix backend`).

---

## 2. Detailed Execution Steps & Actions Taken

### Step 1: Types & Interfaces Extension
- `backend/src/services/solutions-finder/types/solutions-card.types.ts`:
  - Added `cmsVersion?: number` to `DataWatermarks`.
- `backend/src/services/solutions-finder/solutions-repository.interface.ts`:
  - Added optional `fetchCmsVersion?(): Promise<number>`.
- `backend/src/services/solutions-finder/in-memory-solutions.repository.ts`:
  - Added `cmsVersion` property (default 1), `setCmsVersion(v: number)`, `fetchCmsVersion()`, and updated `fetchDataWatermarks()` to return `cmsVersion`.

### Step 2: Prisma Solutions Repository
- `backend/src/services/solutions-finder/prisma-solutions.repository.ts`:
  - Updated `fetchActiveCards()`:
    - Queries `page.findMany` with `categories` (ordered by `sortOrder asc`) and `items` (published only, ordered by `collection asc, sortOrder asc`, including categories and their `category` relation).
    - For pages with `contentModel === 'structured'`, synthesizes page data using `buildLegacyPageData(settings, p.items, p.categories, { includeDetail: true, publicOnly: true })`.
    - Retains raw `pageData` for document pages.
    - Extracted dynamic cards via `PageSolutionsExtractor.extractFromPages(pageInputs, taxonomy)`.
  - Added `fetchCmsVersion()`: reads `CmsState.version` from `prisma.cmsState.findUnique({ where: { id: 1 } })`.
  - Updated `fetchDataWatermarks()`: queries `cmsState.findUnique({ where: { id: 1 } })` alongside page, card, case-study, and taxonomy aggregates.
  - Added `withDbRetry` helper with exponential backoff around all database queries to handle transient Neon remote TCP connection resets.

### Step 3: Solutions Index Freshness & Mutex Locking
- `backend/src/services/solutions-finder/solutions-index.service.ts`:
  - Added `lastCmsVersion: number`, `memoizedCmsVersion: { version: number; expiresAt: number } | null`, and `clock: () => number`.
  - Updated `compileIndex()` to fetch current CMS version and update `this.lastCmsVersion = currentCmsVersion`.
  - Updated `isValidWatermarks` and `hasWatermarkAdvanced` to check `cmsVersion`.
  - Implemented `ensureFresh()`:
    - Checks in-process memoized version (valid for up to 5000 ms).
    - On cache miss, queries `repository.fetchCmsVersion()` and updates memoization cache.
    - If `!this.isInitialized` or `this.lastCmsVersion !== currentVersion`, triggers `await this.rebuild()` behind the promise-chaining mutex lock.
  - Added `getLastCmsVersion()`, `setClock()`, `resetFreshnessMemo()` for testing.
- `backend/src/routes/solutions-finder.routes.ts`:
  - Added `await solutionsIndexService.ensureFresh()` at the beginning of `handleSolutionsSearch`.
- `backend/src/services/solutions-finder/intent-scorer.service.ts`:
  - Optimized cold index check to `if (!this.indexService.isReady())` instead of checking `activeCards.length === 0`, preventing unnecessary rebuild triggers on search queries against empty test tables.

### Step 4: Golden Extractor Equality Snapshot
- `backend/tests/solutions/extractor-golden.test.ts`:
  - Loads 24 fixtures into unmigrated test database and extracts cards via `solutionsRepository.fetchActiveCards()`.
  - Writes golden file snapshot `backend/tests/solutions/__snapshots__/extractor-golden.json`.
  - Applies migration via `runMigration({ mode: 'apply', prisma })`.
  - Extracts active cards post-migration and asserts 100% deep equality against the pre-migration cards and the snapshot.
- `backend/src/services/solutions-finder/page-solutions-extractor.ts`:
  - Enhanced `resolvePageCategory`: added check for `rawCard.categories` array in addition to `rawCard.category`. In relational tables, item categories are stored in join rows and reconstructed as `categories: string[]`. Checking `rawCard.categories` ensures 100% identical category resolution (`indoor-courts`, `track-field`, etc.) before and after migration.

### Step 5: Modernize Hub Catalog Endpoint
- Inspected `frontend/src/` for catalog ID dependencies:
  - Verified no components rely on specific numeric ID indices; IDs are used purely for React list keying and equality checks.
- Modernized `backend/src/routes/pages.routes.ts`:
  - For structured hubs (`labs`, `sports-infra`, `tech-infra`, `libraries`), fetches items from `prisma.pageItem.findMany` (including categories) and categories from `prisma.pageCategory.findMany`.
  - Formats item IDs as `pi-${item.id}` (preserving `prod-${id}` for furniture).
  - Derived subcategories from database categories, falling back to `LEGACY_HUB_DEFAULT_CATEGORIES[hub.id]` in `backend/src/services/page-content/constants.ts` if unpopulated.
  - Completely deleted `HUB_METADATA.defaultCategories` lists from `pages.routes.ts`. Verified 0 matches for `defaultCategories: \[`.
- `backend/tests/pages/hub-catalog.test.ts`:
  - Verifies `/api/pages/hub/catalog` and `/api/pages/hub/catalog?hub=labs` against the T2 contract snapshots (`hub-catalog.json` and `hub-catalog-labs.json`).
  - Verifies exact match of hub titles, total item counts, subcategory sets, item titles, hrefs, categories, and `pi-<id>` ID patterns.

### Step 6: Debounce & Freshness Unit Tests
- `backend/tests/solutions/debounce.test.ts`:
  - Fake-timers test verifying 5 calls to `afterContentWrite` within 1 second trigger exactly 1 rebuild after 2000 ms.
  - Verifies `cancelPendingSolutionsRebuild` clears any scheduled timer.
- `backend/tests/solutions/ensure-fresh.test.ts`:
  - Verifies repeated search requests within the 5s memo window serve without rebuilding.
  - Verifies that directly updating `CmsState.version` in SQL and advancing the virtual clock past 5s triggers `rebuild()` on the subsequent search request.

---

## 3. Verification & Test Results

### Backend Test Suite
Executed `npm run test --prefix backend`:
```
Test Files  27 passed (27)
Tests       201 passed (201)
Duration    ~720s (100% green across all suites)
```

Breakdown of all 27 suites:
1. `tests/admin-items/auth-guard.test.ts` (20 tests passed)
2. `tests/admin-items/categories.test.ts` (5 tests passed)
3. `tests/admin-items/cms-write-hook.test.ts` (7 tests passed)
4. `tests/admin-items/items-lifecycle.test.ts` (9 tests passed)
5. `tests/admin-items/optimistic-locking.test.ts` (4 tests passed)
6. `tests/admin-items/reorder.test.ts` (4 tests passed)
7. `tests/admin-items/slugs-and-redirects.test.ts` (4 tests passed)
8. `tests/admin-items/validation-and-sanitizer.test.ts` (6 tests passed)
9. `tests/contract/legacy-pages.contract.test.ts` (50 tests passed)
10. `tests/lib/page-data.test.ts` (10 tests passed)
11. `tests/page-content/cms-version.test.ts` (5 tests passed)
12. `tests/page-content/hub-v2.test.ts` (7 tests passed)
13. `tests/page-content/item-endpoint.test.ts` (7 tests passed)
14. `tests/page-content/legacy-mapper.property.test.ts` (4 tests passed)
15. `tests/page-content/legacy-mapper.test.ts` (19 tests passed)
16. `tests/page-content/legacy-write-adapter.test.ts` (4 tests passed)
17. `tests/pages/hub-catalog.test.ts` (2 tests passed)
18. `tests/pages/no-side-effects.test.ts` (1 test passed)
19. `tests/schema/constraints.test.ts` (6 tests passed)
20. `tests/schema/jsonb-integrity.test.ts` (3 tests passed)
21. `tests/scripts/migrate-page-items.test.ts` (6 tests passed)
22. `tests/scripts/migrate-rollback.test.ts` (2 tests passed)
23. `tests/services/bootstrap-pages.test.ts` (3 tests passed)
24. `tests/smoke.test.ts` (7 tests passed)
25. `tests/solutions/debounce.test.ts` (2 tests passed)
26. `tests/solutions/ensure-fresh.test.ts` (2 tests passed)
27. `tests/solutions/extractor-golden.test.ts` (2 tests passed)

### Codebase Cleanliness Verification
- `Select-String -Path 'backend/src/routes/pages.routes.ts' -Pattern 'defaultCategories: \['`: **0 matches**.
- TypeScript Compilation: `npm run build --prefix backend`: **0 errors**.

### Sample Query Verification (Solutions Finder)
Executed sample search requests against initialized search index:
1. **Query: "stem lab"** (Confidence: 0.85, Summary: "Solutions for your Campus: Science & Healthcare Labs")
   - `[smart-stem-maker-labs] SMART STEM LABS DESIGN TO EXECUTION (environments--smart-stem-labs-design-to-execution)`
   - `[stem-lab] Integrated STEM Discovery & Robotics Studio (labs--integrated-stem-discovery-robotics-studio)`
   - `[stem-innovation] Integrated STEM & Robotics Innovation Center (design--integrated-stem-robotics-innovation-center)`
   - `[computer-lab] Next-Gen AI & High-Performance Computer Lab (labs--next-gen-ai-high-performance-computer-lab)`
   - `[reading-zones] Collaborative Reading Amphitheatres (libraries--collaborative-reading-amphitheatres)`
2. **Query: "synthetic turf"** (Confidence: 0.85, Summary: "Solutions for your Campus: Football Ground & Turf")
   - `[track-field] IAAF Certified Synthetic Athletic Tracks & Turf (sports--iaaf-certified-synthetic-athletic-tracks-turf)`
   - `[track-field] IAAF Certified Synthetic Athletic Tracks & Turf (sports-infra--iaaf-certified-synthetic-athletic-tracks-turf)`
   - `[dining-halls-nutrition] The Importance of Daylight in Classrooms (environments--the-importance-of-daylight-in-classrooms)`
3. **Query: "digital library"** (Confidence: 0.85, Summary: "Solutions for your K-12 & International Schools")
   - `[libraries] Modern Library Architectural Interiors (design--modern-library-architectural-interiors)`
   - `[digital-catalogs] Cloud Digital Catalogs & Touch Terminals (libraries--cloud-digital-catalogs-touch-terminals)`
   - `[interactive-kids-libraries] INTERACTIVE KIDS LIBRARY (environments--interactive-kids-library)`

---

## 4. Acceptance Criteria Checklist Verification

- [x] **Golden equality tests pass:** Extractor output before and after migration is 100% identical (`backend/tests/solutions/extractor-golden.test.ts`).
- [x] **Zero defaultCategories matches:** Searching `backend/src/routes/pages.routes.ts` for `defaultCategories: \[` returns 0 matches.
- [x] **Debounce test passes:** Fake timers confirm 5 writes within 1s debounce into 1 rebuild after 2000ms (`backend/tests/solutions/debounce.test.ts`).
- [x] **Freshness test passes:** `ensureFresh()` uses 5s memoization and triggers rebuild on SQL version bump (`backend/tests/solutions/ensure-fresh.test.ts`).
- [x] **All backend tests pass cleanly:** 27 test files, 201 tests passed (100% green).
- [x] **TypeScript compilation succeeds with 0 errors:** `npm run build --prefix backend` exits with code 0.
- [x] **Zero remote push strictly enforced:** No `git push` executed.
- [x] **Execution log updated:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md` updated with T7 block.

---

## 5. Deviations & Technical Discoveries

1. **Category Array Normalization in Extractor:**
   - In legacy fixtures, cards occasionally had single category strings (`category: "..."`) or arrays (`categories: [...]`). Post-migration, categories are modeled in the relational `PageCategory` table and join rows, and serialized as `categories: string[]`.
   - Updated `PageSolutionsExtractor.resolvePageCategory` to check `rawCard.categories` if `rawCard.category` is not set, guaranteeing 100% identical output before and after migration.
2. **Neon Remote Connection Stability:**
   - Intermittent TCP resets from remote Neon Postgres during high-concurrency test runs were mitigated by adding `withDbRetry` around `PrismaSolutionsRepository` methods and `seedAdminUser` in `tests/helpers/auth.ts`.
3. **Prisma Client Multi-Directory Alignment:**
   - Monorepo structure had an un-migrated `@prisma/client` artifact at the root `node_modules` which caused type errors in isolated Vitest workers. Synchronized generated Prisma client to root `node_modules`, resolving all worker schema discrepancies.
