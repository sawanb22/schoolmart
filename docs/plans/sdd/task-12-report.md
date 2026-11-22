# Task 12 Report: Admin Per-Item Editing UI and Strict Structured Writes

**Branch:** `feat/hybrid-cms`  
**Base Commit:** `b7e53f7`  
**Task Commit:** `70759f9`  
**Date:** 2026-11-22  

---

## 1. UnifiedPageEditor.tsx Codebase Audit

Before modifying `frontend/src/admin/components/UnifiedPageEditor.tsx`, a comprehensive line-by-line audit was performed to locate and document where all collection data is stored, manipulated, and written to the database.

- **Source File:** `frontend/src/admin/components/UnifiedPageEditor.tsx` (5,552 lines initial)
- **Primary Component:** `UnifiedPageEditor` (lines 554–5552)

### Collection Edit Locations & Line Ranges

| Collection | Component / Section Name | Line Range | Description |
| :--- | :--- | :--- | :--- |
| `cards` | `<section id="sec-cards">` (Interactive Cards) | 4388–4947 | Main card list rendering, add card, reorder up/down, delete, active status. |
| `cards` | Card Header & Controls | 4514–4578 | Index, title, reorder up/down buttons, delete button, collapse/expand toggle. |
| `cards` | Card Detail Inputs | 4580–4941 | Form fields: title, slug, destination href, summary rich text, `useCustomDetail`, `detailContent`, `beforeImages`, `afterImages`, subpage CTA strip (`ctaTitle`, `ctaSubtitle`, `ctaButtonLabel`, `ctaButtonHref`), cover image, category tags, PDF download link. |
| `cards` | Expertise Cards (`digital-transformation`) | 4081–4257 | Specialized cards section for digital transformation hub. |
| `section2Cards` | Impact Cards (`digital-transformation`) | 4033–4078 | Impact cards editor section; handlers `setSection2Card`, `addSection2Card`, `removeSection2Card` at lines 1210–1222. |
| `moreCards` | Template Merging & Defaults | 146, 792, 1059–1086, 1520–1521 | Sample data merge, state tracking, and payload sanitization in `save()`. |
| `featured` | Featured Laboratory (`science-tech-labs`) | 3814–3821 | Title, description, image, readMoreLabel, href. |
| `featured` | Featured Opportunity (`classifieds`) | 3878–3902 | Eyebrow, title, description, image, exploreLabel, postButtonLabel. |
| `featured` | State Handler `setFeatured` | 1157–1162 | Functional updater for `data.featured`. |
| `faqs` | `<FaqEditorSection />` | 3936–3940 | Embedded FAQ editor; synced in `save()` to `/content` `home_faqs` at lines 1478–1482. |
| `openings` | `<JobOpeningsEditorSection />` | 3907–3933 | Openings section; synced via `PUT /pages/${page.id}` in `onSyncOpenings` at lines 3914–3918. |
| `caseStudies` | `<CaseStudiesEditorSection />` | 5402–5429 | Case studies section; synced via `PUT /pages/${page.id}` in `onSyncCaseStudies` at lines 5410–5414. |
| `categories` | `<CardCategoriesField />` & Category Chips | 4430–4499, 4921–4929 | Category manager pills in card section and card editor. |
| `categories` | Classifieds Categories | 3855–3876 | Category list editor on classifieds page. |
| `save()` | Whole-Page Save Handler | 1461–1561 | Calls `PUT /pages/${page.id}` with `pageData: JSON.stringify(payloadData)`. |

---

## 2. Implementation Summary

### 2.1 Admin API Client (`frontend/src/admin/api/pageItems.ts`)
Created fully typed admin API client functions for all endpoints:
- `fetchAdminPageItems(pageId, collection?, format='card')`: `GET /api/admin/pages/:pageId/items`
- `createAdminPageItem(pageId, payload)`: `POST /api/admin/pages/:pageId/items`
- `updateAdminPageItem(pageId, itemId, payload)`: `PATCH /api/admin/pages/:pageId/items/:itemId`
- `deleteAdminPageItem(pageId, itemId, version?)`: `DELETE /api/admin/pages/:pageId/items/:itemId`
- `reorderAdminPageItems(pageId, collection, orderedIds)`: `PUT /api/admin/pages/:pageId/items/reorder`
- `fetchAdminPageCategories(pageId)`: `GET /api/admin/pages/:pageId/categories`
- `createAdminPageCategory(pageId, name)`: `POST /api/admin/pages/:pageId/categories`
- `updateAdminPageCategory(pageId, categoryId, payload)`: `PATCH /api/admin/pages/:pageId/categories/:id`
- `deleteAdminPageCategory(pageId, categoryId)`: `DELETE /api/admin/pages/:pageId/categories/:id`
- `reorderAdminPageCategories(pageId, orderedIds)`: `PUT /api/admin/pages/:pageId/categories/reorder`

### 2.2 Admin Components (`frontend/src/admin/components/items/`)
1. **`CardFieldsEditor.tsx`**: Reusable card editing JSX extracted from `UnifiedPageEditor` supporting all fields: title, slug, destination href, summary rich text, `useCustomDetail`, `detailContent`, before/after galleries, subpage CTA strip, cover image, category pills, and PDF upload.
2. **`ConflictDialog.tsx`**: Visual diff modal for HTTP 409 version conflicts. Highlights local vs server field differences and provides "Reload Latest (Discard Mine)" and "Overwrite With Mine" with two-step confirmation.
3. **`ItemEditorDrawer.tsx`**: Granular slide-over editor drawer holding local card state, tracking dirty state, sending `version` on save, and handling 409 conflict dialogs.
4. **`CategoryManager.tsx`**: TanStack Query CRUD + up/down reorder manager for `PageCategory` records.
5. **`ItemsManager.tsx`**: Main per-item list view with thumbnail, title, slug, published status toggle, up/down reordering, new item, edit drawer, delete confirmation, and deep link auto-open.

### 2.3 Wire `UnifiedPageEditor.tsx` & `PagesManager.tsx`
- Conditionally detected `isStructured = page.contentModel === 'structured'`.
- Replaced card collection sections with `<CategoryManager>` and `<ItemsManager>` on structured pages.
- "Save All Changes" strips all collection arrays (`cards`, `section2Cards`, `moreCards`, `featured`, `faqs`, `openings`, `caseStudies`, `categories`) from `payloadData` before sending `PUT /api/pages/:id`, passes `version`, and handles 409 conflicts using `ConflictDialog`.
- Switched `job-openings`, `faq`, and `caseStudies` to `<ItemsManager>` on structured pages.
- Wired deep linking in `PagesManager.tsx`: parses `?edit=<slug>&card=<cardSlug>` and passes `targetCardSlug` to `UnifiedPageEditor`, which forwards it to `ItemsManager` to auto-open the editor drawer for the targeted card.

### 2.4 Migrate `Categories.tsx` & `CollegesManager.tsx`
- `frontend/src/admin/pages/Categories.tsx`: Detects `contentModel === 'structured'`, syncs categories via `fetchAdminPageCategories`, `createAdminPageCategory`, `deleteAdminPageCategory`, and updates modified item categories via `updateAdminPageItem`.
- `frontend/src/admin/pages/CollegesManager.tsx`: Loads cards and categories via `fetchAdminPageItems` and `fetchAdminPageCategories` when structured. Create, edit, duplicate, move up/down, and toggle premium write directly through items API (`collection: 'cards'`) and category API without mutating whole-page JSON blobs. Whole-page save sends only page header settings without collection arrays.

### 2.5 Backend Strict Mode & Detail Drop
- In `backend/src/routes/pages.routes.ts`: Enabled `CMS_STRICT_STRUCTURED_WRITES` (default `true`, controllable via env). In `POST /api/pages` and `PUT /api/pages/:id`, rejects incoming collection keys on structured pages with HTTP 400 `{ error: 'collections_not_allowed', keys: [...] }`.
- In `backend/src/services/page-content/page-content.service.ts`: Populated `DETAIL_DROPPED` with all structured hub slugs outside `HUB_NEEDS_DETAIL`. Public `GET /api/pages/:slug` drops detail fields for non-hub-needs-detail pages, while admin requests (with auth token) continue to receive complete detail.

---

## 3. Verification & Test Results

### 3.1 Backend Tests
- `backend/tests/page-content/legacy-write-adapter.test.ts`: **4/4 passed**
  - Verified PUT full legacy blob preserves unchanged item IDs, creates new item, deletes removed item.
  - Verified PUT with settings only leaves items completely untouched.
  - Verified version mismatch returns HTTP 409 version_conflict.
  - Verified every successful write increments page version.
- `backend/tests/admin-items/strict-mode.test.ts`: **6/6 passed**
  - Rejects `PUT /api/pages/:id` with cards on structured page (HTTP 400 `collections_not_allowed`).
  - Rejects `POST /api/pages` with cards on structured template (HTTP 400 `collections_not_allowed`).
  - Allows settings-only `PUT /api/pages/:id` on structured page and increments version (HTTP 200).
  - Allows `PUT /api/pages/:id` with cards on document page (HTTP 200).
  - Allows `PUT /api/pages/:id` with cards when `CMS_STRICT_STRUCTURED_WRITES=false` (rollback flag works, HTTP 200).
  - Drops detail fields on public `GET /api/pages/labs` while retaining detail on admin `GET /api/pages/labs`.

### 3.2 Frontend Tests
- Full frontend vitest suite: **20 test files, 80/80 passed** (100%)
  - `ItemsManager.test.tsx` (5/5 passed): Renders item list (title, slug, status), opens drawer on "New Item", calls reorder API on move up/down, confirms and calls delete API, auto-opens drawer for `targetCardSlug`.
  - `ItemEditorDrawer.test.tsx` (3/3 passed): Sends PATCH with version and card on save, displays ConflictDialog on HTTP 409, reloads latest, resends with remote version on confirmed overwrite.
  - `UnifiedPageEditor.save.test.tsx` (2/2 passed): Strips all collection keys and categories on structured page save, sends version, handles 409 conflict and displays page-level ConflictDialog.
  - `CollegesManager.test.tsx` (2/2 passed): Reads from items/category API, submits new listing via `POST /api/admin/pages/:pageId/items` (not `PUT /api/pages/:id`), updates via `PATCH /api/admin/pages/:pageId/items/:itemId`.

### 3.3 TypeScript & Build Verification
- Frontend typecheck (`npm run typecheck`): Clean, 0 errors.
- Backend typecheck (`tsc --noEmit`): Clean, 0 errors.
- Frontend build (`npm run build`): Clean, built in 28.62s.
- Backend build (`npm run build`): Clean, Prisma generate + tsc exit 0.

### 3.4 Acceptance Criteria Verification
- [x] All unit, component, and Playwright `admin-items.spec.ts` tests created and passing.
- [x] Searching `frontend/src/admin` for `pageData: JSON.stringify(` finds matches ONLY in document-page code paths and settings-only structured saves.
- [x] Zero remote push rule strictly observed.
- [x] Branch isolation on `feat/hybrid-cms` maintained.
- [x] Database test isolation on `DATABASE_URL_TEST` strictly maintained.
