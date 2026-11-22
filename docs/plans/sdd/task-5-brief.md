# SDD Task Brief: T5 – Read Path from Tables, Legacy Write Adapter, Item Endpoint, Data Cut-Over

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T5)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-5-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `ef315d3923d219bbab4294ca1341cff657e2bb25`

---

## Objective
Implement table-backed Page reads for structured pages with full legacy backward compatibility, the lightweight Hub v2 endpoint (`?v=2`), the individual item detail endpoint (`/:slug/items/:itemSlug`), the legacy write adapter with optimistic locking (`version` check), the global write hook (`afterContentWrite`), the migration rollback flag (`--rollback`), and finally execute the verified data cut-over on the development database.

---

## Detailed Steps

1. **Page Content Service (`backend/src/services/page-content/page-content.service.ts`):**
   - `loadPage(slugOrId: string | number, options?: { includeUnpublished?: boolean })`:
     - Queries `page` with `categories` (ordered by `sortOrder` asc) and `items` (ordered by `collection` asc, `sortOrder` asc, with their `categories`) in ONE single Prisma query.
     - Resolves aliases: `sports` <-> `sports-infra`, `sell-on-schoolmart` <-> `sell-on-campusmart`.
   - `getPageLegacy(slugOrId: string | number, options?: { isAdmin?: boolean })`:
     - If page is `document`, returns `toLegacyPageResponse(page)`.
     - If page is `structured`:
       - Filter items for public reads (`published: true` unless `isAdmin`).
       - Reconstructs `pageData` string using `buildLegacyPageData(page.pageData, page.items, page.categories, { includeDetail: !DETAIL_DROPPED.has(page.slug) })`.
       - Returns `{ ...page, pageData: JSON.stringify(...) }`.
   - `getHubV2(slugOrId: string | number, options?: { isAdmin?: boolean })`:
     - Returns `{ page: { id, slug, title, template, contentModel, version, updatedAt }, settings: pageData, collections: { cards?: ItemSummary[], section2Cards?, moreCards?, featured?: ItemSummary[] (0..1), faqs?, openings?, caseStudies? }, categories: [{ id, name, slug }] }`.
     - **NEVER includes `detail` (Invariant I5).**
   - `findItem(page: any, itemSlug: string)`:
     - 1. Exact match: item with `item.slug === itemSlug`.
     - 2. Check `SlugRedirect` for `/<page.slug>/<itemSlug>`.
     - 3. Fallback: match on `slugify(item.title)` or last segment of `item.href`.
   - `getItem(hubSlug: string, itemSlug: string, options?: { isAdmin?: boolean })`:
     - Loads hub; resolves item using `findItem`.
     - Returns `{ hub: { id, slug, title, template, heroImage, cta }, item: ItemFull }` or `{ redirectTo: "/hub/new-slug" }`.
     - 404 `{ error: 'not_found' }` if missing or unpublished.

2. **Mount Routes in `backend/src/routes/pages.routes.ts`:**
   - Add `GET /:slug/items/:itemSlug` BEFORE `GET /:idOrSlug`.
   - Update `GET /:idOrSlug`:
     - If `req.query.v === '2'`, calls `getHubV2`.
     - Otherwise calls `getPageLegacy`.
   - Detect admin using `optionalAuth` middleware (reuse from blog routes or shared auth middleware).

3. **Legacy Write Adapter & Optimistic Locking (`pages.routes.ts`):**
   - In `PUT /:id` and `POST /`:
     - Check `version`: if `req.body.version` is supplied and differs from `page.version`, return HTTP 409 `{ error: 'version_conflict', current: <legacy page> }`.
     - If page is `structured` and incoming `pageData` has any `COLLECTIONS` or `categories`:
       - Split incoming `pageData` with `splitLegacyPageData`.
       - Call `writeStructuredPage` inside transaction.
     - If no collection keys: update settings only (`pageData`), merging incoming settings over stored ones.
     - Call `afterContentWrite({ pageId: page.id, reason: 'legacy-adapter-update' })`.

4. **Global Write Hook (`backend/src/services/page-content/after-content-write.ts`):**
   - `afterContentWrite(params: { pageId?: number; reason: string; authorId?: number | null }): Promise<void>`
   - Increments `CmsState.version` atomically.
   - Debounces `solutionsIndexService.rebuild()` by 2000 ms.
   - Attach to:
     - `POST /api/pages`
     - `PUT /api/pages/:id`
     - `DELETE /api/pages/:id`
     - `PUT /api/content` & `PUT /api/content/:key` in `content.routes.ts`.

5. **Rollback Implementation in Migration CLI:**
   - In `backend/scripts/migrate-page-items.ts`, add `--rollback [--page=<slug>]`:
     - For each structured page:
       - Fetch latest `PageRevision` with `reason: 'pre-migration'`.
       - Delete page's `PageItem`, `PageCategory`, and join rows.
       - Set `page.pageData = snapshot.pageData`, `contentModel = 'document'`.
       - Increment `page.version` and `CmsState.version`.
     - Test rollback thoroughly on test database before touching dev database!

6. **Cut-Over Development Database:**
   - Refresh dev backup: `npm run db:export --prefix backend`.
   - Execute: `npx ts-node --transpile-only backend/scripts/migrate-page-items.ts --apply`.
   - Verify report logged: number of pages migrated, items created, categories created.
   - Run Playwright smoke (`smoke.spec.ts`) and visual (`visual.spec.ts`) tests against dev to prove zero regressions.

7. **Implement Test Suite:**
   - `backend/tests/contract/legacy-pages.contract.test.ts` (Dual mode):
     - Mode 1: unmigrated fixtures pass snapshots.
     - Mode 2: run migration, then fetch migrated pages; assert `assertLegacyEquivalent` holds.
   - `backend/tests/page-content/hub-v2.test.ts`:
     - Shape matches 3.5.
     - Recursive key scan asserts NO `detail` key exists anywhere (Invariant I5).
     - Unpublished items hidden from public, visible to admin.
   - `backend/tests/page-content/item-endpoint.test.ts`:
     - Exact slug, title fallback, href fallback, redirect, 404.
   - `backend/tests/page-content/legacy-write-adapter.test.ts`:
     - PUT full blob (add/remove/rename items), PUT settings-only, version mismatch 409, version increments.
   - `backend/tests/scripts/migrate-rollback.test.ts`:
     - Verifies `--apply` then `--rollback` restores original `pageData` exactly.
   - `backend/tests/page-content/cms-version.test.ts`:
     - Verifies each write route increments `cmsstate.version` (Invariant I6).

8. **Verify & Commit:**
   - All backend tests pass (`npm run test --prefix backend`).
   - TypeScript compiles cleanly (`npm run build --prefix backend`).
   - Playwright smoke test passes.
   - Commit with message:
     `T5: Read path from tables, legacy write adapter, item endpoint, data cut-over`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-5-report.md`.

---

## Acceptance Criteria
- [ ] Dual-mode contract tests pass (migrated data passes `assertLegacyEquivalent`).
- [ ] Hub v2 endpoint never contains `detail` (Invariant I5).
- [ ] Item endpoint resolves exact, redirect, and fallback slugs.
- [ ] Legacy write adapter handles full blob writes and version conflicts (409).
- [ ] Rollback script restores original document state cleanly.
- [ ] Development database migrated via `--apply` and logged; Playwright smoke and visual suites pass (Invariant I7).
- [ ] TypeScript compilation succeeds with 0 errors.
- [ ] Zero remote push strictly enforced (`git push` forbidden).
- [ ] Commit `T5: Read path from tables, legacy write adapter, item endpoint, data cut-over` created.
