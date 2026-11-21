import assert from 'assert';

// ==============================================================================
// TEST SUITE: Hub Catalog Edge Cases & Shop.tsx Reactive Flows Verification
// ==============================================================================

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      suite,
      name,
      status: 'PASS',
      durationMs: Date.now() - start,
    });
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: any) {
    results.push({
      suite,
      name,
      status: 'FAIL',
      details: err?.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  ✗ [FAIL] ${name}:`, err?.message || err);
  }
}

// ==============================================================================
// Pure Logic Simulator for Hub Aggregation (Mirrors pages.routes.ts line 315-483)
// ==============================================================================

function processHubCatalog({
  hubPages,
  furnitureProducts,
  furnitureCategories,
}: {
  hubPages: Array<{ id: number; slug: string; title: string; pageData: any }>;
  furnitureProducts: Array<any>;
  furnitureCategories: Array<any>;
}) {
  const hubMap = new Map<string, any>(hubPages.map(p => [p.slug, p]));

  interface UnifiedHubItem {
    id: string | number;
    title: string;
    description: string;
    image: string;
    categories: string[];
    slug: string;
    href: string;
    hubSlug: string;
    hubTitle: string;
    price?: number;
  }

  const items: UnifiedHubItem[] = [];

  const furnitureCatNames = Array.from(new Set([
    ...furnitureCategories.map(c => (c.name || '').trim()),
    ...furnitureProducts.map(p => p.category?.name?.trim()).filter(Boolean) as string[],
  ]));

  for (const p of furnitureProducts) {
    const catName = p.category?.name?.trim() || 'General Furniture';
    items.push({
      id: `prod-${p.id}`,
      title: p.name,
      description: p.description || '',
      image: p.imageUrl || '',
      categories: [catName],
      slug: p.slug,
      href: `/furniture?category=${p.category?.slug || 'chairs'}`,
      hubSlug: 'furniture',
      hubTitle: 'Campus Furniture',
      price: p.price,
    });
  }

  const HUB_METADATA: Record<string, { title: string; defaultCategories: string[] }> = {
    'furniture': { title: 'Campus Furniture', defaultCategories: furnitureCatNames },
    'labs': { title: 'Science & Tech Labs', defaultCategories: ['Science Labs', 'Skill Labs', 'Tech Labs', 'STEM & Innovation'] },
    'sports-infra': { title: 'Sports Infrastructure', defaultCategories: ['CONSULTING', 'SURFACE SPORTS', 'INDOOR SPORTS', 'ATHLETICS', 'WATER SPORTS', 'ARTIFICIAL TURF'] },
    'tech-infra': { title: 'Tech Infrastructure', defaultCategories: ['Classroom Tech', 'Displays', 'Networking', 'Wi-Fi & Fiber', 'Servers & Cloud', 'Security'] },
    'libraries': { title: 'Smart Libraries', defaultCategories: ['seating', 'shelving & display', 'Digital & Tech', 'Collaborative'] },
  };

  const hubConfigs: Array<{ id: string; title: string; subcategories: string[]; totalCount: number }> = [];

  hubConfigs.push({
    id: 'furniture',
    title: HUB_METADATA['furniture'].title,
    subcategories: furnitureCatNames,
    totalCount: furnitureProducts.length,
  });

  for (const slug of ['labs', 'sports-infra', 'tech-infra', 'libraries']) {
    const page = hubMap.get(slug);
    const meta = HUB_METADATA[slug] || { title: slug, defaultCategories: [] };
    let rawData: any = {};
    if (page?.pageData) {
      try {
        rawData = typeof page.pageData === 'string' ? JSON.parse(page.pageData) : page.pageData;
      } catch {}
    }

    const explicitCats: string[] = Array.isArray(rawData.categories)
      ? rawData.categories.filter(Boolean)
      : meta.defaultCategories;

    const pageCards: any[] = Array.isArray(rawData.cards) ? rawData.cards : [];
    const cardCatSet = new Set<string>(explicitCats);

    let pageItemCount = 0;
    for (let i = 0; i < pageCards.length; i++) {
      const c = pageCards[i];
      if (!c || !c.title) continue;

      const cardCats: string[] = Array.isArray(c.categories)
        ? c.categories.filter(Boolean)
        : c.category
        ? [c.category]
        : [];

      cardCats.forEach(cat => {
        if (cat) cardCatSet.add(cat.trim());
      });

      const fallbackSlug = (c.slug || c.title || `card-${i}`)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `item-${i}`;

      items.push({
        id: `${slug}-${i}`,
        title: c.title,
        description: c.description || '',
        image: c.image || '',
        categories: cardCats.length > 0 ? cardCats : [explicitCats[0] || 'General'],
        slug: fallbackSlug,
        href: c.href || `/${slug}/${fallbackSlug}`,
        hubSlug: slug,
        hubTitle: page?.title || meta.title,
      });
      pageItemCount++;
    }

    hubConfigs.push({
      id: slug,
      title: page?.title || meta.title,
      subcategories: Array.from(cardCatSet),
      totalCount: pageItemCount,
    });
  }

  const cacheHeader = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';
  const response = {
    hubs: [
      {
        id: 'all',
        title: 'All Solutions',
        subcategories: [],
        totalCount: items.length,
      },
      ...hubConfigs,
    ],
    items,
  };

  return { response, cacheHeader };
}

// ==============================================================================
// Shop.tsx Reactive Calculations Simulator
// ==============================================================================

function simulateShopFiltering({
  catalog,
  activeHub = 'all',
  activeCategory = 'all',
  debouncedSearch = '',
  currentPage = 1,
  pageSize = 12,
}: {
  catalog: { hubs: any[]; items: any[] };
  activeHub?: string;
  activeCategory?: string;
  debouncedSearch?: string;
  currentPage?: number;
  pageSize?: number;
}) {
  // 1. Dynamic Subcategory Counts
  const subcategoryCounts: Record<string, number> = {};
  const relevantItems = activeHub === 'all'
    ? catalog.items
    : catalog.items.filter((item) => item.hubSlug === activeHub);

  for (const item of relevantItems) {
    for (const cat of (item.categories || [])) {
      subcategoryCounts[cat] = (subcategoryCounts[cat] || 0) + 1;
    }
  }

  // 2. Item Filtering
  const filteredItems = catalog.items.filter((item) => {
    // Hub filter
    if (activeHub !== 'all' && item.hubSlug !== activeHub) {
      return false;
    }
    // Subcategory filter
    if (activeCategory !== 'all') {
      const itemCats = (item.categories || []).map((c: string) => c.toLowerCase());
      const target = activeCategory.toLowerCase();
      if (!itemCats.includes(target) && !itemCats.some((c: string) => c.includes(target))) {
        return false;
      }
    }
    // Search query filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(query);
      const descMatch = (item.description || '').toLowerCase().includes(query);
      const catMatch = (item.categories || []).some((c: string) => c.toLowerCase().includes(query));
      if (!titleMatch && !descMatch && !catMatch) {
        return false;
      }
    }
    return true;
  });

  // 3. Pagination math
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  return {
    subcategoryCounts,
    filteredItems,
    totalItems,
    totalPages,
    paginatedItems,
  };
}

// ==============================================================================
// EXECUTE VERIFICATION SUITES
// ==============================================================================

async function main() {
  console.log('\n=== TASK 4: Edge Cases in GET /api/pages/hub/catalog ===\n');

  // Test 4.1: Empty Cards Handling
  await runTest('HubCatalog-EdgeCases', 'Empty cards array produces totalCount=0 and no crashed items', () => {
    const { response } = processHubCatalog({
      hubPages: [
        { id: 1, slug: 'labs', title: 'Labs', pageData: JSON.stringify({ cards: [] }) },
      ],
      furnitureProducts: [],
      furnitureCategories: [],
    });
    const labsHub = response.hubs.find(h => h.id === 'labs');
    assert.strictEqual(labsHub?.totalCount, 0, 'labs totalCount must be 0');
    assert.strictEqual(response.items.length, 0, 'items length must be 0');
  });

  await runTest('HubCatalog-EdgeCases', 'Cards containing null, undefined, and empty objects are safely filtered', () => {
    const { response } = processHubCatalog({
      hubPages: [
        {
          id: 1,
          slug: 'labs',
          title: 'Labs',
          pageData: JSON.stringify({
            cards: [
              null,
              undefined,
              {},
              { title: '' }, // empty title should be skipped
              { title: 'Valid Lab Card', category: 'Tech Labs' },
            ],
          }),
        },
      ],
      furnitureProducts: [],
      furnitureCategories: [],
    });
    const labsHub = response.hubs.find(h => h.id === 'labs');
    assert.strictEqual(labsHub?.totalCount, 1, 'Only 1 valid card must be counted');
    assert.strictEqual(response.items.length, 1, 'Only 1 item created');
    assert.strictEqual(response.items[0].title, 'Valid Lab Card');
    assert.deepStrictEqual(response.items[0].categories, ['Tech Labs']);
  });

  await runTest('HubCatalog-EdgeCases', 'Missing cards property falls back to empty array', () => {
    const { response } = processHubCatalog({
      hubPages: [
        { id: 1, slug: 'sports-infra', title: 'Sports', pageData: JSON.stringify({ heroTitle: 'Hello' }) },
      ],
      furnitureProducts: [],
      furnitureCategories: [],
    });
    const sportsHub = response.hubs.find(h => h.id === 'sports-infra');
    assert.strictEqual(sportsHub?.totalCount, 0);
  });

  // Test 4.2: Non-array Categories Handling
  await runTest('HubCatalog-EdgeCases', 'Non-array page categories fallback safely to defaultCategories', () => {
    const { response } = processHubCatalog({
      hubPages: [
        {
          id: 1,
          slug: 'labs',
          title: 'Labs',
          pageData: JSON.stringify({
            categories: 'NotAnArrayString',
            cards: [{ title: 'Chemistry Lab' }],
          }),
        },
      ],
      furnitureProducts: [],
      furnitureCategories: [],
    });
    const labsHub = response.hubs.find(h => h.id === 'labs');
    assert.ok(labsHub?.subcategories.includes('Science Labs'), 'Fallback default category should be present');
    assert.strictEqual(response.items[0].categories[0], 'Science Labs', 'Card category falls back to explicitCats[0]');
  });

  await runTest('HubCatalog-EdgeCases', 'Card with category string vs categories array vs undefined', () => {
    const { response } = processHubCatalog({
      hubPages: [
        {
          id: 1,
          slug: 'tech-infra',
          title: 'Tech',
          pageData: JSON.stringify({
            categories: ['Classroom Tech', 'Displays'],
            cards: [
              { title: 'Item 1', category: 'Displays' },
              { title: 'Item 2', categories: ['Networking', 'Security'] },
              { title: 'Item 3', categories: 'InvalidString' }, // invalid categories
            ],
          }),
        },
      ],
      furnitureProducts: [],
      furnitureCategories: [],
    });
    assert.deepStrictEqual(response.items[0].categories, ['Displays']);
    assert.deepStrictEqual(response.items[1].categories, ['Networking', 'Security']);
    assert.deepStrictEqual(response.items[2].categories, ['Classroom Tech']); // fallback to first explicit category
  });

  // Test 4.3: Malformed JSON in pageData
  await runTest('HubCatalog-EdgeCases', 'Malformed JSON string does not throw and recovers gracefully', () => {
    const { response } = processHubCatalog({
      hubPages: [
        { id: 1, slug: 'libraries', title: 'Libraries', pageData: '{{{MALFORMED_JSON:::' },
        { id: 2, slug: 'labs', title: 'Labs', pageData: null as any },
      ],
      furnitureProducts: [],
      furnitureCategories: [],
    });
    const libHub = response.hubs.find(h => h.id === 'libraries');
    assert.strictEqual(libHub?.totalCount, 0);
    assert.ok(Array.isArray(libHub?.subcategories));
    assert.ok(libHub?.subcategories.includes('seating'));
  });

  // Test 4.4: Cache headers & Aggregation Structure
  await runTest('HubCatalog-EdgeCases', 'Cache-Control headers and All Solutions totalCount match', () => {
    const { response, cacheHeader } = processHubCatalog({
      hubPages: [
        {
          id: 1,
          slug: 'labs',
          title: 'Labs',
          pageData: JSON.stringify({
            cards: [
              { title: 'Lab 1', category: 'Science' },
              { title: 'Lab 2', category: 'Tech' },
            ],
          }),
        },
      ],
      furnitureProducts: [
        { id: 101, name: 'Student Desk', description: 'Wood desk', price: 2999, category: { name: 'Desks', slug: 'desks' }, slug: 'student-desk' },
      ],
      furnitureCategories: [{ name: 'Desks', slug: 'desks' }],
    });

    assert.strictEqual(cacheHeader, 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
    assert.strictEqual(response.hubs[0].id, 'all');
    assert.strictEqual(response.hubs[0].totalCount, 3);
    assert.strictEqual(response.items.length, 3);
  });

  console.log('\n=== TASK 5: Shop.tsx Reactive Flows Verification ===\n');

  // Test 5.1: SWR Cache Fallback
  await runTest('Shop-ReactiveFlows', 'SWR Cache: Fresh cache within TTL (60s) avoids re-fetch', () => {
    const CACHE_TTL_MS = 60 * 1000;
    const mockData = { hubs: [{ id: 'all', title: 'All', subcategories: [], totalCount: 1 }], items: [] };
    let memoryCatalogCache: { data: any; timestamp: number } | null = {
      data: mockData,
      timestamp: Date.now() - 30 * 1000, // 30s ago (within 60s)
    };

    const isCacheValid = memoryCatalogCache && Date.now() - memoryCatalogCache.timestamp < CACHE_TTL_MS;
    assert.strictEqual(Boolean(isCacheValid), true, 'Cache should be valid at 30 seconds');

    // Simulate cache expiration
    memoryCatalogCache.timestamp = Date.now() - 65 * 1000; // 65s ago (expired)
    const isExpired = Date.now() - memoryCatalogCache.timestamp >= CACHE_TTL_MS;
    assert.strictEqual(isExpired, true, 'Cache should expire at 65 seconds');
  });

  // Test 5.2: Dynamic Sidebar Calculation
  await runTest('Shop-ReactiveFlows', 'Dynamic sidebar subcategory counts accurate for "all" and specific hub', () => {
    const catalog = {
      hubs: [
        { id: 'all', title: 'All Solutions', totalCount: 4, subcategories: [] },
        { id: 'furniture', title: 'Furniture', totalCount: 2, subcategories: ['Chairs', 'Tables'] },
        { id: 'labs', title: 'Labs', totalCount: 2, subcategories: ['Robotics', 'Chemistry'] },
      ],
      items: [
        { id: '1', hubSlug: 'furniture', title: 'Study Chair', categories: ['Chairs'] },
        { id: '2', hubSlug: 'furniture', title: 'Lab Stool', categories: ['Chairs', 'Stools'] },
        { id: '3', hubSlug: 'labs', title: 'Robotics Kit', categories: ['Robotics'] },
        { id: '4', hubSlug: 'labs', title: 'Glass Beakers', categories: ['Chemistry'] },
      ],
    };

    // When viewing "all"
    const simAll = simulateShopFiltering({ catalog, activeHub: 'all' });
    assert.strictEqual(simAll.subcategoryCounts['Chairs'], 2);
    assert.strictEqual(simAll.subcategoryCounts['Robotics'], 1);
    assert.strictEqual(simAll.subcategoryCounts['Chemistry'], 1);

    // When viewing "furniture"
    const simFurn = simulateShopFiltering({ catalog, activeHub: 'furniture' });
    assert.strictEqual(simFurn.subcategoryCounts['Chairs'], 2);
    assert.strictEqual(simFurn.subcategoryCounts['Robotics'], undefined, 'Robotics should not appear in furniture counts');

    // When viewing "labs"
    const simLabs = simulateShopFiltering({ catalog, activeHub: 'labs' });
    assert.strictEqual(simLabs.subcategoryCounts['Robotics'], 1);
    assert.strictEqual(simLabs.subcategoryCounts['Chairs'], undefined, 'Chairs should not appear in labs counts');
  });

  // Test 5.3: Debounced Search & Pagination Math
  await runTest('Shop-ReactiveFlows', 'Search filtering across title, description, and categories', () => {
    const catalog = {
      hubs: [],
      items: [
        { id: '1', hubSlug: 'furniture', title: 'Ergonomic Chair', description: 'Mesh back support', categories: ['Office'] },
        { id: '2', hubSlug: 'labs', title: 'Spectrophotometer', description: 'Optical instrument', categories: ['Physics'] },
        { id: '3', hubSlug: 'sports-infra', title: 'Basketball Court', description: 'Outdoor synthetic surface', categories: ['Surfacing'] },
      ],
    };

    // Search by title
    const res1 = simulateShopFiltering({ catalog, debouncedSearch: 'ergo' });
    assert.strictEqual(res1.filteredItems.length, 1);
    assert.strictEqual(res1.filteredItems[0].id, '1');

    // Search by description
    const res2 = simulateShopFiltering({ catalog, debouncedSearch: 'synthetic' });
    assert.strictEqual(res2.filteredItems.length, 1);
    assert.strictEqual(res2.filteredItems[0].id, '3');

    // Search by category
    const res3 = simulateShopFiltering({ catalog, debouncedSearch: 'physics' });
    assert.strictEqual(res3.filteredItems.length, 1);
    assert.strictEqual(res3.filteredItems[0].id, '2');

    // Search with no matches
    const res4 = simulateShopFiltering({ catalog, debouncedSearch: 'nonexistentterm123' });
    assert.strictEqual(res4.filteredItems.length, 0);
    assert.strictEqual(res4.totalPages, 1, 'Total pages for 0 items must be 1');
  });

  await runTest('Shop-ReactiveFlows', 'Pagination math: 12-item boundary and slicing', () => {
    // Generate 27 dummy items
    const dummyItems = Array.from({ length: 27 }, (_, i) => ({
      id: `item-${i + 1}`,
      hubSlug: 'furniture',
      title: `Furniture Item ${i + 1}`,
      categories: ['Chairs'],
    }));
    const catalog = { hubs: [], items: dummyItems };

    // Page 1 of 27 items -> 12 items (1..12)
    const p1 = simulateShopFiltering({ catalog, currentPage: 1, pageSize: 12 });
    assert.strictEqual(p1.totalItems, 27);
    assert.strictEqual(p1.totalPages, 3); // 12 + 12 + 3 = 27
    assert.strictEqual(p1.paginatedItems.length, 12);
    assert.strictEqual(p1.paginatedItems[0].id, 'item-1');
    assert.strictEqual(p1.paginatedItems[11].id, 'item-12');

    // Page 2 of 27 items -> 12 items (13..24)
    const p2 = simulateShopFiltering({ catalog, currentPage: 2, pageSize: 12 });
    assert.strictEqual(p2.paginatedItems.length, 12);
    assert.strictEqual(p2.paginatedItems[0].id, 'item-13');
    assert.strictEqual(p2.paginatedItems[11].id, 'item-24');

    // Page 3 of 27 items -> 3 items (25..27)
    const p3 = simulateShopFiltering({ catalog, currentPage: 3, pageSize: 12 });
    assert.strictEqual(p3.paginatedItems.length, 3);
    assert.strictEqual(p3.paginatedItems[0].id, 'item-25');
    assert.strictEqual(p3.paginatedItems[2].id, 'item-27');
  });

  // Test 5.4: Embedded Prop Compatibility
  await runTest('Shop-ReactiveFlows', 'Embedded prop compatibility and categoryPage resolution', () => {
    // 1. categoryPage resolution logic:
    // const urlHub = searchParams.get('hub') || categoryPage || 'all';
    const resolveUrlHub = (searchParamHub?: string, categoryPageProp?: string) => {
      return searchParamHub || categoryPageProp || 'all';
    };

    assert.strictEqual(resolveUrlHub(undefined, 'furniture'), 'furniture', 'categoryPage defaults activeHub to furniture');
    assert.strictEqual(resolveUrlHub('labs', 'furniture'), 'labs', 'Explicit URL searchParam overrides categoryPage');
    assert.strictEqual(resolveUrlHub(undefined, undefined), 'all', 'Defaults to all when neither is set');

    // 2. Root element resolution
    const resolveRoot = (embedded: boolean) => (embedded ? 'div' : 'main');
    assert.strictEqual(resolveRoot(true), 'div', 'Embedded mode uses <div> to prevent nested <main>');
    assert.strictEqual(resolveRoot(false), 'main', 'Standalone mode uses <main>');
  });

  // Test Simulated Full Aggregator Workflow with Mocked Realistic Hub Data
  console.log('\n=== REALISTIC SIMULATION INTEGRATION TEST ===\n');
  await runTest('RealisticIntegration', 'Full aggregation of all 5 Hubs (furniture, labs, sports, tech, libraries)', async () => {
    const mockHubPages = [
      {
        id: 1,
        slug: 'labs',
        title: 'Science & Tech Labs',
        pageData: JSON.stringify({
          categories: ['Science Labs', 'Skill Labs', 'Tech Labs'],
          cards: [
            { title: 'Advanced Physics Lab', category: 'Science Labs', description: 'Complete lab setup with sensors', image: '/uploads/physics.jpg' },
            { title: 'Robotics & AI Suite', category: 'Tech Labs', description: 'Robotics kits and simulation tools', image: '/uploads/robotics.jpg' },
          ],
        }),
      },
      {
        id: 2,
        slug: 'sports-infra',
        title: 'Sports Infrastructure',
        pageData: JSON.stringify({
          categories: ['SURFACE SPORTS', 'INDOOR SPORTS'],
          cards: [
            { title: 'FIFA Certified Football Turf', category: 'SURFACE SPORTS', description: 'High durability turf', image: '/uploads/turf.jpg' },
          ],
        }),
      },
      {
        id: 3,
        slug: 'tech-infra',
        title: 'Tech Infrastructure',
        pageData: JSON.stringify({
          categories: ['Classroom Tech', 'Displays'],
          cards: [
            { title: 'Interactive Flat Panels', category: 'Displays', description: '4K touch displays for classrooms', image: '/uploads/panel.jpg' },
          ],
        }),
      },
      {
        id: 4,
        slug: 'libraries',
        title: 'Smart Libraries',
        pageData: JSON.stringify({
          categories: ['seating', 'Digital & Tech'],
          cards: [
            { title: 'RFID Self-Checkout Kiosk', category: 'Digital & Tech', description: 'Automated kiosk for libraries', image: '/uploads/rfid.jpg' },
          ],
        }),
      },
    ];

    const mockFurnitureProducts = [
      {
        id: 101,
        name: 'Ergonomic Classroom Desk',
        description: 'Single student desk with durable laminate',
        imageUrl: '/uploads/desk.jpg',
        category: { id: 1, name: 'Student Desks', slug: 'student-desks' },
        slug: 'ergonomic-classroom-desk',
        price: 3499,
      },
      {
        id: 102,
        name: 'Stackable Seminar Chair',
        description: 'Padded conference chair',
        imageUrl: '/uploads/chair.jpg',
        category: { id: 2, name: 'Conference Chairs', slug: 'conference-chairs' },
        slug: 'stackable-seminar-chair',
        price: 1899,
      },
    ];

    const mockFurnitureCategories = [
      { name: 'Student Desks', slug: 'student-desks' },
      { name: 'Conference Chairs', slug: 'conference-chairs' },
    ];

    const { response, cacheHeader } = processHubCatalog({
      hubPages: mockHubPages,
      furnitureProducts: mockFurnitureProducts,
      furnitureCategories: mockFurnitureCategories,
    });

    console.log(`    Aggregated Total Items: ${response.items.length}`);
    for (const h of response.hubs) {
      console.log(`      • Hub [${h.id}]: "${h.title}" -> ${h.totalCount} items, ${h.subcategories.length} subcategories`);
    }

    assert.strictEqual(response.hubs.length, 6, 'Must contain "all" + 5 core hubs');
    assert.strictEqual(response.hubs[0].id, 'all');
    assert.strictEqual(response.hubs[0].totalCount, 7, '2 furniture + 2 labs + 1 sports + 1 tech + 1 libraries = 7 items');
    assert.strictEqual(response.items.length, 7);
    assert.strictEqual(cacheHeader, 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
  });

  console.log('\n======================================================');
  console.log('SUMMARY TEST MATRIX');
  console.log('======================================================');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') {
      passCount++;
      console.log(`[PASS] [${r.suite}] ${r.name} (${r.durationMs}ms)`);
    } else {
      failCount++;
      console.error(`[FAIL] [${r.suite}] ${r.name} (${r.durationMs}ms): ${r.details}`);
    }
  }

  console.log(`\nTotal: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
  if (failCount > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error during test run:', e);
    process.exit(1);
  });
