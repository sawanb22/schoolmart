# SDD Task Brief: T12 – Admin Per-Item Editing UI and Strict Structured Writes

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T12, Section 3.5, 3.6, 5)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-12-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `b7e53f7`

---

## Objective
Implement granular admin per-item and category editing interfaces (`ItemsManager`, `ItemEditorDrawer`, `CategoryManager`, `ConflictDialog`), wire them into `UnifiedPageEditor` for structured pages, migrate `Categories.tsx` and `CollegesManager.tsx` to the items/category APIs, support `/admin/pages?edit=<hub>&card=<slug>` deep linking, turn on backend `CMS_STRICT_STRUCTURED_WRITES`, and drop public legacy detail payloads for structured pages outside `HUB_NEEDS_DETAIL`.

---

## Detailed Steps

1. **Audit `UnifiedPageEditor.tsx`:**
   - Record component names and line ranges where collections are edited (`cards`, `section2Cards`, `moreCards`, `featured`, `faqs`, `openings`, `caseStudies`) into `docs/plans/sdd/task-12-report.md` and `docs/plans/HYBRID_CMS_EXECUTION_LOG.md` before changing code.

2. **Admin API Client (`frontend/src/admin/api/pageItems.ts`):**
   - Implement typed functions for all endpoints in Section 3.5:
     - `fetchAdminPageItems(pageId, collection?, format='card')`: `GET /api/admin/pages/:pageId/items?collection=&format=card`
     - `createAdminPageItem(pageId, payload)`: `POST /api/admin/pages/:pageId/items`
     - `updateAdminPageItem(pageId, itemId, payload)`: `PATCH /api/admin/pages/:pageId/items/:itemId`
     - `deleteAdminPageItem(pageId, itemId, version)`: `DELETE /api/admin/pages/:pageId/items/:itemId?version=N`
     - `reorderAdminPageItems(pageId, collection, orderedIds)`: `PUT /api/admin/pages/:pageId/items/reorder`
     - `fetchAdminPageCategories(pageId)`: `GET /api/admin/pages/:pageId/categories`
     - `createAdminPageCategory(pageId, name)`: `POST /api/admin/pages/:pageId/categories`
     - `updateAdminPageCategory(pageId, categoryId, payload)`: `PATCH /api/admin/pages/:pageId/categories/:id`
     - `deleteAdminPageCategory(pageId, categoryId)`: `DELETE /api/admin/pages/:pageId/categories/:id`
     - `reorderAdminPageCategories(pageId, orderedIds)`: `PUT /api/admin/pages/:pageId/categories/reorder`

3. **Admin Components (`frontend/src/admin/components/items/`):**
   - **`ItemsManager.tsx`**:
     - Props: `{ pageId: number; pageSlug: string; collection: string; label: string; renderCardFields: (card: any, setCard: (updater: any) => void) => React.ReactNode }`.
     - Lists items: title, slug, thumbnail, published status.
     - Action buttons: "Move up", "Move down" (calls reorder API with contiguous 0..n-1 IDs, no external DnD library), "New item", "Edit", "Delete" (with confirm).
     - TanStack Query cache key: `['admin', 'items', pageId, collection]`.
   - **`ItemEditorDrawer.tsx`**:
     - Drawer/modal holding local copy of `item.card`.
     - Reuses extracted card editor JSX from `UnifiedPageEditor` (e.g. `CardFieldsEditor.tsx`).
     - Save button sends `PATCH /api/admin/pages/:pageId/items/:itemId` with `{ version, card }`.
     - Warns on dirty state if closed with unsaved edits.
   - **`ConflictDialog.tsx`**:
     - Shown when server returns HTTP 409 `{ error: 'version_conflict', current }`.
     - Shows top-level field diffs between local state and `current.card`.
     - Offers "Reload latest" (discards local edits, loads `current`).
     - Offers "Overwrite with mine" (re-sends using `current.version`).
   - **`CategoryManager.tsx`**:
     - CRUD and up/down reordering for `PageCategory` records.
     - TanStack Query cache key: `['admin', 'categories', pageId]`.

4. **Wire `UnifiedPageEditor.tsx`:**
   - When `page.contentModel === 'structured'`:
     - Replace card collection sections with `<ItemsManager collection=...>`.
     - "Save All Changes" strips all `COLLECTIONS` and top-level `categories` from `payloadData` before sending `PUT /api/pages/:id`, sending `version`. On 409, shows page-level conflict dialog.
     - Switch `onSyncOpenings` and `onSyncCaseStudies` to the items API.
     - Document pages (`contentModel === 'document'`) retain existing editor UI.

5. **Migrate Other Admin Screens:**
   - `frontend/src/admin/pages/Categories.tsx`: when target page is structured, write through category API instead of whole-page `PUT /api/pages/:id`.
   - `frontend/src/admin/pages/CollegesManager.tsx`: manage listings on `colleges-universities-for-sale` via items API (`collection: 'cards'`).

6. **Deep Linking:**
   - `/admin/pages?edit=<hub>&card=<slug>` parses query params and automatically opens the editor drawer for the matching item slug.

7. **Backend Strict Mode & Detail Drop:**
   - In `backend/src/routes/pages.routes.ts`:
     - Enable `CMS_STRICT_STRUCTURED_WRITES` (default `true`, controllable via env).
     - When enabled, `PUT /api/pages/:id` and `POST /api/pages` reject incoming collection keys on structured pages with HTTP 400 `{ error: 'collections_not_allowed', keys: [...] }`.
     - Public legacy `GET /api/pages/:slug`: drop detail fields (`DETAIL_DROPPED`) for structured pages outside `HUB_NEEDS_DETAIL`. Admin requests (with token) continue to receive detail.

8. **Testing & Verification:**
   - Frontend unit/component tests (MSW v2):
     - `ItemsManager.test.tsx` (CRUD, up/down reorder)
     - `ItemEditorDrawer.test.tsx` (Save version, 409 conflict dialog, reload, overwrite)
     - `UnifiedPageEditor.save.test.tsx` (structured page strips collections, sends version)
     - `CollegesManager.test.tsx` (hits items API)
   - Backend unit test:
     - `backend/tests/admin-items/strict-mode.test.ts` (strict mode blocks collections on structured pages, allows on document, rollback env flag works)
   - Playwright end-to-end test:
     - `tests/e2e/admin-items.spec.ts`: creates card on `labs`, verifies on `/labs`, edits title, moves up, triggers/tests conflict, and deletes card in `afterAll`.
   - Playwright smoke suite: 206/206 passing with 0 regressions.
   - Commit with message: `T12: Admin per-item editing UI and strict structured writes`.

---

## Acceptance Criteria
- [ ] All unit, component, and Playwright `admin-items.spec.ts` tests pass.
- [ ] Searching `frontend/src/admin` for `pageData: JSON.stringify(` finds matches only in document-page code paths.
- [ ] Playwright smoke and visual suites pass cleanly.
