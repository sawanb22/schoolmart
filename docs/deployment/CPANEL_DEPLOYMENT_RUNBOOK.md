# CampusMart cPanel Production Deployment Runbook

- **Platform:** CampusMart / SchoolMart Hybrid CMS Platform
- **Deployment Target:** cPanel Shared Hosting with Phusion Passenger, Node.js App Manager, Apache HTTP Server, and PostgreSQL
- **Architecture Guidelines:** Decision D6 (Zero external runtime dependencies — no Redis, no Docker, no external S3/CDN)
- **Document Version:** 1.0.0 (Production Release)

---

## 1. Prerequisites & Host Compatibility

Before beginning deployment, ensure your cPanel hosting account provides the required capabilities:

### Required cPanel Features
1. **"Setup Node.js App"** interface (powered by Phusion Passenger).
2. **PostgreSQL Databases** interface (with remote or localhost connection support).
3. **cPanel Terminal** access or SSH shell access.
4. **File Manager** (with "Show Hidden Files / dotfiles" enabled).

### Host Software Versions
Access the cPanel Terminal or SSH into your server to verify environment compatibility:

```bash
# Check PostgreSQL version (Prisma 6 requires PostgreSQL 9.6+, 12+ recommended)
psql --version
# Output should show PostgreSQL 12.x, 14.x, 15.x, or 16.x

# Check OpenSSL version (determines Prisma query engine compatibility)
openssl version
# Example output: OpenSSL 3.0.7 or OpenSSL 1.1.1
```

> [!NOTE]
> The backend schema is configured with binary targets `native`, `debian-openssl-3.0.x`, `rhel-openssl-1.1.x`, and `rhel-openssl-3.0.x`.
> Most enterprise cPanel hosts run AlmaLinux / CloudLinux / RHEL 8 or 9, which match `rhel-openssl-1.1.x` or `rhel-openssl-3.0.x`.

---

## 2. Database & User Provisioning

Set up the PostgreSQL database and dedicated database user within cPanel:

1. Log into your **cPanel Dashboard**.
2. Navigate to **Databases** > **PostgreSQL Databases**.
3. **Create Database:**
   - Database Name: `campusmart` (cPanel prepends your account username, e.g., `cpuser_campusmart`).
   - Click **Create Database**.
4. **Create Database User:**
   - Username: `dbuser` (cPanel prepends your username, e.g., `cpuser_dbuser`).
   - Password: Click **Password Generator** to create a strong 32+ character random password.
   - Save the password securely.
   - Click **Create User**.
5. **Associate User with Database:**
   - Under **Add User to Database**, select User `cpuser_dbuser` and Database `cpuser_campusmart`.
   - Grant **ALL PRIVILEGES**.
   - Click **Submit**.

### Connection String Format
Your connection string for `.env` will follow this structure:
```env
DATABASE_URL=postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart?schema=public
DATABASE_URL_UNPOOLED=postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart?schema=public
```

---

## 3. Data Migration from Neon to cPanel

To migrate existing development or staging data from Neon to your local cPanel database:

### Option A: Binary Dump via `pg_dump` and `pg_restore` (Recommended)

1. **Export dump locally from Neon:**
   ```bash
   pg_dump --no-owner --no-acl -Fc "<NEON_DATABASE_URL>" -f campusmart.dump
   ```
2. **Upload `campusmart.dump`:**
   Upload `campusmart.dump` to your cPanel home directory (`/home/cpuser/campusmart.dump`) using cPanel File Manager or `scp`.
3. **Restore into cPanel PostgreSQL:**
   Open cPanel Terminal and run:
   ```bash
   pg_restore --no-owner --no-acl -d "postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart" /home/cpuser/campusmart.dump
   ```
4. **Verify migrations status:**
   Because `pg_dump` copies the `_prisma_migrations` tracking table, all applied migrations will be recognised immediately. Run:
   ```bash
   npm run db:deploy
   # Should output: "No pending migrations to apply."
   ```

### Option B: JSON Export / Restore Fallback

If `pg_dump` CLI tools are unavailable in your local terminal:
```bash
# In local backend repository:
npm run db:export
# Generates backend/prisma/database-export.json

# Upload database-export.json to ~/campusmart-api/prisma/database-export.json
# Then run on cPanel terminal:
npm run db:restore
```

---

## 4. Node.js Application Configuration in cPanel

1. In cPanel, navigate to **Software** > **Setup Node.js App**.
2. Click **Create Application**.
3. Configure the following fields:
   - **Node.js version:** Select `20.x` (or the highest Node.js LTS version available).
   - **Application mode:** Select `Production`.
   - **Application root:** `/home/cpuser/campusmart-api` (keep outside `public_html`).
   - **Application URL:** Select your API subdomain: `api.campusmart.in` (or subpath).
   - **Application startup file:** `dist/server.js`
4. Under **Environment variables**, click **Add Variable** and enter the production environment values:
   - `NODE_ENV`: `production`
   - `PORT`: `3001` (Passenger maps this internally)
   - `DATABASE_URL`: `postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart?schema=public`
   - `DATABASE_URL_UNPOOLED`: `postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart?schema=public`
   - `SITE_URL`: `https://campusmart.in`
   - `FRONTEND_URL`: `https://campusmart.in`
   - `ALLOWED_ORIGINS`: `https://campusmart.in,https://www.campusmart.in`
   - `JWT_SECRET`: `<MINIMUM_32_CHARACTERS_SECURE_RANDOM_STRING>`
   - `JWT_REFRESH_SECRET`: `<MINIMUM_32_CHARACTERS_SECURE_RANDOM_STRING>`
   - `UPLOADS_DIR`: `/home/cpuser/campusmart-data/uploads`
   - `RESUMES_DIR`: `/home/cpuser/campusmart-data/resumes`
   - `SITEMAP_WRITE_PATH`: `/home/cpuser/public_html/sitemap.xml`
   - `LOG_LEVEL`: `info`
   - `CMS_STRICT_STRUCTURED_WRITES`: `true`
5. Click **Create**.

---

## 5. Upload & Installation Workflow

### Local Packaging
On your development machine, build and package the production artifacts:
```powershell
node scripts/package-release.mjs
```
This produces two deployment bundles in `release/`:
- `release/backend-1.0.0.zip`
- `release/frontend-1.0.0.zip`

### Backend Extraction & Dependencies Installation
1. Open **cPanel File Manager**, navigate to `/home/cpuser/campusmart-api`.
2. Upload `release/backend-1.0.0.zip`.
3. Right-click the zip file and click **Extract**. Extract files directly into `/home/cpuser/campusmart-api`.
4. Create persistent data directories outside the application root:
   ```bash
   mkdir -p /home/cpuser/campusmart-data/uploads
   mkdir -p /home/cpuser/campusmart-data/resumes
   ```
5. Open **cPanel Terminal** and enter the Node virtual environment:
   ```bash
   # Source the virtual environment command displayed at the top of your Node.js App screen:
   source /home/cpuser/nodevenv/campusmart-api/20/bin/activate
   cd /home/cpuser/campusmart-api

   # Clean install production dependencies only
   npm ci --omit=dev

   # Generate Prisma client engines for the local host platform
   npx prisma generate

   # Deploy database migrations
   npm run db:deploy

   # Bootstrap core CMS pages (idempotent, safe to run multiple times)
   npm run cms:bootstrap

   # (Optional) If restoring an unmigrated database, run the item migration:
   npm run cms:migrate-items -- --dry-run
   npm run cms:migrate-items -- --apply
   ```

---

## 6. Application Restart & Health Verification

1. In cPanel **Setup Node.js App**, find your application and click **Restart**.
   *(Alternatively, run `touch /home/cpuser/campusmart-api/tmp/restart.txt` via Terminal).*

2. Verify operational probes from the Terminal or browser:

### Liveness Probe (`/health`)
```bash
curl -i https://api.campusmart.in/health
```
**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000

{"status":"ok","uptime":12.34,"timestamp":"2026-11-22T06:00:00.000Z"}
```

### Readiness Probe (`/ready`)
```bash
curl -i https://api.campusmart.in/ready
```
**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Request-Id: 789e8400-e29b-41d4-a716-446655440111

{"status":"ready","db":"ok","cmsVersion":1}
```

If the database is unreachable or times out after 2 seconds, `/ready` will return `503 Service Unavailable`:
```json
{"status":"not_ready","db":"error"}
```

---

## 7. Frontend Static Deployment

1. In cPanel File Manager, open **Settings** (top right) and ensure **"Show Hidden Files (dotfiles)"** is checked.
2. Navigate to your frontend document root (typically `/home/cpuser/public_html`).
3. If this is a clean deployment or upgrade, delete old build artifacts (`assets/`, old `.js`/`.css` bundles), while preserving any existing uploaded user directories.
4. Upload `release/frontend-1.0.0.zip` to `public_html`.
5. Extract the archive into `public_html`.
6. **Verify `.htaccess`:** Confirm that `.htaccess` exists in `public_html`.

> [!WARNING]
> If File Manager skipped dotfiles during extraction, upload `frontend/public/.htaccess` manually to `/home/cpuser/public_html/.htaccess`. Without `.htaccess`, client-side SPA routing and security headers will fail.

---

## 8. SSL & CORS Configuration

1. **AutoSSL Provisioning:**
   - Go to **cPanel** > **SSL/TLS Status**.
   - Check `campusmart.in`, `www.campusmart.in`, and `api.campusmart.in`.
   - Click **Run AutoSSL** and verify valid Let's Encrypt / Sectigo certificates are issued.
2. **CORS Alignment:**
   - In the Node.js App environment settings, confirm `FRONTEND_URL` is `https://campusmart.in`.
   - Confirm `ALLOWED_ORIGINS` includes `https://campusmart.in,https://www.campusmart.in`.
   - Requests from unauthorized origins will be rejected with HTTP 403 / CORS blocked warnings logged to `pino`.

---

## 9. Post-Deployment Live Checklist

Walk through the verification checklist in `docs/deployment/POST_DEPLOYMENT_LIVE_CHECKLIST.md`:

- [ ] `GET /health` returns 200.
- [ ] `GET /ready` returns 200 with `db: ok`.
- [ ] Visit `https://campusmart.in/` — homepage loads cleanly with hero image (`fetchpriority="high"`).
- [ ] Visit `https://campusmart.in/labs` — Hub cards load, category pills filter in-place without page reload.
- [ ] Visit `https://campusmart.in/labs/composite-skill-lab` — Detail page resolves with single API call.
- [ ] Visit `https://campusmart.in/sitemap.xml` — Valid XML containing public hubs, detail pages, and `<lastmod>`.
- [ ] Log in as admin at `https://campusmart.in/login`.
- [ ] Save changes to an existing page in Admin — confirms optimistic locking (`version` increment) and cache invalidation.
- [ ] Upload an image in Media Library — verifies image upload and WebP variant generation (or fallback).

---

## 10. Upgrade Procedures

When deploying an updated version of CampusMart:

1. **Pre-Upgrade Backup:**
   ```bash
   pg_dump --no-owner --no-acl -Fc "postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart" -f ~/backups/pre-upgrade-$(date +%Y%m%d%H%M).dump
   ```
2. **Upload New Backend:**
   - Upload new `backend-<version>.zip` to `/home/cpuser/campusmart-api`.
   - Extract files.
   - Run `npm ci --omit=dev`.
   - Run `npm run db:deploy` to apply new migrations.
   - Restart the Node app: `touch ~/campusmart-api/tmp/restart.txt`.
3. **Upload New Frontend:**
   - Upload new `frontend-<version>.zip` to `public_html`.
   - Extract files.
4. **Verify Health:**
   - Check `/health` and `/ready`.
   - Retain previous zip archives for rollback.

---

## 11. Rollback Procedures

If an upgrade introduces regressions or service disruption:

1. **Frontend Rollback:**
   - Extract the previous `frontend-<previous-version>.zip` into `public_html`.
2. **Backend Rollback:**
   - Extract the previous `backend-<previous-version>.zip` into `campusmart-api`.
   - Run `npm ci --omit=dev`.
3. **Database Rollback:**
   - If database schema migrations were applied during the failed upgrade, restore the pre-upgrade dump:
     ```bash
     pg_restore --clean --no-owner --no-acl -d "postgresql://cpuser_dbuser:<PASSWORD>@localhost:5432/cpuser_campusmart" ~/backups/pre-upgrade-<TIMESTAMP>.dump
     ```
4. **Emergency CMS Legacy Mode:**
   - If structured page writes encounter schema validation issues, set `CMS_STRICT_STRUCTURED_WRITES=false` in the Node application environment and restart. This permits legacy page writes while investigating.

---

## 12. Automated Backups

Configure automated daily backups via cPanel Cron Jobs:

1. In cPanel, navigate to **Advanced** > **Cron Jobs**.
2. **Schedule:** Daily at 02:00 AM (`0 2 * * *`).
3. **Command:**
   ```bash
   mkdir -p /home/cpuser/backups && pg_dump --no-owner --no-acl -Fc "postgresql://cpuser_dbuser:PASSWORD@localhost:5432/cpuser_campusmart" -f /home/cpuser/backups/db-$(date +\%Y\%m\%d).dump && find /home/cpuser/backups -name "db-*.dump" -mtime +14 -exec rm {} \;
   ```
   *(This exports a daily compressed binary database backup and automatically purges archives older than 14 days).*

---

## 13. Known Limits & Operational Constraints

1. **Phusion Passenger Multi-Process Rate Limiting:**
   The backend rate limiter (`express-rate-limit`) uses an in-memory counter per worker process. If cPanel Passenger runs N worker processes, the effective cluster-wide rate limit is up to N times the configured threshold per IP. For strict limits, set `PassengerMaxPoolSize 1` in `.htaccess` if server privileges allow.
2. **Sharp & Native Image Processing:**
   The backend uses `sharp` for responsive WebP variant generation. If native libvips binaries are incompatible with the host's C library, the upload controller automatically falls back to storing the original uploaded media without throwing 500 errors.
3. **No Edge CDN / Cloudflare:**
   Static assets are served directly through Apache. Browser caching is enforced via `mod_headers` immutable headers (`max-age=31536000`), while `index.html` is strictly set to `no-cache`.

## Full database copy (Neon -> cPanel) - use this, not pg_dump-less scripts

1. On your PC: `cd backend; npm run db:export` -> writes `backend/prisma/backups/backup-<time>.json` (every table, found automatically).
2. Create the empty cPanel database, then from your PC (if cPanel allows remote PostgreSQL) or the cPanel Terminal: set `DATABASE_URL` to the cPanel database and run `npx prisma migrate deploy`.
3. `TARGET_DATABASE_URL=<cpanel url> npm run db:restore -- <backup file>` (add `--force` only to overwrite a non-empty database).
4. Check row counts: `SOURCE_DATABASE_URL=<cpanel url> npm run db:export` and compare with step 1.

