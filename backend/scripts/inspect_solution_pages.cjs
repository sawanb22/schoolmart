const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany({
    where: { slug: { in: ['sports-infra', 'labs', 'libraries', 'tech-infra'] } },
    select: { slug: true, title: true, pageData: true }
  });
  for (const p of pages) {
    try {
      const pd = JSON.parse(p.pageData || '{}');
      console.log('--- SLUG:', p.slug, '---');
      console.log('Title:', p.title);
      console.log('ctaTitle:', pd.ctaTitle);
      console.log('ctaSubtitle:', pd.ctaSubtitle);
      console.log('ctaButtonLabel:', pd.ctaButtonLabel);
      console.log('ctaHref:', pd.ctaHref);
      console.log('Cards count:', (pd.cards || []).length);
      console.log('Categories count:', (pd.categories || []).length);
      console.log('Styles:', pd.styles);
    } catch (e) {
      console.error(p.slug, e);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
