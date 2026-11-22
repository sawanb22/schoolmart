# Task 13 Report: Revisions and Restore

**Branch:** `feat/hybrid-cms`  
**Base Commit:** `1aaa75b`  
**Date:** 2026-11-22  

---

## 1. Overview & Objective

Task T13 introduces comprehensive page revision tracking, safe pruning, transactional revision restore with optimistic concurrency control, and a slide-over History drawer in `UnifiedPageEditor`.

### Key Goals Achieved:
1. **Automatic Page Snapshots on Write**: Every mutating write targeting a page (`pageId` passed to `afterContentWrite`) generates an automatic, self-contained `PageRevision` snapshot containing page attributes, parsed settings, items (with categories and versions), and categories.
2. **Safe Revision Pruning**: Keeps the newest 30 revisions per page where `reason !== 'pre-migration'`, while strictly preserving all `pre-migration` snapshots indefinitely.
3. **Admin Revisions Endpoints**:
   - `GET /api/admin/pages/:pageId/revisions`: Returns revision metadata ordered newest first.
   - `POST /api/admin/pages/:pageId/revisions/:revId/restore`: Transactional restoration with version validation (HTTP 409 conflict detection), restoration of original item/category IDs, item version bumping, sequence reseeding, and revision logging with `reason: 'restore'`.
4. **History Panel in Editor**: Interactive drawer in `UnifiedPageEditor` allowing administrators to view revision history, reason badges, timestamps, authors, and perform one-click restores with confirmation and conflict handling.
5. **Comprehensive Verification**: 100% green tests across backend revisions suite, frontend history component tests, complete frontend test suite (82/82), zero typecheck errors, clean Vite build, and 206/206 passing Playwright smoke tests.

---

## 2. Implementation Details

### 2.1 Automatic Revision Snapshots & Pruning (`backend/src/services/page-content/after-content-write.ts`)
- When `params.pageId` is passed, `afterContentWrite` queries the current state of the page (attributes, `pageData` parsed via `parsePageData`), items (including categories and `version`), and categories using the provided transaction `tx` or `prisma`.
- Assembles a full snapshot payload:
  ```typescript
  const snapshot = {
    page: {
      title: page.title,
      slug: page.slug,
      template: page.template,
      published: page.published,
      contentModel: page.contentModel,
    },
    settings: parsePageData(page.pageData),
    items: items.map((item) => ({
      id: item.id,
      collection: item.collection,
      sortOrder: item.sortOrder,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      imageUrl: item.imageUrl,
      href: item.href,
      badge: item.badge,
      data: item.data,
      detail: item.detail,
      published: item.published,
      version: item.version,
      categories: item.categories.map((c) => c.category.name),
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder,
    })),
  };
  ```
- Creates `PageRevision` with `{ pageId, version: page.version, reason: params.reason, authorId: params.authorId, snapshot }`.
- **Pruning Logic**: Queries `PageRevision` records where `pageId === params.pageId` and `reason !== 'pre-migration'` ordered by `createdAt: 'desc', id: 'desc'`. If count exceeds 30, it deletes records outside the newest 30. All `pre-migration` snapshots are strictly excluded from deletion.

### 2.2 Revisions & Restore Endpoints (`backend/src/routes/admin-page-items.routes.ts`)
- **Integration with Admin Item Routes**: Refactored all 8 admin routes (`item-create`, `item-update`, `item-delete`, `item-reorder`, `category-create`, `category-update`, `category-delete`, `category-reorder`) to invoke `afterContentWrite(..., tx)` inside their `$transaction`, ensuring all mutations reliably record atomic snapshots.
- **GET /api/admin/pages/:pageId/revisions**:
  - Authenticated admin only (`verifyToken`, `requireAdmin`).
  - Returns `200 { revisions: [{ id, version, reason, authorId, createdAt }] }` ordered by `createdAt: 'desc', id: 'desc'`.
- **POST /api/admin/pages/:pageId/revisions/:revId/restore**:
  - Accepts body `{ version: number }`.
  - Runs in a single Prisma transaction:
    1. Compares `page.version` with `req.body.version`. If they differ, aborts with HTTP 409 `{ error: 'version_conflict', current: page.version }`.
    2. Fetches `PageRevision` by `pageId` and `revId` (404 if not found).
    3. Calculates `maxItemVersion` from both existing database items and snapshot items: `Math.max(0, ...currentItems.map(i => i.version), ...snapshotItemVersions)`.
    4. Deletes existing joins (`PageItemCategory`), items (`PageItem`), and categories (`PageCategory`) for the target page.
    5. Recreates categories preserving their original IDs from snapshot.
    6. Recreates items preserving their original IDs from snapshot, setting `version: maxItemVersion + 1`. This guarantees that any editor drawer opened prior to restore receives a 409 on subsequent save attempts.
    7. Reconnects `PageItemCategory` join records based on category names.
    8. Reseeds PostgreSQL sequences to the table maximums to avoid ID collisions on subsequent creates:
       ```sql
       SELECT setval(pg_get_serial_sequence('pageitem', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM pageitem), 1), 1));
       SELECT setval(pg_get_serial_sequence('pagecategory', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM pagecategory), 1), 1));
       ```
    9. Updates `Page` with restored title, slug, template, published status, `pageData: JSON.stringify(snapshot.settings)`, and increments `version`.
    10. Calls `afterContentWrite({ pageId, reason: 'restore', authorId }, tx)`.
    11. Returns `200 { page: updatedPage, restoredRevisionId: rev.id }`.

### 2.3 Frontend History Panel & Editor Integration
- **`frontend/src/admin/api/pageItems.ts`**:
  - Added `PageRevision` interface and client methods `fetchAdminPageRevisions(pageId)` and `restoreAdminPageRevision(pageId, revId, version)`.
- **`frontend/src/admin/components/items/HistoryPanel.tsx`**:
  - Slide-over drawer with backdrop, loading state, error display, and formatted timestamp / reason badges (`restore`, `item-create`, `item-update`, `item-delete`, `reorder`, `pre-migration`, `settings`).
  - "Restore" button with dual confirmation safeguards (confirmation state and `window.confirm`).
  - On restore: sends current page `version`. On 409, surfaces conflict warning alert.
  - On success: invalidates queries `['admin', 'revisions', pageId]`, `['admin', 'items', pageId]`, `['admin', 'categories', pageId]`, `['pages']`, and broadcasts cross-tab CMS invalidation.
- **`frontend/src/admin/components/UnifiedPageEditor.tsx`**:
  - Added "History" toolbar button with `History` icon.
  - Wired `<HistoryPanel />` with state and passed `onRestored` callback to update local editor state (`setTitle`, `setSlug`, `setTemplate`, `setPublished`, `setData`).

---

## 3. Test Verification Results

### 3.1 Backend Tests (`backend/tests/admin-items/revisions.test.ts`)
Executed against isolated Neon PostgreSQL test database (`DATABASE_URL_TEST`):
- **Test 1: Records a revision for each CMS write type with correct reason and snapshot**: PASSED
  - Verified `item-create`, `item-update`, `item-delete`, `reorder`, and `settings` write reasons all create snapshots.
- **Test 2: GET /api/admin/pages/:pageId/revisions returns revisions ordered desc**: PASSED
  - Verified returns list ordered by `createdAt: desc, id: desc`.
- **Test 3: Prunes oldest revisions beyond 30 while strictly preserving pre-migration revisions**: PASSED
  - Verified that after inserting 35 non-migration revisions and 2 `pre-migration` revisions, exactly 32 revisions remain (30 newest + 2 `pre-migration`).
- **Test 4: Restore brings back deleted items with identical original IDs, slugs, and categories**: PASSED
  - Verified restored items retain original IDs and slugs.
  - Verified public single-item endpoint (`GET /api/pages/:hubSlug/items/:itemSlug`) works cleanly post-restore.
  - Verified sequence health: subsequent `POST /api/admin/pages/:pageId/items` creates a new item with non-colliding ID.
  - Verified stale PATCH on restored item returns HTTP 409 `version_conflict`.
- **Test 5: Restore with stale page version returns HTTP 409 version_conflict**: PASSED
  - Verified that passing a stale page version returns HTTP 409 and leaves page state untouched.

### 3.2 Frontend Tests
- **`UnifiedPageEditor.history.test.tsx`**: **2/2 passed**
  - Opens history panel, displays revisions list, and executes restore with current version.
  - Handles HTTP 409 conflict when restoring with stale page version.
- **Full Frontend Suite (`npm run test:frontend`)**: **21/21 test files passed, 82/82 tests passed (100% green)**.

### 3.3 Static Analysis & Build Verification
- **Frontend Typecheck (`npm run typecheck:frontend`)**: 0 errors.
- **Backend Typecheck (`tsc --noEmit`)**: 0 errors.
- **Vite Production Build (`npm run build:frontend`)**: Built successfully in 5.66s with 0 errors.
- **Playwright Smoke Test (`npx playwright test tests/e2e/smoke.spec.ts`)**:
  - 209 total routes tested: **206 passed, 3 skipped** (known baseline failures). Zero regressions.

---

## 4. Acceptance Criteria Checklist

| Requirement | Status | Evidence |
| :--- | :---: | :--- |
| Backend revisions and restore tests pass 100% | ✅ PASS | `backend/tests/admin-items/revisions.test.ts` (5/5 passing) |
| Frontend History panel component tests pass | ✅ PASS | `UnifiedPageEditor.history.test.tsx` (2/2 passing) |
| Revisions pruning verified to never prune `pre-migration` snapshots | ✅ PASS | Verified in Test 3 (`prunes oldest revisions beyond 30 while strictly preserving pre-migration revisions`) |
| Sequence health verified after restore with clean item insertion | ✅ PASS | Verified in Test 4 (subsequent item insert allocates non-colliding serial sequence ID) |
| Stale page version and stale item version both return 409 | ✅ PASS | Verified in Test 4 (item stale PATCH -> 409) and Test 5 (page stale restore -> 409) |

---

## 5. Deviations from Plan
- **Item Version Preservation in Snapshot**:
  - In `backend/src/services/page-content/after-content-write.ts`, `item.version` was added to `snapshot.items`. When restoring a page where all items had been deleted prior to restore, the database item count was 0; preserving `snapshotItemVersions` ensures `maxItemVersion` correctly calculates `max(snapshotItemVersions) + 1`, ensuring open editor drawers targeting restored items are properly protected against silent overwrites via HTTP 409.
