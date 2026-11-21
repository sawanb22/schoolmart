import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import fs from 'fs';
import { prisma } from '../src/lib/prisma';

async function seedOtherHubProducts() {
  console.log('Seeding other hub products (Mathematics, Science, Labs, Sports, Digital, etc.)...');
  const dataPath = path.resolve(__dirname, 'data', 'sportsurf_products.json');
  const allProducts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const categories = await prisma.category.findMany();
  const catSlugMap = new Map<string, number>();
  const catNameMap = new Map<string, number>();
  categories.forEach(c => {
    catSlugMap.set(c.slug.toLowerCase(), c.id);
    catNameMap.set(c.name.toLowerCase(), c.id);
  });

  const categoryAlias: Record<string, string> = {
    'digital infra': 'digital-infra',
    'architecture': 'architecture',
    'school designs': 'school-designs',
    'sports': 'sports',
    'science': 'science',
    'mathematics': 'mathematics',
    'labs': 'labs',
    'libraries': 'libraries',
    'environments': 'environments',
  };

  const otherProducts = allProducts.filter((p: any) => p.category && p.category.toLowerCase() !== 'furniture');
  console.log(`Found ${otherProducts.length} non-furniture products to process.`);

  let inserted = 0;
  let idx = 100;
  for (const item of otherProducts) {
    idx++;
    const rawCat = (item.category || '').toLowerCase().trim();
    const mappedSlug = categoryAlias[rawCat] || rawCat;
    const catId = catSlugMap.get(mappedSlug) || catNameMap.get(rawCat);

    if (!catId) {
      // Skip if category not matched
      continue;
    }

    let cleanName = item.name ? item.name.trim() : 'Institutional Campus Equipment';
    if (cleanName.toLowerCase() === 'unnamed card') {
      cleanName = item.subcategory ? `${item.subcategory} Solution Unit` : 'Modular School Facility Solution';
    }

    const cleanDescription = (item.description && item.description.trim().length > 5)
      ? item.description.trim()
      : `High-performance institutional equipment and setup designed to meet strict CBSE, ICSE, and international educational safety guidelines.`;

    const productSlug = item.slug ? item.slug.trim() : `prod-hub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const productSku = `SM-HUB-${String(idx).padStart(3, '0')}-${(item.id || 'ITEM').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;

    const imageUrl = item.image || item.images?.[0] || '/images/hero_furniture.png';
    const imagesJson = JSON.stringify(item.images && item.images.length > 0 ? item.images : [imageUrl]);

    try {
      await prisma.product.upsert({
        where: { slug: productSlug },
        update: {
          name: cleanName,
          sku: productSku,
          description: cleanDescription,
          categoryId: catId,
          imageUrl: imageUrl,
          images: imagesJson,
          active: true,
        },
        create: {
          name: cleanName,
          slug: productSlug,
          sku: productSku,
          description: cleanDescription,
          price: 0.0,
          categoryId: catId,
          imageUrl: imageUrl,
          images: imagesJson,
          active: true,
          featured: item.isFeatured || false,
          rating: 4.9,
          reviewCount: 8,
          stock: 25
        }
      });
      inserted++;
    } catch (e: any) {
      // Ignore individual collision errors
    }
  }

  console.log(`✅ Upserted ${inserted} hub products into database.`);
  const totalInDb = await prisma.product.count();
  console.log(`Total Products in Database now: ${totalInDb}`);
}

seedOtherHubProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
