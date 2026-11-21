import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding SchoolMart initial data to Neon (steep-fire-08126348)...');

    // 1. Seed Admin User
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@schoolmart.in';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminPassword123!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: 'admin',
            emailVerified: true,
            passwordHash,
            name: 'SchoolMart Admin'
        },
        create: {
            email: adminEmail,
            name: 'SchoolMart Admin',
            role: 'admin',
            emailVerified: true,
            passwordHash,
        }
    });
    console.log(`✓ Admin user configured: ${admin.email} (ID: ${admin.id}, Role: ${admin.role}, emailVerified: ${admin.emailVerified})`);

    // 2. Canonical Product Categories
    const categories = [
        { name: 'Furniture', slug: 'furniture', page: 'furniture' },
        { name: 'Architecture', slug: 'architecture', page: 'school-building-design' },
        { name: 'Digital Infra', slug: 'digital-infra', page: 'digital' },
        { name: 'Libraries', slug: 'libraries', page: 'libraries' },
        { name: 'School Designs', slug: 'school-designs', page: 'design' },
        { name: 'Sports', slug: 'sports', page: 'sports' },
        { name: 'Mathematics', slug: 'mathematics', page: 'gamified-math-labs' },
        { name: 'Science', slug: 'science', page: 'science-is-fun' },
        { name: 'Labs', slug: 'labs', page: 'labs' },
    ];

    console.log(`\nSeeding ${categories.length} canonical categories...`);
    for (const cat of categories) {
        const record = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {
                name: cat.name,
                page: cat.page
            },
            create: {
                name: cat.name,
                slug: cat.slug,
                page: cat.page
            }
        });
        console.log(`  ✓ Category: ${record.name} (slug: ${record.slug}, page: ${record.page})`);
    }

    console.log('\n[NOTE] Page records are deferred per user instruction for page-by-page data feeding starting with Home page.');
    console.log('✅ Initial SchoolMart seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
