const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany({
    where: {
      slug: {
        in: [
          'campus-design-execution',
          'campus-furniture-design',
          'sports-design-execution',
          'ai-digital-design-supply',
          'ar-vr-experiences',
          'campus-design',
          'campus-master-planning'
        ]
      }
    },
    select: { slug: true, title: true, template: true, pageData: true }
  });

  for (const p of pages) {
    try {
      const pd = JSON.parse(p.pageData || '{}');
      console.log('=== SLUG:', p.slug, '===');
      console.log('Title:', p.title);
      console.log('Template:', p.template);
      console.log('ctaTitle:', pd.ctaTitle);
      console.log('ctaSubtitle:', pd.ctaSubtitle);
      console.log('ctaButtonLabel:', pd.ctaButtonLabel);
      console.log('Cards count:', (pd.cards || []).length);
      console.log('Categories:', pd.categories);
      console.log('Styles:', pd.styles);
    } catch (e) {
      console.error(p.slug, e);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
