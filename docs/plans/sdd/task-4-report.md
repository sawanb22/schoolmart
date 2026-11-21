# SDD Task 4 Report: Migration Script: Blobs to Rows

- **Task:** T4 – Migration Script: Blobs to Rows
- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T4)
- **Repo root:** `d:\schoolmart\campusmart-base`
- **Branch:** `feat/hybrid-cms`
- **Base Commit:** `654340ea509425b04ca5144b64f9bfd2ba8b31d8`
- **Created Commit:** `1c8c88a` (T4: Migration script: blobs to rows)
- **Status:** DONE

---

## 1. Executive Summary

Task T4 implements the migration pipeline that transforms legacy monolithic `pageData` JSON blobs into relational child rows (`PageItem`, `PageCategory`, `PageItemCategory`) while preserving document page integrity and establishing Invariant I4 (round-trip equivalence between legacy blobs and rebuilt structured blobs).

Key components delivered in T4:
1. **Domain Constants & Configuration (`backend/src/services/page-content/constants.ts`):** Canonical definition of card collections, list collections, single-object collections, detail keys, column projections, HTML keys, document slugs, and payload limits.
2. **Pure Legacy Mapper & Equivalence Checker (`backend/src/services/page-content/legacy-mapper.ts` & `backend/tests/helpers/legacy-equivalence.ts`):** Deterministic pure functions for slug generation (`slugify`, `normalizeSlug`), page classification (`classifyPage`), page blob decomposition (`splitLegacyPageData`, `splitItem`), and lossless reconstruction (`buildLegacyPageData`, `buildItem`). Accompanied by strict equivalence assertion enforcing the 5 permitted normalization differences.
3. **Property-Based Testing (`backend/tests/page-content/legacy-mapper.property.test.ts`):** Four `fast-check` property tests running 200 iterations each (800 total property runs) mathematically verifying:
   - **P1 (Invariant I4):** Round-trip equivalence between generated blobs and rebuilt blobs.
   - **P2:** Slug uniqueness and validity per page.
   - **P3:** Determinism of `splitLegacyPageData`.
   - **P4:** Detail isolation (guaranteeing `{}` detail for all list collections).
4. **Transactional Structured Writer (`backend/src/services/page-content/structured-writer.ts`):** Atomic transactional service executing category upsert/pruning, item upsert/pruning, batch join row creation via `createMany`, page metadata updating (`contentModel = 'structured'`), and append-only pre-migration `PageRevision` snapshot recording.
5. **Migration CLI (`backend/scripts/migrate-page-items.ts`):** CLI and programmatic interface supporting `--dry-run`, `--apply`, `--page=<slug>`, `--force`, and custom `--output`.
6. **Development Database Dry-Run (`backend/scripts/output/migrate-page-items-dev-dryrun.json`):** Executed against the live development database:
   - Total pages processed: 130
   - Structured pages identified: 11
   - Document pages retained: 119
   - Relational items discovered: 57
   - Categories mapped: 49
   - Warnings: 0, Errors: 0
7. **Database Safety Constraint:** In strict adherence to T4 constraints, `--apply` was NOT run against the development database. Dev DB received only `--dry-run`. `--apply` against dev occurs in Task T5 after the read adapter is in place.

---

## 2. Detailed Execution Steps & Actions Taken

### Step 1: Domain Constants & Page Content Architecture
- Created `backend/src/services/page-content/constants.ts`.
- Defined collection groupings:
  - `CARD_COLLECTIONS = ['cards', 'section2Cards', 'moreCards', 'featured']`
  - `LIST_COLLECTIONS = ['faqs', 'openings', 'caseStudies']`
  - `COLLECTIONS = [...CARD_COLLECTIONS, ...LIST_COLLECTIONS]`
  - `SINGLE_OBJECT_COLLECTIONS = new Set(['featured'])`
- Defined field mappings:
  - `DETAIL_KEYS = ['detailContent', 'useCustomDetail', 'body', 'content', 'methodology', 'deliverables', 'deliverablesHeading', 'beforeImages', 'afterImages', 'ctaTitle', 'ctaSubtitle', 'ctaButtonLabel', 'ctaButtonHref', 'ctaHref', 'hideCta']`
  - `COLUMN_KEYS = { title: 'title', slug: 'slug', description: 'summary', image: 'imageUrl', href: 'href', badge: 'badge' }`
  - `HTML_KEYS = ['detailContent', 'body', 'content', 'methodology', 'answer']`
- Defined document slugs and article routes:
  - `DOCUMENT_ONLY_SLUGS = new Set(['home', 'furniture', 'contact-us', 'about-us', 'corporate'])`
  - `ARTICLE_PAGE_SLUGS = new Set(['terms-and-conditions', 'privacy-policy', 'refund-policy', 'shipping-policy'])`
- Configured size guard thresholds:
  - `MAX_PAGEDATA_BYTES = 512 * 1024` (512 KB)
  - `MAX_ITEM_JSON_BYTES = 256 * 1024` (256 KB)
  - `REVISIONS_KEPT_PER_PAGE = 30`

### Step 2: Pure Legacy Mapper & Equivalence Validator
- Created `backend/src/services/page-content/legacy-mapper.ts`:
  - `slugify(s)`: String normalization matching frontend slugify behavior `s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')`.
  - `normalizeSlug(s)`: Trims slashes, lowercases, and takes last segment (`s.split('/').pop()`).
  - `classifyPage(page)`: Classifies page as `'document'` or `'structured'`:
    - Document if slug is in `DOCUMENT_ONLY_SLUGS` or `ARTICLE_PAGE_SLUGS`.
    - Document if template is `'article'`, `'form'`, `'empty'`, or `'corporate'`.
    - Document if `pageData.sections` exists without any `COLLECTIONS` arrays.
    - Structured if any collection key (`cards`, `section2Cards`, `moreCards`, `featured`, `faqs`, `openings`, `caseStudies`) contains entries.
    - Fallback: `'document'`.
  - `splitItem(collection, rawItem, index, usedSlugs, warnings)`: Decomposes raw items into columnar properties, extracts `categories` (string arrays, comma-delimited strings, or objects), preserves remaining properties in `data`, isolates `detail` properties for card collections, tracks derived titles (`data.__titleDerived = true` when title was missing or whitespace), and resolves slug collisions deterministically with `-2`, `-3` suffixes.
  - `splitLegacyPageData(blob)`: Separates settings from collection items and deduplicates category taxonomy with sort order.
  - `buildItem(item)`: Losslessly reconstructs legacy item objects from relational columns, restoring `categories`, rehydrating `detail` properties into top-level keys, and omitting synthesized fallback titles if `data.__titleDerived` is true.
  - `buildLegacyPageData(settings, items, categories, options)`: Reconstructs the full legacy pageData blob from relational state.
- Created `backend/tests/helpers/legacy-equivalence.ts`:
  - Implements `assertLegacyEquivalent(original, rebuilt)` enforcing exact equivalence with the 5 permitted normalization differences:
    1. Key order insensitivity.
    2. Null/undefined/empty string category normalization.
    3. Trimming of leading/trailing whitespace on string fields.
    4. Auto-generated fallback slugs for items originally lacking valid slugs.
    5. Fallback titles generated for items without titles (omitted on rebuild).

### Step 3: Transactional Structured Writer
- Created `backend/src/services/page-content/structured-writer.ts`:
  - `writeStructuredPage(tx, pageId, splitResult, options)` executes atomically:
    1. Upserts categories matching `(pageId, slug)` and deletes unreferenced categories.
    2. Upserts items matching `(pageId, slug)` preserving existing item IDs and deletes removed items.
    3. Deletes existing `pageitemcategory` join rows in batch with `itemId: { in: itemIds }`.
    4. Rebuilds `pageitemcategory` join rows in bulk via `createMany`.
    5. Updates `page` record: updates `pageData` with clean settings, sets `contentModel = 'structured'`, and increments `version = version + 1`.

### Step 4: CLI Migration Script
- Created `backend/scripts/migrate-page-items.ts`:
  - Supports CLI arguments: `--dry-run`, `--apply`, `--page=<slug>`, `--force`, `--output=<path>`.
  - Exports programmatic `runMigration(options, prismaClient)` for test integration.
  - Interactive Prisma transaction configured with `{ maxWait: 15000, timeout: 60000 }` to ensure zero timeout errors on Neon serverless poolers.
  - In `--apply` mode:
    - Creates append-only `PageRevision` snapshot with `changeSummary: 'pre-migration snapshot (T4 migrate-page-items)'`.
    - Invokes `writeStructuredPage`.
    - Increments global `CmsState.version`.
  - In `--dry-run` mode:
    - Reads pages, executes classification, splits pageData, verifies `assertLegacyEquivalent`, checks slug collisions and categories.
    - Writes structured report JSON to disk without modifying any database rows.

### Step 5: Development Database Dry-Run Execution
- Executed `npx ts-node --transpile-only backend/scripts/migrate-page-items.ts --dry-run` against the development database.
- Report captured in `backend/scripts/output/migrate-page-items-dev-dryrun.json`:
  ```
  Total Pages Processed : 130
  Structured Pages      : 11
  Document Pages        : 119
  Total Items           : 57
  Total Categories      : 49
  Total Warnings        : 0
  Total Errors          : 0
  ```
- All 11 structured pages split and verified equivalence cleanly with zero errors.
- Document pages (e.g. `home`, `about-us`, `contact-us`, `corporate`, `furniture`) properly classified as document.

### Step 6: Test Suite Implementation & Verification
- **Legacy Mapper Unit Tests (`backend/tests/page-content/legacy-mapper.test.ts`):**
  - 19 tests covering 50 slugify parity samples, single item split/build, all 10 edge fixtures from T2, and page classification.
- **Fast-Check Property Tests (`backend/tests/page-content/legacy-mapper.property.test.ts`):**
  - Configured with 200 runs each (800 total runs):
    - P1: Round-trip equivalence between arbitrary legacy blobs and rebuilt blobs (Invariant I4).
    - P2: Generated slugs are unique, non-empty, and lowercase kebab-case.
    - P3: Determinism: consecutive splits produce strictly identical results.
    - P4: Detail isolation: detail is empty `{}` for list collections.
- **Migration CLI Tests (`backend/tests/scripts/migrate-page-items.test.ts`):**
  - 6 integration tests running against `DATABASE_URL_TEST`:
    1. `--dry-run` writes 0 changes to database tables.
    2. `--apply` correctly creates expected items, categories, and joins, updating `contentModel`.
    3. Idempotence: a second `--apply` results in 0 count changes and 0 duplicate items.
    4. Pre-migration `PageRevision` snapshot is created.
    5. `--force` allows clean re-migration after manual page rollback.
    6. Document pages remain untouched in `document` mode with 0 child items.

---

## 3. Test Results Summary

### Backend Vitest Suite (`npm run test --prefix backend`)
```
 Test Files  10 passed (10)
      Tests  85 passed (85)
   Duration  ~125s
```
- `tests/page-content/legacy-mapper.property.test.ts` (4 property tests, 200 runs each = 800 executions passed)
- `tests/scripts/migrate-page-items.test.ts` (6 tests passed)
- `tests/page-content/legacy-mapper.test.ts` (19 tests passed)
- `tests/services/bootstrap-pages.test.ts` (3 tests passed)
- `tests/pages/no-side-effects.test.ts` (1 test passed)
- `tests/schema/jsonb-integrity.test.ts` (3 tests passed)
- `tests/contract/legacy-pages.contract.test.ts` (26 tests passed)
- `tests/schema/constraints.test.ts` (6 tests passed)
- `tests/smoke.test.ts` (7 tests passed)
- `tests/lib/page-data.test.ts` (10 tests passed)

### TypeScript Build (`npm run build --prefix backend`)
- `prisma generate && tsc`: Completed with 0 compilation errors.

---

## 4. Acceptance Criteria Verification Checklist

- [x] **Property tests P1–P4 pass with at least 200 runs each:** All 4 property tests executed with 200 runs each (800 total runs) and passed.
- [x] **Dev dry-run report committed and summarized in log; 0 errors:** Generated and committed `backend/scripts/output/migrate-page-items-dev-dryrun.json` with 0 warnings and 0 errors.
- [x] **Idempotence test passes:** Verified via `tests/scripts/migrate-page-items.test.ts` (second `--apply` causes 0 mutations and 0 duplicates).
- [x] **All tests pass (including T2/T3 tests):** All 85 tests across 10 test files passed.
- [x] **Zero remote push strictly enforced:** No `git push` command was run.
- [x] **Dev database safety preserved:** `--apply` was NOT run against the development database.
- [x] **Commit `T4: Migration script: blobs to rows` created:** Staged and committed according to contract.
