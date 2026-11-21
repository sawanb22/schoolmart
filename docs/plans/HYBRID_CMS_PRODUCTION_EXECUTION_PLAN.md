# CampusMart: Hybrid CMS Data Model and Production Readiness. Execution Plan

- **Status:** Approved for execution
- **Created:** 2026-11-21
- **Audience:** the implementing agent (and any human reviewer)
- **Repo root:** `d:\schoolmart\campusmart-base` (Windows, PowerShell)
- **Progress log the agent must maintain:** `docs/plans/HYBRID_CMS_EXECUTION_LOG.md`

This document is self-contained. Read sections 0 to 4 completely before starting any task. Do the tasks in section 5 in order. Each task has steps, tests, and acceptance criteria. A task is done only when every acceptance box for it is true and recorded in the log.

---

## 0. Rules for the implementing agent

1. **Work in order.** Do tasks T0 to T18 in sequence unless section 5 marks a task as independent. Do not start a task until the previous task's acceptance criteria pass.
2. **One branch, one commit per task.** Create the branch `feat/hybrid-cms` in T0. Commit at the end of each task with the message `T<n>: <task title>`. Never force-push, never `git reset --hard`, and never skip hooks.
3. **Stay in scope.** Change only what the task describes. If you find an unrelated bug, add it to the log under "Found, not fixed" and keep going.
4. **Test-driven.** For each task, write the listed tests first and see them fail for the right reason. Then implement until they pass. Never delete or weaken a test to make it pass. If a listed test is impossible, record why in the log and write the closest feasible test.
5. **Never touch the dev database without a fresh backup.** Before any command that writes schema or data to the Neon dev database (`DATABASE_URL`), run the backup in section 4.4 and record the backup file path in the log.
6. **Tests never run against the dev database.** Tests use `DATABASE_URL_TEST` only, and the guard in section 4.3 enforces this.
7. **Stop and ask the user when:**
   - `DATABASE_URL_TEST` is not provided.
   - The schema drift check in T1 shows differences that would drop or alter columns that contain data.
   - The migration dry run in T4 reports `ERROR` lines, or more than 5 slug collisions on any single page.
   - A step would delete files outside the ones this plan names (for example the leftover deploy configs in T17).
   - An acceptance criterion cannot be met after two honest attempts.
8. **Windows and PowerShell specifics:**
   - Chain commands with `;`, not `&&`.
   - Use `$env:VAR = "value"` for environment variables.
   - Do not redirect Prisma or SQL output with `>`. PowerShell 5 writes UTF-16, which breaks SQL files. Use the tool's `--output` flag, or write files with Node (`fs.writeFileSync(path, text, 'utf8')`).
   - Never start long-running dev servers in the foreground. Start them as background processes, and stop them when the task ends.
9. **API work must follow `postman/skills/api-engineer/SKILL.md`** (required by `AGENTS.md`). Read it at the start of T5 and apply it to T5, T6, T8 and T16. That includes the Postman collection it asks for.
10. **Do not edit the old reports** (`reports/*.md`) or the old docs (except where a task says to).

### Log format (append one block per task)

```md
## T<n> – <title> – <DONE | BLOCKED>
- Date:
- Commit:
- Backup used (if DB touched):
- Files changed (summary):
- Tests added: <file> (<count> tests)
- Test results: backend <pass>/<total>, frontend <pass>/<total>, smoke <pass>/<total>
- Metrics (if the task has any):
- Deviations from plan and why:
- Found, not fixed:
```

---

## 1. Locked decisions (do not revisit)

| # | Decision | Consequence |
|---|---|---|
| D1 | **Hybrid content model.** Page settings stay JSON. Repeating items (cards, FAQs, openings, listings, case studies) become rows. Categories become rows. | New tables `PageItem`, `PageCategory`, `PageItemCategory`. |
| D2 | **Article and "document" pages stay fully JSON.** | `Page.contentModel = 'document'` for these pages, and nothing about them moves to tables. |
| D3 | **Existing content is kept and migrated**, never re-seeded. | The migration script needs a backup, a dry run and idempotence. |
| D4 | **Admin editing is per item, with optimistic locking.** "Save All" saves page settings only. | `version` columns, and `409` responses on conflicts. |
| D5 | **Dev and test use Neon PostgreSQL.** Tests run on a separate Neon branch (`DATABASE_URL_TEST`). | There is a safety guard for the test database. |
| D6 | **Production is cPanel shared hosting:** PostgreSQL on cPanel, the Node backend through cPanel "Setup Node.js App" (Phusion Passenger), and the frontend as static files in `public_html`. | No Redis, S3, Docker, CDN or edge functions. Uploads stay on local disk. Apache `.htaccess` handles SPA fallback and headers. Passenger may run **more than one Node process**, so all caches must stay correct across processes (section 3.6). |
| D7 | **TanStack Query v5** goes on the frontend, behind the existing hooks. | `usePageData` keeps its `{ data, loading }` signature. |
| D8 | **Nothing has been deployed yet.** Vercel, Railway and Render files and the hard-coded `sportsurf.in` media URL are leftovers from an earlier project. | They get cleaned up in T15 and T17. Ask the user before deleting files. |
| D9 | **The public URLs that exist today must keep working.** | Existing item slugs are kept. A slug change creates a redirect. |
| D10 | **The homepage `SiteContent` keys are out of scope for restructuring.** Only their caching changes. | `home_*` keys stay JSON strings in `sitecontent`. |

### Out of scope (do not build)
- SSR or prerendering
- Redis, CDN, or object storage
- Restructuring `SiteContent` or the homepage editor model
- Caching for blog, products, orders or classifieds (they keep `no-store`)
- Multi-language support
- New page templates
- Redesigning the visual UI
- Rewriting the old ad-hoc tests in `/tests`

---

## 2. Current state (facts verified in code)

### 2.1 Stack
- **Frontend:** Vite 7, React 19, TypeScript, Tailwind 3, React Router 7, axios, gsap. Code is in `frontend/src`.
  - The production build is `frontend/build.js`. It calls `vite.build({ configFile: false })` with an inline config, so neither Vite config file is used for the build. `vite.config.js` and `vite.config.ts` both exist. `vite dev` picks up `.js` first.
- **Backend:** Express 5, Prisma 6, PostgreSQL. Code is in `backend/src`.
  - The entry file is `backend/src/index.ts`. It builds the app, and it calls `listen` unless `process.env.VERCEL` is set.
  - The Prisma client is a singleton in `backend/src/lib/prisma.ts`.
- **Workspaces:** the root `package.json` declares the `frontend` and `backend` workspaces.

### 2.2 Data model problems
- **`Page.pageData` is a `String?` column that holds stringified JSON.** It contains settings (hero, CTA, styles, labels, `hide*` flags) and also these collections:
  - `cards`, `section2Cards`, `moreCards`
  - `featured` (a single object)
  - `faqs`, `openings`, `caseStudies`
  - `categories` (a string array)
  - `sections` (article blocks), `features` (a string array), `partnerLogos`
- **Card detail fields live inside each card:**
  - `detailContent`, `useCustomDetail`, `body`, `content`, `methodology`
  - `deliverables[]`, `deliverablesHeading`
  - `beforeImages[]`, `afterImages[]`
  - `ctaTitle`, `ctaSubtitle`, `ctaButtonLabel`, `ctaButtonHref`, `ctaHref`, `hideCta`
- **Card category is stored in one of two ways:** `categories: string[]` or `category: string`.
- **No item IDs, no versions, no revisions.**

### 2.3 Who reads `pageData`

| Where | What it does |
|---|---|
| `frontend/src/hooks/usePageData.ts` | `GET /api/pages/:slug` then `JSON.parse(pageData)`. Module-level Map cache plus in-flight dedup. Opens one BroadcastChannel per hook instance. |
| `frontend/src/components/cms/SolutionPageRenderer.tsx` | Generic hub: `cards`, `categories`, `styles`, `partnerLogos`, `hide*`. Used by labs, libraries, sports-infra, tech-infra and others. |
| `frontend/src/components/cms/ServiceDetailPage.tsx` | Detail page. Loads the whole hub, merges `featured`, `cards` and `section2Cards`, then `.find()` by slug, title slug or href. |
| `frontend/src/components/cms/UniversalArticleDetail.tsx` | Detail page. Tries `GET /pages/${hub}-${item}`, then `GET /pages/${item}`, then loads the whole hub and `.find()` in `featured`, `cards` and `moreCards`. Builds the article view (lines ~177–246). |
| `frontend/src/components/cms/DynamicChildPageRoute.tsx` | `/:hubSlug/:itemSlug`. Fetches the hub and picks `ServiceDetailPage` for the templates `solution-hub`, `service-suite`, `sports-infra`, `tech-infra`, `labs` and `libraries`. Uses `UniversalArticleDetail` for everything else. |
| `frontend/src/App.tsx` `DynamicPageRoute` | `/:slug` and `/p/:slug`. Up to 4 sequential requests (`slug`, then `guide-`, `environment-` and `resource-` prefixes). Passes the URL slug, not the resolved slug, to the renderers (a bug). |
| Bespoke hub pages in `frontend/src/pages/*.tsx` | `ai-ml`, `campus-master-planning`, `catalogues`, `faq`, `job-openings` and others read keys directly. |
| `backend/src/routes/pages.routes.ts` `/hub/catalog` | Parses `cards` and `categories` for labs, sports-infra, tech-infra and libraries. Uses the hard-coded `HUB_METADATA` category lists. Item IDs are `${slug}-${index}`. |
| `backend/src/services/solutions-finder/page-solutions-extractor.ts` | Parses `cards`, `section2Cards`, `moreCards` and `sections` of every published page. `cardSlug = ${page.slug}--${slugify(title)}`. |
| `backend/src/services/solutions-finder/prisma-solutions.repository.ts` | Merges `SearchCard` rows (they win when `cardSlug` matches) with the extracted cards. Watermarks use `max(page.updatedAt)`. |

### 2.4 Who writes `pageData` (always the full blob, last write wins)
- `frontend/src/admin/components/UnifiedPageEditor.tsx`:
  - main `save()` around line 1483
  - inline `onSyncOpenings` around line 3913
  - inline `onSyncCaseStudies` around line 5409
- `frontend/src/admin/pages/Categories.tsx` around line 539
- `frontend/src/admin/pages/CollegesManager.tsx` around line 216
- `PagesManager.tsx` only toggles `published` and creates pages.
- `backend/src/routes/pages.routes.ts`:
  - `POST /` and `PUT /:id` sanitize with a regex
  - the `ensure*` helpers
- `backend/src/runSeed.ts` and `backend/prisma/seed.ts`

### 2.5 Other verified problems
- **Public GET handlers write to the database.** `GET /api/pages/:idOrSlug` and `GET /api/pages/published` call `ensureSimplePage`, `ensureArticlePage` and `ensureCollegeSalePage`.
- **Migration history does not match the database:**
  - `backend/prisma/migrations/20260810110539_init_mysql` is MySQL-era, but `migration_lock.toml` says `postgresql`.
  - `SearchCard` and `SearchQueryLog` were created from hand-written SQL in `backend/prisma/sql/`.
- **`backend/src/index.ts`:**
  - No compression.
  - A global `Cache-Control: no-store` on all of `/api`.
  - Logging is console only.
  - No graceful shutdown.
  - `/health` is shallow.
  - `solutionsIndexService.rebuild()` runs on every page write, without debouncing.
- **Frontend data layer:**
  - The `SiteContentContext` value is not memoized and `/content` has no cache.
  - `topbar.tsx` calls `refreshWishlist()` again on mount, so the wishlist loads twice.
- **Frontend rendering:**
  - The entry chunk is 436 KB minified, and gsap is pulled in by `topbar`, `header`, `footer` and `category-bar`.
  - There is a single top-level `Suspense`, so the header and footer disappear during lazy route loads.
  - `/` renders its own TopBar, Header and Footer outside `<Layout>`.
  - GSAP entrance delays of 0.2–0.8 s hide the header and hero.
  - Google Fonts loads 5 families with about 25 weights.
  - `ErrorBoundary` calls `window.location.reload()` inside `render()` and shows `error.message` to users.
- **Images:**
  - `frontend/public/images/*.png` are 690–880 KB each.
  - `index.html` uses the 643 KB `favicon.png`, even though `favicon.ico`, `favicon-32x32.png` and `apple-touch-icon.png` exist.
  - There is no WebP and no `srcset`.
  - The home hero is a CSS background, so it cannot be preloaded.
  - `frontend/src/lib/media-url.ts` rewrites every `/uploads/` URL to `https://sportsurf.in/new/uploads/...`.
- **SEO:** no per-page `<title>`, meta description or canonical tag, and no `sitemap.xml` or `robots.txt`.
- **Tests:** the backend has no real test runner. `/tests/*.test.cjs|mjs` are ad-hoc scripts, many of which grep source code. The root `npm test` runs only `tests/clean-cards-verification.test.cjs`.
- **`frontend/public/.htaccess`** already has an SPA fallback rewrite. `frontend/build.js` deliberately does not copy dotfiles (including `.htaccess`) into `dist`.
- **`frontend/.env.production`** sets `VITE_API_URL=https://api.campusmart.in/api`. The plan assumes the API runs on that subdomain and the frontend on `campusmart.in`.

---

## 3. Target architecture

### 3.1 Prisma schema changes (exact)

Replace the `Page` model and add the models below in `backend/prisma/schema.prisma`. Keep every other model unchanged except `WishlistItem`, which stays unchanged too, because wishlist linking is out of scope.

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
  collection String             // see COLLECTIONS in 3.2
  slug       String
  title      String
  summary    String?            // legacy key: description
  imageUrl   String?            // legacy key: image
  href       String?
  badge      String?
  sortOrder  Int                @default(0)
  published  Boolean            @default(true)
  data       Json               @default("{}")   // all other legacy keys shown on hub
  detail     Json               @default("{}")   // DETAIL_KEYS (cards-type collections only)
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
  fromPath  String   @unique(map: "SlugRedirect_fromPath_key") // e.g. "/labs/old-slug"
  toPath    String                                           // e.g. "/labs/new-slug"
  createdAt DateTime @default(now())

  @@map("slugredirect")
}

model PageRevision {
  id        Int      @id @default(autoincrement())
  pageId    Int
  version   Int
  reason    String   // "pre-migration" | "settings" | "item-create" | "item-update" | "item-delete" | "reorder" | "category" | "restore"
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

> **Critical gotcha (JSON columns).** Once `pageData` is `Json`, writing `pageData: JSON.stringify(obj)` stores a JSON **string scalar**, not an object. TypeScript will not catch this. Every write must pass a plain object. T3 adds a test that fails if any row has `jsonb_typeof("pageData") <> 'object'`. After T3, the search `pageData:\s*JSON\.stringify` over `backend/src` and `backend/prisma` must return no matches.

### 3.2 Constants (create `backend/src/services/page-content/constants.ts`)

```ts
export const CARD_COLLECTIONS = ['cards', 'section2Cards', 'moreCards', 'featured'] as const;
export const LIST_COLLECTIONS = ['faqs', 'openings', 'caseStudies'] as const;
export const COLLECTIONS = [...CARD_COLLECTIONS, ...LIST_COLLECTIONS] as const;
export type Collection = typeof COLLECTIONS[number];
export const SINGLE_OBJECT_COLLECTIONS: ReadonlySet<Collection> = new Set(['featured']);

// Moved to PageItem.detail, for CARD_COLLECTIONS only. LIST_COLLECTIONS keep everything in `data`.
export const DETAIL_KEYS = [
  'detailContent', 'useCustomDetail', 'body', 'content', 'methodology',
  'deliverables', 'deliverablesHeading', 'beforeImages', 'afterImages',
  'ctaTitle', 'ctaSubtitle', 'ctaButtonLabel', 'ctaButtonHref', 'ctaHref', 'hideCta',
] as const;

// Legacy key -> PageItem column. A column is filled only when the legacy key has exactly this name.
export const COLUMN_KEYS = { title: 'title', slug: 'slug', description: 'summary', image: 'imageUrl', href: 'href', badge: 'badge' } as const;

// Pages that always stay contentModel='document' even if they contain arrays.
export const DOCUMENT_ONLY_SLUGS = new Set(['home', 'furniture', 'contact-us', 'about-us', 'corporate']);
// Plus: template === 'article', every slug in ARTICLE_PAGE_SLUGS (pages.routes.ts), and pages that have no COLLECTIONS key.

export const HTML_KEYS = ['detailContent', 'body', 'content', 'methodology', 'answer'] as const; // sanitized on write
export const MAX_PAGEDATA_BYTES = 512 * 1024;
export const MAX_ITEM_JSON_BYTES = 256 * 1024;
export const REVISIONS_KEPT_PER_PAGE = 30;
```

### 3.3 Mapping rules: legacy blob to and from the tables

Write these as **pure functions** (no database access) in `backend/src/services/page-content/legacy-mapper.ts`. The migration script (T4), the legacy write adapter (T5) and the read path (T5) all use these same functions.

#### `slugify(s)`
`String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')`. This must stay byte-for-byte identical to the existing backend `fallbackSlug` logic and the frontend `slugify`. Check `frontend/src/lib` for the frontend version, and if the two differ, stop and log it.

#### `splitLegacyPageData(blob) → { settings, items[], categories[] }`
1. `settings` is a deep copy of `blob` with every `COLLECTIONS` key removed and the top-level `categories` key removed. Every other key stays in settings, including `sections`, `features`, `partnerLogos`, `styles`, `template` and unknown keys.
2. For each collection key in `COLLECTIONS` order:
   - `featured`: use it only if it is a non-null object with at least one key. Treat it as an array of one item.
   - Other collections: use the array. Drop entries that are not plain objects (`null`, strings and so on).
3. For each item object at array index `i`, build `{ collection, sortOrder: i, title, slug, summary, imageUrl, href, badge, data, detail, categoryNames }`:
   - **`title`:** the first non-empty string among `title`, `question`, `name`, `heading`, `label`, falling back to `"<Collection> <i+1>"`. Record `titleWasDerived = !obj.title`; it is stored as `data.__titleDerived = true` only when the title was derived.
   - **Column fields:** for each `COLUMN_KEYS` entry, if the legacy key exists on the object, put its value (stringified if it isn't a string) in the column. Otherwise the column is `null`.
   - **`categoryNames`:** use `obj.categories` if it is an array (trimmed, non-empty, de-duplicated, order kept). Otherwise use `[obj.category.trim()]` if `obj.category` is a non-empty string. Otherwise `[]`.
   - **`detail`:** for collections in `CARD_COLLECTIONS`, move every `DETAIL_KEYS` key that exists. For list collections, `detail = {}`.
   - **`data`:** every remaining key, except the `COLUMN_KEYS`, `category`, `categories` and the moved detail keys.
4. **Slugs** are unique per page across all collections. Process items in collection order, then in index order:
   - `base` is `normalizeSlug(obj.slug)` if non-empty, where `normalizeSlug` lowercases, trims, strips leading and trailing `/`, and keeps only the last path segment. Otherwise `slugify(title)`. Otherwise `${collection}-${i+1}`.
   - If `base` is already taken, use `base-2`, then `base-3`, and so on.
   - Record every collision in the result's `warnings[]`.
5. **`categories`** (page level):
   - Start with the explicit `blob.categories` strings, in order.
   - Then add any item `categoryNames` not seen yet, in item order.
   - Category slug is `slugify(name)`. If two names produce the same slug, merge them: keep the first name and log a warning.
   - `sortOrder` is the position in this merged list.

#### `buildLegacyPageData(settings, items, categories, { includeDetail }) → blob`
1. Start with a deep copy of `settings`.
2. For each collection that has items, take its items sorted by `sortOrder` and include only `published` items for public reads. Map each item to:
   `{ ...item.data (minus __titleDerived), ...(includeDetail ? item.detail : {}), title (omitted if data.__titleDerived), slug, description: summary, image: imageUrl, href, badge, categories: [names in join sortOrder] }`.
   - Omit keys whose value is `null`.
   - Omit `categories` if it is empty.
   - For `featured`, emit the single object, not an array.
3. If any categories exist, set `blob.categories = categories.map(c => c.name)` in `sortOrder`.

#### Round-trip equivalence (`assertLegacyEquivalent(original, rebuilt)`)
Put this in `backend/tests/helpers/legacy-equivalence.ts`. The two blobs are equivalent when they are deep-equal after normalizing `original` with these allowed differences, and only these:
1. Item objects gain `slug` when it was missing, or when a collision suffix changed it. Collisions must appear in `warnings`.
2. `category: "X"` becomes `categories: ["X"]`. `categories` arrays are trimmed and de-duplicated, and empty `categories` arrays are removed.
3. Non-object entries in collection arrays are removed. An empty `featured: {}` is removed.
4. Top-level `categories` becomes the merged list from rule 5 of the split (explicit names first, then names found on cards).
5. Item `slug` values are normalized (lowercase, no leading or trailing slash, last segment only).

### 3.4 Content model classification
A page becomes `contentModel = 'structured'` when **all** of these are true:
- `template !== 'article'`
- the slug is not in `ARTICLE_PAGE_SLUGS` or `DOCUMENT_ONLY_SLUGS`
- the slug does not start with `guide-`, `environment-` or `resource-`
- the parsed `pageData` contains at least one `COLLECTIONS` key (even an empty array)

Every other page stays `document`. The T4 dry-run report must list the final classification of every page.

### 3.5 API contract

**All responses are JSON. Errors use the shape `{ "error": "<code_or_message>", ...extra }`.**

#### Public (no auth)

| Method & path | Response | Notes |
|---|---|---|
| `GET /api/pages/:idOrSlug` | **Legacy shape, unchanged:** `{ id, title, slug, content, template, published, createdAt, updatedAt, pageData: <string> }`, plus the additive fields `contentModel` and `version`. | For structured pages, `pageData` is `JSON.stringify(buildLegacyPageData(..., { includeDetail: !DETAIL_DROPPED.has(slug) }))`. Aliases stay as they are (`sports`↔`sports-infra`, `sell-on-schoolmart`↔`sell-on-campusmart`). No database writes. |
| `GET /api/pages/:slug?v=2` | `{ page: {id, slug, title, template, contentModel, version, updatedAt}, settings: {...}, collections: { cards?: ItemSummary[], section2Cards?, moreCards?, featured?: ItemSummary[] (0..1), faqs?, openings?, caseStudies? }, categories: [{id, name, slug}] }` | **Never includes `detail`.** Document pages return `settings = pageData`, `collections = {}` and `categories = []`. Unpublished pages and published-false items return 404 or are hidden, unless the caller is an admin. |
| `GET /api/pages/:slug/items/:itemSlug` | `{ hub: { id, slug, title, template, heroImage, cta: { ctaTitle, ctaSubtitle, ctaButtonLabel, ctaHref, ctaButtonHref } }, item: ItemFull }`, or `{ redirectTo: "/hub/new-slug" }` (status 200) | Lookup order: an exact `(pageId, slug)` match. Then a `SlugRedirect` for `/<hub>/<itemSlug>`. Then a fallback match on `slugify(title)` or the last segment of `href` (keeps old URLs working). 404 `{ error: 'not_found' }` otherwise. |
| `GET /api/pages/resolve?path=/a` or `?path=/a/b` | `{ type: 'page' \| 'item' \| 'redirect' \| 'not_found', slug?, hubSlug?, itemSlug?, template?, contentModel?, hubTemplate?, redirectTo?, page?: <legacy page object> }` | Resolution order is in 3.5.1. Returns status 404 when `type = 'not_found'`. **Must be registered before `/:idOrSlug`.** |
| `GET /api/pages/hub/catalog` | The same shape as today. | Items come from tables. `id` becomes `pi-<PageItem.id>` (T7 checks the consumers first). The `HUB_METADATA` category lists are removed. |
| `GET /api/content` | Unchanged. | Cached (3.6). |
| `GET /sitemap.xml` (on the API host) | XML | T16. |

`ItemSummary` = `{ id, slug, collection, title, summary, imageUrl, href, badge, categories: string[], data, sortOrder }`.

`ItemFull` = `ItemSummary` plus `detail`, `version` and `updatedAt`.

#### 3.5.1 Resolve order
The path is lowercased, has its trailing slash removed, and has a leading `/p/` treated as `/`.

**One segment `/s`.** Load all candidates in **one** `findMany({ where: { slug: { in: [...] } } })` plus one `SlugRedirect` lookup. Then pick the first match in this order:
1. A `SlugRedirect` with `fromPath = /s`. Returns `redirect`.
2. A published page with slug `s`.
3. The alias of `s` (`sports`→`sports-infra`, `sports-infra`→`sports`, `sell-on-schoolmart`→`sell-on-campusmart`, `sell-on-campusmart`→`sell-on-schoolmart`).
4. `guide-s`, then `environment-s`, then `resource-s`, skipping any prefix `s` already starts with.
5. Otherwise `not_found`.

For `type: 'page'`, include `page` (the legacy object) so the frontend can seed its cache.

**Two segments `/h/i`.**
1. A `SlugRedirect` for `/h/i`.
2. A published page `h-i`. Returns `type: 'page'`.
3. A published page `i`. Returns `type: 'page'`. This preserves the current `UniversalArticleDetail` behaviour.
4. A published hub `h` (alias-aware) that has a published item matching `i` by the item lookup order. Returns `type: 'item'` with `hubSlug`, `itemSlug` (the canonical slug) and `hubTemplate`.
5. If the hub `h` exists and is published but has no matching item, still return `type: 'item'` with `itemSlug: null` and `hubTemplate`. The frontend then shows its existing "not found" UI.
6. Otherwise `not_found`.

#### Admin (`verifyToken` + `requireAdmin`, always `Cache-Control: no-store`)

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/admin/pages/:pageId/items?collection=&format=card` | – | `200 { items: (ItemFull & { card?: object })[] }`. `format=card` adds `card` = the legacy card object (`buildLegacy` for a single item, with detail included). | 404 |
| `POST /api/admin/pages/:pageId/items` | `{ collection, card }` **or** `{ collection, title, slug?, summary?, imageUrl?, href?, badge?, data?, detail?, categories?: string[], published?, position? }` | `201 ItemFull & { card }` | 400 validation, 409 `slug_taken`, 400 `page_not_structured` |
| `PATCH /api/admin/pages/:pageId/items/:itemId` | `{ version, card }` or `{ version, ...partialFields }` | `200 ItemFull & { card }` (version + 1) | 409 `{ error: 'version_conflict', current: ItemFull & { card } }`, 400, 404 |
| `DELETE /api/admin/pages/:pageId/items/:itemId?version=N` | – | 204 | 409 `version_conflict`, 404 |
| `PUT /api/admin/pages/:pageId/items/reorder` | `{ collection, orderedIds: number[] }` | `200 { items }` | 400 when `orderedIds` doesn't exactly match the collection's IDs |
| `GET /api/admin/pages/:pageId/categories` | – | `200 { categories: [{id, name, slug, sortOrder, itemCount}] }` | |
| `POST /api/admin/pages/:pageId/categories` | `{ name }` | 201 | 409 `slug_taken` |
| `PATCH /api/admin/pages/:pageId/categories/:id` | `{ name?, sortOrder? }` | 200. A rename keeps the item links. | 409 |
| `DELETE /api/admin/pages/:pageId/categories/:id` | – | 204. Removes the links only. | |
| `PUT /api/admin/pages/:pageId/categories/reorder` | `{ orderedIds }` | 200 | 400 |
| `GET /api/admin/pages/:pageId/revisions` | – | `200 { revisions: [{id, version, reason, authorId, createdAt}] }` | T13 |
| `POST /api/admin/pages/:pageId/revisions/:revId/restore` | `{ version }` (the page version) | `200 { page }` | 409 |
| `PUT /api/pages/:id` (existing) | Existing fields plus optional `version` | 200, `version + 1` | 409 `version_conflict` when `version` is sent and doesn't match. For structured pages, see **legacy write adapter** in T5 and strict mode in T12. |

**Slug change rule.** When a PATCH changes an item's `slug`, insert `SlugRedirect { fromPath: /<hub>/<old>, toPath: /<hub>/<new> }` in the same transaction. Also delete any redirect whose `fromPath` equals the new path, so redirects never loop.

**Optimistic locking implementation.** Use `updateMany({ where: { id, pageId, version }, data: { ..., version: { increment: 1 } } })`. If `count === 0`, re-read the row: return 404 if it is missing, 409 with `current` if it exists.

### 3.6 Caching across Passenger processes (single source of truth)
- **Version counter.** The `CmsState` row with `id = 1` holds `version`. `afterContentWrite()` increments it on **every** CMS write: pages, items, categories, `/content` writes, restores, migrations and bootstrap writes.
- **Reading the version.** `getCmsVersion()` reads it with `findUnique` and memoizes the value in-process for **1000 ms**.
- **Public CMS response cache.** An in-process LRU (`lru-cache`, max 500 entries) stores `{ version, etag, body }`, keyed by `req.originalUrl`. An entry is valid only while `entry.version === await getCmsVersion()`. Because the version lives in the database, every Passenger process sees an edit within about 1 s.
- **HTTP headers for cached public CMS routes:**
  - `Cache-Control: public, no-cache`, which makes the browser revalidate every time.
  - `ETag: W/"cms-<version>-<sha1(originalUrl) first 12 chars>"`.
  - If `If-None-Match` matches, respond `304` with no body and no database query beyond the version check.
  - Remove `Pragma` and `Expires` from these routes.
- **Routes that use the cache:** `GET /api/content`, `GET /api/pages/:slug` (legacy and `v=2`), `GET /api/pages/:slug/items/:itemSlug`, `GET /api/pages/resolve`, `GET /api/pages/hub/catalog`, `GET /api/pages/published` and `GET /sitemap.xml`.
  - Bypass the cache (but still send `no-cache`) when the request has an `Authorization` header, because admins may see unpublished content.
- **Everything else under `/api` keeps `no-store`.**
- **Solutions index.** It stores the CMS version it was built from. Before serving a search request, it calls `ensureFresh()`. If `getCmsVersion()` (memoized for 5 s for this purpose) differs from the index's version, it rebuilds behind the existing mutex. Page-write rebuilds are debounced to 2000 ms.

### 3.7 Frontend data layer (target)
- **`frontend/src/lib/query-client.ts`** exports a singleton `queryClient` with these defaults: `staleTime: 60_000`, `gcTime: 600_000`, `refetchOnWindowFocus: false`, `retry: 1`.
- **`frontend/src/lib/cms-channel.ts`** owns the one module-level `BroadcastChannel('cm_cms_channel')`, plus the `cm_cms_channel` window CustomEvent.
  - It exports `broadcastCmsInvalidation`.
  - On `INVALIDATE_PAGE {slug}` it invalidates the query keys `['page', slug]`, `['hub', slug]`, `['hubItem', slug]` and `['resolve']`.
  - On `INVALIDATE_ALL` it invalidates everything.
  - `usePageData.ts` re-exports `broadcastCmsInvalidation` and `clearPageDataCache` so existing imports keep working.
- **`frontend/src/api/cms.ts`** holds the fetchers `fetchPageLegacy`, `fetchHub`, `fetchHubItem` and `fetchResolve`.
- **Query keys:**

  | Key | Data |
  |---|---|
  | `['page', slug]` | parsed legacy `pageData` |
  | `['pageRecord', slug]` | full legacy record |
  | `['hub', slug]` | v2 hub |
  | `['hubItem', hubSlug, itemSlug]` | single item |
  | `['resolve', path]` | resolve result |
  | `['siteContent']` | site content |

### 3.8 Invariants that must always hold (tests enforce them)
- **I1:** No public GET route writes to the database.
- **I2:** Every `page.pageData` is NULL or `jsonb_typeof = 'object'`. Every `pageitem.data` and `pageitem.detail` is an object.
- **I3:** `(pageId, slug)` is unique for items and for categories.
- **I4:** For every structured page, `buildLegacyPageData(split(original))` is equivalent to the original under 3.3.
- **I5:** Hub v2 responses never contain a `detail` key.
- **I6:** Every CMS write bumps `CmsState.version` exactly once per request.
- **I7:** Every URL that resolved before the migration still resolves to the same content after it (golden route list from T0).
- **I8:** Admin endpoints are rejected without an admin token: 401 without a token, 403 for a non-admin.

---

## 4. Global setup and conventions

### 4.1 New dependencies (add only in the task that needs them)

| Package | Where | Task |
|---|---|---|
| `vitest`, `supertest`, `@types/supertest`, `fast-check` | backend dev | T1 |
| `zod`, `sanitize-html`, `@types/sanitize-html` | backend | T6 |
| `lru-cache`, `compression`, `@types/compression` | backend | T8 |
| `pino`, `pino-http` | backend | T17 |
| `sharp` | backend (runtime, optional at load time) and frontend dev (build script) | T15 |
| `@tanstack/react-query` (v5) | frontend | T9 |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw` (v2) | frontend dev | T9 |
| `@playwright/test` | root dev | T0 |
| `rollup-plugin-visualizer` | frontend dev | T14 |

Pin exact versions in `package.json` (no `^`) for the new runtime dependencies `zod`, `sanitize-html`, `lru-cache`, `compression`, `pino`, `pino-http`, `sharp` and `@tanstack/react-query`.

### 4.2 Environment variables

| Variable | Used by | Example | Added in |
|---|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | backend | Neon dev (existing) | – |
| `DATABASE_URL_TEST` | backend tests | Neon **test branch** URL (ask the user) | T1 |
| `TEST_DB_CONFIRM` | backend tests | `yes-reset-this-db` | T1 |
| `SITE_URL` | backend (sitemap, canonical) | `https://campusmart.in` | T16 |
| `LOG_LEVEL` | backend | `info` | T17 |
| `VITE_API_URL` | frontend | existing | – |
| `VITE_MEDIA_BASE_URL` | frontend | `https://api.campusmart.in` (prod); dev decided by the T15 audit | T15 |
| `VITE_SITE_URL` | frontend | `https://campusmart.in` | T16 |

Every new backend variable is added to `validateEnv()` (required or optional, as noted), `backend/.env.example` and the runbook in T17. Never commit real secrets.

### 4.3 Backend test harness (built in T1, used everywhere)
- **Location:** `backend/tests/**/*.test.ts`. Config: `backend/vitest.config.ts` with `fileParallelism: false`, `testTimeout: 30000`, and `globalSetup: tests/global-setup.ts`.
- **`tests/global-setup.ts`:**
  1. Refuse to run (throw) unless all of these are true:
     - `DATABASE_URL_TEST` is set.
     - `TEST_DB_CONFIRM === 'yes-reset-this-db'`.
     - `DATABASE_URL_TEST` is not equal to `DATABASE_URL` or to `DATABASE_URL_UNPOOLED` (compare after stripping query strings).
  2. Set `process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED = DATABASE_URL_TEST` and `NODE_ENV = 'test'`.
  3. Run `npx prisma migrate reset --force --skip-seed --skip-generate` (via `execSync`, using the same env).
- **`tests/helpers/db.ts`:**
  - `resetContentTables()` runs `TRUNCATE "pageitemcategory","pagecategory","pageitem","pagerevision","slugredirect","page","sitecontent","searchcard","cmsstate" RESTART IDENTITY CASCADE` and then inserts the `cmsstate` row with `id = 1`. Until T3, only truncate the tables that exist.
  - `seedPagesFromFixtures(names[])` loads `tests/fixtures/pages/<name>.json`.
- **`tests/helpers/auth.ts`:** creates an admin user and a normal user and returns JWTs signed with the test `JWT_SECRET`.
- **`tests/helpers/app.ts`:** imports `app` from `src/app.ts` (T1 splits `index.ts` into `app.ts` and `server.ts`).
- **Scripts:**
  - backend `package.json`: `"test": "vitest run"` and `"test:watch": "vitest"`
  - root: `"test": "npm run test --prefix backend && npm run test --prefix frontend"` and `"test:legacy": "node tests/clean-cards-verification.test.cjs"`

### 4.4 Database backup procedure (before every dev-DB write)
1. Read `backend/scripts/export-database.js` to see where it writes its output.
2. Run `npm run db:export --prefix backend`.
3. Check the output file exists and its size is more than 0. Record the path and size in the log.
4. For schema changes, also check that `npm run db:restore --prefix backend` can restore that file into the **test** database. Do this once, in T1.

### 4.5 Definition of Done (every task)
- All new tests for the task pass, and all earlier tests still pass. Run `npm test` at the root once T9 has added frontend tests.
- `npm run build --prefix backend` succeeds (backend `tsc`).
- `npm run typecheck --prefix frontend` succeeds. From T9 on, `npm run build --prefix frontend` succeeds too.
- `npm run lint --prefix frontend` reports **no new errors** compared to the T0 baseline count.
- The log entry is written and the commit is made.

### 4.6 Effort summary

| Phase | Tasks | Estimate (focused agent hours) |
|---|---|---|
| A. Foundation | T0–T2 | 10 h |
| B. Data model and migration | T3–T5 | 18 h |
| C. Admin API, consumers, HTTP | T6–T8 | 17 h |
| D. Frontend data and pages | T9–T11 | 19 h |
| E. Admin UI and revisions | T12–T13 | 16 h |
| F. Performance, images, SEO | T14–T16 | 16 h |
| G. Ops, deploy, final verification | T17–T18 | 11 h |
| **Total** | 19 tasks | **about 107 h** |

---

## 5. Tasks

### Phase A – Foundation

---

#### T0. Baseline capture and safety net (2 h)
**Goal:** freeze "before" measurements and the golden route list, so later tasks can prove nothing broke.

**Steps**
1. Run `git status`. If there are uncommitted changes, stop and ask the user. Otherwise run `git checkout -b feat/hybrid-cms`.
2. Back up the dev database (4.4).
3. **Baseline the old tests.** Run `npm test` at the root (the current single legacy test) and `node` on every `tests/*.test.cjs` and `tests/*.test.mjs` file. Record pass and fail per file in `docs/plans/baseline/legacy-tests.md`. These are informational only, not gates.
4. **Baseline the frontend.** Run `npm run lint --prefix frontend` and record the error count. Run `npm run build:frontend` at the root and record every JS chunk with its size into `docs/plans/baseline/bundle.md` (largest first, plus the total).
5. **Write the golden route list.** Create `backend/scripts/export-route-inventory.ts`. Using Prisma against the dev database (read-only), it writes `tests/e2e/golden-routes.json`:
   - every published page as `/<slug>`, using the slug as stored
   - for every page with `cards`, `section2Cards`, `moreCards` or `featured`, one detail URL per item: `/<hub>/<item.slug || slugify(item.title)>`
   - the static routes from `frontend/src/App.tsx` (the explicit `<Route path>` values without params, excluding `/admin/*`, `/shop` and the redirect-only routes)
   - each entry as `{ path, kind: 'page'|'detail'|'static', expectTitle: <title or card title> }`
6. **Set up the Playwright baseline.** Add `@playwright/test` at the root and create `playwright.config.ts`:
   - `testDir: tests/e2e`, `baseURL: http://localhost:5173`
   - one Chromium project
   - `webServer` entries that start the backend (`npm run dev --prefix backend`, port 3001) and the frontend (`npm run dev --prefix frontend`, port 5173), with `reuseExistingServer: true`
7. **Write `tests/e2e/smoke.spec.ts`.** It loops over `golden-routes.json`. For each route it:
   - visits the path and waits for `networkidle`, with a timeout of 20 s
   - asserts the page has no `Article not found` text, no NotFound page heading (check `pages/not-found.tsx` for its text), and no `Something went wrong`
   - asserts there is an `h1` or a visible `expectTitle` text
   - collects `console.error` messages, ignoring known third-party noise (record the filter list)
8. **Write `tests/e2e/visual.spec.ts`.** It takes full-page screenshots of `/`, `/labs`, `/ai-ml`, `/campus-master-planning`, `/faq`, `/job-openings`, `/catalogues`, `/colleges-universities-for-sale`, one article page (`/privacy-policy`) and one detail page per hub kind (the first entry of each kind in the golden list).
   - Use `page.emulateMedia({ reducedMotion: 'reduce' })`, wait for network idle, then wait 2500 ms.
   - Use `toHaveScreenshot` with `maxDiffPixelRatio: 0.02` and `animations: 'disabled'`.
   - Generate the baselines with `--update-snapshots` **now**.
9. **Run the smoke suite once and record the result.** Routes that already fail before any change go into `tests/e2e/known-failures.json` and get skipped, with the list recorded in the log. The smoke run must end green after this.
10. **Record request counts.** Save the network request counts to `/api/*` on cold loads of `/`, `/labs`, one `/labs/<item>` and one prefixed dynamic page (a `guide-` page visited without its prefix, if one exists) into `docs/plans/baseline/requests.md`. Use a Playwright script that counts `page.on('request')` events. Save the script as `tests/e2e/measure-requests.mjs` so later tasks can re-run it. Also record the total image bytes transferred on a cold `/` load (the sum of the sizes of responses with `resourceType() === 'image'`).
11. **Lighthouse baseline.**
    - Build the frontend (`npm run build:frontend`) and serve `frontend/dist` with `npx vite preview --port 4173`, using the dev backend running in the background.
    - Run `npx lighthouse http://localhost:4173/ --preset=perf --form-factor=mobile --output=json --output-path=docs/plans/baseline/lh-home-<n>.json --chrome-flags="--headless"` three times. Do the same for `/labs`, and once with `--only-categories=seo` for `/labs`.
    - Record the median Performance score, LCP, CLS and TBT, plus the SEO score, in `docs/plans/baseline/lighthouse.md`.
    - Save the commands as `scripts/measure-lighthouse.mjs` so they can be re-run.
    - Stop the preview server.

**Acceptance**
- [ ] The branch `feat/hybrid-cms` exists, and the backup path is logged.
- [ ] `docs/plans/baseline/{legacy-tests,bundle,requests,lighthouse}.md` exist and contain numbers.
- [ ] `tests/e2e/golden-routes.json` exists and has at least 60 entries.
- [ ] `npx playwright test tests/e2e/smoke.spec.ts` passes, with known failures listed and skipped.
- [ ] The visual baselines are committed under `tests/e2e/visual.spec.ts-snapshots/`.

---

#### T1. Backend test harness and clean migration baseline (4 h)
**Goal:** real backend tests against a separate database, and a Prisma migration history that matches PostgreSQL.

**Steps**
1. **Ask the user for `DATABASE_URL_TEST`** (a Neon branch made from dev). Store it in `backend/.env`, which is git-ignored (confirm that first), together with `TEST_DB_CONFIRM=yes-reset-this-db`. If the user does not provide it, stop.
2. **Split the entry point.** `backend/src/app.ts` builds and exports the Express app: everything in the current `index.ts` except `listen` and the solutions-index boot. `backend/src/server.ts` imports the app, then runs the solutions-index boot and `app.listen(...)`. `index.ts` becomes a one-line `import './server';` so existing start commands still work. Do **not** use a `require.main === module` guard, because Passenger loads the app through its own loader. Update backend `package.json`: `"start": "node dist/server.js"` and `"dev": "ts-node-dev --respawn --transpile-only src/server.ts"`.
3. **Add the harness** (section 4.3), including the safety guard.
4. **Check the schema against the dev database:**
   `npx prisma migrate diff --from-url "$env:DATABASE_URL_UNPOOLED" --to-schema-datamodel prisma/schema.prisma --script`
   - If the output is anything other than an empty migration, save it to the log. If it only adds missing indexes or constraints that are safe, align `schema.prisma` to the database instead (for example with a `prisma db pull` into a temporary file to compare). If it drops or alters columns, **stop and ask the user.**
5. **Archive the old migrations.** Run `git mv backend/prisma/migrations/2026* backend/prisma/migrations_archive/`. Keep `migration_lock.toml` in `migrations/`.
6. **Create the baseline migration:** `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output prisma/migrations/20261121000000_baseline_postgres/migration.sql`. If `--output` is not supported, write the stdout to that file with Node.
7. **Back up again** (4.4). On the **dev** database, run `DELETE FROM "_prisma_migrations";` through `npx prisma db execute --stdin`, piping the SQL with `echo`. Then run `npx prisma migrate resolve --applied 20261121000000_baseline_postgres`. Tell the user in the final summary that the old migration records were cleared after a backup.
8. **Leave the old SQL files alone.** `backend/prisma/sql/*.sql` and `targeted-production-sync.sql` are historical. Add `backend/prisma/sql/README.md`: "Historical one-off scripts. Not part of the migration path. Do not run."
9. **Check that a backup can be restored.** Restore the newest backup into the test database once (`DATABASE_URL` pointed at the test DB, then `db:restore`) to prove backups can be restored. Afterwards, run `migrate reset` on the test DB again.

**Tests** (`backend/tests/smoke.test.ts`)
- `GET /health` returns 200 `{ status: 'ok' }`.
- `GET /api/pages/faq` returns 200 with `slug === 'faq'` (this currently creates the row, which T2 changes).
- The guard test: with `TEST_DB_CONFIRM` unset, `global-setup` throws. Unit-test the guard function itself.

**Acceptance**
- [ ] `npm run test --prefix backend` passes, with 3 or more tests.
- [ ] `npx prisma migrate status` against dev reports `Database schema is up to date!`
- [ ] On the test database, `npx prisma migrate reset --force --skip-seed` applies only `20261121000000_baseline_postgres`.
- [ ] `npm run dev --prefix backend` starts, and `GET http://localhost:3001/health` returns 200.

---

#### T2. Characterization tests and removal of GET side effects (4 h)
**Goal:** freeze the current API output as the compatibility contract, and make public GET routes read-only (I1).

**Steps**
1. **Export the fixtures.** Create `backend/scripts/export-page-fixtures.ts` (read-only against dev). It writes `backend/tests/fixtures/pages/<slug>.json` with `{ title, slug, template, published, content, pageData }`, where `pageData` is the original **string**. Export these slugs: `labs`, `ai-ml`, `campus-master-planning`, `campus-design-execution`, `faq`, `job-openings`, `catalogues`, `colleges-universities-for-sale`, `sports-infra`, `libraries`, `tech-infra`, `privacy-policy`. Also export one page whose slug starts with `guide-`, `environment-` or `resource-`, if one exists. Commit them.
2. **Add synthetic edge-case fixtures** in `backend/tests/fixtures/pages/edge-*.json`:
   - duplicate card titles
   - cards with no slug
   - a `category` string on one card and a `categories` array on another
   - only `section2Cards`
   - a `featured` that duplicates a card
   - `featured: {}`
   - `null` entries in `cards`
   - a FAQ with `question`/`answer` and no `title`
   - detail HTML that contains `<script>`
   - Unicode titles
3. **Snapshot the responses.** `backend/tests/contract/legacy-pages.contract.test.ts` seeds each fixture, calls `GET /api/pages/<slug>`, and compares against a stored JSON snapshot in `tests/contract/__snapshots__/` (Vitest `toMatchFileSnapshot`). Before snapshotting, remove `id`, `createdAt` and `updatedAt`, and parse `pageData`. Also snapshot `GET /api/pages/hub/catalog` and `GET /api/pages/hub/catalog?hub=labs`.
4. **Move the seeding into one bootstrap service.** Create `backend/src/services/bootstrap-pages.ts` with `bootstrapPages(): Promise<{ created: string[], updated: string[] }>`. Move into it all the logic from `ensureCollegeSalePage`, `ensurePartnerPage`, `ensureJobOpeningsPage`, `restorePartnershipIdentity`, `ensureSimplePage`, `ensureArticlePage` and the `requiredDefaults` loop. Each create must survive two processes running it at once: catch Prisma `P2002` and re-read the row.
5. **Call the bootstrap at startup.** Call it in `server.ts` before `listen` (log the result), and from `backend/prisma/seed.ts` and `backend/src/runSeed.ts` if they create pages.
6. **Make the GET handlers read-only.** Remove every `ensure*` call from `GET /`, `GET /published` and `GET /:idOrSlug`. The admin `GET /` may call `bootstrapPages()`, because it is authenticated and idempotent. Keep it there so admin behaviour doesn't change.
7. **Regenerate the snapshots** only for differences that come from side-effect removal. There should be none for seeded fixtures. If a snapshot changes, explain why in the log.

**Tests**
- `contract/legacy-pages.contract.test.ts`: one test per fixture.
- `pages/no-side-effects.test.ts`: count the rows and `max(updatedAt)` across `page`, then hit every public pages GET (`/`, `/published`, each fixture slug, a missing slug, `faq` when absent). The counts and timestamps must be unchanged. A missing `faq` returns 404 now, which is expected because bootstrap runs at startup.
- `services/bootstrap-pages.test.ts`: on an empty database it creates every default. A second run creates nothing. Two concurrent runs (`Promise.all`) don't throw and don't create duplicates.

**Acceptance**
- [ ] Contract snapshots are committed, with at least 14 tests.
- [ ] I1 holds (the no-side-effects test passes).
- [ ] Searching `backend/src/routes` for `ensure(Simple|Article|CollegeSale|Partner|JobOpenings)Page` finds matches only in the admin `GET /` handler, or none.

---

### Phase B – Data model and migration

---

#### T3. Schema: new tables, `jsonb`, versions (4 h)
**Goal:** add the 3.1 schema without changing behaviour.

**Steps**
1. **Add the preflight check.** Create `backend/scripts/check-pagedata-json.ts`. It lists every page whose `pageData` is non-null and fails `JSON.parse`, or parses to something that is not an object. Run it against dev. If anything is listed, stop and report.
2. **Apply the schema changes** from 3.1 to `schema.prisma`.
3. **Create the migration without applying it:** `npx prisma migrate dev --create-only --name hybrid_cms_tables`, run against the **test** database URL (point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at the test DB for this command). If shadow-database creation fails, use `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <test url> --script --output ...`.
4. **Fix the `pageData` SQL by hand. This is mandatory.** Prisma will generate DROP and ADD for `pageData`, which loses data. Replace it with:
   ```sql
   ALTER TABLE "page" ALTER COLUMN "pageData" TYPE JSONB
     USING (CASE WHEN "pageData" IS NULL OR btrim("pageData") = '' THEN NULL ELSE "pageData"::jsonb END);
   ```
   Then append:
   ```sql
   INSERT INTO "cmsstate" ("id","version","updatedAt") VALUES (1, 1, NOW()) ON CONFLICT ("id") DO NOTHING;
   ```
5. **Add one shared parser.** Create `backend/src/lib/page-data.ts` with `parsePageData(v: unknown): Record<string, unknown>`. It accepts an object (returned as is), a string (JSON-parsed, `{}` on failure) or null (`{}`), and also accepts a double-encoded string scalar.
6. **Update every `pageData` read and write in `backend/src`, `backend/prisma/seed.ts` and `backend/src/runSeed.ts`:**
   - Writes pass objects, cast as `Prisma.InputJsonValue`.
   - Reads use `parsePageData`.
   - `ensureArticlePage`'s `existing.pageData === '{}'` check becomes an empty-object check.
   - Fix the `tsc` errors this causes, and change nothing else.
7. **Add the response mapper.** Create `backend/src/services/page-content/page-response.ts` with `toLegacyPageResponse(page)`. It returns the row with `pageData: page.pageData == null ? null : JSON.stringify(page.pageData)`. Route **every** endpoint that returns Page rows through it: `GET /`, `/published`, `/:idOrSlug`, `POST /`, `PUT /:id`. Search `backend/src` for `prisma.page.` and `res.json(page` to find any other spots, including `admin.routes.ts`.
8. **Leave the old scripts.** Scripts in `backend/scripts/*` that read `pageData` as a string are not compiled by `tsc`. Confirm in `backend/tsconfig.json` that they are excluded, and list them in the log as "legacy scripts, not updated".
9. **Rehearse on the test database.** Restore the latest dev backup into the test database, run `npx prisma migrate deploy` there, then run `check-pagedata-json.ts` and a count comparison: the number of pages with non-null `pageData` must be the same before and after.
10. **Apply to dev.** Back up (4.4), then run `npx prisma migrate deploy` against dev. Re-run the count comparison against dev.

**Tests**
- `schema/jsonb-integrity.test.ts`: after seeding the fixtures and running `bootstrapPages()`, `SELECT count(*) FROM page WHERE "pageData" IS NOT NULL AND jsonb_typeof("pageData") <> 'object'` returns 0 (I2).
- `schema/constraints.test.ts`:
  - two items with the same `(pageId, slug)` are rejected with P2002
  - the same slug on different pages is allowed
  - the same rule holds for categories
  - deleting a page cascades to its items, categories, links and revisions
- `lib/page-data.test.ts`: covers object, string, invalid string, null and double-encoded input.
- The T2 contract tests stay green with no snapshot changes.

**Acceptance**
- [ ] The migration SQL contains `ALTER COLUMN "pageData" TYPE JSONB USING` and no `DROP COLUMN "pageData"`.
- [ ] The rehearsal and dev counts are logged and equal.
- [ ] Searching `backend/src` and `backend/prisma` for `pageData:\s*JSON\.stringify` finds no matches.
- [ ] All tests pass, and the visual and smoke suites pass (run them).

---

#### T4. Migration script: blobs to rows (6 h)
**Goal:** convert existing structured pages safely and repeatably.

**Steps**
1. **Implement the pure mapper** `legacy-mapper.ts` exactly as in 3.3, plus `classifyPage(page)` from 3.4.
2. **Create `backend/src/services/page-content/structured-writer.ts`** with `writeStructuredPage(tx, pageId, split, { reason, authorId })`. In the given transaction it:
   1. Upserts the categories by `(pageId, slug)` and deletes categories that are no longer present.
   2. Upserts the items by `(pageId, slug)`, keeping each existing `id`. It bumps `version` only when the content changed, and deletes items that are no longer present.
   3. Rewrites `pageitemcategory` links, using `sortOrder` from the item's `categoryNames` order.
   4. Sets `page.pageData = split.settings`, `contentModel = 'structured'` and `version = version + 1`.

   T5 (the legacy write adapter) reuses this same function.
3. **Create the CLI script** `backend/scripts/migrate-page-items.ts`. Run it with `npx ts-node --transpile-only scripts/migrate-page-items.ts`.
   - **Flags:** `--dry-run` (the default when no flag is given is **dry run**), `--apply`, `--page=<slug>` (repeatable), `--force` (re-migrate pages that are already structured, starting from their latest `pre-migration` revision snapshot).
   - **For each page in id order:**
     - `classifyPage`. Skip document pages.
     - Skip pages that are already structured, unless `--force` is set.
     - `split`.
     - In `--apply` mode, run one transaction per page:
       - insert a `PageRevision { reason: 'pre-migration', version: page.version, snapshot: { pageData: <original object>, contentModel: 'document' } }`
       - call `writeStructuredPage`
       - bump `CmsState.version`
   - **Report** (stdout, plus `backend/scripts/output/migrate-page-items-<timestamp>.json`):
     - per page: `slug`, `classification`, item count per collection, category count, `warnings[]` (slug collisions, merged categories, derived titles), and the size before and after in bytes
     - the unknown array-valued keys left in settings (for review)
     - totals
   - Lines prefixed `ERROR` are reported for pages that fail to parse. In `--apply` mode, an error on one page rolls back only that page's transaction, and the script exits with code 1 at the end.
4. **Do a dry run on dev** and paste the summary into the log. Stop and ask the user if there are `ERROR` lines or more than 5 collisions on one page.
5. **Do not run `--apply` on dev yet.** That happens at the end of T5, once the read path exists. Until then, the frontend would see empty collections.

**Tests**
- `page-content/legacy-mapper.test.ts`:
  - One test per edge fixture from T2 (counts, slugs, categories, warnings).
  - `slugify` parity: for 50 sample strings, the output equals the frontend algorithm's output. Copy the frontend function into the test as a reference.
- `page-content/legacy-mapper.property.test.ts` (fast-check, at least 200 runs each):
  - **P1 round-trip:** for an arbitrary blob (random settings keys, collections drawn from `COLLECTIONS` with random item objects that use random subsets of title, slug, description, image, href, badge, category, categories, DETAIL_KEYS and extra keys), `assertLegacyEquivalent(blob, buildLegacy(split(blob), { includeDetail: true }))` holds (I4).
  - **P2 slug uniqueness:** every split result has unique slugs, and each slug matches `^[a-z0-9]+(-[a-z0-9]+)*$` or equals the normalized original slug.
  - **P3 determinism:** `split(blob)` gives deep-equal results on two calls.
  - **P4:** `detail` is `{}` for every `LIST_COLLECTIONS` item.
- `scripts/migrate-page-items.test.ts` (it imports the script's exported `run(options)` function, so the CLI is a thin wrapper):
  - A dry run writes nothing: compare row counts and the cms version.
  - `--apply` on the fixtures gives the expected item and category counts.
  - **A second `--apply` changes nothing** (idempotence): same item IDs, versions and counts.
  - A `pre-migration` revision exists for each migrated page.
  - `--force` re-runs from the revision and gives the same result.
  - Document pages (`privacy-policy`, `guide-*`) are untouched.

**Acceptance**
- [ ] The property tests pass, at 200 runs or more each.
- [ ] The dev dry-run report is committed under `backend/scripts/output/` and summarized in the log: the pages classified as structured, and the totals.
- [ ] The idempotence test passes.

---

#### T5. Read path from tables, legacy write adapter, item endpoint, data cut-over (6 h)
**Goal:** structured pages are served from the tables with no visible change, the legacy admin saves still work, and the dev data is migrated.

**Steps**
1. **Read `postman/skills/api-engineer/SKILL.md`** and follow it for the new endpoints. This includes adding and updating the Postman collection under `postman/` as the skill describes.
2. **Create `backend/src/services/page-content/page-content.service.ts`:**
   - `loadPage(slugOrId, { includeUnpublished })` loads the page with its categories and its items (ordered by `collection` then `sortOrder`, including the item categories) in **one** Prisma query. It resolves aliases.
   - `getPageLegacy(slugOrId, { isAdmin })` returns `toLegacyPageResponse` for document pages. For structured pages, it builds `pageData` with `buildLegacyPageData(..., { includeDetail: !DETAIL_DROPPED.has(slug) })`, where `DETAIL_DROPPED` starts empty. Public callers get only published items; admins get all items.
   - `getHubV2(slug, { isAdmin })` returns the shape from 3.5.
   - `findItem(page, itemSlug)` follows the lookup order in 3.5: exact slug, then `SlugRedirect`, then title-slug or href leaf.
   - `getItem(hubSlug, itemSlug, { isAdmin })` returns `{ hub, item }` or `{ redirectTo }`.
3. **Wire the routes in `pages.routes.ts`:**
   - `GET /:idOrSlug` goes through `getPageLegacy`, or through `getHubV2` when `req.query.v === '2'`.
   - Add `GET /:slug/items/:itemSlug`. Register it before `/:idOrSlug`, and check Express 5 path syntax.
   - Admin detection on public routes is optional. Add a small `optionalAuth` middleware if one does not already exist. The repo has an `optionalAuth` in blog routes, so reuse it.
4. **Add the legacy write adapter.** In `PUT /api/pages/:id` and `POST /`, when the target page is `structured` (or a POST classifies as structured) and `pageData` contains any `COLLECTIONS` key or a top-level `categories` key, run `split(pageData)` and then `writeStructuredPage` inside a transaction. Item IDs are kept by slug. This keeps `UnifiedPageEditor`, `Categories.tsx` and `CollegesManager.tsx` working until T12. If `pageData` has none of those keys, update the settings only, merging the incoming settings over the stored ones. Keep the existing `searchCard.targetSlug` update when the page slug changes.
5. **Add the optional `version` check** on `PUT /api/pages/:id`: if `req.body.version` is a number and differs from the page's version, respond 409 `{ error: 'version_conflict', current: <legacy page> }`. Every successful write increments `version`.
6. **Add the single write hook.** Create `backend/src/services/page-content/after-content-write.ts` with `afterContentWrite({ pageId?, reason, authorId? })`. For now it bumps `CmsState.version` and schedules the debounced solutions rebuild (2000 ms, see T7). Call it from every page write route and from `content.routes.ts` PUT handlers. It replaces the direct `solutionsIndexService.rebuild()` calls in those routes.
7. **Rollback flag.** Add `--rollback [--page=slug]` to `migrate-page-items.ts`, as specified in section 7. Implement and test it **before** the cut-over.
8. **Cut over the data (dev):**
   - Back up (4.4).
   - Run `migrate-page-items.ts --apply` on dev and log the report.
   - Run the smoke and visual Playwright suites. Both must pass.
   - If the visual diff fails, run `--force`, or roll back by restoring the backup. Fix the issue and repeat.

**Tests**
- **Contract tests, second mode.** `contract/legacy-pages.contract.test.ts` gets a `describe` that seeds each fixture, runs `run({ apply: true })`, then calls `GET /api/pages/<slug>`. The parsed `pageData` must pass `assertLegacyEquivalent(originalFixturePageData, response)`. Both modes pass: unmigrated pages are identical to the snapshot, and migrated pages are equivalent.
- `page-content/hub-v2.test.ts`:
  - the response shape matches 3.5
  - **no `detail` key appears anywhere** (a recursive key scan, I5)
  - unpublished items are hidden from the public and visible to admins
  - categories come back in order
- `page-content/item-endpoint.test.ts`:
  - exact slug match
  - title-slug fallback
  - href-leaf fallback
  - a `SlugRedirect` returns `{ redirectTo }`
  - an unpublished item returns 404 for the public
  - an unknown hub returns 404
  - the hub CTA defaults are present
- `page-content/legacy-write-adapter.test.ts`:
  - PUT the full legacy blob after renaming one card, adding one and removing one: item IDs for unchanged slugs are kept, there is one new ID and one deletion
  - PUT with settings only leaves the items untouched
  - a version mismatch returns 409
  - the version increments
- `scripts/migrate-rollback.test.ts`: after `--apply` and then `--rollback`, every fixture's `pageData` is deep-equal to the original, `contentModel` is `document`, and there are no item or category rows for those pages.
- `page-content/cms-version.test.ts`: a table-driven test asserting that every write route (`POST /pages`, `PUT /pages/:id`, `DELETE /pages/:id`, `PUT /content`, `PUT /content/:key`) bumps `cmsstate.version` by exactly 1 (I6).

**Acceptance**
- [ ] All backend tests pass, and both contract modes are green.
- [ ] Dev data is migrated, and the report is logged (pages migrated, item total, category total).
- [ ] Playwright smoke and visual suites pass against migrated dev data (I7).
- [ ] Saving a hub in the existing admin UI still works. Check this manually: edit a card title in `/admin/pages`, save, then confirm the public page shows the change and the `pageitem` row changed with the same `id`. Record the result in the log.

---

### Phase C – Admin API, backend consumers, HTTP

---

#### T6. Admin item and category API with validation and locking (8 h)
**Goal:** the per-item endpoints from 3.5 (admin).

**Steps**
1. **Validation.** Create `backend/src/services/page-content/schemas.ts` (zod):
   - `ItemInputSchema`, `ItemPatchSchema` (requires `version`) and `CardInputSchema` (`z.record(z.unknown())`, with title-like key rules).
   - `CategoryInputSchema`, `ReorderSchema` and `SettingsSchema`. `SettingsSchema` is `z.object({...known keys typed loosely...}).passthrough()`, so existing data is never rejected; it only enforces types on known keys.
   - Size limits from 3.2. The byte size is checked on `JSON.stringify` of the value.
2. **Sanitizer.** Create `backend/src/lib/sanitize.ts` with `sanitizeRichHtml(html)`, built on `sanitize-html`. Read `docs/richtext-contract.md` and `frontend/src/components/**/RichTextContent*` and copy the same allowlist of tags and attributes as the frontend DOMPurify setup. Strip `on*` attributes and `javascript:` URLs. Apply it to every `HTML_KEYS` value anywhere in item `data`/`detail` and in settings, recursively, on every write path, including the legacy adapter and POST/PUT pages. Remove the old regex replacement.
3. **Routes.** Create `backend/src/routes/admin-page-items.routes.ts`, mounted at `/api/admin/pages`, and implement everything in 3.5:
   - Use the `card` representation: `buildLegacy` on a single item for output, and `split` on a single item for input, reusing the mapper functions for a single item. Export `splitItem` and `buildItem` helpers from the mapper.
   - Creating or updating a slug that is already used on the page returns 409 `slug_taken`.
   - Reorder rewrites `sortOrder` to 0..n-1 in one transaction.
   - Slug changes create a `SlugRedirect` (3.5 rule).
   - Every write goes through `afterContentWrite`.
   - All responses set `Cache-Control: no-store`. The global no-store handles this until T8.
4. **Postman.** Update the Postman collection and the API notes according to the skill.

**Tests** (`backend/tests/admin-items/*.test.ts`)
- **CRUD lifecycle.** Create using fields, create using `card`, list with `format=card`, patch, delete. Each step checks the database state and the `card` round-trip: the `card` from GET equals the `card` that was sent, under the 3.3 rules.
- **Locking.**
  - PATCH with a stale version returns 409, the body includes `current`, and the database is unchanged.
  - Two concurrent PATCHes with the same version: exactly one returns 200 and one returns 409.
  - DELETE with a stale version returns 409.
- **Reorder.** Correct order. Missing or extra or foreign IDs return 400. `sortOrder` is contiguous afterwards.
- **Slugs.**
  - A duplicate slug returns 409.
  - A slug change creates a redirect, and `GET /api/pages/<hub>/items/<old>` returns `{ redirectTo }`.
  - Changing A→B and then B→A leaves no loop: the redirect lookup for `/hub/A` is not found and the item resolves directly.
- **Categories.**
  - CRUD.
  - A rename keeps the item links.
  - Deleting removes the links but not the items.
  - Assigning `categories: ['New']` on an item auto-creates the category.
- **Validation.** Oversize detail returns 400. A wrong type on a known settings key returns 400. Unknown settings keys are accepted.
- **Sanitizer (property, fast-check, 200 runs).** For random strings combined with injected `<script>`, `onerror=` and `javascript:`, the output never contains `<script`, `on\w+=` or `javascript:`. Allowed tags (`p`, `h2`, `ul`, `a[href]` and others from the contract) survive unchanged on known-good samples.
- **Auth (I8).** Every admin route returns 401 without a token and 403 with a user token.
- **Write hook.** Every admin write bumps the cms version once.

**Acceptance**
- [ ] All tests pass. Count: at least 30 new tests.
- [ ] The Postman collection has been updated to cover the item lifecycle, including a deliberate 409 request.
- [ ] Searching `backend/src` for `<script\\b\[\^<\]\*` (the old regex) finds no matches.

---

#### T7. Backend consumers read from tables (4 h)
**Goal:** the solutions finder and `/hub/catalog` stop parsing blobs for structured pages, with identical results.

**Steps**
1. **Freeze the current output (before changing anything).** Write the test `solutions/extractor-golden.test.ts`. It seeds the fixtures (unmigrated), calls `PageSolutionsExtractor.extractFromPages` through the repository, and writes the result (the cards sorted by `cardSlug`, without `id`, `createdAt` and `updatedAt`) to a file snapshot. Do the same for `/hub/catalog`, which T2 already covers.
2. **Repository.** `PrismaSolutionsRepository.fetchActiveCards` loads structured pages with their items and categories. Convert each structured page to the old input shape with `buildLegacyPageData(..., { includeDetail: true })` and pass that to the existing extractor. This is the least risky approach: the extractor code does not change, and `cardSlug` stays `${page.slug}--${slugify(title)}`, so `SearchCard` overrides still match.
3. **Hub catalog.**
   - Rewrite `/hub/catalog` to use `PageItem`/`PageCategory` for the labs, sports-infra, tech-infra and libraries hubs. Furniture stays on `Product`.
   - Delete the `HUB_METADATA.defaultCategories` lists, but keep the hub titles.
   - **Before changing `id`**, search `frontend/src` for consumers of `/hub/catalog` and how they use `item.id`. If it is only used as a React key or for equality checks, change it to `pi-<id>`. Otherwise keep `${slug}-${index}` and log why.
4. **Watermarks and freshness:**
   - `fetchDataWatermarks` adds `cmsVersion` (from `CmsState`).
   - `SolutionsIndexService` stores the version it was built with, and gets `ensureFresh()` as described in 3.6. Call it at the start of the solutions-finder search route handler(s) in `solutions-finder.routes.ts`.
   - Add the 2000 ms debounce in `afterContentWrite` (a module-level timer). Rebuilds still use the existing mutex.

**Tests**
- `solutions/extractor-golden.test.ts`, run **after migration**: seed, apply the migration, then extract. The output deep-equals the golden snapshot, except for the slug normalizations allowed by 3.3 (document any differences in the test).
- `pages/hub-catalog.test.ts`: migrated data gives the same items (title, href, categories, hubSlug) and the same subcategory sets as the T2 snapshot. The ID format follows the decision in step 3.
- `solutions/debounce.test.ts`: with fake timers, 5 writes within 1 s cause one rebuild call.
- `solutions/ensure-fresh.test.ts`: bump `cmsstate.version` directly in SQL (simulating another process), then a search call triggers a rebuild (after the memo window, with fake timers or an injectable clock).

**Acceptance**
- [ ] The golden equality tests pass.
- [ ] `/find-solutions` in the browser returns the same top results for 3 sample queries before and after. Record the queries and the first 5 card titles in the log.
- [ ] Searching `backend/src/routes/pages.routes.ts` for `defaultCategories: \[` finds no matches.

---

#### T8. HTTP performance: compression, caching, ETag, resolve endpoint (5 h)
**Goal:** cheap, cache-correct public responses, and single-request routing.

**Steps**
1. **Compression.** Add `app.use(compression())` in `app.ts`, after helmet and before the routes. Do not compress responses that are already compressed (the default filter handles this).
2. **Shared cache module.** Create `backend/src/services/cms-cache.ts` with `getCmsVersion()` (memo 1000 ms, with an injectable clock for tests), `bumpCmsVersion(tx?)` (used by `afterContentWrite`) and the `publicCmsCache` middleware factory from 3.6.
3. **Change the global `/api` header middleware.** It still sets `no-store` by default. The cache middleware on public CMS routes overrides it (`res.setHeader` replaces the value, and `res.removeHeader('Pragma')` and `res.removeHeader('Expires')` clear the old ones).
4. **Apply the cache middleware** to the routes listed in 3.6. Requests with an `Authorization` header bypass the LRU, but still get `no-cache` and an ETag.
5. **Resolve endpoint.** Add `GET /api/pages/resolve` with the exact order from 3.5.1. It uses a single `findMany` for the page candidates and a single `findFirst` for the redirect. Put the logic in `page-content.service.ts` as `resolvePath(path, { isAdmin })`, so it can be unit-tested.

**Tests**
- `http/compression.test.ts`: `GET /api/pages/labs` with `Accept-Encoding: gzip` returns `content-encoding: gzip`.
- `http/cache.test.ts`:
  - The first GET returns 200 with an ETag and `cache-control: public, no-cache`.
  - A second GET with `If-None-Match` returns 304 with an empty body.
  - After an admin PATCH, a GET with the old ETag returns 200 with new content.
  - **Multi-process simulation:** bump `cmsstate.version` with raw SQL, advance the injected clock by more than 1000 ms, and the next GET returns fresh content.
  - Requests with an `Authorization` header skip the LRU (spy on it).
  - `/api/auth/*`, `/api/admin/*` and `/api/wishlist` still return `no-store`.
- `pages/resolve.test.ts`, one case per rule in 3.5.1:
  - an exact page
  - each prefix (`guide-`, `environment-`, `resource-`)
  - both aliases
  - a single-segment redirect
  - `/p/<slug>`
  - a two-segment standalone `h-i` page
  - a two-segment `i` page
  - a two-segment item
  - a hub with an unknown item (`itemSlug: null`)
  - a two-segment redirect
  - an unpublished page (not found for the public)
  - a completely unknown path returns 404 `not_found`
  - Also assert the number of Prisma queries per resolve call is 3 or fewer, using Prisma `$on('query')` in a test client or a spy.

**Acceptance**
- [ ] All tests pass.
- [ ] Manual `curl` checks against the dev server, with the output pasted into the log:
  - `curl -I -H "Accept-Encoding: gzip" http://localhost:3001/api/pages/labs` shows gzip, an ETag and `no-cache`.
  - A repeat request with `-H 'If-None-Match: <etag>'` returns `304`.

---

### Phase D – Frontend data layer and pages

---

#### T9. TanStack Query behind the existing hooks (6 h)
**Goal:** one cache and dedup layer for the frontend, with no changes to any page component.

**Steps**
1. **Set up the frontend test stack.**
   - Add `frontend/vitest.config.ts`: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, and the same `@` alias as the Vite config.
   - `src/test/setup.ts` imports `@testing-library/jest-dom` and starts the msw `server`, which is defined in `src/test/msw/server.ts` with handlers in `src/test/msw/handlers.ts`.
   - Add `"test": "vitest run"` to `frontend/package.json`.
2. **Add the query client.** Install `@tanstack/react-query` and create `src/lib/query-client.ts` (3.7).
3. **Mount the provider.** In `App.tsx`, wrap everything in `<QueryClientProvider client={queryClient}>`, outside `SiteContentProvider`.
4. **Move the CMS channel.** Create `src/lib/cms-channel.ts` (3.7) and move `broadcastCmsInvalidation` into it. In `usePageData.ts`:
   - Remove the per-hook BroadcastChannel and the module-level Map caches.
   - `clearPageDataCache(slug?)` calls `queryClient.removeQueries({ queryKey: ['page', slug] })`, or removes all `page` queries when no slug is given.
   - Re-export `broadcastCmsInvalidation` so existing imports keep working.
   - `usePageData(slug)` uses `useQuery({ queryKey: ['page', slug], queryFn, enabled: !!slug })` and returns `{ data: data ?? EMPTY, loading: isPending && !!slug }`. `EMPTY` is a module-level frozen `{}` so its reference never changes. On error it returns `EMPTY` with `loading: false`.
5. **Add the fetchers.** Create `src/api/cms.ts`:
   - `fetchPageLegacy(slug)` returns `{ record, pageData }`. The `['page']` query selects `pageData`, and a sibling `['pageRecord', slug]` query uses the same fetcher.
   - `fetchHub(slug)` calls `?v=2`.
   - `fetchHubItem(hub, item)`.
   - `fetchResolve(path)`. A 404 resolves to the `not_found` object; it does not throw.
6. **Add the hooks.** Create `src/hooks/useHub.ts`, `src/hooks/useHubItem.ts` and `src/hooks/useResolvePath.ts`.
   - `useResolvePath` seeds `['pageRecord', slug]` and `['page', slug]` with `queryClient.setQueryData` when `result.page` is present.
7. **Rewrite `SiteContentContext`.**
   - Use `useQuery(['siteContent'])` with the existing parsing logic moved into the `queryFn`.
   - `refresh` is a `useCallback` that invalidates the query.
   - The provider value is `useMemo`'d.
   - `loading` is `isPending`, so it does not flicker during refetches.
   - The invalidation listeners go through `cms-channel.ts`.
8. **Remove the duplicate wishlist fetch.** First read `WishlistContext.tsx` and `topbar.tsx` to see how login triggers a wishlist refresh. Remove only the mount-time `refreshWishlist()` effect in `topbar.tsx`. Keep any refresh that runs on login or other events. If `topbar.tsx`'s effect is the *only* thing that refreshes after login, move that trigger into `WishlistContext`, listening to the existing auth event or storage key.

**Tests** (`frontend/src/**/*.test.tsx`)
- `usePageData.test.tsx`:
  - Two components using the same slug cause exactly one network request (count it in msw).
  - Unmounting and remounting within `staleTime` causes no new request.
  - `broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug })` triggers a refetch.
  - On error the hook returns `{}` with `loading: false`.
  - The return value's reference is stable across re-renders when the data hasn't changed.
- `SiteContentContext.test.tsx`: one `/content` request for 3 consumers. The context value's reference is stable across a parent re-render. `refresh()` triggers a refetch.
- `useResolvePath.test.tsx`: seeding the cache means a following `usePageData(slug)` makes no request.
- `cms-channel.test.ts`: there is only one `BroadcastChannel` instance, no matter how many hooks are mounted (mock the `BroadcastChannel` constructor and count calls).

**Acceptance**
- [ ] Frontend tests pass, with at least 12 tests. The root `npm test` runs both the backend and frontend suites.
- [ ] Playwright smoke and visual suites pass.
- [ ] Request counts are re-measured with the T0 script and logged. A logged-in cold load of `/` makes at least one fewer `/api` request than the baseline (the duplicate `/wishlist` call is gone). Revisiting `/labs` within 60 s makes no `/api/pages/labs` request.

---

#### T10. Detail pages and dynamic routing use the item and resolve endpoints (5 h)
**Goal:** a detail page fetches only its own item, and unknown slugs resolve in one request.

**Steps**
1. **Extract the article view logic first, as a pure refactor.**
   - Move the logic in `UniversalArticleDetail.tsx` that turns a card plus hub data into `GenericPageData` (current lines ~177–246: `category`, `bodyContent`, `deliverables` HTML, `cta*` fallbacks, `adminEditUrl`) into `src/components/cms/article-view-model.ts`, as `buildArticleViewModel(card, hub, { hubSlug, hubTitle, defaultCtaHref, defaultCtaLabel, normalizedSlug })`.
   - Do the same for the card resolution in `ServiceDetailPage.tsx`, as `buildServiceViewModel(...)` if it has comparable logic.
   - Commit the extraction with snapshot tests before changing any data source.
2. **`ServiceDetailPage`.** Switch it to `useHubItem(categorySlug, itemSlug)`.
   - If the result is `redirectTo`, render `<Navigate to={redirectTo} replace />`.
   - Build the legacy `card` from `item` with a frontend `itemToCard(item)`. This applies the same output rules as 3.3 `buildItem`; mirror that function and unit-test it against fixtures generated by the backend tests. Then feed the card into the existing rendering, so no JSX changes.
   - The hub CTA defaults come from `hub.cta`.
3. **`UniversalArticleDetail`.** Switch it to `useResolvePath('/' + hubSlug + '/' + itemSlug)`:
   - `type: 'page'`: render `GenericPageRenderer` with `result.page`, exactly as the standalone branch does today.
   - `type: 'item'` with an `itemSlug`: use `useHubItem(hubSlug, result.itemSlug)`, then `buildArticleViewModel(itemToCard(item), hubCtaAsHubData, ...)`.
   - `redirect`: `<Navigate replace>`.
   - Not found, or `itemSlug: null`: keep the existing "Article not found" UI.
   - Remove the two sequential `api.get` probes and the whole-hub `usePageData(hubSlug)` call.
4. **`DynamicPageRoute` in `App.tsx`.** Replace the four-step probe with `useResolvePath('/' + slug)`.
   - Render the template using the **resolved** `result.slug`, which fixes the prefixed-slug bug. The `SolutionPageRenderer` and `ServicePageRenderer` props get `result.slug`.
   - Handle `redirect` with `<Navigate replace>`.
   - Keep the existing template alias table exactly as it is.
   - `GenericPageRenderer` gets `result.page` and its parsed `pageData`.
5. **`DynamicChildPageRoute`.** Use `useResolvePath('/' + hub + '/' + item)`:
   - `type: 'page'`: `GenericPageRenderer`.
   - `type: 'item'`: choose `ServiceDetailPage` if `hubTemplate` is in the existing set, otherwise `UniversalArticleDetail`. Both reuse the cached resolve result, so there is no extra request.
   - `not_found`: `NotFound`.
   - Keep `RESERVED_PREFIXES` as it is.
6. **Leave the other `*-detail.tsx` wrappers alone.** Wrappers such as `labs-detail` and `ai-ml-detail` that just render `ServiceDetailPage` need no change. Search the other `src/pages/*-detail.tsx` files for `usePageData(`. Any that load a whole hub to find one card are switched the same way as step 2. List each of them in the log.

**Tests**
- `article-view-model.test.ts`: for 10 or more card fixtures (with and without `useCustomDetail`, methodology, deliverables, CTA overrides, before/after images, and `category` versus `categories`), the output deep-equals a snapshot taken **before** the switch in step 1.
- `itemToCard.test.ts`: for every backend fixture item, `itemToCard(itemJson)` deep-equals the backend's `buildItem` output. Generate the JSON fixtures in a backend test and commit them to `frontend/src/test/fixtures/items/`.
- `ServiceDetailPage.test.tsx` (msw):
  - renders the title and body from the item endpoint
  - a `redirectTo` navigates to the new URL
  - a 404 shows the not-found UI
  - **exactly one** `/api/pages/*` request is made
- `UniversalArticleDetail.test.tsx`: standalone page, hub item, redirect and not-found cases. Each case makes 2 or fewer `/api/pages*` requests.
- `DynamicPageRoute.test.tsx`: a `guide-` page visited without its prefix is resolved with 1 request, and the renderer gets the prefixed slug. An alias case. A 404 case.

**Acceptance**
- [ ] All tests pass. The Playwright smoke and visual suites pass.
- [ ] Request counts are re-measured and logged. A cold `/labs/<item>` load makes exactly one `/api/pages*` request (the item endpoint), plus `/content`. A prefixed dynamic page makes exactly one `/api/pages*` request (resolve).
- [ ] Manual check: rename a card slug in admin (through the T6 API with Postman, since the UI comes in T12), then visit the old URL. It redirects to the new URL.

---

#### T11. Hub pages use the v2 summary shape (8 h)
**Goal:** hub responses no longer include detail content.

**Steps**
1. **Add the adapter hook.** Create `src/hooks/useHubLegacy.ts`. It returns `{ data, loading }`, where `data` is a legacy-shaped object built from `useHub(slug)`:
   - `{ ...settings }`
   - each collection mapped with `itemToCard` (summaries only, no detail)
   - `featured` as a single object
   - `categories` as a list of names

   This lets most pages switch with a one-line change.
2. **Classify each hub page.** For each page in the list below, search the component (and the components it renders) for any `DETAIL_KEYS` name used on a card object, for example `card.body`, `item.methodology` or `deliverables`.
   - **No detail keys used:** replace `usePageData(SLUG)` with `useHubLegacy(SLUG)`.
   - **Detail keys used:** keep `usePageData`, add the slug to the backend `HUB_NEEDS_DETAIL` list, and log the file and line.
3. **Order.** Do `SolutionPageRenderer.tsx` first (it covers labs, libraries, sports-infra, tech-infra and the generic solution hubs). Then do these, in order: `ai-ml`, `ai-stations`, `campus-master-planning`, `campus-design`, `campus-design-execution`, `sports-design-execution`, `campus-furniture-design`, `ar-vr-experiences`, `collaboration`, `collaboration-spaces`, `new-environments`, `campus-automation`, `digital-transformation`, `innovation`, `smart-classrooms`, `science-tech-labs`, `assessment-system`, `lms`, `catalogues`, `faq`, `job-openings`, `colleges-universities-for-sale`, `partner-with-colleges`, `ServicePageRenderer.tsx`, and the guide hubs (`ai-guide`, `setup-college`, `ugc-guidelines`, `resources`) if they read collections.
   - Skip any page whose slug was classified as `document` in the T4 report.
   - Keep a checklist table in the log: `page | switched/kept | reason`.
4. **Backend.** `HUB_NEEDS_DETAIL` is a constant in `page-content/constants.ts`. `getHubV2` stays detail-free no matter what. Pages in `HUB_NEEDS_DETAIL` keep using the legacy endpoint.

**Tests**
- One render test per template family, using msw v2 fixtures:
  - generic solution hub (`SolutionPageRenderer`): cards, category filter pills and filtering by category
  - step hub (`campus-master-planning`): card links use `card.href || /hub/slug`
  - FAQ: questions render and the accordion toggles
  - job openings: the list renders
  - colleges for sale: the listing fields render
  - catalogues: cards and case studies render
- `useHubLegacy.test.tsx`: converting a v2 fixture gives a legacy object deep-equal to the backend `buildLegacyPageData(..., { includeDetail: false })` for the same fixture. Commit the backend-generated fixture.
- Backend `hub-v2.test.ts` (already exists) still passes, so there is no `detail`.

**Acceptance**
- [ ] The checklist table is complete for every page listed.
- [ ] Playwright smoke and visual suites pass.
- [ ] Payload sizes are logged: the `GET /api/pages/labs` legacy response size versus `GET /api/pages/labs?v=2`, and the same for `campus-design-execution` and `campus-master-planning`. The v2 response must be smaller, or equal when the hub has no detail content.

---

### Phase E – Admin UI and revisions

---

#### T12. Admin per-item editing UI and strict structured writes (12 h)
**Goal:** admins edit items one at a time, and conflicts are visible.

**Steps**
1. **Read before changing.** Read `UnifiedPageEditor.tsx` and find where each collection is edited: card lists, `section2Cards`, `moreCards`, `featured`, FAQs (`FaqEditorSection`), openings (`onSyncOpenings`) and case studies (`onSyncCaseStudies`). Write down the component names and line ranges in the log before you change anything.
2. **Add the admin API client.** Create `frontend/src/admin/api/pageItems.ts` with typed functions for every admin endpoint in 3.5. These return the `card` representation.
3. **Build the components** in `frontend/src/admin/components/items/`:
   - **`ItemsManager.tsx`**
     - Props: `{ page, collection, label, renderCardFields }`.
     - Lists the items (title, slug, published toggle, thumbnail).
     - Has **Move up** and **Move down** buttons that call reorder. Do not add a drag-and-drop dependency.
     - Has a **New item** button.
     - Has **Edit**, which opens the drawer.
     - Has **Delete**, with confirmation.
     - Uses TanStack Query keys `['admin','items',pageId,collection]`.
   - **`ItemEditorDrawer.tsx`**
     - Holds a local copy of `item.card`.
     - Renders `renderCardFields(card, setCard)`, which **reuses the existing card field editor JSX** pulled out of `UnifiedPageEditor` into a component (for example `CardFieldsEditor.tsx`). Moving the existing JSX is allowed. Rewriting the fields is not.
     - Has its own **Save** button, which sends `PATCH { version, card }`.
     - Shows a dirty-state warning when closed with unsaved changes.
   - **`ConflictDialog.tsx`**: shown on 409. It offers **Reload latest** (discards local changes and loads `current`) and **Overwrite with mine** (re-sends with `current.version`, after a second confirmation). It also shows a field-level list of differences between local and `current.card` (top-level keys only).
   - **`CategoryManager.tsx`**: CRUD and up/down reorder for page categories. Show it on structured pages that use categories.
4. **Wire the editor.** In `UnifiedPageEditor`, when `page.contentModel === 'structured'`:
   - Replace each collection editor section with `<ItemsManager collection=...>`.
   - "Save All Changes" strips every `COLLECTIONS` key and the top-level `categories` from `payloadData` before `PUT`, and sends `version`. On a 409 it shows a page-level conflict dialog (reload settings or overwrite).
   - Switch `onSyncOpenings` and `onSyncCaseStudies` to the items API (collections `openings` and `caseStudies`).
   - Keep the existing UI for document pages.
5. **Migrate the other screens.**
   - `Categories.tsx`: find what line 539 writes. If it writes page `categories`, move it to the category API.
   - `CollegesManager.tsx`: move to the items API with collection `cards` on page `colleges-universities-for-sale`.
6. **Deep link.** `/admin/pages?edit=<hub>&card=<slug>` opens the editor and then the drawer for that item, looked up by slug in the items list. Find where `edit` is parsed today in `PagesManager` or `UnifiedPageEditor`.
7. **Turn on strict mode (backend).** Once every writer has moved, add `CMS_STRICT_STRUCTURED_WRITES` (default `true`). With it on, `PUT /api/pages/:id` and `POST` reject collection keys in `pageData` for structured pages with 400 `{ error: 'collections_not_allowed', keys: [...] }`. The legacy write adapter stays in the code, reachable only when the flag is `false` (a rollback switch).
8. **Drop detail from the legacy endpoint.** Set `DETAIL_DROPPED` to every structured page not in `HUB_NEEDS_DETAIL`. The public legacy endpoint then stops sending detail for those pages. Admin requests (with a token) still get detail.

**Tests**
- `ItemsManager.test.tsx` (msw): list renders; New item → POST → appears; Move down → reorder payload correct; Delete → confirm → DELETE.
- `ItemEditorDrawer.test.tsx`: Save sends `version` + edited card; success updates list title; 409 → ConflictDialog shows; "Reload latest" replaces form values with `current.card`; "Overwrite" re-sends with new version.
- `UnifiedPageEditor.save.test.tsx`: for a structured page fixture, the PUT body contains no `cards`/`faqs`/`openings`/`caseStudies`/`categories` keys and includes `version`.
- `CollegesManager.test.tsx`: create/edit a listing hits items API (not `PUT /pages`).
- Backend `strict-mode.test.ts`: flag on → PUT with `cards` on structured page → 400; flag off → adapter path works; document pages unaffected.
- Playwright `tests/e2e/admin-items.spec.ts` (log in as an admin from the test seed, against dev servers):
  1. Create a card on `labs`, then check it appears on `/labs`.
  2. Edit its title, then check `/labs/<slug>` shows the new title.
  3. Move it up, then check the order changed on `/labs`.
  4. Open the same card in two browser contexts, save in A, then save in B. B shows the conflict dialog.
  5. Delete the card.

  Clean up afterwards so dev data is left unchanged. Use a card titled `E2E Test Card <timestamp>` and always delete it in `afterAll`.

**Acceptance**
- [ ] All unit and component tests and the admin end-to-end spec pass.
- [ ] Searching `frontend/src/admin` for `pageData: JSON.stringify(` finds matches only in document-page code paths. List the remaining ones in the log with a reason for each.
- [ ] Playwright smoke and visual suites pass.

---

#### T13. Revisions and restore (4 h)
**Goal:** content mistakes can be undone.

**Steps**
1. **Write snapshots.** `afterContentWrite` writes a `PageRevision` whenever there is a `pageId`.
   - Snapshot shape: `{ page: { title, slug, template, published, contentModel }, settings, items: [ItemFull + categories names], categories: [...] }`.
   - Write it **after** the change, in the same transaction where possible. Pass `tx` through.
   - Use the `reason` values from 3.1.
   - Prune the oldest revisions beyond `REVISIONS_KEPT_PER_PAGE`, but **never prune `pre-migration` revisions**.
2. **Add the restore endpoints** (3.5). Restore runs in one transaction:
   - It checks the page `version`, returning 409 on a mismatch.
   - It deletes the page's items, categories and links, then recreates them from the snapshot **with their original IDs**. Use `createMany` with an explicit `id`. Postgres allows this; check afterwards that the sequence is not behind with `SELECT setval(pg_get_serial_sequence('pageitem','id'), GREATEST((SELECT MAX(id) FROM pageitem), 1))`.
   - It sets the settings.
   - It sets every restored item's `version` to (the highest version on the page before the restore) + 1, so open editors get a 409.
   - It bumps `page.version` and writes a `restore` revision.
3. **Add the History panel.** In `UnifiedPageEditor`, add a "History" panel that lists revisions (date, reason, author) with a **Restore** button and a confirmation step.

**Tests**
- A revision is written for each write type, with the correct `reason`.
- Pruning keeps 30 revisions plus all `pre-migration` ones.
- Restore brings back a deleted item with the same ID and slug. The public `/hub/<slug>` works again.
- After a restore, a PATCH with the pre-restore item version returns 409.
- Restore with a stale page version returns 409.
- The sequence is healthy: an item created after the restore gets a new ID with no collision.
- Component test: the History panel lists revisions, and Restore calls the endpoint and refreshes.

**Acceptance**
- [ ] All tests pass.
- [ ] Manual check: delete a card in admin, restore it from History, and the card reappears on the public page. Record this in the log.

---

### Phase F – Frontend performance, images, SEO

---

#### T14. Bundle and rendering performance (6 h)
**Goal:** a smaller entry chunk, the header and hero visible at first paint, and one build config.

**Steps**
1. **One Vite config.**
   - Delete `frontend/vite.config.js`. This plan names it, so deleting it is allowed.
   - `frontend/vite.config.ts` becomes the only config. It keeps the dev proxy, and loads `kimi-plugin-inspect-react` only when `mode === 'development'`.
   - `frontend/build.js` calls `build({ configFile: path.resolve(__dirname, 'vite.config.ts'), mode: 'production', publicDir: false })` and keeps its post-build copy and mirror steps.
   - Confirm the resolved config with `npx vite build --debug` or by logging the `config` in a plugin.
2. **Chunk splitting.** In `vite.config.ts`, under `build.rollupOptions.output.manualChunks`, add these chunks:
   - `react`: `react`, `react-dom`, `scheduler`
   - `router`: `react-router`, `react-router-dom`
   - `query`: `@tanstack/*`
   - `gsap`: `gsap`, `@gsap/*`
   - `radix`: `@radix-ui/*`
   - `icons`: `lucide-react`

   Use a function that checks `id.includes('node_modules/<pkg>/')`. Set `build.target: 'es2020'`.
3. **Take GSAP out of the entry path.**
   - In `topbar.tsx`, `header.tsx`, `footer.tsx` and `sections/category-bar.tsx`, replace the static `import gsap from 'gsap'` with a dynamic `import('gsap')` inside the effect that runs the animation.
   - Above-the-fold elements (topbar, header, hero) must **render visible**. Animate only `transform` or `opacity` *from* a visible state, with delays of 0.1 s or less, or skip the animation when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
   - Do not change how anything looks once its animation has finished.
4. **Keep the page frame mounted during route loads.**
   - Move `<Suspense>` inside `Layout`, wrapping only `<main>{children}</main>`. The fallback is the existing `PageCardGridSkeleton` (or `PageLoader` sized to `min-h-[60vh]`).
   - Keep the outer `Suspense` as a fallback for the routes that don't use `Layout` (admin, home).
5. **Home inside `Layout`.** Add the props `showCategoryBar` and `showBreadcrumb` (both default `true`) to `Layout`. Then:
   - Check which chrome `home.tsx` renders today: TopBar, Header, Footer, and whether it also renders CategoryBar or BreadcrumbBar.
   - Route `/` as `<Layout showCategoryBar={…} showBreadcrumb={…}><Home/></Layout>`, matching what home renders today.
   - Remove the duplicate chrome from `home.tsx`.
   - **Only keep this change if the `/` visual test passes.** Otherwise revert this step and log why.
6. **Fonts.**
   - List the font families actually used, by searching `tailwind.config.js`, `src/index.css` and `src/**/*.tsx` for each family name and for `font-` classes mapped to those families.
   - Remove unused families from the Google Fonts URL in `index.html`. Keep only the weights that are used. The goal is 12 or fewer family+weight pairs.
   - Keep `display=swap` and the `preconnect` tags.
   - Change the favicon link from `favicon.png` (643 KB) to `favicon.ico` plus `favicon-32x32.png`, and keep `apple-touch-icon.png`.
7. **`ErrorBoundary.tsx`.**
   - Move any `window.location.reload()` out of `render()` into `componentDidCatch`, with the existing 3 s debounce kept in `sessionStorage`. Stop reloading after 1 attempt per 30 s.
   - The fallback UI shows a generic message and a "Reload" button.
   - Only show `error.message` when `import.meta.env.DEV` is true.
8. **Bundle tooling.**
   - Add `frontend/scripts/analyze.mjs`, which runs the build with `rollup-plugin-visualizer` and writes `dist/stats.html`. Add it as `npm run analyze`.
   - Add `frontend/scripts/check-bundle-budget.mjs`. It reads `dist/index.html`, finds the entry script and every `modulepreload` chunk it loads, sums their **gzip** sizes (`zlib.gzipSync`), and exits with code 1 if the total is over budget.
   - Add the budget check to the end of `npm run build`.

**Budgets (gzip, sum of the entry chunk plus its modulepreloads):** 170 KB or less. If it can't be reached, record the actual size and the top 5 modules from `stats.html` in the log, then set the budget to the actual size rounded up to the next 10 KB. **The total must still be at least 25% smaller than the T0 baseline**, measured the same way (re-measure T0's `dist` from the baseline commit with this script).

**Tests**
- `ErrorBoundary.test.tsx`:
  - a chunk-load error triggers at most one reload
  - `render()` never calls `reload` (spy on it)
  - production mode does not show the error message
- `Layout.test.tsx`: while a lazy child is suspended, the header and footer are in the document.
- The budget script runs as part of the build.

**Acceptance**
- [ ] The build passes with the budget check. The before and after sizes (raw and gzip) are logged.
- [ ] Only `frontend/vite.config.ts` exists. `kimi-plugin-inspect-react` does not appear in the production `dist` (search the built JS for `inspect`).
- [ ] The Playwright visual suite passes. If animations cause pixel differences that are intended, refresh the baselines **only** after a person or the user has looked at the before/after screenshots. Record that in the log.
- [ ] Lighthouse (from T0 step 11) is re-run and logged.

---

#### T15. Image pipeline and media URLs (5 h)
**Goal:** images are correctly sized and in modern formats. Media URLs are set by configuration, not hard-coded.

**Steps**
1. **Audit (read-only, against dev).** Write `backend/scripts/audit-media-urls.ts`. It scans `page.pageData`, `pageitem.data`, `pageitem.detail`, `pageitem.imageUrl`, `sitecontent.value`, `product.imageUrl`, `product.images`, `blogpost.imageUrl`, `casestudy.imageUrl` and `catalogue.fileUrl/thumbnailUrl`. For every URL it reports the hostname, or `relative` when the URL contains `/uploads/`.
   - For relative `/uploads/...` URLs, it checks whether the file exists under `UPLOADS_DIR`. Report the counts and the missing files.
   - **If any `/uploads/` files are missing locally, stop and ask the user** where the originals are. They may exist only on `sportsurf.in`. Offer to write a download script that copies them into `UPLOADS_DIR`.
2. **`resolveMediaUrl`.**
   - Remove the hard-coded `https://sportsurf.in/new` rewrite.
   - Values containing `/uploads/` resolve to `${VITE_MEDIA_BASE_URL}${subPath}` when `VITE_MEDIA_BASE_URL` is set, and otherwise to the API origin (the existing logic).
   - Add `VITE_MEDIA_BASE_URL` to `frontend/.env.example` and `.env.production` (`https://api.campusmart.in`).
   - Set the dev value according to the outcome of the audit.
3. **Static images.** Write `frontend/scripts/optimize-images.mjs`, which uses `sharp`:
   - For every `public/images/*.{png,jpg,jpeg}`, it writes `<name>.webp` (quality 78) and, when the source is wider than 960 px, `<name>-960.webp`.
   - The originals stay as a fallback.
   - It runs on demand (`npm run images:optimize`), and the output is committed.
   - Update the components that reference these images to use `<picture>`, or `MediaImage` with the `.webp` file and the original as `fallbackSrc`. Find them by searching `src` for `/images/`.
4. **Upload variants.** In `media.routes.ts`, after multer saves an image (jpeg, png or webp):
   - Generate `<base>-480.webp`, `<base>-960.webp` and `<base>-1600.webp`. Only generate widths smaller than the original.
   - Return `{ url, variants: { 480, 960, 1600 } }`. These fields are additive, so existing clients keep working.
   - Load `sharp` with `await import('sharp')` inside a `try`. If it fails to load (possible on cPanel), log a warning once and skip the variants. **An upload must never fail because sharp is missing.**
5. **`MediaImage`.** Add an optional `widths?: number[]` prop. When the `src` is a local `/uploads/` image and `widths` is set, build `srcSet` from the `-<w>.webp` naming, plus a `sizes` prop that defaults to `100vw`. Also add an `onError` fallback to the original. Callers can pass `width` and `height`. Add `width`, `height` and `widths` to the hero and card images in `SolutionPageRenderer` and the home sections.
6. **Home hero.** In `components/sections/hero-banner.tsx`:
   - Render the hero image as an absolutely positioned `<img fetchpriority="high" loading="eager" decoding="async">` with `object-cover`, behind the existing content, instead of a CSS `backgroundImage`.
   - Keep the existing `new Image()` preflight only if it is needed for the fallback. Otherwise remove it.
   - The rendered result must look the same (the visual test checks this).

**Tests**
- `media-url.test.ts`: with and without `VITE_MEDIA_BASE_URL`, absolute `https:` URLs, `data:`, and relative paths. No output ever contains `sportsurf.in` unless the input does.
- Backend `media/variants.test.ts`: uploading a 2000 px PNG fixture creates three WebP variants with the right widths (check with `sharp` metadata). When sharp is mocked to throw on import, the upload still returns 201 with no variants.
- `MediaImage.test.tsx`: the `srcSet` string is correct, and widths are omitted for non-upload URLs.

**Acceptance**
- [ ] The audit report is logged, and the user has been asked about any missing files.
- [ ] Searching `frontend/src` for `sportsurf.in` finds no matches.
- [ ] Total transferred image bytes on a cold load of `/` (Playwright, summing `image` response sizes) are logged before and after. They must be at least 40% lower, or the log must explain why: for example, when most images are remote Unsplash URLs, which are already optimized.
- [ ] The visual suite passes.

---

#### T16. SEO: metadata, sitemap, robots (5 h)
**Goal:** every public page has a correct title, description and canonical URL, and crawlers can find every page.

**Steps**
1. **Settings and item fields.**
   - Add the optional settings keys `seoTitle`, `seoDescription` and `ogImage` to `SettingsSchema`.
   - Items take an optional `data.seo: { title?, description?, ogImage?, noindex? }`.
   - In the admin, add a collapsible **SEO** section to `UnifiedPageEditor` (settings) and `ItemEditorDrawer`. Each field shows a character counter: 60 for the title and 160 for the description.
2. **`<Seo>` component.** Create `frontend/src/components/seo/Seo.tsx` with the props `{ title, description, image, path, noindex }`. It uses React 19 document metadata: render `<title>`, `<meta name="description">`, `<link rel="canonical" href={VITE_SITE_URL + path}>`, the `og:*` tags and `twitter:card` directly in the component tree, and React hoists them into `<head>`. Every value has a fallback:
   - title: `seoTitle`, then `heroTitle`, then `page.title`, then the site name. The output format is `"<title> | CampusMart"`, unless the title already contains "CampusMart".
   - description: `seoDescription`, then `heroSubtitle`, then the item summary, cut to 160 characters at a word boundary.
3. **Where to use it.**
   - Add `<Seo>` to `SolutionPageRenderer`, `ServicePageRenderer`, `GenericPageRenderer`, `ServiceDetailPage`, `UniversalArticleDetail` and every bespoke hub switched in T11. A small `usePageSeo(settings, fallbackTitle)` helper keeps this to one line per page.
   - Static pages (login, register, my-account, not-found) get a fixed title and `noindex`.
   - `index.html` keeps its default `<title>` as a fallback.
4. **Sitemap.**
   - Add `GET /sitemap.xml` in `backend/src/routes/seo.routes.ts`, mounted at the root rather than under `/api`, and cached as in 3.6.
   - It contains `SITE_URL/`, then `SITE_URL/<slug>` for each published page (excluding `home`, slugs starting with `test-` or `draft-`, and `noindex` pages), then `SITE_URL/<hub>/<item.slug>` for each published item in a `CARD_COLLECTIONS` collection of a structured page. Include `<lastmod>` from `updatedAt`.
   - Escape XML entities. Use `Content-Type: application/xml`.
5. **Optional sitemap file (cPanel).** If `SITEMAP_WRITE_PATH` is set (for example `/home/<user>/public_html/sitemap.xml`), `afterContentWrite` regenerates the sitemap, debounced by 10 s, and writes it to that path atomically (write a temp file, then rename). Failures are logged and never thrown. This lets the sitemap live on the main domain.
6. **`robots.txt`.** Add `frontend/public/robots.txt`:
   ```
   User-agent: *
   Disallow: /admin
   Disallow: /my-account
   Disallow: /login
   Disallow: /register
   Disallow: /registration
   Sitemap: https://campusmart.in/sitemap.xml
   ```
   The runbook (T17) explains that the `Sitemap:` line assumes `SITEMAP_WRITE_PATH` is configured. Otherwise, point it at `https://api.campusmart.in/sitemap.xml`.

**Tests**
- Backend `seo/sitemap.test.ts`:
  - published pages and items are included
  - unpublished items, unpublished pages, `noindex` pages and `test-` slugs are excluded
  - the XML is valid (parse it with a small XML check, or a regex for the structure)
  - entities are escaped
  - the `SITEMAP_WRITE_PATH` write happens to a temp directory
- Frontend `Seo.test.tsx`: the title fallback chain, the 160-character cut at a word boundary, the canonical URL, and that `noindex` renders `<meta name="robots" content="noindex">`.
- Playwright `tests/e2e/seo.spec.ts`: for 5 golden routes (a hub, a detail page, an article, the FAQ, and `/`), `document.title` is not the `index.html` default (except for `/` if it has no settings) and a canonical link exists.

**Acceptance**
- [ ] All tests pass.
- [ ] `curl http://localhost:3001/sitemap.xml` returns XML with at least as many `<url>` entries as golden routes of kind `page` plus `detail` (allowing for excluded ones; explain any difference in the log).
- [ ] Manual check: change `seoTitle` for `labs` in admin, and the browser tab title changes on `/labs`.

---

### Phase G – Operations, cPanel deployment, final verification

---

#### T17. Ops hardening and the cPanel deployment kit (7 h)
**Goal:** the app can be deployed to cPanel shared hosting and runs safely there.

**Steps**
1. **Logging.**
   - Add `backend/src/lib/logger.ts`, a `pino` logger: level from `LOG_LEVEL` (default `info`), JSON output, and secrets redacted (`req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.passwordHash`, `*.token`).
   - In `app.ts`, add `pino-http` with `genReqId` set to `req.headers['x-request-id'] || crypto.randomUUID()`. Echo the ID back as the `X-Request-Id` response header.
   - Replace `console.*` in `app.ts`, `server.ts`, `middleware/error.middleware.ts`, `services/page-content/*`, `services/cms-cache.ts` and `routes/pages.routes.ts` with the logger. Other files may keep `console`; that is out of scope.
2. **Error middleware.** It logs with the request ID and returns `{ error: 'internal_error', requestId }` for 500 errors. It never includes stacks or messages in production.
3. **Graceful shutdown (`server.ts`).** On `SIGTERM` or `SIGINT`:
   - stop accepting connections (`server.close`)
   - stop the solutions-index nightly timer (add a `stop()` method if there isn't one)
   - `await prisma.$disconnect()`
   - exit with code 0

   Force-exit after 10 s. Make the handler idempotent, so a second signal does nothing.
4. **Health checks.**
   - `/health` stays as the liveness check (no database).
   - Add `/ready`: runs `SELECT 1` through Prisma with a 2 s timeout, and checks that `cmsstate` exists. It returns `200 { status: 'ready', db: 'ok', cmsVersion }`, or `503 { status: 'not_ready', db: 'error' }`.
5. **Environment.**
   - Update `validateEnv()`:
     - required: `DATABASE_URL`, `JWT_SECRET`
     - required in production: `SITE_URL`, `FRONTEND_URL`
     - optional: `DATABASE_URL_UNPOOLED`, which falls back to `DATABASE_URL` when unset; Prisma `directUrl` needs it, so set `process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL` **before** Prisma loads
     - optional: `UPLOADS_DIR`, `RESUMES_DIR`, `LOG_LEVEL`, `SITEMAP_WRITE_PATH`, `CMS_STRICT_STRUCTURED_WRITES`
   - In production, reject a `JWT_SECRET` shorter than 32 characters.
   - Rewrite `backend/.env.example` with sections and comments for cPanel. Remove the "Required on Railway" heading.
6. **Prisma on cPanel.**
   - In `schema.prisma`, set `binaryTargets = ["native", "debian-openssl-3.0.x", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x"]`.
   - The runbook says to check the host with `openssl version` in the cPanel Terminal, and to remove targets that aren't needed.
7. **Frontend `.htaccess` (production).** Rewrite `frontend/public/.htaccess` with:
   - the existing SPA fallback, kept as is
   - `mod_deflate` for `text/html`, `text/css`, `application/javascript`, `application/json`, `image/svg+xml` and `application/xml`
   - cache headers: `/assets/*` gets `Cache-Control: public, max-age=31536000, immutable`, and `index.html` gets `no-cache`
   - security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - a CSP:
     ```
     default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:;
     connect-src 'self' https://api.campusmart.in; frame-src https://www.youtube.com https://www.google.com;
     object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
     ```
     First search `src` and `index.html` for inline `<script>`, `eval`, `new Function`, iframes (YouTube or Maps) and third-party script hosts. Adjust `frame-src` and `script-src` to what is actually used, **without** adding `'unsafe-eval'` or `localhost`.
   - Wrap every directive in `<IfModule>`.
8. **Get `.htaccess` into the build.** `frontend/build.js` skips dotfiles on purpose. Add an explicit step that copies `public/.htaccess` to `dist/.htaccess` inside a `try/catch`. On `EPERM`, log a warning telling the deployer to upload `.htaccess` by hand. The runbook repeats this.
9. **Backend headers.** The API returns JSON only. Keep helmet's defaults, but set `contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }` for API responses. Static `/uploads` keeps the cross-origin resource policy it has today.
10. **Rate limiting.**
    - Add a comment in `rate-limit.middleware.ts` and a runbook note: the limiter is in-memory and per process, so with Passenger running N processes, the real limit is up to N times the setting.
    - Recommend setting `PassengerMaxPoolSize` in the app's `.htaccess` where cPanel allows it, or accepting the looser limit.
    - Do not add Redis.
11. **Persistent storage.** The runbook requires `UPLOADS_DIR` and `RESUMES_DIR` to be **outside** the app directory, so redeploys don't wipe them (for example `/home/<user>/campusmart-data/uploads`). `RESUMES_DIR` must not be under `public_html`.
12. **Ask before deleting the leftover deploy files.** Show the user this list and ask before deleting anything:
    - `vercel.json` (root), `frontend/vercel.json`, `backend/vercel.json`
    - `railway.json` (root), `backend/railway.json`
    - `deploy-backend-clean.zip`, `deploy-frontend-clean.zip`
    - the root `dist/` mirror step in `build.js`

    Also remove the `process.env.VERCEL` checks left in the code. T1 already removed the one in `index.ts`; search for any others.
13. **Deployment scripts.**
    - `scripts/package-release.mjs` (root) builds the backend and frontend and writes:
      - `release/frontend-<version>.zip`: the contents of `frontend/dist`, including `.htaccess`
      - `release/backend-<version>.zip`: `backend/dist`, `backend/prisma` (schema plus migrations), `backend/package.json`, `backend/package-lock.json`, and `backend/scripts/migrate-page-items.ts` plus the files it imports, or a compiled version of it (see the next point)
    - Compile the migration script with `tsc` into `dist/scripts/`, so production doesn't need `ts-node`. Add a backend script: `"cms:migrate-items": "node dist/scripts/migrate-page-items.js"`.
    - Add backend scripts: `"db:deploy": "prisma migrate deploy"` and `"cms:bootstrap": "node dist/scripts/bootstrap-pages.js"`.
14. **Runbook.** Write `docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md`. Each step has its exact cPanel screen or Terminal command:
    1. **Prerequisites:** a cPanel account with "Setup Node.js App", PostgreSQL databases and Terminal (or SSH). Check the PostgreSQL version with `psql --version` or `SELECT version();`. **9.6 or later is required for Prisma 6, and 12 or later is recommended.** If it is lower, stop.
    2. **Create the database and user in cPanel**, and note that the connection string is `postgresql://<cpuser>_<dbuser>:<pass>@localhost:5432/<cpuser>_<db>`.
    3. **Move the data from Neon:** `pg_dump --no-owner --no-acl -Fc "<neon url>" -f campusmart.dump` locally, upload it, then `pg_restore --no-owner --no-acl -d "<cpanel url>" campusmart.dump`. Or use `npm run db:export`/`db:restore` if pg tools aren't available. Then run `npm run db:deploy`, which should report that no migrations are pending, since the dump includes `_prisma_migrations`.
    4. **Set up the Node app:** application root `/home/<user>/campusmart-api`, URL `api.campusmart.in`, startup file `dist/server.js`, Node version 20 LTS or later (the highest available), and the environment variables listed in `.env.example`.
    5. **Upload and install:** upload `backend-<version>.zip`, extract it, then use "Run NPM Install" (or `source /home/<user>/nodevenv/campusmart-api/<ver>/bin/activate && cd ~/campusmart-api && npm ci --omit=dev`). Then run `npx prisma generate`, `npm run db:deploy`, `npm run cms:bootstrap`, and `npm run cms:migrate-items -- --dry-run` followed by `-- --apply`. The item migration is needed only if the restored database was not already migrated.
    6. **Restart the app** and check `https://api.campusmart.in/health` and `/ready`.
    7. **Frontend:** upload `frontend-<version>.zip` to `public_html` and extract it. Confirm that `.htaccess` is present (show hidden files in File Manager).
    8. **SSL:** run AutoSSL for both domains. Set `FRONTEND_URL` and `ALLOWED_ORIGINS` for CORS.
    9. **Post-deploy checks:** reference `docs/deployment/POST_DEPLOYMENT_LIVE_CHECKLIST.md`, and add items to it: `/ready`, a hub, a detail page, an admin save, the sitemap, and uploading an image.
    10. **Upgrades:** take a database backup (`pg_dump`), upload the new backend, `npm ci`, `db:deploy`, restart, then upload the new frontend. Keep the previous zips.
    11. **Rollback:** restore the previous zips. If a migration ran, restore the `pg_dump` taken before the upgrade. `CMS_STRICT_STRUCTURED_WRITES=false` re-enables the legacy blob writes.
    12. **Backups:** schedule a daily `pg_dump` with a cPanel cron job (give the command) and keep 14 days.
    13. **Known limits:** the in-memory rate limit is per process; `sharp` may be unavailable, in which case uploads work without variants; there is no CDN.

**Tests**
- `ops/health.test.ts`: `/health` returns 200. `/ready` returns 200 with the database up, and 503 when Prisma `$queryRaw` is mocked to throw.
- `ops/request-id.test.ts`: the response has `X-Request-Id`, and an incoming `x-request-id` is echoed back.
- `ops/error.test.ts`: a route that throws returns `{ error: 'internal_error', requestId }`, and in production mode the body does not contain the error message.
- `ops/shutdown.test.ts`: call the exported `shutdown()` with a mocked `server` and `prisma`. It checks the close order and that a second call does nothing.
- `ops/env.test.ts`: `validateEnv` rejects a short secret in production and fills in `DATABASE_URL_UNPOOLED`.
- `ops/headers.test.ts`: API responses carry the `default-src 'none'` CSP.

**Acceptance**
- [ ] All tests pass.
- [ ] `node scripts/package-release.mjs` produces both zips. Unzipping the frontend zip shows `.htaccess`, `index.html` and `assets/`.
- [ ] **Production-like rehearsal (local):**
  1. Restore the latest dev backup into the **test** database.
  2. Set `NODE_ENV=production` and point the database variables at the test DB.
  3. Run `npm run db:deploy`, `npm run cms:bootstrap` and `npm run cms:migrate-items -- --apply` from the **compiled** backend. The migration should say "already structured" if the backup was taken after T5.
  4. Start `node dist/server.js` in the background.
  5. Serve `frontend/dist` with `npx vite preview` (or any static server), with `VITE_API_URL` set to the local backend.
  6. Run the Playwright smoke suite against it (`BASE_URL` override). It passes.
  7. Stop the processes.
- [ ] The runbook exists and covers all 13 sections.
- [ ] The user's answer about deleting the leftover deploy files is recorded, and the agreed deletions are done.

---

#### T18. Final verification and handover (4 h)
**Goal:** prove the whole system meets the success criteria, and hand it over.

**Steps**
1. Run everything from a clean checkout of the branch: `npm ci` at the root, then `npm test` (backend and frontend), `npm run build`, and all of `npx playwright test` (smoke, visual, SEO, admin items).
2. Re-run the T0 measurement scripts (requests, bundle and Lighthouse) and fill in the comparison table in section 6.
3. Run the invariant checks in section 6.2 against the dev database, and paste the output into the log.
4. Write `docs/plans/HYBRID_CMS_HANDOVER.md`. It must include:
   - what changed, by area
   - the new tables and the endpoints
   - how admins edit now (with screenshots from Playwright)
   - the measurement table
   - the known limits
   - every "Found, not fixed" item from the log
   - the follow-ups the user should consider: SiteContent/homepage restructuring, linking wishlist items to `PageItem`, removing the legacy write adapter after 30 days without problems, SSR or prerendering for SEO
5. Update `README.md` with short sections for "Running tests", "Database & migrations" and "CMS content model", each linking to the docs.
6. Open a summary for the user: the branch, the commits, the measurement table, the decisions the user needs to make, and the link to the handover doc.

**Acceptance:** every item in section 6 is checked off.

---

## 6. Project-level success criteria (the final gate)

### 6.1 Functional and quality gates

| # | Criterion | How it's checked | Pass |
|---|---|---|---|
| G1 | Every backend test passes | `npm run test --prefix backend` | 0 failures, 200 or more tests |
| G2 | Every frontend test passes | `npm run test --prefix frontend` | 0 failures, 40 or more tests |
| G3 | Playwright smoke passes on every golden route | `npx playwright test tests/e2e/smoke.spec.ts` | 0 failures (excluding the T0 `known-failures.json` entries, which must have stayed the same or shrunk) |
| G4 | No visual regressions | `visual.spec.ts` | Passes. Any baseline refresh was approved and logged. |
| G5 | Admin item flow works, including conflict detection | `admin-items.spec.ts` | Passes |
| G6 | Production-like rehearsal (T17) passes | Log entry | Passes |
| G7 | Builds and typecheck are clean | `npm run build` (root), frontend `typecheck` | 0 errors, bundle budget met |
| G8 | Lint has no new errors | `npm run lint --prefix frontend` | Error count is at or below the T0 baseline |
| G9 | Migrations are clean | `npx prisma migrate status` (dev) | Up to date. Only the baseline and the T3 migration are applied. |

### 6.2 Data invariants (SQL run against dev in T18, all must return 0)
```sql
-- I2: JSON shape
SELECT count(*) FROM "page" WHERE "pageData" IS NOT NULL AND jsonb_typeof("pageData") <> 'object';
SELECT count(*) FROM "pageitem" WHERE jsonb_typeof("data") <> 'object' OR jsonb_typeof("detail") <> 'object';
-- I3: uniqueness (should be enforced by constraints; double-check)
SELECT count(*) FROM (SELECT "pageId","slug" FROM "pageitem" GROUP BY 1,2 HAVING count(*)>1) x;
-- Structured pages must not keep collections in settings
SELECT count(*) FROM "page" WHERE "contentModel"='structured'
  AND ("pageData" ?| array['cards','section2Cards','moreCards','featured','faqs','openings','caseStudies','categories']);
-- Every migrated page has a pre-migration revision
SELECT count(*) FROM "page" p WHERE p."contentModel"='structured'
  AND NOT EXISTS (SELECT 1 FROM "pagerevision" r WHERE r."pageId"=p.id AND r.reason='pre-migration');
-- Redirects never point at themselves
SELECT count(*) FROM "slugredirect" WHERE "fromPath" = "toPath";
```

### 6.3 Performance targets (measured the same way as in T0)

| Metric | Target |
|---|---|
| Entry JS (gzip, entry plus its modulepreloads) | 170 KB or less, or at least 25% below the baseline |
| `/api/pages*` requests, cold `/labs/<item>` | exactly 1 |
| `/api/pages*` requests, cold prefixed dynamic page | exactly 1 |
| `/api` requests, logged-in cold `/` | at least 1 fewer than the baseline |
| Repeat `GET /api/pages/labs` with ETag | 304 |
| `GET /api/pages/labs?v=2` size compared with the legacy response | smaller (or equal when the hub has no detail content) |
| Image bytes on `/` | at least 40% fewer, or a justified exception |
| Lighthouse mobile Performance, `/` and `/labs` (local production preview, median of 3) | 85 or higher target; **75 or higher hard minimum**, and no lower than the baseline |
| Lighthouse LCP / CLS / TBT on those pages | at most 2.5 s, 0.1 and 300 ms (target) |
| Lighthouse SEO, `/labs` and one detail page | 90 or higher |

If a target is missed but the hard minimum is met, record the gap and the top 3 Lighthouse opportunities in the handover document. Do not keep tuning beyond the plan.

---

## 7. Rollback by phase

| After task | How to roll back |
|---|---|
| T1 | `git revert` the commit. Restore the dev `_prisma_migrations` rows from the T1 backup if needed. |
| T3 | Restore the dev backup taken in T3 step 10. `git revert` the T3 commit. |
| T5 (data cut-over) | Option A: restore the backup taken before `--apply`. Option B: a script that rebuilds every structured page from its `pre-migration` revision. Write it as `migrate-page-items.ts --rollback` in T5 and test it. The reverse script is required, and the T5 test list includes "rollback restores the original `pageData` exactly". |
| T6–T13 | `git revert` the commit(s). The data stays valid, because tables and settings are only extended. |
| T12 strict mode | Set `CMS_STRICT_STRUCTURED_WRITES=false`. |
| T14–T16 | `git revert`. These tasks make no data changes. |
| Production | The runbook rollback section (zips plus `pg_dump`). |

> **Addition to T5:** implement and test `--rollback [--page=slug]`. For each structured page, it restores `pageData` from the newest `pre-migration` revision, deletes the page's items, categories and links, sets `contentModel='document'`, and bumps the versions. The test checks that after `--apply` and then `--rollback`, every fixture's `pageData` is deep-equal to the original.

---

## 8. Risks and mitigations

| Risk | Mitigation built into the plan |
|---|---|
| Data loss during the `jsonb` conversion | Preflight check, a hand-written `USING` cast, a rehearsal on the test DB, a backup, and count comparisons (T3). |
| Mapper changes content in subtle ways | Pure mapper, property tests (P1–P4), contract snapshots in two modes, visual tests (T2, T4, T5). |
| Old URLs break | Golden route list, existing slugs kept, title/href fallback lookup, `SlugRedirect`, smoke suite on every task. |
| Passenger runs several processes, so caches go stale | Database-backed `CmsState.version` with a 1 s memo, tested with a simulated second process (T8). |
| A `pageData` write stores a JSON string instead of an object | The search check plus the I2 SQL check plus the `jsonb-integrity` test (T3). |
| Cheaper agent drifts from scope | Locked decisions, out-of-scope list, per-task acceptance, and a required log. |
| `sharp` doesn't work on cPanel | Dynamic import, and uploads succeed without variants (T15). |
| cPanel PostgreSQL is too old | Version check is the first runbook step, with a stop condition. |
| Tests wipe the dev database | Three-condition guard in global setup (T1). |
| Two admins overwrite each other's changes | Item and page versions, 409 responses, conflict dialog, and an end-to-end test with two contexts (T6, T12). |

---

## 9. New and changed files (expected map)

```
backend/
  src/app.ts                                   (new; from index.ts)
  src/server.ts                                (new)
  src/index.ts                                 (now imports ./server)
  src/lib/page-data.ts | sanitize.ts | logger.ts
  src/services/bootstrap-pages.ts
  src/services/cms-cache.ts
  src/services/page-content/
      constants.ts  legacy-mapper.ts  structured-writer.ts
      page-content.service.ts  page-response.ts  schemas.ts  after-content-write.ts
  src/routes/admin-page-items.routes.ts
  src/routes/seo.routes.ts
  src/routes/pages.routes.ts                   (modified heavily)
  src/routes/content.routes.ts                 (afterContentWrite, cache)
  src/routes/media.routes.ts                   (variants)
  src/services/solutions-finder/*              (repository, index freshness)
  prisma/schema.prisma                         (3.1)
  prisma/migrations/20261121000000_baseline_postgres/
  prisma/migrations/<ts>_hybrid_cms_tables/
  prisma/migrations_archive/                   (old migrations)
  scripts/migrate-page-items.ts | export-page-fixtures.ts | export-route-inventory.ts
  scripts/check-pagedata-json.ts | audit-media-urls.ts
  tests/**                                     (vitest)
  vitest.config.ts
frontend/
  vite.config.ts (single config)  build.js  vitest.config.ts
  scripts/analyze.mjs | check-bundle-budget.mjs | optimize-images.mjs
  public/.htaccess  public/robots.txt  public/images/*.webp
  src/lib/query-client.ts | cms-channel.ts | media-url.ts
  src/api/cms.ts
  src/hooks/usePageData.ts | useHub.ts | useHubItem.ts | useResolvePath.ts | useHubLegacy.ts
  src/contexts/SiteContentContext.tsx
  src/components/cms/article-view-model.ts (+ the renderers that use it)
  src/components/seo/Seo.tsx
  src/components/ErrorBoundary.tsx
  src/admin/api/pageItems.ts
  src/admin/components/items/{ItemsManager,ItemEditorDrawer,ConflictDialog,CategoryManager,CardFieldsEditor}.tsx
  src/test/**
tests/e2e/{smoke,visual,seo,admin-items}.spec.ts  golden-routes.json  known-failures.json
playwright.config.ts
scripts/package-release.mjs
docs/plans/HYBRID_CMS_EXECUTION_LOG.md  HYBRID_CMS_HANDOVER.md  baseline/*
docs/deployment/CPANEL_DEPLOYMENT_RUNBOOK.md
postman/ (collection updates per skill)
```

---

## 10. Questions the agent must ask the user (and when)

| When | Question |
|---|---|
| T1 start | "Please create a Neon branch for tests and give me its connection string (`DATABASE_URL_TEST`)." |
| T1 step 4 | Only if the drift diff alters or drops columns: show the diff and ask how to proceed. |
| T4 step 4 | Only if there are `ERROR` lines or more than 5 collisions on a page: show the report and ask. |
| T14 | Only if a visual baseline needs refreshing: show the before and after screenshots. |
| T15 step 1 | Only if `/uploads/` files are missing locally: ask where the originals are. |
| T17 step 12 | "May I delete these leftover Vercel/Railway files and zips?" (show the list) |
| T18 | Hand over the summary and the follow-up decisions. |

Ask nothing else. For any other ambiguity, choose the option that keeps existing behaviour, write it down under "Deviations", and continue.
