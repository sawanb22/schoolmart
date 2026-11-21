const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function printSummary() {
  const content = await prisma.siteContent.findUnique({ where: { key: 'home_search_objectives' } });
  const objectives = JSON.parse(content.value);

  const pages = await prisma.page.findMany({
    where: { published: true },
    select: { id: true, slug: true, title: true, template: true, pageData: true },
    orderBy: { slug: 'asc' },
  });

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  for (const obj of objectives) {
    if (obj.id === 'all') continue;
    console.log('\n================================================================');
    console.log(`🌳 CATEGORY: [${obj.id}] ${obj.label}`);
    console.log('================================================================');

    const catPages = pages.filter((p) => {
      try {
        const pd = JSON.parse(p.pageData || '{}');
        return pd.category === obj.id;
      } catch {
        return false;
      }
    });

    console.log(`📄 HUB PAGES (${catPages.length}):`);
    for (const p of catPages) {
      let pd = {};
      try {
        pd = JSON.parse(p.pageData || '{}');
      } catch {}
      const cards = Array.isArray(pd.cards) ? pd.cards.filter((c) => c && c.title) : [];
      console.log(`   ├── /${p.slug} ("${p.title}") [template: ${p.template || 'default'}] -> ${cards.length} cards`);
      for (const c of cards.slice(0, 5)) {
        console.log(`   │    └── Card: "${c.title}" (target: ${c.href || `/${p.slug}/${c.slug || 'auto'}`})`);
      }
      if (cards.length > 5) {
        console.log(`   │    └── ... and ${cards.length - 5} more child cards`);
      }
    }

    const catProds = products.filter((prod) => {
      try {
        const s = typeof prod.specifications === 'string' ? JSON.parse(prod.specifications || '{}') : (prod.specifications || {});
        return s.searchObjective === obj.id;
      } catch {
        return false;
      }
    });

    console.log(`📦 CATALOG PRODUCTS (${catProds.length}):`);
    for (const pr of catProds.slice(0, 6)) {
      console.log(`   ├── ${pr.name} (₹${pr.price} | Category: ${pr.category?.name || 'General'})`);
    }
    if (catProds.length > 6) {
      console.log(`   └── ... and ${catProds.length - 6} more products`);
    }
  }
}

printSummary()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
