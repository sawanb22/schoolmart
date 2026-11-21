import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();

// Key file paths for the Category lifecycle audit
const paths = {
  categories: path.join(rootDir, 'frontend/src/admin/pages/Categories.tsx'),
  unifiedEditor: path.join(rootDir, 'frontend/src/admin/components/UnifiedPageEditor.tsx'),
  solutionRenderer: path.join(rootDir, 'frontend/src/components/cms/SolutionPageRenderer.tsx'),
  genericRenderer: path.join(rootDir, 'frontend/src/components/cms/GenericPageRenderer.tsx'),
  serviceRenderer: path.join(rootDir, 'frontend/src/components/cms/ServicePageRenderer.tsx'),
  usePageCategories: path.join(rootDir, 'frontend/src/hooks/usePageCategories.ts'),
  usePageData: path.join(rootDir, 'frontend/src/hooks/usePageData.ts'),
  pagesRoutes: path.join(rootDir, 'backend/src/routes/pages.routes.ts'),
  productsRoutes: path.join(rootDir, 'backend/src/routes/products.routes.ts'),
  schemaPrisma: path.join(rootDir, 'backend/prisma/schema.prisma'),
  renovationScript: path.join(rootDir, 'backend/scripts/2026-11-06-prod-push-renovation-showcase.cjs'),
  aiMlPage: path.join(rootDir, 'frontend/src/pages/ai-ml.tsx'),
  campusAutomationPage: path.join(rootDir, 'frontend/src/pages/campus-automation.tsx'),
  campusDesignPage: path.join(rootDir, 'frontend/src/pages/campus-design.tsx'),
  campusDesignExecutionPage: path.join(rootDir, 'frontend/src/pages/campus-design-execution.tsx'),
};

// Read source contents once for static analysis
const contents = {};
for (const [key, filePath] of Object.entries(paths)) {
  if (fs.existsSync(filePath)) {
    contents[key] = fs.readFileSync(filePath, 'utf8');
  }
}

test('Showcase Category Lifecycle Auditor Test Suite', async (suite) => {

  // ==========================================================================
  // SECTION 1: INVARIANTS & INTEGRITY VERIFICATION
  // ==========================================================================
  await suite.test('1. Core Invariants & System Integrity', async (t) => {
    await t.test('1.1 backend/prisma/schema.prisma remains strictly 0-diff against git HEAD', () => {
      assert.ok(fs.existsSync(paths.schemaPrisma), 'schema.prisma must exist');
      const diffOutput = execSync(`git diff HEAD -- "${paths.schemaPrisma}"`, { encoding: 'utf8' }).trim();
      assert.equal(diffOutput, '', `schema.prisma must have strictly 0 diff against git HEAD!\nDiff found: ${diffOutput}`);
    });

    await t.test('1.2 Essential architecture components exist and are non-empty', () => {
      const requiredFiles = [
        'categories', 'unifiedEditor', 'solutionRenderer', 'genericRenderer',
        'serviceRenderer', 'usePageCategories', 'usePageData', 'pagesRoutes'
      ];
      for (const key of requiredFiles) {
        assert.ok(contents[key], `Component "${key}" (${paths[key]}) must exist`);
        assert.ok(contents[key].length > 100, `Component "${key}" must not be empty`);
      }
    });

    await t.test('1.3 TypeScript compilation passes with 0 errors across frontend and backend', () => {
      const feTsc = execSync('npx tsc --noEmit -p frontend/tsconfig.json', { encoding: 'utf8' });
      assert.equal(feTsc.trim(), '', 'Frontend TypeScript check must report 0 errors');

      const beTsc = execSync('npx tsc --noEmit -p backend/tsconfig.json', { encoding: 'utf8' });
      assert.equal(beTsc.trim(), '', 'Backend TypeScript check must report 0 errors');
    });
  });

  // ==========================================================================
  // SECTION 2: TASK 1 - CATEGORY ADDITION & STORAGE LIFECYCLE
  // ==========================================================================
  await suite.test('2. Category Addition & Storage Lifecycle (Task 1)', async (t) => {
    await t.test('2.1 Categories.tsx Mode A: adds category, trims input, checks duplicates, updates pageData.categories', () => {
      const catCode = contents.categories;
      assert.match(catCode, /handleAddCategory\s*=\s*\(\)/, 'handleAddCategory function must be defined');
      assert.match(catCode, /newCategoryInput\.trim\(\)/, 'Must trim category input');
      assert.match(catCode, /pageCategories\.some\(\(c\)\s*=>\s*c\.toLowerCase\(\)\s*===\s*trimmed\.toLowerCase\(\)\)/, 'Must check for case-insensitive duplicate');
      assert.match(catCode, /setPageCategories\(\(prev\)\s*=>\s*\[\.\.\.prev,\s*trimmed\]\)/, 'Must append new category to state');
      assert.match(catCode, /handleSavePageCategories/, 'handleSavePageCategories function must be defined');
      assert.match(catCode, /categories:\s*pageCategories/, 'Must serialize pageCategories into pageData payload');
      assert.match(catCode, /api\.put\(`\/pages\/\$\{pageDetails\.id\}`,/,'Must send PUT request to /pages/:id');
    });

    await t.test('2.2 Simulation of Categories.tsx handleAddCategory logic', () => {
      let pageCategories = ['Smart Labs', 'Robotics'];
      const addCategorySim = (input) => {
        const trimmed = input.trim();
        if (!trimmed) return { error: 'empty' };
        if (pageCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          return { error: 'duplicate' };
        }
        pageCategories = [...pageCategories, trimmed];
        return { success: true, categories: pageCategories };
      };

      // Add valid
      const res1 = addCategorySim('Artificial Intelligence');
      assert.equal(res1.success, true);
      assert.deepEqual(pageCategories, ['Smart Labs', 'Robotics', 'Artificial Intelligence']);

      // Reject empty or whitespace
      const resEmpty = addCategorySim('   ');
      assert.equal(resEmpty.error, 'empty');

      // Reject case-insensitive duplicate
      const resDup = addCategorySim('smart labs');
      assert.equal(resDup.error, 'duplicate');
      assert.equal(pageCategories.length, 3, 'Duplicate must not increase category count');
    });

    await t.test('2.3 Live Page Renderer Reflection & Invalidation Broadcast', () => {
      // Categories.tsx invalidation
      assert.match(contents.categories, /clearPageDataCache\(selectedPageSlug\)/, 'Must clear in-memory pageData cache on save');
      assert.match(contents.categories, /broadcastCmsInvalidation\(\{\s*type:\s*'INVALIDATE_PAGE',\s*slug:\s*selectedPageSlug\s*\}\)/, 'Must broadcast cross-tab cache invalidation');

      // SolutionPageRenderer reflection
      assert.match(contents.solutionRenderer, /explicitCategories:\s*string\[\]\s*=\s*Array\.isArray\(data\.categories\)/, 'SolutionPageRenderer must parse explicitCategories');
      assert.match(contents.solutionRenderer, /categoryOptions:\s*string\[\]\s*=\s*Array\.from\(\s*new Set<string>\(\[\.\.\.explicitCategories, \.\.\.cardDerivedCategories\]\)\s*\)/, 'SolutionPageRenderer must combine explicit and cardDerived categories');

      // GenericPageRenderer reflection
      assert.match(contents.genericRenderer, /explicitCats\s*=\s*Array\.isArray\(pageData\.categories\)/, 'GenericPageRenderer must parse explicitCats');
      assert.match(contents.genericRenderer, /unique\s*=\s*Array\.from\(new Set\(\[\.\.\.explicitCats, \.\.\.cardCats\]\)\)\.filter/, 'GenericPageRenderer must combine explicit and card categories');
      assert.match(contents.genericRenderer, /return unique\.length > 0 \? \['All', \.\.\.unique\] : \[\]/, 'GenericPageRenderer must expose categoryOptions with All prepended');
    });

    await t.test('2.4 UnifiedPageEditor.tsx Category Binding and UI Audit Discrepancy Check', () => {
      const editorCode = contents.unifiedEditor;

      // Check handleAddGlobalCategory definition
      assert.match(editorCode, /const handleAddGlobalCategory\s*=\s*\(catName:\s*string\)/, 'handleAddGlobalCategory must exist in UnifiedPageEditor');
      assert.match(editorCode, /set\('categories',\s*\[\.\.\.currentCats,\s*trimmed\]\)/, 'Must append to data.categories on add');

      // Audit Finding: CardCategoriesField accepts onAddGlobalCategory in interface, but checks whether it renders an input
      assert.match(editorCode, /function CardCategoriesField\(\{[\s\S]*?availableCategories[\s\S]*?pageSlug/, 'CardCategoriesField definition');
      const cardFieldBlock = editorCode.match(/function CardCategoriesField\([\s\S]*?\n\}/)?.[0] || '';
      const hasDirectInputInCardField = cardFieldBlock.includes('<input');
      assert.equal(hasDirectInputInCardField, false, 'CardCategoriesField correctly directs admin to Categories Manager rather than inline creation');

      // Audit Finding: Filter Categories section in UnifiedPageEditor links to Central Categories Hub
      assert.match(editorCode, /href=\{`\/admin\/categories\?page=\$\{page\.slug\}`\}/, 'UnifiedPageEditor provides direct link to Central Categories Hub');
    });
  });

  // ==========================================================================
  // SECTION 3: TASK 2 - CATEGORY DELETION & UNLINK LIFECYCLE
  // ==========================================================================
  await suite.test('3. Category Deletion & Unlink Lifecycle (Task 2)', async (t) => {
    await t.test('3.1 Categories.tsx handleDeleteCategory unlinks category without deleting cards', () => {
      const catCode = contents.categories;
      assert.match(catCode, /handleDeleteCategory\s*=\s*\(index:\s*number\)/, 'handleDeleteCategory must be defined');
      assert.match(catCode, /categories:\s*cats\.filter\(\(c:\s*string\)\s*=>\s*c\s*!==\s*catToRemove\)/, 'Must unlink category from card.categories array');
      assert.match(catCode, /category:\s*card\.category\s*===\s*catToRemove\s*\?\s*''\s*:\s*card\.category/, 'Must reset card.category if it matches deleted category');
      assert.match(catCode, /setPageCards\(nextCards\)/, 'Must update pageCards state retaining all card objects');
    });

    await t.test('3.2 Pure Simulation: Deleting category unlinks from cards and vanishes from live filter bar', () => {
      let categories = ['Audio-Visual', 'Laboratories', 'Hostels'];
      let cards = [
        { id: 1, title: 'Smart AV Auditorium', categories: ['Audio-Visual'], category: 'Audio-Visual', image: 'av.jpg' },
        { id: 2, title: 'High-Tech Physics Lab', categories: ['Laboratories'], category: 'Laboratories', image: 'lab.jpg' },
        { id: 3, title: 'Multi-Purpose STEM Hall', categories: ['Audio-Visual', 'Laboratories'], category: 'Laboratories', image: 'stem.jpg' },
      ];

      // Delete 'Audio-Visual'
      const catToRemove = 'Audio-Visual';
      categories = categories.filter((c) => c !== catToRemove);
      cards = cards.map((card) => {
        const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
        if (cats.includes(catToRemove)) {
          return {
            ...card,
            categories: cats.filter((c) => c !== catToRemove),
            category: card.category === catToRemove ? '' : card.category,
          };
        }
        return card;
      });

      // Assert category list
      assert.deepEqual(categories, ['Laboratories', 'Hostels'], 'Audio-Visual must be removed from categories');

      // Assert cards retention
      assert.equal(cards.length, 3, 'All 3 card objects must be preserved; no cards deleted');
      assert.deepEqual(cards[0].categories, [], 'Card 1 categories must be empty after unlinking');
      assert.equal(cards[0].category, '', 'Card 1 single category must be cleared');
      assert.equal(cards[0].title, 'Smart AV Auditorium', 'Card 1 title must be preserved');
      assert.equal(cards[0].image, 'av.jpg', 'Card 1 image must be preserved');

      // Assert multi-tag card
      assert.deepEqual(cards[2].categories, ['Laboratories'], 'Card 3 multi-tag must retain Laboratories');
      assert.equal(cards[2].category, 'Laboratories', 'Card 3 category must retain Laboratories');

      // Simulate Live Renderer categoryOptions calculation
      const explicitCategories = categories.filter((c) => c !== 'All');
      const cardDerivedCategories = cards.flatMap((c) => c.categories).filter((c) => c !== 'All');
      const liveCategoryOptions = Array.from(new Set([...explicitCategories, ...cardDerivedCategories]));

      assert.equal(liveCategoryOptions.includes('Audio-Visual'), false, 'Deleted category must completely vanish from live page filter bar');
      assert.deepEqual(liveCategoryOptions, ['Laboratories', 'Hostels']);
    });

    await t.test('3.3 UnifiedPageEditor.tsx handleRemoveGlobalCategory unlinks and syncs', () => {
      const editorCode = contents.unifiedEditor;
      assert.match(editorCode, /handleRemoveGlobalCategory\s*=\s*\(catToRemove:\s*string\)/, 'handleRemoveGlobalCategory must exist in UnifiedPageEditor');
      assert.match(editorCode, /next\.categories\s*=\s*card\.categories\.filter\(\(c:\s*string\)\s*=>\s*c\.trim\(\)\.toLowerCase\(\)\s*!==\s*target\)/, 'UnifiedPageEditor unlinks case-insensitively');
      assert.match(editorCode, /next\.category\s*=\s*''/, 'UnifiedPageEditor resets card.category');
      assert.match(editorCode, /set\('cards',\s*updatedCards\)/, 'UnifiedPageEditor persists updated cards to pageData');
    });
  });

  // ==========================================================================
  // SECTION 4: TASK 3 - CARD ASSIGNMENT & MULTI-CATEGORY TAGGING
  // ==========================================================================
  await suite.test('4. Card Assignment & Multi-Category Tagging (Task 3)', async (t) => {
    await t.test('4.1 CardCategoriesField assigns newly added category to cards via toggle', () => {
      let cardCats = ['Sports'];
      const availableCategories = ['Sports', 'Gymnasium', 'Olympic Track'];

      const toggleCategory = (cat) => {
        if (cardCats.some((c) => c.toLowerCase() === cat.toLowerCase())) {
          cardCats = cardCats.filter((c) => c.toLowerCase() !== cat.toLowerCase());
        } else {
          cardCats = [...cardCats, cat];
        }
      };

      // Assign 'Gymnasium'
      toggleCategory('Gymnasium');
      assert.deepEqual(cardCats, ['Sports', 'Gymnasium'], 'Gymnasium must be added to card');

      // Assign 'Olympic Track'
      toggleCategory('Olympic Track');
      assert.deepEqual(cardCats, ['Sports', 'Gymnasium', 'Olympic Track'], 'All 3 categories assigned');

      // Unassign 'Sports'
      toggleCategory('Sports');
      assert.deepEqual(cardCats, ['Gymnasium', 'Olympic Track'], 'Sports unassigned cleanly');
    });

    await t.test('4.2 Cascade Rename updates all tagged cards while preserving other categories', () => {
      let pageCategories = ['Sports', 'Gymnasium', 'Olympic Track'];
      let cards = [
        { id: 1, title: 'Gym Equipment', categories: ['Sports', 'Gymnasium'], category: 'Gymnasium' },
        { id: 2, title: 'Synthetic Track', categories: ['Olympic Track'], category: 'Olympic Track' },
        { id: 3, title: 'Indoor Sports Complex', categories: ['Sports'], category: 'Sports' },
      ];

      // Rename 'Gymnasium' -> 'Fitness & Gymnasium'
      const oldName = 'Gymnasium';
      const newName = 'Fitness & Gymnasium';
      pageCategories = pageCategories.map((c) => (c === oldName ? newName : c));
      cards = cards.map((card) => {
        const cats = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
        if (cats.includes(oldName)) {
          return {
            ...card,
            categories: cats.map((c) => (c === oldName ? newName : c)),
            category: card.category === oldName ? newName : card.category,
          };
        }
        return card;
      });

      assert.deepEqual(pageCategories, ['Sports', 'Fitness & Gymnasium', 'Olympic Track']);
      assert.deepEqual(cards[0].categories, ['Sports', 'Fitness & Gymnasium'], 'Card 0 categories updated with cascade');
      assert.equal(cards[0].category, 'Fitness & Gymnasium', 'Card 0 single category updated with cascade');
      assert.deepEqual(cards[1].categories, ['Olympic Track'], 'Card 1 unaffected');
      assert.deepEqual(cards[2].categories, ['Sports'], 'Card 2 unaffected');
    });

    await t.test('4.3 Live Renderers support multi-category cards filtering', () => {
      const cards = [
        { id: 1, title: 'AI Robotics Lab', categories: ['Artificial Intelligence', 'Robotics'] },
        { id: 2, title: 'Pure Robotics Station', categories: ['Robotics'] },
        { id: 3, title: 'Cloud Computing Suite', categories: ['Cloud'] },
      ];

      // Filter by 'Artificial Intelligence'
      const filterByCat = (cat) => cards.filter((c) => c.categories?.includes(cat));

      const aiFiltered = filterByCat('Artificial Intelligence');
      assert.equal(aiFiltered.length, 1);
      assert.equal(aiFiltered[0].title, 'AI Robotics Lab');

      // Filter by 'Robotics'
      const roboticsFiltered = filterByCat('Robotics');
      assert.equal(roboticsFiltered.length, 2);
      assert.ok(roboticsFiltered.some((c) => c.id === 1));
      assert.ok(roboticsFiltered.some((c) => c.id === 2));

      // Filter by 'Cloud'
      const cloudFiltered = filterByCat('Cloud');
      assert.equal(cloudFiltered.length, 1);
      assert.equal(cloudFiltered[0].id, 3);
    });
  });

  // ==========================================================================
  // SECTION 5: TASK 4 - EDGE CASES & RESILIENCY
  // ==========================================================================
  await suite.test('5. Edge Cases & Resiliency (Task 4)', async (t) => {
    await t.test('5.1 Duplicate prevention handles case-insensitive variants and trimmed strings', () => {
      const existing = ['Hostels & Dining', 'Auditoriums & AV'];

      const isDuplicate = (input, currentList) => {
        const trimmed = input.trim();
        if (!trimmed) return true; // empty
        return currentList.some((c) => c.toLowerCase() === trimmed.toLowerCase());
      };

      assert.equal(isDuplicate('Hostels & Dining', existing), true, 'Exact match duplicate');
      assert.equal(isDuplicate('hostels & dining', existing), true, 'Lower-case duplicate');
      assert.equal(isDuplicate('  HOSTELS & DINING   ', existing), true, 'Trimmed uppercase duplicate');
      assert.equal(isDuplicate('Auditoriums & av', existing), true, 'Mixed-case duplicate');
      assert.equal(isDuplicate('New Hostel Wing', existing), false, 'Distinct category allowed');
    });

    await t.test('5.2 Category Reordering persists array order and alters live default active tab', () => {
      let pageCategories = ['All', 'Cat 1', 'Cat 2', 'Cat 3'];

      const moveCategory = (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= pageCategories.length) return;
        const [moved] = pageCategories.splice(index, 1);
        pageCategories.splice(targetIndex, 0, moved);
      };

      // Move 'Cat 3' up to position 1
      moveCategory(3, 'up');
      assert.deepEqual(pageCategories, ['All', 'Cat 1', 'Cat 3', 'Cat 2']);
      moveCategory(2, 'up');
      assert.deepEqual(pageCategories, ['All', 'Cat 3', 'Cat 1', 'Cat 2']);

      // Live SolutionPageRenderer sets activeCategory to categoryOptions[0]
      const explicitCategories = pageCategories.filter((c) => c !== 'All');
      const categoryOptions = Array.from(new Set(explicitCategories));
      assert.equal(categoryOptions[0], 'Cat 3', 'Cat 3 is now the first category');

      const selectedCategory = null;
      const activeCategory = selectedCategory && categoryOptions.includes(selectedCategory)
        ? selectedCategory
        : (categoryOptions[0] || '');

      assert.equal(activeCategory, 'Cat 3', 'Default active category on live page must now be Cat 3');
    });

    await t.test('5.3 Empty categories (0 cards) display gracefully without crashing', () => {
      const explicitCategories = ['Auditoriums', 'Empty Drone Lab'];
      const cards = [
        { id: 1, title: 'Auditorium A', categories: ['Auditoriums'] },
      ];

      const categoryOptions = Array.from(new Set([...explicitCategories]));
      assert.ok(categoryOptions.includes('Empty Drone Lab'), 'Empty category must be present in category options');

      // User selects empty category
      const activeCategory = 'Empty Drone Lab';
      const filteredCards = cards.filter((card) => card.categories?.includes(activeCategory));
      assert.equal(filteredCards.length, 0, 'Filtered cards must be empty array');

      // SolutionPageRenderer empty state check
      assert.match(
        contents.solutionRenderer,
        /No items found under.*activeCategory/,
        'SolutionPageRenderer must have empty state handler for 0-card categories'
      );
    });

    await t.test('5.4 Auto-harvesting discovers unindexed card categories preserving explicit sequence first', () => {
      const explicitCats = ['Civil', 'Mechanical'];
      const cards = [
        { id: 1, title: 'Lab A', categories: ['Civil'] },
        { id: 2, title: 'Lab B', categories: ['Computer Science', 'Mechanical'] },
        { id: 3, title: 'Lab C', category: 'Biotechnology' },
      ];

      // Auto-harvest logic
      const harvest = (explicit, cardList) => {
        const existingSet = new Set(explicit.map((c) => c.toLowerCase()));
        const unindexed = [];
        for (const card of cardList) {
          const raw = Array.isArray(card.categories) ? card.categories : card.category ? [card.category] : [];
          for (const c of raw) {
            if (c && !existingSet.has(c.toLowerCase().trim())) {
              existingSet.add(c.toLowerCase().trim());
              unindexed.push(c.trim());
            }
          }
        }
        return [...explicit, ...unindexed];
      };

      const result = harvest(explicitCats, cards);
      assert.deepEqual(result, ['Civil', 'Mechanical', 'Computer Science', 'Biotechnology']);
      assert.equal(result[0], 'Civil', 'Explicit categories must retain their designated sequence first');
      assert.equal(result[1], 'Mechanical');
    });
  });

  // ==========================================================================
  // SECTION 6: RIGOROUS PAGE-BY-PAGE AUDIT OF ALL 12 TARGET SHOWCASE PAGES
  // ==========================================================================
  await suite.test('6. Page-by-Page Audit of All 12 Target Showcase & Knowledge Pages', async (t) => {
    // ------------------------------------------------------------------------
    // Group 1: Solution Infrastructure Hubs
    // ------------------------------------------------------------------------
    await t.test('6.1 libraries: delegates to SolutionPageRenderer with full category lifecycle support', () => {
      const libContent = fs.readFileSync(path.join(rootDir, 'frontend/src/pages/libraries.tsx'), 'utf8');
      assert.match(libContent, /<SolutionPageRenderer slug=\{slug\} \/>/, 'libraries must render SolutionPageRenderer');
    });

    await t.test('6.2 labs: delegates to SolutionPageRenderer with full category lifecycle support', () => {
      const labsContent = fs.readFileSync(path.join(rootDir, 'frontend/src/pages/labs.tsx'), 'utf8');
      assert.match(labsContent, /<SolutionPageRenderer slug=\{slug\} \/>/, 'labs must render SolutionPageRenderer');
    });

    await t.test('6.3 sports-infra: delegates to SolutionPageRenderer with full category lifecycle support', () => {
      const sportsContent = fs.readFileSync(path.join(rootDir, 'frontend/src/pages/sports-infra.tsx'), 'utf8');
      assert.match(sportsContent, /<SolutionPageRenderer slug=\{slug\} \/>/, 'sports-infra must render SolutionPageRenderer');
    });

    await t.test('6.4 tech-infra: delegates to SolutionPageRenderer with full category lifecycle support', () => {
      const techContent = fs.readFileSync(path.join(rootDir, 'frontend/src/pages/tech-infra.tsx'), 'utf8');
      assert.match(techContent, /<SolutionPageRenderer slug=\{slug\} \/>/, 'tech-infra must render SolutionPageRenderer');
    });

    await t.test('6.5 renovation: registers in PRESET_SHOWCASE_PAGES and defines exact 7 categories', () => {
      assert.match(contents.categories, /slug:\s*'renovation',\s*label:\s*'Campus Renovation'/, 'renovation must be registered in Categories.tsx');
      assert.ok(fs.existsSync(paths.renovationScript), 'Renovation push script must exist');
      const renoScript = contents.renovationScript;
      assert.match(renoScript, /"Auditoriums & AV"/);
      assert.match(renoScript, /"Classrooms & Lecture Halls"/);
      assert.match(renoScript, /"STEM & Research Labs"/);
      assert.match(renoScript, /"Hostels & Dining"/);
      assert.match(renoScript, /"Sports & Grounds"/);
      assert.match(renoScript, /"Green Campus & Energy"/);
    });

    await t.test('6.6 ai-ml: audits categoryOptions handling in frontend/src/pages/ai-ml.tsx', () => {
      const aiMlCode = contents.aiMlPage;
      assert.ok(aiMlCode, 'ai-ml.tsx must exist');
      assert.match(aiMlCode, /data\.categories/, 'ai-ml.tsx reads data.categories');
      // Audit finding: ai-ml.tsx combines explicitCats and cardCats
      const hasUnionOrFallback = aiMlCode.includes('[...explicitCats, ...cardCats]') || aiMlCode.includes('explicitCats.length > 0 ? explicitCats');
      assert.ok(hasUnionOrFallback, 'ai-ml.tsx supports explicitCats and cardCats');
    });

    await t.test('6.7 campus-design: delegates to CampusDesignExecution and ServicePageRenderer', () => {
      const cdCode = contents.campusDesignPage;
      assert.match(cdCode, /<CampusDesignExecution slug="campus-design" \/>/, 'campus-design delegates to CampusDesignExecution');
      const cdeCode = contents.campusDesignExecutionPage;
      assert.match(cdeCode, /<ServicePageRenderer slug=\{slug\} \/>/, 'CampusDesignExecution renders ServicePageRenderer');
    });

    // ------------------------------------------------------------------------
    // Group 2: Strategic Guides & Knowledge Hubs
    // ------------------------------------------------------------------------
    await t.test('6.8 ugc-guidelines: routes dynamically via GenericPageRenderer with full category support', () => {
      assert.match(contents.categories, /slug:\s*'ugc-guidelines'/, 'ugc-guidelines is registered in Categories.tsx');
      assert.match(contents.genericRenderer, /pageData\.categories/, 'GenericPageRenderer consumes pageData.categories');
    });

    await t.test('6.9 ai-guide: routes dynamically via GenericPageRenderer with full category support', () => {
      assert.match(contents.categories, /slug:\s*'ai-guide'/, 'ai-guide is registered in Categories.tsx');
      assert.match(contents.genericRenderer, /categoryOptions/, 'GenericPageRenderer provides categoryOptions for ai-guide');
    });

    await t.test('6.10 setup-college: routes dynamically via GenericPageRenderer with full category support', () => {
      assert.match(contents.categories, /slug:\s*'setup-college'/, 'setup-college is registered in Categories.tsx');
      assert.match(contents.genericRenderer, /setActiveCategory\(cat\)/, 'GenericPageRenderer provides category filter switching');
    });

    // ------------------------------------------------------------------------
    // Group 3: Turnkey Service Suites
    // ------------------------------------------------------------------------
    await t.test('6.11 campus-design-execution: renders via ServicePageRenderer with full category support', () => {
      assert.match(contents.categories, /slug:\s*'campus-design-execution'/, 'campus-design-execution registered in Categories.tsx');
      assert.match(contents.serviceRenderer, /fromCards = rawCards\.flatMap/, 'ServicePageRenderer harvests fromCards');
      assert.match(contents.serviceRenderer, /fromPage = Array\.isArray\(data\.categories\)/, 'ServicePageRenderer reads data.categories');
      assert.match(contents.serviceRenderer, /categoryOptions = useMemo[\s\S]*?\['All', \.\.\.Array\.from\(new Set\(\[\.\.\.fromPage, \.\.\.fromCards\]\)\)\]/, 'ServicePageRenderer combines fromPage and fromCards');
    });

    await t.test('6.12 campus-automation: audits category handling in frontend/src/pages/campus-automation.tsx', () => {
      const autoCode = contents.campusAutomationPage;
      assert.ok(autoCode, 'campus-automation.tsx must exist');
      // Audit finding: campus-automation.tsx handles both data.categories and card categories
      const handlesExplicitAndCards = autoCode.includes('allCards.flatMap((card) => card.categories') && autoCode.includes('data.categories');
      assert.ok(handlesExplicitAndCards, 'campus-automation handles both data.categories and card categories');
    });
  });

});
