const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HUB_CATEGORY_MAPPING = {
  'campus-design-execution': 'build-new',
  'campus-design': 'build-new',
  'setup-college': 'build-new',
  'new-environments': 'build-new',
  'sports-infra': 'build-new',
  'sports-design-execution': 'build-new',
  'furniture': 'upgrade',
  'furniture-design-supply': 'upgrade',
  'collaboration': 'upgrade',
  'smart-classrooms': 'smart-campus',
  'tech-infra': 'smart-campus',
  'campus-automation': 'smart-campus',
  'digital-transformation': 'smart-campus',
  'libraries': 'smart-campus',
  'library-management': 'smart-campus',
  'lms': 'smart-campus',
  'assessment-system': 'smart-campus',
  'ai-guide': 'innovation',
  'ai-ml': 'innovation',
  'ai-stations': 'innovation',
  'ai-digital-design-supply': 'innovation',
  'labs': 'innovation',
  'innovation': 'innovation',
  'innovation-centres': 'innovation',
  'ar-vr-experiences': 'innovation',
  'resources': 'accreditation',
  'ugc-guidelines': 'accreditation',
  'partner-with-colleges': 'admissions',
  'partnership': 'admissions',
  'classifieds': 'admissions',
  'colleges-universities-for-sale': 'admissions',
};

const PRODUCT_CATEGORY_MAPPING = {
  'furniture': 'upgrade',
  'technology': 'smart-campus',
  'labs': 'innovation',
  'library': 'smart-campus',
  'sports': 'build-new',
};

async function seedCategories() {
  console.log('================================================================');
  console.log('🚀 SEEDING HUB PAGE & PRODUCT CATEGORIES INTO NEON POSTGRESQL');
  console.log('================================================================\n');

  // 1. Seed CMS Hub Pages
  let pagesUpdated = 0;
  for (const [slug, category] of Object.entries(HUB_CATEGORY_MAPPING)) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.log(`⚠️  Page /${slug} not found in DB - skipping`);
      continue;
    }

    let pageData = {};
    try {
      pageData = typeof page.pageData === 'string' ? JSON.parse(page.pageData || '{}') : (page.pageData || {});
    } catch {
      pageData = {};
    }

    pageData.category = category;

    await prisma.page.update({
      where: { id: page.id },
      data: {
        pageData: JSON.stringify(pageData),
      },
    });

    console.log(`✓ Page /${slug.padEnd(30)} -> Category: [${category}]`);
    pagesUpdated++;
  }
  console.log(`\n🎉 Successfully seeded ${pagesUpdated} CMS Hub Pages with their primary category!\n`);

  // 2. Seed Products
  const products = await prisma.product.findMany({
    include: { category: true },
  });

  let productsUpdated = 0;
  for (const prod of products) {
    const catSlug = (prod.category?.slug || '').toLowerCase();
    const catName = (prod.category?.name || '').toLowerCase();
    const prodName = prod.name.toLowerCase();

    let targetObjective = 'upgrade'; // Default
    if (catSlug.includes('tech') || catName.includes('tech') || prodName.includes('smart') || prodName.includes('display')) {
      targetObjective = 'smart-campus';
    } else if (catSlug.includes('lab') || catName.includes('lab') || prodName.includes('stem') || prodName.includes('robot')) {
      targetObjective = 'innovation';
    } else if (catSlug.includes('lib') || catName.includes('lib') || prodName.includes('book') || prodName.includes('rfid')) {
      targetObjective = 'smart-campus';
    } else if (catSlug.includes('sport') || catName.includes('sport') || prodName.includes('turf') || prodName.includes('court')) {
      targetObjective = 'build-new';
    } else if (catSlug.includes('furn') || catName.includes('furn') || prodName.includes('chair') || prodName.includes('desk') || prodName.includes('bench')) {
      targetObjective = 'upgrade';
    }

    // Merge into specifications
    let specs = {};
    if (prod.specifications) {
      try {
        if (typeof prod.specifications === 'string' && prod.specifications.startsWith('{')) {
          specs = JSON.parse(prod.specifications);
        } else if (typeof prod.specifications === 'string') {
          prod.specifications.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const k = parts[0].trim();
              const v = parts.slice(1).join(':').trim();
              if (k) specs[k] = v;
            }
          });
        }
      } catch {}
    }

    specs.searchObjective = targetObjective;

    await prisma.product.update({
      where: { id: prod.id },
      data: {
        specifications: JSON.stringify(specs),
      },
    });

    console.log(`✓ Product [${prod.name.slice(0, 32).padEnd(32)}] (Cat: ${(prod.category?.name || 'N/A').padEnd(16)}) -> Objective: [${targetObjective}]`);
    productsUpdated++;
  }

  console.log(`\n🎉 Successfully seeded ${productsUpdated} Products with their primary search objective!\n`);
  console.log('================================================================');
  console.log('✅ DATABASE CATEGORY PRE-SEEDING COMPLETE');
  console.log('================================================================');
}

seedCategories()
  .catch((err) => {
    console.error('Fatal error seeding categories:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
