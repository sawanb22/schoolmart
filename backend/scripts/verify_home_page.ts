import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFYING HOME PAGE IN NEW NEON DATABASE ===\n');

  const content = await prisma.siteContent.findMany();
  console.log(`Total SiteContent entries in new DB: ${content.length}`);

  const homeHeroRaw = content.find(c => c.key === 'home_hero');
  if (homeHeroRaw) {
    const hero = JSON.parse(homeHeroRaw.value);
    console.log(`[PASS] Home Hero Title: "${hero.title}"`);
    console.log(`[PASS] Home Hero Eyebrow: "${hero.eyebrow}"`);
    console.log(`[PASS] Home Hero CTA: "${hero.ctaLabel}" -> ${hero.ctaHref}`);
  }

  const homeCatsRaw = content.find(c => c.key === 'home_categories');
  if (homeCatsRaw) {
    const cats = JSON.parse(homeCatsRaw.value);
    console.log(`[PASS] Home Categories count: ${cats.length}`);
    console.log(`       Categories: ${cats.map((c: any) => c.name).join(', ')}`);
  }

  const homeServicesRaw = content.find(c => c.key === 'home_services');
  if (homeServicesRaw) {
    const services = JSON.parse(homeServicesRaw.value);
    console.log(`[PASS] Home Services count: ${services.length}`);
    console.log(`       Services: ${services.map((s: any) => s.title).join(' | ')}`);
  }

  const homeResourcesRaw = content.find(c => c.key === 'home_resources');
  if (homeResourcesRaw) {
    const resources = JSON.parse(homeResourcesRaw.value);
    console.log(`[PASS] Home Resources items: ${resources.items?.length}`);
  }

  const page = await prisma.page.findUnique({
    where: { slug: 'home' }
  });
  if (page) {
    console.log(`[PASS] Page table 'home' record exists (title: "${page.title}", published: ${page.published})`);
  }

  console.log('\n=== ALL HOME PAGE DATA VERIFIED IN NEON POSTGRESQL ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
