# SDD Task Brief: T16 – SEO: Metadata, Sitemap, Robots

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T16, Section 3.7.2)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-16-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `7f7b733`

---

## Objective
Ensure every public page has complete, search-engine-ready SEO metadata (title, meta description, canonical link, OpenGraph, Twitter cards) leveraging React 19 native document metadata hoisting, establish an automated root `/sitemap.xml` endpoint with atomic filesystem generation for cPanel, and deploy a crawl policy in `robots.txt`.

---

## Detailed Steps

### Step 1: Settings & Item Fields Schema Updates
1. In `backend/src/validation/page-settings.schema.ts` (or wherever `SettingsSchema` lives):
   - Add optional keys: `seoTitle?: string`, `seoDescription?: string`, `ogImage?: string`.
2. In `backend/src/validation/item.schema.ts` (or item data schemas):
   - Support optional `data.seo: { title?: string, description?: string, ogImage?: string, noindex?: boolean }`.
3. Admin UI Updates:
   - In `frontend/src/admin/components/UnifiedPageEditor.tsx`:
     - Add a collapsible **SEO** section in settings with character counters (60 for `seoTitle`, 160 for `seoDescription`).
   - In `frontend/src/admin/components/items/ItemEditorDrawer.tsx`:
     - Add a collapsible **SEO** section for item SEO fields (`title`, `description`, `ogImage`, `noindex`) with character counters.

### Step 2: `<Seo>` Component (`frontend/src/components/seo/Seo.tsx`)
1. Create `frontend/src/components/seo/Seo.tsx`:
   - Props: `{ title?: string; description?: string; image?: string; path?: string; noindex?: boolean }`.
   - Uses React 19 document metadata hoisting (renders `<title>`, `<meta name="description" ...>`, `<link rel="canonical" ...>`, `<meta property="og:title" ...>`, `<meta property="og:description" ...>`, `<meta property="og:image" ...>`, `<meta name="twitter:card" ...>`, etc. directly in JSX).
   - Dynamic canonical URL: `${(import.meta.env.VITE_SITE_URL || 'https://campusmart.in').replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`.
   - Title formatting: `"${cleanTitle} | CampusMart"` unless `cleanTitle` already contains "CampusMart".
   - Description formatting: trimmed to 160 characters at a word boundary with `...` if truncated.
   - If `noindex === true`: render `<meta name="robots" content="noindex, nofollow" />`.
2. Create helper hook `frontend/src/hooks/usePageSeo.ts`:
   - Accepts `settings?: Record<string, any>`, `fallbackTitle?: string`, `fallbackDescription?: string`, `path?: string`.
   - Derives fallback title: `settings?.seoTitle || settings?.heroTitle || settings?.title || fallbackTitle || 'CampusMart'`.
   - Derives fallback description: `settings?.seoDescription || settings?.heroSubtitle || fallbackDescription || ''`.
   - Returns props ready to spread into `<Seo />`.

### Step 3: Mount `<Seo>` Across Public Routes
1. Add `<Seo>` to:
   - `frontend/src/components/cms/SolutionPageRenderer.tsx`
   - `frontend/src/components/cms/ServicePageRenderer.tsx`
   - `frontend/src/components/cms/GenericPageRenderer.tsx`
   - `frontend/src/pages/ServiceDetailPage.tsx`
   - `frontend/src/pages/UniversalArticleDetail.tsx`
   - Bespoke hub pages switched in T11 (`science-tech-labs.tsx`, `smart-classrooms.tsx`, `partner-with-colleges.tsx`, etc.)
   - `frontend/src/pages/home.tsx` (using SiteContent or home page settings)
2. Static & utility pages:
   - Add `<Seo title="Admin Login" noindex path="/admin/login" />`, `/register`, `/my-account`, `/not-found`.

### Step 4: Root `/sitemap.xml` Endpoint (`backend/src/routes/seo.routes.ts`)
1. Create `backend/src/routes/seo.routes.ts`:
   - Expose `GET /sitemap.xml`.
   - Mount in `backend/src/app.ts` at the root path `/sitemap.xml` (NOT under `/api`).
   - Query all published `Page` records:
     - Exclude `home`, slugs starting with `test-` or `draft-`, and pages with `pageData.settings.noindex === true`.
     - Output `<url><loc>${SITE_URL}/${slug}</loc><lastmod>${page.updatedAt.toISOString().split('T')[0]}</lastmod></url>`.
   - Query all published `PageItem` records in structured card collections:
     - Output `<url><loc>${SITE_URL}/${hubSlug}/${item.slug}</loc><lastmod>${item.updatedAt.toISOString().split('T')[0]}</lastmod></url>`.
   - Include root `<url><loc>${SITE_URL}/</loc></url>`.
   - Escape XML entities (`&`, `<`, `>`, `"`, `'`).
   - Set `Content-Type: application/xml; charset=utf-8`.
   - Apply `publicCmsCache()` caching.

### Step 5: Optional Atomic Sitemap File Sync for cPanel
1. In `backend/src/services/page-content/after-content-write.ts`:
   - If `process.env.SITEMAP_WRITE_PATH` is configured (e.g. `/home/user/public_html/sitemap.xml`):
     - Trigger sitemap generation debounced by 10 seconds.
     - Generate XML string.
     - Write atomically to a temp file next to the destination (`<path>.tmp.<pid>`), then rename to `SITEMAP_WRITE_PATH`.
     - Log success or warning (never throw or block content writes).

### Step 6: `robots.txt`
1. Create `frontend/public/robots.txt`:
   ```
   User-agent: *
   Disallow: /admin
   Disallow: /my-account
   Disallow: /login
   Disallow: /register
   Disallow: /registration
   Sitemap: https://campusmart.in/sitemap.xml
   ```

---

## Required Tests

1. Backend `backend/tests/seo/sitemap.test.ts`:
   - Published pages and items are included in XML.
   - Unpublished pages, unpublished items, `noindex` pages, and `test-*` / `draft-*` slugs are excluded.
   - XML is valid and entities are properly escaped.
   - `SITEMAP_WRITE_PATH` atomic write creates temp file and renames safely.
2. Frontend `frontend/src/components/seo/__tests__/Seo.test.tsx`:
   - Title fallback chain and `| CampusMart` suffix.
   - Description 160-character boundary truncation.
   - Canonical URL generation with `VITE_SITE_URL`.
   - `noindex` renders `<meta name="robots" content="noindex, nofollow">`.
3. Playwright E2E `tests/e2e/seo.spec.ts`:
   - Verify 5 golden routes (`/labs`, `/solutions/stem-tinkering-lab`, `/furniture`, `/faq`, `/`):
     - `document.title` is populated and distinct.
     - Canonical link exists and matches URL.

---

## Acceptance Criteria
- [ ] All tests pass (backend & frontend).
- [ ] `GET /sitemap.xml` returns valid XML with proper URLs and `<lastmod>`.
- [ ] Admin SEO collapsible section allows setting title & description with live character count.
- [ ] Playwright SEO test passes across golden routes.
