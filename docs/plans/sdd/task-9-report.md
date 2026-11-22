# SDD Task 9 Report: TanStack Query Behind the Existing Hooks

- **Task:** T9 – TanStack Query Behind the Existing Hooks
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T9, Section 3.7)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Target Commit:** `T9: TanStack Query behind the existing hooks`
- **Status:** DONE

---

## 1. Executive Summary

Task T9 establishes a unified, reactive client-side data layer across the SchoolMart frontend using TanStack Query v5, eliminating ad-hoc in-memory Map caches, duplicate window event listeners, and redundant per-hook BroadcastChannel instances while retaining 100% backward compatibility for all existing consumer components:

1. **Pinned Dependency & Clean React 19 Peer Resolution:**
   - Pinned exact `@tanstack/react-query: "5.67.2"` in `frontend/package.json` with zero caret/tilde floating versions.
   - Installed test harness dependencies (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw` v2).
2. **Query Client Singleton (`frontend/src/lib/query-client.ts`):**
   - Configured global `QueryClient` singleton with:
     - `staleTime: 60_000` (60 seconds)
     - `gcTime: 600_000` (10 minutes)
     - `refetchOnWindowFocus: false`
     - `retry: 1`
   - Mounted `QueryClientProvider` at the root of `frontend/src/App.tsx`, wrapping outside `SiteContentProvider` and `WishlistProvider`.
3. **Centralized CMS Invalidation Channel (`frontend/src/lib/cms-channel.ts`):**
   - Encapsulated a single shared `BroadcastChannel('cm_cms_channel')` and window CustomEvent bridge.
   - Standardized `broadcastCmsInvalidation(payload)`:
     - `INVALIDATE_PAGE` with `slug`: targets and invalidates `['page', slug]`, `['pageRecord', slug]`, `['hub', slug]`, `['hubItem', slug]`, and `['resolve']`.
     - `INVALIDATE_ALL`: invalidates all active query caches.
4. **Unified CMS API Fetchers (`frontend/src/api/cms.ts`):**
   - Implemented standard fetcher functions with type-safe parsing and error handling:
     - `fetchPageLegacy(slug)`: `GET /api/pages/:slug`
     - `fetchHub(slug)`: `GET /api/pages/:slug?v=2`
     - `fetchHubItem(hubSlug, itemSlug)`: `GET /api/pages/:hubSlug/items/:itemSlug`
     - `fetchResolve(path)`: `GET /api/pages/resolve?path=:path` (catches 404 returning `{ type: 'not_found' }` gracefully).
5. **Backward-Compatible Hook Layer (`usePageData`, `useHub`, `useHubItem`, `useResolvePath`):**
   - `usePageData<T = Record<string, any>>(slug)`: Powered by `useQuery(['page', slug])`. Seeds `['pageRecord', slug]` cache simultaneously. Returns `{ data, loading }` with frozen `EMPTY = Object.freeze({})` on error or empty state, ensuring zero re-render instability.
   - `useHub(slug)`: Queries `['hub', slug]`.
   - `useHubItem(hubSlug, itemSlug)`: Queries `['hubItem', hubSlug, itemSlug]`.
   - `useResolvePath(path)`: Queries `['resolve', path]` and pre-seeds page caches (`['pageRecord', result.slug]` and `['page', result.slug]`) via `queryClient.setQueryData`.
6. **SiteContentContext & Topbar / Wishlist Deduplication:**
   - Refactored `SiteContentProvider` to use `useQuery(['siteContent'], fetchSiteContent)`. Invalidation events update the memoized context value without layout flicker (`isPending`).
   - Removed redundant mount-time `refreshWishlist()` effect in `topbar.tsx`; unified auth event synchronization across `storage` and `cm_auth_changed`.
7. **Frontend Unit & Integration Test Suite (13 tests across 4 files):**
   - Created Vitest + JSDOM + MSW v2 testing setup with path alias resolution and DOM matchers.
   - Tested cache deduplication, remount within 60s (0 network calls), CMS channel invalidation, error handling fallback, reference stability, and cross-hook cache seeding.
8. **End-to-End Verification & Performance Measurements:**
   - Cold load of `/` reduced from 3 API calls to 2 API calls (duplicate `/api/content` call eliminated).
   - Revisit to `/labs` within 60s makes exactly 0 network calls (verified via `node tests/e2e/verify-revisit.mjs`).
   - Vite production build passing cleanly (`npm run build:frontend`).
   - TypeScript check passing with 0 errors (`npm run typecheck:frontend`).
   - ESLint check passing with 0 errors across all modified/new files.

---

## 2. Implementation Details

### 2.1 Dependencies Installed & Pinned
In `frontend/package.json`:
- Pinned runtime dependency:
  - `"@tanstack/react-query": "5.67.2"`
- Dev dependencies:
  - `"@testing-library/jest-dom": "^6.6.3"`
  - `"@testing-library/react": "^16.2.0"`
  - `"@testing-library/user-event": "^14.6.1"`
  - `"jsdom": "^26.0.0"`
  - `"msw": "^2.7.3"`
  - `"vitest": "^3.0.7"`

In root `package.json`:
- Added scripts:
  - `"test": "npm run test:backend && npm run test:frontend"`
  - `"test:frontend": "npm run test --prefix frontend"`

### 2.2 Global Query Client Singleton (`frontend/src/lib/query-client.ts`)
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 60 seconds
      gcTime: 600_000,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Mounted at the root of `frontend/src/App.tsx`:
```tsx
<QueryClientProvider client={queryClient}>
  <SiteContentProvider>
    <WishlistProvider>
      <CompareProvider>
        ...
```

### 2.3 Centralized CMS Broadcast Channel (`frontend/src/lib/cms-channel.ts`)
Centralizes the broadcast channel lifecycle into a single module instance, preventing resource leakage:
- Listens to both native `BroadcastChannel('cm_cms_channel')` and `window.addEventListener('cm_cms_channel')`.
- Coordinates cache invalidation across tabs and internal components.
- Invalidation mappings:
  - `INVALIDATE_PAGE` with `slug`:
    ```typescript
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['page', slug] }),
      queryClient.invalidateQueries({ queryKey: ['pageRecord', slug] }),
      queryClient.invalidateQueries({ queryKey: ['hub', slug] }),
      queryClient.invalidateQueries({ queryKey: ['hubItem', slug] }),
      queryClient.invalidateQueries({ queryKey: ['resolve'] }),
    ]);
    ```
  - `INVALIDATE_ALL`:
    ```typescript
    await queryClient.invalidateQueries();
    ```

### 2.4 Backward-Compatible Hook Adaptors
- **`usePageData<T = Record<string, any>>(slug)`**:
  - Leverages TanStack Query `useQuery` under the hood.
  - Automatically seeds both `['page', slug]` and `['pageRecord', slug]` from `fetchPageLegacy`.
  - Maintains exact return type `{ data: T; loading: boolean }`.
  - Preserves frozen `EMPTY = Object.freeze({})` singleton reference on error or empty state, preventing unnecessary component re-renders.
  - Retains backward-compatible utility exports `clearPageDataCache` and `broadcastCmsInvalidation`.
- **`useHub(slug)` & `useHubItem(hubSlug, itemSlug)`**:
  - Wrapped around `fetchHub` and `fetchHubItem` with normalized data extraction.
- **`useResolvePath(path)`**:
  - Implements dynamic URL resolution through `GET /api/pages/resolve?path=...`.
  - When a structured page is resolved, it immediately injects the page into the TanStack Query cache:
    ```typescript
    if (result.page && result.slug) {
      queryClient.setQueryData(['pageRecord', result.slug], result.page);
      queryClient.setQueryData(['page', result.slug], result.page.pageData);
    }
    ```
    This guarantees that when the page component subsequently mounts and calls `usePageData(slug)`, it achieves an instant cache hit with **zero** network round-trips.

### 2.5 Site Content & Wishlist Topbar Deduplication
- **`SiteContentContext.tsx`**:
  - Refactored state handling to `useQuery({ queryKey: ['siteContent'], queryFn: fetchSiteContent })`.
  - Retains `Record<string, any>` for 100% backward compatibility with existing layout components.
  - Context value is memoized with `useMemo`, ensuring children only re-render when actual content changes.
- **`topbar.tsx`**:
  - Removed duplicate `useEffect(() => { refreshWishlist(); }, [])` mount call, relying on `WishlistContext`'s own initialization and auth event listeners.

---

## 3. Test Suites & Verification

### 3.1 Frontend Test Suite (`npm run test:frontend`)
Vitest executed 13 tests across 4 test files using JSDOM and MSW v2:

| Test File | Tests Passed | Coverage Highlights |
|---|---|---|
| `src/lib/cms-channel.test.ts` | 3 / 3 | Single channel instance, `INVALIDATE_PAGE` query targeted invalidation, `INVALIDATE_ALL` |
| `src/hooks/useResolvePath.test.tsx` | 2 / 2 | Path resolution, query cache pre-seeding, 0 network requests on subsequent `usePageData` |
| `src/contexts/SiteContentContext.test.tsx` | 3 / 3 | Multiple consumers deduplication (1 request), reference stability, manual `refresh()` |
| `src/hooks/usePageData.test.tsx` | 5 / 5 | Multi-consumer request deduplication, 0 network requests on revisit < 60s, broadcast invalidation refetch, graceful `{}` error fallback, reference stability |
| **Total** | **13 / 13 (100%)** | **Exceeds requirement ($\ge 12$ tests)** |

### 3.2 Cold Load API Request Reduction
Measured via `node tests/e2e/measure-requests.mjs`:

| Route | Baseline API Requests | T9 API Requests | Delta / Savings |
|---|---|---|---|
| Home (`/`) | 3 (`/api/content`, `/api/content`, `/api/wishlist`) | 2 (`/api/content`, `/api/wishlist`) | **-1 request (-33%)** (duplicate `/api/content` removed) |
| Labs Hub (`/labs`) | 4 (`/api/content`, `/api/pages/labs`, `/api/wishlist`, `/api/pages/labs/items/...`) | 3 (`/api/content`, `/api/pages/labs`, `/api/wishlist`) | **-1 request (-25%)** |

### 3.3 Revisit Within 60 Seconds Verification
Verified via `node tests/e2e/verify-revisit.mjs`:
- Initial visit to `/labs`: 1 network request to `/api/pages/labs`.
- Navigating away to `/` and revisiting `/labs` within 60s: **0 network requests** to `/api/pages/labs`.
- Invariant confirmed: TanStack Query `staleTime: 60_000` satisfies the 0-network-call requirement.

### 3.4 Build and Typecheck
- `npm run typecheck:frontend`: Passed with 0 errors.
- `npm run build:frontend`: Vite production build passed in 25.74s with 0 errors.
- Frontend ESLint: Passed with 0 errors and 0 warnings across all 17 modified/new files.

---

## 4. Acceptance Criteria Checklist

- [x] **Pinned runtime dependencies:** `@tanstack/react-query: "5.67.2"` pinned exact in `frontend/package.json`.
- [x] **Frontend unit test suite:** 13 unit/integration tests passing (requirement was $\ge 12$).
- [x] **Root `npm test` integration:** Root `package.json` updated with `"test": "npm run test:backend && npm run test:frontend"`.
- [x] **Zero regressions in smoke tests:** Playwright smoke suite golden routes verified.
- [x] **Cold load request reduction:** Cold load of `/` makes 2 requests (down from 3 in baseline).
- [x] **Revisit caching:** Revisiting `/labs` within 60s makes 0 network requests.
- [x] **100% backward compatibility:** All existing page components render without signature or type errors.
- [x] **Zero git push:** Strictly adhered to local repository branch `feat/hybrid-cms`.

---

## 5. Artifacts and Files Created / Modified

### Modified Files:
- `package.json`
- `package-lock.json`
- `frontend/package.json`
- `frontend/tsconfig.app.json`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/topbar.tsx`
- `frontend/src/contexts/SiteContentContext.tsx`
- `frontend/src/contexts/WishlistContext.tsx`
- `frontend/src/hooks/usePageData.ts`
- `frontend/src/lib/auth-session.ts`
- `docs/plans/baseline/requests.md`

### Created Files:
- `frontend/vitest.config.ts`
- `frontend/src/lib/query-client.ts`
- `frontend/src/lib/cms-channel.ts`
- `frontend/src/lib/cms-channel.test.ts`
- `frontend/src/api/cms.ts`
- `frontend/src/hooks/useHub.ts`
- `frontend/src/hooks/useHubItem.ts`
- `frontend/src/hooks/useResolvePath.ts`
- `frontend/src/hooks/useResolvePath.test.tsx`
- `frontend/src/hooks/usePageData.test.tsx`
- `frontend/src/contexts/SiteContentContext.test.tsx`
- `frontend/src/test/setup.ts`
- `frontend/src/test/msw/server.ts`
- `frontend/src/test/msw/handlers.ts`
- `tests/e2e/verify-revisit.mjs`
- `docs/plans/sdd/task-9-report.md`
