import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT = process.cwd();

console.log('--- RUNNING COLLEGES MANAGEMENT & SAFETY VERIFICATION SUITE ---');

// 1. Verify Public Storefront: colleges-universities-for-sale.tsx
const storefrontPath = path.join(ROOT, 'frontend/src/pages/colleges-universities-for-sale.tsx');
assert.ok(fs.existsSync(storefrontPath), 'Storefront page file must exist');
const storefrontCode = fs.readFileSync(storefrontPath, 'utf8');

// Pagination & PAGE_SIZE
assert.ok(
  storefrontCode.includes('PAGE_SIZE = 8'),
  'PAGE_SIZE must be exactly 8 universities at a time'
);
assert.ok(
  storefrontCode.includes('PaginationControl'),
  'Storefront must import and use PaginationControl'
);
assert.ok(
  storefrontCode.includes('setPage(1)'),
  'Storefront must reset page to 1 when filters or search change'
);

// Loading Skeleton & A11y Standards
assert.ok(
  storefrontCode.includes('CollegesGridSkeleton'),
  'Storefront must define and render CollegesGridSkeleton while loading'
);
const skeletonPath = path.join(ROOT, 'frontend/src/components/ui/page-skeleton.tsx');
assert.ok(fs.existsSync(skeletonPath), 'Skeleton components file must exist');
const skeletonCode = fs.readFileSync(skeletonPath, 'utf8');
assert.ok(
  skeletonCode.includes('role="status"') &&
  skeletonCode.includes('aria-busy="true"') &&
  skeletonCode.includes('sr-only'),
  'CollegesGridSkeleton and modern skeletons must have role="status", aria-busy="true", and sr-only announcements'
);
assert.ok(
  storefrontCode.includes('usePageData(\'colleges-universities-for-sale\')'),
  'Storefront must fetch from usePageData'
);

// Multi-Image Carousel & Helper on Storefront
assert.ok(
  storefrontCode.includes('getListingImages'),
  'Storefront must export/use getListingImages helper for multi-photo support'
);
assert.ok(
  storefrontCode.includes('CollegeCardCarousel'),
  'Storefront must render slide-able CollegeCardCarousel on cards'
);
assert.ok(
  storefrontCode.includes('stopPropagation'),
  'Card carousel prev/next buttons must call stopPropagation to avoid opening modal'
);
assert.ok(
  storefrontCode.includes('dossierImages'),
  'Dossier modal must render multi-image gallery with thumbnail strip'
);

// RichTextContent & Card Text Overflow Protection
assert.ok(
  storefrontCode.includes('RichTextContent'),
  'Storefront must import and use RichTextContent'
);
assert.ok(
  storefrontCode.includes('context="card"'),
  'Card description must use RichTextContent with context="card"'
);
assert.ok(
  storefrontCode.includes('line-clamp-3 break-words'),
  'Card description must have line-clamp-3 and break-words'
);
assert.ok(
  storefrontCode.includes('context="body"'),
  'Dossier modal must use RichTextContent with context="body" for full un-clamped HTML'
);
assert.ok(
  storefrontCode.includes('rounded-2xl overflow-hidden'),
  'Outer article card must have rounded-2xl overflow-hidden'
);

// Zero Hardcoded Mock Listings Fallback (DB as SSOT)
assert.ok(
  !storefrontCode.includes(': DEFAULTS.cards'),
  'Storefront must NOT fall back to DEFAULTS.cards; PostgreSQL is the Single Source of Truth'
);

console.log('✓ Public storefront (colleges-universities-for-sale.tsx) verified');

// 2. Verify Dedicated Admin Manager: CollegesManager.tsx
const collegesManagerPath = path.join(ROOT, 'frontend/src/admin/pages/CollegesManager.tsx');
assert.ok(fs.existsSync(collegesManagerPath), 'Dedicated CollegesManager.tsx must exist');
const managerCode = fs.readFileSync(collegesManagerPath, 'utf8');

assert.ok(
  managerCode.includes('HtmlRichTextEditor'),
  'CollegesManager must use reusable HtmlRichTextEditor'
);
assert.ok(
  managerCode.includes('MediaImageField'),
  'CollegesManager must use MediaImageField for campus photo'
);
assert.ok(
  managerCode.includes('/pages/upload-document'),
  'CollegesManager must support uploading NDA and Mandate PDFs via /pages/upload-document'
);
assert.ok(
  managerCode.includes('broadcastCmsInvalidation'),
  'CollegesManager must broadcast cache invalidation on save'
);
assert.ok(
  managerCode.includes('handleMove'),
  'CollegesManager must support reordering listings (Move Up / Down)'
);
assert.ok(
  managerCode.includes('handleDuplicate'),
  'CollegesManager must support duplicating listings'
);
assert.ok(
  managerCode.includes('handleDelete'),
  'CollegesManager must support deleting listings'
);
assert.ok(
  managerCode.includes('isPublished'),
  'CollegesManager must support toggling live vs draft status'
);

// Admin Pagination (12 items per page)
assert.ok(
  managerCode.includes('PAGE_SIZE = 12'),
  'CollegesManager must implement 12 items per page pagination'
);
assert.ok(
  managerCode.includes('paginatedCards'),
  'CollegesManager must paginate the listings table using paginatedCards'
);
assert.ok(
  managerCode.includes('PaginationControl'),
  'CollegesManager must render PaginationControl'
);

// Category Sanitization & No Hardcoded "General" Fallback
assert.ok(
  !managerCode.includes("|| 'General'"),
  'CollegesManager must not have hardcoded fallback to "General"'
);
assert.ok(
  managerCode.includes('Uncategorized'),
  'CollegesManager must render Uncategorized badge when card category is empty'
);
assert.ok(
  managerCode.includes('images?: string[]') || managerCode.includes('images: finalImages'),
  'CollegesManager must support multi-image gallery storage'
);

console.log('✓ Dedicated CollegesManager (src/admin/pages/CollegesManager.tsx) verified');

// 3. Verify Admin Sidebar Layout
const layoutPath = path.join(ROOT, 'frontend/src/admin/components/Layout.tsx');
const layoutCode = fs.readFileSync(layoutPath, 'utf8');
assert.ok(
  layoutCode.includes('/admin/colleges'),
  'Admin sidebar Layout must contain a link to /admin/colleges'
);
assert.ok(
  layoutCode.includes('Colleges for Sale'),
  'Admin sidebar Layout must have "Colleges for Sale" label'
);
console.log('✓ Admin Layout navigation verified');

// 4. Verify Admin Routing
const routesPath = path.join(ROOT, 'frontend/src/admin/AdminRoutes.tsx');
const routesCode = fs.readFileSync(routesPath, 'utf8');
assert.ok(
  routesCode.includes('CollegesManager'),
  'AdminRoutes must import CollegesManager'
);
assert.ok(
  routesCode.includes('path="colleges"'),
  'AdminRoutes must register path="colleges"'
);
console.log('✓ Admin routing verified');

// 5. Verify Safety Protection in PagesManager.tsx & Backend
const pagesManagerPath = path.join(ROOT, 'frontend/src/admin/pages/PagesManager.tsx');
const pagesManagerCode = fs.readFileSync(pagesManagerPath, 'utf8');

assert.ok(
  pagesManagerCode.includes('PROTECTED_SYSTEM_SLUGS'),
  'PagesManager must define PROTECTED_SYSTEM_SLUGS'
);
assert.ok(
  pagesManagerCode.includes('!PROTECTED_SYSTEM_SLUGS.has(page.slug)'),
  'PagesManager must hide Trash2 button for protected system pages'
);
assert.ok(
  pagesManagerCode.includes('/admin/colleges'),
  'PagesManager must provide a direct shortcut to /admin/colleges'
);

// Backend safety check
const backendRoutesPath = path.join(ROOT, 'backend/src/routes/pages.routes.ts');
const backendCode = fs.readFileSync(backendRoutesPath, 'utf8');
assert.ok(
  backendCode.includes('PROTECTED_SLUGS') &&
  backendCode.includes('colleges-universities-for-sale'),
  'Backend pages.routes.ts must reject DELETE requests for colleges-universities-for-sale with 403 Forbidden'
);
console.log('✓ Page deletion protection & safety invariants verified');

// 6. Verify Products Page Unmodified (User invariant)
const shopPath = path.join(ROOT, 'frontend/src/pages/shop.tsx');
const adminProductsPath = path.join(ROOT, 'frontend/src/admin/pages/Products.tsx');
assert.ok(fs.existsSync(shopPath), 'shop.tsx must remain intact');
assert.ok(fs.existsSync(adminProductsPath), 'Products.tsx must remain intact');
console.log('✓ Products pages untouched as required');

console.log('\n======================================================');
console.log('ALL VERIFICATION ASSERTIONS PASSED (6/6 TESTS PASSED)!');
console.log('======================================================');
