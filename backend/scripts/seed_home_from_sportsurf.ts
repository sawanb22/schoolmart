import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🌱 SCHOOLMART HOME PAGE SEEDER FROM SPORTSURF EXTRACTED DATA 🌱');
  console.log('================================================================\n');

  // 1. Read sportsurf_home_extracted.json
  const extractedPath = path.join(__dirname, 'data', 'sportsurf_home_extracted.json');
  console.log(`[INFO] Reading extracted data from: ${extractedPath}`);
  
  if (!fs.existsSync(extractedPath)) {
    throw new Error(`Extracted data file not found at: ${extractedPath}`);
  }

  const rawJson = fs.readFileSync(extractedPath, 'utf-8');
  const extracted = JSON.parse(rawJson);
  const blocks = extracted.blocks;

  console.log(`[PASS] Loaded extracted data. Available blocks: ${Object.keys(blocks).join(', ')}`);

  // 2. Prepare SiteContent entries

  // A) Brand tokens & styles
  const homeStyles = {
    primaryColor: '#0d5496', // SchoolMart Navy
    secondaryColor: '#ffc501', // SchoolMart Yellow
    headingFont: 'grotesk',
    bodyFont: 'opensans',
    heroBg: '#ffc501',
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

  // B) Hero section
  const heroBlock = blocks.hero?.data || {};
  const homeHero = {
    // Extracted raw fields
    badge: heroBlock.badge || 'Price · Quality · Range Promise',
    headline1: heroBlock.headline1 || 'FURNITURE',
    headline2: heroBlock.headline2 || 'QUICK DELIVERY',
    subline1: heroBlock.subline1 || 'Order Now',
    subline2: heroBlock.subline2 || 'Kindergarten · Highschools · Labs · Libraries',
    cta1: {
      label: heroBlock.cta1?.label || 'Shop Furniture →',
      path: 'https://schoolmart.store', // Redirect store link
    },
    cta2: {
      label: heroBlock.cta2?.label || 'View Catalogue',
      path: heroBlock.cta2?.path || '/catalogues',
    },
    bgColor: heroBlock.bgColor || '#ffc501',
    textColor: heroBlock.textColor || '#010f2d',
    mediaUrl: heroBlock.mediaUrl || 'http://localhost:5000/uploads/1776230256967-images.jpg',
    mediaType: heroBlock.mediaType || 'image',

    // Compatible mapped fields for HomepageEditor & HeroBanner
    eyebrow: heroBlock.badge || 'Price · Quality · Range Promise',
    title: `${heroBlock.headline1 || 'FURNITURE'}\n${heroBlock.headline2 || 'QUICK DELIVERY'}`,
    subtitle: `${heroBlock.subline1 ? heroBlock.subline1 + ' · ' : ''}${heroBlock.subline2 || 'Kindergarten · Highschools · Labs · Libraries'}`,
    ctaLabel: heroBlock.cta1?.label || 'Shop Furniture →',
    ctaHref: 'https://schoolmart.store',
    secondaryCtaLabel: heroBlock.cta2?.label || 'View Catalogue',
    secondaryCtaHref: heroBlock.cta2?.path || '/catalogues',
    image: heroBlock.mediaUrl || 'http://localhost:5000/uploads/1776230256967-images.jpg',
  };

  // C) 9 Canonical Categories
  const navbarCats = blocks.navbar?.data?.categories || [];
  const homeCategories = navbarCats.map((cat: any) => ({
    name: cat.name,
    label: cat.name,
    path: cat.path,
    href: cat.path,
    icon: cat.icon,
    active: true,
  }));

  // D) Ticker
  const tickerBlock = blocks.ticker?.data || {};
  const tickerTitle = tickerBlock.label || 'Latest Updates';
  const tickerAnnouncements = Array.isArray(tickerBlock.items) ? tickerBlock.items : [
    'Digital Transformation Summit: 15 May 2026',
    'New AI-Powered Learning Stations now available for pre-order',
    'Join our upcoming Campus Design Webinar on 15th April 2026',
    'Annual Sports Meet Registrations closing soon',
    'New Sustainable Furniture Catalogue Launched',
  ];

  // E) 16 Dynamic Feature Tiles
  const rawTiles = blocks.tiles?.data?.tiles || [];
  const homeFeatures = rawTiles.map((tile: any, idx: number) => {
    const tileTitle = tile.title || tile.inner?.heading || `Resource Tile ${idx + 1}`;
    const tileDesc = tile.inner?.description || tile.subtitle || '';
    const tileTag = tile.inner?.badge || 'Institutional Insight';
    return {
      path: tile.path,
      href: tile.path,
      img: tile.img,
      image: tile.img || tile.inner?.heroImg,
      span: tile.span || 'h-64',
      title: tileTitle,
      subtitle: tile.subtitle || 'Institutional Insight 2026',
      description: tileDesc,
      tag: tileTag,
      badge: tileTag,
      color: '#0d5496',
      inner: tile.inner || {},
      active: true,
    };
  });

  // F) 6 Solution Cards
  const rawSolutions = blocks.solutions?.data?.items || [];
  const homeServices = rawSolutions.map((sol: any) => ({
    title: sol.title,
    description: sol.description,
    subtitle: sol.description,
    path: sol.path,
    href: sol.path,
    badge: sol.badge,
    bgColor: sol.badge?.color || '#3B82F6',
    textColor: '#ffffff',
    img: sol.img,
    image: sol.img,
    active: true,
  }));

  // G) Featured Products Carousel (Resources)
  const productCarousel = blocks.product_carousel?.data || {};
  const rawProducts = productCarousel.items || [];
  const homeResources = {
    heading: productCarousel.heading || 'FEATURED PRODUCTS',
    subtitle: 'High-performance educational furniture and modern institutional infrastructure ready to order.',
    items: rawProducts.map((p: any) => {
      const storeLink = p.cartLink || (p.path && p.path.startsWith('http') ? p.path : 'https://schoolmart.store');
      return {
        title: p.title,
        description: `Institutional grade equipment · ₹${p.price}`,
        price: p.price,
        tag: `₹${p.price}`,
        path: storeLink,
        href: storeLink,
        cartLink: storeLink,
        img: p.img,
        image: p.img,
        color: '#0d5496',
        active: true,
      };
    }),
  };

  // H) Right Sidebar Blocks
  const trendingItems = blocks.sidebar_trending?.data?.items || [
    'Schools for Sale / Lease',
    'Fundraising',
    'Partnerships',
    'Workshops',
    'Job Openings',
    'Join as Influencers',
  ];

  const resourceGuideItems = blocks.sidebar_resources?.data?.items || [
    'Setup School in India',
    'Digitization Guide',
    'Product Catalog 2025',
    'Skill Lab Guide',
    'Lookbook – Play Furniture',
    'Gamified Math Resources',
    'Completed Projects',
    '20 Stunning School Design Ideas',
    'Library Trends',
  ];

  const rawBanners = blocks.sidebar_banners?.data?.banners || [
    { path: '/govt', color: '#06406f', label: 'Products for schl', sublabel: 'Govt School' },
    { path: '/renovation', color: '#9333EA', label: 'School Renovation', sublabel: 'Services' },
    { path: '/ideas', color: '#F97316', label: '20 Smart School Ideas', sublabel: '' },
  ];

  // Map to sidebar schema compatible with both FeatureCards and HomepageEditor
  const classifieds = trendingItems.map((item: string) => ({
    label: item,
    title: item,
    href: item.includes('Sale') ? '/colleges-universities-for-sale' : '/contact-us',
    active: true,
  }));

  const resourcesList = resourceGuideItems.map((item: string) => {
    let href = '/catalogues';
    if (item.includes('Setup School')) href = '/setup-guide';
    else if (item.includes('Digitization')) href = '/digital';
    else if (item.includes('Skill Lab')) href = '/labs';
    else if (item.includes('Furniture')) href = '/furniture';
    else if (item.includes('Math')) href = '/gamified-math-labs';
    else if (item.includes('Design Ideas')) href = '/design';
    else if (item.includes('Library')) href = '/libraries';
    else if (item.includes('Completed Projects')) href = '/completed-projects';
    return {
      label: item,
      title: item,
      href,
      active: true,
    };
  });

  const contactsList = rawBanners.map((b: any) => ({
    queryText: b.sublabel || 'EXPLORE OPPORTUNITIES',
    title: b.label,
    contact: '+91 9966109191',
    desc: '+91 9966109191',
    href: b.path || '/contact-us',
    path: b.path,
    bg: b.color || '#0d5496',
    active: true,
  }));

  const homeSidebar = {
    classifieds,
    resources: resourcesList,
    completedProjects: [],
    contacts: contactsList,
    banners: rawBanners,
    trendingTopics: trendingItems,
    resourceGuides: resourceGuideItems,
  };

  // I) WhatsApp Consultation CTA (Partnership)
  const whatsappBlock = blocks.cta_whatsapp?.data || {};
  const homePartnership = {
    // Extracted raw fields
    headline: whatsappBlock.headline || 'Ready to scale your campus?',
    description: whatsappBlock.description || 'At SchoolMart, we provide end-to-end expertise in guiding you to set up your new campus project. From spatial planning to high-density procurement, we help you maximize ROI and institutional growth.',
    badge: whatsappBlock.badge || 'Direct Consultation',
    phone: whatsappBlock.phone || '+91 9966109191',
    whatsappNumber: whatsappBlock.whatsappNumber || '919966109191',
    whatsappUrl: whatsappBlock.whatsappUrl || 'https://chat.whatsapp.com/L79Vd9B2p9a5Q9D9X9D9X9',
    btnLabel: whatsappBlock.btnLabel || 'Connect on WhatsApp',
    bgColor: whatsappBlock.bgColor || '#455fee',

    // Compatible mapped fields for PartnershipForm & HomepageEditor
    formTitle: 'Partnership Enquiry Form',
    formSubtitle: "Please fill out the form and we'll get back to you as soon as possible.",
    readyTitle: whatsappBlock.headline || 'Ready to scale your campus?',
    readyText: whatsappBlock.description || 'At SchoolMart, we provide end-to-end expertise in guiding you to set up your new campus project. From spatial planning to high-density procurement, we help you maximize ROI and institutional growth.',
    whatsappText: whatsappBlock.btnLabel || 'Connect on WhatsApp',
    phoneNumber: whatsappBlock.phone || '+91 9966109191',
    phoneText: `Call Us ${whatsappBlock.phone || '+91 9966109191'}`,
  };

  // J) Partners & Collaborations
  const partnersBlock = blocks.partners?.data || {};
  const collaborationsTitle = partnersBlock.heading || 'Trusted by Leading Schools';
  const collaborationsSubheading = partnersBlock.subheading || '4000+ partner schools across India';
  const rawClients = partnersBlock.clients || [
    { name: 'AVN Vida International School' },
    { name: 'Alwar Das Group' },
    { name: 'DRS International School' },
    { name: 'Bhashyam Educational Institutions' },
    { name: 'Excel Edge The Value School' },
    { name: 'Delhi Public School' },
    { name: 'DAV Public School' },
    { name: 'Podar International' },
    { name: 'CMS School' },
    { name: 'VIBGYOR Group' },
  ];
  const collaborations = rawClients.map((client: any) => ({
    name: client.name,
    active: true,
  }));
  const collaborationsStats = partnersBlock.stats || [
    { label: 'Partner Schools', value: '4000+' },
    { label: 'Years Experience', value: '7+' },
    { label: 'Products', value: '1200+' },
    { label: 'Panel Architects', value: '16+' },
  ];

  // K) Topbar
  const topbarBlock = blocks.topbar?.data || {};
  const topbar = {
    email: topbarBlock.email || 'info@schoolmart.in',
    phone1: topbarBlock.phone1 || '+91 9966109191',
    phone2: topbarBlock.phone2 || '+91 9866091111',
    bgColor: topbarBlock.bgColor || '#0d5496',
    textColor: topbarBlock.textColor || '#ffffff',
    socials: topbarBlock.socials || {
      twitter: 'https://twitter.com/schoolmarts',
      youtube: 'https://www.youtube.com/channel/UCgKY_Kf8jH1hoP3p0I0tiRA',
      facebook: 'https://www.facebook.com/share/1B7TodxPFN/',
      linkedin: 'https://www.linkedin.com/school/13397648/admin/notifications/all/',
      instagram: 'https://www.instagram.com/schoolmart.in/',
    },
    isVisible: blocks.topbar?.isVisible ?? true,
  };

  // 3. Upsert into SiteContent
  console.log('\n--- 1. UPSERTING SITECONTENT ENTRIES ---');

  const siteContentEntries: [string, any][] = [
    ['home_styles', homeStyles],
    ['home_hero', homeHero],
    ['home_categories', homeCategories],
    ['ticker_title', tickerTitle],
    ['ticker_announcements', tickerAnnouncements],
    ['home_features', homeFeatures],
    ['home_services', homeServices],
    ['home_resources', homeResources],
    ['home_sidebar', homeSidebar],
    ['home_partnership', homePartnership],
    ['collaborations_title', collaborationsTitle],
    ['collaborations_subheading', collaborationsSubheading],
    ['collaborations', collaborations],
    ['collaborations_stats', collaborationsStats],
    ['topbar', topbar],
    // Also sync canonical contact & social keys for universal site components
    ['contact_email', topbar.email],
    ['contact_email_alt', topbar.email],
    ['contact_phone', topbar.phone1],
    ['contact_phone_alt', topbar.phone2],
    ['social_facebook', topbar.socials.facebook],
    ['social_twitter', topbar.socials.twitter],
    ['social_youtube', topbar.socials.youtube],
    ['social_linkedin', topbar.socials.linkedin],
    ['social_instagram', topbar.socials.instagram],
  ];

  for (const [key, value] of siteContentEntries) {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    await prisma.siteContent.upsert({
      where: { key },
      update: { value: stringVal },
      create: { key, value: stringVal },
    });
    console.log(`[PASS] Upserted SiteContent: "${key}" (${stringVal.length} bytes)`);
  }

  // 4. Upsert Page entry for 'home'
  console.log('\n--- 2. UPSERTING PAGE RECORD: "home" ---');

  const pageDataPayload = {
    title: 'Home Page',
    hero: homeHero,
    styles: homeStyles,
    categories: homeCategories,
    ticker: {
      title: tickerTitle,
      items: tickerAnnouncements,
    },
    features: homeFeatures,
    services: homeServices,
    resources: homeResources,
    sidebar: homeSidebar,
    partnership: homePartnership,
    collaborations: {
      title: collaborationsTitle,
      subheading: collaborationsSubheading,
      items: collaborations,
      stats: collaborationsStats,
    },
    topbar: topbar,
  };

  const pageRecord = await prisma.page.upsert({
    where: { slug: 'home' },
    update: {
      title: 'Home Page',
      template: 'home',
      published: true,
      pageData: JSON.stringify(pageDataPayload),
    },
    create: {
      title: 'Home Page',
      slug: 'home',
      template: 'home',
      published: true,
      pageData: JSON.stringify(pageDataPayload),
    },
  });

  console.log(`[PASS] Upserted Page record: ID=${pageRecord.id}, slug="${pageRecord.slug}", template="${pageRecord.template}", published=${pageRecord.published}`);

  console.log('\n================================================================');
  console.log('✅ NEON POSTGRESQL DATABASE SEEDING COMPLETED SUCCESSFULLY! ✅');
  console.log('================================================================');
}

main()
  .catch((err) => {
    console.error('❌ SEEDING FAILED WITH ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
