# SDD Task Brief: T6 – Admin Item and Category API with Validation and Locking

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T6)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-6-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `124b9034e34e5658bfe0d38e217036a59966d482`

---

## Objective
Implement granular administrative endpoints for managing items and categories per structured page with strict Zod validation, payload size enforcement, rich-text HTML sanitization (`sanitize-html`), optimistic locking (version conflict detection via 409 responses), automated slug redirect loop prevention, and full authentication/authorization protection (Invariant I8).

---

## Detailed Steps

1. **Install Dependencies:**
   - In `backend`: ensure `zod`, `sanitize-html`, `@types/sanitize-html` are installed (`npm install zod sanitize-html --prefix backend; npm install -D @types/sanitize-html --prefix backend`). Pin exact versions.

2. **Validation Schemas (`backend/src/services/page-content/schemas.ts`):**
   - Create Zod schemas:
     - `ItemInputSchema`: validates `collection`, `title`, optional `slug`, `summary`, `imageUrl`, `href`, `badge`, `data`, `detail`, `categories: string[]`, `published`, `position`.
     - `ItemPatchSchema`: requires `version: z.number().int()`, plus partial update fields or `card`.
     - `CardInputSchema`: loosely typed object for legacy card inputs.
     - `CategoryInputSchema`: validates `name: z.string().min(1).max(100)`.
     - `CategoryPatchSchema`: `name?: string`, `sortOrder?: number`.
     - `ReorderSchema`: `z.object({ orderedIds: z.array(z.number().int()).min(1), collection: z.string().optional() })`.
     - `SettingsSchema`: `z.object({ ...known settings loosely typed... }).passthrough()`.
   - Byte-length guards:
     - Checks `JSON.stringify(payload).length` against `MAX_PAGEDATA_BYTES` (512 KB) and `MAX_ITEM_JSON_BYTES` (256 KB).

3. **HTML Sanitizer (`backend/src/lib/sanitize.ts`):**
   - Create `sanitizeRichHtml(html: string): string` using `sanitize-html`:
     - Allowed tags: `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `ul`, `ol`, `li`, `b`, `i`, `strong`, `em`, `strike`, `code`, `hr`, `br`, `div`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `blockquote`, `span`, `img`, `a`.
     - Allowed attributes: `href`, `name`, `target` on `a`; `src`, `alt`, `width`, `height`, `loading` on `img`; `class` on all tags.
     - Disallow: all `on*` event handlers, `javascript:` or `vbscript:` schemes.
   - Create recursive sanitizer helper `sanitizeItemPayload(item: any)` that sanitizes all `HTML_KEYS` (`detailContent`, `body`, `content`, `methodology`, `answer`) anywhere in `data` and `detail`.
   - Replace any remaining regex `<script\b[^<]*` replacements in `backend/src/routes/pages.routes.ts` with `sanitizeRichHtml`.

4. **Admin Routes (`backend/src/routes/admin-page-items.routes.ts`):**
   - Mount at `/api/admin/pages` using `verifyToken` and `requireAdmin` middleware.
   - Set `Cache-Control: no-store` on all responses.
   - Implement:
     - `GET /:pageId/items`: accepts `?collection=` and `?format=card`. Returns `200 { items: (ItemFull & { card?: object })[] }`.
     - `POST /:pageId/items`: accepts fields or `{ collection, card }`. Auto-slugifies title if slug missing. Returns 409 `slug_taken` on collision. Returns 400 `page_not_structured` if page is not structured. Inserts row and returns `201 ItemFull & { card }`.
     - `PATCH /:pageId/items/:itemId`: requires `version`. Optimistic lock: `updateMany({ where: { id, pageId, version }, data: { ..., version: { increment: 1 } } })`. If `count === 0`, re-read: return 404 if missing, 409 `{ error: 'version_conflict', current: ItemFull & { card } }` if exists.
     - If slug changed in PATCH: insert `SlugRedirect { fromPath: /<hub>/<old>, toPath: /<hub>/<new> }` and delete any redirects where `fromPath === toPath` (prevent loops).
     - `DELETE /:pageId/items/:itemId`: accepts optional `?version=N`. If version passed, enforces optimistic lock. Returns 204.
     - `PUT /:pageId/items/reorder`: accepts `{ collection, orderedIds: number[] }`. Validates that `orderedIds` matches collection IDs exactly. Rewrites `sortOrder` to `0..n-1` in transaction.
     - `GET /:pageId/categories`: returns `200 { categories: [{ id, name, slug, sortOrder, itemCount }] }`.
     - `POST /:pageId/categories`: accepts `{ name }`. Auto-slugifies. 409 on slug collision. Returns 201.
     - `PATCH /:pageId/categories/:id`: accepts `{ name?, sortOrder? }`. Renaming keeps item links. Returns 200.
     - `DELETE /:pageId/categories/:id`: deletes category row (cascades links). Returns 204.
     - `PUT /:pageId/categories/reorder`: accepts `{ orderedIds }`. Rewrites sortOrder. Returns 200.
     - Mount the new router in `backend/src/app.ts`: `app.use('/api/admin/pages', adminPageItemsRoutes);`.
     - Every mutation calls `afterContentWrite({ pageId, reason })`.

5. **Update Postman Collection:**
   - Update `postman/collections/campusmart-pages-api.json` to cover the full item lifecycle and deliberate 409 conflict request.

6. **Implement Test Suite (`backend/tests/admin-items/*.test.ts`):**
   - `backend/tests/admin-items/items-lifecycle.test.ts`:
     - CRUD: create with fields, create with card, list with format=card, patch, delete.
     - Round-trip fidelity between legacy card and database representation.
   - `backend/tests/admin-items/optimistic-locking.test.ts`:
     - Stale version returns 409 with `current`.
     - Concurrent PATCHes with same version: exactly one succeeds (200), one conflicts (409).
     - DELETE with stale version returns 409.
   - `backend/tests/admin-items/reorder.test.ts`:
     - Reordering items and categories; invalid ID sets return 400; sortOrder contiguous.
   - `backend/tests/admin-items/slugs-and-redirects.test.ts`:
     - Duplicate slug returns 409 `slug_taken`.
     - Slug update creates `SlugRedirect` and `GET /items/:oldSlug` returns `{ redirectTo }`.
     - Rename A->B then B->A eliminates loop.
   - `backend/tests/admin-items/categories.test.ts`:
     - CRUD; rename keeps links; delete removes links only; assigning new category auto-creates it.
   - `backend/tests/admin-items/validation-and-sanitizer.test.ts`:
     - Oversize payload returns 400.
     - Fast-check property test (200 runs): injected `<script>`, `onerror=`, `javascript:` stripped.
   - `backend/tests/admin-items/auth-guard.test.ts` (Invariant I8):
     - Every admin route returns 401 without token, 403 with standard non-admin token.
   - `backend/tests/admin-items/cms-write-hook.test.ts`:
     - Every admin write bumps `CmsState.version` by 1.

7. **Verify & Commit:**
   - All backend tests pass (`npm run test --prefix backend`).
   - TypeScript compiles cleanly (`npm run build --prefix backend`).
   - Searching `backend/src` for `<script\b[^<]*` finds 0 matches.
   - Commit with message:
     `T6: Admin item and category API with validation and locking`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-6-report.md`.

---

## Acceptance Criteria
- [ ] All tests pass (at least 30 new tests across admin items suites).
- [ ] Searching `backend/src` for `<script\b[^<]*` returns 0 matches.
- [ ] Optimistic locking (409 conflict detection) verified under concurrent execution.
- [ ] Auth guard (Invariant I8) verified on all admin routes (401/403).
- [ ] TypeScript compilation succeeds with 0 errors.
- [ ] Zero remote push strictly enforced (`git push` forbidden).
- [ ] Commit `T6: Admin item and category API with validation and locking` created.
