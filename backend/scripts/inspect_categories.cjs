const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany({
    select: { slug: true, title: true, template: true }
  });
  console.log('=== ALL PAGES IN DB ===');
  pages.forEach(p => console.log(`- ${p.slug} (${p.title}) [template: ${p.template}]`));

  console.log('\n=== ALL PRODUCTS IN DB ===');
  const products = await prisma.product.findMany({
    select: { id: true, name: true, categoryId: true, category: { select: { name: true, page: true, slug: true } } }
  });
  console.log('Total products:', products.length);
  for (const pr of products) {
    console.log(`- Product "${pr.name}" -> Category: [${pr.category?.page}] "${pr.category?.name}"`);
  }

  await prisma.$disconnect();
}

run().catch(console.error);
