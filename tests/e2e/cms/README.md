# CMS category and card e2e suite

Drives the real admin UI (Categories page and page editor), then verifies the public site, the HTTP APIs and the database.

Run from the repo root (PowerShell):

    npx playwright test -c tests/e2e/cms.playwright.config.ts

What it does:

- Starts its own backend on 3101 and Vite on 5174 (`reuseExistingServer: false`). The browser talks to `http://localhost:3101/api`.
- Uses only `DATABASE_URL_TEST` from `backend/.env` (host must contain `ep-super-paper`). Any URL containing `ep-green-morning` aborts the run.
- Works in its own Postgres schema (`cms_e2e`, override with `CMS_E2E_SCHEMA`) inside that test database, so other processes using `public` (vitest, `prisma migrate reset`) cannot interfere. The schema is recreated and migrated at start and dropped at the end (`CMS_E2E_KEEP_SCHEMA=1` keeps it).
- Seeds labs / libraries / sports-infra / tech-infra baseline pages, snapshots them, creates `qa-admin@schoolmart.test` with a random password (never printed), and restores and verifies the snapshot and deletes the user in teardown.
- Spec file is `cms-flows.e2e.ts` (not `.spec.ts`) so the default `playwright.config.ts` never picks it up.

Artifacts: `tests/e2e/artifacts/cms/` (screenshots of failed tests, `results.json`, `teardown-report.txt`).
