# SDD Task Brief: T9 – TanStack Query Behind the Existing Hooks

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T9, Section 3.7)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-9-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `bca11bb`

---

## Objective
Introduce TanStack Query v5 into `frontend`, replacing ad-hoc Map caches and duplicate per-hook BroadcastChannels with a unified, deduplicated data layer. All existing page components and hook signatures (`usePageData`, `useSiteContent`, `WishlistContext`) must remain 100% backward-compatible.

---

## Detailed Steps

1. **Install Dependencies in `frontend`:**
   - Pinned dependencies: `@tanstack/react-query` (v5, pin exact version).
   - Dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw` (v2).
   - Ensure clean peer compatibility with React 19.

2. **Frontend Test Harness:**
   - Create `frontend/vitest.config.ts`:
     - `environment: 'jsdom'`
     - `setupFiles: ['src/test/setup.ts']`
     - resolve `@` alias pointing to `src/` (identical to Vite config)
   - Create `frontend/src/test/setup.ts`:
     - import `@testing-library/jest-dom`
     - lifecycle hooks for MSW server (`server.listen()`, `server.resetHandlers()`, `server.close()`)
   - Create MSW v2 mock server and handlers:
     - `frontend/src/test/msw/server.ts`
     - `frontend/src/test/msw/handlers.ts`
   - Update `frontend/package.json`: `"test": "vitest run"`
   - Update root `package.json`:
     - `"test": "npm run test:backend && npm run test:frontend"`
     - `"test:frontend": "npm run test --prefix frontend"`

3. **Query Client Singleton (`frontend/src/lib/query-client.ts`):**
   - Export singleton `queryClient` with options from Section 3.7:
     - `staleTime: 60_000` (60 seconds)
     - `gcTime: 600_000` (10 minutes)
     - `refetchOnWindowFocus: false`
     - `retry: 1`

4. **Mount Provider (`frontend/src/App.tsx`):**
   - Wrap `QueryClientProvider client={queryClient}` outside `SiteContentProvider`.

5. **Centralized CMS Channel (`frontend/src/lib/cms-channel.ts`):**
   - Owns the single module-level `BroadcastChannel('cm_cms_channel')` and `cm_cms_channel` window CustomEvent.
   - Exports `broadcastCmsInvalidation(payload: { type: 'INVALIDATE_PAGE' | 'INVALIDATE_ALL'; slug?: string })`.
   - On `INVALIDATE_PAGE {slug}`: invalidates query keys:
     - `['page', slug]`
     - `['pageRecord', slug]`
     - `['hub', slug]`
     - `['hubItem', slug]`
     - `['resolve']`
   - On `INVALIDATE_ALL`: invalidates all queries (`queryClient.invalidateQueries()`).

6. **CMS API Fetchers (`frontend/src/api/cms.ts`):**
   - `fetchPageLegacy(slug: string)`: `GET /api/pages/:slug`. Parses `pageData` (handles string or object). Returns `{ record, pageData }`.
   - `fetchHub(slug: string)`: `GET /api/pages/:slug?v=2`.
   - `fetchHubItem(hubSlug: string, itemSlug: string)`: `GET /api/pages/:hubSlug/items/:itemSlug`.
   - `fetchResolve(path: string)`: `GET /api/pages/resolve?path=:path`. Catches 404 and returns `{ type: 'not_found' }` without throwing.

7. **Refactor Hooks:**
   - **`frontend/src/hooks/usePageData.ts`**:
     - Remove module Map caches and per-hook BroadcastChannels.
     - Re-export `broadcastCmsInvalidation` and `clearPageDataCache(slug?)`.
     - Return `{ data: data ?? EMPTY, loading: isPending && !!slug }`. `EMPTY` is frozen `{}`.
     - On error, returns `EMPTY` with `loading: false`.
   - **`frontend/src/hooks/useHub.ts`**: `useHub(slug)` querying `['hub', slug]`.
   - **`frontend/src/hooks/useHubItem.ts`**: `useHubItem(hubSlug, itemSlug)` querying `['hubItem', hubSlug, itemSlug]`.
   - **`frontend/src/hooks/useResolvePath.ts`**: `useResolvePath(path)` querying `['resolve', path]`. Seeds `['pageRecord', result.slug]` and `['page', result.slug]` with `queryClient.setQueryData` when `result.page` is present.

8. **Refactor `frontend/src/contexts/SiteContentContext.tsx`:**
   - Use `useQuery({ queryKey: ['siteContent'], queryFn: fetchSiteContent })`.
   - Invalidation listener subscribes through `cms-channel.ts`.
   - `refresh` callback invalidates `['siteContent']`.
   - Context value is memoized with `useMemo`.
   - `loading` reflects `isPending` (avoids flicker on background revalidation).

9. **Wishlist Context & Topbar Cleanup:**
   - In `frontend/src/contexts/WishlistContext.tsx`: ensure auth changes (e.g. `storage` event for `cm_token`/`cm_user` or `cm_auth_changed`) refresh wishlist items.
   - In `frontend/src/components/layout/topbar.tsx`: remove the redundant mount-time `refreshWishlist()` effect.

10. **Frontend Test Suite (`frontend/src/**/*.test.tsx`):**
    - `usePageData.test.tsx` (>= 5 tests):
      - 2 components mounting same slug trigger exactly 1 network request.
      - Remount within 60s makes 0 network requests.
      - `broadcastCmsInvalidation` triggers refetch.
      - On error, returns `{}` with `loading: false`.
      - Reference stability across re-renders when data hasn't changed.
    - `SiteContentContext.test.tsx` (>= 3 tests):
      - 1 `/content` request for multiple consumers.
      - Value reference stability.
      - `refresh()` triggers refetch.
    - `useResolvePath.test.tsx` (>= 2 tests):
      - Resolves path and seeds page cache; subsequent `usePageData` makes 0 network calls.
    - `cms-channel.test.ts` (>= 2 tests):
      - Exactly 1 BroadcastChannel instance created.
      - Invalidation event delivery.
    - Total >= 12 frontend tests.

11. **Verification & Measurements:**
    - `npm test` runs both backend and frontend test suites (all passing).
    - `npm run build:frontend` builds with 0 TypeScript/Vite errors.
    - Re-run `node tests/e2e/measure-requests.mjs` and log cold load `/` request reduction.
    - Run Playwright smoke suite (`npx playwright test tests/e2e/smoke.spec.ts`).
    - Commit `T9: TanStack Query behind the existing hooks`.

---

## Acceptance Criteria
- [ ] Frontend tests pass with at least 12 tests.
- [ ] Root `npm test` runs both backend and frontend suites and passes 100%.
- [ ] Playwright smoke suite passes (206/206 routes with 0 regressions).
- [ ] Cold load of `/` makes at least one fewer `/api` request than baseline.
- [ ] Revisiting `/labs` within 60s makes 0 requests to `/api/pages/labs`.
