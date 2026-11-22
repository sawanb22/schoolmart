# CampusMart (SchoolMart) Platform

CampusMart is an institutional commerce and campus infrastructure management platform connecting educational institutions, suppliers, service providers, and turnkey lab innovators.

The platform is powered by a high-performance **Hybrid CMS** architecture pairing a React 19 frontend with an Express / Prisma PostgreSQL backend.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js:** v20+ LTS
- **Package Manager:** npm v10+
- **Database:** PostgreSQL (Neon Serverless or Local / cPanel PostgreSQL)

### Installation & Development
```bash
# Install dependencies across all workspaces
npm install

# Start development servers (Frontend on :5173, Backend on :3001)
npm run dev
```

---

## 🏛️ Architecture & CMS Content Model

CampusMart implements a **Hybrid CMS** architecture balancing lightweight dynamic page settings with fully normalized, relational child entities:

- **Structured Page Settings (`Page`):** Stores page-level metadata, heroes, banners, contact details, and SEO configuration.
- **Normalized Collection Items (`PageItem`):** Cards, lab packages, services, and detail content are stored as individual rows with category linkages (`PageCategory`, `PageItemCategory`), optimistic concurrency versioning, and auto-generated slug aliases (`SlugRedirect`).
- **Audit & Revisions (`PageRevision`):** Automated point-in-time snapshots created before mutations to ensure zero data loss.
- **Reactive Cache Synchronization (`CmsState`):** Monotonic database version counter coordinating multi-process in-memory caching and instant invalidation.

For comprehensive architectural specifications, data models, endpoints, and benchmarks:
👉 **[Read the Hybrid CMS Master Handover Document](file:///d:/schoolmart/campusmart-base/docs/plans/HYBRID_CMS_HANDOVER.md)**

---

## 🧪 Running Tests

The test suite enforces zero regressions across backend unit/integration tests, frontend component tests, and end-to-end Playwright user journeys:

```bash
# Run all unit and integration tests (backend + frontend)
npm test

# Run backend test suite (Vitest + isolated test database)
npm test --prefix backend

# Run frontend test suite (Vitest + JSDOM + MSW)
npm test --prefix frontend

# Typecheck frontend
npm run typecheck:frontend

# Run Playwright End-to-End suites
npx playwright test tests/e2e/smoke.spec.ts        # 206 Golden Routes Smoke
npx playwright test tests/e2e/admin-items.spec.ts  # Admin Item E2E & Concurrency
npx playwright test tests/e2e/seo.spec.ts          # React 19 SEO & Metadata Hoisting
npx playwright test tests/e2e/visual.spec.ts       # Visual Snapshot Regression Suite
```

> [!NOTE]
> Backend Vitest tests strictly use `DATABASE_URL_TEST` with safety guards preventing execution against development or production databases.

---

## 🗄️ Database & Migrations

The database is managed with Prisma ORM.

### Common Database Commands
```bash
# View migration status
npm run --prefix backend prisma migrate status

# Apply pending migrations in production / staging
npm run db:deploy --prefix backend

# Generate Prisma client
npm run --prefix backend prisma generate

# Safe, idempotent content bootstrapping
npm run cms:bootstrap --prefix backend

# Migrate or inspect legacy blob items
npm run cms:migrate-items --prefix backend -- --dry-run
npm run cms:migrate-items --prefix backend -- --apply

# Rollback structured pages to pre-migration snapshots if needed
npm run cms:migrate-items --prefix backend -- --rollback
```

---

## 📦 Deployment & Operations

Production builds and deployments are packaged into standalone, production-hardened zip archives ready for cPanel shared hosting or Node containers:

```bash
# Package production release zips
node scripts/package-release.mjs
```
This produces:
- `release/frontend-<version>.zip`: Static assets with optimized production `.htaccess` (gzip/brotli compression, security headers, SPA fallbacks, and CSP).
- `release/backend-<version>.zip`: Compiled Express server, Prisma migrations, and bootstrap scripts.

For step-by-step server setup, Phusion Passenger configuration, environment setup, AutoSSL, and disaster recovery:
👉 **[Read the cPanel Deployment Runbook](file:///d:/schoolmart/campusmart-base/docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md)**

---

## 🛡️ License

CampusMart Proprietary. All rights reserved.
