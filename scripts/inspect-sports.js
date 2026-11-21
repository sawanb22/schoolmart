const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const page = await prisma.page.findUnique({ where: { slug: 'sports-infra' } });
  if (page) {
    const data = typeof page.pageData === 'string' ? JSON.parse(page.pageData) : page.pageData;
    console.log('Template:', page.template);
    if (data.cards) {
      console.log('Cards:', JSON.stringify(data.cards.map(c => ({
        title: c.title,
        slug: c.slug,
        href: c.href,
        hasDescription: !!c.description
      })), null, 2));
    }
    if (data.section2Cards) {
      console.log('Section2Cards:', JSON.stringify(data.section2Cards.map(c => ({
        title: c.title,
        slug: c.slug,
        href: c.href
      })), null, 2));
    }
  }

  // Also check if there are any SolutionCard rows in database
  const solutionCards = await prisma.solutionCard.findMany({
    where: {
      OR: [
        { title: { contains: 'Badminton', mode: 'insensitive' } },
        { cardSlug: { contains: 'badminton', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Prisma SolutionCards matching badminton:', JSON.stringify(solutionCards.map(s => ({
    id: s.id,
    title: s.title,
    cardSlug: s.cardSlug,
    targetSlug: s.targetSlug,
    categorySlug: s.categorySlug
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
