import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const footerSettingsData = {
  aboutText: 'schoolmart.in is a consortium of architects, designers, and school innovators. We help schools in setting up new campuses, expanding existing institutions, design-to-execution, specialized learning environments, labs, libraries, and athletic infrastructure.',
  aboutLinks: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Seller & Vendor Help', href: '/seller-help' },
    { label: 'Sell on SchoolMart', href: '/sell-on-schoolmart' },
    { label: 'Institutional Setup Guide', href: '/setup-guide' }
  ],
  businessLinks: [
    { label: 'About SchoolMart', href: '/about-us' },
    { label: 'Corporate Solutions', href: '/corporate' },
    { label: 'Institutional Partnerships', href: '/partnerships' },
    { label: 'Contact Us & RFP', href: '/contact-us' },
    { label: 'Institutional Pricing', href: '/pricing' },
    { label: 'School Sale & Campus Classifieds', href: '/school-sale' },
    { label: 'Delivery Locations', href: '/delivery-locations' },
    { label: 'Report Issue / Grievance', href: '/report-issue' },
    { label: 'Blog & Editorial', href: '/blog' }
  ],
  categories: [
    {
      title: 'School Furniture',
      items: [
        { label: 'Primary & High School', href: '/furniture' },
        { label: 'Kindergarten Furniture', href: '/p/kindergarten-design' },
        { label: 'Ergonomic Classrooms', href: '/p/furniture-design-planning-' },
        { label: 'Institutional Desk Systems', href: '/furniture' },
        { label: 'SchoolMart Store (Online)', href: 'https://schoolmart.store' }
      ]
    },
    {
      title: 'Labs & Libraries',
      items: [
        { label: 'Composite Skill Labs', href: '/labs' },
        { label: 'Science & Experiential Labs', href: '/science' },
        { label: 'Smart STEM Labs Design', href: '/p/environment-smart-stem-labs-design-to-execution' },
        { label: 'Gamified Math Lab', href: '/mathematics' },
        { label: 'Phygital Modern Libraries', href: '/libraries' }
      ]
    },
    {
      title: 'Sports & Activity',
      items: [
        { label: 'Smart Sports Infrastructure', href: '/sports' },
        { label: 'Synthetic Turf & Athletic Courts', href: '/sports' },
        { label: 'Indoor Play & Motor Skills', href: '/p/environment-indoor-play-n-activity-rooms' },
        { label: 'Physical Activity Studios', href: '/p/environment-kindergarten-primary-physical-activity-room' }
      ]
    },
    {
      title: 'Technology & Spaces',
      items: [
        { label: 'Digital Infrastructure', href: '/digital' },
        { label: 'Interactive Panels (IFP)', href: '/p/16-latetest-' },
        { label: '20 AI Tools for Classrooms', href: '/p/20-ai-tools' },
        { label: 'Campus Architecture', href: '/school-building-design' },
        { label: 'Specialized Environments', href: '/environments' }
      ]
    }
  ],
  brands: [
    { label: 'European Educational Group', href: '/partnerships' },
    { label: 'MAXHUB Smart Displays', href: '/digital' },
    { label: 'SportSurf Turf Systems', href: '/sports' },
    { label: 'ViewSonic Panels', href: '/digital' },
    { label: 'Wondergartens Biophilic Play', href: '/p/wondergartens' },
    { label: 'Little Tikes Commercial', href: '/p/environment-indoor-play-n-activity-rooms' },
    { label: 'ButterflyFields STEM Kits', href: '/labs' },
    { label: 'ALTOP Lab Equipment', href: '/science' }
  ],
  trending: [
    { label: 'NEP Ready Ultra Modern Labs', href: '/labs' },
    { label: 'STEM Lab Design to Execution', href: '/p/environment-smart-stem-labs-design-to-execution' },
    { label: 'Futuristic School Architecture', href: '/school-building-design' },
    { label: 'Digitisation of Entire Campus', href: '/digital' },
    { label: 'Art & Craft Studios', href: '/p/environment-art-craft-rooms' },
    { label: 'Dining Hall Design & Execution', href: '/p/environment-dining-hall-design-to-execution' },
    { label: 'Interactive Learning Walls', href: '/p/interactivities-walls' },
    { label: '50 Global Resources Guide', href: '/p/guide-50-global-resources-for-school-excellence' },
    { label: 'School Buy & Sell Exchange', href: '/school-sale' }
  ],
  copyright: '© 2016-2026, Third Eye Retail Pvt. Ltd. | SchoolMart Consortium',
  policyLinks: [
    { label: 'Shipping & Transit Policy', href: '/shipping-policy' },
    { label: 'Cancellation Policy', href: '/cancellation-policy' },
    { label: 'Replacement & Return', href: '/replacement-return' },
    { label: 'Order Rejection Policy', href: '/order-rejection-policy' },
    { label: 'Payments & Escrow Terms', href: '/payments' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-use' }
  ]
};

const socialLinksData: Record<string, string> = {
  social_facebook: 'https://www.facebook.com/schoolmart.in/',
  social_twitter: 'https://x.com/schoolmartindia',
  social_youtube: 'https://www.youtube.com/@schoolmartindia',
  social_instagram: 'https://www.instagram.com/schoolmart.in/',
  social_linkedin: 'https://www.linkedin.com/company/schoolmart/',
  social_pinterest: 'https://in.pinterest.com/schoolmartindia/'
};

async function seedFooter() {
  console.log('Seeding footer_settings in SiteContent table...');

  // 1. Upsert footer_settings
  await prisma.siteContent.upsert({
    where: { key: 'footer_settings' },
    update: { value: JSON.stringify(footerSettingsData) },
    create: { key: 'footer_settings', value: JSON.stringify(footerSettingsData) }
  });
  console.log('footer_settings seeded successfully!');

  // 2. Upsert social links
  for (const [key, value] of Object.entries(socialLinksData)) {
    await prisma.siteContent.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }
  console.log('Social media links seeded successfully!');

  // 3. Upsert sitewide contact info for SchoolMart
  const contactUpdates = {
    site_email: 'info@schoolmart.in',
    site_phone: '+91 9966109191',
    site_whatsapp: '+91 9966109191',
    company_name: 'SchoolMart India',
    site_tagline: 'Turnkey School Infrastructure, Unified Master CMS & Institutional Procurement Platform'
  };

  for (const [key, value] of Object.entries(contactUpdates)) {
    await prisma.siteContent.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }
  console.log('Sitewide contact info updated for SchoolMart!');
}

seedFooter()
  .catch((e) => {
    console.error('Error seeding footer settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
