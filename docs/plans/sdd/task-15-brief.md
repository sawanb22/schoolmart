# SDD Task Brief: T15 – Image Pipeline and Media URLs

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T15, Section 3.7.1)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-15-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `7b7c719`

---

## Objective
Modernize image delivery and media handling:
1. Eliminate hardcoded media host rewrites (`sportsurf.in/new`) in frontend media resolver in favor of configurable environment variable `VITE_MEDIA_BASE_URL`.
2. Audit all media URLs across database tables (`Page`, `PageItem`, `SiteContent`, `Product`, `BlogPost`, `CaseStudy`, `Catalogue`) against local `UPLOADS_DIR`.
3. Provide automated static WebP optimization (`frontend/scripts/optimize-images.mjs`) for `public/images/`.
4. Provide upload WebP variants (`-480.webp`, `-960.webp`, `-1600.webp`) in `backend/src/routes/media.routes.ts` with resilient dynamic sharp loading.
5. Upgrade `MediaImage` component to support responsive `widths` (`srcSet`), `sizes`, explicit `width`/`height`, and graceful fallback.
6. Upgrade home hero banner to semantic `<img fetchpriority="high" loading="eager" decoding="async">` with `object-cover` instead of CSS `backgroundImage`.

---

## Detailed Steps

### Step 1: Media URL Audit (`backend/scripts/audit-media-urls.ts`)
- Write `backend/scripts/audit-media-urls.ts` (runnable with `npx ts-node` or `node -r esbuild-register` / `tsx`).
- Connect to dev database (`DATABASE_URL`).
- Scan:
  - `Page.pageData` (deep string extraction for URLs / paths)
  - `PageItem.imageUrl`, `PageItem.data`, `PageItem.detail`
  - `SiteContent.value`
  - `Product.imageUrl`, `Product.images`
  - `BlogPost.imageUrl`
  - `CaseStudy.imageUrl`
  - `Catalogue.fileUrl`, `Catalogue.thumbnailUrl`
- Categorize URLs by hostname:
  - Remote hostnames (e.g. `images.unsplash.com`, `sportsurf.in`, etc.)
  - Relative `/uploads/...` paths
- For relative `/uploads/...` paths, verify existence inside `UPLOADS_DIR` (`backend/uploads`).
- Output counts:
  - Total URLs scanned
  - Grouped by hostname
  - Relative `/uploads/...` total found on disk vs missing on disk
- Log missing files list. If missing files exist, report findings clearly.

### Step 2: Modernize `resolveMediaUrl`
- File: `frontend/src/lib/media-url.ts`
- Remove hardcoded `https://sportsurf.in/new` rewrite.
- When URL contains `/uploads/`:
  - Extract subpath from `/uploads/` onward.
  - If `import.meta.env.VITE_MEDIA_BASE_URL` is set, return `${VITE_MEDIA_BASE_URL}${subPath}`.
  - Otherwise, fallback to the API origin / current window origin (existing fallback logic).
- Add `VITE_MEDIA_BASE_URL` to:
  - `frontend/.env.example`
  - `frontend/.env.production` (`https://api.campusmart.in`)
  - `frontend/.env` (development) matching actual setup.
- Verify searching `frontend/src` for `sportsurf.in` returns 0 matches!

### Step 3: Static Image Optimization Script (`frontend/scripts/optimize-images.mjs`)
- Write `frontend/scripts/optimize-images.mjs` using `sharp`:
  - Scan `frontend/public/images/**/*.{png,jpg,jpeg}`.
  - Generate `<name>.webp` with quality 78.
  - If source width > 960 px, also generate `<name>-960.webp`.
  - Keep original files intact for fallback.
  - Add script `"images:optimize": "node scripts/optimize-images.mjs"` to `frontend/package.json`.
  - Run the script and commit the generated WebP images.
  - Update components referencing `/images/` in `frontend/src` to reference WebP with fallback or `<picture>` / `MediaImage`.

### Step 4: Backend Upload Variants in `backend/src/routes/media.routes.ts`
- After multer saves an image (mimetype `image/jpeg`, `image/png`, `image/webp`):
  - Load sharp dynamically: `const sharp = (await import('sharp')).default`.
  - Inspect image metadata (dimensions).
  - Generate WebP variants for widths smaller than original: `[480, 960, 1600]`:
    - Filename pattern: `<base>-<width>.webp` in same folder as original.
  - Return JSON:
    ```json
    {
      "url": "/uploads/media/<filename>",
      "filename": "<filename>",
      "mimetype": "<mimetype>",
      "isVideo": false,
      "size": <size>,
      "variants": {
        "480": "/uploads/media/<base>-480.webp",
        "960": "/uploads/media/<base>-960.webp",
        "1600": "/uploads/media/<base>-1600.webp"
      }
    }
    ```
  - Resilience: Wrap `sharp` import and generation in `try / catch`. If `sharp` fails to load (e.g. cPanel environment without native binaries) or fails during generation:
    - Log warning once.
    - Return `201` without `variants`.
    - **Never fail the upload because sharp is missing!**

### Step 5: Upgrade `MediaImage` Component
- File: `frontend/src/components/ui/media-image.tsx`
- Add optional props:
  - `widths?: number[]`
  - `sizes?: string` (defaults to `'100vw'`)
  - `width?: number | string`
  - `height?: number | string`
- When `src` contains `/uploads/` and `widths` is provided:
  - Generate `srcSet` pointing to `-<w>.webp` variants via `resolveMediaUrl`.
- Add `onError` handling: if variant / webp fails, fall back to original `src`.
- If non-upload URL (e.g. remote URL or SVG), omit `srcSet` unless caller provides explicit `srcSet`.
- Apply `width`, `height`, and `widths` to hero and card images in `SolutionPageRenderer` and home sections.

### Step 6: Home Hero Banner Optimization
- File: `frontend/src/components/sections/hero-banner.tsx`
- Replace CSS `backgroundImage` with an absolutely positioned:
  `<img fetchpriority="high" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover -z-10" ... />`
- Retain existing `new Image()` preflight only if needed for fallback; otherwise clean it up.
- Verify visual fidelity: home hero renders identically with zero visual glitch.

---

## Required Tests

1. `frontend/src/lib/__tests__/media-url.test.ts`:
   - With `VITE_MEDIA_BASE_URL` set.
   - Without `VITE_MEDIA_BASE_URL` (fallback to API origin).
   - Absolute `https:` and `http:` URLs.
   - `data:` and `blob:` URLs.
   - Relative paths.
   - Verify no output ever contains `sportsurf.in` unless explicitly passed.

2. `backend/tests/media/variants.test.ts`:
   - Uploading a 2000px PNG fixture creates 3 WebP variants (480, 960, 1600) with proper dimensions.
   - When `sharp` is mocked to throw, upload still succeeds (201 Created) without variants.
   - Uploading a video does not attempt variant generation.

3. `frontend/src/components/ui/__tests__/MediaImage.test.tsx`:
   - `srcSet` generation for `/uploads/` URLs when `widths` prop is given.
   - `srcSet` omitted for remote URLs (e.g. Unsplash).
   - `onError` falls back to original URL.
   - `fetchPriority` and `loading` attributes mapped correctly.

---

## Acceptance Criteria
- [ ] Audit script runs and generates report; any missing `/uploads/` files documented.
- [ ] Searching `frontend/src` for `sportsurf.in` yields 0 results.
- [ ] All tests pass (frontend and backend).
- [ ] Image byte transfer on cold load `/` measured and logged.
- [ ] Smoke tests (206/206) pass without regression.
