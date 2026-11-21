const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =========================================================================
// 1. CTA DEFINITIONS FOR BATCH 1 DYNAMIC TILE PAGES (16 PAGES)
// =========================================================================
const BATCH1_CTA_MAP = {
  'immersive-learning': {
    ctaTitle: 'Ready to Deploy Immersive Learning at Your School?',
    ctaSubtitle: 'Connect with our campus infrastructure specialists for turnkey equipment sizing, immersive VR/AR room design, and institutional procurement proposals.',
    ctaButtonLabel: 'Request Institutional Proposal',
    ctaHref: '/contact-us',
  },
  'kindergarten-design': {
    ctaTitle: 'Designing an Inspiring Early Childhood Learning Space?',
    ctaSubtitle: 'Speak with our educational architects for child-safe spatial planning, biophilic kindergarten layouts, and turnkey institutional equipment packages.',
    ctaButtonLabel: 'Schedule Design Consultation',
    ctaHref: '/contact-us',
  },
  'composite-skill-lab': {
    ctaTitle: 'Set Up NEP 2020 Compliant Composite Skill Labs',
    ctaSubtitle: 'Equip your campus with multidisciplinary vocational equipment, robotics benches, and industrial-grade workbenches mapped to national curriculum standards.',
    ctaButtonLabel: 'Request Lab Setup Guide',
    ctaHref: '/contact-us',
  },
  'library-innovations': {
    ctaTitle: 'Transform Your Campus Library into a Dynamic Media Hub',
    ctaSubtitle: 'Integrate automated RFID book management, acoustic focus pods, collaborative study commons, and modern ergonomic library furniture.',
    ctaButtonLabel: 'Consult Library Specialists',
    ctaHref: '/contact-us',
  },
  'furniture-design-planning-': {
    ctaTitle: 'Plan Ergonomic & Modular Campus Furniture',
    ctaSubtitle: 'Work with our classroom interior planning specialists for density optimization, durable BIFMA-certified furniture, and factory-direct institutional supply.',
    ctaButtonLabel: 'Get Furniture Sizing Plan',
    ctaHref: '/contact-us',
  },
  'sellning-or-buying-a-school': {
    ctaTitle: 'Confidential Campus Acquisition & Divestment Advisory',
    ctaSubtitle: 'Consult senior institutional transaction advisors for compliant infrastructure valuation, regulatory due diligence, and verified trust matchmaking.',
    ctaButtonLabel: 'Book Confidential Advisory',
    ctaHref: '/contact-us',
  },
  'gamified-math-lab': {
    ctaTitle: 'Transform Abstract Math into Hands-On Discovery',
    ctaSubtitle: 'Equip your institution with experiential mathematical manipulatives, interactive problem-solving kits, and syllabus-mapped lab modules.',
    ctaButtonLabel: 'Request Math Lab Proposal',
    ctaHref: '/contact-us',
  },
  'interactivities-walls': {
    ctaTitle: 'Turn Empty Campus Corridors into Interactive Learning Walls',
    ctaSubtitle: 'Explore durable tactile sensory surfaces, magnetic STEM discovery panels, and active touch-responsive installations engineered for heavy school traffic.',
    ctaButtonLabel: 'Explore Wall Systems',
    ctaHref: '/contact-us',
  },
  '16-latetest-': {
    ctaTitle: 'Upgrade Classrooms with Next-Gen Interactive Flat Panels',
    ctaSubtitle: 'Compare 65"-86" 4K touch displays, dual-OS Android/Windows capabilities, anti-glare toughened glass specs, and bulk institutional pricing.',
    ctaButtonLabel: 'Compare Panel Specs & Quotes',
    ctaHref: '/contact-us',
  },
  '20-ai-tools': {
    ctaTitle: 'Integrate Safe & Pedagogically Vetted AI in Classrooms',
    ctaSubtitle: 'Receive an institutional AI readiness assessment, teacher empowerment roadmaps, and enterprise-grade privacy-safe AI tool deployment.',
    ctaButtonLabel: 'Schedule AI Strategy Call',
    ctaHref: '/contact-us',
  },
  'the-best-': {
    ctaTitle: 'Select & Implement the Ideal Early Years Curriculum',
    ctaSubtitle: 'Access expert curriculum mapping across NEP Foundational Stage, Montessori, and Reggio Emilia frameworks, paired with classroom teaching aids.',
    ctaButtonLabel: 'Consult Early Years Advisor',
    ctaHref: '/contact-us',
  },
  'gamified-science-lab': {
    ctaTitle: 'Ignite Scientific Curiosity with Hands-On Science Labs',
    ctaSubtitle: 'Deploy safety-compliant student experimentation benches, digital data-logger probes, and modular experiment kits mapped to CBSE, ICSE, and IB.',
    ctaButtonLabel: 'Request Science Lab Catalog',
    ctaHref: '/contact-us',
  },
  'smart-sports': {
    ctaTitle: 'Build World-Class Athletic Infrastructure on Campus',
    ctaSubtitle: 'Partner with SportSurf for FIFA/ITF-certified synthetic turf, shock-absorbing indoor athletic floors, multi-sport courts, and turnkey maintenance.',
    ctaButtonLabel: 'Book Sports Facility Audit',
    ctaHref: '/contact-us',
  },
  'complete-school-setup': {
    ctaTitle: 'Planning a Greenfield School or Large Campus Expansion?',
    ctaSubtitle: "Leverage SchoolMart's 360° setup advisory covering statutory norms, master planning, lab & library fit-outs, and factory-direct procurement.",
    ctaButtonLabel: 'Schedule Master Advisory',
    ctaHref: '/contact-us',
  },
  'talks-to-us': {
    ctaTitle: 'Accelerate Your Campus Digital Transformation',
    ctaSubtitle: 'Speak directly with senior educational technologists to design an integrated digital master plan for campus Wi-Fi, smart displays, and blended classrooms.',
    ctaButtonLabel: 'Book 1-on-1 Strategy Session',
    ctaHref: '/contact-us',
  },
  'wondergartens': {
    ctaTitle: 'Bring Wondergartens Nature-Inspired Spaces to Your Campus',
    ctaSubtitle: 'Design biophilic play landscapes, natural timber gross-motor structures, and sensory exploration zones that nurture holistic early childhood growth.',
    ctaButtonLabel: 'Plan Wondergarten Concept',
    ctaHref: '/contact-us',
  },
};

// =========================================================================
// 2. CTA & METADATA DEFINITIONS FOR BATCH 2 CATEGORY HUBS (9 HUBS)
// =========================================================================
const BATCH2_HUB_CONFIGS = [
  {
    key: 'school-building-design',
    slug: 'school-building-design',
    title: 'Architecture',
    template: 'solution-hub',
    ctaTitle: 'Design a Future-Ready Campus Architecture',
    ctaSubtitle: 'Partner with master educational architects to create sustainable, energy-efficient, and curriculum-aligned physical school infrastructure.',
    ctaButtonLabel: 'Consult Campus Architects',
    ctaHref: '/contact-us',
  },
  {
    key: 'digital',
    slug: 'digital',
    title: 'Digital Infra',
    template: 'solution-hub',
    ctaTitle: 'Equip Classrooms with High-Performance Digital Infrastructure',
    ctaSubtitle: 'From enterprise interactive flat panels to campus-wide 1:1 tablet deployments, get direct institutional pricing and turnkey technical setup.',
    ctaButtonLabel: 'Request Digital Infra Proposal',
    ctaHref: '/contact-us',
  },
  {
    key: 'environments',
    slug: 'environments',
    title: 'Environments Hub',
    template: 'solution-hub',
    ctaTitle: 'Create Dynamic, Safe & Inspiring Learning Environments',
    ctaSubtitle: 'Consult our spatial design team to configure specialized activity rooms, dining halls, rumpus rooms, and acoustically treated auditoriums.',
    ctaButtonLabel: 'Schedule Environments Audit',
    ctaHref: '/contact-us',
  },
  {
    key: 'labs',
    slug: 'labs',
    title: 'Composite & Skill Labs',
    template: 'solution-hub',
    ctaTitle: 'Build Research-Grade STEM & Composite Skill Labs',
    ctaSubtitle: 'Ensure 100% compliance with NEP 2020 guidelines with heavy-duty lab workstations, ESD-safe flooring, 3D printers, and certified robotics kits.',
    ctaButtonLabel: 'Request Lab Setup Consultation',
    ctaHref: '/contact-us',
  },
  {
    key: 'libraries',
    slug: 'libraries',
    title: 'Libraries',
    template: 'solution-hub',
    ctaTitle: 'Transform Your Campus Library into an Interactive Media Commons',
    ctaSubtitle: 'Upgrade to automated RFID management, acoustic collaborative study pods, ergonomic modular bookstacks, and digital cataloging systems.',
    ctaButtonLabel: 'Consult Library Architects',
    ctaHref: '/contact-us',
  },
  {
    key: 'mathematics',
    slug: 'mathematics',
    title: 'Mathematics',
    template: 'solution-hub',
    ctaTitle: 'Establish a State-of-the-Art Experiential Math Lab',
    ctaSubtitle: 'Make abstract mathematical theorems intuitive and enjoyable through hands-on manipulatives, 3D geometric models, and interactive math software.',
    ctaButtonLabel: 'Request Mathematica Demo',
    ctaHref: '/contact-us',
  },
  {
    key: 'design',
    slug: 'design',
    title: 'School Designs',
    template: 'solution-hub',
    ctaTitle: 'Comprehensive Campus Architectural & Interior Planning',
    ctaSubtitle: 'From early years wondergartens to high-school innovation corridors, work with accredited educational architects to build spaces children love.',
    ctaButtonLabel: 'Request Concept Design Proposal',
    ctaHref: '/contact-us',
  },
  {
    key: 'science',
    slug: 'science',
    title: 'Science',
    template: 'solution-hub',
    ctaTitle: 'Design & Equip Advanced Physics, Chemistry & Biology Labs',
    ctaSubtitle: 'Ensure student safety and institutional compliance with chemical-resistant granite benchtops, emergency wash stations, and precision scientific apparatus.',
    ctaButtonLabel: 'Request Science Lab Proposal',
    ctaHref: '/contact-us',
  },
  {
    key: 'sports',
    slug: 'sports',
    title: 'Sports',
    template: 'solution-hub',
    ctaTitle: 'Build Championship-Grade Sports Facilities on Your Campus',
    ctaSubtitle: 'Deliver FIFA/ITF-standard synthetic turf, shock-absorbing indoor court flooring, safety playground equipment, and sports performance tracking.',
    ctaButtonLabel: 'Book Sports Infrastructure Audit',
    ctaHref: '/contact-us',
  },
];

async function main() {
  console.log('========================================================================');
  console.log('🚀 PROCESSING BATCH 1 TILE CTAS & BATCH 2 CATEGORY HUBS DATASET');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // STEP 1: Update 16 Batch 1 Dynamic Tile Pages in JSON & Neon Database
  // -------------------------------------------------------------------------
  const batch1JsonPath = path.resolve(__dirname, 'data', 'sportsurf_batch_tiles_pages.json');
  console.log(`[STEP 1] Reading Batch 1 tiles from: ${batch1JsonPath}`);
  const batch1Data = JSON.parse(fs.readFileSync(batch1JsonPath, 'utf-8'));

  let batch1UpdatedCount = 0;
  for (const item of batch1Data) {
    const cta = BATCH1_CTA_MAP[item.clientSlug];
    if (!cta) {
      console.warn(`[WARN] No CTA defined for Batch 1 clientSlug: ${item.clientSlug}`);
      continue;
    }

    // Assign top-level CTA fields
    item.ctaTitle = cta.ctaTitle;
    item.ctaSubtitle = cta.ctaSubtitle;
    item.ctaButtonLabel = cta.ctaButtonLabel;
    item.ctaHref = cta.ctaHref;

    // Assign innerData CTA fields
    if (!item.innerData) item.innerData = {};
    item.innerData.ctaTitle = cta.ctaTitle;
    item.innerData.ctaSubtitle = cta.ctaSubtitle;
    item.innerData.ctaButtonLabel = cta.ctaButtonLabel;
    item.innerData.ctaHref = cta.ctaHref;
    item.innerData.btn1Label = cta.ctaButtonLabel;
    item.innerData.btn1Path = cta.ctaHref;

    batch1UpdatedCount++;
  }

  // Save updated JSON back to disk
  fs.writeFileSync(batch1JsonPath, JSON.stringify(batch1Data, null, 2), 'utf-8');
  console.log(`[PASS] Successfully updated ${batch1UpdatedCount} items in sportsurf_batch_tiles_pages.json`);

  // Update Database records for Batch 1 pages to remove placeholder "1", "2" and replace with rich CTA
  console.log('\n[STEP 1.1] Updating Neon Database page records for Batch 1...');
  let dbUpdatedSlugs = 0;
  for (const item of batch1Data) {
    const cta = BATCH1_CTA_MAP[item.clientSlug];
    if (!cta) continue;

    const targetSlugs = [item.clientSlug, item.apiSlug].filter(Boolean);
    for (const slug of targetSlugs) {
      const pageRecord = await prisma.page.findUnique({ where: { slug } });
      if (pageRecord) {
        let pd = {};
        try { pd = JSON.parse(pageRecord.pageData || '{}'); } catch (e) { pd = {}; }

        pd.ctaTitle = cta.ctaTitle;
        pd.ctaSubtitle = cta.ctaSubtitle;
        pd.ctaButtonLabel = cta.ctaButtonLabel;
        pd.ctaHref = cta.ctaHref;
        pd.ctaButtonHref = cta.ctaHref;
        pd.hideCta = false;
        pd.btn1Label = cta.ctaButtonLabel;
        pd.btn1Path = cta.ctaHref;

        // Ensure styles object exists
        pd.styles = pd.styles || {};
        if (!pd.styles.ctaBg || pd.styles.ctaBg === 'blue') {
          pd.styles.ctaBg = '#002a6c';
        }

        await prisma.page.update({
          where: { slug },
          data: {
            pageData: JSON.stringify(pd)
          }
        });
        dbUpdatedSlugs++;
      }
    }
  }
  console.log(`[PASS] Updated ${dbUpdatedSlugs} slugs in Neon Database with rich CTA institutional copy.`);

  // -------------------------------------------------------------------------
  // STEP 2: Structure Complete Batch 2 Dataset for 9 Category Hubs
  // -------------------------------------------------------------------------
  const batch2RawPath = path.resolve(__dirname, 'data', 'sportsurf_batch2_raw.json');
  console.log(`\n[STEP 2] Reading Batch 2 raw blocks from: ${batch2RawPath}`);
  const batch2Raw = JSON.parse(fs.readFileSync(batch2RawPath, 'utf-8'));

  const structuredCategoryHubs = [];

  for (const config of BATCH2_HUB_CONFIGS) {
    const rawHub = batch2Raw[config.key];
    if (!rawHub) {
      console.warn(`[WARN] Missing raw data for hub: ${config.key}`);
      continue;
    }

    const rawBlocks = rawHub.blocks || {};
    const rawHero = rawBlocks.inner_page_hero?.data || {};
    const sidebarCatData = rawBlocks.sidebar_categories?.data?.categories;

    // Extract exact categories array
    let categories = [];
    if (Array.isArray(sidebarCatData)) {
      categories = sidebarCatData;
    } else if (config.key === 'environments' && rawBlocks.environments_page_content?.data?.masonryItems) {
      // Environments hub has 15 rich learning environment spaces
      categories = [
        'Dining Halls & Nutrition',
        'Rumpus & Activity Rooms',
        'Smart Music & Audio Studios',
        'Art & Craft Innovation',
        'Smart STEM & Maker Labs',
        'Home Science Workspaces',
        'Interactive Kids Libraries',
        'Gross Motor & Physical Activity',
        'Jungle & Sensory Rooms',
        'Mini Auditoriums'
      ];
    }

    // Clean hero data
    const cleanHeroTitle = (rawHero.titleHtml || rawHub.title || config.title)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const bannerImage = rawHero.mediaUrl || rawHero.img || '/images/hero_digital.png';

    const hero = {
      title: cleanHeroTitle,
      titleHtml: rawHero.titleHtml || config.title,
      subtitle: rawHero.subtitle || `Comprehensive ${config.title} solutions for educational institutions.`,
      bannerImage,
      badge: rawHero.badge || `${config.title} 2026`,
      bgColor: rawHero.bgColor || '#ffffff',
      textColor: rawHero.textColor || '#002a6c',
      pageDescription: rawHero.pageDescription || '',
      pageDescriptionBgColor: rawHero.pageDescriptionBgColor || '#ffc501',
      pageDescriptionTextColor: rawHero.pageDescriptionTextColor || '#002a6c',
      ...rawHero
    };

    const hubItem = {
      slug: config.slug,
      title: config.title,
      template: config.template,
      categories,
      hero,
      ctaTitle: config.ctaTitle,
      ctaSubtitle: config.ctaSubtitle,
      ctaButtonLabel: config.ctaButtonLabel,
      ctaHref: config.ctaHref,
      rawBlocks
    };

    structuredCategoryHubs.push(hubItem);
    console.log(`[PASS] Structured Hub [${config.slug}] - Categories: ${categories.length}, Title: "${config.title}"`);
  }

  const batch2OutputPath = path.resolve(__dirname, 'data', 'sportsurf_batch2_category_hubs.json');
  fs.writeFileSync(batch2OutputPath, JSON.stringify(structuredCategoryHubs, null, 2), 'utf-8');
  console.log(`\n[PASS] Successfully written Batch 2 dataset (${structuredCategoryHubs.length} hubs) to:`);
  console.log(`       ${batch2OutputPath}`);

  console.log('\n========================================================================');
  console.log('✅ ALL SUBAGENT 1 TASKS COMPLETED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error executing script:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
