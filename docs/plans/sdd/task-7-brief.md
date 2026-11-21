# SDD Task Brief: T7 – Backend Consumers Read from Tables

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T7)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-7-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `8de212e3e5518b5b5c907b8971f114620f3a61df`

---

## Objective
Update backend consumers (Solutions Finder indexer/repository and `/api/pages/hub/catalog`) to read structured pages from the relational tables (`PageItem`, `PageCategory`) while preserving 100% output parity with golden snapshots, integrate `CmsState.version` into search index watermarks and query freshness checks (`ensureFresh()`), remove hard-coded `HUB_METADATA.defaultCategories`, and debounce search index rebuilds.

---

## Detailed Steps

1. **Golden Extraction Snapshot (Freeze Output):**
   - Create `backend/tests/solutions/extractor-golden.test.ts`:
     - Loads fixtures into test database (unmigrated).
     - Extracts cards via `PageSolutionsExtractor.extractFromPages`.
     - Writes/matches golden file snapshot of extracted cards (sorted by `cardSlug`).

2. **Repository Integration (`backend/src/services/solutions-finder/prisma-solutions.repository.ts`):**
   - Update `fetchActiveCards()`:
     - Load structured pages with their `items` (and item categories) and `categories`.
     - For structured pages, synthesize legacy blob input via `buildLegacyPageData(page.pageData, page.items, page.categories, { includeDetail: true })` and pass to extractor.
     - Document pages continue passing `page.pageData`.
     - `cardSlug` generation remains `${page.slug}--${slugify(title)}`, so existing `SearchCard` manual overrides continue to match seamlessly.
   - Update `fetchDataWatermarks()`:
     - Include `cmsVersion` from `CmsState` (reading singleton `id: 1`).

3. **Solutions Index Freshness & Debouncing:**
   - In `backend/src/services/solutions-finder/solutions-index.service.ts`:
     - Store `lastCmsVersion` it was built with.
     - Implement `ensureFresh(): Promise<void>`:
       - Compares `lastCmsVersion` with current `CmsState.version` (memoized up to 5s).
       - If changed, triggers `rebuild()` behind existing mutex lock.
   - In `backend/src/routes/solutions-finder.routes.ts`:
     - Call `await solutionsIndexService.ensureFresh()` at start of search handler(s).
   - In `backend/src/services/page-content/after-content-write.ts`:
     - Verify debounced trigger (2000 ms module-level timer using `setTimeout` with `unref()`) calls `solutionsIndexService.rebuild()`.

4. **Modernize Hub Catalog Endpoint (`backend/src/routes/pages.routes.ts`):**
   - Check frontend consumers of `/hub/catalog` (`frontend/src/`): verify how `item.id` is used.
     - If only used as React key or equality check, use `pi-<PageItem.id>`. If dependent on index, document decision.
   - For hubs (`labs`, `sports-infra`, `tech-infra`, `libraries`), fetch items and categories from `PageItem` and `PageCategory` tables.
   - Delete `HUB_METADATA.defaultCategories` lists in `pages.routes.ts` (keep hub titles).

5. **Implement Verification Test Suite:**
   - `backend/tests/solutions/extractor-golden.test.ts`:
     - Post-migration extraction equals golden snapshot (verifies parity).
   - `backend/tests/pages/hub-catalog.test.ts`:
     - Migrated data yields identical items (title, href, categories, hubSlug) and subcategory sets compared with T2 contract snapshot.
   - `backend/tests/solutions/debounce.test.ts`:
     - Fake timers: 5 calls to `afterContentWrite` within 1s trigger exactly 1 rebuild.
   - `backend/tests/solutions/ensure-fresh.test.ts`:
     - Bumping `cmsstate.version` in SQL triggers index rebuild on next search request.

6. **Verify & Commit:**
   - All backend tests pass (`npm run test --prefix backend`).
   - TypeScript compilation succeeds with 0 errors (`npm run build --prefix backend`).
   - Searching `backend/src/routes/pages.routes.ts` for `defaultCategories: \[` returns 0 matches.
   - Commit with message:
     `T7: Backend consumers read from tables`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-7-report.md`.

---

## Acceptance Criteria
- [ ] Golden equality tests pass (extractor output identical before and after migration).
- [ ] Searching `backend/src/routes/pages.routes.ts` for `defaultCategories: \[` finds 0 matches.
- [ ] Debounce test and `ensureFresh` tests pass.
- [ ] All backend tests pass cleanly.
- [ ] TypeScript compilation succeeds with 0 errors.
- [ ] Zero remote push strictly enforced (`git push` forbidden).
- [ ] Commit `T7: Backend consumers read from tables` created.
