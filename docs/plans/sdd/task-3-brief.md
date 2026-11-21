# SDD Task Brief: T3 – Schema: New Tables, JSONB, Versions

- **Plan Reference:** `docs/plans/HYBRID_CMS_PRODUCTION_EXECUTION_PLAN.md` (Task T3)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Branch:** `feat/hybrid-cms`
- **Report destination:** `docs/plans/sdd/task-3-report.md`
- **Execution log:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`
- **Base Commit:** `198f0c4068cbccfa7a905be5eb7b37f443b74704`

---

## Objective
Update the Prisma schema to introduce relational tables (`PageItem`, `PageCategory`, `PageItemCategory`, `SlugRedirect`, `PageRevision`, `CmsState`), convert `page.pageData` from string to native `JSONB` using a hand-crafted non-destructive `USING` migration, update all backend reads and writes to handle native objects rather than stringified JSON, and route all Page responses through a legacy serialization adapter so existing frontend contracts remain 100% unbroken.

---

## Pre-Requisites & Safe Migration Notice
- Do NOT drop `pageData`. The migration SQL MUST use `ALTER COLUMN "pageData" TYPE JSONB USING (CASE WHEN "pageData" IS NULL OR btrim("pageData") = '' THEN NULL ELSE "pageData"::jsonb END);`.
- Do NOT commit `backend/.env`.
- Dev DB backup must be refreshed before applying to dev.
- Test rehearsal must run on the isolated Neon test database first.

---

## Detailed Steps

1. **Preflight JSON Integrity Check:**
   - Create `backend/scripts/check-pagedata-json.ts`.
   - Queries all pages in dev database with non-null `pageData` and verifies they parse as valid JSON objects.
   - Run against dev database. Confirm 0 invalid entries.

2. **Update Prisma Schema (`backend/prisma/schema.prisma`):**
   - Update `Page` model and add new models as specified in Section 3.1:
     ```prisma
     model Page {
       id           Int            @id @default(autoincrement())
       title        String
       slug         String         @unique(map: "Page_slug_key")
       content      String?
       template     String?
       contentModel String         @default("document") // "document" | "structured"
       pageData     Json?
       published    Boolean        @default(true)
       version      Int            @default(1)
       createdAt    DateTime       @default(now())
       updatedAt    DateTime       @updatedAt
       items        PageItem[]
       categories   PageCategory[]
       revisions    PageRevision[]

       @@index([published], map: "Page_published_idx")
       @@map("page")
     }

     model PageItem {
       id         Int                @id @default(autoincrement())
       pageId     Int
       collection String
       slug       String
       title      String
       summary    String?
       imageUrl   String?
       href       String?
       badge      String?
       sortOrder  Int                @default(0)
       published  Boolean            @default(true)
       data       Json               @default("{}")
       detail     Json               @default("{}")
       version    Int                @default(1)
       createdAt  DateTime           @default(now())
       updatedAt  DateTime           @updatedAt
       page       Page               @relation(fields: [pageId], references: [id], onDelete: Cascade)
       categories PageItemCategory[]

       @@unique([pageId, slug], map: "PageItem_pageId_slug_key")
       @@index([pageId, collection, sortOrder], map: "PageItem_pageId_collection_sortOrder_idx")
       @@map("pageitem")
     }

     model PageCategory {
       id        Int                @id @default(autoincrement())
       pageId    Int
       name      String
       slug      String
       sortOrder Int                @default(0)
       createdAt DateTime           @default(now())
       updatedAt DateTime           @updatedAt
       page      Page               @relation(fields: [pageId], references: [id], onDelete: Cascade)
       items     PageItemCategory[]

       @@unique([pageId, slug], map: "PageCategory_pageId_slug_key")
       @@index([pageId, sortOrder], map: "PageCategory_pageId_sortOrder_idx")
       @@map("pagecategory")
     }

     model PageItemCategory {
       itemId     Int
       categoryId Int
       sortOrder  Int          @default(0)
       item       PageItem     @relation(fields: [itemId], references: [id], onDelete: Cascade)
       category   PageCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

       @@id([itemId, categoryId])
       @@index([categoryId], map: "PageItemCategory_categoryId_idx")
       @@map("pageitemcategory")
     }

     model SlugRedirect {
       id        Int      @id @default(autoincrement())
       fromPath  String   @unique(map: "SlugRedirect_fromPath_key")
       toPath    String
       createdAt DateTime @default(now())

       @@map("slugredirect")
     }

     model PageRevision {
       id        Int      @id @default(autoincrement())
       pageId    Int
       version   Int
       reason    String
       snapshot  Json
       authorId  Int?
       createdAt DateTime @default(now())
       page      Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)

       @@index([pageId, createdAt], map: "PageRevision_pageId_createdAt_idx")
       @@map("pagerevision")
     }

     model CmsState {
       id        Int      @id @default(1)
       version   Int      @default(1)
       updatedAt DateTime @updatedAt

       @@map("cmsstate")
     }
     ```

3. **Generate & Hand-Craft Migration SQL:**
   - Create migration directory: `backend/prisma/migrations/20261121120000_hybrid_cms_tables/`
   - Generate diff with:
     `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
   - **MANDATORY EDIT in `migration.sql`:**
     Ensure Prisma's DROP/ADD of `pageData` is replaced with:
     ```sql
     ALTER TABLE "page" ALTER COLUMN "pageData" TYPE JSONB
       USING (CASE WHEN "pageData" IS NULL OR btrim("pageData") = '' THEN NULL ELSE "pageData"::jsonb END);
     ```
     And append:
     ```sql
     INSERT INTO "cmsstate" ("id","version","updatedAt") VALUES (1, 1, NOW()) ON CONFLICT ("id") DO NOTHING;
     ```
   - Verify `migration.sql` contains NO `DROP COLUMN "pageData"`.

4. **Implement Shared JSON Parser & Response Serializer:**
   - Create `backend/src/lib/page-data.ts`:
     - `parsePageData(v: unknown): Record<string, unknown>`
     - Safely parses object, string, double-encoded string, null/undefined into a plain JavaScript object.
   - Create `backend/src/services/page-content/page-response.ts`:
     - `toLegacyPageResponse<T extends { pageData: any }>(page: T)`
     - Reconstructs `pageData` as `string | null` (`JSON.stringify(page.pageData)`) so all consumers receiving Page objects get the exact legacy stringified format.

5. **Update Backend Reads, Writes & Types:**
   - In `backend/src/routes/pages.routes.ts`, `backend/src/routes/admin.routes.ts`, `backend/src/services/bootstrap-pages.ts`, `backend/prisma/seed.ts`, `backend/src/runSeed.ts`:
     - Writes pass objects (`Prisma.InputJsonValue`), NOT `JSON.stringify(...)`.
     - Reads parse via `parsePageData(...)`.
     - All routes returning Page objects (`GET /`, `GET /published`, `GET /:idOrSlug`, `POST /`, `PUT /:id`) use `toLegacyPageResponse`.
   - Update `backend/tests/helpers/db.ts`:
     - `resetContentTables()` now truncates `"pageitemcategory","pagecategory","pageitem","pagerevision","slugredirect","page","sitecontent","searchcard","cmsstate" RESTART IDENTITY CASCADE` and inserts `cmsstate` row (`id: 1, version: 1`).
   - Run `npx prisma generate` in backend.
   - Enforce: Searching `backend/src` and `backend/prisma` for `pageData:\s*JSON\.stringify` returns 0 matches!

6. **Rehearse on Test Database & Apply to Dev:**
   - On the Neon test database (`test-hybrid-cms`):
     - Restore dev backup into test database.
     - Run `npx prisma migrate deploy` with env pointing at test database.
     - Run `check-pagedata-json.ts` against test DB.
     - Compare page count with non-null `pageData` before and after (must match 100%).
   - On dev database:
     - Run `npm run db:export --prefix backend` to ensure fresh backup before schema change.
     - Run `npx prisma migrate deploy` against dev database.
     - Run `check-pagedata-json.ts` against dev DB and verify count.

7. **Implement Verification Tests:**
   - `backend/tests/schema/jsonb-integrity.test.ts`:
     - `SELECT count(*) FROM page WHERE "pageData" IS NOT NULL AND jsonb_typeof("pageData") <> 'object'` returns 0 (Invariant I2).
   - `backend/tests/schema/constraints.test.ts`:
     - Duplicate `(pageId, slug)` on `pageitem` throws Prisma P2002.
     - Same slug on different pages succeeds.
     - Same rules for `pagecategory`.
     - Deleting a page cascades to items, categories, item-categories, and revisions.
     - Unique constraint on `slugredirect.fromPath`.
   - `backend/tests/lib/page-data.test.ts`:
     - Tests plain object, JSON string, invalid JSON string, null, undefined, double-encoded JSON string.
   - Re-run all existing test suites:
     - `backend/tests/contract/legacy-pages.contract.test.ts` (all 26 snapshots must stay 100% green without modification).
     - `backend/tests/pages/no-side-effects.test.ts` must pass.
     - `backend/tests/services/bootstrap-pages.test.ts` must pass.
     - `backend/tests/smoke.test.ts` must pass.
   - Playwright smoke test (`tests/e2e/smoke.spec.ts`) against local dev must pass.

8. **Verify & Commit:**
   - Backend `tsc` compiles with 0 errors.
   - All backend tests pass.
   - Commit with message:
     `T3: Schema: new tables, jsonb, versions`
   - Update `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`.
   - Write report to `docs/plans/sdd/task-3-report.md`.

---

## Acceptance Criteria
- [ ] Migration SQL contains `ALTER COLUMN "pageData" TYPE JSONB USING` and NO `DROP COLUMN "pageData"`.
- [ ] Rehearsal on test DB and deploy on dev DB completed and logged; non-null `pageData` count matches.
- [ ] Searching `backend/src` and `backend/prisma` for `pageData:\s*JSON\.stringify` finds NO matches.
- [ ] Invariant I2 holds (`backend/tests/schema/jsonb-integrity.test.ts` passes).
- [ ] All 37+ backend tests pass with 0 failures. Contract snapshots stay green.
- [ ] TypeScript compilation succeeds with 0 errors.
- [ ] Zero remote push strictly enforced (`git push` forbidden).
- [ ] Commit `T3: Schema: new tables, jsonb, versions` created.
