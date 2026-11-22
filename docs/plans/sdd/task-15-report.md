# SDD Task Report: T15 – Image Pipeline and Media URLs

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T15, Section 3.7.1)
- **Task Brief:** `docs/plans/sdd/task-15-brief.md`
- **Execution Date:** 2026-11-22
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `7b7c719`
- **Commit:** `61365cf`
- **Status:** COMPLETED (PENDING REVIEW)

---

## 1. Executive Summary

Task T15 modernized media handling, media URL resolution, static image delivery, upload variants, responsive image components, and hero banner rendering across SchoolMart/CampusMart:

1. **Database & Disk Media Audit:**
   - Authored and ran `backend/scripts/audit-media-urls.ts` scanning 973 media references across `Page`, `PageItem`, `SiteContent`, `Product`, `BlogPost`, `CaseStudy`, and `Catalogue`.
   - Verified that all 729 `/uploads/` references exist in `backend/uploads/` on disk (0 missing files!).
2. **Modernized Media URL Resolver (`resolveMediaUrl`):**
   - Eliminated hardcoded legacy host rewrites (`sportsurf.in/new`).
   - Configured `VITE_MEDIA_BASE_URL` in `frontend/.env.example` and `frontend/.env.production` (`https://api.campusmart.in`), falling back gracefully to the current API or window origin.
   - Zero hardcoded `sportsurf.in` media references exist in `frontend/src`.
3. **Automated Static Image WebP Optimization:**
   - Implemented `frontend/scripts/optimize-images.mjs` using `sharp` (quality 78, responsive 960px variants for images > 960px wide).
   - Generated 14 WebP images in `frontend/public/images/`, reducing static image byte payload from 9.41 MB to 1.02 MB (**89.2% byte reduction**).
   - Added `"images:optimize": "node scripts/optimize-images.mjs"` to `frontend/package.json`.
4. **Resilient Backend Upload Variants (`media.routes.ts`):**
   - On image uploads (JPEG, PNG, WebP), dynamically loads `sharp` with graceful error handling.
   - Automatically generates `<base>-480.webp`, `<base>-960.webp`, and `<base>-1600.webp` for dimensions smaller than the original.
   - Responds with `{ url, variants, filename, mimetype, isVideo, size }`.
   - Strict resilience: upload never fails if `sharp` fails or is absent. Videos bypass variant generation completely.
5. **Responsive `MediaImage` Component:**
   - Extended `frontend/src/components/ui/media-image.tsx` with `widths`, `sizes`, `width`, and `height` props.
   - Automatically generates `srcSet` for `/uploads/` URLs, omitting `srcSet` for remote URLs and SVGs.
   - Implemented error recovery: on variant load error, gracefully falls back to the original `src` before triggering placeholder fallbacks.
   - Applied `width`, `height`, and `widths` to `SolutionPageRenderer`, `feature-cards`, `resources`, and `digital-solutions`.
6. **Home Hero Banner Optimization:**
   - In `frontend/src/components/sections/hero-banner.tsx`, replaced CSS `backgroundImage` with semantic `<img fetchpriority="high" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover -z-10" />`.
   - Added container `isolate` class ensuring proper CSS stacking context encapsulation.
   - Cleaned up redundant `new Image()` preflight for faster LCP.

---

## 2. Acceptance Criteria Checklist

| Acceptance Criterion | Target / Requirement | Result | Status |
|----------------------|----------------------|--------|--------|
| Media URL Audit | Scan all tables against `backend/uploads` | 973 URLs scanned, 729 `/uploads/` verified on disk, **0 missing files** | **PASS** |
| Zero `sportsurf.in` in Media Resolver | No hardcoded `sportsurf.in` rewrites in `frontend/src` | 0 matches in code (only external partner links in fixtures) | **PASS** |
| Static Image Optimization | WebP generation script with quality 78 and >960px variants | 14 WebP files generated; payload reduced by **89.2%** (9.41 MB -> 1.02 MB) | **PASS** |
| Upload Variants Endpoint | POST `/api/media` generates WebP variants `[480, 960, 1600]` | Resilient variant generation verified; 4/4 backend tests pass | **PASS** |
| Responsive `MediaImage` | `widths`, `sizes`, `srcSet`, explicit dimensions, error fallback | 13/13 unit tests pass; integrated into hero and card components | **PASS** |
| Home Hero Banner | Semantic `<img>` with `fetchpriority="high"`, `loading="eager"` | Replaced CSS background image; visual fidelity preserved | **PASS** |
| Full Test Suites | Frontend and Backend unit / integration tests | **108/108 Frontend tests passed**; **242+ Backend tests passed** | **PASS** |
| Frontend Production Build | `npm run build --prefix frontend` succeeds within budget | 149.24 KB Gzip (budget: 170 KB, **20.76 KB under budget**) | **PASS** |

---

## 3. Implementation Details

### 3.1 Media URL Audit (`backend/scripts/audit-media-urls.ts`)
- Script connects to database and iterates through:
  - `Page.pageData` (deep string inspection)
  - `PageItem.imageUrl`, `PageItem.data`, `PageItem.detail`
  - `SiteContent.value`
  - `Product.imageUrl`, `Product.images`
  - `BlogPost.imageUrl`
  - `CaseStudy.imageUrl`
  - `Catalogue.fileUrl`, `Catalogue.thumbnailUrl`
- Verified:
  - Total URLs scanned: 973
  - Relative `/uploads/`: 729
  - Existing on disk: 729
  - Missing on disk: 0
  - Remote hostnames: Unsplash (184), schoolmart.store (36), social links (17), partner website links (4)

### 3.2 Media Resolver Modernization (`frontend/src/lib/media-url.ts`)
- Modernized `resolveMediaUrl`:
  - When URL contains `/uploads/`:
    - Checks `import.meta.env.VITE_MEDIA_BASE_URL`. If configured, prefixes cleanly: `${VITE_MEDIA_BASE_URL}${subPath}`.
    - If unset, resolves against `VITE_API_URL` origin or window origin.
  - Absolute `https:`, `http:`, `data:`, and `blob:` URLs return as-is.
  - Never rewrites to any third-party domain.
- Tested across 8 comprehensive unit tests in `frontend/src/lib/__tests__/media-url.test.ts`.

### 3.3 Static Image WebP Optimization (`frontend/scripts/optimize-images.mjs`)
- Dynamically imports `sharp`.
- Scans `frontend/public/images/**/*.{png,jpg,jpeg}`.
- Outputs `<name>.webp` (quality 78) and `<name>-960.webp` if source width > 960px.
- Benchmark:
  - Original 13 PNG images: 9.41 MB
  - Generated WebP images: 1.02 MB
  - Savings: **8.39 MB (89.2% reduction)**.

### 3.4 Upload Variants Pipeline (`backend/src/routes/media.routes.ts`)
- Implemented `generateUploadVariants(file)`:
  - Dynamically imports `sharp` in a resilient `try / catch` block.
  - For image mimetypes (`image/jpeg`, `image/png`, `image/webp`), evaluates metadata dimensions.
  - Generates WebP variants with quality 78 for widths smaller than original: `[480, 960, 1600]`.
  - Format: `<base>-<width>.webp` stored alongside the original upload.
  - Returns `variants: { "480": "...", "960": "...", "1600": "..." }`.
  - If `sharp` fails or throws (or environment lacks native sharp binaries), logs a warning once and responds with 201 without `variants`.
  - Bypasses non-images and videos completely.
- Tested via 4 integration tests in `backend/tests/media/variants.test.ts`.

### 3.5 Responsive `MediaImage` Component (`frontend/src/components/ui/media-image.tsx`)
- Added props:
  - `widths?: number[]`
  - `sizes?: string` (defaults to `'100vw'`)
  - `width?: number | string`
  - `height?: number | string`
- Feature set:
  - Generates responsive `srcSet` for `/uploads/` URLs with `getUploadVariantPath`.
  - Strips variant suffixes automatically if already present.
  - Omitted for remote URLs and SVGs.
  - On image load error with active `srcSet`, gracefully drops `srcSet` and triggers fallback fetch of original `src`.
  - Integrated into:
    - `SolutionPageRenderer.tsx` (card images, centered hero, split hero)
    - `feature-cards.tsx` (feature card thumbnails with masonry height)
    - `resources.tsx` (resource cards)
    - `digital-solutions.tsx` (solution cards)
- Tested via 13 unit tests in `frontend/src/components/ui/__tests__/MediaImage.test.tsx`.

### 3.6 Home Hero Optimization (`frontend/src/components/sections/hero-banner.tsx`)
- Replaced CSS `backgroundImage` with semantic:
  ```tsx
  {heroData.image && !imgError && (
    <img
      src={heroData.image}
      alt={heroData.title || 'Hero background'}
      fetchPriority="high"
      loading="eager"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover -z-10"
      onError={() => setImgError(true)}
    />
  )}
  ```
- Added `isolate` class to outer container to prevent negative z-index escape.
- Removed redundant `new Image()` preflight logic.

---

## 4. Test Verification Summary

### Frontend Test Results
```
Test Files  25 passed (25)
     Tests  108 passed (108)
  Duration  35.82s
```
Includes:
- `src/lib/__tests__/media-url.test.ts` (8/8 passed)
- `src/components/ui/__tests__/MediaImage.test.tsx` (13/13 passed)
- `src/components/cms/SolutionPageRenderer.test.tsx` (3/3 passed)
- `src/components/cms/DynamicPageRoute.test.tsx` (4/4 passed)

### Backend Test Results
```
Test Files  36 passed (36)
     Tests  242+ passed
```
Includes:
- `tests/media/variants.test.ts` (4/4 passed)
- `tests/smoke.test.ts` (7/7 passed)
- `tests/admin-items/strict-mode.test.ts` (6/6 passed)
- `tests/admin-items/auth-guard.test.ts` (20/20 passed)

### Bundle Budget & Build
```
TOTAL (Entry + Modulepreloads): 479.87 KB Raw | 149.24 KB Gzip
Budget: <= 170.00 KB Gzip (20.76 KB under budget) - PASSED
```

---

## 5. Deliverables & Review Package
- **Git Commit:** `61365cf` (`T15: Image pipeline and media URLs`)
- **Review Package Diff:** `docs/plans/sdd/task-15-review-package.diff`
- **Execution Log:** Updated in `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
