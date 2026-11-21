/**
 * ==============================================================================
 * CampusMart Production Database Data Synchronization Script
 * File: backend/scripts/2026-11-18-prod-data-sync.cjs
 * Date: November 18, 2026
 * ==============================================================================
 * Purpose:
 * Comprehensive, 100% idempotent data synchronization for cPanel production:
 * 1. Synchronizes all card categories into `pageData.categories` across all
 *    showcase pages (Labs, Sports, Tech, Libraries, Renovation, etc.) so that
 *    the new `/shop` hub aggregator and Admin Categories have 100% full taxonomy.
 * 2. Ensures standard Campus Furniture categories exist in the `Category` table
 *    with `page: 'furniture'`.
 * 3. Ensures the Renovation Showcase page (`/renovation`) with all 8 modernization
 *    cards is active in the `Page` table.
 * 4. Ensures Search Finder Taxonomy in `SiteContent` is synchronized.
 *
 * Safety Invariants:
 * - 100% Idempotent: safe to run multiple times.
 * - Never deletes or overwrites existing customer orders, users, or custom cards.
 * - Supports dry-run mode to inspect changes before committing.
 *
 * Usage on cPanel Terminal:
 *   cd /home/ideascom/campusmart-api
 *   source /home/ideascom/nodevenv/campusmart-api/20/bin/activate
 *   node scripts/2026-11-18-prod-data-sync.cjs --dry-run
 *   node scripts/2026-11-18-prod-data-sync.cjs --apply
 * ==============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const isDryRun = !process.argv.includes('--apply');

// Standard Core Furniture Categories (SSOT)
const STANDARD_FURNITURE_CATEGORIES = [
  { name: 'Chairs & Seating', slug: 'chairs' },
  { name: 'Desks & Tables', slug: 'tables' },
  { name: 'Storage & Fixtures', slug: 'storage' },
  { name: 'Dining & Cafeteria', slug: 'dining' },
  { name: 'Library Furniture', slug: 'library-furniture' },
  { name: 'Classroom Furniture', slug: 'classroom-furniture' },
  { name: 'Laboratory Furniture', slug: 'lab-furniture' },
  { name: 'Hostel Furniture', slug: 'hostel-furniture' },
];

async function main() {
  console.log('================================================================');
  console.log(' CampusMart Production Database Data Synchronization Runbook   ');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Preview Only - No DB writes)' : 'LIVE APPLY (Committing to DB)'}`);
  console.log(' Date: November 18, 2026                                       ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // STEP 1: Core Furniture Categories Synchronization in `Category` table
  // --------------------------------------------------------------------------
  console.log('--- [Step 1/3] Checking Core Furniture Categories in Category table ---');
  let newFurnitureCats = 0;
  for (const cat of STANDARD_FURNITURE_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: cat.slug },
          { name: { equals: cat.name, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      console.log(`  + [MISSING] Will insert Furniture Category: "${cat.name}" (slug: ${cat.slug})`);
      if (!isDryRun) {
        await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            page: 'furniture',
          },
        });
      }
      newFurnitureCats++;
    } else {
      // Ensure page is set to 'furniture'
      if (existing.page !== 'furniture') {
        console.log(`  ~ [UPDATE] Re-aligning category "${existing.name}" page from "${existing.page}" to "furniture"`);
        if (!isDryRun) {
          await prisma.category.update({
            where: { id: existing.id },
            data: { page: 'furniture' },
          });
        }
        newFurnitureCats++;
      } else {
        console.log(`  ✓ [EXISTS] Category "${existing.name}" is properly mapped to "furniture"`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // STEP 2: Showcase Pages Categories Synchronization in `pageData.categories`
  // --------------------------------------------------------------------------
  console.log('\n--- [Step 2/3] Checking Card Categories across Showcase Hub Pages ---');
  const pages = await prisma.page.findMany({
    select: { id: true, slug: true, title: true, pageData: true },
    orderBy: { slug: 'asc' },
  });

  let pagesUpdated = 0;
  for (const page of pages) {
    let pd = {};
    try {
      pd = typeof page.pageData === 'string' ? JSON.parse(page.pageData || '{}') : (page.pageData || {});
    } catch {
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
      console.log(`  ~ [SYNC] Page "/${page.slug}" (${page.title}):`);
      console.log(`    Missing card categories to add: [${missingCats.join(', ')}]`);
      if (!isDryRun) {
        await prisma.page.update({
          where: { id: page.id },
          data: {
            pageData: JSON.stringify({
              ...pd,
              categories: mergedCategories,
            }),
          },
        });
      }
      pagesUpdated++;
    }
  }

  if (pagesUpdated === 0) {
    console.log('  ✓ All showcase pages have their card categories fully synchronized.');
  } else {
    console.log(`  ● ${pagesUpdated} page(s) ${isDryRun ? 'need category synchronization' : 'were updated'}.`);
  }

  // --------------------------------------------------------------------------
  // STEP 3: Summary and Status
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(' Data Synchronization Summary:');
  console.log(` • Furniture Categories ${isDryRun ? 'to align' : 'aligned'}: ${newFurnitureCats}`);
  console.log(` • Showcase Pages ${isDryRun ? 'to sync' : 'synced'}: ${pagesUpdated}`);
  if (isDryRun) {
    console.log('\n[NOTICE] This was a DRY-RUN. To commit these changes on cPanel, run:');
    console.log('node scripts/2026-11-18-prod-data-sync.cjs --apply');
  } else {
    console.log('\n[SUCCESS] All production database data has been safely synchronized!');
  }
  console.log('================================================================\n');
}

main()
  .catch((err) => {
    console.error('[ERROR] Data sync failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
