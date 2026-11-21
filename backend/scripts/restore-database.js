const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  targetUrl ? { datasources: { db: { url: targetUrl } } } : undefined
);

async function withRetry(fn, retries = 5, delayMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Query failed (${err.code || err.message}), retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function restoreDatabase() {
  console.log('🚀 Restoring database from backup file...');

  const backupPath = path.resolve(__dirname, '../prisma/database-export.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found at: ${backupPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  console.log(`📦 Loaded backup created at: ${data.exportedAt}`);

  try {
    // 1. Restore Users
    if (data.users && data.users.length > 0) {
      console.log(`\n👤 Restoring ${data.users.length} Users...`);
      for (const u of data.users) {
        await withRetry(() => prisma.user.upsert({
          where: { email: u.email },
          update: {
            name: u.name,
            passwordHash: u.passwordHash,
            phone: u.phone,
            institution: u.institution,
            role: u.role,
            emailVerified: u.emailVerified,
          },
          create: {
            name: u.name,
            email: u.email,
            passwordHash: u.passwordHash,
            phone: u.phone,
            institution: u.institution,
            role: u.role,
            emailVerified: u.emailVerified,
          },
        }));
      }
      console.log(`✓ Users restored`);
    }

    // 2. Restore Categories
    const categoryIdMap = {};
    if (data.categories && data.categories.length > 0) {
      console.log(`\n📁 Restoring ${data.categories.length} Categories...`);
      for (const cat of data.categories) {
        const record = await withRetry(() => prisma.category.upsert({
          where: { slug: cat.slug },
          update: { name: cat.name, page: cat.page },
          create: { name: cat.name, slug: cat.slug, page: cat.page },
        }));
        categoryIdMap[cat.id] = record.id;
      }
      console.log(`✓ Categories restored`);
    }

    // 3. Restore Products
    if (data.products && data.products.length > 0) {
      console.log(`\n📦 Restoring ${data.products.length} Products...`);
      for (const p of data.products) {
        const targetCategoryId = categoryIdMap[p.categoryId] || p.categoryId;
        await withRetry(() => prisma.product.upsert({
          where: { slug: p.slug },
          update: {
            name: p.name,
            sku: p.sku,
            description: p.description,
            price: p.price,
            categoryId: targetCategoryId,
            imageUrl: p.imageUrl,
            images: p.images,
            specifications: p.specifications,
            rating: p.rating,
            reviewCount: p.reviewCount,
            stock: p.stock,
            active: p.active,
            featured: p.featured,
          },
          create: {
            name: p.name,
            slug: p.slug,
            sku: p.sku,
            description: p.description,
            price: p.price,
            categoryId: targetCategoryId,
            imageUrl: p.imageUrl,
            images: p.images,
            specifications: p.specifications,
            rating: p.rating,
            reviewCount: p.reviewCount,
            stock: p.stock,
            active: p.active,
            featured: p.featured,
          },
        }));
      }
      console.log(`✓ Products restored`);
    }

    // 4. Restore Blog Categories
    const blogCatMap = {};
    if (data.blogCategories && data.blogCategories.length > 0) {
      console.log(`\n📚 Restoring ${data.blogCategories.length} Blog Categories...`);
      for (const bc of data.blogCategories) {
        const record = await withRetry(() => prisma.blogCategory.upsert({
          where: { slug: bc.slug },
          update: { name: bc.name },
          create: { name: bc.name, slug: bc.slug },
        }));
        blogCatMap[bc.id] = record.id;
      }
      console.log(`✓ Blog categories restored`);
    }

    // 5. Restore Blog Posts
    if (data.blogPosts && data.blogPosts.length > 0) {
      console.log(`\n📝 Restoring ${data.blogPosts.length} Blog Posts...`);
      for (const bp of data.blogPosts) {
        const targetCatId = bp.categoryId ? (blogCatMap[bp.categoryId] || bp.categoryId) : null;
        await withRetry(() => prisma.blogPost.upsert({
          where: { slug: bp.slug },
          update: {
            title: bp.title,
            excerpt: bp.excerpt,
            body: bp.body,
            categoryId: targetCatId,
            imageUrl: bp.imageUrl,
            published: bp.published,
            publishedAt: bp.publishedAt ? new Date(bp.publishedAt) : null,
          },
          create: {
            title: bp.title,
            slug: bp.slug,
            excerpt: bp.excerpt,
            body: bp.body,
            categoryId: targetCatId,
            imageUrl: bp.imageUrl,
            published: bp.published,
            publishedAt: bp.publishedAt ? new Date(bp.publishedAt) : null,
          },
        }));
      }
      console.log(`✓ Blog posts restored`);
    }

    // 6. Restore Site Content
    if (data.siteContent && data.siteContent.length > 0) {
      console.log(`\n⚙️ Restoring ${data.siteContent.length} Site Content entries...`);
      for (const sc of data.siteContent) {
        await withRetry(() => prisma.siteContent.upsert({
          where: { key: sc.key },
          update: { value: sc.value },
          create: { key: sc.key, value: sc.value },
        }));
      }
      console.log(`✓ Site content restored`);
    }

    // 7. Restore Pages (CMS Pages with complete pageData!)
    if (data.pages && data.pages.length > 0) {
      console.log(`\n📄 Restoring ${data.pages.length} CMS Pages...`);
      const colCheck = await prisma.$queryRawUnsafe(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'page' AND column_name = 'contentModel'
      `);
      const hasContentModel = Array.isArray(colCheck) && colCheck.length > 0;

      for (const page of data.pages) {
        if (!hasContentModel) {
          await withRetry(() => prisma.$executeRawUnsafe(
            `INSERT INTO "page" ("title", "slug", "template", "content", "pageData", "published", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT ("slug") DO UPDATE SET
               "title" = EXCLUDED."title",
               "template" = EXCLUDED."template",
               "content" = EXCLUDED."content",
               "pageData" = EXCLUDED."pageData",
               "published" = EXCLUDED."published",
               "updatedAt" = EXCLUDED."updatedAt"`,
            page.title,
            page.slug,
            page.template || null,
            page.content || null,
            page.pageData != null ? (typeof page.pageData === 'object' ? JSON.stringify(page.pageData) : page.pageData) : null,
            page.published ?? true,
            page.createdAt ? new Date(page.createdAt) : new Date(),
            page.updatedAt ? new Date(page.updatedAt) : new Date()
          ));
        } else {
          await withRetry(() => prisma.page.upsert({
            where: { slug: page.slug },
            update: {
              title: page.title,
              template: page.template,
              content: page.content,
              pageData: page.pageData,
              published: page.published,
            },
            create: {
              title: page.title,
              slug: page.slug,
              template: page.template,
              content: page.content,
              pageData: page.pageData,
              published: page.published,
            },
          }));
        }
      }
      console.log(`✓ Pages restored`);
    }

    // 8. Restore Catalogues & CaseStudies
    if (data.catalogues && data.catalogues.length > 0) {
      console.log(`\n📖 Restoring ${data.catalogues.length} Catalogues...`);
      for (const cat of data.catalogues) {
        const existing = await withRetry(() => prisma.catalogue.findFirst({ where: { title: cat.title } }));
        if (!existing) {
          await withRetry(() => prisma.catalogue.create({
            data: {
              title: cat.title,
              description: cat.description,
              fileUrl: cat.fileUrl,
              thumbnailUrl: cat.thumbnailUrl,
              active: cat.active,
            },
          }));
        }
      }
      console.log(`✓ Catalogues restored`);
    }

    if (data.caseStudies && data.caseStudies.length > 0) {
      console.log(`\n💼 Restoring ${data.caseStudies.length} Case Studies...`);
      for (const cs of data.caseStudies) {
        if (prisma.caseStudy) {
          await withRetry(() => prisma.caseStudy.upsert({
            where: { slug: cs.slug },
            update: {
              title: cs.title,
              description: cs.description,
              body: cs.body,
              imageUrl: cs.imageUrl,
              active: cs.active,
            },
            create: {
              title: cs.title,
              slug: cs.slug,
              description: cs.description,
              body: cs.body,
              imageUrl: cs.imageUrl,
              active: cs.active,
            },
          }));
        } else {
          try {
            await withRetry(() => prisma.$executeRawUnsafe(
              `INSERT INTO "casestudy" ("title", "slug", "description", "body", "imageUrl", "active", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT ("slug") DO UPDATE SET "title" = EXCLUDED."title", "description" = EXCLUDED."description", "body" = EXCLUDED."body", "imageUrl" = EXCLUDED."imageUrl", "active" = EXCLUDED."active", "updatedAt" = NOW()`,
              cs.title, cs.slug, cs.description, cs.body, cs.imageUrl, cs.active
            ));
          } catch (e) {
            console.log('Skipping case study raw insert:', e.message);
          }
        }
      }
      console.log(`✓ Case studies restored`);
    }

    // 8.5 Restore SearchCards
    if (data.searchCards && data.searchCards.length > 0) {
      console.log(`\n🔍 Restoring ${data.searchCards.length} Search Cards...`);
      for (const sc of data.searchCards) {
        await withRetry(() => prisma.searchCard.upsert({
          where: { cardSlug: sc.cardSlug },
          update: {
            targetSlug: sc.targetSlug,
            sectionAnchor: sc.sectionAnchor,
            categorySlug: sc.categorySlug,
            subcategorySlug: sc.subcategorySlug,
            secondaryCategorySlugs: sc.secondaryCategorySlugs || [],
            title: sc.title,
            summary: sc.summary,
            inclusions: sc.inclusions || [],
            badge: sc.badge,
            imageUrl: sc.imageUrl,
            keywords: sc.keywords || [],
            institutionTypes: sc.institutionTypes || [],
            relatedCardSlugs: sc.relatedCardSlugs || [],
            priority: sc.priority || 0,
            active: sc.active !== false,
          },
          create: {
            cardSlug: sc.cardSlug,
            targetSlug: sc.targetSlug,
            sectionAnchor: sc.sectionAnchor,
            categorySlug: sc.categorySlug,
            subcategorySlug: sc.subcategorySlug,
            secondaryCategorySlugs: sc.secondaryCategorySlugs || [],
            title: sc.title,
            summary: sc.summary,
            inclusions: sc.inclusions || [],
            badge: sc.badge,
            imageUrl: sc.imageUrl,
            keywords: sc.keywords || [],
            institutionTypes: sc.institutionTypes || [],
            relatedCardSlugs: sc.relatedCardSlugs || [],
            priority: sc.priority || 0,
            active: sc.active !== false,
          },
        }));
      }
      console.log(`✓ Search cards restored`);
    }

    // 8b. Restore Search Query Logs (Telemetry)
    if (data.searchQueryLogs && data.searchQueryLogs.length > 0) {
      console.log(`\n🔎 Restoring ${data.searchQueryLogs.length} Search Query Logs...`);
      for (const log of data.searchQueryLogs) {
        await withRetry(() => prisma.searchQueryLog.upsert({
          where: { id: log.id },
          update: {
            queryText: log.queryText,
            institutionType: log.institutionType,
            categorySlug: log.categorySlug,
            matchedCardSlugs: log.matchedCardSlugs || [],
            matchedCount: log.matchedCount || 0,
            confidenceScore: log.confidenceScore,
            userIp: log.userIp,
            converted: log.converted || false,
            createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
          },
          create: {
            id: log.id,
            queryText: log.queryText,
            institutionType: log.institutionType,
            categorySlug: log.categorySlug,
            matchedCardSlugs: log.matchedCardSlugs || [],
            matchedCount: log.matchedCount || 0,
            confidenceScore: log.confidenceScore,
            userIp: log.userIp,
            converted: log.converted || false,
            createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
          },
        }));
      }
      // Re-align the auto-increment sequence with the highest restored id
      await withRetry(() => prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"searchquerylog"', 'id'),
          coalesce((SELECT MAX("id") FROM "searchquerylog"), 1)
        );
      `));
      console.log(`✓ Search query logs restored and sequence synchronized`);
    }

    // 9. Mark System Bootstrapped
    await withRetry(() => prisma.siteContent.upsert({
      where: { key: 'system_bootstrapped' },
      update: { value: 'true' },
      create: { key: 'system_bootstrapped', value: 'true' },
    }));

    console.log('\n🎉 ALL DATABASE DATA RESTORED SUCCESSFULLY!');
    console.log('✅ Every page, product, category, blog, and CMS setting is ready for admin editing.');

  } catch (err) {
    console.error('❌ Restore error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDatabase();
