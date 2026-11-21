const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HUB_CTA_DATA = {
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

async function prefillHubCTA() {
  console.log('--- Starting Hub Pages CTA Database Pre-fill ---');

  for (const [slug, cta] of Object.entries(HUB_CTA_DATA)) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.warn(`[WARN] Page with slug "${slug}" not found in database. Skipping.`);
      continue;
    }

    let pd = {};
    try {
      pd = JSON.parse(page.pageData || '{}');
    } catch (e) {
      console.error(`[ERR] Failed to parse pageData for "${slug}":`, e);
      continue;
    }

    // Set tailored CTA fields
    pd.ctaTitle = cta.ctaTitle;
    pd.ctaSubtitle = cta.ctaSubtitle;
    pd.ctaButtonLabel = cta.ctaButtonLabel;
    pd.ctaHref = cta.ctaHref;
    pd.hideCta = false;

    // Purge unwanted overview/bodyHeading/body test artifacts
    if (pd.bodyHeading === 'section heading' || pd.bodyHeading === 'Section Heading' || slug === 'ai-guide') {
      delete pd.bodyHeading;
    }
    if (pd.body === 'body text' || pd.body === '<p>body text</p>' || slug === 'ai-guide') {
      delete pd.body;
    }

    await prisma.page.update({
      where: { slug },
      data: {
        pageData: JSON.stringify(pd),
      },
    });

    console.log(`[OK] Successfully updated "${slug}" with CTA: "${cta.ctaTitle}" and cleaned overview body.`);
  }

  console.log('--- Finished Hub Pages CTA Database Pre-fill ---');
}

prefillHubCTA()
  .catch((err) => {
    console.error('[FATAL] Failed to prefill hub CTAs:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
