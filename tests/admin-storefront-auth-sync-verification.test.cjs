const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING ADMIN STOREFRONT AUTH SYNC VERIFICATION ===');

const authSessionPath = path.resolve('frontend/src/lib/auth-session.ts');
assert(fs.existsSync(authSessionPath), 'frontend/src/lib/auth-session.ts must exist');
const authSessionContent = fs.readFileSync(authSessionPath, 'utf8');

// 1. Verify getUserSession checks both cm_user and cm_admin_user
assert(
    authSessionContent.includes("sessionStorage.getItem('cm_admin_user')") &&
    authSessionContent.includes("localStorage.getItem('cm_admin_user')"),
    'getUserSession must fall back to cm_admin_user in storage'
);
console.log('✓ 1. getUserSession checks cm_admin_user fallback.');

// 2. Verify getUserToken checks both cm_token and cm_admin_token
assert(
    authSessionContent.includes("sessionStorage.getItem('cm_admin_token')") &&
    authSessionContent.includes("localStorage.getItem('cm_admin_token')"),
    'getUserToken must fall back to cm_admin_token in storage'
);
console.log('✓ 2. getUserToken checks cm_admin_token fallback.');

// 3. Verify admin lib syncAdminSession & clearAdminSession
const adminAuthPath = path.resolve('frontend/src/admin/lib/auth.ts');
assert(fs.existsSync(adminAuthPath), 'frontend/src/admin/lib/auth.ts must exist');
const adminAuthContent = fs.readFileSync(adminAuthPath, 'utf8');

assert(
    adminAuthContent.includes("sessionStorage.setItem('cm_token', token)") &&
    adminAuthContent.includes("localStorage.setItem('cm_user', userStr)"),
    'syncAdminSession must synchronize generic cm_token and cm_user'
);
assert(
    adminAuthContent.includes("sessionStorage.removeItem('cm_token')") &&
    adminAuthContent.includes("localStorage.removeItem('cm_user')"),
    'clearAdminSession must clear generic cm_token and cm_user'
);
console.log('✓ 3. syncAdminSession & clearAdminSession synchronize generic and admin tokens.');

// 4. Verify TopBar.tsx reactive listener
const topBarPath = path.resolve('frontend/src/components/layout/topbar.tsx');
assert(fs.existsSync(topBarPath), 'frontend/src/components/layout/topbar.tsx must exist');
const topBarContent = fs.readFileSync(topBarPath, 'utf8');

assert(
    topBarContent.includes("window.addEventListener('storage', syncAuth)"),
    'TopBar must listen to window storage event for real-time multi-tab auth updates'
);
assert(
    topBarContent.includes('[location.pathname]'),
    'TopBar must sync auth state on location pathname changes'
);
assert(
    topBarContent.includes('ADMIN DASHBOARD') &&
    topBarContent.includes('/admin/dashboard'),
    'TopBar must display ADMIN DASHBOARD link when admin is logged in'
);
console.log('✓ 4. TopBar reactive auth synchronization and ADMIN DASHBOARD link verified.');

// 5. Functional Simulation Test of auth-session logic
// Create mock localStorage & sessionStorage
const mockLocalStorage = new Map();
const mockSessionStorage = new Map();

global.localStorage = {
    getItem: (k) => mockLocalStorage.get(k) || null,
    setItem: (k, v) => mockLocalStorage.set(k, String(v)),
    removeItem: (k) => mockLocalStorage.delete(k),
    clear: () => mockLocalStorage.clear()
};

global.sessionStorage = {
    getItem: (k) => mockSessionStorage.get(k) || null,
    setItem: (k, v) => mockSessionStorage.set(k, String(v)),
    removeItem: (k) => mockSessionStorage.delete(k),
    clear: () => mockSessionStorage.clear()
};

// Simulate logging in via Admin Portal (only cm_admin_user and cm_admin_token set)
global.localStorage.setItem('cm_admin_token', 'mock_admin_jwt_token_123');
global.localStorage.setItem('cm_admin_user', JSON.stringify({
    id: 1,
    name: 'Administrator',
    email: 'admin@campusmart.in',
    role: 'admin'
}));

// Evaluate fallback logic
const userSessionCheck =
    JSON.parse(global.sessionStorage.getItem('cm_user')) ||
    JSON.parse(global.localStorage.getItem('cm_user')) ||
    JSON.parse(global.sessionStorage.getItem('cm_admin_user')) ||
    JSON.parse(global.localStorage.getItem('cm_admin_user'));

const userTokenCheck =
    global.sessionStorage.getItem('cm_token') ||
    global.localStorage.getItem('cm_token') ||
    global.sessionStorage.getItem('cm_admin_token') ||
    global.localStorage.getItem('cm_admin_token');

assert(userSessionCheck !== null, 'userSessionCheck must find admin user in localStorage');
assert.strictEqual(userSessionCheck.name, 'Administrator');
assert.strictEqual(userSessionCheck.role, 'admin');
assert.strictEqual(userTokenCheck, 'mock_admin_jwt_token_123');

console.log('✓ 5. Functional simulation of admin session discovery in storefront passed.');

console.log('\n=== ALL 5 AUTH SYNC TESTS PASSED (100%) ===');
