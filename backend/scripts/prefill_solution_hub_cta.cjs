const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SOLUTION_HUB_CTA_DATA = {
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
};

async function prefillSolutionHubCTA() {
  console.log('--- Starting Solution Hub Pages CTA Database Pre-fill ---');

  for (const [slug, cta] of Object.entries(SOLUTION_HUB_CTA_DATA)) {
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

    // Ensure styles object exists and sets ctaBg to #002a6c if default
    pd.styles = pd.styles || {};
    if (!pd.styles.ctaBg || pd.styles.ctaBg === 'blue') {
      pd.styles.ctaBg = '#002a6c';
    }

    // Purge unwanted residual features/philosophy data
    delete pd.features;
    delete pd.philosophyTitle;
    delete pd.philosophyDescription;
    delete pd.philosophyBullets;
    delete pd.philosophyServices;
    delete pd.section2Cards;

    await prisma.page.update({
      where: { slug },
      data: {
        pageData: JSON.stringify(pd),
      },
    });

    console.log(`[OK] Successfully updated "${slug}" with CTA: "${cta.ctaTitle}" and cleaned old sections.`);
  }

  console.log('--- Finished Solution Hub Pages CTA Database Pre-fill ---');
}

prefillSolutionHubCTA()
  .catch((err) => {
    console.error('[FATAL] Failed to prefill solution hub CTAs:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
