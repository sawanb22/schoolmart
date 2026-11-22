# SDD Task 10 Report: Detail Pages and Dynamic Routing Use the Item and Resolve Endpoints

- **Task:** T10 – Detail Pages and Dynamic Routing Use the Item and Resolve Endpoints
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T10, Section 3.5.1)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Commit:** `0020eb6` (`T10: Detail pages and dynamic routing use the item and resolve endpoints`)
- **Status:** DONE

---

## 1. Executive Summary

Task T10 transitions SchoolMart's detail pages, dynamic catch-all routes, and child route resolvers to the granular item endpoint (`GET /api/pages/:hubSlug/items/:itemSlug`) and unified path resolver (`GET /api/pages/resolve`), completely eliminating multi-step sequential fallback probes and eliminating whole-hub data overfetching on single-card views.

Key Deliverables Completed:
1. **Article View Model & Item-to-Card Mapper Pure Extractions:**
   - Extracted `buildArticleViewModel` into `frontend/src/components/cms/article-view-model.ts` (category hierarchy resolution, bodyContent derivation with lead paragraph formatting, deliverables HTML generation, cta* fallbacks with modern `hub.cta` nested object support, admin edit links, and backLinks).
   - Extracted `itemToCard` into `frontend/src/lib/item-to-card.ts`, mirroring backend `buildItem` from `backend/src/services/page-content/legacy-mapper.ts` (spreading data, spreading detail, handling title derived state, slug, summary -> description, imageUrl -> image, href, badge, categories).
2. **Refactored `ServiceDetailPage.tsx`:**
   - Switched from whole-hub `usePageData(slug)` to granular `useHubItem(categorySlug, itemSlug)`.
   - Handled `redirectTo` responses with `<Navigate to={redirectTo} replace />`.
   - Mapped `item` to legacy card with `itemToCard(item, { includeDetail: true })`.
   - Integrated hub-level CTA defaults from `hub.cta`.
   - Preserved AI Solutions Finder Context Notice (`ref_intent`, `ref_inst`, `ref_qty`, `ref_trace`, `ref_sol`).
   - Verified makes **exactly one** `/api/pages/*` request on cold load.
3. **Refactored `UniversalArticleDetail.tsx`:**
   - Removed legacy sequential probes (`api.get('/pages/${hubSlug}-${normalizedSlug}')` followed by `api.get('/pages/${normalizedSlug}')`) and whole-hub `usePageData(hubSlug)`.
   - Switched to unified `useResolvePath('/' + hubSlug + '/' + itemSlug)`.
   - Handled `type === 'redirect'`: `<Navigate to={result.redirectTo} replace />`.
   - Handled `type === 'page'`: renders `GenericPageRenderer` with standalone page data.
   - Handled `type === 'item'`: queries `useHubItem(hubSlug, result.itemSlug)` and builds view model via `buildArticleViewModel(itemToCard(item, { includeDetail: true }), hub)`.
   - Handled `type === 'not_found'`: renders existing "Article not found" UI.
   - All paths execute in <= 2 `/api/pages*` requests (1 for redirect/page/404, 2 for hub items).
4. **Refactored `DynamicPageRoute` in `App.tsx`:**
   - Replaced 4-step probe fallback sequence (`/pages/${slug}`, `/pages/guide-${slug}`, `/pages/environment-${slug}`, `/pages/resource-${slug}`) with a single `useResolvePath('/' + slug)`.
   - Fixed the prefixed-slug bug by passing the resolved `result.slug` to template components (`SolutionPageRenderer`, `ServicePageRenderer`, etc.).
   - Handled `type === 'redirect'` with `<Navigate to={result.redirectTo} replace />`.
   - Handled `type === 'not_found'` with `<NotFound />`.
5. **Refactored `DynamicChildPageRoute.tsx`:**
   - Switched to `useResolvePath('/' + hubSlug + '/' + itemSlug)`.
   - Dispatches `ServiceDetailPage` if `hubTemplate` is in the known service set (`solution-hub`, `service-suite`, `sports-infra`, `tech-infra`, `labs`, `libraries`), otherwise `UniversalArticleDetail`.
   - Pre-seeded query cache ensures 0 additional network calls for shared data.
6. **Audited 25 `src/pages/*-detail.tsx` Pages:**
   - 19 wrapper pages render `ServiceDetailPage` directly and benefit immediately.
   - 3 non-CMS pages (`product-detail`, `completed-project-detail`, `home-feature-detail`).
   - `case-study-detail.tsx` documented (reads catalogues page-level collection, scoped for T11).
   - Adapted 2 single-card finders to `useHubItem`: `partnership-model-detail.tsx` and `campus-design-execution-detail.tsx`.
7. **Comprehensive Unit and Integration Test Suite:**
   - 9 test files, 46 tests passing in `frontend/`:
     - `article-view-model.test.ts` (12 tests)
     - `item-to-card.test.ts` (9 tests, characterization verified against all 46 backend fixtures)
     - `ServiceDetailPage.test.tsx` (4 tests)
     - `UniversalArticleDetail.test.tsx` (4 tests)
     - `DynamicPageRoute.test.tsx` (4 tests)
8. **End-to-End & Playwright Smoke Suite:**
   - Playwright smoke suite (`tests/e2e/smoke.spec.ts`): 206/206 routes passed, 3 skipped (known baseline failures), 0 regressions.
   - Request measurements verified:
     - Cold `/labs/composite-skill-lab` makes exactly 1 `/api/pages*` call + `/api/content`.
     - Cold `/50-global-resources-for-school-excellence` makes exactly 1 `/api/pages*` resolve call + `/api/content`.
   - `npm run build:frontend` and `npm run typecheck:frontend` pass with 0 errors.

---

## 2. Implementation Details

### 2.1 Article View Model (`frontend/src/components/cms/article-view-model.ts`)
Encapsulates view model derivation for article detail rendering:
- Supports both legacy flat hub properties (`hub.ctaTitle`, `hub.ctaHref`) and modern structured item endpoint responses (`hub.cta.ctaTitle`, `hub.cta.ctaHref`).
- Category hierarchy resolution: `card.category || card.eyebrow || card.categories[0] || options.hubTitle`.
- Body content derivation: respects `useCustomDetail` and `detailContent`, formats lead paragraph with `card.description` before `card.methodology`, and generates milestone & deliverables HTML grid.
- Constructs deterministic admin edit URLs (`/admin/pages?edit=<hubSlug>&card=<cardSlug>`) and backLinks (`/${hubSlug}`).

### 2.2 Item to Card Mapper (`frontend/src/lib/item-to-card.ts`)
Mirrors backend `buildItem` from `backend/src/services/page-content/legacy-mapper.ts`:
- Spreads `item.data` (omitting internal `__titleDerived`).
- Spreads `item.detail` when `options.includeDetail` is true.
- Derives title (omitted when `data.__titleDerived` is true).
- Maps `summary` -> `description`, `imageUrl` -> `image`, `href`, and `badge`.
- Maps categories from string arrays or join objects (`category.name` / `name`).

### 2.3 ServiceDetailPage Refactor (`frontend/src/components/cms/ServiceDetailPage.tsx`)
- Queries `useHubItem(slug, normalizedItemSlug)`.
- If `redirectTo` is present in response, navigates immediately with `<Navigate to={redirectTo} replace />`.
- Maps item using `itemToCard(item, { includeDetail: true })`.
- Resolves CTA title, subtitle, label, and href from card overrides first, falling back to `hub.cta` / `hub` defaults.
- Retains full AI Solutions Finder query param bridge (`ref_intent`, `ref_inst`, `ref_qty`, `ref_trace`, `ref_sol`).

### 2.4 UniversalArticleDetail Refactor (`frontend/src/components/cms/UniversalArticleDetail.tsx`)
- Replaced manual `api.get` probe cascade with `useResolvePath('/' + hubSlug + '/' + normalizedSlug)`.
- Handles `type === 'redirect'` with `<Navigate to={result.redirectTo} replace />`.
- Handles `type === 'page'` with `GenericPageRenderer`.
- Handles `type === 'item'` by querying `useHubItem` and building view model via `buildArticleViewModel(itemToCard(item, { includeDetail: true }), hub)`.
- Handles `type === 'not_found'` with the standard not-found UI.

### 2.5 DynamicPageRoute Refactor (`frontend/src/App.tsx`)
- Replaced 4-step probe fallback cascade with `useResolvePath('/' + slug)`.
- Passes the resolved slug `result.slug` to `SolutionPageRenderer`, `ServicePageRenderer`, and other template components, fixing the prefixed-slug bug where prefix was dropped from template props.
- Handles redirects and 404s via standard routing primitives.

### 2.6 DynamicChildPageRoute Refactor (`frontend/src/components/cms/DynamicChildPageRoute.tsx`)
- Resolves path `/${hubSlug}/${itemSlug}` through `useResolvePath`.
- Preserves `RESERVED_PREFIXES` guard.
- Dynamically selects `ServiceDetailPage` or `UniversalArticleDetail` based on `result.hubTemplate`.

### 2.7 Audit of All 25 `src/pages/*-detail.tsx` Files

| Page Component | Type | Analysis & Action |
|---|---|---|
| `ai-digital-design-supply-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="ai-digital-design-supply" ... />`. No change needed. |
| `ai-ml-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="ai-ml" ... />`. No change needed. |
| `ai-stations-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="ai-stations" ... />`. No change needed. |
| `ar-vr-experiences-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="ar-vr-experiences" ... />`. No change needed. |
| `campus-automation-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="campus-automation" ... />`. No change needed. |
| `campus-design-execution-detail.tsx` | Standalone Finder | Switched from whole-hub `usePageData` to `useHubItem(CDE_PAGE_SLUG, stepSlug)` with `itemToCard`. |
| `campus-furniture-design-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="campus-furniture-design" ... />`. No change needed. |
| `campus-master-planning-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="campus-master-planning" ... />`. No change needed. |
| `case-study-detail.tsx` | Page Collection | Reads page-level `caseStudies` from catalogues page data. Kept as is; scheduled for T11 hub classification. |
| `collaboration-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="collaboration" ... />`. No change needed. |
| `collaboration-spaces-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="collaboration-spaces" ... />`. No change needed. |
| `completed-project-detail.tsx` | Site Content | Non-CMS page; uses `useSiteContent()`. No change needed. |
| `digital-transformation-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="digital-transformation" ... />`. No change needed. |
| `furniture-design-supply-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="furniture-design-supply" ... />`. No change needed. |
| `home-feature-detail.tsx` | Site Content | Non-CMS page; uses `useSiteContent()`. No change needed. |
| `labs-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="labs" ... />`. No change needed. |
| `libraries-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="libraries" ... />`. No change needed. |
| `library-management-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="library-management" ... />`. No change needed. |
| `new-environments-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="new-environments" ... />`. No change needed. |
| `partnership-model-detail.tsx` | Standalone Finder | Switched from whole-hub `usePageData` to `useHubItem(PARTNER_PAGE_SLUG, modelSlug)` with `itemToCard`. |
| `product-detail.tsx` | Products | Product catalog page; uses `/api/products/${slug}`. No change needed. |
| `science-tech-labs-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="science-tech-labs" ... />`. No change needed. |
| `sports-design-execution-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="sports-design-execution" ... />`. No change needed. |
| `sports-infra-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="sports-infra" ... />`. No change needed. |
| `tech-infra-detail.tsx` | Service Wrapper | Renders `<ServiceDetailPage categorySlug="tech-infra" ... />`. No change needed. |

---

## 3. Test Suites & Verification

### 3.1 Unit & Integration Tests (Vitest)
```
 ✓ src/lib/cms-channel.test.ts (3 tests)
 ✓ src/hooks/useResolvePath.test.tsx (2 tests)
 ✓ src/contexts/SiteContentContext.test.tsx (3 tests)
 ✓ src/hooks/usePageData.test.tsx (5 tests)
 ✓ src/components/cms/UniversalArticleDetail.test.tsx (4 tests)
 ✓ src/components/cms/ServiceDetailPage.test.tsx (4 tests)
 ✓ src/components/cms/DynamicPageRoute.test.tsx (4 tests)
 ✓ src/lib/item-to-card.test.ts (9 tests)
 ✓ src/components/cms/article-view-model.test.ts (12 tests)

 Test Files  9 passed (9)
      Tests  46 passed (46)
```

Key Assertions Verified:
- `article-view-model.test.ts`: verified category fallback cascade, `useCustomDetail` vs default body vs methodology lead paragraph, deliverables grid generation, card CTA overrides, hub.cta nested fallbacks, admin edit URL normalization.
- `item-to-card.test.ts`: verified exact parity against 46 backend-generated fixtures; verified derived title omission, summary to description, imageUrl to image, categories array normalization, detail inclusion flag.
- `ServiceDetailPage.test.tsx`: verified title and body render with **exactly one** `/api/pages/*` request; verified `redirectTo` navigates; verified 404 renders not-found UI; verified AI Solutions Finder context notice.
- `UniversalArticleDetail.test.tsx`: verified standalone page (1 request), hub item (2 requests: resolve + item), redirect (1 request), and not found (1 request). All cases <= 2 requests.
- `DynamicPageRoute.test.tsx`: verified unprefixed guide path resolves in 1 request and passes prefixed slug to renderer; verified solution-hub template routing; verified redirect; verified 404.

### 3.2 Playwright Smoke Suite (206/206 Routes)
Command: `npx playwright test tests/e2e/smoke.spec.ts`
Result:
- **Total Tests:** 209
- **Passed:** 206
- **Skipped:** 3 (known baseline failures from T0: `/ai-digital-design-supply`, `/tech-infra`, `/digital/16-latetest`)
- **Failed:** 0
- **Regressions:** 0

### 3.3 Network Request Measurements (Cold Loads)
Measured via `node tests/e2e/measure-requests.mjs`:
- Cold `/labs/composite-skill-lab` (Item Detail):
  - Baseline (T0): 4 calls (`/content`, `/pages/labs` whole hub, etc.)
  - After T10: **1 `/api/pages/*` call** (`/api/pages/labs/items/composite-skill-lab`) + `/api/content`.
  - Whole-hub fetch eliminated!
- Cold `/50-global-resources-for-school-excellence` (Prefixed Dynamic Page):
  - Baseline (T0): 6 calls (4 sequential 404/200 probes)
  - After T10: **1 `/api/pages/*` call** (`/api/pages/resolve?path=%2F50-global-resources-for-school-excellence`) + `/api/content`.
  - 4-step probe waterfall completely eliminated!

### 3.4 Build and Typecheck
- `npm run typecheck:frontend`: Exit code 0, 0 TypeScript errors.
- `npm run build:frontend`: Exit code 0, production Vite build generated clean bundles.
- `npm run build:backend`: Exit code 0, Prisma client and TypeScript compilation succeeded.

---

## 4. Acceptance Criteria Checklist

- [x] All unit and integration tests pass (46/46 frontend tests, backend test suites passing).
- [x] Playwright smoke suite passes (206/206 routes with 0 regressions).
- [x] Cold `/labs/<item>` request count verified <= 2 API calls (item + content).
- [x] Cold prefixed dynamic page request count verified <= 2 API calls (resolve + content).
- [x] Changing a card slug redirects to the new URL seamlessly.
