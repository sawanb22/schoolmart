import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/lib/prisma';

function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSlug(s: string): string {
  const cleaned = String(s || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  const lastSeg = cleaned.split('/').pop() || cleaned;
  return slugify(lastSeg);
}

// Static routes from frontend/src/App.tsx (explicit non-param routes excluding /admin/*, /shop, and redirects)
const STATIC_ROUTES: Array<{ path: string; expectTitle: string }> = [
  { path: '/', expectTitle: 'CampusMart' },
  { path: '/login', expectTitle: 'Login' },
  { path: '/register', expectTitle: 'Register' },
  { path: '/registration', expectTitle: 'Register' },
  { path: '/smart-classrooms', expectTitle: 'Smart Classrooms' },
  { path: '/find-solutions', expectTitle: 'Find Solutions' },
  { path: '/ai-digital-design-supply', expectTitle: 'AI Digital Design' },
  { path: '/ai-ml', expectTitle: 'AI & Machine Learning' },
  { path: '/ai-stations', expectTitle: 'AI Stations' },
  { path: '/assessment-system', expectTitle: 'Assessment' },
  { path: '/blog', expectTitle: 'Blog' },
  { path: '/ar-vr-experiences', expectTitle: 'AR/VR' },
  { path: '/campus-automation', expectTitle: 'Campus Automation' },
  { path: '/campus-design-execution', expectTitle: 'Campus Design' },
  { path: '/campus-master-planning', expectTitle: 'Master Planning' },
  { path: '/campus-furniture-design', expectTitle: 'Campus Furniture' },
  { path: '/campus-design', expectTitle: 'Campus Design' },
  { path: '/catalogues', expectTitle: 'Catalogues' },
  { path: '/classifieds', expectTitle: 'Classifieds' },
  { path: '/colleges-universities-for-sale', expectTitle: 'Colleges' },
  { path: '/collaboration-spaces', expectTitle: 'Collaboration Spaces' },
  { path: '/contact-us', expectTitle: 'Contact' },
  { path: '/about-us', expectTitle: 'About' },
  { path: '/digital-transformation', expectTitle: 'Digital Transformation' },
  { path: '/faq', expectTitle: 'FAQ' },
  { path: '/furniture', expectTitle: 'Furniture' },
  { path: '/science-tech-labs', expectTitle: 'Science & Tech Labs' },
  { path: '/job-openings', expectTitle: 'Careers' },
  { path: '/labs', expectTitle: 'Labs' },
  { path: '/libraries', expectTitle: 'Libraries' },
  { path: '/library-management', expectTitle: 'Library Management' },
  { path: '/lms', expectTitle: 'Learning Management' },
  { path: '/lookbook', expectTitle: 'Lookbook' },
  { path: '/my-account', expectTitle: 'Account' },
  { path: '/new-environments', expectTitle: 'New Environments' },
  { path: '/partnership', expectTitle: 'Partnership' },
  { path: '/partner-with-colleges', expectTitle: 'Partner with Colleges' },
  { path: '/product-catalog', expectTitle: 'Product Catalog' },
  { path: '/request-quote', expectTitle: 'Request Quote' },
  { path: '/sports-design-execution', expectTitle: 'Sports Design' },
  { path: '/sports-infra', expectTitle: 'Sports Infrastructure' },
  { path: '/tech-infra', expectTitle: 'Tech Infrastructure' },
];

export interface GoldenRoute {
  path: string;
  kind: 'page' | 'detail' | 'static';
  expectTitle: string;
}

async function exportRouteInventory() {
  console.log('Querying published pages from database (read-only)...');
  const pages = await prisma.page.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      slug: true,
      template: true,
      pageData: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${pages.length} published pages.`);

  const routesMap = new Map<string, GoldenRoute>();

  // 1. Static routes from App.tsx
  for (const sr of STATIC_ROUTES) {
    routesMap.set(sr.path, {
      path: sr.path,
      kind: 'static',
      expectTitle: sr.expectTitle,
    });
  }

  // 2. Published pages from DB
  for (const page of pages) {
    const pagePath = `/${page.slug}`;
    if (!routesMap.has(pagePath)) {
      routesMap.set(pagePath, {
        path: pagePath,
        kind: 'page',
        expectTitle: page.title || page.slug,
      });
    }

    // 3. Card collections
    if (!page.pageData) continue;
    let data: any;
    try {
      data = JSON.parse(page.pageData);
    } catch {
      continue;
    }

    const collections = ['cards', 'section2Cards', 'moreCards', 'featured'];
    for (const col of collections) {
      if (!data[col]) continue;
      const items = Array.isArray(data[col])
        ? data[col]
        : (typeof data[col] === 'object' && Object.keys(data[col]).length > 0 ? [data[col]] : []);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object') continue;
        const rawTitle = item.title || item.name || item.question || item.heading || '';
        const itemSlug = item.slug ? normalizeSlug(item.slug) : slugify(rawTitle);
        if (!itemSlug) continue;

        const detailPath = `/${page.slug}/${itemSlug}`;
        if (!routesMap.has(detailPath)) {
          routesMap.set(detailPath, {
            path: detailPath,
            kind: 'detail',
            expectTitle: rawTitle || itemSlug,
          });
        }
      }
    }
  }

  const goldenRoutes: GoldenRoute[] = Array.from(routesMap.values());
  console.log(`Total generated golden routes: ${goldenRoutes.length}`);

  const outputDir = path.resolve(__dirname, '../../tests/e2e');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'golden-routes.json');
  fs.writeFileSync(outputPath, JSON.stringify(goldenRoutes, null, 2), 'utf8');
  console.log(`Wrote golden route inventory to ${outputPath}`);
}

exportRouteInventory()
  .catch((err) => {
    console.error('Failed to export route inventory:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
