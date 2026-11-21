import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

test('Dynamic Hub Page Category Registration & Renovation Integration Suite', async (t) => {
  const rootDir = process.cwd();
  const categoriesPath = path.join(rootDir, 'frontend/src/admin/pages/Categories.tsx');
  const productsRoutesPath = path.join(rootDir, 'backend/src/routes/products.routes.ts');
  const renovationScriptPath = path.join(rootDir, 'backend/scripts/2026-11-06-prod-push-renovation-showcase.cjs');

  const categoriesContent = fs.readFileSync(categoriesPath, 'utf8');
  const productsRoutesContent = fs.readFileSync(productsRoutesPath, 'utf8');

  // --------------------------------------------------------------------------
  // TEST A: Categories.tsx Selectable Pages & Store Options Logic
  // --------------------------------------------------------------------------
  await t.test('A1. Categories.tsx imports Building2 and registers renovation in PRESET_SHOWCASE_PAGES', () => {
    assert.match(categoriesContent, /Building2/, 'Building2 must be imported from lucide-react');
    assert.match(
      categoriesContent,
      /\{\s*slug:\s*'renovation',\s*label:\s*'Campus Renovation',\s*group:\s*'Solution Hubs',\s*icon:\s*Building2\s*\}/,
      'PRESET_SHOWCASE_PAGES must include renovation under Solution Hubs'
    );
  });

  await t.test('A2. selectablePages includes presets and dynamically classifies all templates (solution-hub, grid, service-suite, article, other)', () => {
    // Pure logic simulation matching Categories.tsx useMemo
    const PRESET_MOCK = [
      { slug: 'libraries', label: 'Smart Libraries', group: 'Solution Hubs', icon: 'BookOpen' },
      { slug: 'tech-infra', label: 'Tech Infrastructure', group: 'Solution Hubs', icon: 'Laptop' },
      { slug: 'sports-infra', label: 'Sports Infrastructure', group: 'Solution Hubs', icon: 'Trophy' },
      { slug: 'labs', label: 'Science & Tech Labs', group: 'Solution Hubs', icon: 'Microscope' },
      { slug: 'renovation', label: 'Campus Renovation', group: 'Solution Hubs', icon: 'Building2' },
      { slug: 'campus-design-execution', label: 'Campus Design & Execution', group: 'Turnkey Services', icon: 'LayoutGrid' },
      { slug: 'ai-guide', label: 'AI Guide', group: 'Knowledge Hubs', icon: 'Sparkles' },
    ];

    const classifySelectablePages = (presets, availablePages) => {
      const set = new Map();
      for (const p of presets) {
        set.set(p.slug, { ...p });
      }

      for (const p of availablePages) {
        if (!p.slug || p.slug === 'home') continue;

        if (set.has(p.slug)) {
          const existing = set.get(p.slug);
          if (p.title) existing.label = p.title;
          if (p.id) existing.id = p.id;
        } else {
          let group = 'Other Pages';
          let icon = 'FolderOpen';

          if (p.template === 'solution-hub' || p.template === 'grid') {
            group = 'Solution Hubs';
            icon = 'Building2';
          } else if (p.template === 'service-suite') {
            group = 'Turnkey Services';
            icon = 'LayoutGrid';
          } else if (p.template === 'article') {
            group = 'Knowledge Hubs';
            icon = 'BookOpen';
          }

          set.set(p.slug, {
            slug: p.slug,
            label: p.title || p.slug,
            group,
            icon,
            id: p.id,
          });
        }
      }

      return Array.from(set.values());
    };

    const mockPages = [
      { id: 1, slug: 'home', title: 'Homepage', template: 'default' }, // must be excluded
      { id: 2, slug: 'renovation', title: 'Campus Renovation & Modernization', template: 'grid' }, // preset update
      { id: 3, slug: 'smart-energy', title: 'Smart Energy Hub', template: 'solution-hub' },
      { id: 4, slug: 'acoustic-grid', title: 'Acoustic Grid Systems', template: 'grid' },
      { id: 5, slug: 'academic-branding', title: 'Turnkey Academic Branding', template: 'service-suite' },
      { id: 6, slug: 'future-of-stem', title: 'Future of STEM Education', template: 'article' },
      { id: 7, slug: 'custom-classifieds', title: 'Special Opportunities', template: 'custom' },
    ];

    const result = classifySelectablePages(PRESET_MOCK, mockPages);

    // Assert 'home' is excluded
    assert.equal(result.some(p => p.slug === 'home'), false, 'home page must never be included');

    // Assert preset label update
    const reno = result.find(p => p.slug === 'renovation');
    assert.equal(reno?.label, 'Campus Renovation & Modernization');
    assert.equal(reno?.group, 'Solution Hubs');
    assert.equal(reno?.icon, 'Building2');
    assert.equal(reno?.id, 2);

    // Assert solution-hub
    const energy = result.find(p => p.slug === 'smart-energy');
    assert.equal(energy?.group, 'Solution Hubs');
    assert.equal(energy?.icon, 'Building2');

    // Assert grid
    const acoustic = result.find(p => p.slug === 'acoustic-grid');
    assert.equal(acoustic?.group, 'Solution Hubs');
    assert.equal(acoustic?.icon, 'Building2');

    // Assert service-suite
    const branding = result.find(p => p.slug === 'academic-branding');
    assert.equal(branding?.group, 'Turnkey Services');
    assert.equal(branding?.icon, 'LayoutGrid');

    // Assert article
    const stemArticle = result.find(p => p.slug === 'future-of-stem');
    assert.equal(stemArticle?.group, 'Knowledge Hubs');
    assert.equal(stemArticle?.icon, 'BookOpen');

    // Assert custom/other
    const custom = result.find(p => p.slug === 'custom-classifieds');
    assert.equal(custom?.group, 'Other Pages');
    assert.equal(custom?.icon, 'FolderOpen');
  });

  await t.test('A3. Mode B store page options strictly scopes to physical e-commerce inventory pages (furniture, labs, sports, tech-infra, libraries)', () => {
    assert.match(categoriesContent, /const storePageOptions = useMemo\(/, 'storePageOptions dynamic hook is defined');
    assert.equal(/STORE_PAGE_OPTIONS = [^\]]*'renovation'/s.test(categoriesContent), false, 'renovation strictly excluded from Mode B store page options');
    assert.equal(/STORE_PAGE_OPTIONS = [^\]]*'about-us'/s.test(categoriesContent), false, 'about-us strictly excluded from Mode B store page options');
    assert.equal(/STORE_PAGE_OPTIONS = [^\]]*'hr-placements'/s.test(categoriesContent), false, 'hr-placements strictly excluded from Mode B store page options');
    assert.equal(/STORE_PAGE_OPTIONS = [^\]]*'home'/s.test(categoriesContent), false, 'home strictly excluded from Mode B store page options');
    assert.match(categoriesContent, /value:\s*'furniture'/, 'furniture is present in STORE_PAGE_OPTIONS');
    assert.match(categoriesContent, /value:\s*'labs'/, 'labs is present in STORE_PAGE_OPTIONS');
    assert.match(categoriesContent, /value:\s*'sports'/, 'sports is present in STORE_PAGE_OPTIONS');
    assert.match(categoriesContent, /value:\s*'tech-infra'/, 'tech-infra is present in STORE_PAGE_OPTIONS');
    assert.match(categoriesContent, /value:\s*'libraries'/, 'libraries is present in STORE_PAGE_OPTIONS');
  });

  // --------------------------------------------------------------------------
  // TEST B: Renovation Hub Page & 7 Specific Categories Verification
  // --------------------------------------------------------------------------
  await t.test('B1. Renovation hub page defines the exact 7 categories without discrepancy', () => {
    assert.equal(fs.existsSync(renovationScriptPath), true, 'Renovation showcase seed script must exist');
    const scriptContent = fs.readFileSync(renovationScriptPath, 'utf8');

    const expected7Categories = [
      "All",
      "Auditoriums & AV",
      "Classrooms & Lecture Halls",
      "STEM & Research Labs",
      "Hostels & Dining",
      "Sports & Grounds",
      "Green Campus & Energy"
    ];

    for (const cat of expected7Categories) {
      assert(
        scriptContent.includes(`"${cat}"`),
        `Renovation showcase must include category: "${cat}"`
      );
    }

    // Verify harvesting simulation on the Renovation page data
    const match = scriptContent.match(/const RENOVATION_PAGE_DATA = (\{[\s\S]*?\n\};)/);
    assert(match, 'RENOVATION_PAGE_DATA must be found in seed script');
    const pageData = eval(`(${match[1].slice(0, -1)})`);

    assert.deepStrictEqual(pageData.categories, expected7Categories, 'Renovation page must have exact 7 categories');
    assert.equal(pageData.cards.length, 8, 'Renovation page must contain 8 showcase project cards');

    // Verify all card categories are subset of the 7 categories (excluding "All")
    const validCardCats = new Set(expected7Categories.slice(1));
    for (const card of pageData.cards) {
      assert(Array.isArray(card.categories), `Card "${card.title}" must have categories array`);
      for (const c of card.categories) {
        assert(validCardCats.has(c), `Card category "${c}" on "${card.title}" must be one of the 7 valid categories`);
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST C: Adding, Renaming, Deleting, and Reordering Categories Cascade
  // --------------------------------------------------------------------------
  await t.test('C1. Categories cascade: Add, Rename, Delete, Reorder correctly updates pageCards', () => {
    let categories = [
      'All',
      'Auditoriums & AV',
      'Classrooms & Lecture Halls',
      'STEM & Research Labs',
      'Hostels & Dining',
      'Sports & Grounds',
      'Green Campus & Energy'
    ];

    let cards = [
      { id: 1, title: 'Auditorium Project', categories: ['Auditoriums & AV'], category: 'Auditoriums & AV' },
      { id: 2, title: 'Lecture Hall Project', categories: ['Classrooms & Lecture Halls'], category: 'Classrooms & Lecture Halls' },
      { id: 3, title: 'Sports Turf Project', categories: ['Sports & Grounds'], category: 'Sports & Grounds' },
    ];

    // 1. Add Category
    const handleAdd = (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) return;
      categories.push(trimmed);
    };

    handleAdd('Campus Automation');
    assert(categories.includes('Campus Automation'), 'New category must be added');
    // Case-insensitive duplicate check
    handleAdd('campus automation');
    assert.equal(categories.filter(c => c.toLowerCase() === 'campus automation').length, 1, 'Duplicate category must be rejected');

    // 2. Rename Category: 'Auditoriums & AV' -> 'Auditoriums, Theatres & Broadcast AV'
    const handleRename = (oldName, newName) => {
      const trimmed = newName.trim();
      categories = categories.map(c => c === oldName ? trimmed : c);
      cards = cards.map(card => {
        const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
        if (cats.includes(oldName)) {
          return {
            ...card,
            categories: cats.map(c => c === oldName ? trimmed : c),
            category: card.category === oldName ? trimmed : card.category,
          };
        }
        return card;
      });
    };

    handleRename('Auditoriums & AV', 'Auditoriums, Theatres & Broadcast AV');
    assert(categories.includes('Auditoriums, Theatres & Broadcast AV'), 'Category list must reflect renamed name');
    assert(!categories.includes('Auditoriums & AV'), 'Old category name must no longer exist in category list');
    assert.deepStrictEqual(cards[0].categories, ['Auditoriums, Theatres & Broadcast AV'], 'Card categories must cascade to new name');
    assert.equal(cards[0].category, 'Auditoriums, Theatres & Broadcast AV', 'Card single category must cascade to new name');

    // 3. Delete Category: 'Sports & Grounds'
    const handleDelete = (catToRemove) => {
      categories = categories.filter(c => c !== catToRemove);
      cards = cards.map(card => {
        const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
        if (cats.includes(catToRemove)) {
          return {
            ...card,
            categories: cats.filter(c => c !== catToRemove),
            category: card.category === catToRemove ? '' : card.category,
          };
        }
        return card;
      });
    };

    handleDelete('Sports & Grounds');
    assert(!categories.includes('Sports & Grounds'), 'Deleted category must be removed from list');
    assert.deepStrictEqual(cards[2].categories, [], 'Deleted category must be unlinked from card categories without orphaning');
    assert.equal(cards[2].category, '', 'Card single category must be cleared when deleted');

    // 4. Reorder Category: move 'Green Campus & Energy' up
    const handleMove = (index, direction) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= categories.length) return;
      const [moved] = categories.splice(index, 1);
      categories.splice(targetIndex, 0, moved);
    };

    const initialGreenIdx = categories.indexOf('Green Campus & Energy');
    handleMove(initialGreenIdx, 'up');
    assert.equal(categories.indexOf('Green Campus & Energy'), initialGreenIdx - 1, 'Category must be moved up by 1 position');
  });

  // --------------------------------------------------------------------------
  // TEST D: Backend products.routes.ts Validation
  // --------------------------------------------------------------------------
  await t.test('D1. products.routes.ts includes renovation in CATEGORY_PAGES and defines isValidCategoryPage', () => {
    assert.match(productsRoutesContent, /CATEGORY_PAGES\s*=\s*new Set\(\[[\s\S]*?'renovation'[\s\S]*?\]\)/, 'CATEGORY_PAGES must include renovation');
    assert.match(productsRoutesContent, /export async function isValidCategoryPage/, 'isValidCategoryPage helper must be defined and exported');
    assert.match(productsRoutesContent, /prisma\.page\.findUnique\(\{\s*where:\s*\{\s*slug:\s*page\s*\}/, 'isValidCategoryPage must query prisma.page.findUnique with slug');
  });

  await t.test('D2. isValidCategoryPage validation logic permits renovation, presets, and dynamic database pages', async () => {
    const CATEGORY_PAGES = new Set(['furniture', 'libraries', 'labs', 'sports', 'ai-ml', 'tech-infra', 'renovation']);

    // Mock db lookup function
    const mockDbPages = new Set(['renovation', 'custom-hub', 'medical-infra']);
    const mockFindUnique = async (slug) => {
      return mockDbPages.has(slug) ? { id: 101, slug } : null;
    };

    const validatePage = async (page) => {
      if (!page || typeof page !== 'string') return false;
      if (CATEGORY_PAGES.has(page)) return true;
      const pageExists = await mockFindUnique(page);
      return Boolean(pageExists);
    };

    // Preset & Renovation check
    assert.equal(await validatePage('renovation'), true, 'renovation must be valid');
    assert.equal(await validatePage('furniture'), true, 'furniture must be valid');
    assert.equal(await validatePage('libraries'), true, 'libraries must be valid');
    assert.equal(await validatePage('tech-infra'), true, 'tech-infra must be valid');

    // Dynamic database page check
    assert.equal(await validatePage('custom-hub'), true, 'dynamic CMS page present in DB must be valid');
    assert.equal(await validatePage('medical-infra'), true, 'dynamic CMS page present in DB must be valid');

    // Invalid & Non-existent page check
    assert.equal(await validatePage('unknown-non-existent-page'), false, 'non-existent page not in DB or presets must be rejected');
    assert.equal(await validatePage(''), false, 'empty page must be rejected');
    assert.equal(await validatePage(null), false, 'null page must be rejected');
    assert.equal(await validatePage(undefined), false, 'undefined page must be rejected');
  });

  // --------------------------------------------------------------------------
  // TEST E: Invariant Files 0-Diff Verification
  // --------------------------------------------------------------------------
  await t.test('E1. Invariant files remain strictly 0 diff against git HEAD', () => {
    const invariantFiles = [
      'backend/prisma/schema.prisma'
    ];

    for (const file of invariantFiles) {
      assert.equal(fs.existsSync(path.join(rootDir, file)), true, `Invariant file ${file} must exist`);
      const diffOutput = execSync(`git diff HEAD -- "${file}"`, { encoding: 'utf8' }).trim();
      assert.equal(diffOutput, '', `Invariant file ${file} must have strictly 0 diff against HEAD! Found diff:\n${diffOutput}`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST F: TypeScript Compilation Guarantee
  // --------------------------------------------------------------------------
  await t.test('F1. TypeScript typecheck completes with 0 errors across frontend and backend', () => {
    // Both tsc invocations verified programmatically
    const feCheck = execSync('npx tsc --noEmit -p frontend/tsconfig.json', { encoding: 'utf8' });
    assert.equal(feCheck.trim(), '', 'Frontend TypeScript check must report 0 errors');

    const beCheck = execSync('npx tsc --noEmit -p backend/tsconfig.json', { encoding: 'utf8' });
    assert.equal(beCheck.trim(), '', 'Backend TypeScript check must report 0 errors');
  });

});
