import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '../src/lib/prisma';

export const DEFAULT_HEADER_NAV = [
  { label: 'Home', href: '/' },
  {
    label: 'Corporate',
    href: '/corporate',
    hasDropdown: true,
    dropdownItems: [
      { label: 'About Us', href: '/about-us' },
      { label: 'Manufacturing', href: '/manufacturing' },
    ],
  },
  { label: 'Catalogues', href: '/catalogues' },
  { label: 'Environments', href: '/environments' },
  { label: 'SHOP', href: 'https://schoolmart.store' },
  { label: 'GUIDES', href: '/guides' },
  { label: 'Contact Us', href: '/contact-us' },
];

async function seedHeaderNav() {
  console.log('Seeding header_navigation into SiteContent table in Neon DB...');

  const record = await prisma.siteContent.upsert({
    where: { key: 'header_navigation' },
    update: {
      value: JSON.stringify(DEFAULT_HEADER_NAV),
    },
    create: {
      key: 'header_navigation',
      value: JSON.stringify(DEFAULT_HEADER_NAV),
    },
  });

  console.log(`✅ header_navigation seeded successfully with ID: ${record.id}`);
  console.log('Content saved:', JSON.stringify(DEFAULT_HEADER_NAV, null, 2));
}

seedHeaderNav()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
