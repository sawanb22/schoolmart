# Baseline Lighthouse & Core Web Vitals Metrics

- **Date:** 2026-11-22T07:55:14.272Z
- **Form Factor:** Mobile (Pixel 7 viewport 412x915)
- **Server:** Vite Preview (Port 4173) + Express Backend (Port 3001)
- **Measurement Tool:** Playwright CDP / Chrome PerformanceObserver (Windows Headless Baseline)

## Summary (Median of 3 Runs)

| Page | Path | Performance (0-100) | LCP (ms) | CLS | TBT (ms) | FCP (ms) | SEO Score |
|---|---|---|---|---|---|---|---|
| Home | `/` | **80** | 852 ms | 0.486 | 87 ms | 852 ms | – |
| Labs Hub | `/labs` | **100** | 2036 ms | 0.08 | 44 ms | 592 ms | **83** |

## Per-Run Breakdown

### Home Page (`/`)

| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) |
|---|---|---|---|---|---|---|
| Run 1 | 80 | 844 ms | 0.486 | 80 ms | 844 ms | 9 ms |
| Run 2 | 80 | 852 ms | 0.486 | 87 ms | 852 ms | 11 ms |
| Run 3 | 80 | 944 ms | 0.447 | 90 ms | 944 ms | 5 ms |

### Labs Hub (`/labs`)

| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) | SEO Score |
|---|---|---|---|---|---|---|---|
| Run 1 | 100 | 2044 ms | 0.08 | 87 ms | 592 ms | 9 ms | 83/100 |
| Run 2 | 100 | 1912 ms | 0.08 | 26 ms | 472 ms | 10 ms | 83/100 |
| Run 3 | 100 | 2036 ms | 0.08 | 44 ms | 612 ms | 8 ms | 83/100 |

