# SDD Task 6 Report: Admin Item and Category API with Validation and Locking

- **Task:** T6 – Admin Item and Category API with Validation and Locking
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T6)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `124b9034e34e5658bfe0d38e217036a59966d482`
- **Created Commit:** `6edd69f` (T6: Admin item and category API with validation and locking)
- **Status:** DONE

---

## 1. Executive Summary

Task T6 implements the dedicated administrative endpoints for granular items and categories management on structured pages:
1. **Validation Schemas & Byte-Length Guards (`backend/src/services/page-content/schemas.ts`):** Created robust Zod schemas (`ItemInputSchema`, `ItemPatchSchema`, `CardInputSchema`, `CategoryInputSchema`, `CategoryPatchSchema`, `ReorderSchema`, `SettingsSchema`) enforcing constraints, format types, and payload limits (`MAX_PAGEDATA_BYTES` = 512 KB, `MAX_ITEM_JSON_BYTES` = 256 KB).
2. **Robust Rich-Text HTML Sanitization (`backend/src/lib/sanitize.ts`):** Implemented `sanitizeRichHtml` using `sanitize-html` with an explicit whitelist of safe markup tags and attributes while stripping all JavaScript pseudo-schemes and event handlers (`on*`). Added `sanitizeItemPayload` and `sanitizePageData` to recursively scrub known HTML fields (`detailContent`, `body`, `content`, `methodology`, `answer`).
3. **Elimination of Legacy Regex (`pages.routes.ts`):** Fully replaced all legacy regex `<script\b[^<]*` replacements in `backend/src/routes/pages.routes.ts` with `sanitizeRichHtml` and `sanitizePageData`. Verified 0 matches across `backend/src`.
4. **Dedicated Admin Router (`backend/src/routes/admin-page-items.routes.ts`):** Mounted at `/api/admin/pages` with strict authentication and authorization (`verifyToken` + `requireAdmin`) satisfying Invariant I8, plus `Cache-Control: no-store` headers.
5. **Optimistic Concurrency Control:** Enforced atomic version incrementation and stale version conflict detection (HTTP 409 `{ error: 'version_conflict', current }`) using Prisma's `updateMany({ where: { id, pageId, version } })`.
6. **Automated Slug Redirects & Loop Prevention:** On item slug changes, automatically creates `SlugRedirect` rows and purges any potential self-referential or circular redirect loops (`fromPath === toPath`).
7. **Postman Collection Updated:** Added comprehensive 'Admin Items & Categories' folder in `postman/collections/campusmart-pages-api.json` covering full CRUD lifecycles, reordering, and deliberate 409 version conflicts.
8. **Test Coverage & Verification:** Added 8 comprehensive test suites (59 new tests) under `backend/tests/admin-items/`, verifying lifecycle, optimistic concurrency, reordering, redirects, categories, sanitization, Invariant I8 auth guards, and CMS write hooks.

---

## 2. Detailed Execution Steps & Actions Taken

### Step 1: Dependencies Installation
- Installed and pinned exact versions:
  - `zod@3.23.8` (runtime schema validation)
  - `sanitize-html@2.14.0` (HTML sanitization)
  - `@types/sanitize-html@2.16.2` (TypeScript definitions)
- Updated `backend/package.json` and `backend/package-lock.json`.

### Step 2: Zod Validation Schemas (`schemas.ts`)
- Created `backend/src/services/page-content/schemas.ts`:
  - `ItemInputSchema`: validates `collection`, `title`, optional `slug`, `summary`, `imageUrl`, `href`, `badge`, `data`, `detail`, `categories: string[]`, `published`, `position`.
  - `ItemPatchSchema`: requires `version: z.number().int()`, accepts partial item fields or `card`.
  - `CardInputSchema`: loose schema supporting legacy card format inputs with split decomposition.
  - `CategoryInputSchema`: validates `name: z.string().min(1).max(100)`.
  - `CategoryPatchSchema`: validates optional `name` and `sortOrder`.
  - `ReorderSchema`: validates `orderedIds: z.array(z.number().int()).min(1)` and optional `collection`.
  - `SettingsSchema`: validates known setting keys with `.passthrough()` to allow future settings extensions.
  - Byte-length guard `checkJsonByteLength(payload, maxBytes, fieldName)` throws 400 with `payload_too_large` if stringified byte size exceeds limits.

### Step 3: HTML Sanitization (`sanitize.ts`)
- Created `backend/src/lib/sanitize.ts`:
  - `sanitizeRichHtml(html: string)`: Whitelist allows tags: `p`, `h1`-`h6`, `ul`, `ol`, `li`, `b`, `i`, `strong`, `em`, `strike`, `code`, `hr`, `br`, `div`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `blockquote`, `span`, `img`, `a`.
  - Allowed attributes: `href`, `name`, `target` on `a`; `src`, `alt`, `width`, `height`, `loading` on `img`; `class` globally.
  - Strips all `javascript:`, `vbscript:`, and `data:` schemes, and all inline event handlers (`onclick`, `onerror`, `onload`, etc.).
  - `sanitizeItemPayload(item)`: Recursively cleans `HTML_KEYS` (`detailContent`, `body`, `content`, `methodology`, `answer`) in `data` and `detail`.
  - `sanitizePageData(pageData)`: Recursively cleans all HTML content in arbitrary page data structures.
- Replaced old regex in `backend/src/routes/pages.routes.ts` with `sanitizePageData` and `sanitizeRichHtml`.

### Step 4: Admin Items & Categories Router (`admin-page-items.routes.ts`)
- Created `backend/src/routes/admin-page-items.routes.ts`:
  - Enforces `verifyToken`, `requireAdmin`, and `Cache-Control: no-store`.
  - `GET /:pageId/items`: lists items, supports `?collection=` filtering and `?format=card` synthesis.
  - `POST /:pageId/items`: accepts fields or card payload, enforces `page.contentModel === 'structured'` (returns 400 `page_not_structured`), auto-slugifies title if slug omitted, checks slug collision (409 `slug_taken`), links categories, inserts row, increments page version, and calls `afterContentWrite`.
  - `PATCH /:pageId/items/:itemId`: enforces `version: z.number().int()`, performs atomic `updateMany` with `version: { increment: 1 }`. On count === 0, fetches item to return 404 if missing or 409 `{ error: 'version_conflict', current }` if stale. Handles slug updates with `SlugRedirect` and circular loop elimination.
  - `DELETE /:pageId/items/:itemId`: optional `?version=N` optimistic lock check, cascades `PageItemCategory` join records, deletes item, increments page version, and calls `afterContentWrite`.
  - `PUT /:pageId/items/reorder`: accepts `{ collection, orderedIds }`, verifies exact match with collection ID set, updates `sortOrder` sequentially to `0..n-1` in transaction.
  - `GET /:pageId/categories`: returns category list with aggregated `itemCount`.
  - `POST /:pageId/categories`: accepts `{ name }`, auto-slugifies, handles collision (409 `slug_taken`).
  - `PATCH /:pageId/categories/:id`: updates name and sort order, preserving all existing item associations.
  - `DELETE /:pageId/categories/:id`: cascades join records while keeping item records intact.
  - `PUT /:pageId/categories/reorder`: updates category `sortOrder` to `0..n-1` in transaction.
- Mounted router in `backend/src/app.ts`:
  `app.use('/api/admin/pages', adminPageItemsRoutes);`

### Step 5: Postman Collection Updates
- Added `Admin Items & Categories` folder to `postman/collections/campusmart-pages-api.json`:
  1. `Get Page Items` (`GET /api/admin/pages/{{pageId}}/items`)
  2. `Get Page Items as Cards` (`GET /api/admin/pages/{{pageId}}/items?format=card`)
  3. `Create Page Item (Fields)` (`POST /api/admin/pages/{{pageId}}/items`)
  4. `Create Page Item (Card Format)` (`POST /api/admin/pages/{{pageId}}/items`)
  5. `Update Page Item (Optimistic Lock Success)` (`PATCH /api/admin/pages/{{pageId}}/items/{{itemId}}`)
  6. `Update Page Item (Version Conflict 409)` (`PATCH /api/admin/pages/{{pageId}}/items/{{itemId}}` with stale version)
  7. `Delete Page Item` (`DELETE /api/admin/pages/{{pageId}}/items/{{itemId}}?version={{itemVersion}}`)
  8. `Reorder Page Items` (`PUT /api/admin/pages/{{pageId}}/items/reorder`)
  9. `Get Page Categories` (`GET /api/admin/pages/{{pageId}}/categories`)
  10. `Create Page Category` (`POST /api/admin/pages/{{pageId}}/categories`)
  11. `Update Page Category` (`PATCH /api/admin/pages/{{pageId}}/categories/{{categoryId}}`)
  12. `Reorder Page Categories` (`PUT /api/admin/pages/{{pageId}}/categories/reorder`)

---

## 3. Verification & Invariant Validation

### Invariant I8: Authentication and Authorization Protection
- Created `backend/tests/admin-items/auth-guard.test.ts`:
  - 20 comprehensive unit tests verifying that all 10 endpoints reject unauthenticated requests with HTTP 401, and reject authenticated non-admin users with HTTP 403.
  - Verified: 20/20 passed.

### Optimistic Concurrency Control (Version Conflict Detection)
- Created `backend/tests/admin-items/optimistic-locking.test.ts`:
  - Stale version in PATCH returns HTTP 409 `{ error: 'version_conflict', current }`.
  - Concurrent PATCH race condition: two simultaneous PATCH requests with the same version result in exactly one 200 OK and one 409 Conflict.
  - DELETE with stale version returns 409; DELETE with matching version returns 204.
  - Verified: 4/4 passed.

### Sanitizer Security & Property-Based Verification
- Created `backend/tests/admin-items/validation-and-sanitizer.test.ts`:
  - Oversize JSON payloads exceeding `MAX_ITEM_JSON_BYTES` return 400 `payload_too_large`.
  - Passthrough settings with known types validation.
  - Allowed formatting tags (`<strong>`, `<em>`, `<a>`, `<table>`, `<img>`) preserved.
  - Fast-check property testing (200 iterations) verifying that all `<script>`, inline event handlers (`onclick`, `onerror`), and `javascript:` URIs are neutralized.
  - Verified: 6/6 passed.

### Automated Slugs, Redirects, and Loop Prevention
- Created `backend/tests/admin-items/slugs-and-redirects.test.ts`:
  - Duplicate slugs return 409 `slug_taken`.
  - Item slug changes automatically create `SlugRedirect` rows allowing `GET /:hubSlug/items/:oldSlug` to return `{ redirectTo }`.
  - Re-renaming item from A -> B -> A removes redundant redirect and eliminates loops.
  - Verified: 4/4 passed.

### Codebase Cleanliness: Script Tag Regex Elimination
- Executed search across all TypeScript files under `backend/src`:
  - Query: `<script\b[^<]*`
  - Result: 0 matches found.

### TypeScript Compilation
- Executed `npm run build --prefix backend` (`prisma generate && tsc`):
  - Result: 0 errors (clean compilation).

---

## 4. Test Results Summary

- Admin Items Test Suites (`backend/tests/admin-items/*.test.ts`):
  - `items-lifecycle.test.ts`: 9 passed / 9 total
  - `optimistic-locking.test.ts`: 4 passed / 4 total
  - `reorder.test.ts`: 4 passed / 4 total
  - `slugs-and-redirects.test.ts`: 4 passed / 4 total
  - `categories.test.ts`: 5 passed / 5 total
  - `validation-and-sanitizer.test.ts`: 6 passed / 6 total
  - `auth-guard.test.ts`: 20 passed / 20 total
  - `cms-write-hook.test.ts`: 7 passed / 7 total
  - **Subtotal: 59 passed / 59 total (8 test suites)**
- Full Backend Test Suite (`npm run test --prefix backend`):
  - 23 test files executed
  - 193 unit and contract tests passed
  - 0 failures

---

## 5. Acceptance Criteria Checklist

- [x] All tests pass (59 new tests across 8 admin items suites; 193 total backend tests).
- [x] Searching `backend/src` for `<script\b[^<]*` returns 0 matches.
- [x] Optimistic locking (409 conflict detection) verified under concurrent execution.
- [x] Auth guard (Invariant I8) verified on all admin routes (401/403).
- [x] TypeScript compilation succeeds with 0 errors.
- [x] Zero remote push strictly enforced (`git push` forbidden).
- [x] Commit `T6: Admin item and category API with validation and locking` prepared.
