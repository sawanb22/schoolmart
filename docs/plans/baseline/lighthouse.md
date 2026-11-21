# Baseline Lighthouse & Core Web Vitals Metrics

- **Date:** 2026-11-21T08:34:20.719Z
- **Form Factor:** Mobile (Pixel 7 viewport 412x915)
- **Server:** Vite Preview (Port 4173) + Express Backend (Port 3001)
- **Measurement Tool:** Playwright CDP / Chrome PerformanceObserver (Windows Headless Baseline)

## Summary (Median of 3 Runs)

| Page | Path | Performance (0-100) | LCP (ms) | CLS | TBT (ms) | FCP (ms) | SEO Score |
|---|---|---|---|---|---|---|---|
| Home | `/` | **91** | 1096 ms | 0.001 | 281 ms | 1096 ms | – |
| Labs Hub | `/labs` | **98** | 1128 ms | 0 | 225 ms | 1008 ms | **67** |

## Per-Run Breakdown

### Home Page (`/`)

| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) |
|---|---|---|---|---|---|---|
| Run 1 | 51 | 4856 ms | 0.463 | 265 ms | 3880 ms | 24 ms |
| Run 2 | 94 | 1088 ms | 0.001 | 281 ms | 1088 ms | 11 ms |
| Run 3 | 91 | 1096 ms | 0.001 | 311 ms | 1096 ms | 10 ms |

### Labs Hub (`/labs`)

| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) | SEO Score |
|---|---|---|---|---|---|---|---|
| Run 1 | 96 | 1200 ms | 0 | 244 ms | 1092 ms | 19 ms | 67/100 |
| Run 2 | 99 | 1128 ms | 0 | 215 ms | 960 ms | 9 ms | 67/100 |
| Run 3 | 98 | 1104 ms | 0 | 225 ms | 1008 ms | 9 ms | 67/100 |

