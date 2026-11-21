import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log('================================================================');
console.log('🧪 Furniture Page Architecture & Stock Realignment Test Suite');
console.log('================================================================\n');

// Test 1: product-detail.tsx does not show stock numbers
console.log('Test 1: Verifying Single Product Detail Page Stock Badge...');
const productDetailPath = resolve('frontend/src/pages/product-detail.tsx');
assert(existsSync(productDetailPath), 'product-detail.tsx exists');
const productDetailCode = readFileSync(productDetailPath, 'utf8');
assert(
    !productDetailCode.includes('available)'),
    'product-detail.tsx does not display "({product.stock} available)" count'
);
assert(
    productDetailCode.includes('In Stock') && !productDetailCode.includes('In Stock ('),
    'product-detail.tsx displays clean "In Stock" text only'
);

// Test 2: Products.tsx stock default and no via.placeholder.com
console.log('\nTest 2: Verifying Admin Products Page Defaults & Image Cleanliness...');
const productsAdminPath = resolve('frontend/src/admin/pages/Products.tsx');
assert(existsSync(productsAdminPath), 'Products.tsx exists');
const productsAdminCode = readFileSync(productsAdminPath, 'utf8');
assert(
    productsAdminCode.includes('stock: 1'),
    'Products.tsx EMPTY template defaults stock to 1'
);
assert(
    !productsAdminCode.includes('via.placeholder.com'),
    'Products.tsx completely removes via.placeholder.com fallback'
);
assert(
    !productsAdminCode.includes('Product cover image is required'),
    'Products.tsx keeps cover image optional as requested'
);

// Test 3: Backend routes/products.routes.ts default stock = 1
console.log('\nTest 3: Verifying Backend Product Route Stock Handling...');
const backendRoutesPath = resolve('backend/src/routes/products.routes.ts');
assert(existsSync(backendRoutesPath), 'products.routes.ts exists');
const backendRoutesCode = readFileSync(backendRoutesPath, 'utf8');
assert(
    backendRoutesCode.includes('Math.max(1, parseInt(String(stock), 10))'),
    'backend routes ensure numericStock defaults to at least 1'
);

// Test 4: shop.tsx removes hardcoded external Unsplash sofa fallback
console.log('\nTest 4: Verifying Public Shop Clean Image Handling...');
const shopPath = resolve('frontend/src/pages/shop.tsx');
assert(existsSync(shopPath), 'shop.tsx exists');
const shopCode = readFileSync(shopPath, 'utf8');
assert(
    !shopCode.includes('1555041469-a586c61ea9bc'),
    'shop.tsx completely purges hardcoded Unsplash sofa image fallback'
);

// Test 5: UnifiedPageEditor.tsx suppresses phantom cards & renders switchboard
console.log('\nTest 5: Verifying UnifiedPageEditor Dedicated Furniture Handling...');
const editorPath = resolve('frontend/src/admin/components/UnifiedPageEditor.tsx');
assert(existsSync(editorPath), 'UnifiedPageEditor.tsx exists');
const editorCode = readFileSync(editorPath, 'utf8');
assert(
    editorCode.includes("FurnitureCategorySwitchboard"),
    'UnifiedPageEditor imports FurnitureCategorySwitchboard'
);
assert(
    editorCode.includes("if (page.slug === 'furniture')") && editorCode.includes("payloadTemplate = 'shop'"),
    'UnifiedPageEditor sets payloadTemplate = shop and cleans phantom cards on save'
);
assert(
    editorCode.includes("page.slug !== 'furniture'") || (editorCode.includes("if (page.slug === 'furniture')") && editorCode.includes("return null;")),
    'UnifiedPageEditor bypasses interactive cards & features when page.slug is furniture'
);

// Test 6: FurnitureCategorySwitchboard exists and is properly typed
console.log('\nTest 6: Verifying FurnitureCategorySwitchboard Component...');
const switchboardPath = resolve('frontend/src/admin/components/FurnitureCategorySwitchboard.tsx');
assert(existsSync(switchboardPath), 'FurnitureCategorySwitchboard.tsx exists');
const switchboardCode = readFileSync(switchboardPath, 'utf8');
assert(
    switchboardCode.includes("api.get('/products/categories', { params: { page: 'furniture' } })"),
    'Switchboard queries categories for page=furniture'
);
assert(
    switchboardCode.includes("hiddenCategorySlugs"),
    'Switchboard handles hiddenCategorySlugs toggling'
);

// Test 7: Public /furniture page passes hiddenCategorySlugs to Shop
console.log('\nTest 7: Verifying Public Furniture Page Category Exclusion Wiring...');
const furniturePagePath = resolve('frontend/src/pages/furniture.tsx');
assert(existsSync(furniturePagePath), 'furniture.tsx exists');
const furniturePageCode = readFileSync(furniturePagePath, 'utf8');
assert(
    furniturePageCode.includes('hiddenCategorySlugs'),
    'furniture.tsx reads hiddenCategorySlugs from pageData'
);
assert(
    furniturePageCode.includes("categoryPage=\"furniture\"") && furniturePageCode.includes("excludedCategorySlugs="),
    'furniture.tsx passes excludedCategorySlugs into <Shop />'
);

// Test 8: Two-Level Cascading Filter and Modal Dropdowns in Products.tsx
console.log('\nTest 8: Verifying Two-Level Cascading Dropdowns in Products.tsx...');
assert(
    productsAdminCode.includes('storePageFilter') && productsAdminCode.includes('availableStorePages'),
    'Products.tsx manages storePageFilter state and availableStorePages list'
);
assert(
    productsAdminCode.includes('Filter products by store page') && productsAdminCode.includes('Filter products by subcategory'),
    'Products.tsx has distinct store page and subcategory filter dropdowns in filter bar'
);
assert(
    productsAdminCode.includes('Target Store Page *') && productsAdminCode.includes('Subcategory Classification *'),
    'Products.tsx Add/Edit modal has distinct Target Store Page and Subcategory dropdowns'
);
assert(
    productsAdminCode.includes('disabled={!modalStorePage}'),
    'Products.tsx Subcategory dropdown is properly cascaded based on Target Store Page'
);

console.log('\n================================================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
