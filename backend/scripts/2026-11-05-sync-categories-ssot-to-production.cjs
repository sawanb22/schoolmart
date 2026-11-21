/**
 * PRODUCTION DATABASE MIGRATION SCRIPT
 * Date: 2026-11-05
 * Feature: Categories Hub Single Source of Truth (SSOT) & Homepage Resources Alignment
 * 
 * Execution on cPanel Production:
 *   cd /home/ideascom/campusmart-api
 *   node scripts/2026-11-05-sync-categories-ssot-to-production.cjs
 * 
 * Safe & Idempotent:
 *   - Only appends missing categories to pageData.categories from existing cards.
 *   - Never deletes or overwrites existing cards, hero images, titles, or URLs.
 *   - Safe to run multiple times (rerunning causes zero diff once synchronized).
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the current or parent directory .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log(' CampusMart Production Migration: Categories SSOT & Alignment   ');
  console.log(' Date: 2026-11-05                                               ');
  console.log('================================================================\n');

  // PART 1: PAGE CATEGORIES SYNCHRONIZATION
  console.log('[1/2] Scanning showcase pages for stranded card categories...');
  const pages = await prisma.page.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      pageData: true,
    },
    orderBy: { slug: 'asc' },
  });

  console.log(`Found ${pages.length} total pages in database.`);
  let updatedPagesCount = 0;

  for (const page of pages) {
    let pd = {};
    try {
      pd = typeof page.pageData === 'string' ? JSON.parse(page.pageData || '{}') : (page.pageData || {});
    } catch (e) {
      console.warn(`[WARN] Could not parse JSON for page ${page.slug}, skipping.`);
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

      console.log(`  ✓ Updated /${page.slug} ("${page.title}"):`);
      console.log(`    Before: ${explicitCats.length} categories -> After: ${mergedCategories.length} categories`);
      console.log(`    Added: [${missingCats.join(', ')}]`);
      updatedPagesCount++;
    }
  }

  if (updatedPagesCount === 0) {
    console.log('  ● All pages are already fully synchronized to Categories Hub SSOT.');
  } else {
    console.log(`\n  Successfully synchronized ${updatedPagesCount} page(s) to Categories Hub SSOT.`);
  }

  // PART 2: HOMEPAGE RESOURCES 7TH CARD VERIFICATION
  console.log('\n[2/2] Verifying Homepage Resources (7 cards)...');
  try {
    const resourceRow = await prisma.siteContent.findUnique({
      where: { key: 'home_resources' },
    });

    if (resourceRow && resourceRow.value) {
      let resources = [];
      try {
        resources = JSON.parse(resourceRow.value);
      } catch (e) {
        resources = [];
      }

      if (Array.isArray(resources)) {
        const hasCard7 = resources.some(
          r => (r.title || '').toLowerCase().includes('student recreation') || (r.title || '').toLowerCase().includes('common rooms')
        );

        if (!hasCard7) {
          resources.push({
            title: 'Student Recreation & Common Rooms',
            description: 'Modern indoor games, acoustic lounges, and wellness recreation hubs designed for student relaxation.',
            icon: 'Activity',
            link: '/sports-infra',
            linkText: 'Explore Recreation',
            tag: 'Student Life',
          });

          await prisma.siteContent.update({
            where: { key: 'home_resources' },
            data: { value: JSON.stringify(resources) },
          });
          console.log('  ✓ Added 7th card "Student Recreation & Common Rooms" to home_resources.');
        } else {
          console.log(`  ✓ home_resources already has ${resources.length} cards including Student Recreation.`);
        }
      }
    } else {
      console.log('  ● home_resources row not present; defaults are handled by frontend.');
    }
  } catch (err) {
    console.warn('  [WARN] Non-fatal check on home_resources:', err.message);
  }

  console.log('\n================================================================');
  console.log(' Production Migration Completed Successfully!                   ');
  console.log('================================================================');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
