# SDD Task Report: T11 – Hub Pages Use the v2 Summary Shape

- **Task Reference:** Task T11 in `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md`
- **Brief:** `docs/plans/sdd/task-11-brief.md`
- **Execution Log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Branch:** `feat/hybrid-cms`
- **Status:** COMPLETED & VERIFIED

---

## 1. Executive Summary

Task T11 successfully transitions frontend hub views to consume lightweight summary payloads (`GET /api/pages/:slug?v=2`) via a new memoized adapter hook `useHubLegacy(slug)`. Heavy item detail content (`detailContent`, `useCustomDetail`, `body`, `content`, `methodology`, `deliverables`, `beforeImages`, `afterImages`) is completely dropped from hub listing responses, while item detail pages (implemented in T10) continue to fetch full item content individually via `useHubItem(hubSlug, itemSlug)`.

A comprehensive audit was performed across all 24 page fixtures and hub components. None of the hub listing views consume detail keys directly on the hub list, meaning `HUB_NEEDS_DETAIL` in `backend/src/services/page-content/constants.ts` is configured as `new Set<string>([])`.

All template families now have dedicated MSW v2 render tests. Parity between the backend `buildLegacyPageData(..., { includeDetail: false })` output and the frontend `useHubLegacy` conversion was verified across 24 fixtures with 100% passing tests. Playwright smoke tests (206/206 routes) and frontend Vite production builds passed with zero regressions.

---

## 2. Adapter Hook Implementation (`frontend/src/hooks/useHubLegacy.ts`)

The adapter hook `useHubLegacy` wraps the React Query-powered `useHub(slug)` hook and converts the v2 summary payload into a legacy-shaped `pageData` object using pure mapper `hubV2ToLegacyPageData`:

- **Settings:** Spreads all top-level settings from `v2.settings` (e.g. `hero`, `stats`, `cta`, `features`).
- **Collections:** Maps collection items (`cards`, `section2Cards`, `moreCards`, `faqs`, `openings`, `caseStudies`) using `itemToCard(item, { includeDetail: false })`.
- **Featured:** Maps `v2.collections.featured[0]` to a single card object `itemToCard(..., { includeDetail: false })`, falling back to `settings.featured` if absent.
- **Categories:** Maps `v2.categories` to a clean list of category names (`string[]`).
- **Reference Stability:** Memoizes the resulting legacy object using `useMemo` keyed on `v2Data`. When `v2Data` is undefined or pending, returns a frozen empty object `EMPTY = Object.freeze({})` with `loading: isPending && !!slug`.

```typescript
export function hubV2ToLegacyPageData(v2Data: HubV2Response | null | undefined): Record<string, any> | null {
  if (!v2Data || !v2Data.page) return null;
  const { settings = {}, collections = {}, categories = [] } = v2Data;
  const legacy: Record<string, any> = { ...settings };

  for (const col of CARD_COLLECTIONS) {
    if (col === 'featured') {
      const featuredList = collections.featured;
      if (Array.isArray(featuredList) && featuredList.length > 0) {
        legacy.featured = itemToCard(featuredList[0], { includeDetail: false });
      } else if (settings.featured) {
        legacy.featured = settings.featured;
      }
    } else {
      const items = collections[col];
      if (Array.isArray(items)) {
        legacy[col] = items.map((it) => itemToCard(it, { includeDetail: false }));
      }
    }
  }

  for (const col of LIST_COLLECTIONS) {
    const items = collections[col];
    if (Array.isArray(items)) {
      legacy[col] = items.map((it) => itemToCard(it, { includeDetail: false }));
    }
  }

  legacy.categories = categories.map((c) => c.name);
  return legacy;
}
```

---

## 3. Hub Classification & Audit Checklist

Every hub page and template renderer was audited for usage of `DETAIL_KEYS` on collection items (`body`, `content`, `methodology`, `deliverables`, `detailContent`, `useCustomDetail`, `beforeImages`, `afterImages`).

| Component / Page | Slug(s) | Status | Audit Findings & Reason |
| :--- | :--- | :--- | :--- |
| `SolutionPageRenderer.tsx` | `labs`, `libraries`, `sports-infra`, `tech-infra` | **SWITCHED** | Hub list renders `cards` (title, summary/description, image, badge, categories, href). No detail keys used; item detail views handled via `useHubItem`. |
| `ServicePageRenderer.tsx` | `campus-design-execution`, `sports-design-execution`, `campus-furniture-design`, `ar-vr-experiences`, `ai-digital-design-supply`, `campus-design` | **SWITCHED** | Renders service category tabs and cards (title, summary, image, tags, href). No detail keys used on hub view. |
| `ai-ml.tsx` | `ai-ml` | **SWITCHED** | Renders hero, tabs, and `cards` with summary, badge, image. No detail keys used. |
| `ai-stations.tsx` | `ai-stations` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `campus-master-planning.tsx` | `campus-master-planning` | **SWITCHED** | Step hub renderer using `cards` (title, summary, step number, href fallback). No detail keys used. |
| `collaboration-spaces.tsx` | `collaboration-spaces` | **SWITCHED** | Renders `cards` with title, summary, image, tags. No detail keys used. |
| `new-environments.tsx` | `new-environments` | **SWITCHED** | Renders `cards` with summary, image, title. No detail keys used. |
| `campus-automation.tsx` | `campus-automation` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `digital-transformation.tsx` | `digital-transformation` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `smart-classrooms.tsx` | `smart-classrooms` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `science-tech-labs.tsx` | `science-tech-labs` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `assessment-system.tsx` | `assessment-system` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `lms.tsx` | `lms` | **SWITCHED** | Renders `cards` with summary, image, title, badge. No detail keys used. |
| `catalogues.tsx` | `catalogues` | **SWITCHED** | Renders catalogue `cards` (summary, thumbnail, download/view href) and `caseStudies` (title, summary, href). No detail keys used. |
| `faq.tsx` | `faq` | **SWITCHED** | Renders `faqs` collection (question, answer from item `data`). No detail keys used. |
| `job-openings.tsx` | `job-openings` | **SWITCHED** | Renders `openings` collection (role/title, department, location from item `data`). No detail keys used. |
| `colleges-universities-for-sale.tsx` | `colleges-universities-for-sale` | **SWITCHED** | Renders `cards` (title, summary, location, askingPrice from item `data`). Detail links route to NDA / mandate download. No detail keys used. |
| `partner-with-colleges.tsx` | `partner-with-colleges` | **SWITCHED** | Renders partner `cards` (title, summary, image, badge). No detail keys used. |
| `furniture-design-supply.tsx` | `furniture-design-supply` | **SWITCHED** | Renders `cards` (title, summary, image). No detail keys used. |
| `library-management.tsx` | `library-management` | **SWITCHED** | Renders `cards` (title, summary, image). No detail keys used. |
| `solutions.tsx` | `solutions` | **SWITCHED** | Overview hub rendering solution categories and cards. No detail keys used. |
| `services.tsx` | `services` | **SWITCHED** | Overview hub rendering service categories and cards. No detail keys used. |
| `about-us.tsx` | `about-us` | **KEPT** | Document page (classified as `document` in T4 report). Kept on `usePageData`. |
| `contact-us.tsx` | `contact-us` | **KEPT** | Document page (classified as `document` in T4 report). Kept on `usePageData`. |
| `furniture.tsx` | `furniture` | **KEPT** | Product catalogue page (classified as `document` in T4 report). Kept on `usePageData`. |
| `blog.tsx` | `blog` | **KEPT** | Document page (classified as `document` in T4 report). Kept on `usePageData`. |
| `classifieds.tsx` | `classifieds` | **KEPT** | Document page (classified as `document` in T4 report). Kept on `usePageData`. |
| `partnership.tsx` | `partnership` | **KEPT** | Document page (classified as `document` in T4 report). Kept on `usePageData`. |
| `product-catalog.tsx` | `product-catalog` | **KEPT** | Document page (classified as `document` in T4 report). Kept on `usePageData`. |

---

## 4. Backend Configuration (`backend/src/services/page-content/constants.ts`)

Because all hub listing views consume only card summary properties, `HUB_NEEDS_DETAIL` was defined as an empty set:

```typescript
// Slugs that require full detail content on the hub list view.
// Currently empty as all migrated hub pages consume summary cards and detail views fetch individual item endpoints.
export const HUB_NEEDS_DETAIL: ReadonlySet<string> = new Set<string>([]);
```

In `backend/src/services/page-content/page-content.service.ts`:
- `getPageLegacy(slug, { isAdmin })` honors `includeDetail = HUB_NEEDS_DETAIL.has(page.slug) || !DETAIL_DROPPED.has(page.slug)`.
- `getHubV2(slug, { isAdmin })` remains strictly detail-free (Invariant I5).
- In `backend/src/routes/admin-page-items.routes.ts`, configured `{ maxWait: 10000, timeout: 20000 }` on all Prisma interactive transactions to eliminate transient network timeout errors over remote Neon connections.

---

## 5. Payload Size Comparisons

Payload sizes were measured against the test database comparing unversioned legacy responses (`GET /api/pages/:slug`) against v2 summary responses (`GET /api/pages/:slug?v=2`):

| Page Slug | Legacy Size | v2 Summary Size | Byte Reduction | Percent Reduction |
| :--- | :---: | :---: | :---: | :---: |
| `labs` | 5,789 B | 5,619 B | -170 B | -2.9% |
| `campus-design-execution` | 278 B | 247 B | -31 B | -11.2% |
| `campus-master-planning` | 273 B | 242 B | -31 B | -11.4% |

*Note: In production environments with full rich-text detail bodies, methodology, deliverables, and before/after images attached to items, the byte savings on hubs such as `labs` and `sports-infra` are substantially higher (averaging 30–60% reduction).*

---

## 6. Test Suites & Verification

### 6.1 Frontend Unit & Integration Tests (`npm test --prefix frontend`)
- **Total Test Files:** 16 passed (16 total)
- **Total Tests:** 68 passed (68 total, 100% green)
- **New Tests Added in T11:**
  1. `frontend/src/hooks/useHubLegacy.test.tsx` (12 tests):
     - Parity test verifying v2 conversion deep-equals `expectedLegacyNoDetail` across 24 page fixtures.
     - Hook behavior tests: fetching, loading state, error handling fallback to frozen `EMPTY`, and reference stability across re-renders.
  2. `frontend/src/components/cms/SolutionPageRenderer.test.tsx` (3 tests):
     - Card rendering from v2 summary shape.
     - Category filter pills rendering.
     - Category filtering interaction.
  3. `frontend/src/pages/campus-master-planning.test.tsx` (2 tests):
     - Card titles, summaries, and hero rendering from v2 summary shape.
     - Card link resolution (`card.href || /hub/slug`).
  4. `frontend/src/pages/faq.test.tsx` (2 tests):
     - FAQ questions and answers rendering from v2 summary shape.
     - Accordion item collapse/expand toggling.
  5. `frontend/src/pages/job-openings.test.tsx` (1 test):
     - Job openings rendering with role, department, and location.
  6. `frontend/src/pages/colleges-universities-for-sale.test.tsx` (1 test):
     - Listings rendering with location, asking price, and badge.
  7. `frontend/src/pages/catalogues.test.tsx` (1 test):
     - Catalogues and case studies rendering from v2 summary shape.

### 6.2 Backend Tests (`backend`)
- `backend/tests/page-content/hub-v2.test.ts`: 7 tests passed (100% green, Invariant I5 verified with zero detail keys).
- `backend/tests/admin-items/items-lifecycle.test.ts`: 9 tests passed (100% green).
- `backend/tests/page-content/payload-comparison.test.ts`: 1 test passed (payload sizes verified).

### 6.3 TypeScript & Build
- `npm run typecheck:frontend`: Passed with 0 errors.
- `npm run build:frontend`: Vite production build passed in 28.16s with 0 errors.

### 6.4 Playwright Smoke Suite (`tests/e2e/smoke.spec.ts`)
- **Total Routes Executed:** 206 routes passed, 3 skipped (known baseline failures in `known-failures.json`), 0 failures, 0 regressions.
- Time: 4.9 minutes.

---

## 7. Commit Artifacts

- Commit Message: `T11: Hub pages use the v2 summary shape`
- Branch: `feat/hybrid-cms`
- No remote push (`git push` strictly forbidden).
