import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface EnvironmentItem {
  slug: string;
  cleanSlug: string;
  title: string;
  heroImg?: string;
  image?: string;
  badge?: string;
  cardDescription?: string;
  description?: string;
  originalDescription?: string;
  content: string;
  body?: string;
  technicalParameters?: Array<{ label: string; desc: string }>;
  specs?: any[];
  taxonomy?: string[];
  tags?: string[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  hubSlug?: string;
  hubTitle?: string;
  btn1Label?: string;
  btn1Path?: string;
  btn2Label?: string;
  btn2Path?: string;
  styles?: Record<string, any>;
  blocks?: Record<string, any>;
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
  console.log('========================================================================');
  console.log('🌱 SEEDING BATCH 3: 15 LEARNING ENVIRONMENTS INTO NEON POSTGRESQL 🌱');
  console.log('========================================================================\n');

  const jsonPath = path.resolve(__dirname, 'data', 'sportsurf_batch3_environments.json');
  console.log(`[INFO] Reading dataset from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset file not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const items: EnvironmentItem[] = JSON.parse(raw);
  console.log(`[PASS] Loaded ${items.length} specialized environment items from dataset.\n`);

  let upsertedCount = 0;
  const seededSlugs: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const heroImg = item.heroImg || item.image || '';
    const image = item.image || item.heroImg || '';
    const title = item.title;
    const description = item.description || item.cardDescription || '';
    const technicalParameters = item.technicalParameters || [];
    const specs = item.specs || item.technicalParameters || [];
    const taxonomy = item.taxonomy || ['Learning Environments', 'Architecture', '2026 Spec'];
    const ctaTitle = item.ctaTitle || 'Ready to Transform Your Campus Learning Environment?';
    const ctaSubtitle = item.ctaSubtitle || 'Consult with our educational architects for turnkey spatial design and equipment procurement.';
    const ctaButtonLabel = item.ctaButtonLabel || 'Request Consultation';
    const ctaHref = item.ctaHref || '/contact-us';
    const content = item.content || item.body || '';

    const pageDataObject = {
      badge: 'Learning Environment',
      image: image,
      heroImg: heroImg,
      heading: title,
      description: description,
      specs: specs,
      technicalParameters: technicalParameters,
      taxonomy: taxonomy,
      ctaTitle: ctaTitle,
      ctaSubtitle: ctaSubtitle,
      ctaButtonLabel: ctaButtonLabel,
      ctaHref: ctaHref,
      hubSlug: 'environments',
      hubTitle: 'Learning Environments',
      // Compatibility fields for GenericPageRenderer
      heroImage: heroImg,
      heroTitle: title,
      heroEyebrow: 'Learning Environment',
      category: 'Learning Environments',
      body: content,
      content: content,
      ctaButtonHref: ctaHref,
      hideCta: false,
      styles: {
        ctaBg: '#002a6c'
      },
      tags: item.tags || taxonomy,
      btn1Label: ctaButtonLabel,
      btn1Path: ctaHref
    };

    const pageDataStr = JSON.stringify(pageDataObject);

    const slugsToSeed = [
      { slug: item.slug, type: 'environmentSlug' },
      { slug: item.cleanSlug, type: 'cleanSlug' }
    ];

    console.log(`[${i + 1}/${items.length}] Processing: "${item.title}"`);

    for (const { slug, type } of slugsToSeed) {
      if (!slug) continue;
      const pageRecord = await upsertWithRetry(slug, title, content, pageDataStr);
      console.log(`   ✅ Upserted [${type}]: slug="${pageRecord!.slug}" (ID: ${pageRecord!.id})`);
      upsertedCount++;
      seededSlugs.push(pageRecord!.slug);
    }
  }

  const totalPagesInDb = await prisma.page.count();

  console.log('\n========================================================================');
  console.log(`🎉 COMPLETED BATCH 3 LEARNING ENVIRONMENTS SEEDING!`);
  console.log(`- Dataset Environments: ${items.length}`);
  console.log(`- Total Slugs Upserted: ${upsertedCount}`);
  console.log(`- Total Pages Currently in Neon DB: ${totalPagesInDb}`);
  console.log('========================================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
