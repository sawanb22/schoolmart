# SDD Task Brief: T8 – HTTP Performance: Compression, Caching, ETag, Resolve Endpoint

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T8)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-8-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `1ecbbe90c68ab015c92843efc6b81efba6aaae39`

---

## Objective
Implement HTTP response compression (`compression`), shared multi-process caching across Phusion Passenger workers (`cms-cache.ts` using `lru-cache` tied to database `CmsState.version` with 1000 ms memoization), ETag generation with HTTP 304 Not Modified support, and the unified path resolution endpoint (`GET /api/pages/resolve`) resolving dynamic routes in <= 3 database queries.

---

## Detailed Steps

1. **Install Dependencies:**
   - In `backend`: ensure `compression`, `@types/compression`, `lru-cache` are installed and pinned (`npm install compression lru-cache --prefix backend; npm install -D @types/compression --prefix backend`).

2. **Add HTTP Compression:**
   - In `backend/src/app.ts`:
     - Add `app.use(compression())` after `helmet` and before route handlers.

3. **Shared Multi-Process Cache Module (`backend/src/services/cms-cache.ts`):**
   - In-process LRU cache (`new LRUCache<string, { version: number; etag: string; body: any; contentType: string }>({ max: 500 })`).
   - `getCmsVersion(options?: { clock?: () => number }): Promise<number>`:
     - Reads `CmsState.version` (id: 1) from database.
     - Memoizes in-process for 1000 ms.
     - Supports clock injection for deterministic time testing.
   - `bumpCmsVersion(tx?: Prisma.TransactionClient): Promise<number>`:
     - Updates `CmsState` singleton, incrementing `version: { increment: 1 }`.
   - `publicCmsCache()` middleware factory:
     - Generates deterministic weak ETag: `W/"cms-<version>-<sha1(originalUrl).slice(0, 12)>"`.
     - Sets `Cache-Control: public, no-cache`.
     - Removes `Pragma` and `Expires` response headers.
     - Checks `If-None-Match`: if matches current ETag, returns HTTP 304 with no body and zero database query beyond the version check.
     - If request contains `Authorization` header, bypasses LRU cache (still returns `no-cache` and ETag).
     - Non-CMS routes under `/api` keep `Cache-Control: no-store`.

4. **Apply Cache Middleware to Public CMS Routes:**
   - Attach `publicCmsCache` to:
     - `GET /api/content` (in `content.routes.ts`)
     - `GET /api/pages/:idOrSlug` (legacy and `v=2`)
     - `GET /api/pages/:slug/items/:itemSlug`
     - `GET /api/pages/resolve`
     - `GET /api/pages/hub/catalog`
     - `GET /api/pages/published`
   - Ensure all auth, admin, orders, products, and wishlist routes strictly preserve `no-store`.

5. **Path Resolution Endpoint (`GET /api/pages/resolve`):**
   - Implement `resolvePath(pathStr: string, options?: { isAdmin?: boolean })` in `backend/src/services/page-content/page-content.service.ts`:
     - Normalizes path: lowercase, strip trailing slash, treat leading `/p/` as `/`.
     - **One Segment `/s`:**
       - Performs candidates lookup in ONE `findMany({ where: { slug: { in: [s, alias(s), `guide-${s}`, `environment-${s}`, `resource-${s}`] } } })` plus one `findUnique` on `slugredirect`.
       - Resolution precedence:
         1. `SlugRedirect` where `fromPath === /s` -> returns `{ type: 'redirect', redirectTo: toPath }`.
         2. Published page with slug `s` -> returns `{ type: 'page', slug: s, template, contentModel, page: toLegacyPageResponse(page) }`.
         3. Alias of `s` (`sports` <-> `sports-infra`, `sell-on-schoolmart` <-> `sell-on-campusmart`).
         4. Prefix candidate: `guide-s`, then `environment-s`, then `resource-s`.
         5. Otherwise -> HTTP 404 `{ type: 'not_found' }`.
     - **Two Segments `/h/i`:**
       1. `SlugRedirect` for `/h/i` -> `{ type: 'redirect', redirectTo }`.
       2. Standalone page `h-i` -> `{ type: 'page', slug: 'h-i', ... }`.
       3. Standalone page `i` -> `{ type: 'page', slug: i, ... }`.
       4. Hub `h` (alias-aware) with published item `i` -> `{ type: 'item', hubSlug, itemSlug: canonicalSlug, hubTemplate }`.
       5. Hub `h` exists but no matching item -> `{ type: 'item', hubSlug, itemSlug: null, hubTemplate }`.
       6. Otherwise -> HTTP 404 `{ type: 'not_found' }`.
     - Guarantees <= 3 database queries per resolution.
   - Mount `GET /resolve` in `backend/src/routes/pages.routes.ts` **BEFORE** `/:idOrSlug`.

6. **Implement Test Suite:**
   - `backend/tests/http/compression.test.ts`:
     - `GET /api/pages/labs` with `Accept-Encoding: gzip` returns `content-encoding: gzip`.
   - `backend/tests/http/cache.test.ts`:
     - First GET returns 200 with ETag and `cache-control: public, no-cache`.
     - Second GET with `If-None-Match` returns 304 with empty body.
     - Admin mutation invalidates ETag (next GET returns 200 with updated content).
     - Multi-process simulation: raw SQL bump of `cmsstate.version` + clock advance > 1000 ms serves fresh content.
     - `Authorization` header bypasses LRU cache.
     - Auth, admin, and wishlist routes return `no-store`.
   - `backend/tests/pages/resolve.test.ts`:
     - Tests all single-segment rules (exact, prefixes, aliases, redirect, /p/).
     - Tests all two-segment rules (`h-i`, standalone `i`, hub item, hub missing item, 404).
     - Asserts database query count <= 3 per resolution.

7. **Verify & Commit:**
   - All backend tests pass (`npm run test --prefix backend`).
   - TypeScript compiles cleanly (`npm run build --prefix backend`).
   - Commit with message:
     `T8: HTTP performance: compression, caching, ETag, resolve endpoint`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-8-report.md`.

---

## Acceptance Criteria
- [ ] Compression returns `content-encoding: gzip` on accepted requests.
- [ ] Cache returns ETag, `public, no-cache`, and 304 Not Modified on matching `If-None-Match`.
- [ ] Multi-process cache synchronization verified via SQL version bump and clock advancement.
- [ ] `/api/pages/resolve` endpoint correctly resolves single and two-segment routes in <= 3 queries.
- [ ] All backend tests pass cleanly.
- [ ] TypeScript compilation succeeds with 0 errors.
- [ ] Zero remote push strictly enforced (`git push` forbidden).
- [ ] Commit `T8: HTTP performance: compression, caching, ETag, resolve endpoint` created.
