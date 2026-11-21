const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GROUP5_SLUGS = [
  'campus-design-execution',
  'campus-furniture-design',
  'sports-design-execution',
  'ai-digital-design-supply',
  'ar-vr-experiences',
  'campus-design',
  'campus-master-planning',
];

async function updateGroup5() {
  console.log('--- Updating Group 5 Service Suite Pages ---');

  for (const slug of GROUP5_SLUGS) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.warn(`[WARN] Page "${slug}" not found.`);
      continue;
    }

    let pd = {};
    try {
      pd = JSON.parse(page.pageData || '{}');
    } catch (e) {
      console.error(`Failed to parse pageData for ${slug}:`, e);
      continue;
    }

    pd.styles = pd.styles || {};
    if (!pd.styles.ctaBg || pd.styles.ctaBg === 'blue') {
      pd.styles.ctaBg = '#002a6c';
    }
    pd.ctaHref = pd.ctaHref || '/contact-us';
    pd.hideCta = false;

    await prisma.page.update({
      where: { slug },
      data: {
        pageData: JSON.stringify(pd),
      },
    });

    console.log(`[OK] Updated "${slug}" with Campus Navy CTA.`);
  }

  console.log('--- Finished Updating Group 5 ---');
}

updateGroup5()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
