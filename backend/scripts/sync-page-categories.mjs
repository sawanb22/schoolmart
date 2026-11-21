import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function run() {
  console.log('--- Starting Safe Category Synchronization to SSOT ---');
  
  const pages = await prisma.page.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      pageData: true,
    },
    orderBy: { slug: 'asc' },
  });

  console.log(`Inspecting ${pages.length} pages in database...`);

  let updatedCount = 0;

  for (const page of pages) {
    let pd = {};
    try {
      pd = typeof page.pageData === 'string' ? JSON.parse(page.pageData || '{}') : (page.pageData || {});
    } catch (e) {
      console.warn(`Could not parse JSON for page ${page.slug}, skipping.`);
      continue;
    }

    const explicitCats = Array.isArray(pd.categories)
      ? pd.categories.filter(Boolean).map(c => String(c).trim()).filter(Boolean)
      : [];
    const existingSet = new Set(explicitCats.map(c => c.toLowerCase()));

    const cards = Array.isArray(pd.cards) ? pd.cards : [];
    const missingCats = [];

    for (const card of cards) {
      const rawCats = Array.isArray(card?.categories)
        ? card.categories
        : card?.category
        ? [card.category]
        : [];
      
      for (const c of rawCats) {
        if (c && typeof c === 'string') {
          const trimmed = c.trim();
          if (trimmed && !existingSet.has(trimmed.toLowerCase())) {
            existingSet.add(trimmed.toLowerCase());
            missingCats.push(trimmed);
          }
        }
      }
    }

    if (missingCats.length > 0) {
      const mergedCategories = [...explicitCats, ...missingCats];
      const updatedPageData = {
        ...pd,
        categories: mergedCategories,
      };

      await prisma.page.update({
        where: { id: page.id },
        data: {
          pageData: JSON.stringify(updatedPageData),
        },
      });

      console.log(`✓ Synchronized /${page.slug} ("${page.title}"): added ${missingCats.length} category(s): [${missingCats.join(', ')}]`);
      updatedCount++;
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Successfully synchronized ${updatedCount} page(s) to Categories Hub SSOT.`);
}

run()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
