import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();

async function verify() {
  console.log('====================================================================');
  console.log('🔍 VERIFYING HOME DATA PERSISTENCE IN NEON POSTGRESQL DATABASE 🔍');
  console.log('====================================================================\n');

  let passedAssertions = 0;
  const test = (desc: string, fn: () => void) => {
    try {
      fn();
      passedAssertions++;
      console.log(`  ✅ [PASS] ${desc}`);
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${desc}: ${err.message}`);
      throw err;
    }
  };

  // ─── 1. SITECONTENT VERIFICATION ───
  console.log('--- 1. VERIFYING SITECONTENT ENTRIES ---');

  const contentRows = await prisma.siteContent.findMany();
  const contentMap = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));

  test('Total SiteContent records count is > 15', () => {
    assert(contentRows.length >= 15, `Found ${contentRows.length} rows`);
  });

  // A) home_styles
  test('home_styles contains SchoolMart brand tokens & visibility toggles', () => {
    assert(contentMap.home_styles, 'home_styles key exists');
    const styles = JSON.parse(contentMap.home_styles);
    assert.strictEqual(styles.primaryColor, '#0d5496', 'primaryColor is #0d5496 (Navy)');
    assert.strictEqual(styles.secondaryColor, '#ffc501', 'secondaryColor is #ffc501 (Yellow)');
    assert.strictEqual(styles.headingFont, 'grotesk', 'headingFont is grotesk');
    assert.strictEqual(styles.bodyFont, 'opensans', 'bodyFont is opensans');
    assert.strictEqual(styles.hideCategories, false, 'hideCategories is false');
    assert.strictEqual(styles.hideTicker, false, 'hideTicker is false');
    assert.strictEqual(styles.hideHero, false, 'hideHero is false');
    assert.strictEqual(styles.hideServices, false, 'hideServices is false');
    assert.strictEqual(styles.hideFeatures, false, 'hideFeatures is false');
    assert.strictEqual(styles.hideResources, false, 'hideResources is false');
  });

  // B) home_hero
  test('home_hero contains all hero fields and store redirect link', () => {
    assert(contentMap.home_hero, 'home_hero key exists');
    const hero = JSON.parse(contentMap.home_hero);
    assert.strictEqual(hero.badge, 'Price · Quality · Range Promise');
    assert.strictEqual(hero.headline1, 'FURNITURE');
    assert.strictEqual(hero.headline2, 'QUICK DELIVERY');
    assert.strictEqual(hero.subline1, 'Order Now');
    assert(hero.subline2.includes('Kindergarten'));
    assert.strictEqual(hero.cta1.path, 'https://schoolmart.store');
    assert.strictEqual(hero.cta1.label, 'Shop Furniture →');
    assert.strictEqual(hero.cta2.path, '/catalogues');
    assert.strictEqual(hero.cta2.label, 'View Catalogue');
    assert.strictEqual(hero.bgColor, '#ffc501');
    assert.strictEqual(hero.textColor, '#010f2d');
    assert(hero.mediaUrl.includes('images.jpg'));
    assert.strictEqual(hero.mediaType, 'image');
    assert.strictEqual(hero.ctaHref, 'https://schoolmart.store');
  });

  // C) home_categories
  test('home_categories contains 9 canonical navbar categories', () => {
    assert(contentMap.home_categories, 'home_categories key exists');
    const categories = JSON.parse(contentMap.home_categories);
    assert(Array.isArray(categories) && categories.length === 9, `Expected 9 categories, got ${categories?.length}`);
    const names = categories.map((c: any) => c.name);
    assert(names.includes('FURNITURE'));
    assert(names.includes('ARCHITECTURE'));
    assert(names.includes('DIGITAL INFRA'));
    assert(names.includes('SCHOOL DESIGNS'));
    assert(names.includes('LIBRARIES'));
    assert(names.includes('SPORTS'));
    assert(names.includes('MATHEMATICS'));
    assert(names.includes('SCIENCE'));
    assert(names.includes('LABS'));
    assert(categories[0].icon === 'Armchair');
    assert(categories[0].path === '/furniture');
    assert(categories[1].icon === 'Building2');
  });

  // D) ticker_title & ticker_announcements
  test('ticker_title is "Latest Updates"', () => {
    assert.strictEqual(contentMap.ticker_title, 'Latest Updates');
  });

  test('ticker_announcements contains 5 live announcements', () => {
    assert(contentMap.ticker_announcements, 'ticker_announcements key exists');
    const items = JSON.parse(contentMap.ticker_announcements);
    assert(Array.isArray(items) && items.length === 5, `Expected 5 announcements, got ${items?.length}`);
    assert(items[0].includes('Digital Transformation Summit: 15 May 2026'));
    assert(items[1].includes('New AI-Powered Learning Stations'));
  });

  // E) home_features (16 dynamic tiles)
  test('home_features contains all 16 dynamic Resource Tiles with path, img, span, title, subtitle, inner data', () => {
    assert(contentMap.home_features, 'home_features key exists');
    const features = JSON.parse(contentMap.home_features);
    assert(Array.isArray(features) && features.length === 16, `Expected 16 features, got ${features?.length}`);
    
    // Check first tile (IMMERSIVE LEARNING)
    const t1 = features[0];
    assert.strictEqual(t1.title, 'IMMERSIVE LEARNING');
    assert.strictEqual(t1.path, '/p/immersive-learning');
    assert(t1.img.includes('IMMERSIVE LEARNING.PNG'));
    assert.strictEqual(t1.span, 'h-64');
    assert(t1.inner && typeof t1.inner === 'object');
    assert(t1.inner.content.includes('Lorem ipsum'));

    // Check second tile (KINDERGARTEN DESIGN)
    const t2 = features[1];
    assert.strictEqual(t2.title, 'KINDERGARTEN DESIGN');
    assert.strictEqual(t2.path, '/p/kindergarten-design');

    // Check third tile (COMPOSITE SKILL LAB)
    const t3 = features[2];
    assert.strictEqual(t3.title, 'COMPOSITE SKILL LAB');
    assert.strictEqual(t3.path, '/p/composite-skill-lab');

    // Check 16th tile (WONDERGARTENS)
    const t16 = features[15];
    assert.strictEqual(t16.title, 'WONDERGARTENS');
    assert.strictEqual(t16.path, '/p/wondergartens');
  });

  // F) home_services (6 solution cards)
  test('home_services contains all 6 Solution cards with badges, colors, descriptions, paths, images', () => {
    assert(contentMap.home_services, 'home_services key exists');
    const services = JSON.parse(contentMap.home_services);
    assert(Array.isArray(services) && services.length === 6, `Expected 6 services, got ${services?.length}`);
    
    const titles = services.map((s: any) => s.title);
    assert(titles.includes('School Furniture'));
    assert(titles.includes('Digital Infrastructure'));
    assert(titles.includes('Sports Infrastructure'));
    assert(titles.includes('School Architecture'));
    assert(titles.includes('Learning Environments'));
    assert(titles.includes('School Design & Planning'));

    assert.strictEqual(services[0].path, '/furniture');
    assert.strictEqual(services[0].badge.label, 'Furniture');
    assert.strictEqual(services[0].bgColor, '#F97316');
    assert(services[0].img.includes('unsplash.com'));
  });

  // G) home_resources (Featured Products Carousel)
  test('home_resources contains heading "FEATURED PRODUCTS" and 5 products with store links', () => {
    assert(contentMap.home_resources, 'home_resources key exists');
    const resources = JSON.parse(contentMap.home_resources);
    assert.strictEqual(resources.heading, 'FEATURED PRODUCTS');
    assert(Array.isArray(resources.items) && resources.items.length === 5, `Expected 5 products, got ${resources.items?.length}`);
    
    const p1 = resources.items[0];
    assert.strictEqual(p1.title, 'dynamic tool');
    assert(p1.href.includes('schoolmart.store/adjustable-student-chair-with-caster-wheels.html'));
    assert(p1.price === '3,50000' || p1.price === '3,500.00');

    const p2 = resources.items[1];
    assert.strictEqual(p2.title, 'Lab Workstation V2');
    assert.strictEqual(p2.price, '18,500.00');
    assert(p2.href.includes('schoolmart.store'));
  });

  // H) home_sidebar (6 trending, 9 guides, 3 banners)
  test('home_sidebar contains trending topics, resource guides, and promotional banners', () => {
    assert(contentMap.home_sidebar, 'home_sidebar key exists');
    const sidebar = JSON.parse(contentMap.home_sidebar);
    assert(Array.isArray(sidebar.classifieds) && sidebar.classifieds.length === 6, `Expected 6 classifieds, got ${sidebar.classifieds?.length}`);
    assert(Array.isArray(sidebar.resources) && sidebar.resources.length === 9, `Expected 9 resources, got ${sidebar.resources?.length}`);
    assert(Array.isArray(sidebar.banners) && sidebar.banners.length === 3, `Expected 3 banners, got ${sidebar.banners?.length}`);
    
    assert.strictEqual(sidebar.classifieds[0].label, 'Schools for Sale / Lease');
    assert.strictEqual(sidebar.resources[0].label, 'Setup School in India');
    assert.strictEqual(sidebar.banners[0].label, 'Products for schl');
    assert.strictEqual(sidebar.banners[0].sublabel, 'Govt School');
  });

  // I) home_partnership (WhatsApp Consultation CTA)
  test('home_partnership contains WhatsApp CTA fields, phone, whatsappUrl, and badge', () => {
    assert(contentMap.home_partnership, 'home_partnership key exists');
    const part = JSON.parse(contentMap.home_partnership);
    assert.strictEqual(part.headline, 'Ready to scale your campus?');
    assert(part.description.includes('SchoolMart, we provide end-to-end expertise'));
    assert.strictEqual(part.badge, 'Direct Consultation');
    assert.strictEqual(part.phone, '+91 9966109191');
    assert.strictEqual(part.whatsappNumber, '919966109191');
    assert.strictEqual(part.whatsappUrl, 'https://chat.whatsapp.com/L79Vd9B2p9a5Q9D9X9D9X9');
    assert.strictEqual(part.btnLabel, 'Connect on WhatsApp');
    assert.strictEqual(part.bgColor, '#455fee');
  });

  // J) collaborations_title & collaborations
  test('collaborations_title and collaborations marquee list (10 schools)', () => {
    assert.strictEqual(contentMap.collaborations_title, 'Trusted by Leading Schools');
    assert(contentMap.collaborations, 'collaborations key exists');
    const collabs = JSON.parse(contentMap.collaborations);
    assert(Array.isArray(collabs) && collabs.length === 10, `Expected 10 partner schools, got ${collabs?.length}`);
    assert.strictEqual(collabs[0].name, 'AVN Vida International School');
    assert.strictEqual(collabs[5].name, 'Delhi Public School');
    assert.strictEqual(collabs[9].name, 'VIBGYOR Group');
  });

  // K) topbar
  test('topbar contains email, phone1, phone2, bgColor, textColor, and socials', () => {
    assert(contentMap.topbar, 'topbar key exists');
    const top = JSON.parse(contentMap.topbar);
    assert.strictEqual(top.email, 'info@schoolmart.in');
    assert.strictEqual(top.phone1, '+91 9966109191');
    assert.strictEqual(top.phone2, '+91 9866091111');
    assert.strictEqual(top.bgColor, '#0d5496');
    assert.strictEqual(top.textColor, '#ffffff');
    assert(top.socials && typeof top.socials === 'object');
    assert.strictEqual(top.socials.twitter, 'https://twitter.com/schoolmarts');
    assert.strictEqual(top.socials.youtube, 'https://www.youtube.com/channel/UCgKY_Kf8jH1hoP3p0I0tiRA');
  });

  // ─── 2. PAGE RECORD VERIFICATION ───
  console.log('\n--- 2. VERIFYING PAGE RECORD: "home" ---');

  const page = await prisma.page.findUnique({
    where: { slug: 'home' },
  });

  test('Page "home" exists and has template="home", published=true', () => {
    assert(page !== null, 'Page with slug "home" must exist');
    assert.strictEqual(page.title, 'Home Page');
    assert.strictEqual(page.slug, 'home');
    assert.strictEqual(page.template, 'home');
    assert.strictEqual(page.published, true);
  });

  test('Page "home" pageData contains full home payload', () => {
    assert(page && page.pageData, 'pageData is not empty');
    const pData = JSON.parse(page!.pageData!);
    assert(pData.hero, 'pData.hero exists');
    assert(pData.categories && pData.categories.length === 9, 'pData.categories has 9 items');
    assert(pData.ticker && pData.ticker.items.length === 5, 'pData.ticker has 5 items');
    assert(pData.features && pData.features.length === 16, 'pData.features has 16 items');
    assert(pData.services && pData.services.length === 6, 'pData.services has 6 items');
    assert(pData.resources && pData.resources.items.length === 5, 'pData.resources has 5 items');
    assert(pData.sidebar && pData.sidebar.classifieds.length === 6, 'pData.sidebar has classifieds');
    assert(pData.partnership && pData.partnership.phone === '+91 9966109191', 'pData.partnership has phone');
    assert(pData.collaborations && pData.collaborations.items.length === 10, 'pData.collaborations has 10 schools');
    assert(pData.topbar && pData.topbar.email === 'info@schoolmart.in', 'pData.topbar has email');
  });

  console.log('\n====================================================================');
  console.log(`🎉 ALL ${passedAssertions} VERIFICATION ASSERTIONS PASSED WITH 100% SUCCESS! 🎉`);
  console.log('====================================================================');
}

verify()
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
