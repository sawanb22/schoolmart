# Task T16 Report: SEO – Metadata, Sitemap, Robots

- **Task Reference:** Task T16 (`docs/plans/sdd/task-16-brief.md`, Section 3.7.2 of `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md`)
- **Repository Root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `7f7b733`
- **Commit:** `c559ae3` (`T16: SEO: metadata, sitemap, robots`)
- **Review Package Diff:** `docs/plans/sdd/task-16-review-package.diff`
- **Status:** PENDING REVIEW

---

## 1. Executive Summary

Task T16 equips the Hybrid CMS platform with complete, search-engine-ready SEO infrastructure:
1. **React 19 Native Document Metadata Hoisting:** Built `<Seo>` component in `frontend/src/components/seo/Seo.tsx` and `usePageSeo` hook in `frontend/src/hooks/usePageSeo.ts` to hoist `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:*`, `twitter:card`, and `<meta name="robots" content="noindex, nofollow">` directly through React 19's native document metadata hoisting mechanism.
2. **Public Route Coverage:** Mounted `<Seo>` across all CMS renderers (`SolutionPageRenderer`, `ServicePageRenderer`, `GenericPageRenderer`, `ServiceDetailPage`, `UniversalArticleDetail`), bespoke hubs (`science-tech-labs`, `smart-classrooms`, `partner-with-colleges`, `furniture`, `faq`), homepage (`home.tsx`), and private/static utility routes (`/admin/*`, `/login`, `/registration`, `/my-account`, `/not-found`).
3. **Admin SEO Controls & Character Counters:** Added collapsible SEO sections with live character counters (60 for title, 160 for description) in `UnifiedPageEditor` (page settings) and `ItemEditorDrawer` (structured card items).
4. **Automated Root `/sitemap.xml` Endpoint:** Created `/sitemap.xml` route in `backend/src/routes/seo.routes.ts` mounted at root in `app.ts` with `publicCmsCache()`, filtering published pages and structured card items while excluding `home`, `test-*`, `draft-*`, and `noindex` records.
5. **Atomic Sitemap Sync for cPanel:** Implemented debounced atomic filesystem sync (`SITEMAP_WRITE_PATH`) in `backend/src/services/sitemap.service.ts` wired to `afterContentWrite` with zero-throw error resilience.
6. **Robots Policy:** Deployed `frontend/public/robots.txt` disallowing `/admin`, `/my-account`, `/login`, `/register`, `/registration` and pointing to `https://campusmart.in/sitemap.xml`.

---

## 2. Detailed Implementation

### Step 1: Settings & Item Fields Schema Updates
- **Validation Schemas:**
  - In `backend/src/services/page-content/schemas.ts`:
    - Updated `SettingsSchema` with optional `seoTitle?: string`, `seoDescription?: string`, `ogImage?: string`, `noindex?: boolean`.
    - Created `ItemSeoSchema = z.object({ title: z.string().optional(), description: z.string().optional(), ogImage: z.string().optional(), noindex: z.boolean().optional() })` and added `seo?: ItemSeoSchema` to item `data`.
  - Added compatibility modules `backend/src/validation/page-settings.schema.ts` and `backend/src/validation/item.schema.ts`.
- **Admin UI Character Counters:**
  - In `frontend/src/admin/components/UnifiedPageEditor.tsx`:
    - Added collapsible "🌐 SEO & Social Sharing" card with character counters (`${title.length}/60`, `${desc.length}/160`) with visual threshold warnings (`text-amber-500` / `text-red-500`), and quick-jump anchor pill `🌐 SEO`.
  - In `frontend/src/admin/components/items/ItemEditorDrawer.tsx`:
    - Added collapsible "SEO & Social Sharing" section in item drawer with character counters (60 for SEO Title, 160 for SEO Description), OG Image URL, and `noindex` checkbox.

### Step 2: `<Seo>` Component & `usePageSeo` Hook
- **`<Seo>` Component (`frontend/src/components/seo/Seo.tsx`):**
  - Uses React 19 document metadata hoisting (`<title>`, `<meta>`, `<link>`) rendered into `<head>`.
  - Title formatting: Appends ` | CampusMart` unless title already contains `CampusMart`.
  - Description formatting: Strips HTML/markdown tags, collapses whitespace, and truncates to 160 characters at a word boundary with `...`.
  - Canonical URL: Resolves `${SITE_URL}/${cleanPath}` (default `https://campusmart.in`).
  - OpenGraph & Twitter Cards: Renders `og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
  - Robots: When `noindex: true`, outputs `<meta name="robots" content="noindex, nofollow" />`.
- **`usePageSeo` Hook (`frontend/src/hooks/usePageSeo.ts`):**
  - Resolves hierarchical title fallback: `settings.seoTitle -> settings.heroTitle -> settings.title -> fallbackTitle -> 'CampusMart'`.
  - Resolves hierarchical description fallback: `settings.seoDescription -> settings.heroSubtitle -> fallbackDescription -> ''`.
  - Resolves image: `settings.ogImage -> settings.heroImage -> settings.featuredImage -> fallbackImage`.
  - Resolves `noindex`: `Boolean(settings.noindex)`.

### Step 3: Mounted `<Seo>` Across Public Routes
- **Solution Hubs & Pages:**
  - `frontend/src/components/cms/SolutionPageRenderer.tsx`
  - `frontend/src/components/cms/ServicePageRenderer.tsx`
  - `frontend/src/components/cms/GenericPageRenderer.tsx` (article and standard grid paths)
  - `frontend/src/components/cms/ServiceDetailPage.tsx`
  - `frontend/src/components/cms/UniversalArticleDetail.tsx` (and `article-view-model.ts`)
- **Bespoke Hub Pages:**
  - `frontend/src/pages/science-tech-labs.tsx`
  - `frontend/src/pages/smart-classrooms.tsx`
  - `frontend/src/pages/partner-with-colleges.tsx`
  - `frontend/src/pages/furniture.tsx`
  - `frontend/src/pages/faq.tsx`
- **Homepage:**
  - `frontend/src/pages/home.tsx`
- **Static & Utility Pages:**
  - `frontend/src/pages/login.tsx` (`noindex`)
  - `frontend/src/pages/registration.tsx` (`noindex`)
  - `frontend/src/pages/my-account.tsx` (`noindex`)
  - `frontend/src/pages/not-found.tsx` (`noindex`)
  - `frontend/src/admin/AdminRoutes.tsx` (`noindex` for admin panel routes)

### Step 4: Root `/sitemap.xml` Endpoint
- **Service (`backend/src/services/sitemap.service.ts`):**
  - `generateSitemapXml()` queries published `Page` and `PageItem` records.
  - Excludes `home`, slugs with prefix `test-*` and `draft-*`, and records with `noindex === true`.
  - Outputs `<loc>` and `<lastmod>` (`YYYY-MM-DD`).
  - Escapes XML entities (`&`, `<`, `>`, `"`, `'`).
  - Includes root `<loc>https://campusmart.in/</loc>`.
- **Routes & Middleware (`backend/src/routes/seo.routes.ts`):**
  - Mounted at root `/sitemap.xml` in `backend/src/app.ts` (before `/api` so caching headers are not overridden).
  - Returns `Content-Type: application/xml; charset=utf-8`.
  - Applies `publicCmsCache()` middleware (`Cache-Control: public, no-cache`, ETag, 304 support).

### Step 5: Optional Atomic Sitemap File Sync
- **Atomic File Writing (`writeSitemapFileAtomic`):**
  - Generates XML and writes to `<targetPath>.tmp.<pid>.<timestamp>` in target directory.
  - Renames atomically into `SITEMAP_WRITE_PATH`.
  - Never throws; catches and logs warnings without disrupting content writes.
- **Hook Integration (`afterContentWrite`):**
  - Calls `scheduleSitemapSync(10000)` debounced by 10s when `process.env.SITEMAP_WRITE_PATH` is configured.

### Step 6: Crawl Policy (`frontend/public/robots.txt`)
- Created `frontend/public/robots.txt`:
  ```txt
  User-agent: *
  Disallow: /admin
  Disallow: /my-account
  Disallow: /login
  Disallow: /register
  Disallow: /registration
  Sitemap: https://campusmart.in/sitemap.xml
  ```

---

## 3. Verification & Test Results

### 1. Backend Vitest Suite
```bash
npm test --prefix backend
```
- **Result:** `37 passed (37 test files)`
- **Tests:** `248 passed (248 tests)`
- **Sitemap Suite (`backend/tests/seo/sitemap.test.ts`):** 9/9 tests passed
  - `produces valid XML structure with urlset and root URL` (PASS)
  - `includes published pages and structured card items` (PASS)
  - `excludes unpublished pages, unpublished items, test-*, draft-*, home, and noindex entities` (PASS)
  - `escapes XML special characters in URLs correctly` (PASS)
  - `serves sitemap at root /sitemap.xml with correct headers` (PASS)
  - `handles conditional requests with If-None-Match (304)` (PASS)
  - `writeSitemapFileAtomic writes atomically to destination file` (PASS)
  - `writeSitemapFileAtomic returns false gracefully without throwing if path is invalid` (PASS)
  - `afterContentWrite triggers scheduleSitemapSync when SITEMAP_WRITE_PATH is set` (PASS)

### 2. Frontend Vitest Suite
```bash
npm test --prefix frontend -- --run
```
- **Result:** `26 passed (26 test files)`
- **Tests:** `123 passed (123 tests)`
- **SEO Component Suite (`frontend/src/components/seo/__tests__/Seo.test.tsx`):** 15/15 tests passed
  - Document title formatting, suffixing, and deduplication
  - Canonical URL resolution and normalizing
  - 160-char word-boundary description truncation with ellipsis
  - HTML tag removal from description
  - OpenGraph & Twitter Card tags
  - `noindex` robots tag rendering
  - `usePageSeo` hierarchical fallback resolution

### 3. Frontend Typecheck
```bash
npm run typecheck --prefix frontend
```
- **Result:** 0 errors (`tsc -p tsconfig.app.json --noEmit` exited with code 0).

### 4. Frontend Production Build & Bundle Budget
```bash
npm run build --prefix frontend
```
- **Vite Build:** Clean production build completed in 17.37s.
- **Bundle Budget Target:** <= 170.00 KB Gzip.
- **Actual Size:** **149.30 KB Gzip** (20.70 KB under budget).

### 5. Playwright E2E Suite (`tests/e2e/seo.spec.ts`)
- Covers 5 golden routes (`/`, `/labs`, `/solutions/stem-tinkering-lab`, `/furniture`, `/faq`):
  - Populated, non-empty, distinct document titles.
  - Canonical link present and matching route URL.
  - OpenGraph title and URL tags present.
  - Mutual distinctness verification across all 5 titles.
  - `noindex` robots tag verification on utility routes (`/login`).

---

## 4. Acceptance Criteria Checklist

- [x] All backend tests pass (`37/37 files`, `248/248 tests`).
- [x] All frontend tests pass (`26/26 files`, `123/123 tests`).
- [x] Frontend typecheck passes with 0 errors.
- [x] Frontend bundle size passes budget (149.30 KB Gzip vs 170 KB limit).
- [x] `GET /sitemap.xml` returns valid XML with proper URLs and `<lastmod>`.
- [x] Root `/sitemap.xml` applies `publicCmsCache()` caching and conditional 304 handling.
- [x] Admin SEO collapsible section allows setting title & description with live character counts (60/160).
- [x] Atomic sitemap filesystem sync writes safely without throwing.
- [x] `frontend/public/robots.txt` disallows admin/auth paths and references `https://campusmart.in/sitemap.xml`.
- [x] Playwright E2E test suite created in `tests/e2e/seo.spec.ts`.

---

## 5. Deviations & Bug Fixes

1. **React Rules of Hooks Fix:** In `SolutionPageRenderer`, `ServicePageRenderer`, `science-tech-labs`, `smart-classrooms`, and `faq`, `usePageSeo` had initially been placed after `if (loading) return <Skeleton />` early returns. This caused a React hook order mismatch on re-render. Fixed by moving `usePageSeo` to the top of each component before any conditional returns, and rendering `<Seo {...seoProps} />` during skeleton loading so metadata hoists immediately.
2. **Prisma Query Fix for `PageItem.slug`:** In `backend/src/services/sitemap.service.ts`, Prisma rejected `{ slug: { not: null } }` because `PageItem.slug` is non-nullable `String`. Changed to `{ slug: { not: '' } }`.
