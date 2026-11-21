import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verify() {
    console.log('=== VERIFYING NEON DATABASE (steep-fire-08126348) ===\n');

    // 1. Table Count
    const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC;
    `;
    console.log(`Public Tables Count: ${tables.length}`);
    console.log('Tables in public schema:');
    tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.table_name}`));

    // 2. Admin Verification
    const adminEmail = 'admin@schoolmart.in';
    const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail }
    });
    console.log('\nAdmin User:');
    if (adminUser) {
        const passwordMatch = await bcrypt.compare('AdminPassword123!', adminUser.passwordHash);
        console.log(`  Email: ${adminUser.email}`);
        console.log(`  Role: ${adminUser.role}`);
        console.log(`  Email Verified: ${adminUser.emailVerified}`);
        console.log(`  Password Verification (AdminPassword123!): ${passwordMatch ? 'PASS ✅' : 'FAIL ❌'}`);
    } else {
        console.log('  ❌ Admin user not found!');
    }

    // 3. Categories Verification
    const categories = await prisma.category.findMany({
        orderBy: { id: 'asc' }
    });
    console.log(`\nCanonical Categories Count: ${categories.length}`);
    categories.forEach(c => {
        console.log(`  - [ID: ${c.id}] ${c.name} (slug: ${c.slug}, page: ${c.page})`);
    });

    console.log('\n=== VERIFICATION COMPLETE ===');
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
