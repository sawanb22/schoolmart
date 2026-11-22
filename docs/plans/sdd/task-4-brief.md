# SDD Task Brief: T4 – Migration Script: Blobs to Rows

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T4)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-4-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `654340ea509425b04ca5144b64f9bfd2ba8b31d8`

---

## Objective
Implement pure mapping and classification services (`legacy-mapper.ts`), property tests verifying round-trip equivalence and slug uniqueness (Invariant I4), transactional structured persistence (`structured-writer.ts`), and the migration CLI (`migrate-page-items.ts`). Run a dry run against the development database and verify zero parse errors.

> **CRITICAL RULE:** Do NOT run `--apply` on the development database in T4. `--apply` on dev occurs at the end of Task T5 once the backward-compatible read path is in place.

---

## Detailed Steps

1. **Constants & Domain Configuration:**
   - Create `backend/src/services/page-content/constants.ts` with:
     - `CARD_COLLECTIONS = ['cards', 'section2Cards', 'moreCards', 'featured'] as const;`
     - `LIST_COLLECTIONS = ['faqs', 'openings', 'caseStudies'] as const;`
     - `COLLECTIONS = [...CARD_COLLECTIONS, ...LIST_COLLECTIONS] as const;`
     - `SINGLE_OBJECT_COLLECTIONS: ReadonlySet<Collection> = new Set(['featured']);`
     - `DETAIL_KEYS`: `['detailContent', 'useCustomDetail', 'body', 'content', 'methodology', 'deliverables', 'deliverablesHeading', 'beforeImages', 'afterImages', 'ctaTitle', 'ctaSubtitle', 'ctaButtonLabel', 'ctaButtonHref', 'ctaHref', 'hideCta'] as const;`
     - `COLUMN_KEYS = { title: 'title', slug: 'slug', description: 'summary', image: 'imageUrl', href: 'href', badge: 'badge' } as const;`
     - `DOCUMENT_ONLY_SLUGS = new Set(['home', 'furniture', 'contact-us', 'about-us', 'corporate']);`
     - `ARTICLE_PAGE_SLUGS = new Set(['terms-and-conditions', 'privacy-policy', 'refund-policy', 'shipping-policy']);` (verify with `pages.routes.ts`)
     - `HTML_KEYS = ['detailContent', 'body', 'content', 'methodology', 'answer'] as const;`
     - `MAX_PAGEDATA_BYTES = 512 * 1024;`, `MAX_ITEM_JSON_BYTES = 256 * 1024;`, `REVISIONS_KEPT_PER_PAGE = 30;`

2. **Pure Legacy Mapper & Equivalence Checker:**
   - Create `backend/src/services/page-content/legacy-mapper.ts`:
     - `slugify(s: unknown): string`: `String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')` (must match frontend slugify).
     - `normalizeSlug(s: unknown): string`: lowercases, trims, strips leading/trailing slashes, and takes last segment (`s.split('/').pop()`).
     - `classifyPage(page: { slug: string; template?: string | null; pageData: any }): 'document' | 'structured'`:
       Implements exact classification rules from Section 3.4.
     - `splitLegacyPageData(blob: Record<string, unknown>): { settings: Record<string, unknown>; items: any[]; categories: any[]; warnings: string[] }`:
       Implements exact rules from Section 3.3.
     - `buildLegacyPageData(settings: Record<string, unknown>, items: any[], categories: any[], options?: { includeDetail?: boolean }): Record<string, unknown>`:
       Reconstructs legacy JSON format from items and categories.
     - Export helper `splitItem` and `buildItem` for single items.
   - Create `backend/tests/helpers/legacy-equivalence.ts`:
     - `assertLegacyEquivalent(original: any, rebuilt: any): void`:
       Implements Section 3.3 round-trip comparison allowing only the 5 permitted normalization differences.

3. **Transactional Structured Writer:**
   - Create `backend/src/services/page-content/structured-writer.ts`:
     - `writeStructuredPage(tx: Prisma.TransactionClient, pageId: number, splitResult: { settings: any; items: any[]; categories: any[] }, options: { reason: string; authorId?: number | null }): Promise<void>`
     - In transaction:
       1. Upsert categories by `(pageId, slug)`; delete removed categories.
       2. Upsert items by `(pageId, slug)`; keep existing IDs; delete removed items.
       3. Rebuild `pageitemcategory` join rows in sortOrder.
       4. Update `page`: `pageData = splitResult.settings`, `contentModel = 'structured'`, `version = version + 1`.

4. **CLI Migration Script (`migrate-page-items.ts`):**
   - Create `backend/scripts/migrate-page-items.ts`:
     - Flags: `--dry-run` (default), `--apply`, `--page=<slug>`, `--force`.
     - In `--dry-run`: processes each page, performs split, validates equivalence, checks slug collisions and categories, writes output report JSON to `backend/scripts/output/migrate-page-items-<timestamp>.json`, but executes 0 database writes.
     - In `--apply` (for test suite use in T4): executes per-page transactions creating `pre-migration` PageRevision snapshot, calling `writeStructuredPage`, and incrementing `CmsState.version`.
     - Export `runMigration(options)` function so CLI is a thin wrapper easily tested in Vitest.

5. **Dry Run on Development Database:**
   - Execute dry run against dev DB:
     `npx ts-node --transpile-only backend/scripts/migrate-page-items.ts --dry-run`
   - Capture report in `backend/scripts/output/migrate-page-items-dev-dryrun.json`.
   - Confirm 0 `ERROR` lines and no page has >5 slug collisions.

6. **Implement Test Suite:**
   - `backend/tests/page-content/legacy-mapper.test.ts`:
     - Tests all edge fixtures from T2.
     - Slugify parity: compares 50 sample strings against reference algorithm.
   - `backend/tests/page-content/legacy-mapper.property.test.ts` (fast-check, 200 runs each):
     - P1 Round-trip equivalence (I4): `assertLegacyEquivalent(blob, buildLegacyPageData(split(blob), { includeDetail: true }))`.
     - P2 Slug uniqueness: all generated slugs are non-empty, unique per page, and valid.
     - P3 Determinism: calling `splitLegacyPageData` twice returns identical results.
     - P4 Detail isolation: `detail` is `{}` for all `LIST_COLLECTIONS`.
   - `backend/tests/scripts/migrate-page-items.test.ts`:
     - Dry run writes 0 changes.
     - `--apply` on fixtures yields expected item and category counts.
     - Idempotence: running `--apply` a second time changes 0 counts and creates 0 duplicate items.
     - `pre-migration` revision snapshot exists.
     - Document pages remain untouched.

7. **Verify & Commit:**
   - All backend tests pass (`npm run test --prefix backend`).
   - TypeScript compilation succeeds with 0 errors (`npm run build --prefix backend`).
   - Commit with message:
     `T4: Migration script: blobs to rows`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-4-report.md`.

---

## Acceptance Criteria
- [ ] Property tests P1–P4 pass with at least 200 runs each.
- [ ] Dev dry-run report committed under `backend/scripts/output/` and summarized in log; 0 errors.
- [ ] Idempotence test passes (second `--apply` causes 0 mutations).
- [ ] All tests pass (including T2/T3 tests).
- [ ] Zero remote push strictly enforced (`git push` forbidden).
- [ ] Commit `T4: Migration script: blobs to rows` created.
