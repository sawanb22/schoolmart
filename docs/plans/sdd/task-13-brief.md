# SDD Task Brief: T13 – Revisions and Restore

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T13, Section 3.1, 3.5, 3.6, 5)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-13-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `1aaa75b`

---

## Objective
Implement automatic page revision snapshots in `afterContentWrite` with safe pruning (never pruning `pre-migration` revisions), add admin revision endpoints (`GET /api/admin/pages/:pageId/revisions` and transactional `POST /api/admin/pages/:pageId/revisions/:revId/restore`), and build a "History" panel in `UnifiedPageEditor` providing one-click revision restore with optimistic concurrency conflict protection.

---

## Detailed Steps

1. **Automatic Page Revision Snapshots (`backend/src/services/page-content/after-content-write.ts`):**
   - When `params.pageId` is passed to `afterContentWrite(params, tx)`:
     - Load page, settings, items (with categories), and categories using `tx || prisma`.
     - Build snapshot payload:
       ```typescript
       {
         page: { title, slug, template, published, contentModel },
         settings: parsePageData(page.pageData),
         items: items.map(item => ({
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
           categories: item.categories.map(c => c.category.name),
         })),
         categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sortOrder }))
       }
       ```
     - Insert `PageRevision` row: `{ pageId, version: page.version, reason: params.reason, authorId: params.authorId, snapshot }`.
     - Prune oldest revisions beyond `REVISIONS_KEPT_PER_PAGE` (30):
       - Find revisions for `pageId` where `reason !== 'pre-migration'`, ordered by `createdAt: 'desc'`.
       - If count > 30, delete revisions with IDs outside the newest 30.
       - **Never delete `reason === 'pre-migration'` revisions.**

2. **Revision Endpoints (`backend/src/routes/admin-page-items.routes.ts`):**
   - `GET /api/admin/pages/:pageId/revisions`:
     - Returns `200 { revisions: [{ id, version, reason, authorId, createdAt }] }` ordered by `createdAt: 'desc'`.
   - `POST /api/admin/pages/:pageId/revisions/:revId/restore`:
     - Body: `{ version: number }` (current page version).
     - Authenticated admin only (`verifyToken`, `requireAdmin`).
     - Executed in a single Prisma transaction (`tx`):
       1. Check page `version`: if `page.version !== req.body.version`, return HTTP 409 `{ error: 'version_conflict', current: page.version }`.
       2. Find the requested revision by `(pageId, revId)`. If missing, return 404.
       3. Extract snapshot: `{ page, settings, items, categories }`.
       4. Find highest item version on the page prior to restore: `maxItemVersion = max(item.version) || 0`.
       5. Delete existing `PageItemCategory`, `PageItem`, and `PageCategory` for this `pageId`.
       6. Recreate categories from snapshot preserving original IDs using raw SQL or explicit ID inserts.
       7. Recreate items from snapshot preserving original IDs, setting `version: maxItemVersion + 1` (so any open editor drawers get a 409 on save).
       8. Reconnect `PageItemCategory` join records.
       9. Reseed PostgreSQL sequences for `pageitem_id_seq` and `pagecategory_id_seq` to ensure no collision:
          `SELECT setval(pg_get_serial_sequence('pageitem','id'), GREATEST((SELECT MAX(id) FROM pageitem), 1))`
          `SELECT setval(pg_get_serial_sequence('pagecategory','id'), GREATEST((SELECT MAX(id) FROM pagecategory), 1))`
       10. Update `Page` with settings, title, slug, template, published, and `version: { increment: 1 }`.
       11. Invoke `afterContentWrite` with `reason: 'restore'`.
       12. Return `200 { page: updatedPage, restoredRevisionId: rev.id }`.

3. **Frontend Admin History Panel (`UnifiedPageEditor.tsx`):**
   - Add "History" button/panel in `UnifiedPageEditor`.
   - Queries `GET /api/admin/pages/:pageId/revisions` via TanStack Query (`queryKey: ['admin', 'revisions', pageId]`).
   - Displays list of revisions: formatted date/time, badge for reason (`restore`, `item-create`, `item-update`, `pre-migration`, etc.), author, version.
   - Each entry has a **Restore** button with confirmation prompt.
   - On confirm: calls `POST /api/admin/pages/:pageId/revisions/:revId/restore` passing current page `version`.
   - On success: invalidates page, items, categories, and revisions queries, shows success notification, and refreshes page data.
   - On 409: displays conflict warning.

4. **Testing Suite:**
   - Backend unit tests (`backend/tests/admin-items/revisions.test.ts`):
     - Revision written for each write type with correct `reason`.
     - Pruning keeps 30 newest revisions while strictly retaining all `pre-migration` revisions.
     - Restore brings back deleted items with identical original IDs and slugs.
     - Public hub `/labs/<slug>` works cleanly after restore.
     - Restored items have version bumped: stale PATCH returns 409.
     - Restore with stale page version returns 409.
     - Postgres sequences healthy: subsequent item creation creates non-colliding ID.
   - Frontend component test:
     - `UnifiedPageEditor.history.test.tsx` (MSW: lists revisions, restore button sends version and refreshes).

5. **Verification & Acceptance:**
   - All backend and frontend tests pass (`npm test`).
   - TypeScript checks pass (`npm run typecheck:frontend` and backend `tsc --noEmit`).
   - Vite production build succeeds (`npm run build:frontend`).
   - Playwright smoke test passes (206/206).
   - Commit with message: `T13: Revisions and restore`.

---

## Acceptance Criteria
- [ ] Backend revisions and restore tests pass 100%.
- [ ] Frontend History panel component tests pass.
- [ ] Revisions pruning verified to never prune `pre-migration` snapshots.
- [ ] Sequence health verified after restore with clean item insertion.
- [ ] Stale page version and stale item version both return 409.
