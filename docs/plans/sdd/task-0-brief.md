# SDD Task Brief: T0 – Baseline Capture and Safety Net

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T0)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-0-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`

---

## Objective
Freeze "before" measurements, baseline test results, bundle metrics, request counts, lighthouse performance, and the golden route inventory before any architectural modifications begin.

---

## Detailed Steps

1. **Verify Git State:**
   - Confirm branch is `feat/hybrid-cms`.
   - Confirm working tree is clean.

2. **Back up the Dev Database:**
   - Run `npm run db:export --prefix backend`.
   - Confirm output file `backend/prisma/database-export.json` exists and size > 0.
   - Record backup file path and size in bytes in the execution log and report.

3. **Baseline Old Tests:**
   - Run `npm test` at the root.
   - Run `node` on every file in `tests/*.test.cjs` and `tests/*.test.mjs`.
   - Create `docs/plans/baseline/legacy-tests.md` recording pass/fail status per file. (Informational only, not gates).

4. **Baseline Frontend:**
   - Run `npm run lint --prefix frontend` and record the error count.
   - Run `npm run build:frontend` at the root.
   - Inspect generated JS chunks in `frontend/dist/assets/` and record every JS chunk with its size (largest first, plus total) in `docs/plans/baseline/bundle.md`.

5. **Write the Golden Route List:**
   - Create `backend/scripts/export-route-inventory.ts`.
   - Using Prisma against the dev database (read-only), query published pages and card collections (`cards`, `section2Cards`, `moreCards`, `featured`).
   - Query static routes from `frontend/src/App.tsx` (explicit `<Route path>` values without params, excluding `/admin/*`, `/shop`, and redirect-only routes).
   - Write output to `tests/e2e/golden-routes.json`:
     Array of `{ "path": string, "kind": "page" | "detail" | "static", "expectTitle": string }`.
   - Must have at least 60 entries.

6. **Set up Playwright Baseline:**
   - Install `@playwright/test` at root if not already installed.
   - Create `playwright.config.ts`:
     - `testDir: 'tests/e2e'`
     - `baseURL: 'http://localhost:5173'`
     - Single Chromium project
     - `webServer` entries starting backend (`npm run dev --prefix backend`, port 3001) and frontend (`npm run dev --prefix frontend`, port 5173) with `reuseExistingServer: true`.

7. **Write `tests/e2e/smoke.spec.ts`:**
   - Iterates through `tests/e2e/golden-routes.json`.
   - For each route:
     - visits path, waits for network idle (timeout 20s)
     - asserts page does NOT have "Article not found", "Something went wrong", or NotFound heading
     - asserts `h1` or visible `expectTitle` text exists
     - collects console errors, filtering known third-party noise (record filter list)

8. **Write `tests/e2e/visual.spec.ts`:**
   - Takes full-page screenshots of:
     `/`, `/labs`, `/ai-ml`, `/campus-master-planning`, `/faq`, `/job-openings`, `/catalogues`, `/colleges-universities-for-sale`, `/privacy-policy`, and 1 detail page per hub kind.
   - Sets `reducedMotion: 'reduce'`, waits network idle, waits 2500ms.
   - `toHaveScreenshot({ maxDiffPixelRatio: 0.02, animations: 'disabled' })`.
   - Generate baselines with `--update-snapshots`.

9. **Run Smoke Suite:**
   - Run `npx playwright test tests/e2e/smoke.spec.ts`.
   - Any routes that currently fail before changes go to `tests/e2e/known-failures.json` and are skipped.
   - Smoke suite must end green.

10. **Record Request Counts:**
    - Create `tests/e2e/measure-requests.mjs` using Playwright:
      - Counts `page.on('request')` to `/api/*` on cold loads of `/`, `/labs`, one `/labs/<item>`, and one prefixed dynamic page.
      - Measures total image bytes transferred on cold `/` load.
    - Save results into `docs/plans/baseline/requests.md`.

11. **Lighthouse Baseline:**
    - Build frontend (`npm run build:frontend`).
    - Serve `frontend/dist` with `npx vite preview --port 4173`.
    - Run Lighthouse against `http://localhost:4173/` and `/labs`.
    - If Lighthouse CLI is not installed globally or times out on Windows, record available performance metrics or run via npx with appropriate headless chrome flags.
    - Save output/commands into `scripts/measure-lighthouse.mjs` and `docs/plans/baseline/lighthouse.md`.
    - Stop preview server.

12. **Commit:**
    - When all acceptance criteria pass, commit with message:
      `T0: Baseline capture and safety net`
    - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.

---

## Acceptance Criteria
- [ ] The branch `feat/hybrid-cms` exists, and backup path is logged.
- [ ] `docs/plans/baseline/{legacy-tests,bundle,requests,lighthouse}.md` exist and contain numbers.
- [ ] `tests/e2e/golden-routes.json` exists and has at least 60 entries.
- [ ] `npx playwright test tests/e2e/smoke.spec.ts` passes, with known failures listed and skipped.
- [ ] Visual baselines are committed under `tests/e2e/visual.spec.ts-snapshots/`.
- [ ] Commit `T0: Baseline capture and safety net` is made.
- [ ] Never run `git push`.
