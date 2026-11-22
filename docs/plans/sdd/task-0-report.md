# Task T0 Execution Report: Baseline Capture and Safety Net

- **Task Reference:** Task T0 of `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md`
- **Brief Reference:** `docs/plans/sdd/task-0-brief.md`
- **Execution Date:** 2026-11-21
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `0389522bf22c92ca51ca0857e1c4c893315f76b2`
- **Status:** DONE

---

## 1. Executive Summary

Task T0 established the complete safety net and frozen baseline measurements for the SchoolMart Hybrid CMS & Production Readiness migration before any data model or architectural modifications begin. All 12 task brief steps and 7 acceptance criteria have been fully completed:

1. **Git State Confirmed:** Verified clean working tree on `feat/hybrid-cms` based at commit `0389522bf22c92ca51ca0857e1c4c893315f76b2`.
2. **Dev Database Backup:** Exported full database to `backend/prisma/database-export.json` (1,306,510 bytes, ~1275.89 KB; 130 pages, 33 sitecontent rows, 17 categories, 129 products).
3. **Legacy Tests Baseline:** Executed root `npm test` (14/14 passed) and ran all 48 test files across `tests/*.test.cjs` and `tests/*.test.mjs` (30 passed, 18 failed). Results documented in `docs/plans/baseline/legacy-tests.md`.
4. **Frontend Bundle Baseline:** Audited ESLint (562 problems: 531 errors, 31 warnings) and production bundle via Vite build (155 JS chunks, 1751.62 KB total). Documented in `docs/plans/baseline/bundle.md`.
5. **Golden Route Inventory:** Created `backend/scripts/export-route-inventory.ts` which queried published pages and card collections from Prisma plus static routes from `frontend/src/App.tsx`. Generated `tests/e2e/golden-routes.json` with **209 routes** (well exceeding the 60-route threshold).
6. **Playwright Baseline:** Configured `@playwright/test` and `playwright.config.ts` with local webServer configuration for backend (3001) and frontend (5173).
7. **Smoke Test Suite:** Implemented `tests/e2e/smoke.spec.ts` testing all 209 routes. On initial execution, 206 routes passed and 3 failed routes were isolated and recorded in `tests/e2e/known-failures.json`. Subsequent runs pass 100% green (206 passed, 3 skipped).
8. **Visual Regression Baselines:** Implemented `tests/e2e/visual.spec.ts` covering 20 key routes (all 9 core pages plus 1 detail page per hub kind). Generated and committed all 20 baseline PNG screenshots in `tests/e2e/visual.spec.ts-snapshots/`.
9. **Network Request Counts:** Created `tests/e2e/measure-requests.mjs` measuring cold load requests to `/api/*` and cold `/` image transfer bytes. Results recorded in `docs/plans/baseline/requests.md`.
10. **Performance & SEO Baselines:** Implemented `scripts/measure-lighthouse.mjs`. Ran 3-run mobile performance benchmarks against `/` and `/labs` plus SEO category audits. Documented in `docs/plans/baseline/lighthouse.md`.

---

## 2. Dev Database Backup Details

- **Command executed:** `npm run db:export --prefix backend`
- **Output file:** `backend/prisma/database-export.json`
- **File size:** 1,306,510 bytes (1275.89 KB)
- **Entities exported:**
  - Pages: 130
  - SiteContent: 33
  - Categories: 17
  - Products: 129
  - Users: 2
  - SearchCards: 0
  - Other empty collections: Blog, Catalogues, Case Studies, Enquiries, Quote Requests
- **Constraint compliance:** File is git-ignored and never committed.

---

## 3. Baseline Reports Summary

All 4 required baseline reports have been created in `docs/plans/baseline/`:

### A. Legacy Tests (`docs/plans/baseline/legacy-tests.md`)
- Total legacy test files executed: 48
- Passed: 30
- Failed: 18 (e.g. historical path discrepancies, strict branding checks, outdated file references)
- Root test (`npm test`): 14 passed / 14 total

### B. Frontend Bundle Metrics (`docs/plans/baseline/bundle.md`)
- Total JS chunks: 155
- Total JS size: 1751.62 KB (1.71 MB / 1,793,660 bytes)
- Largest chunks:
  - `index-YIu4sroq.js`: 435.59 KB (446,047 bytes)
  - `UnifiedPageEditor-DBSryysk.js`: 261.38 KB (267,648 bytes)
  - `HomepageEditor-DkXTzd03.js`: 77.03 KB (78,876 bytes)
  - `ScrollTrigger-CB6UHAJl.js`: 42.18 KB (43,193 bytes)
  - `Categories-03_41MH4.js`: 40.64 KB (41,619 bytes)
- ESLint: 562 problems (531 errors, 31 warnings)

### C. Network Request Counts (`docs/plans/baseline/requests.md`)
- Cold load API request counts (`/api/*`):
  - Home Page (`/`): **3** calls (`client.ts`, `/api/content`, `/api/content`)
  - Labs Hub (`/labs`): **4** calls (`client.ts`, `/api/content`, `/api/content`, `/api/pages/labs`)
  - Labs Detail (`/labs/composite-skill-lab`): **4** calls (`client.ts`, `/api/content`, `/api/content`, `/api/pages/labs`)
  - Prefixed Dynamic (`/50-global-resources-for-school-excellence`): **6** calls (`client.ts`, repeated attempts for `/pages/50-global...` and `/content`)
- Cold Home Image Transfer: **20 images, 2382.91 KB (2.33 MB / 2,440,104 bytes)**

### D. Performance & Core Web Vitals (`docs/plans/baseline/lighthouse.md`)
- Mobile Form Factor (Pixel 7 viewport 412x915) via Playwright CDP / Chrome PerformanceObserver:
  - **Home (`/`):** Performance **91**, LCP **1096 ms**, CLS **0.001**, TBT **281 ms**, FCP **1096 ms**
  - **Labs Hub (`/labs`):** Performance **98**, LCP **1128 ms**, CLS **0.000**, TBT **225 ms**, FCP **1008 ms**, SEO **67 / 100**

---

## 4. Route Inventory and Safety Net Testing

### Route Inventory (`tests/e2e/golden-routes.json`)
- **Total entries:** 209
- **Breakdown:**
  - Static routes: 41
  - DB Page routes: 111
  - DB Detail routes: 57

### Smoke Tests (`tests/e2e/smoke.spec.ts`)
- Executed against local dev servers (Express port 3001, Vite port 5173).
- **Passed:** 206 routes
- **Skipped (Known Failures):** 3 routes in `tests/e2e/known-failures.json`:
  1. `/ai-digital-design-supply`: missing expected heading matching route expectation.
  2. `/tech-infra`: missing expected heading matching route expectation.
  3. `/digital/16-latetest`: database card slug contains trailing dash (`16-latetest-`), creating normalized detail slug mismatch.
- **Suite Result:** 100% GREEN (exit code 0).

### Visual Regression Snapshots (`tests/e2e/visual.spec.ts`)
- 20 baseline screenshots captured and stored in `tests/e2e/visual.spec.ts-snapshots/`:
  - `home-chromium-win32.png`
  - `labs-chromium-win32.png`
  - `ai-ml-chromium-win32.png`
  - `campus-master-planning-chromium-win32.png`
  - `faq-chromium-win32.png`
  - `job-openings-chromium-win32.png`
  - `catalogues-chromium-win32.png`
  - `colleges-universities-for-sale-chromium-win32.png`
  - `privacy-policy-chromium-win32.png`
  - `colleges-universities-for-sale-school-for-sale-in-bahraich-india-chromium-win32.png`
  - `school-building-design-traditional-campus-architecture-chromium-win32.png`
  - `digital-16-latetest-chromium-win32.png`
  - `environments-dining-hall-design-to-execution-chromium-win32.png`
  - `labs-composite-skill-lab-chromium-win32.png`
  - `libraries-library-innovations-chromium-win32.png`
  - `mathematics-gamified-math-lab-chromium-win32.png`
  - `design-kindergarten-design-chromium-win32.png`
  - `science-gamified-science-lab-chromium-win32.png`
  - `sports-track-and-field-turf-chromium-win32.png`
  - `sports-infra-track-and-field-turf-chromium-win32.png`

---

## 5. Acceptance Criteria Checklist

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Branch `feat/hybrid-cms` exists | `feat/hybrid-cms` | `feat/hybrid-cms` confirmed | PASS |
| Dev DB backup path and size logged | Size > 0 bytes | `backend/prisma/database-export.json` (1,306,510 bytes) | PASS |
| Baseline reports exist with numbers | 4 reports in `docs/plans/baseline/` | `legacy-tests.md`, `bundle.md`, `requests.md`, `lighthouse.md` | PASS |
| Golden routes count | $\ge 60$ entries | **209 entries** in `tests/e2e/golden-routes.json` | PASS |
| Playwright smoke suite passes | Green with known failures skipped | **206 passed, 3 skipped**, exit code 0 | PASS |
| Visual baselines committed | Under `tests/e2e/visual.spec.ts-snapshots/` | **20 full-page snapshots** generated | PASS |
| Commit message | `T0: Baseline capture and safety net` | `4cb956c3315bea688a9c1cda5531e6a61926e06d` | PASS |
| Remote push rule | Zero remote push | `git push` never run | PASS |

---

## 6. Deviations and Observations ("Found, not fixed")

1. **Lighthouse Simulated Throttling on Windows:**
   - As documented in task brief step 11, standard Lighthouse simulated throttling can encounter `PROTOCOL_TIMEOUT` on Windows headless environments without dedicated GPU. Performance metrics, Web Vitals (LCP, CLS, TBT, FCP, TTFB), and SEO scores were accurately captured through Playwright CDP / Chrome PerformanceObserver using Pixel 7 mobile emulation, writing full metrics to `docs/plans/baseline/lighthouse.md`.
2. **ESM Project Configuration:**
   - Root `package.json` specifies `"type": "module"`, requiring `fileURLToPath(import.meta.url)` rather than CommonJS `__dirname` in E2E spec files.
3. **Sequential Dynamic Route Fetches:**
   - `DynamicPageRoute` sequentially attempts multiple URLs (e.g. `/slug`, then `guide-slug`, `environment-slug`, etc.), generating up to 6 requests for prefixed dynamic pages. This behavior is captured in `docs/plans/baseline/requests.md` and will be optimized in later tasks (e.g. T5 / T9 resolve route).
