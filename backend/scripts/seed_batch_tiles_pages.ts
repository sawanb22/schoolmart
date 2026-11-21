import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface PageItem {
  title: string;
  clientSlug: string;
  apiSlug: string;
  image: string;
  badge: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  innerData?: {
    content?: string;
    description?: string;
    specs?: any[];
    tags?: string[];
    heading?: string;
    heroImg?: string;
    btn1Label?: string;
    btn1Path?: string;
    btn2Label?: string;
    btn2Path?: string;
    ctaTitle?: string;
    ctaSubtitle?: string;
    ctaButtonLabel?: string;
    ctaHref?: string;
    blocks?: Record<string, any>;
  };
}

async function upsertWithRetry(slug: string, title: string, content: string, pageDataStr: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pageRecord = await prisma.page.upsert({
        where: { slug },
        update: {
          title,
          template: 'article',
          content,
          pageData: pageDataStr,
          published: true,
        },
        create: {
          slug,
          title,
          template: 'article',
          content,
          pageData: pageDataStr,
          published: true,
        }
      });
      return pageRecord;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`   ⚠️ Attempt ${attempt} failed for slug "${slug}", retrying in 1s...`);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('🌱 SEEDING BATCH TILES PAGES INTO NEON POSTGRESQL (PAGE TABLE) 🌱');
  console.log('================================================================\n');

  const jsonPath = path.resolve(__dirname, 'data', 'sportsurf_batch_tiles_pages.json');
  console.log(`[INFO] Reading dataset from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset file not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const items: PageItem[] = JSON.parse(raw);
  console.log(`[PASS] Loaded ${items.length} page items from dataset.\n`);

  let upsertedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const heroImg = (item.innerData?.heroImg && item.innerData.heroImg.trim()) || item.image;
    const heading = (item.innerData?.heading && item.innerData.heading.trim()) || item.title;
    const description = item.innerData?.description || '';
    const specs = item.innerData?.specs || [];
    const tags = item.innerData?.tags || [];
    const btn1Label = (item.innerData?.btn1Label && item.innerData.btn1Label.trim()) || 'Book Consultation';
    const btn1Path = (item.innerData?.btn1Path && item.innerData.btn1Path.trim()) || '/contact-us';
    const blocks = item.innerData?.blocks || {};
    const content = item.innerData?.content || '';

    const ctaTitle = item.ctaTitle || item.innerData?.ctaTitle || '';
    const ctaSubtitle = item.ctaSubtitle || item.innerData?.ctaSubtitle || '';
    const ctaButtonLabel = item.ctaButtonLabel || item.innerData?.ctaButtonLabel || btn1Label;
    const ctaHref = item.ctaHref || item.innerData?.ctaHref || btn1Path;

    const pageDataObject = {
      badge: item.badge,
      image: item.image,
      heroImg,
      heading,
      description,
      specs,
      tags,
      btn1Label: ctaButtonLabel,
      btn1Path: ctaHref,
      ctaTitle,
      ctaSubtitle,
      ctaButtonLabel,
      ctaHref,
      ctaButtonHref: ctaHref,
      hideCta: false,
      styles: {
        ctaBg: '#002a6c'
      },
      blocks,
      taxonomy: ['Institutional', 'Guide', '2026 Spec'],
      technicalParameters: [
        { label: 'Technical Parameters', desc: 'Standardized specifications & turnkey architectural compliance' },
        { label: 'Value Engineering', desc: 'Direct-from-factory procurement with standardized quality assurance' },
        { label: 'Turnkey Installation', desc: 'End-to-end execution, civil integration, testing, and faculty training' }
      ],
      // Compatibility fields for GenericPageRenderer
      heroImage: heroImg,
      heroTitle: heading,
      heroEyebrow: item.badge,
      category: item.badge,
      body: content,
      ctaButtonLabel: ctaButtonLabel,
      ctaButtonHref: ctaHref
    };

    const pageDataStr = JSON.stringify(pageDataObject);

    const slugsToSeed = [
      { slug: item.clientSlug, type: 'clientSlug' },
      { slug: item.apiSlug, type: 'apiSlug' }
    ];

    console.log(`[${i + 1}/${items.length}] Processing: "${item.title}"`);

    for (const { slug, type } of slugsToSeed) {
      const pageRecord = await upsertWithRetry(slug, item.title, content, pageDataStr);
      console.log(`   ✅ Upserted [${type}]: slug="${pageRecord!.slug}" (ID: ${pageRecord!.id})`);
      upsertedCount++;
    }
  }

  const totalPagesInDb = await prisma.page.count();

  console.log('\n================================================================');
  console.log(`🎉 COMPLETED BATCH TILES SEEDING!`);
  console.log(`- Dataset Items: ${items.length}`);
  console.log(`- Total Slugs Upserted: ${upsertedCount}`);
  console.log(`- Total Pages In Neon Database: ${totalPagesInDb}`);
  console.log('================================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
