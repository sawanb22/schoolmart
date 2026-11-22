# Baseline Legacy Test Results

- **Date:** 2026-11-21T07:29:38.673Z
- **Total Files Tested:** 48
- **Passed:** 30
- **Failed:** 18

## Per-file Status

| File | Status | Duration (ms) | Notes |
|---|---|---|---|
| `admin-customer-login-separation.test.cjs` | **FAIL** | 238 | node:internal/assert/utils:77     throw err;     ^ AssertionError [ERR_ASSERTION]: Admin Login must display CampusMart Admin branding     at Object.<anonymous> (D:\schoolmart\campusmart-base\tests\admin-customer-login-separation.test.cjs:27:1)     at Module._compile (node:internal/modules/cjs |
| `admin-storefront-auth-sync-verification.test.cjs` | **PASS** | 240 |  |
| `ai-decoupling-verification.test.cjs` | **FAIL** | 251 | ❌ FAIL: Active src/ directory contains zero imports of ChatbotWidget or useChatbot    Error: ENOENT: no such file or directory, scandir 'D:\schoolmart\campusmart-base\src' |
| `ai-page-tabs-verification.test.cjs` | **FAIL** | 235 | ❌ FAIL: categoryOptions starts with 'All' as the very first chip    Error: ai-ml.tsx must prepend 'All' and filter out any card category named 'All' to avoid duplicates |
| `batch-article-migration-verification.test.cjs` | **PASS** | 239 |  |
| `before-after-showcase.test.mjs` | **PASS** | 308 |  |
| `brand-logo-ticker.test.mjs` | **FAIL** | 256 | node:internal/modules/run_main:107     triggerUncaughtException(     ^ AssertionError [ERR_ASSERTION]: FAIL: Backend upload middleware must accept .svg files     at file:///D:/schoolmart/campusmart-base/tests/brand-logo-ticker.test.mjs:81:8     at ModuleJob.run (node:internal/modules/esm/modu |
| `campus-design-verification.test.cjs` | **FAIL** | 262 | ❌ FAIL: campus-design-execution.tsx filters active cards and hardens cardLink routing    Error: Must filter out active === false cards ❌ FAIL: UnifiedPageEditor.tsx suppresses Card Link on target pages and includes full Subpage CMS toolbar    Error: Must suppress Card Link input for campus-design an |
| `card-subpage-dual-content.test.mjs` | **PASS** | 251 |  |
| `categories-single-source-of-truth.test.mjs` | **PASS** | 315 |  |
| `classifieds-verification.test.cjs` | **PASS** | 230 |  |
| `clean-cards-verification.test.cjs` | **PASS** | 228 |  |
| `cms-page-editor-verification.test.cjs` | **PASS** | 243 |  |
| `colleges-management-and-safety.test.mjs` | **PASS** | 258 |  |
| `cta-button-contrast-verification.test.mjs` | **FAIL** | 445 | node:internal/modules/run_main:107     triggerUncaughtException(     ^ AssertionError [ERR_ASSERTION]: UnifiedPageEditor must include Campus Gold preset     at file:///D:/schoolmart/campusmart-base/tests/cta-button-contrast-verification.test.mjs:142:1     at ModuleJob.run (node:internal/modul |
| `dynamic-page-categories.test.mjs` | **FAIL** | 22611 | npm notice run schoolmart-final-workspace@1.0.0 npx npm notice run ^"tsc^" --noEmit -p frontend/tsconfig.json npm notice run schoolmart-final-workspace@1.0.0 npx npm notice run ^"tsc^" --noEmit -p backend/tsconfig.json |
| `footer-dynamic-verification.test.cjs` | **PASS** | 368 |  |
| `furniture-page-and-stock.test.mjs` | **FAIL** | 242 | ✗ FAIL: Products.tsx manages storePageFilter state and availableStorePages list   ✗ FAIL: Products.tsx has distinct store page and subcategory filter dropdowns in filter bar   ✗ FAIL: Products.tsx Add/Edit modal has distinct Target Store Page and Subcategory dropdowns   ✗ FAIL: Products.tsx Subcat |
| `homepage-editor-collapsible-cards-verification.test.cjs` | **PASS** | 244 |  |
| `hub-editor-streamlining-verification.test.cjs` | **FAIL** | 238 | ❌ FAIL: readTime field is removed from general card editor    readTime is only kept as Badge / Specs Label for science-tech-labs ❌ FAIL: UnifiedPageEditor has purged obsolete blocks for setup-college, ugc-guidelines, innovation    Phantom Brand Name input must be purged ❌ FAIL: Introductory Content |
| `hub-pagination-and-presets-verification.test.cjs` | **PASS** | 230 |  |
| `inquiries-api.test.cjs` | **PASS** | 5379 |  |
| `orders-removal-verification.test.cjs` | **PASS** | 238 |  |
| `page-article-routing.test.mjs` | **PASS** | 503 |  |
| `pdf-upload-name-preservation.test.mjs` | **PASS** | 490 |  |
| `rich-text-editor-verification.test.cjs` | **FAIL** | 235 | ❌ FAIL: ServiceDetailPage.tsx (shared by AI Stations, Furniture Design, Sports Infra) uses RichTextContent    Error: Must render card.description using RichTextContent |
| `safe-rich-text-verification.test.cjs` | **FAIL** | 239 | ❌ FAIL: RichTextContent.tsx implements strict context separation (card vs body)    Error: Must define contextual tag allowlists ❌ FAIL: RichTextContent.tsx strictly forbids arbitrary style and class attributes    Error: Style and class attributes must be forbidden ❌ FAIL: RichTextContent.tsx exports |
| `search-bar-2parts-verification.test.cjs` | **PASS** | 233 |  |
| `search-bar-cloud-customization.test.cjs` | **FAIL** | 216 | ❌ FAIL: search-bar.tsx dynamically derives institutions from content.home_search_institutions    Error: Must read content.home_search_institutions from SiteContentContext ❌ FAIL: search-bar.tsx dynamically derives objectives from content.home_search_objectives    Error: Must read content.home_search |
| `service-suite-unification-verification.test.cjs` | **PASS** | 228 |  |
| `setup-college-layout-verification.test.cjs` | **FAIL** | 217 | node:internal/assert/utils:77     throw err;     ^ AssertionError [ERR_ASSERTION]: File must exist: D:\schoolmart\campusmart-base\frontend\src\pages\setup-college-article.tsx     at Object.<anonymous> (D:\schoolmart\campusmart-base\tests\setup-college-layout-verification.test.cjs:44:5)     at |
| `showcase-category-lifecycle.test.mjs` | **PASS** | 22183 |  |
| `solution-hub-unification-verification.test.cjs` | **PASS** | 242 |  |
| `solutions-finder-badminton-ranking-leaf-route.test.cjs` | **PASS** | 2583 |  |
| `solutions-finder-edge-cases-e2e.test.cjs` | **PASS** | 2910 |  |
| `solutions-finder-leaf-routing.test.cjs` | **PASS** | 1936 |  |
| `solutions-finder-phase1.test.cjs` | **FAIL** | 4558 | ❌ FAIL: PrismaSolutionsRepository loads active cards and watermarks with correct types    Error: Must have at least 10 seeded cards |
| `solutions-finder-phase2-admin.test.cjs` | **PASS** | 8638 |  |
| `solutions-finder-phase3-step3-frontend.test.cjs` | **FAIL** | 269 | ❌ FAIL: Section A (Requirement Scope Summary) is implemented with institutional tags and refinement toggle    Error: Section A heading missing |
| `solutions-finder-phase3.test.cjs` | **FAIL** | 2996 | ❌ FAIL: Page Blacklist: completely excludes contact-us, policies, classifieds, and test fixtures    Error: Expected values to be strictly equal: + actual - expected + 'ai-ml/gpu-computing-hub' - 'ai-ml'         ^ ❌ FAIL: Zero dead anchors: targetUrl uses rawCard.href if valid, otherwise clean pare |
| `solutions-finder-real-data-flow.test.cjs` | **PASS** | 2946 |  |
| `solutions-finder-two-call-pipeline.test.cjs` | **PASS** | 2226 |  |
| `solutions-index-sync.test.mjs` | **PASS** | 320 |  |
| `step-badge-and-subpage-verification.test.cjs` | **PASS** | 244 |  |
| `store-category-lifecycle.test.mjs` | **FAIL** | 4861 | ◇ injected env (15) from backend\.env // tip: ⌘ override existing { override: true } ▶ CampusMart Store Product Category Lifecycle & Invariant Audit Suite   ✔ A1. backend/prisma/schema.prisma remains strictly 0 diff against git HEAD (274.7521ms)   ✔ A2. Category model defines id, name, slug (unique) |
| `subpage-unification-and-card-accordion-verification.test.cjs` | **FAIL** | 240 | ❌ FAIL: UnifiedPageEditor: strip displays sequence badge, title, status toggle, and edit button    Error: Must include Edit Subpage action button ❌ FAIL: UnifiedPageEditor: provides hook dropdown and live URL preview inside expanded card    Error: Must offer hook dropdown inside card |
| `unified-categories-architecture-verification.test.cjs` | **PASS** | 223 |  |
| `user-management-verification.test.cjs` | **PASS** | 4996 |  |
