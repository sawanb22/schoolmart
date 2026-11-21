import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING SCHOOLMART HOME PAGE TO NEON POSTGRESQL ===\n');

  // 1. Home Styles
  const homeStyles = {
    primaryColor: '#004a8e',
    secondaryColor: '#9ACD32',
    headingFont: 'grotesk',
    bodyFont: 'opensans',
    heroBg: 'white',
    heroLayout: 'split-right',
    hideCategories: false,
    hideTicker: false,
    hideSearchBar: false,
    hideHero: false,
    hideServices: false,
    hideFeatures: false,
    hideResources: false,
    hidePartnershipForm: false,
    hideCollaborations: false,
  };

  // 2. Home Hero
  const homeHero = {
    eyebrow: 'PRICE · QUALITY · RANGE PROMISE',
    title: 'School Furniture & Turnkey Campus Infrastructure',
    subtitle: '1200+ ergonomic products designed for inspiring spaces. From modern kindergarten to STEM labs and athletic grounds.',
    ctaLabel: 'Shop Furniture →',
    ctaHref: '/furniture',
    secondaryCtaLabel: 'View Catalogues',
    secondaryCtaHref: '/catalogues',
    image: '/images/hero_furniture.png',
  };

  // 3. Category Bar (The 9 Canonical SchoolMart Categories)
  const homeCategories = [
    { name: 'Furniture', label: 'FURNITURE', slug: 'furniture', href: '/furniture', icon: 'Sofa', badge: 'Popular' },
    { name: 'Architecture', label: 'ARCHITECTURE', slug: 'architecture', href: '/school-building-design', icon: 'Building2', badge: 'NEP 2020' },
    { name: 'Digital Infra', label: 'DIGITAL INFRA', slug: 'digital-infra', href: '/digital', icon: 'Laptop', badge: 'Smart Campus' },
    { name: 'Libraries', label: 'LIBRARIES', slug: 'libraries', href: '/libraries', icon: 'Library', badge: 'Modern' },
    { name: 'School Designs', label: 'SCHOOL DESIGNS', slug: 'school-designs', href: '/design', icon: 'Pencil', badge: 'Turnkey' },
    { name: 'Sports', label: 'SPORTS', slug: 'sports', href: '/sports', icon: 'Trophy', badge: 'Athletics' },
    { name: 'Mathematics', label: 'MATHEMATICS', slug: 'mathematics', href: '/gamified-math-labs', icon: 'Calculator', badge: 'STEM' },
    { name: 'Science', label: 'SCIENCE', slug: 'science', href: '/science-is-fun', icon: 'FlaskConical', badge: 'Labs' },
    { name: 'Labs', label: 'LABS', slug: 'labs', href: '/labs', icon: 'Atom', badge: 'Composite' },
  ];

  // 4. Core Solutions / Services
  const homeServices = [
    {
      title: 'Classroom & Campus Furniture',
      subtitle: 'Ergonomic, stackable, durable seating and desks tailored for all grade levels.',
      href: '/furniture',
      badge: '1200+ Products',
      icon: 'Sofa',
      image: '/images/card_classroom.png',
    },
    {
      title: 'Campus Architecture & Master Planning',
      subtitle: 'NEP-ready campus master planning and architectural layout services by experts.',
      href: '/school-building-design',
      badge: 'Turnkey Architectural',
      icon: 'Building2',
      image: '/images/hero_architecture.png',
    },
    {
      title: 'Smart Digital & Language Labs',
      subtitle: 'Interactive displays, digital language consoles, and campus network setups.',
      href: '/digital',
      badge: 'EdTech Standard',
      icon: 'Laptop',
      image: '/images/hero_digital.png',
    },
    {
      title: 'Modern Learning Resource Centers',
      subtitle: 'Acoustic-optimized library shelving, study pods, and resource cataloguing.',
      href: '/libraries',
      badge: 'Resource Centers',
      icon: 'Library',
      image: '/images/card_library.png',
    },
    {
      title: 'Composite Science & STEM Labs',
      subtitle: 'Physics, chemistry, and biology setups adhering strictly to safety regulations.',
      href: '/science-is-fun',
      badge: 'Certified Safety',
      icon: 'FlaskConical',
      image: '/images/hero_science.png',
    },
    {
      title: 'Athletic Grounds & Sports Arenas',
      subtitle: 'Tournament-grade multi-sport turf, indoor gym flooring, and athletic equipment.',
      href: '/sports',
      badge: 'Tournament Grade',
      icon: 'Trophy',
      image: '/images/hero_sports.png',
    },
  ];

  // 5. Institutional Features
  const homeFeatures = [
    {
      title: 'Direct Factory Sourcing',
      description: 'Transparent B2B pricing direct from audited institutional manufacturers.',
      icon: 'Factory',
    },
    {
      title: 'NEP 2020 Compliance',
      description: 'Designs engineered around active learning, pedagogy, and student wellness.',
      icon: 'ShieldCheck',
    },
    {
      title: 'Turnkey Pan-India Delivery',
      description: 'White-glove delivery, on-site assembly, and lifetime institutional support.',
      icon: 'Truck',
    },
  ];

  // 6. Resources & Knowledge Tiles
  const homeResources = {
    title: 'Knowledge Hub & Institutional Handbooks',
    subtitle: 'Everything you need to design, build, and equip world-class academic institutions.',
    items: [
      {
        title: 'Master Catalogues & Lookbooks',
        description: 'Download the comprehensive 2025 institutional lookbooks and procurement catalogs.',
        tag: 'HANDBOOK',
        href: '/catalogues',
        image: '/images/card_classroom.png',
      },
      {
        title: 'Learning Environments Guide',
        description: 'Explore optimal classroom spatial layouts and ergonomic benchmarks.',
        tag: 'DESIGN GUIDE',
        href: '/environments',
        image: '/images/hero_environments.png',
      },
      {
        title: 'School Setup 12-Step Playbook',
        description: 'Complete regulatory, architectural, and procurement blueprint for new institutions.',
        tag: 'PLAYBOOK',
        href: '/setup-guide',
        image: '/images/hero_about.png',
      },
      {
        title: 'Composite STEM Lab Standards',
        description: 'Safety guidelines, ventilation requirements, and equipment specifications.',
        tag: 'LAB SPECS',
        href: '/p/stem-lab-setup',
        image: '/images/card_physics_lab.png',
      },
    ],
  };

  // 7. Partnership & Consultation
  const homePartnership = {
    title: 'Ready to Transform Your Campus?',
    subtitle: 'Schedule a free architectural & procurement consultation with our institutional specialists.',
    ctaLabel: 'Schedule Institutional Consultation',
    ctaHref: '/contact-us',
  };

  // 8. Ticker Updates
  const tickerAnnouncements = [
    '2025 Institutional Procurement Lookbook Now Live — Download Master PDF Catalogues',
    'Pan-India Delivery & Turnkey Assembly Available for 2025 Academic Sessions',
    'Special Institutional Bulk Pricing on NEP 2020 Ergonomic Classrooms',
  ];

  // 9. Client Logos
  const collaborations = [
    { name: 'St. Xavier International', active: true },
    { name: 'Delhi Public School', active: true },
    { name: 'Oakridge International Academy', active: true },
    { name: 'National Heritage School', active: true },
    { name: 'Cambridge Valley High', active: true },
    { name: 'Bloomfield STEM Academy', active: true },
  ];

  // Upsert all into SiteContent
  const entries: [string, any][] = [
    ['home_styles', homeStyles],
    ['home_hero', homeHero],
    ['home_categories', homeCategories],
    ['home_services', homeServices],
    ['home_features', homeFeatures],
    ['home_resources', homeResources],
    ['home_partnership', homePartnership],
    ['ticker_title', 'SCHOOLMART UPDATES'],
    ['ticker_announcements', tickerAnnouncements],
    ['collaborations_title', 'Trusted By Leading Educational Institutions'],
    ['collaborations', collaborations],
  ];

  for (const [key, val] of entries) {
    const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
    await prisma.siteContent.upsert({
      where: { key },
      update: { value: stringVal },
      create: { key, value: stringVal },
    });
    console.log(`[PASS] Upserted SiteContent: "${key}"`);
  }

  // Also upsert the Page record for "home"
  await prisma.page.upsert({
    where: { slug: 'home' },
    update: {
      title: 'SchoolMart — Home',
      template: 'home',
      published: true,
      pageData: JSON.stringify({
        hero: homeHero,
        categories: homeCategories,
        services: homeServices,
        resources: homeResources,
        styles: homeStyles,
      }),
    },
    create: {
      slug: 'home',
      title: 'SchoolMart — Home',
      template: 'home',
      published: true,
      pageData: JSON.stringify({
        hero: homeHero,
        categories: homeCategories,
        services: homeServices,
        resources: homeResources,
        styles: homeStyles,
      }),
    },
  });
  console.log('[PASS] Upserted Page record: "home"');

  console.log('\n=== HOME PAGE SEEDING COMPLETE WITH 100% PERSISTENCE ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
