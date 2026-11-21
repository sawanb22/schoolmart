const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pages = await prisma.page.findMany({
    select: { id: true, slug: true, title: true, template: true, pageData: true }
  });
  console.log('=== PAGES WITH CARDS OR CATEGORIES ===');
  for (const p of pages) {
    const pd = JSON.parse(p.pageData || '{}');
    const cats = pd.categories || [];
    const cards = pd.cards || [];
    const cardCats = Array.from(new Set(cards.flatMap(c => Array.isArray(c.categories) ? c.categories : [c.category]).filter(Boolean)));
    if (cats.length > 0 || cards.length > 0) {
      console.log(`\nPage [ID ${p.id}] "${p.title}" (slug: ${p.slug}, template: ${p.template}):`);
      console.log(`  explicit categories in pageData (${cats.length}):`, cats);
      console.log(`  cards count: ${cards.length}`);
      console.log(`  categories derived from cards (${cardCats.length}):`, cardCats);
    }
  }

  console.log('\n=== SQL CATEGORY TABLE (Products) ===');
  const sqlCats = await prisma.category.findMany({
    include: { _count: { select: { product: true } } }
  });
  for (const c of sqlCats) {
    console.log(`  [Page: ${c.page}] "${c.name}" (slug: ${c.slug}, products: ${c._count.product})`);
  }

  await prisma.$disconnect();
}

run().catch(console.error);
