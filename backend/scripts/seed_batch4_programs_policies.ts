import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface ProgramPolicyItem {
  slug: string;
  cleanSlug: string;
  title: string;
  template?: string;
  badge?: string;
  heroEyebrow?: string;
  category?: string;
  taxonomy?: string[];
  tags?: string[];
  hero?: Record<string, any>;
  heroImg?: string;
  image?: string;
  heroImage?: string;
  heading?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  cardDescription?: string;
  description?: string;
  content: string;
  body?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  ctaBtnBg?: string;
  ctaBtnText?: string;
  hideCta?: boolean;
  styles?: Record<string, any>;
  blocks?: Record<string, any>;
}

async function upsertWithRetry(slug: string, title: string, template: string, content: string, pageDataStr: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const pageRecord = await prisma.page.upsert({
        where: { slug },
        update: {
          title,
          template,
          content,
          pageData: pageDataStr,
          published: true,
        },
        create: {
          slug,
          title,
          template,
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
  console.log('🌱 SEEDING BATCH 4: 25 PROGRAMS & POLICIES INTO NEON POSTGRESQL 🌱');
  console.log('========================================================================\n');

  const jsonPath = path.resolve(__dirname, 'data', 'sportsurf_batch4_programs_policies.json');
  console.log(`[INFO] Reading dataset from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset file not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const items: ProgramPolicyItem[] = JSON.parse(raw);
  console.log(`[PASS] Loaded ${items.length} program & policy items from dataset.\n`);

  let upsertedCount = 0;
  const seededSlugs: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const heroImg = item.heroImg || item.image || '';
    const image = item.image || item.heroImg || '';
    const title = item.title;
    const template = item.template || 'article';
    const description = item.description || item.cardDescription || '';
    const content = item.content || item.body || '';
    const ctaTitle = item.ctaTitle || 'Ready to Elevate Your Educational Infrastructure?';
    const ctaSubtitle = item.ctaSubtitle || 'Connect with SchoolMart consortium experts for customized specifications, institutional pricing, and procurement.';
    const ctaButtonLabel = item.ctaButtonLabel || 'Contact Us';
    const ctaHref = item.ctaHref || '/contact-us';
    const badge = item.badge || 'Institutional';
    const taxonomy = item.taxonomy || ['Institutional', 'Programs & Policies'];
    const blocks = item.blocks || {};

    const pageDataObject: Record<string, any> = {
      badge: badge,
      image: image,
      hero: item.hero || {},
      heroImg: heroImg,
      heading: title,
      description: description,
      blocks: blocks,
      ctaTitle: ctaTitle,
      ctaSubtitle: ctaSubtitle,
      ctaButtonLabel: ctaButtonLabel,
      ctaHref: ctaHref,
      body: content,
      // Compatibility fields for GenericPageRenderer and custom page templates
      heroImage: heroImg,
      heroTitle: (item.hero && item.hero.title) || item.heroTitle || title,
      heroSubtitle: (item.hero && item.hero.subtitle) || item.heroSubtitle || description,
      heroEyebrow: item.heroEyebrow || badge,
      heroBadge: badge,
      pageTitle: title,
      category: item.category || 'Institutional',
      taxonomy: taxonomy,
      tags: item.tags || taxonomy,
      content: content,
      ctaButtonHref: ctaHref,
      ctaBtnBg: item.ctaBtnBg || '#002a6c',
      ctaBtnText: item.ctaBtnText || '#ffffff',
      hideCta: item.hideCta ?? false,
      styles: item.styles || { ctaBg: '#002a6c' },
      btn1Label: ctaButtonLabel,
      btn1Path: ctaHref
    };

    // If blocks contain stats, expose top-level stats for aboutus/other templates
    if (blocks.page_stats?.data?.stats && Array.isArray(blocks.page_stats.data.stats)) {
      pageDataObject.stats = blocks.page_stats.data.stats;
    }

    const pageDataStr = JSON.stringify(pageDataObject);

    const slugsToSeed: Array<{ slug: string; type: string }> = [
      { slug: item.slug, type: 'primarySlug' }
    ];

    if (item.cleanSlug && item.cleanSlug !== item.slug) {
      slugsToSeed.push({ slug: item.cleanSlug, type: 'cleanSlugAlias' });
    }

    console.log(`[${i + 1}/${items.length}] Processing: "${item.title}"`);

    for (const { slug, type } of slugsToSeed) {
      if (!slug) continue;
      const pageRecord = await upsertWithRetry(slug, title, template, content, pageDataStr);
      console.log(`   ✅ Upserted [${type}]: slug="${pageRecord!.slug}" (ID: ${pageRecord!.id})`);
      upsertedCount++;
      seededSlugs.push(pageRecord!.slug);
    }
  }

  const totalPagesInDb = await prisma.page.count();

  console.log('\n========================================================================');
  console.log(`🎉 COMPLETED BATCH 4 PROGRAMS & POLICIES SEEDING!`);
  console.log(`- Dataset Pages Processed: ${items.length}`);
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
