# Baseline Network Request Metrics

- **Date:** 2026-11-21T17:42:49.799Z
- **Environment:** Local development (Frontend: Vite 5173, Backend: Express 3001)
- **Measurement Type:** Cold loads with empty cache (new browser context per target)

## Cold Load API Request Counts (/api/*)

| Page | Path | API Requests Count |
|---|---|---|
| Home Page | `/` | **2** |
| Labs Hub | `/labs` | **4** |
| Labs Item Detail | `/labs/composite-skill-lab` | **4** |
| Prefixed Dynamic Page (without prefix) | `/50-global-resources-for-school-excellence` | **5** |

## Cold Load Image Transfer (Home Page `/`)

- **Total Images Loaded:** 0
- **Total Image Bytes:** 0.00 KB (0.00 MB / 0 bytes)

## Detailed API Requests per Page

### Home Page (`/`)

- Total calls: 2
  - `GET` /src/api/client.ts
  - `GET` /api/content

### Labs Hub (`/labs`)

- Total calls: 4
  - `GET` /src/api/client.ts
  - `GET` /api/content
  - `GET` /src/api/cms.ts
  - `GET` /api/pages/labs

### Labs Item Detail (`/labs/composite-skill-lab`)

- Total calls: 4
  - `GET` /src/api/client.ts
  - `GET` /api/content
  - `GET` /src/api/cms.ts
  - `GET` /api/pages/labs

### Prefixed Dynamic Page (without prefix) (`/50-global-resources-for-school-excellence`)

- Total calls: 5
  - `GET` /src/api/client.ts
  - `GET` /api/pages/50-global-resources-for-school-excellence
  - `GET` /api/content
  - `GET` /api/pages/50-global-resources-for-school-excellence
  - `GET` /api/pages/50-global-resources-for-school-excellence

