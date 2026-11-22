# Handover for the next agent: SchoolMart (finish production readiness and deploy to cPanel)

Read this whole file before doing anything. It describes the current state, what is left, how to fix each item, and how to verify each fix.

- **Repo:** `d:\schoolmart\campusmart-base` (Windows, PowerShell; chain commands with `;`, never `&&`)
- **GitHub:** `https://github.com/sawanb22/schoolmart`, branch `main`
- **Latest pushed commit:** the "full backup/restore" commit, the one right after `41a4ebe`. Run `git log --oneline -5` to see it.

---

## 0. Working rules (the owner asked for these)

- **Be fast but careful. Owner's priority order:** safety, then quality, then speed.
- **Ask the owner before anything hard to undo:** deleting data, deploying, force-pushing, deleting files outside what this doc lists.
- **Explain in plain language.** The owner is not deeply technical. Give short status updates after each fix.
- **No browser/Playwright runs** unless the owner asks (they are slow and costly on this machine).
- **Never run the FULL backend test suite in one go.** It takes 20+ minutes against Neon and has hung before. Run only the test files related to your change: `cd backend; npx vitest run tests/<folder or file>`.
- **Frontend tests:** first clear any staging env vars, otherwise many tests fail:
  ```powershell
  cd frontend
  Remove-Item env:VITE_API_URL, env:VITE_MEDIA_BASE_URL, env:VITE_SITE_URL -ErrorAction SilentlyContinue
  npx vitest run --maxWorkers=2
  ```
  If a few tests fail with "element not found" or a timeout, re-run once. The machine is slow, and those failures are timing, not code.
- **Typechecks** (must be 0 errors before committing):
  - backend: `cd backend; npx tsc --noEmit`
  - frontend: `cd frontend; npx tsc -p tsconfig.app.json --noEmit`
- **Commit and push** after each finished item: `git push origin main`.

---

## 1. Current situation

### 1.1 What the app is
- **SchoolMart:** a school-infrastructure website with a CMS (every page is editable in `/admin`).
- **Frontend:** Vite + React 19 + TanStack Query, in `/frontend`.
- **Backend:** Express 5 + Prisma 6, in `/backend`.
- **Database:** PostgreSQL.

### 1.2 Environments
| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local dev | `npm run dev --prefix frontend` (port 5173) | `npm run dev --prefix backend` (port 3001) | Neon dev DB (`DATABASE_URL` in `backend/.env`) |
| Staging (temporary, for client review) | Vercel `schoolmart-flax.vercel.app` (Root Directory = `frontend`, uses `frontend/vercel.json`) | Render (Root Directory `backend`) | Same Neon dev DB |
| Automated tests | – | – | Separate Neon test branch (`DATABASE_URL_TEST`), wiped on each run. A safety guard in `backend/tests/global-setup.ts` refuses to run against the dev DB. |
| **Production (not done yet)** | cPanel `public_html` (static files + `.htaccess`) | cPanel "Setup Node.js App" (Passenger) | cPanel PostgreSQL |

- The data in Neon is **dummy/test content**. The client will enter real content later through the CMS.
- Staging is torn down after the client signs off.
- **Owner's cPanel workflow:** build on the PC, upload zips through File Manager, extract. There is **no SSH/terminal access**. They restart the Node app through cPanel. The `uploads` folder on cPanel is never replaced.

### 1.3 What has been done (all merged to `main`)
1. **Hybrid CMS.** Hub-page cards moved from one JSON blob into tables:
   - 11 "structured" hub pages store their cards in `pageitem`, `pagecategory` and `pageitemcategory`.
   - The other 118 pages stay JSON (`page.pageData`, `jsonb`).
   - Full plan: `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md`.
   - Handover from the first agent: `docs/plans/HYBRID_CMS_HANDOVER.md`. Parts of its schema section are inaccurate; `backend/prisma/schema.prisma` is the truth.
2. **Rebranding.** CampusMart was replaced with SchoolMart in titles, addresses (`schoolmart.in`, `api.schoolmart.in`) and database text. The duplicate "Sell on CampusMart" page was deleted.
3. **Home layout bug.** A missing-image placeholder forced the card columns to 480px. Fixed in `frontend/src/components/ui/media-image.tsx`.
4. **Single-admin simplification:**
   - No conflict checks: the last save wins, and there are no 409 `version_conflict` errors.
   - "Load Starter Template" was removed.
   - Revision History is a read-only log: a plain-English summary, the admin's name and the time, the last 20 entries per page, no restore and no page copies.
5. **Admin redesign** (the look only):
   - collapsible sidebar (`Ctrl + \`), shared UI kit in `frontend/src/admin/components/ui/`;
   - paginated lists (25 per page, max 100);
   - the dashboard still uses the light `GET /api/admin/stats` (7 counts);
   - the heavy 28-query `/overview` endpoint from `feat/admin-redesign` was deliberately left out.
6. **Login wall:**
   - `frontend/src/components/common/LoginGate.tsx` wraps all 14 public forms.
   - Catalogue "Download PDF" shows "Log in to download" when logged out.
   - The backend requires a verified login (`verifyToken`) on `POST /api/contact`, `POST /api/contact/quote` and `POST /api/inquiries`.
   - Login and registration return the user to the page they came from (`frontend/src/lib/safe-redirect.ts`).
7. **Mobile fixes:**
   - the home search "I am looking for" dropdown fits the phone screen;
   - the admin sidebar scrollbar is hidden.
8. **Full database backup/restore** (`backend/scripts/db-backup.js`, `db-restore.js`):
   - `npm run db:export` / `npm run db:restore` now copy **every table** automatically.
   - Tested: dev was restored into the test DB, and all 26 tables matched.
   - The old scripts that skipped the card tables were deleted.

### 1.4 Git state
- **Branch `main`:** everything above.
- **Tags (restore points):** `pre-hybrid-cms`, `pre-admin-redesign`.
- **`feat/hybrid-cms`, `feat/admin-redesign`, `integrate/admin-redesign`:** all merged. They can be deleted later, but **ask the owner first**.
- **`feat/homepage-redesign`:** NOT merged and untouched. The owner has not asked to merge it yet. If they ask, merge it on a separate branch first: it will conflict with the home-page and layout changes above.
- **Worktrees:** `D:/schoolmart/campusmart-admin-redesign` and `D:/schoolmart/campusmart-homepage-redesign`. Do not delete them without asking.

### 1.5 Data copies and backups
- **Inside the database:** no page copies. The `pre-migration` revisions were deleted on purpose.
  - ⚠️ So `npm run cms:migrate-items -- --rollback` **no longer works**. The way back is now a database backup.
- **Local files only (git-ignored), safe to delete after client sign-off:**
  - `backend/prisma/database-export.json` (OLD-format partial export; do not use for restores)
  - `scratch/brand-fix-backup-*.json`, `scratch/revisions-backup-*.json`
  - `scratch/package-lock.*.bak.json`
- **New full backups** go to `backend/prisma/backups/backup-<time>.json`.

---

## 2. Remaining work, in this order

### Item A: protect catalogue/document PDFs from direct-link access (IN PROGRESS, nothing changed yet)

**Problem.** The website hides the PDF link from logged-out visitors, but the files are plain static files. Anyone who has the URL can still open them:
- `/uploads/catalogues/*.pdf` (catalogues; upload storage `createStorage('catalogues')` in `backend/src/middleware/upload.middleware.ts`)
- `/uploads/documents/*.pdf` (NDA and Mandate documents for colleges-for-sale)

`backend/src/app.ts` around lines 180–196 serves all of `/uploads` with `express.static`, with no checks.

**What already exists:**
- `verifyTokenFromQueryOrHeader` in `backend/src/middleware/auth.middleware.ts`. It accepts a JWT from the `Authorization` header or from `?token=`, and requires a verified email. It is **not used anywhere yet**.
- The admin screen `frontend/src/admin/pages/Catalogues.tsx` (`downloadableFileUrl`) already appends `?token=<admin token>` to PDF links, expecting this protection.
- `frontend/src/admin/pages/CollegesManager.tsx` (around lines 1078 and 1092) links the NDA and Mandate files **without** a token. These must get the same `?token=` treatment, or they break once protection is on.

**Recommended fix** (simple and consistent with what already exists):
1. In `backend/src/app.ts`, **before** the `/uploads` static lines, add a middleware. When `req.path` matches `^/uploads/(catalogues|documents)/.+\.pdf$` (case-insensitive), run `verifyTokenFromQueryOrHeader`; otherwise call `next()`. Images and other uploads stay public.
2. Frontend: add a helper in `frontend/src/lib/`, for example `protectedFileUrl(url)`. It resolves the URL with `resolveMediaUrl` and, when the user is logged in, appends `?token=<getUserToken()>` (or `&token=` if the URL already has a query). Use it in:
   - `frontend/src/pages/catalogues.tsx` (the "Download PDF" `<a href>`, around line 240);
   - `frontend/src/pages/colleges-universities-for-sale.tsx` (`handleNdaDownload` / `handleMandateDownload`, which use `window.open`);
   - `frontend/src/admin/pages/CollegesManager.tsx` (the NDA/Mandate links; use the admin token through `getAdminToken()`).
3. **Optional improvement** (only if time allows): instead of putting the long-lived login token in the URL, add `POST /api/downloads/sign` (requires `verifyToken`) that returns a 10-minute signed link. Mention this to the owner as a later hardening step rather than doing it now.

**Tests to add** in `backend/tests/uploads/pdf-protection.test.ts`. Write a temporary PDF into `UPLOADS_DIR/catalogues/` in `beforeAll` and remove it in `afterAll`:
- GET without a token → **401**;
- with `?token=<verified user JWT>` → **200**, `Content-Type: application/pdf`;
- with an invalid token → **401**;
- a `.jpg` in the same folder without a token → **200** (images stay public);
- the same checks for `/uploads/documents/`.

Use `backend/tests/helpers/auth.ts` for tokens; `seedAdminUser()` creates a verified admin.

**Expected result when fixed:**
- the backend test passes (5+ tests), and the typechecks pass;
- `curl -I http://localhost:3001/uploads/catalogues/<file>.pdf` → `401`;
- the same URL with `?token=...` → `200`;
- logged-in users can still download from `/catalogues`, and admins can still open PDFs in the admin screens.

### Item B: remove leftover deploy files (cleanup)

**Delete:**
- `railway.json` and `backend/railway.json` (Railway is not used);
- `backend/vercel.json` (the backend is on Render, not Vercel);
- `deploy-backend-clean.zip` and `deploy-frontend-clean.zip` at the repo root (old project builds).

**Keep:**
- `frontend/vercel.json`: staging needs it.
- the root `vercel.json`: harmless, and the owner's Vercel project might use it. Ask before deleting.

**Also:**
- In `frontend/build.js`, the "mirror build output to root dist" step is only for Vercel-from-root. It can stay; ask the owner before removing it.
- Run `git grep -n "process.env.VERCEL"`. If any branch in `backend/src` uses it, keep the behaviour working on Render and cPanel.

**Expected result:** the files are gone, the backend build (`npm run build --prefix backend`) and the frontend build (`npm run build --prefix frontend`) both still succeed, and there are no references to the deleted files (`git grep railway`).

### Item C: cPanel release package check

- **Script:** `scripts/package-release.mjs` (root) creates `release/frontend-<version>.zip` and `release/backend-<version>.zip`.
- **Runbook:** `docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md`. A section "Full database copy (Neon -> cPanel)" was added at the end.

**Do:**
1. Run `node scripts/package-release.mjs`.
2. Unzip into a temporary folder and confirm:
   - the frontend zip contains `index.html`, `assets/`, `.htaccess` and `robots.txt`;
   - the backend zip contains `dist/server.js`, `dist/scripts/*.js`, `prisma/schema.prisma`, `prisma/migrations/*`, `package.json` and `package-lock.json`, and **does not contain** `.env`, `node_modules`, `uploads` or `private-resumes`.
3. Also check that `backend/scripts/db-backup.js` and `db-restore.js` are included in the backend zip. If they aren't, add them; they are plain JS and need no build step.
4. **Important for the owner's no-terminal workflow.** The runbook assumes commands like `npm ci`, `npx prisma migrate deploy` and `npm run cms:bootstrap` run on the server.
   - cPanel's "Setup Node.js App" screen has a **Run NPM Install** button and a **"Run JS script"** box that can run package.json scripts. Rewrite the runbook steps to use those buttons instead of a terminal.
   - Prisma needs the Linux engine. `binaryTargets` in `schema.prisma` already include `rhel-openssl-1.1.x`/`3.0.x` and `debian-openssl-3.0.x`. `npm install` on the server runs `postinstall: prisma generate`.
5. **Database copy to cPanel without a terminal.** Run `npm run db:export` on the PC. Then, if cPanel allows **Remote PostgreSQL** (an option in cPanel), run `npx prisma migrate deploy` and `npm run db:restore -- <file>` from the PC with `DATABASE_URL`/`TARGET_DATABASE_URL` pointing at the cPanel DB.
   - If remote access is not allowed, the fallback is an SQL import through **phpPgAdmin**. The current JSON backup is not SQL. Writing a small `db-backup-sql.js` that outputs `INSERT` statements would be a follow-up; tell the owner.

**Expected result:** both zips build; the contents check passes; the runbook lists the exact cPanel screens and buttons in order (create DB → set env vars → upload backend zip → Run NPM Install → migrate deploy → bootstrap → restore data → restart → upload frontend zip → smoke check).

### Item D: final pre-production checklist (run with the owner)
- [ ] `npm run db:export` on the PC just before go-live; keep the file safe.
- [ ] **cPanel PostgreSQL version:** 12 or later recommended (Prisma 6 needs 9.6+).
- [ ] **Backend env vars on cPanel** (see `backend/.env.example`):
  - `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (same as `DATABASE_URL` on cPanel)
  - `JWT_SECRET` (32+ characters, NEW, not the dev one), `JWT_REFRESH_SECRET`
  - `NODE_ENV=production`, `SITE_URL=https://schoolmart.in`, `FRONTEND_URL=https://schoolmart.in`, `ALLOWED_ORIGINS=https://schoolmart.in,https://www.schoolmart.in`
  - `UPLOADS_DIR` and `RESUMES_DIR` **outside** the app folder and outside `public_html` for resumes
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` (cPanel mail account; **OTP sign-up depends on this**)
  - optional: `SITEMAP_WRITE_PATH`
- [ ] Frontend build env (`frontend/.env.production`, git-ignored, already set to `api.schoolmart.in`/`schoolmart.in`): rebuild if the domains differ.
- [ ] Copy the existing `uploads` images from the PC (`backend/uploads`, about 180 MB) to the cPanel `UPLOADS_DIR` once. The owner keeps that folder on cPanel and never replaces it.
- [ ] **After deploy:**
  - `https://api.schoolmart.in/health` → ok and `/ready` → `"status":"ready"`;
  - the home page and `/labs` load, and a card detail page loads;
  - `/admin` login works; edit one card, save, and check the public page;
  - sign up with a real email → the OTP email arrives → log in → submit the contact form → it appears in Admin → Enquiries;
  - a catalogue PDF downloads while logged in and is blocked while logged out (after Item A).
- [ ] Remove the staging `X-Robots-Tag: noindex` concern: it lives only in `frontend/vercel.json`, which cPanel doesn't use. Nothing to do on cPanel, just confirm that `.htaccess` has no noindex header.
- [ ] **Tear down staging** (Render service and Vercel project) after client sign-off. Ask the owner first.

---

## 3. Known issues not to fix unless asked
- **Staging sign-up cannot send OTP emails** (Render's free plan blocks SMTP). The owner will test sign-up locally or on production. Not a code bug.
- **Staging uploads vanish on each Render redeploy** (Render's free disk is temporary). Fine on cPanel.
- **~630 ESLint errors**, mostly `no-explicit-any`, with some `react-hooks` rule warnings.
  - Not user-facing.
  - `frontend/src/admin/components/items/ItemEditorDrawer.tsx` around line 95 reads a ref during render and is worth fixing later.
  - `frontend/src/admin/pages/PageEditor.tsx` has conditional hooks (a pre-existing issue).
- **3 routes failed the original smoke baseline** (`tests/e2e/known-failures.json`), including `/digital/16-latetest`, whose slug has a trailing dash.
- **Rate limiting is in memory, per process.** That's acceptable for a single cPanel app.
- **Possible slowness:** Pages, Blog, Categories and Catalogues admin screens took more than 45 seconds to load on the slow local dev server during an unfinished check, and Classifieds showed no `h1`. Ask the owner whether these screens load fine on staging. If they don't, investigate.

---

## 4. Useful commands
```powershell
# status
git status --short; git log --oneline -5

# typechecks
cd backend; npx tsc --noEmit; cd ..
cd frontend; npx tsc -p tsconfig.app.json --noEmit; cd ..

# targeted backend tests (examples)
cd backend; npx vitest run tests/contact tests/admin-items tests/pages; cd ..

# full backup of the dev DB
cd backend; npm run db:export; cd ..

# restore into another DB (target must be migrated first)
$env:TARGET_DATABASE_URL="<url>"; cd backend; npm run db:restore -- prisma/backups/<file>.json; cd ..

# data checks (read-only)
$env:NODE_OPTIONS="--dns-result-order=ipv4first"; node scratch/check-invariants.cjs
```
If Neon connections fail with "Can't reach database server", set `$env:NODE_OPTIONS="--dns-result-order=ipv4first"` and retry. The pooled Neon host sometimes fails over IPv6.
