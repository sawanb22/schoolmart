# SDD Task Brief: T14 – Bundle and Rendering Performance

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T14)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-14-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `f77569d`

---

## Objective
Optimize frontend bundle sizes and above-the-fold rendering performance: consolidate to a single `vite.config.ts`, implement vendor chunk splitting, dynamic-import GSAP out of the entry path, keep layout chrome mounted during route suspension, optimize fonts and favicons, harden `ErrorBoundary` against reload loops, and enforce an automated gzip bundle budget check.

---

## Detailed Steps

1. **Consolidate to a Single Vite Configuration:**
   - Delete `frontend/vite.config.js`.
   - Update `frontend/vite.config.ts` to be the sole config:
     - Retain proxy configurations for `/api` and `/uploads` to port 3001.
     - Load `kimi-plugin-inspect-react` strictly when `mode === 'development'` and `process.env.NODE_ENV !== 'production'`.
   - Update `frontend/build.js`:
     - Pass `configFile: path.resolve(__dirname, 'vite.config.ts')`.
     - Keep post-build static copy and mirroring steps.

2. **Rollup Chunk Splitting:**
   - In `frontend/vite.config.ts`, configure `build.rollupOptions.output.manualChunks(id)`:
     - `react`: `node_modules/react/`, `node_modules/react-dom/`, `node_modules/scheduler/`
     - `router`: `node_modules/react-router/`, `node_modules/react-router-dom/`
     - `query`: `node_modules/@tanstack/`
     - `gsap`: `node_modules/gsap/`, `node_modules/@gsap/`
     - `radix`: `node_modules/@radix-ui/`
     - `icons`: `node_modules/lucide-react/`
   - Set `build.target: 'es2020'`.

3. **Dynamic-Import GSAP from Entry Path:**
   - In `topbar.tsx`, `header.tsx`, `footer.tsx`, and `sections/category-bar.tsx`:
     - Replace static `import gsap from 'gsap'` with dynamic `const { default: gsap } = await import('gsap')` inside the animation `useEffect`.
     - Elements must render visible above the fold; animate only `transform` or `opacity` *from* visible state with delays <= 0.1s, or skip when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
     - Maintain identical visual appearance after animation finishes.

4. **Keep Page Frame Mounted During Route Loads:**
   - Update `Layout` in `frontend/src/App.tsx`:
     - Add props `showCategoryBar?: boolean` (default `true`) and `showBreadcrumb?: boolean` (default `true`).
     - Wrap `<main className="flex-1">{children}</main>` with `<Suspense fallback={<PageCardGridSkeleton cardCount={6} />}>`.
     - Keep outer `Suspense` as fallback for non-layout routes (admin).

5. **Home Inside Layout:**
   - Route `/` as `<Layout showCategoryBar={!styles.hideCategories} showBreadcrumb={false}><Home /></Layout>`.
   - Remove duplicate TopBar, Header, CategoryBar, and Footer from `home.tsx`.
   - Verify `/` visual test passes; if not, revert this step and document why in log.

6. **Fonts & Favicons Optimization:**
   - Search font families used in `tailwind.config.js`, `src/index.css`, `src/**/*.tsx`.
   - Optimize Google Fonts link in `frontend/index.html` to load only used families and weights (<= 12 pairs).
   - Retain `display=swap` and `preconnect` hints.
   - Switch favicon link from `favicon.png` (643 KB) to `favicon.ico` + `favicon-32x32.png`, keeping `apple-touch-icon.png`.

7. **ErrorBoundary Hardening:**
   - In `frontend/src/components/ErrorBoundary.tsx`:
     - Remove any `window.location.reload()` calls from `render()`.
     - In `componentDidCatch`: check `sessionStorage.getItem('cm_chunk_reload_ts')`. Only reload if > 30s have passed since last reload attempt (stop after 1 attempt per 30s).
     - Render fallback UI with generic message and "Reload" button.
     - Only display `error.message` when `import.meta.env.DEV` is true.

8. **Bundle Analysis & Budget Tooling:**
   - Install `rollup-plugin-visualizer` (dev dependency in frontend).
   - Create `frontend/scripts/analyze.mjs` generating `frontend/dist/stats.html`. Add `"analyze": "node scripts/analyze.mjs"` to `frontend/package.json`.
   - Create `frontend/scripts/check-bundle-budget.mjs`:
     - Reads `dist/index.html`, identifies entry script and all `modulepreload` chunks, sums their gzip bytes (`zlib.gzipSync`).
     - Exits with code 1 if total gzip exceeds 170 KB (or >= 25% smaller than T0 baseline).
   - Chain budget check to `npm run build` in `frontend/package.json`.

9. **Tests & Verification:**
   - `frontend/src/components/__tests__/ErrorBoundary.test.tsx` (chunk-load error triggers at most 1 reload, render never reloads, prod mode hides error message).
   - `frontend/src/components/layout/__tests__/Layout.test.tsx` (while lazy child suspended, header and footer remain in document).
   - Re-measure Lighthouse scores (`node scripts/measure-lighthouse.mjs`) and log results.
   - Run Playwright visual suite (`npx playwright test tests/e2e/visual.spec.ts`) and smoke suite (206/206).
   - Commit with message: `T14: Bundle and rendering performance`.

---

## Acceptance Criteria
- [ ] Only `frontend/vite.config.ts` exists. `kimi-plugin-inspect-react` does not appear in production `dist`.
- [ ] Gzip entry + modulepreloads sum meets budget (<= 170 KB or >= 25% smaller than T0 baseline).
- [ ] ErrorBoundary and Layout component tests pass.
- [ ] Playwright visual and smoke test suites pass without regression.
