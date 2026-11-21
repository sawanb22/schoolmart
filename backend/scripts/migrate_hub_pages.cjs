const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateHubPages() {
  console.log('--- Starting Hub Pages Migration to template: grid ---');

  // 1. ai-guide
  const aiGuidePage = await prisma.page.findUnique({ where: { slug: 'ai-guide' } });
  if (aiGuidePage) {
    let pd = {};
    try { pd = JSON.parse(aiGuidePage.pageData || '{}'); } catch(e) {}
    pd.heroTitle = pd.heroTitle || 'AI Implementation Guide';
    pd.heroSubtitle = pd.heroSubtitle || 'Your comprehensive guide to implementing AI solutions in educational institutions. Step-by-step roadmap for digital transformation.';
    pd.heroImage = pd.heroImage || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80';
    pd.section1Title = pd.section1Title || 'AI Implementation Steps';
    pd.styles = {
      headingFont: 'playfair',
      bodyFont: 'opensans',
      primaryColor: '#ed9816',
      heroBg: 'paper',
      ctaBg: 'stone',
      heroLayout: 'minimal',
      cardColumns: '3',
      showFeatured: true,
      showFilters: true,
      ...(pd.styles || {})
    };
    // Clean card images and set explicit hrefs
    if (Array.isArray(pd.cards)) {
      pd.cards = pd.cards.map((c, i) => {
        let img = c.image;
        if (!img || img.includes('/uploads/media/1791712009615') || img.includes('/uploads/media/1791712019622')) {
          const fallbackImgs = [
            'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=85',
            'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=85',
            'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=85',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=85'
          ];
          img = fallbackImgs[i % fallbackImgs.length];
        }
        const slug = (c.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return {
          ...c,
          image: img,
          href: c.href || `/ai-guide/${slug}`
        };
      });
    }
    await prisma.page.update({
      where: { slug: 'ai-guide' },
      data: {
        template: 'grid',
        published: true,
        pageData: JSON.stringify(pd)
      }
    });
    console.log('✓ ai-guide updated to template: grid');
  }

  // 2. setup-college
  const setupPage = await prisma.page.findUnique({ where: { slug: 'setup-college' } });
  if (setupPage) {
    let pd = {};
    try { pd = JSON.parse(setupPage.pageData || '{}'); } catch(e) {}
    pd.heroTitle = pd.heroTitle || 'Setup Your College';
    pd.heroSubtitle = pd.heroSubtitle || 'Your one-stop guide to setting up a new educational institution from scratch — infrastructure, technology, and compliance.';
    pd.heroImage = pd.heroImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80';
    pd.section1Title = pd.section1Title || 'Setup Steps';
    pd.styles = {
      headingFont: 'grotesk',
      bodyFont: 'opensans',
      primaryColor: '#0f2744',
      heroBg: 'slate',
      ctaBg: 'blue',
      heroLayout: 'split-right',
      cardColumns: '3',
      showFeatured: false,
      showFilters: true,
      ...(pd.styles || {})
    };
    const sampleImgs = [
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1516321318423-f06a051b3e14?auto=format&fit=crop&w=800&q=85'
    ];
    if (Array.isArray(pd.cards)) {
      pd.cards = pd.cards.map((c, i) => {
        const slug = (c.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return {
          ...c,
          image: c.image || sampleImgs[i % sampleImgs.length],
          href: c.href || `/setup-college/${slug}`,
          readTime: c.readTime || '5 min read'
        };
      });
    }
    await prisma.page.update({
      where: { slug: 'setup-college' },
      data: {
        template: 'grid',
        published: true,
        pageData: JSON.stringify(pd)
      }
    });
    console.log('✓ setup-college updated to template: grid');
  }

  // 3. ugc-guidelines
  const ugcPage = await prisma.page.findUnique({ where: { slug: 'ugc-guidelines' } });
  if (ugcPage) {
    let pd = {};
    try { pd = JSON.parse(ugcPage.pageData || '{}'); } catch(e) {}
    pd.heroTitle = pd.heroTitle || 'UGC Guidelines';
    pd.heroSubtitle = pd.heroSubtitle || 'Stay compliant with the latest University Grants Commission guidelines. Your comprehensive reference for UGC regulations and requirements.';
    pd.heroImage = pd.heroImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80';
    pd.section1Title = pd.section1Title || 'Key Guidelines';
    pd.styles = {
      headingFont: 'poppins',
      bodyFont: 'opensans',
      primaryColor: '#0047ab',
      heroBg: 'white',
      ctaBg: 'stone',
      heroLayout: 'split-right',
      cardColumns: '3',
      showFeatured: false,
      showFilters: true,
      ...(pd.styles || {})
    };
    const sampleImgs = [
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1516321318423-f06a051b3e14?auto=format&fit=crop&w=800&q=85'
    ];
    if (Array.isArray(pd.cards)) {
      pd.cards = pd.cards.map((c, i) => {
        const slug = (c.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return {
          ...c,
          image: c.image || sampleImgs[i % sampleImgs.length],
          href: c.href || `/ugc-guidelines/${slug}`,
          readTime: c.readTime || '6 min read'
        };
      });
    }
    await prisma.page.update({
      where: { slug: 'ugc-guidelines' },
      data: {
        template: 'grid',
        published: true,
        pageData: JSON.stringify(pd)
      }
    });
    console.log('✓ ugc-guidelines updated to template: grid');
  }

  // 4. innovation
  const innovationPage = await prisma.page.findUnique({ where: { slug: 'innovation' } });
  if (innovationPage) {
    let pd = {};
    try { pd = JSON.parse(innovationPage.pageData || '{}'); } catch(e) {}
    pd.heroTitle = pd.heroTitle || pd.pageTitle || 'Campus Innovation & Startup Journal';
    pd.heroSubtitle = pd.heroSubtitle || 'A practical blueprint for institutions designing maker labs, venture studios, and funding pipelines for student founders.';
    pd.styles = {
      headingFont: 'poppins',
      bodyFont: 'opensans',
      primaryColor: '#ffb433',
      secondaryColor: '#f47b20',
      heroBg: 'paper',
      ctaBg: 'stone',
      heroLayout: 'minimal',
      cardColumns: '3',
      showFeatured: true,
      showFilters: true,
      ...(pd.styles || {})
    };
    await prisma.page.update({
      where: { slug: 'innovation' },
      data: {
        template: 'grid',
        published: true,
        pageData: JSON.stringify(pd)
      }
    });
    console.log('✓ innovation updated to template: grid');
  }

  // 5. collaboration
  const collabPage = await prisma.page.findUnique({ where: { slug: 'collaboration' } });
  if (collabPage) {
    let pd = {};
    try { pd = JSON.parse(collabPage.pageData || '{}'); } catch(e) {}
    pd.heroTitle = pd.heroTitle || 'Collaboration Spaces';
    pd.heroSubtitle = pd.heroSubtitle || 'Foster teamwork and creativity with purpose-built collaboration environments. Modern spaces designed to bring students and faculty together.';
    pd.styles = {
      headingFont: 'poppins',
      bodyFont: 'opensans',
      primaryColor: '#0047ab',
      heroBg: 'blue',
      ctaBg: 'white',
      heroLayout: 'split-right',
      cardColumns: '3',
      showFeatured: false,
      showFilters: true,
      ...(pd.styles || {})
    };
    if (Array.isArray(pd.cards)) {
      pd.cards = pd.cards.map((c) => {
        const slug = (c.slug || c.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return {
          ...c,
          href: c.href || `/collaboration/${slug}`
        };
      });
    }
    await prisma.page.update({
      where: { slug: 'collaboration' },
      data: {
        template: 'grid',
        published: true,
        pageData: JSON.stringify(pd)
      }
    });
    console.log('✓ collaboration updated to template: grid');
  }

  // 6. resources
  const resourcesPage = await prisma.page.findUnique({ where: { slug: 'resources' } });
  const resourcesData = {
    heroTitle: 'Resources & Guides',
    heroSubtitle: 'Explore our curated guides, product catalogs, and official frameworks to inspire your next campus project.',
    heroImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=85',
    section1Title: 'Featured Guides & Frameworks',
    cards: [
      {
        title: 'AI Implementation Guide',
        description: 'A comprehensive guide for implementing AI in educational institutions, including assessment, roadmap planning, and staff upskilling.',
        image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=85',
        href: '/ai-guide',
        category: 'Guides',
        readTime: '6 min read'
      },
      {
        title: 'Setting Up a College in India',
        description: 'Step-by-step masterclass to establishing a new college in India: regulatory approvals, campus master planning, and modern procurement.',
        image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=85',
        href: '/setup-college',
        category: 'Founding',
        readTime: '8 min read'
      },
      {
        title: 'UGC Guidelines for Digital Campus',
        description: 'Latest UGC guidelines for the digital transformation of campuses, infrastructure norms, digital library standards, and approved labs.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=85',
        href: '/ugc-guidelines',
        category: 'Compliance',
        readTime: '7 min read'
      }
    ],
    categories: ['All', 'Guides', 'Founding', 'Compliance'],
    styles: {
      headingFont: 'poppins',
      bodyFont: 'opensans',
      primaryColor: '#0047ab',
      heroBg: 'blue',
      ctaBg: 'white',
      heroLayout: 'split-right',
      cardColumns: '3',
      showFeatured: false,
      showFilters: true
    }
  };

  if (resourcesPage) {
    await prisma.page.update({
      where: { slug: 'resources' },
      data: {
        title: 'Resources & Guides',
        template: 'grid',
        published: true,
        pageData: JSON.stringify(resourcesData)
      }
    });
  } else {
    await prisma.page.create({
      data: {
        title: 'Resources & Guides',
        slug: 'resources',
        template: 'grid',
        published: true,
        pageData: JSON.stringify(resourcesData)
      }
    });
  }
  console.log('✓ resources updated to template: grid');

  console.log('--- All 6 Hub Pages successfully migrated to template: grid ---');
}

migrateHubPages()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
