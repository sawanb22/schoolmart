# SDD Task Brief: T11 – Hub Pages Use the v2 Summary Shape

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T11)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-11-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `d6c1b06`

---

## Objective
Switch frontend hub pages to consume lightweight summary payloads (`GET /api/pages/:slug?v=2`) via a new adapter hook `useHubLegacy(slug)`, dropping heavy item detail content (body HTML, methodology, deliverables) from hub list responses. Pages requiring detail content in their hub views are cataloged in `HUB_NEEDS_DETAIL` and continue using the legacy endpoint.

---

## Detailed Steps

1. **Implement Adapter Hook (`frontend/src/hooks/useHubLegacy.ts`):**
   - Implements `useHubLegacy<T = Record<string, any>>(slug: string)`:
     - Calls `useHub(slug)` (`GET /api/pages/:slug?v=2`).
     - Synthesizes legacy pageData shape from v2 payload:
       - Spreads `data.settings`.
       - Maps collection items (`cards`, `section2Cards`, `moreCards`, `faqs`, `openings`, `caseStudies`) using `itemToCard(item, { includeDetail: false })`.
       - Maps `featured`: single object `itemToCard(collections.featured[0], { includeDetail: false })` if present, else fallback to settings.
       - Maps `categories`: array of category names `string[]` from `data.categories.map(c => c.name)`.
     - Returns `{ data: legacyData ?? EMPTY, loading: isPending && !!slug }`.
     - Maintains memoized reference stability when data is unchanged.

2. **Classify & Migrate Hub Pages:**
   - Audit each hub page for usage of `DETAIL_KEYS` on collection items (`body`, `content`, `methodology`, `deliverables`, `detailContent`, `useCustomDetail`, `beforeImages`, `afterImages`):
     - **No detail keys used:** replace `usePageData(SLUG)` with `useHubLegacy(SLUG)`.
     - **Detail keys used on hub list:** keep `usePageData`, add slug to backend `HUB_NEEDS_DETAIL`, and document in execution log.
   - Migration order:
     1. `frontend/src/components/cms/SolutionPageRenderer.tsx` (primary generic hub for labs, libraries, sports-infra, tech-infra, solutions).
     2. Individual pages in `frontend/src/pages/`:
        - `ai-ml.tsx`
        - `ai-stations.tsx`
        - `campus-master-planning.tsx`
        - `campus-design.tsx`
        - `campus-design-execution.tsx`
        - `sports-design-execution.tsx`
        - `campus-furniture-design.tsx`
        - `ar-vr-experiences.tsx`
        - `collaboration.tsx`
        - `collaboration-spaces.tsx`
        - `new-environments.tsx`
        - `campus-automation.tsx`
        - `digital-transformation.tsx`
        - `innovation.tsx`
        - `smart-classrooms.tsx`
        - `science-tech-labs.tsx`
        - `assessment-system.tsx`
        - `catalogues.tsx`
        - `faq.tsx`
        - `job-openings.tsx`
        - `colleges-universities-for-sale.tsx`
        - `partner-with-colleges.tsx`
        - `ServicePageRenderer.tsx`
        - Guide hubs (`ai-guide`, `setup-college`, `ugc-guidelines`, `resources`) if they render collections.
   - Record the complete checklist table in the report and execution log: `page | switched/kept | reason`.

3. **Backend `HUB_NEEDS_DETAIL` Constant:**
   - Define `export const HUB_NEEDS_DETAIL: ReadonlySet<string> = new Set([...]);` in `backend/src/services/page-content/constants.ts`.
   - `getHubV2` remains strictly detail-free (Invariant I5).
   - Any slugs in `HUB_NEEDS_DETAIL` continue to receive legacy full detail when accessing the unversioned endpoint.

4. **Testing Suite:**
   - `frontend/src/hooks/useHubLegacy.test.tsx`:
     - Verifies v2 summary conversion outputs legacy object matching `buildLegacyPageData(..., { includeDetail: false })`.
     - Verifies category list mapping, single object `featured`, and empty collection fallbacks.
   - Render tests per template family using MSW v2:
     - `SolutionPageRenderer.test.tsx`: cards render, category filter pills render, filtering works.
     - `campus-master-planning.test.tsx` (or step hub test): card links and titles render.
     - `faq.test.tsx`: questions render and accordion toggles.
     - `job-openings.test.tsx`: openings list renders.
     - `colleges-universities-for-sale.test.tsx`: listings render.
     - `catalogues.test.tsx`: cards and case studies render.
   - Backend `hub-v2.test.ts` continues to pass 100% green with 0 detail keys.

5. **Payload Size Measurements & Verification:**
   - Measure and log response sizes for:
     - `GET /api/pages/labs` vs `GET /api/pages/labs?v=2`
     - `GET /api/pages/campus-design-execution` vs `GET /api/pages/campus-design-execution?v=2`
     - `GET /api/pages/campus-master-planning` vs `GET /api/pages/campus-master-planning?v=2`
   - Run backend and frontend test suites (`npm test`).
   - Run Playwright smoke suite (`npx playwright test tests/e2e/smoke.spec.ts`).
   - Run TypeScript typecheck (`npm run typecheck:frontend`) and Vite build (`npm run build:frontend`).
   - Commit with message: `T11: Hub pages use the v2 summary shape`.

---

## Acceptance Criteria
- [ ] Complete checklist table logged for all hub pages.
- [ ] `useHubLegacy` tested and verified matching backend summary output.
- [ ] Render tests passing for all major template families.
- [ ] Playwright smoke suite passes (206/206 routes with 0 regressions).
- [ ] Payload sizes documented proving v2 response is smaller than legacy for detail-heavy hubs.
