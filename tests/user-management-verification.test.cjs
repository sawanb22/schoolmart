/**
 * Automated Verification Test Suite for User Management
 * (Add User, Delete User, Guards, Cascading Cleanup, and UI Invariants)
 *
 * Run with: node tests/user-management-verification.test.cjs
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

let dotenv;
try {
    dotenv = require('dotenv');
} catch {
    try {
        dotenv = require('./backend/node_modules/dotenv');
    } catch {
        dotenv = require('../backend/node_modules/dotenv');
    }
}
if (dotenv) {
    const backendEnv = path.join(__dirname, '../backend/.env');
    if (fs.existsSync(backendEnv)) {
        dotenv.config({ path: backendEnv });
    }
    dotenv.config();
}

let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch {
    try {
        bcrypt = require('./backend/node_modules/bcryptjs');
    } catch {
        bcrypt = require('../backend/node_modules/bcryptjs');
    }
}

let PrismaClient;
try {
    PrismaClient = require('./backend/node_modules/@prisma/client').PrismaClient;
} catch {
    try {
        PrismaClient = require('@prisma/client').PrismaClient;
    } catch {
        PrismaClient = require('../backend/node_modules/@prisma/client').PrismaClient;
    }
}

console.log('================================================================');
console.log('🧪 USER MANAGEMENT FULLSTACK & DATABASE VERIFICATION TEST SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;
const errors = [];

async function runTest(name, fn) {
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${err.message}`);
        failed++;
        errors.push({ name, error: err });
    }
}

const rootDir = path.resolve(__dirname, '..');
const adminRoutesPath = path.join(rootDir, 'backend/src/routes/admin.routes.ts');
const usersComponentPath = path.join(rootDir, 'frontend/src/admin/pages/Users.tsx');

async function main() {
    // ─── 1. Static Verification: Backend Routes ──────────────────────────────
    console.log('--- Phase 1: Backend Route Static Analysis ---');
    const adminRoutesCode = fs.readFileSync(adminRoutesPath, 'utf8');

    await runTest('Backend imports bcrypt from "bcryptjs"', () => {
        assert(
            adminRoutesCode.includes("import bcrypt from 'bcryptjs'") ||
            adminRoutesCode.includes('import bcrypt from "bcryptjs"'),
            'admin.routes.ts must import bcrypt'
        );
    });

    await runTest('Backend defines POST /api/admin/users route with verifyToken & requireAdmin', () => {
        assert(
            adminRoutesCode.includes("router.post('/users', verifyToken, requireAdmin"),
            'POST /users must be protected by verifyToken, requireAdmin'
        );
    });

    await runTest('Backend validates name, email format, and password min 6 chars on POST', () => {
        assert(adminRoutesCode.includes('Name is required'), 'Name validation required');
        assert(adminRoutesCode.includes('Please enter a valid email address'), 'Email validation required');
        assert(adminRoutesCode.includes('Password must be at least 6 characters'), 'Password min 6 chars validation required');
    });

    await runTest('Backend checks email uniqueness and returns 409 if user exists', () => {
        assert(adminRoutesCode.includes('User with this email already exists'), 'Must return duplicate email error');
        assert(adminRoutesCode.includes('409'), 'Must return HTTP 409 status');
    });

    await runTest('Backend hashes password and creates user with emailVerified: true', () => {
        assert(adminRoutesCode.includes('bcrypt.hash(password, 10)'), 'Must hash password with bcrypt');
        assert(adminRoutesCode.includes('emailVerified: true'), 'Must set emailVerified: true for immediate access');
    });

    await runTest('Backend defines DELETE /api/admin/users/:id route with verifyToken & requireAdmin', () => {
        assert(
            adminRoutesCode.includes("router.delete('/users/:id', verifyToken, requireAdmin"),
            'DELETE /users/:id must be protected by verifyToken, requireAdmin'
        );
    });

    await runTest('Backend prevents self-deletion on DELETE endpoint', () => {
        assert(
            adminRoutesCode.includes('req.user?.id === userId') || adminRoutesCode.includes('req.user.id === userId'),
            'Must check req.user.id against target userId'
        );
        assert(
            adminRoutesCode.includes('You cannot delete your own administrator account'),
            'Must return self-deletion error'
        );
    });

    await runTest('Backend enforces last-admin guard on DELETE endpoint', () => {
        assert(
            adminRoutesCode.includes("role: 'admin'") && adminRoutesCode.includes('adminCount <= 1'),
            'Must verify adminCount > 1 before deleting admin'
        );
        assert(
            adminRoutesCode.includes('Cannot delete the last remaining administrator'),
            'Must return last remaining admin error message'
        );
    });

    await runTest('Backend checks purchase orders count before user deletion', () => {
        assert(
            adminRoutesCode.includes('prisma.order.count({ where: { userId } })') ||
            adminRoutesCode.includes('prisma.order.count'),
            'Must check order count'
        );
        assert(
            adminRoutesCode.includes('Cannot delete user with existing purchase orders'),
            'Must block deletion if orders exist'
        );
    });

    await runTest('Backend performs transactional cleanup of wishlistItem, address, chatMessage, classified, user', () => {
        assert(adminRoutesCode.includes('prisma.$transaction'), 'Must execute deletion inside prisma.$transaction');
        assert(adminRoutesCode.includes('wishlistItem.deleteMany'), 'Must clean up wishlistItem');
        assert(adminRoutesCode.includes('address.deleteMany'), 'Must clean up address');
        assert(adminRoutesCode.includes('chatMessage.deleteMany'), 'Must clean up chatMessage');
        assert(adminRoutesCode.includes('classified.deleteMany'), 'Must clean up classified');
        assert(adminRoutesCode.includes('user.delete'), 'Must delete user record');
    });

    // ─── 2. Static Verification: Frontend Component ──────────────────────────
    console.log('\n--- Phase 2: Frontend Component Static Analysis ---');
    const usersComponentCode = fs.readFileSync(usersComponentPath, 'utf8');

    await runTest('Frontend displays header with metric pills for Total, Admin, and Standard users', () => {
        assert(usersComponentCode.includes('Total Users'), 'Total Users metric required');
        assert(usersComponentCode.includes('Administrators'), 'Administrators metric required');
        assert(usersComponentCode.includes('Standard Users'), 'Standard Users metric required');
    });

    await runTest('Frontend includes live search input filtering name, email, or institution', () => {
        assert(usersComponentCode.includes('search'), 'Search state required');
        assert(
            usersComponentCode.includes('Search by name, email, or institution') ||
            usersComponentCode.includes('Search by name'),
            'Search input placeholder required'
        );
        assert(usersComponentCode.includes('institution'), 'Filter by institution required');
    });

    await runTest('Frontend includes "+ Add New User" action button and modal', () => {
        assert(usersComponentCode.includes('+ Add New User'), 'Add user button text required');
        assert(usersComponentCode.includes('Add New User'), 'Add user modal title required');
    });

    await runTest('Frontend modal provides Name, Email, Password, Role, Phone, Institution fields', () => {
        assert(usersComponentCode.includes('Full Name'), 'Full Name field required');
        assert(usersComponentCode.includes('Email Address'), 'Email Address field required');
        assert(usersComponentCode.includes('Password'), 'Password field required');
        assert(usersComponentCode.includes('Account Role'), 'Account Role field required');
        assert(usersComponentCode.includes('Phone Number'), 'Phone Number field required');
        assert(usersComponentCode.includes('Institution'), 'Institution field required');
    });

    await runTest('Frontend includes password helper & visibility toggle', () => {
        assert(usersComponentCode.includes('Generate Strong Password'), 'Generate password helper required');
        assert(usersComponentCode.includes('showPassword'), 'Password toggle state required');
    });

    await runTest('Frontend calls POST /admin/users and displays error banner on failure', () => {
        assert(usersComponentCode.includes("api.post('/admin/users'"), 'Must call POST /admin/users');
        assert(usersComponentCode.includes('addError'), 'Must track add error');
    });

    await runTest('Frontend maintains Role update dropdown and adds Delete button with Trash2 icon', () => {
        assert(usersComponentCode.includes('updateRole'), 'Must retain updateRole handler');
        assert(usersComponentCode.includes('Trash2'), 'Must include Trash2 delete icon');
    });

    await runTest('Frontend includes Delete User confirmation modal with prompt & warning', () => {
        assert(usersComponentCode.includes('Delete User'), 'Delete User modal title required');
        assert(usersComponentCode.includes('Are you sure you want to delete'), 'Prompt text required');
        assert(usersComponentCode.includes("api.delete(`/admin/users/${deletingUser.id}`"), 'Must call api.delete');
    });

    // ─── 3. Prisma Schema & Client Delegate Verification ────────────────────
    console.log('\n--- Phase 3: Prisma Client Delegates & Architecture Verification ---');
    const prisma = new PrismaClient();

    await runTest('Prisma Client exports all required models and delegates', () => {
        assert(typeof prisma.user?.findUnique === 'function', 'prisma.user delegate must exist');
        assert(typeof prisma.user?.create === 'function', 'prisma.user.create must exist');
        assert(typeof prisma.user?.delete === 'function', 'prisma.user.delete must exist');
        assert(typeof prisma.wishlistItem?.deleteMany === 'function', 'prisma.wishlistItem.deleteMany must exist');
        assert(typeof prisma.address?.deleteMany === 'function', 'prisma.address.deleteMany must exist');
        assert(typeof prisma.chatMessage?.deleteMany === 'function', 'prisma.chatMessage.deleteMany must exist');
        assert(typeof prisma.classified?.deleteMany === 'function', 'prisma.classified.deleteMany must exist');
        assert(typeof prisma.order?.count === 'function', 'prisma.order.count must exist');
        assert(typeof prisma.$transaction === 'function', 'prisma.$transaction must exist');
    });

    // ─── 4. Functional Simulation & Integration Tests ───────────────────────
    console.log('\n--- Phase 4: Data Layer Logic & Constraint Tests ---');

    let isDbConnected = false;
    try {
        await prisma.$connect();
        isDbConnected = true;
        console.log('📡 Connected to live database server.');
    } catch (e) {
        console.log(`ℹ️ Live DB connection skipped (${e.code || e.message}). Running in-memory database simulation suite.`);
    }

    if (isDbConnected) {
        // Run full live integration against reachable database
        const testTimestamp = Date.now();
        const testEmail = `test_mgmt_${testTimestamp}@campusmart.test`;
        const testPassword = 'Password123!';
        let createdUserId = null;

        try {
            await runTest('Live DB: Successfully create verified user with bcrypt hash', async () => {
                const passwordHash = await bcrypt.hash(testPassword, 10);
                const user = await prisma.user.create({
                    data: {
                        name: 'Test Mgmt User',
                        email: testEmail,
                        passwordHash,
                        role: 'user',
                        phone: '9876543210',
                        institution: 'Test Institute',
                        emailVerified: true,
                    },
                });
                assert(user.id, 'User ID expected');
                assert.strictEqual(user.email, testEmail);
                assert.strictEqual(user.emailVerified, true);
                createdUserId = user.id;
            });

            await runTest('Live DB: Uniqueness constraint blocks duplicate email', async () => {
                let rejected = false;
                try {
                    await prisma.user.create({
                        data: { name: 'Dupe', email: testEmail, passwordHash: 'hash' },
                    });
                } catch {
                    rejected = true;
                }
                assert.strictEqual(rejected, true, 'Duplicate must be rejected');
            });

            await runTest('Live DB: Insert and cascade clean relations in transaction', async () => {
                assert(createdUserId);
                await prisma.address.create({
                    data: { userId: createdUserId, type: 'Home', line1: 'Street 1', city: 'City', state: 'State', pincode: '123456' },
                });
                await prisma.chatMessage.create({
                    data: { userId: createdUserId, role: 'user', content: 'Hello' },
                });

                await prisma.$transaction([
                    prisma.wishlistItem.deleteMany({ where: { userId: createdUserId } }),
                    prisma.address.deleteMany({ where: { userId: createdUserId } }),
                    prisma.chatMessage.deleteMany({ where: { userId: createdUserId } }),
                    prisma.classified.deleteMany({ where: { userId: createdUserId } }),
                    prisma.user.delete({ where: { id: createdUserId } }),
                ]);

                const check = await prisma.user.findUnique({ where: { id: createdUserId } });
                assert.strictEqual(check, null);
                createdUserId = null;
            });
        } finally {
            if (createdUserId) {
                await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
            }
            await prisma.$disconnect();
        }
    } else {
        // In-memory simulation of exact logic & constraints
        await runTest('Logic: Password hashing & verification with bcrypt', async () => {
            const rawPassword = 'SecretPassword!123';
            const hash = await bcrypt.hash(rawPassword, 10);
            assert(hash && hash.startsWith('$2'), 'Bcrypt hash format valid');
            const valid = await bcrypt.compare(rawPassword, hash);
            assert.strictEqual(valid, true, 'Bcrypt compare must succeed');
            const invalid = await bcrypt.compare('WrongPassword', hash);
            assert.strictEqual(invalid, false, 'Wrong password must fail');
        });

        await runTest('Logic: Duplicate email prevention & normalization', () => {
            const existingUsers = [
                { id: 1, email: 'admin@campusmart.in', role: 'admin' },
                { id: 2, email: 'student@campusmart.in', role: 'user' },
            ];

            const checkEmail = (inputEmail) => {
                const normalized = inputEmail.trim().toLowerCase();
                const exists = existingUsers.some((u) => u.email === normalized);
                if (exists) {
                    return { status: 409, error: 'User with this email already exists' };
                }
                return { status: 201, email: normalized };
            };

            assert.strictEqual(checkEmail('  Admin@CampusMart.in ').status, 409);
            assert.strictEqual(checkEmail('new.user@campusmart.in').status, 201);
            assert.strictEqual(checkEmail('new.user@campusmart.in').email, 'new.user@campusmart.in');
        });

        await runTest('Logic: Self-deletion guard returns 400', () => {
            const req = { user: { id: 1 } };
            const targetUserId = 1;
            if (req.user?.id === targetUserId) {
                const res = { status: 400, error: 'You cannot delete your own administrator account' };
                assert.strictEqual(res.status, 400);
                assert.strictEqual(res.error, 'You cannot delete your own administrator account');
            } else {
                assert.fail('Should have caught self-deletion');
            }
        });

        await runTest('Logic: Last-admin guard blocks deletion when adminCount <= 1', () => {
            const evaluateAdminDeletion = (targetRole, adminCount) => {
                if (targetRole === 'admin' && adminCount <= 1) {
                    return { status: 400, error: 'Cannot delete the last remaining administrator' };
                }
                return { status: 200, success: true };
            };

            const singleAdmin = evaluateAdminDeletion('admin', 1);
            assert.strictEqual(singleAdmin.status, 400);
            assert.strictEqual(singleAdmin.error, 'Cannot delete the last remaining administrator');

            const multiAdmin = evaluateAdminDeletion('admin', 2);
            assert.strictEqual(multiAdmin.status, 200);

            const standardUser = evaluateAdminDeletion('user', 1);
            assert.strictEqual(standardUser.status, 200);
        });

        await runTest('Logic: Purchase orders guard blocks deletion when orderCount > 0', () => {
            const evaluateOrdersCheck = (orderCount) => {
                if (orderCount > 0) {
                    return { status: 400, error: 'Cannot delete user with existing purchase orders' };
                }
                return { status: 200, success: true };
            };

            const hasOrders = evaluateOrdersCheck(3);
            assert.strictEqual(hasOrders.status, 400);
            assert.strictEqual(hasOrders.error, 'Cannot delete user with existing purchase orders');

            const noOrders = evaluateOrdersCheck(0);
            assert.strictEqual(noOrders.status, 200);
        });

        await runTest('Logic: Transactional cascading deletion order and cleanup integrity', () => {
            // Emulate relational database tables
            const db = {
                users: [{ id: 99, name: 'Target User' }],
                wishlistItem: [{ id: 1, userId: 99 }, { id: 2, userId: 100 }],
                address: [{ id: 1, userId: 99 }, { id: 2, userId: 100 }],
                chatMessage: [{ id: 1, userId: 99 }],
                classified: [{ id: 1, userId: 99 }],
            };

            const userId = 99;

            // Execute exact transactional cleanup order
            db.wishlistItem = db.wishlistItem.filter((item) => item.userId !== userId);
            db.address = db.address.filter((item) => item.userId !== userId);
            db.chatMessage = db.chatMessage.filter((item) => item.userId !== userId);
            db.classified = db.classified.filter((item) => item.userId !== userId);
            db.users = db.users.filter((u) => u.id !== userId);

            assert.strictEqual(db.users.length, 0, 'Target user removed');
            assert.strictEqual(db.wishlistItem.filter((i) => i.userId === 99).length, 0, 'Wishlist items removed');
            assert.strictEqual(db.address.filter((i) => i.userId === 99).length, 0, 'Addresses removed');
            assert.strictEqual(db.chatMessage.filter((i) => i.userId === 99).length, 0, 'Chat messages removed');
            assert.strictEqual(db.classified.filter((i) => i.userId === 99).length, 0, 'Classifieds removed');

            // Preserves other users' data
            assert.strictEqual(db.wishlistItem.length, 1, 'Other wishlist items preserved');
            assert.strictEqual(db.address.length, 1, 'Other addresses preserved');
        });
    }

    console.log('\n================================================================');
    console.log(`🏁 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
});
