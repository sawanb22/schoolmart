import { prisma } from '../src/lib/prisma';

async function check() {
  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  console.log('Local DB Products count:', productCount);
  console.log('Local DB Categories count:', categoryCount);
  
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, page: true, _count: { select: { product: true } } }
  });
  console.log('Categories in local DB:', categories);

  const furniturePage = await prisma.page.findUnique({
    where: { slug: 'furniture' }
  });
  console.log('Furniture page in DB exists?', !!furniturePage);
  if (furniturePage) {
    console.log('Furniture page title:', furniturePage.title);
    console.log('Furniture page section 3 CTA:', {
      ctaTitle: (furniturePage.pageData as any)?.ctaTitle,
      ctaSubtitle: (furniturePage.pageData as any)?.ctaSubtitle,
      ctaButtonLabel: (furniturePage.pageData as any)?.ctaButtonLabel,
      ctaHref: (furniturePage.pageData as any)?.ctaHref,
    });
  }
}

check().catch(console.error);
