# SDD Task Brief: T10 – Detail Pages and Dynamic Routing Use the Item and Resolve Endpoints

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T10, Section 3.5.1)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-10-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `9df8177`

---

## Objective
Update detail pages (`ServiceDetailPage`, `UniversalArticleDetail`), dynamic routes (`DynamicPageRoute`, `DynamicChildPageRoute`), and page wrappers to use the granular item endpoint (`GET /api/pages/:hubSlug/items/:itemSlug`) and unified path resolver (`GET /api/pages/resolve`), eliminating multi-step sequential fallback probes and eliminating whole-hub data overfetching on single-card views.

---

## Detailed Steps

1. **Pure Extraction: Article View Model & Item-to-Card Mapper:**
   - Create `frontend/src/components/cms/article-view-model.ts`:
     - Exports `buildArticleViewModel(card, hub, options)`:
       - Options: `{ hubSlug: string; hubTitle: string; defaultCtaHref?: string; defaultCtaLabel?: string; normalizedSlug: string }`.
       - Extracts lines ~174–246 of `UniversalArticleDetail.tsx` (category resolution, bodyContent derivation, deliverables HTML generation, cta* fallbacks, adminEditUrl, adminEditLabel, backLink).
       - Returns `{ pageData: GenericPageData, adminEditUrl: string, adminEditLabel: string, backLink: { label: string; href: string } }`.
   - Create `frontend/src/lib/item-to-card.ts`:
     - Exports `itemToCard(item: any, options?: { includeDetail?: boolean }): Record<string, any>` mirroring `buildItem` from backend `legacy-mapper.ts` (spreading data, spreading detail, handling title, slug, summary -> description, imageUrl -> image, href, badge, categories).
   - Write unit tests `frontend/src/components/cms/article-view-model.test.ts` and `frontend/src/lib/item-to-card.test.ts`.

2. **Refactor `ServiceDetailPage.tsx`:**
   - Switch from whole-hub `usePageData(slug)` to `useHubItem(categorySlug, itemSlug)`.
   - If response has `redirectTo`: render `<Navigate to={redirectTo} replace />`.
   - Map `item` to legacy card with `itemToCard(item, { includeDetail: true })`.
   - Fall back to hub-level CTA defaults from `hub.cta`.
   - If not found or item missing: show existing not-found UI.
   - Maintain AI Solutions Finder context notice (`ref_intent`, `ref_inst`, `ref_qty`, etc.).

3. **Refactor `UniversalArticleDetail.tsx`:**
   - Switch from sequential probes and `usePageData(hubSlug)` to `useResolvePath('/' + hubSlug + '/' + itemSlug)`.
   - If `type === 'redirect'`: render `<Navigate to={result.redirectTo} replace />`.
   - If `type === 'page'`: render `GenericPageRenderer` with `result.page`.
   - If `type === 'item'` with `result.itemSlug`:
     - Query item with `useHubItem(hubSlug, result.itemSlug)`.
     - Build view model with `buildArticleViewModel(itemToCard(item, { includeDetail: true }), hubCtaAsHubData, options)`.
   - If not found or `itemSlug: null`: render existing "Article not found" UI.
   - Remove the old `api.get` probes.

4. **Refactor `DynamicPageRoute` in `App.tsx`:**
   - Replace the 4-step probe with `useResolvePath('/' + slug)`.
   - Handle `type === 'redirect'`: render `<Navigate to={result.redirectTo} replace />`.
   - Render the matched template using the **resolved** `result.slug` (fixing the prefixed slug bug where `guide-` prefix was omitted from template props).
   - Feed `GenericPageRenderer` with `result.page` and its parsed `pageData`.
   - If not found: render `<NotFound />`.

5. **Refactor `DynamicChildPageRoute.tsx`:**
   - Use `useResolvePath('/' + hubSlug + '/' + itemSlug)`.
   - If `type === 'page'`: render `GenericPageRenderer`.
   - If `type === 'item'`: choose `ServiceDetailPage` if `hubTemplate` is in the known service set (`solution-hub`, `service-suite`, `sports-infra`, `tech-infra`, `labs`, `libraries`), otherwise `UniversalArticleDetail`.
   - Both sub-components benefit from pre-seeded query cache, resulting in 0 extra network calls.
   - If `type === 'not_found'`: render `<NotFound />`.

6. **Audit `src/pages/*-detail.tsx`:**
   - Check all 25 detail pages in `src/pages/`.
   - Wrappers that render `ServiceDetailPage` or `UniversalArticleDetail` need no changes.
   - For any wrapper that directly called `usePageData` to locate a single card (e.g. `campus-design-execution-detail.tsx`, `partnership-model-detail.tsx`), adapt to use item or resolve endpoints where applicable, and record findings in the log.

7. **Test Suites:**
   - `frontend/src/components/cms/article-view-model.test.ts` (10+ card scenarios).
   - `frontend/src/lib/item-to-card.test.ts` (deep equality against backend fixtures).
   - `frontend/src/components/cms/ServiceDetailPage.test.tsx` (MSW: title/body, redirectTo, 404, exactly 1 `/api/pages/*` request).
   - `frontend/src/components/cms/UniversalArticleDetail.test.tsx` (MSW: standalone page, hub item, redirect, not found; <= 2 requests).
   - `frontend/src/components/cms/DynamicPageRoute.test.tsx` (MSW: guide- prefix resolve in 1 request with resolved slug passed, aliases, 404).

8. **Verification & Metrics:**
   - Backend + frontend tests pass (`npm test`).
   - `npm run build:frontend` and `npm run typecheck:frontend` have 0 errors.
   - Playwright smoke test passes: 206/206 routes with 0 regressions (`npx playwright test tests/e2e/smoke.spec.ts`).
   - Cold `/labs/<item>` load makes exactly 1 `/api/pages*` call + `/content`.
   - Prefixed dynamic page makes exactly 1 `/api/pages*` resolve call.
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md` and write report to `docs/plans/sdd/task-10-report.md`.
   - Commit `T10: Detail pages and dynamic routing use the item and resolve endpoints`.

---

## Acceptance Criteria
- [ ] All unit and integration tests pass.
- [ ] Playwright smoke suite passes (206/206 routes with 0 regressions).
- [ ] Cold `/labs/<item>` request count verified <= 2 API calls (item + content).
- [ ] Cold prefixed dynamic page request count verified <= 2 API calls (resolve + content).
- [ ] Changing a card slug redirects to the new URL seamlessly.
