/**
 * ==============================================================================
 * CampusMart Targeted Production Database Synchronization Tool
 * ==============================================================================
 * Purpose:
 * Safely synchronize whitelisted CMS pages, categories, and SiteContent
 * configurations to the production PostgreSQL database (ideascom_campusmart)
 * without deleting or touching ANY customer users, orders, inquiries, or quotes.
 *
 * Usage on cPanel Terminal:
 *   cd /home/ideascom/campusmart-api
 *   source /home/ideascom/nodevenv/campusmart-api/20/bin/activate
 *   node scripts/targeted-production-sync.cjs --dry-run
 *   node scripts/targeted-production-sync.cjs --apply
 * ==============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isDryRun = !process.argv.includes('--apply');

// 1. Whitelisted SiteContent keys for dynamic Search Bar
const SEARCH_SITECONTENT = [
  {
    key: 'home_search_institutions',
    value: JSON.stringify([
      { id: 'all', label: 'All Institutions', shortLabel: 'All', iconName: 'Layers', active: true },
      { id: 'engineering', label: 'Engineering Colleges', shortLabel: 'Engineering', iconName: 'Building2', active: true },
      { id: 'universities', label: 'Universities', shortLabel: 'Universities', iconName: 'Landmark', active: true },
      { id: 'degree', label: 'Degree Colleges', shortLabel: 'Degree', iconName: 'GraduationCap', active: true },
      { id: 'vocational', label: 'Vocational Institutes', shortLabel: 'Vocational', iconName: 'Wrench', active: true },
      { id: 'skill', label: 'Skill Development Centers', shortLabel: 'Skill Centers', iconName: 'Award', active: true },
    ]),
  },
  {
    key: 'home_search_objectives',
    value: JSON.stringify([
      { id: 'all', label: 'All Objectives', shortLabel: 'Looking For', iconName: 'Target', active: true },
      { id: 'build-new', label: 'Build New Colleges', shortLabel: 'Build New', defaultRoute: '/campus-design-execution', iconName: 'Building2', active: true },
      { id: 'upgrade', label: 'Upgrade Existing Campuses', shortLabel: 'Upgrade', defaultRoute: '/campus-design-execution', iconName: 'Layers', active: true },
      { id: 'smart-campus', label: 'Become Smart Campus', shortLabel: 'Smart Campus', defaultRoute: '/smart-classrooms', iconName: 'Cpu', active: true },
      { id: 'innovation', label: 'Create Innovation Ecosystems', shortLabel: 'Innovation', defaultRoute: '/innovation', iconName: 'Users', active: true },
      { id: 'accreditation', label: 'Improve Accreditation', shortLabel: 'Accreditation', defaultRoute: '/resources', iconName: 'ShieldCheck', active: true },
      { id: 'admissions', label: 'Entrance Admissions', shortLabel: 'Admissions', defaultRoute: '/partner-with-colleges', iconName: 'Award', active: true },
    ]),
  },
  {
    key: 'home_search_popular_chips',
    value: JSON.stringify([
      { label: 'Smart Classrooms', query: 'Smart Classrooms' },
      { label: 'AI Labs', query: 'AI' },
      { label: 'Digital Libraries', query: 'Libraries' },
      { label: 'Sports Complex', query: 'Sports' },
      { label: 'College Setup', query: 'Setup' },
    ]),
  },
];

// 2. Whitelisted Page Category Taxonomy
const PAGE_CATEGORY_MAP = {
  'tech-infra': ['Classroom Tech', 'Displays', 'Networking', 'Wi-Fi & Fiber', 'Servers & Cloud', 'Security', 'Firewall & Safety'],
  'sports-infra': ['Indoor', 'Outdoor', 'Training', 'Kids', 'Adults'],
  'labs': ['Science Labs', 'Skill Labs', 'Tech Labs', 'STEM & Innovation'],
  'libraries': ['Reading & Study', 'Storage & Stacks', 'Digital & Tech', 'Collaborative'],
  'ai-guide': ['Learning', 'Operations', 'People', 'Strategy'],
  'innovation': ['All tracks', 'Ideation', 'Incubation', 'Acceleration', 'Funding', 'Ecosystem'],
  'resources': ['Guides', 'Founding', 'Operations', 'Accreditation', 'Procurement', 'Architecture'],
  'collaboration': ['Active', 'Research', 'Academic', 'Industry'],
  'setup-college': ['Planning', 'Regulatory', 'Land & Infra', 'Academics', 'Recruitment', 'Launch'],
  'ugc-guidelines': ['Affiliation', 'Accreditation', 'Faculty', 'Campus Norms', 'Financials', 'Governance'],
};

// 3. Tailored CTAs for Hub & Service Pages
const PAGE_CTA_DATA = {
  'sports-infra': {
    ctaTitle: 'Ready to Build Your Arena?',
    ctaSubtitle: 'Partner with India’s leading campus sports consortium to design, construct, and certify tournament-grade sports infrastructure.',
    ctaButtonLabel: 'Get Project Audit',
    ctaHref: '/contact-us',
  },
  'labs': {
    ctaTitle: 'Build Research-Grade Campus Labs',
    ctaSubtitle: 'From NABL-compliant safety standards to turnkey STEM and composite lab setups, consult our academic infrastructure specialists.',
    ctaButtonLabel: 'Request Lab Consultation',
    ctaHref: '/contact-us',
  },
  'libraries': {
    ctaTitle: 'Transform Your Campus Library Into a Modern Learning Hub',
    ctaSubtitle: 'Ergonomic modular furnishings, automated RFID book stacks, and collaborative study commons engineered for modern institutions.',
    ctaButtonLabel: 'Consult Library Specialists',
    ctaHref: '/contact-us',
  },
  'tech-infra': {
    ctaTitle: 'Foundation for Digital Excellence',
    ctaSubtitle: 'High-speed structured cabling, enterprise Wi-Fi, campus surveillance, and unified server architectures engineered for future-ready institutions.',
    ctaButtonLabel: 'Get Technical Audit',
    ctaHref: '/contact-us',
  },
  'ai-guide': {
    ctaTitle: 'Ready to Plan AI Transformation on Your Campus?',
    ctaSubtitle: 'Consult our technology specialists for tailored institutional AI roadmaps, compute infrastructure, and pilot design.',
    ctaButtonLabel: 'Schedule AI Consultation',
    ctaHref: '/contact-us',
  },
  'setup-college': {
    ctaTitle: 'Planning to Establish a New College or University?',
    ctaSubtitle: 'From statutory compliance to turnkey academic infrastructure, our specialists assist founding trusts every step of the way.',
    ctaButtonLabel: 'Consult Setup Advisory',
    ctaHref: '/contact-us',
  },
  'ugc-guidelines': {
    ctaTitle: 'Need Guidance on Higher Education Approvals?',
    ctaSubtitle: 'CampusMart works with university leadership and regulatory experts to ensure seamless compliance, affiliation, and audit readiness.',
    ctaButtonLabel: 'Consult an Expert',
    ctaHref: '/contact-us',
  },
  'innovation': {
    ctaTitle: 'Build an Active Innovation & Incubation Ecosystem',
    ctaSubtitle: 'Empower students and faculty with entrepreneurship centers, research labs, and industry partnership frameworks.',
    ctaButtonLabel: 'Start Innovation Pilot',
    ctaHref: '/contact-us',
  },
  'resources': {
    ctaTitle: 'Looking for Comprehensive Higher Ed Case Studies?',
    ctaSubtitle: 'Access detailed technical specs, procurement roadmaps, and campus architecture playbooks tailored to your institution.',
    ctaButtonLabel: 'Request Resource Kit',
    ctaHref: '/contact-us',
  },
  'collaboration': {
    ctaTitle: 'Forge Meaningful Industry & Academic Partnerships',
    ctaSubtitle: 'Connect your institution with top global universities, corporate labs, and joint research initiatives through CampusMart.',
    ctaButtonLabel: 'Explore Partnerships',
    ctaHref: '/contact-us',
  },
};

const SERVICE_SUITE_SLUGS = [
  'campus-design-execution',
  'campus-furniture-design',
  'sports-design-execution',
  'ai-digital-design-supply',
  'ar-vr-experiences',
  'campus-design',
  'campus-master-planning',
];

async function syncProductionDatabase() {
  console.log('==============================================================================');
  console.log(`CAMPUSMART TARGETED PRODUCTION SYNC [MODE: ${isDryRun ? 'DRY-RUN (Simulated)' : 'APPLY (Live Updates)'}]`);
  console.log('==============================================================================\n');

  // STEP 1: SiteContent Search Settings Upsert
  console.log('--- Step 1: Synchronizing Search Bar Customization (sitecontent) ---');
  for (const item of SEARCH_SITECONTENT) {
    const existing = await prisma.siteContent.findUnique({ where: { key: item.key } });
    if (!existing) {
      console.log(`[+] Inserting new SiteContent key: "${item.key}"`);
      if (!isDryRun) {
        await prisma.siteContent.create({
          data: {
            key: item.key,
            value: item.value,
          },
        });
      }
    } else {
      console.log(`[=] Key "${item.key}" already exists (preserved). Use admin editor to modify.`);
    }
  }

  // STEP 2: Unified Categories & Tailored CTA for Solution & Hub Pages
  console.log('\n--- Step 2: Synchronizing Unified Hub & Solution Pages ---');
  for (const [slug, categories] of Object.entries(PAGE_CATEGORY_MAP)) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.warn(`[WARN] Page with slug "${slug}" not found in database. Skipping.`);
      continue;
    }

    let pd = {};
    try {
      pd = JSON.parse(page.pageData || '{}');
    } catch (e) {
      pd = {};
    }

    let modified = false;

    // Sync categories
    if (!Array.isArray(pd.categories) || pd.categories.length === 0) {
      pd.categories = categories;
      modified = true;
      console.log(`[~] Setting ${categories.length} categories for "${slug}"`);
    }

    // Sync CTA if present in PAGE_CTA_DATA
    if (PAGE_CTA_DATA[slug]) {
      const cta = PAGE_CTA_DATA[slug];
      if (!pd.ctaTitle || pd.ctaTitle === 'Ready to Get Started?') {
        pd.ctaTitle = cta.ctaTitle;
        pd.ctaSubtitle = cta.ctaSubtitle;
        pd.ctaButtonLabel = cta.ctaButtonLabel;
        pd.ctaHref = cta.ctaHref;
        modified = true;
      }
    }

    // Ensure Campus Navy CTA background and visible CTA
    pd.styles = pd.styles || {};
    if (!pd.styles.ctaBg || pd.styles.ctaBg === 'blue') {
      pd.styles.ctaBg = '#002a6c';
      modified = true;
    }
    if (pd.hideCta) {
      pd.hideCta = false;
      modified = true;
    }

    if (modified) {
      console.log(`[UPDATED] Page "${slug}" updated with unified taxonomy & CTA styling.`);
      if (!isDryRun) {
        await prisma.page.update({
          where: { slug },
          data: { pageData: JSON.stringify(pd) },
        });
      }
    } else {
      console.log(`[OK] Page "${slug}" is already up to date.`);
    }
  }

  // STEP 3: Service Suite Pages CTA & Styling
  console.log('\n--- Step 3: Synchronizing Service Suite Pages (Group 5) ---');
  for (const slug of SERVICE_SUITE_SLUGS) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.warn(`[WARN] Service page "${slug}" not found. Skipping.`);
      continue;
    }

    let pd = {};
    try {
      pd = JSON.parse(page.pageData || '{}');
    } catch (e) {
      pd = {};
    }

    let modified = false;
    pd.styles = pd.styles || {};
    if (!pd.styles.ctaBg || pd.styles.ctaBg === 'blue') {
      pd.styles.ctaBg = '#002a6c';
      modified = true;
    }
    if (pd.hideCta) {
      pd.hideCta = false;
      modified = true;
    }
    if (!pd.ctaHref) {
      pd.ctaHref = '/contact-us';
      modified = true;
    }

    if (modified) {
      console.log(`[UPDATED] Service Suite "${slug}" CTA set to Campus Navy & /contact-us.`);
      if (!isDryRun) {
        await prisma.page.update({
          where: { slug },
          data: { pageData: JSON.stringify(pd) },
        });
      }
    } else {
      console.log(`[OK] Service Suite "${slug}" is already up to date.`);
    }
  }

  // STEP 4: Admin Role Safeguard
  console.log('\n--- Step 4: Verifying Administrator Role Safeguards ---');
  const adminUsers = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
    },
    select: { id: true, email: true, role: true },
  });
  console.log(`[INFO] Found ${adminUsers.length} verified administrative users.`);
  adminUsers.forEach((u) => console.log(`  - ${u.email} (${u.role})`));

  console.log('\n==============================================================================');
  if (isDryRun) {
    console.log('DRY RUN COMPLETE: No live data was modified.');
    console.log('To apply these updates to production, run:');
    console.log('  node scripts/targeted-production-sync.cjs --apply');
  } else {
    console.log('SYNC COMPLETE: Production database updated successfully and safely!');
  }
  console.log('==============================================================================\n');
}

syncProductionDatabase()
  .catch((err) => {
    console.error('[FATAL] Sync failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
