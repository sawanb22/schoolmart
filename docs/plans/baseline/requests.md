# Baseline Network Request Metrics

- **Date:** 2026-11-21T20:42:37.112Z
- **Environment:** Local development (Frontend: Vite 5173, Backend: Express 3001)
- **Measurement Type:** Cold loads with empty cache (new browser context per target)

## Cold Load API Request Counts (/api/*)

| Page | Path | API Requests Count |
|---|---|---|
| Home Page | `/` | **3** |
| Labs Hub | `/labs` | **4** |
| Labs Item Detail | `/labs/composite-skill-lab` | **4** |
| Prefixed Dynamic Page (without prefix) | `/50-global-resources-for-school-excellence` | **4** |

## Cold Load Image Transfer (Home Page `/`)

- **Total Images Loaded:** 20
- **Total Image Bytes:** 2382.91 KB (2.33 MB / 24,40,096 bytes)

## Detailed API Requests per Page

### Home Page (`/`)

- Total calls: 3
  - `GET` /src/api/client.ts
  - `GET` /src/api/cms.ts
  - `GET` /api/content

### Labs Hub (`/labs`)

- Total calls: 4
  - `GET` /src/api/client.ts
  - `GET` /src/api/cms.ts
  - `GET` /api/content
  - `GET` /api/pages/labs

### Labs Item Detail (`/labs/composite-skill-lab`)

- Total calls: 4
  - `GET` /src/api/client.ts
  - `GET` /src/api/cms.ts
  - `GET` /api/content
  - `GET` /api/pages/labs/items/composite-skill-lab

### Prefixed Dynamic Page (without prefix) (`/50-global-resources-for-school-excellence`)

- Total calls: 4
  - `GET` /src/api/client.ts
  - `GET` /src/api/cms.ts
  - `GET` /api/pages/resolve?path=%2F50-global-resources-for-school-excellence
  - `GET` /api/content

