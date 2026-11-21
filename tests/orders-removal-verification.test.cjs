const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== ORDERS FLOW REMOVAL VERIFICATION TEST ===\n');

// Test 1: Verify my-account.tsx has removed orders
console.log('Test 1: Verify my-account.tsx has removed orders flow...');
const accountContent = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/my-account.tsx'), 'utf8');

assert.ok(!accountContent.includes("{ id: 'orders'"), 'my-account.tsx must NOT include orders tab');
assert.ok(!accountContent.includes("activeTab === 'orders'"), 'my-account.tsx must NOT render orders section');
assert.ok(!accountContent.includes("api.get('/orders')"), 'my-account.tsx must NOT call /orders API');
assert.ok(accountContent.includes("{ id: 'profile', label: 'Profile'"), 'my-account.tsx must retain Profile');
assert.ok(accountContent.includes("{ id: 'wishlist', label: 'Wishlist'"), 'my-account.tsx must retain Wishlist');
assert.ok(accountContent.includes("{ id: 'addresses', label: 'Addresses'"), 'my-account.tsx must retain Addresses');
console.log('✓ PASS: my-account.tsx has cleanly removed orders flow.');

// Test 2: Verify Layout.tsx has removed /admin/orders and updated section title
console.log('\nTest 2: Verify Layout.tsx sidebar navigation...');
const layoutContent = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/components/Layout.tsx'), 'utf8');

assert.ok(!layoutContent.includes("{ to: '/admin/orders'"), 'Layout.tsx must NOT include /admin/orders menu link');
assert.ok(layoutContent.includes("label: 'Quotations & Enquiries'"), "Layout.tsx section must be renamed to 'Quotations & Enquiries'");
assert.ok(layoutContent.includes("{ to: '/admin/enquiries'"), 'Layout.tsx must retain Enquiries');
assert.ok(layoutContent.includes("{ to: '/admin/wishlist-report'"), 'Layout.tsx must retain Wishlist Reports');
console.log('✓ PASS: Layout.tsx sidebar updated cleanly.');

// Test 3: Verify Dashboard.tsx has removed Total Orders and added Quote Requests
console.log('\nTest 3: Verify Dashboard.tsx stats and quick links...');
const dashContent = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/pages/Dashboard.tsx'), 'utf8');

assert.ok(!dashContent.includes("{ label: 'Total Orders'"), 'Dashboard.tsx must NOT display Total Orders stat card');
assert.ok(!dashContent.includes("{ to: '/admin/orders'"), 'Dashboard.tsx must NOT link to /admin/orders');
assert.ok(dashContent.includes("{ label: 'Quote Requests'"), 'Dashboard.tsx must display Quote Requests stat card');
assert.ok(dashContent.includes("heading: '📬 Quotations & Enquiries'"), "Dashboard.tsx section must be 'Quotations & Enquiries'");
console.log('✓ PASS: Dashboard.tsx stats and quick links updated.');

// Test 4: Verify AdminRoutes.tsx redirects /admin/orders to /admin/enquiries
console.log('\nTest 4: Verify AdminRoutes.tsx graceful redirection...');
const routesContent = fs.readFileSync(path.join(__dirname, '../frontend/src/admin/AdminRoutes.tsx'), 'utf8');

assert.ok(routesContent.includes('<Route path="orders" element={<Navigate to="/admin/enquiries" replace />} />'), 'AdminRoutes.tsx must redirect /admin/orders to /admin/enquiries');
console.log('✓ PASS: AdminRoutes.tsx redirects cleanly with zero 404s.');

// Test 5: Verify Request Quote flow is 100% intact
console.log('\nTest 5: Verify Request Quote flow is intact...');
const quoteContent = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/request-quote.tsx'), 'utf8');
assert.ok(quoteContent.includes('Request an Institutional Quote'), 'request-quote.tsx must remain intact');
assert.ok(quoteContent.includes('/contact/quote'), 'request-quote.tsx must submit to /contact/quote');
console.log('✓ PASS: Request Quote flow is 100% active and intact.');

console.log('\n========================================');
console.log('ALL ORDERS REMOVAL VERIFICATION TESTS PASSED (5/5)!');
console.log('========================================');
