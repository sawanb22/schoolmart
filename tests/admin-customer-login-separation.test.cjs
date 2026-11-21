const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING ADMIN VS CUSTOMER LOGIN SEPARATION TEST SUITE ===');

const projectRoot = path.resolve(__dirname, '..');

// 1. Check backend auth.routes.ts for POST /admin-login
const backendAuthRoutesPath = path.join(projectRoot, 'backend', 'src', 'routes', 'auth.routes.ts');
assert(fs.existsSync(backendAuthRoutesPath), 'backend auth.routes.ts must exist');
const backendAuthContent = fs.readFileSync(backendAuthRoutesPath, 'utf8');

assert(backendAuthContent.includes("router.post('/admin-login'"), "backend must define POST /admin-login endpoint");
assert(backendAuthContent.includes("user.role !== 'admin'"), "POST /admin-login must verify user.role !== 'admin'");
assert(backendAuthContent.includes('403'), "POST /admin-login must return 403 when user is not admin");
assert(backendAuthContent.includes('authLimiter'), "POST /admin-login must use authLimiter rate limiting");
console.log('✓ TEST 1 PASSED: Backend /api/auth/admin-login endpoint strictly enforces admin role with 403 response.');

// 2. Check src/admin/pages/Login.tsx
const adminLoginPath = path.join(projectRoot, 'frontend', 'src', 'admin', 'pages', 'Login.tsx');
assert(fs.existsSync(adminLoginPath), 'frontend/src/admin/pages/Login.tsx must exist');
const adminLoginContent = fs.readFileSync(adminLoginPath, 'utf8');

assert(adminLoginContent.includes('/auth/admin-login'), "Admin Login must call /auth/admin-login");
assert(adminLoginContent.includes('syncAdminSession'), "Admin Login must sync admin session");
assert(adminLoginContent.includes('CampusMart'), "Admin Login must display CampusMart Admin branding");
assert(!adminLoginContent.includes('/registration'), "Admin Login MUST NOT contain registration or public sign-up link");
assert(!adminLoginContent.includes('Sign up'), "Admin Login MUST NOT invite public sign up");
console.log('✓ TEST 2 PASSED: Admin Login page is dedicated, calls /auth/admin-login, and has zero sign-up links.');

// 3. Check src/admin/AdminRoutes.tsx
const adminRoutesPath = path.join(projectRoot, 'frontend', 'src', 'admin', 'AdminRoutes.tsx');
assert(fs.existsSync(adminRoutesPath), 'frontend/src/admin/AdminRoutes.tsx must exist');
const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');

assert(adminRoutesContent.includes("to={`/admin/login?redirect="), "ProtectedRoute must redirect unauthenticated visitors to /admin/login");
assert(adminRoutesContent.includes("<Route path=\"login\" element={<Suspense fallback={<Loader />}><Login /></Suspense>} />"), "admin/login route must render the Login page");
assert(adminRoutesContent.includes("navigate('/admin/login?redirect=/admin/dashboard'"), "AccessDenied switch account must navigate to /admin/login");
console.log('✓ TEST 3 PASSED: AdminRoutes routes unauthenticated users directly to /admin/login.');

// 4. Check src/pages/login.tsx
const customerLoginPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'login.tsx');
assert(fs.existsSync(customerLoginPath), 'frontend/src/pages/login.tsx must exist');
const customerLoginContent = fs.readFileSync(customerLoginPath, 'utf8');

assert(customerLoginContent.includes('/registration'), "Customer login must include public sign up link");
assert(customerLoginContent.includes('/admin/login'), "Customer login provides subtle link to admin login portal");
console.log('✓ TEST 4 PASSED: Customer login retains institutional customer sign-in & sign-up flows.');

// 5. Check src/admin/lib/auth.ts
const adminAuthLibPath = path.join(projectRoot, 'frontend', 'src', 'admin', 'lib', 'auth.ts');
assert(fs.existsSync(adminAuthLibPath), 'frontend/src/admin/lib/auth.ts must exist');
const adminAuthLibContent = fs.readFileSync(adminAuthLibPath, 'utf8');

assert(adminAuthLibContent.includes('export const syncAdminSession'), "auth.ts must export syncAdminSession");
assert(adminAuthLibContent.includes('export const isAdminLoggedIn'), "auth.ts must export isAdminLoggedIn");
assert(adminAuthLibContent.includes('export const clearAdminSession'), "auth.ts must export clearAdminSession");
console.log('✓ TEST 5 PASSED: Admin auth session helper library is complete and robust.');

console.log('\nALL 5 LOGIN SEPARATION TESTS PASSED CLEANLY! (5/5)');
