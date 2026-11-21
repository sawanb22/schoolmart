# SDD Task Brief: T2 – Characterization Tests and Removal of GET Side Effects

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T2)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-2-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `c43fe9890f8457c3e5dfd35e16ecfbb33d6d03ca`

---

## Objective
Freeze the current public API responses for legacy pages and catalog endpoints using file snapshots, move all page bootstrapping logic from public HTTP GET handlers into a dedicated idempotent startup service, and make all public GET routes strictly read-only (Invariant I1).

---

## Detailed Steps

1. **Export Real Page Fixtures from Dev Database:**
   - Create `backend/scripts/export-page-fixtures.ts`.
   - Using Prisma (read-only), query and export the following slugs to `backend/tests/fixtures/pages/<slug>.json`:
     `labs`, `ai-ml`, `campus-master-planning`, `campus-design-execution`, `faq`, `job-openings`, `catalogues`, `colleges-universities-for-sale`, `sports-infra`, `libraries`, `tech-infra`, `privacy-policy`.
   - Also export at least one published page starting with `guide-`, `environment-` or `resource-` (e.g. `guide-smart-classrooms` or check existing prefix pages in DB).
   - Each file format: `{ title, slug, template, published, content, pageData }` (where `pageData` is the original string).

2. **Create Synthetic Edge-Case Fixtures:**
   - Create `backend/tests/fixtures/pages/edge-*.json` covering:
     - `edge-duplicate-titles.json` (cards with duplicate titles)
     - `edge-no-card-slugs.json` (cards with missing slug properties)
     - `edge-category-mix.json` (card with string `category` and another with `categories: string[]`)
     - `edge-section2-only.json` (page containing only `section2Cards`)
     - `edge-featured-duplicate.json` (`featured` object that duplicates a card in `cards`)
     - `edge-featured-empty.json` (`featured: {}`)
     - `edge-null-entries.json` (`null` entries inside collection arrays)
     - `edge-faq-no-title.json` (FAQ items with `question`/`answer` but no `title`)
     - `edge-script-injection.json` (detail HTML containing `<script>alert(1)</script>`)
     - `edge-unicode-titles.json` (titles with non-ASCII / Unicode / special characters)

3. **Build Characterization Contract Snapshots:**
   - Create `backend/tests/contract/legacy-pages.contract.test.ts`.
   - Helper loads fixtures into the test database (using `seedPagesFromFixtures`).
   - For each fixture, calls `GET /api/pages/<slug>` and asserts against a file snapshot (`toMatchFileSnapshot` in `backend/tests/contract/__snapshots__/<slug>.json`).
   - Before snapshotting, strip transient fields (`id`, `createdAt`, `updatedAt`) and JSON-parse `pageData` for readable, stable diffing.
   - Also snapshot `GET /api/pages/hub/catalog` and `GET /api/pages/hub/catalog?hub=labs`.

4. **Extract Page Seeding into Dedicated Bootstrap Service:**
   - Create `backend/src/services/bootstrap-pages.ts` exporting:
     `bootstrapPages(): Promise<{ created: string[], updated: string[] }>`.
   - Move all page creation / ensure logic from `backend/src/routes/pages.routes.ts`:
     - `ensureCollegeSalePage`
     - `ensurePartnerPage`
     - `ensureJobOpeningsPage`
     - `restorePartnershipIdentity`
     - `ensureSimplePage`
     - `ensureArticlePage`
     - `requiredDefaults` loop
   - Concurrency safety: wrap creates to handle Prisma unique constraint violation `P2002` (catch `P2002` and re-read the existing row).

5. **Call Bootstrap Service at Startup:**
   - Call `bootstrapPages()` in `backend/src/server.ts` before `app.listen()`.
   - Update `backend/prisma/seed.ts` and `backend/src/runSeed.ts` if they reference page ensuring logic.

6. **Eliminate Database Side Effects from Public GET Endpoints (Invariant I1):**
   - In `backend/src/routes/pages.routes.ts`:
     - Remove every `ensure*` call from `GET /`, `GET /published`, and `GET /:idOrSlug`.
     - The public GET handlers must NEVER perform database writes (`create`, `update`, `upsert`).
     - Admin `GET /` may optionally retain `bootstrapPages()` or call it, as admin routes are authenticated.

7. **Implement Verification Tests:**
   - `backend/tests/contract/legacy-pages.contract.test.ts`: at least 14 snapshot tests (all exported & edge fixtures + catalog).
   - `backend/tests/pages/no-side-effects.test.ts`:
     - Measures row count and `max(updatedAt)` on `page`.
     - Hits public endpoints: `GET /api/pages`, `GET /api/pages/published`, each fixture slug, a missing slug, and missing `faq`.
     - Asserts row count and timestamps are completely unchanged.
   - `backend/tests/services/bootstrap-pages.test.ts`:
     - On empty test database, creates all default pages.
     - On second run, creates 0 pages (idempotent).
     - Concurrent runs (`Promise.all([bootstrapPages(), bootstrapPages()])`) succeed without error or duplicate keys.

8. **Verify & Commit:**
   - `npm run test --prefix backend` passes 100%.
   - `npm run build --prefix backend` compiles with 0 TypeScript errors.
   - Commit with message:
     `T2: Characterization tests and removal of GET side effects`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-2-report.md`.

---

## Acceptance Criteria
- [ ] Contract snapshots are committed, with at least 14 tests.
- [ ] Invariant I1 holds (`backend/tests/pages/no-side-effects.test.ts` passes).
- [ ] Searching `backend/src/routes` for `ensure(Simple|Article|CollegeSale|Partner|JobOpenings)Page` finds matches only in the admin `GET /` handler, or none.
- [ ] `npm run test --prefix backend` passes with all tests green.
- [ ] `npm run build --prefix backend` compiles with 0 errors.
- [ ] Zero remote push strictly enforced (`git push` is forbidden).
- [ ] Commit `T2: Characterization tests and removal of GET side effects` created.
