# SDD Execution Report: T17 – Ops Hardening and the cPanel Deployment Kit

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T17, Section 3.8.1)
- **Task Brief:** `docs/plans/sdd/task-17-brief.md`
- **Execution Log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Working Directory:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `a4ff436`
- **T17 Commit:** `cc6cf22`
- **Date:** 2026-11-22
- **Status:** PENDING REVIEW

---

## 1. Executive Summary

Task T17 delivers production operations hardening, observability, graceful shutdown, environment validation, Apache `.htaccess` hardening, and the automated cPanel deployment kit for the CampusMart / SchoolMart Hybrid CMS platform.

All tasks were executed in strict accordance with the constraints:
- **Zero Remote Push Policy:** No `git push` commands executed.
- **Branch Integrity:** All changes committed on `feat/hybrid-cms` without merging into main.
- **Isolated Testing:** All tests executed exclusively against `DATABASE_URL_TEST`.
- **Decision D6 Adherence:** Production is targeted for cPanel shared hosting with Phusion Passenger, Apache HTTP Server, and PostgreSQL. Zero external daemons (no Redis, Docker, S3, CDN).

---

## 2. Implemented Capabilities & Architectural Details

### 2.1 Structured Logging & Request ID Tracing
- **Logger (`backend/src/lib/logger.ts`):** Implemented high-performance structured JSON logging using `pino`.
  - Configured log level dynamically via `LOG_LEVEL` (default `info` in production, `debug` in development).
  - Configured automatic secret redaction with censor `[REDACTED]` for sensitive authorization headers, cookies, passwords, hashes, tokens, and JWTs.
- **Request Tracing (`backend/src/app.ts`):**
  - Integrated `pino-http` middleware with custom `genReqId` extractor reading `req.headers['x-request-id']` or generating a random UUID via `crypto.randomUUID()`.
  - Configured response header echoing: every HTTP response (success or failure) carries `X-Request-Id`.
- **Console Log Refactoring:**
  - Replaced legacy `console.log`, `console.warn`, and `console.error` invocations in key entry points: `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/middleware/error.middleware.ts`, `backend/src/services/page-content/*`, `backend/src/services/cms-cache.ts`, and `backend/src/routes/pages.routes.ts`.

### 2.2 Error Middleware Hardening (`backend/src/middleware/error.middleware.ts`)
- Logged all 500-level errors via structured `logger.error` including request method, path, request ID, and error stack details.
- In production (`NODE_ENV === 'production'`), error responses for 500 status codes are strictly sanitized to:
  ```json
  { "error": "internal_error", "requestId": "<X-Request-Id>" }
  ```
  Suppressing internal stack traces, SQL error codes, and sensitive database error messages.
- Client errors (4xx) retain descriptive validation error messages alongside the request ID.

### 2.3 Graceful Shutdown & Lifecycle Management (`backend/src/server.ts`)
- Implemented `shutdown(server, options)` and `setupGracefulShutdown(server)`:
  - Traps OS process signals `SIGTERM` and `SIGINT`.
  - Drains active connections by calling `server.close()`.
  - Stops background search indexer timers via `stopSolutionsIndexer()`.
  - Cancels pending debounced atomic sitemap writes via `cancelPendingSitemapSync()`.
  - Disconnects the Prisma database client cleanly via `await prisma.$disconnect()`.
  - Enforces a 10-second force-exit timeout if in-flight connections do not drain.
  - Implements an idempotency guard so repeated signals do not trigger concurrent cleanup.

### 2.4 Health & Readiness Probes (`backend/src/routes/health.routes.ts`)
- **Liveness Probe (`GET /health`):**
  - Returns `200 OK` with `{ status: "ok", uptime: <seconds>, timestamp: <iso> }` immediately without hitting the database or external resources.
- **Readiness Probe (`GET /ready`):**
  - Executes `SELECT 1` through Prisma within an explicit 2-second timeout window.
  - Verifies database singleton `CmsState` exists and queries the current version.
  - If healthy: returns `200 OK` with `{ status: "ready", db: "ok", cmsVersion: <number> }`.
  - If database fails or times out: returns `503 Service Unavailable` with `{ status: "not_ready", db: "error" }`.

### 2.5 Environment Hardening (`backend/src/config/env.ts`)
- Created `validateEnv()` with isolated configuration validation:
  - Required in all environments: `DATABASE_URL`, `JWT_SECRET`.
  - Required in production: `SITE_URL`, `FRONTEND_URL`.
  - Production guard: Rejects `JWT_SECRET` shorter than 32 characters and known default placeholder secrets.
  - Automatically defaults `process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL` before Prisma loads, preventing startup failures when unpooled URLs are not explicitly set.
- Rewrote `backend/.env.example` with detailed sections and documentation tailored for cPanel PostgreSQL and Passenger.

### 2.6 Prisma Binary Targets
- Updated `backend/prisma/schema.prisma` generator client:
  ```prisma
  generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "debian-openssl-3.0.x", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x"]
  }
  ```
- Ran `npx prisma generate` to build query engine bindings for cPanel Linux hosts (RHEL/AlmaLinux/CloudLinux).

### 2.7 Production Apache `.htaccess` & Build Integration
- **`frontend/public/.htaccess`:**
  - Wrapped all directives in `<IfModule>` guards for portability.
  - `mod_deflate`: Gzip compression for HTML, CSS, JavaScript, JSON, SVG, and XML.
  - Caching headers: Immutably caches versioned hashed `/assets/*` bundles for 1 year (`max-age=31536000, immutable`), and enforces `no-cache, no-store, must-revalidate` for `index.html`.
  - Security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - Restrictive Content Security Policy (CSP) tailored for platform assets, Google Fonts, and YouTube/Google Maps embeds.
  - Ported SPA URL rewriting fallback to `/index.html`.
- **`frontend/build.js`:**
  - Added explicit copy step transferring `public/.htaccess` into `dist/.htaccess` inside a `try/catch` block with clear permission warning instructions.

### 2.8 Backend Security Headers & Rate Limit Architecture
- Configured Express `helmet` middleware in `app.ts` with restrictive API CSP:
  ```ts
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }
  ```
- Preserved `crossOriginResourcePolicy: { policy: 'cross-origin' }` for static uploaded media files.
- Documented in-memory per-process rate limiting under Phusion Passenger in `backend/src/middleware/rate-limit.middleware.ts`.

### 2.9 Packaging Script & Production CLI Compilation
- Created `scripts/package-release.mjs` (runnable via `node scripts/package-release.mjs`):
  - Builds backend (`npm run build --prefix backend`) and frontend (`node frontend/build.js`).
  - Packages `release/frontend-<version>.zip` containing `frontend/dist` (including `.htaccess`).
  - Packages `release/backend-<version>.zip` containing `backend/dist`, `backend/prisma` (schema + migrations), `backend/package.json`, `backend/package-lock.json`, and `.env.example`.
- Created `backend/scripts/build-cli-scripts.js` and `backend/scripts/bootstrap-pages.ts`:
  - Compiles CLI migration and bootstrap scripts to standalone CommonJS in `backend/dist/scripts/bootstrap-pages.js` and `backend/dist/scripts/migrate-page-items.js`.
  - Eliminates any runtime dependency on `ts-node` or devDependencies in production.
- Added npm scripts to `backend/package.json`:
  - `"db:deploy": "prisma migrate deploy"`
  - `"cms:bootstrap": "node dist/scripts/bootstrap-pages.js"`
  - `"cms:migrate-items": "node dist/scripts/migrate-page-items.js"`

### 2.10 cPanel Deployment Runbook (`docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md`)
- Authored a comprehensive 13-section operational guide covering:
  1. Prerequisites & host compatibility (PostgreSQL 12+, OpenSSL check).
  2. Database & user provisioning in cPanel.
  3. Data migration from Neon (`pg_dump` / `pg_restore` and fallback).
  4. Node.js app configuration in cPanel ("Setup Node.js App", Passenger startup).
  5. Upload and installation workflow (`npm ci --omit=dev`, `prisma generate`, `db:deploy`, `cms:bootstrap`, `cms:migrate-items`).
  6. Application restart & health verification (`/health`, `/ready`).
  7. Frontend static deployment (`public_html`, `.htaccess`).
  8. SSL & CORS configuration (`FRONTEND_URL`, `ALLOWED_ORIGINS`).
  9. Post-deployment live checklist verification.
  10. Upgrade procedures.
  11. Rollback procedures (`CMS_STRICT_STRUCTURED_WRITES=false`).
  12. Automated backups (cron `pg_dump` with 14-day retention).
  13. Known limits & operational constraints.

---

## 3. User Directive on Step 12 (Leftover Deploy Files)

Per explicit user guidance received during task execution:
> **User Directive:** Do NOT delete `vercel.json` (root, frontend, backend) or `railway.json` (root, backend). The user explicitly confirmed they will deploy preview environments on Vercel and Railway for client testing prior to the final cPanel production deployment. Keep all Vercel and Railway configuration files intact.

All Vercel and Railway configuration files were preserved intact.

---

## 4. Verification & Test Results

### 4.1 Ops Unit & Integration Tests (`backend/tests/ops/`)
```
 RUN  v5.1.1 D:/schoolmart/campusmart-base/backend

 ✓ tests/ops/health.test.ts (4 tests)
 ✓ tests/ops/request-id.test.ts (3 tests)
 ✓ tests/ops/error.test.ts (3 tests)
 ✓ tests/ops/shutdown.test.ts (2 tests)
 ✓ tests/ops/env.test.ts (8 tests)
 ✓ tests/ops/headers.test.ts (3 tests)

 Test Files  6 passed (6)
      Tests  23 passed (23)
```

### 4.2 Full Backend Suite (`npm test --prefix backend`)
- **Test Files:** 43 passed (43 files)
- **Tests:** 271 passed (271 tests)
- **Result:** 100% green

### 4.3 Full Frontend Suite (`npm test --prefix frontend`)
- **Test Files:** 26 passed (26 files)
- **Tests:** 123 passed (123 tests)
- **Result:** 100% green

### 4.4 Frontend TypeScript Check (`npm run typecheck:frontend`)
- **Result:** 0 errors

### 4.5 Production Release Packaging (`node scripts/package-release.mjs`)
- `release/frontend-1.0.0.zip`: 69.27 MB (verified `.htaccess`, `index.html`, `assets/`, `images/`)
- `release/backend-1.0.0.zip`: 0.57 MB (verified `dist/server.js`, `dist/scripts/`, `prisma/`, `package.json`, `package-lock.json`)

---

## 5. Acceptance Checklist

- [x] All ops unit/integration tests pass (100% green).
- [x] `node scripts/package-release.mjs` generates valid `frontend-*.zip` and `backend-*.zip`.
- [x] Unzipping `frontend-*.zip` confirms `.htaccess`, `index.html`, and `assets/`.
- [x] cPanel deployment runbook exists and covers all 13 required sections.
- [x] Execution log updated with T17 marked PENDING REVIEW.
