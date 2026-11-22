# SDD Task Brief: T18 – Final Verification and Handover

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T18, Section 3.8.2 and Section 6)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-18-report.md`
- **Handover destination:** `docs/plans/HYBRID_CMS_HANDOVER.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `050e17d`

---

## Objective
Execute final end-to-end verification of the entire Hybrid CMS architecture against the functional gates (Gates G1–G9) and data invariants (Invariants I1–I8) defined in Section 6 of the Master Plan. Re-run measurements (request count/payload, bundle budgets, Lighthouse/Web Vitals), update documentation (`README.md`, `HYBRID_CMS_HANDOVER.md`), package final release, and deliver comprehensive handover summary **stopping before merging into `main`**.

---

## Detailed Steps

### Step 1: Full Test Suite Verification
1. Run backend tests: `npm test --prefix backend` (asserting 100% green across all 43 test files).
2. Run frontend tests: `npm test --prefix frontend` (asserting 100% green across all 26 test files).
3. Run frontend typecheck: `npm run typecheck:frontend` (0 errors).
4. Run full production build: `npm run build` (both backend and frontend).
5. Run Playwright suites:
   - Smoke tests: `npx playwright test tests/e2e/smoke.spec.ts` (asserting 206/206 passing).
   - Visual tests: `npx playwright test tests/e2e/visual.spec.ts`.
   - SEO tests: `npx playwright test tests/e2e/seo.spec.ts`.
   - Admin items E2E: `npx playwright test tests/e2e/admin-items.spec.ts`.

### Step 2: Final Performance & Invariants Measurements
1. Re-run measurement scripts from T0:
   - Request counts and payload sizes (`scripts/measure-requests.mjs` or Playwright network logs).
   - Bundle budget verification (`node frontend/scripts/check-bundle-budget.mjs`).
   - Lighthouse / Web Vitals (`node scripts/measure-lighthouse.mjs`).
2. Run data invariant checks (Invariants I1–I8) against dev database:
   - I1: No null slugs.
   - I2: All item slugs unique per hub.
   - I3: Every `PageItemCategory` links to existing item and category.
   - I4: Every `PageItem` belongs to a valid published `Page`.
   - I5: `CmsState.version` matches highest mutation sequence.
   - I6: No collections remain in structured hub `pageData`.
   - I7: All media URLs point to valid endpoints or local `/uploads/`.
   - I8: No hardcoded `sportsurf.in` references in frontend code.
3. Record comparison table (Before T0 vs After T18).

### Step 3: Author Master Handover Document (`docs/plans/HYBRID_CMS_HANDOVER.md`)
Create a comprehensive, production-grade handover document containing:
1. Executive Summary & Architecture Overview.
2. Database Schema & Models (`Page`, `PageItem`, `PageCategory`, `PageItemCategory`, `SlugRedirect`, `PageRevision`, `CmsState`).
3. Endpoints Matrix (Public & Admin REST APIs).
4. Admin Editing Workflow (with descriptions and Playwright snapshot references).
5. Performance & Metrics Comparison Table (Before vs After).
6. Operational Runbook Reference (`docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md`).
7. Client Preview Instructions (Vercel & Railway preserved per user decision).
8. Rollback Procedures & Safeguards (`CMS_STRICT_STRUCTURED_WRITES=false`).
9. Known Limits & Future Follow-Ups.

### Step 4: Update Project Root `README.md`
Add clear, concise sections with markdown links:
- Running Tests (Unit, Integration, Playwright E2E).
- Database & Migrations (Prisma, neon dev, local test DB, production cPanel).
- CMS Content Model & Architecture.
- Link to `docs/plans/HYBRID_CMS_HANDOVER.md` and `docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md`.

### Step 5: Stop Before Merge
- Strict user directive: DO NOT merge `feat/hybrid-cms` into `main`. The user will merge it themselves.
- Zero remote push: DO NOT run `git push`.

---

## Acceptance Criteria
- [ ] Backend and frontend unit/integration test suites pass 100%.
- [ ] Playwright smoke test passes without regressions (206/206).
- [ ] Section 6 Gates G1–G9 and Invariants I1–I8 verified and recorded in log.
- [ ] `docs/plans/HYBRID_CMS_HANDOVER.md` authored.
- [ ] `README.md` updated.
- [ ] All changes committed to `feat/hybrid-cms` with message `T18: Final verification and handover`.
- [ ] Final summary presented to user.
