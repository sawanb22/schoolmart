const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Target pages and their existing card-derived categories to sync into pageData.categories in PostgreSQL
const PAGE_CATEGORY_SYNC = {
  'tech-infra': [
    'Classroom Tech',
    'Displays',
    'Networking',
    'Wi-Fi & Fiber',
    'Servers & Cloud',
    'Security',
    'Firewall & Safety'
  ],
  'sports-infra': [
    'Indoor',
    'Outdoor',
    'Training',
    'Kids',
    'Adults'
  ],
  'labs': [
    'Science Labs',
    'Skill Labs',
    'Tech Labs',
    'STEM & Innovation'
  ],
  'libraries': [
    'Reading & Study',
    'Storage & Stacks',
    'Digital & Tech',
    'Collaborative'
  ],
  'ai-guide': [
    'Learning',
    'Operations',
    'People',
    'Strategy'
  ],
  'innovation': [
    'All tracks',
    'Ideation',
    'Incubation',
    'Acceleration',
    'Funding',
    'Ecosystem'
  ],
  'resources': [
    'Guides',
    'Founding',
    'Compliance'
  ],
  'classifieds': [
    'Institutions',
    'Funding',
    'Partnerships',
    'Careers'
  ]
};

async function run() {
  console.log('=== STEP 1: SYNCING PAGE CATEGORIES IN POSTGRESQL ===');
  
  for (const [slug, defaultCats] of Object.entries(PAGE_CATEGORY_SYNC)) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.log(`Page "${slug}" not found in database. Skipping.`);
      continue;
    }

    const pageData = JSON.parse(page.pageData || '{}');
    const existingExplicit = Array.isArray(pageData.categories) ? pageData.categories : [];
    
    // Combine explicit categories with default categories, deduplicating while preserving order
    const merged = Array.from(new Set([...existingExplicit, ...defaultCats])).filter(Boolean);
    
    // Also ensure each card with legacy category: string gets categories: [string] array
    const updatedCards = (pageData.cards || []).map(card => {
      if (!card) return card;
      const cats = Array.isArray(card.categories)
        ? card.categories
        : card.category
        ? [card.category]
        : [];
      return {
        ...card,
        categories: cats
      };
    });

    pageData.categories = merged;
    pageData.cards = updatedCards;

    await prisma.page.update({
      where: { id: page.id },
      data: {
        pageData: JSON.stringify(pageData),
        updatedAt: new Date()
      }
    });

    console.log(`✓ Synchronized "${slug}" [ID ${page.id}]: ${merged.length} categories, ${updatedCards.length} cards.`);
  }

  console.log('\n✓ Step 1 Complete: All target pages synced in PostgreSQL.');
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
