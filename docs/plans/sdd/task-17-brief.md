# SDD Task Brief: T17 – Ops Hardening and the cPanel Deployment Kit

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T17, Section 3.8.1)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-17-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `a4ff436`

---

## Objective
Harden application operations for production deployment on cPanel shared hosting (with Phusion Passenger and Node.js):
1. Structured JSON logging with `pino` and `pino-http`, secret redaction, and `X-Request-Id` tracing.
2. Production error handling returning sanitized `{ error: 'internal_error', requestId }` without stack trace leakage.
3. Graceful shutdown handler in `server.ts` draining active connections, stopping indexer timers, disconnecting Prisma, and exiting cleanly.
4. Liveness (`/health`) and readiness (`/ready`) probes verifying database availability and CMS version.
5. Environment validation hardening (`validateEnv`), requiring 32+ char `JWT_SECRET` in production and automatically defaulting `DATABASE_URL_UNPOOLED`.
6. Prisma binary targets configured for cPanel Linux environments (`debian-openssl-3.0.x`, `rhel-openssl-1.1.x`, `rhel-openssl-3.0.x`).
7. Production `.htaccess` with SPA fallback, `mod_deflate`, immutable cache headers for `/assets/*`, security headers, and restrictive CSP.
8. Automated release packager `scripts/package-release.mjs` generating `release/frontend-<version>.zip` and `release/backend-<version>.zip`.
9. Comprehensive cPanel deployment runbook `docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md` with step-by-step instructions.

---

## Detailed Steps

### Step 1: Structured Logging (`backend/src/lib/logger.ts`) & Request ID Tracing
- Create `backend/src/lib/logger.ts` using `pino`:
  - Level from `LOG_LEVEL` (default `info`).
  - Redact secrets: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.passwordHash`, `*.token`.
  - Format: JSON output in production, readable in development if `NODE_ENV !== 'production'`.
- In `backend/src/app.ts`:
  - Add `pino-http` middleware with `genReqId`: `req.headers['x-request-id'] || crypto.randomUUID()`.
  - Set response header `X-Request-Id` to the request ID.
- Replace `console.*` in key backend entrypoints: `app.ts`, `server.ts`, `middleware/error.middleware.ts`, `services/page-content/*`, `services/cms-cache.ts`, and `routes/pages.routes.ts`.

### Step 2: Error Middleware Hardening
- In `backend/src/middleware/error.middleware.ts`:
  - Extract request ID from `req.id` or `res.getHeader('x-request-id')`.
  - Log 500 errors with structured error details, path, method, and request ID.
  - In production (`NODE_ENV === 'production'`), sanitize error responses to `{ error: 'internal_error', requestId }`. Never leak stack traces or raw database error messages.

### Step 3: Graceful Shutdown (`backend/src/server.ts`)
- Implement `setupGracefulShutdown(server)`:
  - Intercept `SIGTERM` and `SIGINT`.
  - Stop accepting incoming HTTP connections (`server.close()`).
  - Stop background timers (e.g. `stopSolutionsIndexer()`).
  - Flush pending sitemap writes if any.
  - `await prisma.$disconnect()`.
  - Exit with `process.exit(0)`.
  - Enforce 10s force-exit timeout if connections do not drain.
  - Handler must be idempotent (repeated signals do not trigger multiple shutdowns).
  - Export a testable `shutdown()` function.

### Step 4: Health & Readiness Probes
- In `backend/src/routes/health.routes.ts`:
  - `GET /health`: Liveness probe (returns `200 { status: 'ok', uptime: process.uptime() }` without hitting DB).
  - `GET /ready`: Readiness probe:
    - Runs `SELECT 1` through Prisma with a 2-second timeout.
    - Verifies `CmsState` exists and retrieves current version.
    - If healthy: returns `200 { status: 'ready', db: 'ok', cmsVersion }`.
    - If DB check fails or times out: returns `503 { status: 'not_ready', db: 'error' }`.

### Step 5: Environment Hardening (`backend/src/config/env.ts`)
- Update `validateEnv()`:
  - Required: `DATABASE_URL`, `JWT_SECRET`.
  - Required in production: `SITE_URL`, `FRONTEND_URL`.
  - Optional with defaults:
    - `DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL` (set BEFORE Prisma initializes).
    - `UPLOADS_DIR`, `RESUMES_DIR`, `LOG_LEVEL`, `SITEMAP_WRITE_PATH`, `CMS_STRICT_STRUCTURED_WRITES`.
  - Production guard: Reject `JWT_SECRET` shorter than 32 characters when `NODE_ENV === 'production'`.
  - Update `backend/.env.example` with clear sections and explanations for cPanel.

### Step 6: Prisma Binary Targets for cPanel
- In `backend/prisma/schema.prisma`:
  - Set `binaryTargets = ["native", "debian-openssl-3.0.x", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x"]`.
  - Run `npx prisma generate` to generate client engines.

### Step 7: Production `.htaccess` & Build Integration
- In `frontend/public/.htaccess`:
  - Keep SPA rewrite rules.
  - Add `mod_deflate` compression for `text/html`, `text/css`, `application/javascript`, `application/json`, `image/svg+xml`, `application/xml`.
  - Cache headers:
    - `/assets/*` -> `Cache-Control: public, max-age=31536000, immutable`.
    - `index.html` -> `Cache-Control: no-cache`.
  - Security headers:
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `X-Frame-Options: DENY`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - CSP matching application dependencies (scripts, fonts, images, api connect, frames).
  - Wrap directives in `<IfModule>`.
- In `frontend/build.js`:
  - Add explicit step copying `public/.htaccess` to `dist/.htaccess` inside a `try/catch`. Log helpful warning on permission error.

### Step 8: Backend Security Headers & Rate Limit Notes
- In `backend/src/app.ts`:
  - Configure `helmet`:
    - Set API Content Security Policy: `contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }`.
    - Retain cross-origin resource policy for `/uploads`.
- In `backend/src/middleware/rate-limit.middleware.ts`:
  - Add explicit architectural comment documenting in-memory per-process behavior under Phusion Passenger.

### Step 9: Release Packager (`scripts/package-release.mjs`)
- Create `scripts/package-release.mjs` (runnable via `node scripts/package-release.mjs`):
  - Builds backend and frontend.
  - Creates `release/` directory.
  - Generates `release/frontend-<version>.zip` containing `frontend/dist` (including `.htaccess`).
  - Generates `release/backend-<version>.zip` containing `backend/dist`, `backend/prisma` (schema + migrations), `backend/package.json`, `backend/package-lock.json`, and compiled migration/bootstrap scripts in `dist/scripts/`.
  - Adds npm scripts to backend:
    - `"db:deploy": "prisma migrate deploy"`
    - `"cms:bootstrap": "node dist/scripts/bootstrap-pages.js"`
    - `"cms:migrate-items": "node dist/scripts/migrate-page-items.js"`

### Step 10: cPanel Deployment Runbook (`docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md`)
- Author comprehensive 13-section runbook covering:
  1. Prerequisites (cPanel Node.js App, PostgreSQL, OpenSSL check).
  2. Database & user provisioning.
  3. Data migration from Neon (`pg_dump` / `pg_restore`).
  4. Node.js app configuration (App Root, startup file `dist/server.js`, Node 20 LTS).
  5. Upload and installation workflow (`npm ci --omit=dev`, `prisma generate`, `db:deploy`, `cms:bootstrap`, `cms:migrate-items`).
  6. Application restart & health verification (`/health`, `/ready`).
  7. Frontend static deployment (`public_html`, `.htaccess`).
  8. SSL & CORS configuration (`FRONTEND_URL`, `ALLOWED_ORIGINS`).
  9. Post-deployment live checklist verification.
  10. Upgrade procedures.
  11. Rollback procedures (`CMS_STRICT_STRUCTURED_WRITES=false`).
  12. Automated backups (cron `pg_dump`).
  13. Known limits & operational constraints.

---

## Required Tests

- `backend/tests/ops/health.test.ts`: `/health` returns 200 without DB; `/ready` returns 200 with DB up, returns 503 when Prisma query throws or times out.
- `backend/tests/ops/request-id.test.ts`: Responses carry `X-Request-Id`; incoming `x-request-id` header is echoed back.
- `backend/tests/ops/error.test.ts`: 500 error returns `{ error: 'internal_error', requestId }`; production mode suppresses error message and stack trace.
- `backend/tests/ops/shutdown.test.ts`: `shutdown()` test verifies connection closing order, prisma disconnect, and idempotency.
- `backend/tests/ops/env.test.ts`: `validateEnv` rejects short secret in production and defaults `DATABASE_URL_UNPOOLED`.
- `backend/tests/ops/headers.test.ts`: API responses carry `default-src 'none'` CSP.

---

## Acceptance Criteria
- [ ] All ops unit/integration tests pass (100% green).
- [ ] `node scripts/package-release.mjs` generates valid `frontend-*.zip` and `backend-*.zip`.
- [ ] Unzipping `frontend-*.zip` confirms `.htaccess`, `index.html`, and `assets/`.
- [ ] cPanel deployment runbook exists and covers all 13 required sections.
