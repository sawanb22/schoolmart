# Staging Deploy: Vercel (frontend) + Render (backend) + Neon (database)

This is the temporary test deployment for the client to review SchoolMart.
It is taken down after sign-off. Production goes to cPanel later, using a separate guide.

## Decisions for staging

| Topic | Decision |
|---|---|
| Database | The same Neon database used for local development. There is no separate copy. |
| Email / OTP | Not set up. Sign-up emails will not send, but admin login works. |
| Uploaded images | Not kept. Render's free disk is wiped on every redeploy. |
| Search engines | Blocked. `frontend/vercel.json` sends `X-Robots-Tag: noindex`. |
| Database migrations | Not run from Render. The database is already up to date. |

Because staging uses your dev database, any edit the client makes is a real edit to your data.
Local development, tests and staging all share it, except for the automated tests, which use their own test database.

---

## Step 0: Push the code

Render and Vercel deploy from GitHub, so push `main` first:

```powershell
git push origin main --follow-tags
```

---

## Step 1: Backend on Render

1. In Render, open **New → Web Service**, connect the GitHub repo and choose branch **main**.
2. Use these settings:

   | Setting | Value |
   |---|---|
   | Name | e.g. `schoolmart-api` (this gives `https://schoolmart-api.onrender.com`) |
   | Root Directory | `backend` |
   | Runtime | Node |
   | Build Command | `npm ci && npm run build` |
   | Start Command | `npm run start` |
   | Instance type | Free |
   | Health Check Path | `/ready` (under Advanced) |

3. Add these **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `24` (the version all tests were run on) |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`). Copy it from `backend/.env`. |
   | `DATABASE_URL_UNPOOLED` | Neon **direct** connection string (host without `-pooler`). Copy it from `backend/.env`. |
   | `JWT_SECRET` | A new random value of at least 32 characters (command below) |
   | `FRONTEND_URL` | Your Vercel address, e.g. `https://schoolmart-staging.vercel.app`. If you don't know it yet, guess it and fix it in Step 3. |
   | `SITE_URL` | Same value as `FRONTEND_URL` |
   | `LOG_LEVEL` | `info` |

   To generate a `JWT_SECRET` in PowerShell:
   ```powershell
   $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```

   Do **not** set these: `UPLOADS_DIR`, `RESUMES_DIR`, `SITEMAP_WRITE_PATH`, `EMAIL_*`, `PORT`. Render sets `PORT` itself.

4. Click **Create Web Service** and wait for the build to finish (about 3–5 minutes).
5. Open `https://<your-render-name>.onrender.com/ready`. It should show `{"status":"ready","db":"ok",...}`.

The free plan sleeps after 15 minutes without visitors, so the first request after that takes about a minute.

---

## Step 2: Frontend on Vercel

1. In Vercel, open **Add New → Project** and import the same GitHub repo.
2. Set **Root Directory** to `frontend`. This is required: it makes Vercel use `frontend/vercel.json`.
   - The install and build commands come from `frontend/vercel.json`, so leave the override toggles off.
   - Under **Settings → Build and Deployment → Node.js Version**, choose **24.x**.
3. Add these **Environment Variables** for the Production environment:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-render-name>.onrender.com/api` |
   | `VITE_MEDIA_BASE_URL` | `https://<your-render-name>.onrender.com` |
   | `VITE_SITE_URL` | Your Vercel address, e.g. `https://schoolmart-staging.vercel.app` |

4. Click **Deploy**.

These values are built into the site's code, so if you change them you must **redeploy** in Vercel.

---

## Step 3: Connect the two

1. Copy the real Vercel address, e.g. `https://schoolmart-staging.vercel.app`.
2. In Render, set `FRONTEND_URL` and `SITE_URL` to exactly that address, with no trailing slash. Render redeploys automatically.
3. Give the client only that main Vercel address. The backend only accepts requests from it.
   Vercel also creates a separate "preview" address for each deploy, and those addresses will be blocked.

---

## Step 4: Check it works

- [ ] `https://<render>/ready` shows `"status":"ready"`.
- [ ] The Vercel address loads the home page.
- [ ] `/labs` and one card detail page load with text content. Images may be missing, which is expected.
- [ ] Logging in at `/admin` with your existing admin account works.
- [ ] Edit one card title in **Admin → Pages**, save, and check that the public page shows the change.
- [ ] In the browser console (F12) there are no red errors that mention `CORS`.

### If something fails

| Symptom | Likely cause | Fix |
|---|---|---|
| Page loads but shows no content; console says CORS | `FRONTEND_URL` on Render doesn't exactly match the Vercel address | Fix the value (no trailing slash) |
| Requests go to `api.schoolmart.in` | Vercel env vars weren't set before the build | Set them and redeploy |
| Render deploy fails at start with "Environment validation failed" | A required variable is missing, or `JWT_SECRET` is shorter than 32 characters | Add or fix it |
| `/ready` shows `not_ready` | Wrong database URL | Re-copy both Neon URLs |
| First load takes about a minute | Free plan was asleep | Normal |

---

## Taking staging down

Delete the Render service and the Vercel project. The Neon database is not affected.
