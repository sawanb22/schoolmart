const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectTree() {
  const content = await prisma.siteContent.findUnique({ where: { key: 'home_search_objectives' } });
  let objectives = [];
  try {
    objectives = JSON.parse(content.value);
  } catch {
    objectives = [
      { id: 'build-new', label: 'Build New Campus / Setup From Scratch' },
      { id: 'upgrade', label: 'Upgrade Existing Campus / Lab / Classroom' },
      { id: 'smart-campus', label: 'Smart Campus & Automation Setup' },
      { id: 'innovation', label: 'Innovation & Research Center / Incubation' },
      { id: 'accreditation', label: 'NAAC / NBA / NIRF Accreditation Readiness' },
      { id: 'admissions', label: 'Student Admissions, Outreach & Marketing' },
    ];
  }

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

  // Group pages by category
  const categoryTree = {};
  for (const obj of objectives) {
    categoryTree[obj.id] = {
      label: obj.label,
      pages: [],
      products: [],
    };
  }
  categoryTree['unmapped'] = {
    label: 'Unmapped / General Pages',
    pages: [],
    products: [],
  };

  for (const p of pages) {
    let pd = {};
    try {
      pd = typeof p.pageData === 'string' ? JSON.parse(p.pageData || '{}') : (p.pageData || {});
    } catch {}

    const cat = pd.category || 'unmapped';
    const target = categoryTree[cat] ? categoryTree[cat] : categoryTree['unmapped'];

    const cards = [];
    if (Array.isArray(pd.cards)) {
      for (const c of pd.cards) {
        if (c && c.title) {
          cards.push({
            title: c.title,
            slug: c.slug || null,
            href: c.href || null,
            inclusions: c.inclusions || c.deliverables || [],
          });
        }
      }
    }

    target.pages.push({
      slug: p.slug,
      title: p.title,
      template: p.template,
      cardsCount: cards.length,
      cards: cards.slice(0, 10), // sample up to 10 cards
    });
  }

  for (const prod of products) {
    let specs = {};
    try {
      specs = typeof prod.specifications === 'string' ? JSON.parse(prod.specifications || '{}') : (prod.specifications || {});
    } catch {}

    const objId = specs.searchObjective || 'unmapped';
    const target = categoryTree[objId] ? categoryTree[objId] : categoryTree['unmapped'];

    target.products.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      category: prod.category?.name || 'General',
    });
  }

  console.log(JSON.stringify(categoryTree, null, 2));
}

inspectTree()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
