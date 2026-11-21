const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const cardCount = await prisma.searchCard.count();
    console.log('SearchCard count in DB:', cardCount);
    const pageCount = await prisma.page.count();
    console.log('Page count in DB:', pageCount);
    
    // Also check active cards
    const activeCards = await prisma.searchCard.count({ where: { active: true } });
    console.log('Active SearchCard count:', activeCards);

    // Let's sample 3 cards
    const sample = await prisma.searchCard.findMany({ take: 3 });
    console.log('Sample cards:', sample.map(s => ({ slug: s.cardSlug, title: s.title, active: s.active })));
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
