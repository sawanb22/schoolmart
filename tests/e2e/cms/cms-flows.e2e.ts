/**
 * CMS category + card flows, driven through the real admin UI and verified on the public site,
 * through the HTTP APIs and in the database.
 *
 * Expected behaviour is written from a site owner's point of view. Assertions are never relaxed
 * to match what the application currently does; when the app is wrong the test fails and the
 * failure message says what was observed.
 *
 * Secondary checks use expect.soft so one failing test lists every broken outcome, not only the first.
 * Run: npx playwright test -c tests/e2e/cms.playwright.config.ts
 */
import {
  API,
  SITE,
  slugify,
} from './lib/env';
import { cardsOf, findCard, mustReadPage, writeBlob, type Prisma } from './lib/db';
import {
  apiJson,
  cardCategoryPill,
  cardRow,
  catalogHub,
  categoriesAddInput,
  categoriesDelete,
  categoriesListed,
  categoriesRename,
  categoriesSave,
  clickChip,
  editorAddCard,
  editorSave,
  expandCard,
  expect,
  fetchCatalog,
  gotoCategories,
  gotoEditor,
  note,
  openDetail,
  openHub,
  pollSearch,
  publicChips,
  qaCard,
  qaCat,
  reachableOnHub,
  searchFinder,
  searchHitsFor,
  setCardDescription,
  setCardTitle,
  test,
  visibleCardTitles,
} from './lib/harness';

const BASE_CATS = ['COMPUTER LAB', 'COMPOSITE SKILLS LAB', 'STEM LAB'];
const BASE_CARD = 'Baseline Computer Lab';
const BASE_CARD_SLUG = 'baseline-computer-lab';

/** Mutates labs pageData directly in the DB (test setup only, never the behaviour under test). */
async function setupLabs(db: Prisma, mutate: (blob: Record<string, any>) => void): Promise<Record<string, any>> {
  const page = await mustReadPage(db, 'labs');
  const blob = JSON.parse(JSON.stringify(page.pageData));
  mutate(blob);
  await writeBlob(db, 'labs', blob);
  return blob;
}

function newDbCard(title: string, categories: string[]): Record<string, any> {
  return {
    title,
    slug: slugify(title),
    description: `${title} short description`,
    image: '',
    href: '',
    categories,
  };
}

/** Public-site assertions that every "category removed but card must survive" test shares. */
async function expectCardSurvivesCategoryRemoval(opts: {
  session: any;
  db: Prisma;
  removedCategory: string;
  card: { title: string; slug: string };
  cardCountBefore: number;
}): Promise<void> {
  const { session, db, removedCategory, card, cardCountBefore } = opts;
  const after = await mustReadPage(db, 'labs');

  expect.soft(after.pageData.categories ?? [], 'DB pageData.categories no longer lists the removed category').not.toContain(removedCategory);
  expect.soft(cardsOf(after.pageData).length, 'no card was deleted').toBe(cardCountBefore);
  const dbCard = findCard(after.pageData, card.title);
  expect.soft(dbCard, 'card still exists in DB').toBeTruthy();
  expect.soft(dbCard?.categories ?? [], 'removed category is unlinked from the card').not.toContain(removedCategory);

  const pub = await session.publicPage();
  const chips = (await (async () => {
    await openHub(pub.page, 'labs');
    return publicChips(pub.page);
  })()) as string[];
  expect.soft(chips, 'public chip is gone').not.toContain(removedCategory);

  const reach = await reachableOnHub(pub.page, 'labs', card.title);
  note(
    'reachability',
    `card "${card.title}" reachable=${reach.reachable} where=${reach.where}; default view=[${reach.defaultView.join(' | ')}]; chips=[${reach.chips.join(' | ')}]`
  );
  expect.soft(
    reach.reachable,
    `card "${card.title}" (categories now ${JSON.stringify(dbCard?.categories)}) must still be visible somewhere on the public /labs grid, ` +
      `but it appears under no chip and not in the default view (default view shows [${reach.defaultView.join(' | ')}])`
  ).toBe(true);

  const detail = await openDetail(pub.page, 'labs', card.slug);
  expect.soft(detail.found, 'card detail page still works').toBe(true);
  expect.soft(detail.heading).toBe(card.title);

  const cat = await fetchCatalog('labs');
  expect.soft(catalogHub(cat, 'labs')?.subcategories ?? [], 'catalog subcategories no longer list the category').not.toContain(removedCategory);
  expect.soft(
    cat.items.filter((i: any) => i.title === card.title).length,
    'card still listed in hub catalog'
  ).toBe(1);
}

test.describe('stack isolation', () => {
  test('S0 browser API traffic goes only to the isolated backend on :3101', async ({ session }) => {
    const pub = await session.publicPage();
    await openHub(pub.page, 'labs');
    const admin = await session.adminPage();
    await gotoCategories(admin.page, 'labs');
    expect([...session.apiHosts]).toEqual(['localhost:3101']);
    expect(session.violations).toEqual([]);
    expect(SITE).toBe('http://localhost:5174');
  });
});

test.describe('category flows (labs)', () => {
  test('C1 add a category on the admin Categories page', async ({ session, db }) => {
    const name = qaCat('c1');
    const before = await mustReadPage(db, 'labs');

    // A visitor / shop UI that already fetched the catalog (primes the browser HTTP cache; guard-free context keeps the cache on).
    const pub = await session.publicPage({ cacheable: true });
    await openHub(pub.page, 'labs');
    const catalogUrl = `${API}/pages/hub/catalog?hub=labs`;
    const readCatalogInBrowser = () =>
      pub.page.evaluate(async (u) => {
        const r = await fetch(u);
        const j = await r.json();
        return (j.hubs.find((h: any) => h.id === 'labs') || {}).subcategories as string[];
      }, catalogUrl);
    const primed = await readCatalogInBrowser();
    expect(primed).toEqual(BASE_CATS);

    const admin = await session.adminPage();
    await gotoCategories(admin.page, 'labs');
    expect(await categoriesListed(admin.page)).toEqual(BASE_CATS);
    await categoriesAddInput(admin.page, name);
    expect(await categoriesListed(admin.page)).toContain(name);
    await categoriesSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    expect.soft(after.pageData.categories, 'DB pageData.categories').toEqual([...BASE_CATS, name]);
    expect.soft(cardsOf(after.pageData), 'cards untouched by adding a category').toEqual(cardsOf(before.pageData));

    const fresh = await session.publicPage();
    await openHub(fresh.page, 'labs');
    const chips = await publicChips(fresh.page);
    expect.soft(chips, 'public /labs shows the new chip').toContain(name);
    expect.soft(chips, 'existing chips preserved and in order').toEqual([...BASE_CATS, name]);

    const cat = await fetchCatalog('labs');
    expect.soft(catalogHub(cat, 'labs')?.subcategories, 'hub catalog subcategories (cache-busted request)').toContain(name);
    note('catalog-cache-control', `Cache-Control: ${cat.cacheControl} | Pragma: ${cat.pragma} | Expires: ${cat.expires}`);

    const viaBrowserCache = await readCatalogInBrowser();
    const stale = !viaBrowserCache.includes(name);
    note(
      'catalog-http-cache',
      stale
        ? `STALE: same catalog URL fetched again in a browser that fetched it earlier still lacks the new category (Cache-Control: ${cat.cacheControl}; Pragma: ${cat.pragma}; Expires: ${cat.expires})`
        : 'fresh: browser re-fetch already contains the new category'
    );
  });

  test('C2 add a new category from inside the page editor', async ({ session, db }) => {
    const labs = await mustReadPage(db, 'labs');
    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    await expect(admin.page.getByText(/Filter Categories/)).toBeVisible();

    const addButtons = admin.page.getByRole('button', { name: /add (new )?categor/i });
    const nameInputs = admin.page.getByPlaceholder(/categor/i);
    const central = admin.page.getByRole('link', { name: /Manage Categories in Central Hub/ });
    const counts = { addButtons: await addButtons.count(), nameInputs: await nameInputs.count(), centralLinks: await central.count() };
    const centralHref = counts.centralLinks ? await central.first().getAttribute('href') : null;
    note(
      'C2-ui-paths',
      `in-editor add-category buttons=${counts.addButtons}, category name inputs=${counts.nameInputs}, link to central manager=${counts.centralLinks} (href=${centralHref}, opens in new tab)`
    );

    expect(
      counts.addButtons + counts.nameInputs,
      'the page editor should let an admin add a category (Add control + name input); only a link to the separate Categories page exists'
    ).toBeGreaterThan(0);

    const name = qaCat('c2');
    await nameInputs.first().fill(name);
    await addButtons.first().click();
    await editorSave(admin.page);
    const after = await mustReadPage(db, 'labs');
    expect(after.pageData.categories).toContain(name);
  });

  test('C3 assign the new category to an existing card in the page editor', async ({ session, db }) => {
    const name = qaCat('c3');
    await setupLabs(db, (b) => b.categories.push(name));
    const labs = await mustReadPage(db, 'labs');

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = cardRow(admin.page, BASE_CARD);
    await expandCard(row);
    await cardCategoryPill(row, name).click();
    await editorSave(admin.page);
    expect(admin.dialogs.filter((d) => /Save failed/.test(d))).toEqual([]);

    const after = await mustReadPage(db, 'labs');
    const card = findCard(after.pageData, BASE_CARD);
    expect.soft(card?.categories, 'DB card.categories keeps the old category and gains the new one').toEqual(['COMPUTER LAB', name]);

    const pub = await session.publicPage();
    await openHub(pub.page, 'labs');
    expect.soft(await publicChips(pub.page)).toContain(name);
    await clickChip(pub.page, name);
    expect.soft(await visibleCardTitles(pub.page), 'clicking the new chip shows the card').toEqual([BASE_CARD]);
    await clickChip(pub.page, 'COMPUTER LAB');
    expect.soft(await visibleCardTitles(pub.page), 'old chip still shows the card').toContain(BASE_CARD);

    const detail = await openDetail(pub.page, 'labs', card?.slug || BASE_CARD_SLUG);
    expect.soft(detail.found, 'detail page renders').toBe(true);
    expect.soft(detail.heading).toBe(BASE_CARD);

    const cat = await fetchCatalog('labs');
    const item = cat.items.find((i: any) => i.title === BASE_CARD);
    expect.soft(item?.categories, 'catalog item reflects both categories').toEqual(['COMPUTER LAB', name]);
    expect.soft(catalogHub(cat, 'labs')?.subcategories).toContain(name);
  });

  test('C4 rename a category on the Categories page', async ({ session, db }) => {
    const oldName = qaCat('c4');
    const newName = `${oldName} RENAMED`;
    await setupLabs(db, (b) => {
      b.categories.push(oldName);
      findCard(b, BASE_CARD)!.categories.push(oldName);
    });

    const admin = await session.adminPage();
    await gotoCategories(admin.page, 'labs');
    await categoriesRename(admin.page, oldName, newName);
    expect(await categoriesListed(admin.page)).toContain(newName);
    await categoriesSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    expect.soft(after.pageData.categories).toContain(newName);
    expect.soft(after.pageData.categories).not.toContain(oldName);
    const card = findCard(after.pageData, BASE_CARD);
    expect.soft(card?.categories, 'cards that used the category are updated, other tags kept').toEqual(['COMPUTER LAB', newName]);

    const pub = await session.publicPage();
    await openHub(pub.page, 'labs');
    const chips = await publicChips(pub.page);
    expect.soft(chips).toContain(newName);
    expect.soft(chips).not.toContain(oldName);
    await clickChip(pub.page, newName);
    expect.soft(await visibleCardTitles(pub.page)).toEqual([BASE_CARD]);

    const cat = await fetchCatalog('labs');
    expect.soft(catalogHub(cat, 'labs')?.subcategories).toContain(newName);
    expect.soft(catalogHub(cat, 'labs')?.subcategories).not.toContain(oldName);
    expect.soft(cat.items.find((i: any) => i.title === BASE_CARD)?.categories).toEqual(['COMPUTER LAB', newName]);
  });

  test('C5 delete a category on the Categories page; its card must survive', async ({ session, db }) => {
    const name = qaCat('c5');
    const title = qaCard('c5');
    const blob = await setupLabs(db, (b) => {
      b.categories.push(name);
      b.cards.push(newDbCard(title, [name]));
    });

    const admin = await session.adminPage();
    await gotoCategories(admin.page, 'labs');
    await categoriesDelete(admin.page, name);
    expect(await categoriesListed(admin.page)).not.toContain(name);
    await categoriesSave(admin.page);

    await expectCardSurvivesCategoryRemoval({
      session,
      db,
      removedCategory: name,
      card: { title, slug: slugify(title) },
      cardCountBefore: cardsOf(blob).length,
    });
  });

  test('C6 a category differing only in case is rejected or merged, never duplicated', async ({ session, db }) => {
    const admin = await session.adminPage();
    await gotoCategories(admin.page, 'labs');
    await categoriesAddInput(admin.page, 'stem lab');
    note('C6-dialogs', admin.dialogs.join(' || ') || '(no dialog shown)');

    const listed = await categoriesListed(admin.page);
    expect.soft(listed.filter((c) => c.toLowerCase() === 'stem lab'), 'admin list holds one STEM LAB variant').toHaveLength(1);

    // Worst case: the admin saves whatever is on screen.
    const save = admin.page.getByRole('button', { name: /^\s*Save .*Categories\s*$/ });
    if (await save.isEnabled()) await categoriesSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    const lowered = (after.pageData.categories as string[]).map((c) => c.toLowerCase());
    expect.soft(new Set(lowered).size, `DB categories ${JSON.stringify(after.pageData.categories)} has no case-duplicates`).toBe(lowered.length);

    const pub = await session.publicPage();
    await openHub(pub.page, 'labs');
    const chips = (await publicChips(pub.page)).map((c) => c.toLowerCase());
    expect.soft(new Set(chips).size, 'public chips have no case-duplicates').toBe(chips.length);
  });

  test('C7 delete a category from the page editor chip list; its card must survive', async ({ session, db }) => {
    const name = qaCat('c7');
    const title = qaCard('c7');
    const blob = await setupLabs(db, (b) => {
      b.categories.push(name);
      b.cards.push(newDbCard(title, [name]));
    });
    const labs = await mustReadPage(db, 'labs');

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    await admin.page.locator(`button[title='Delete "${name}" category']`).click();
    await expect(admin.page.locator(`button[title='Delete "${name}" category']`)).toHaveCount(0);
    await editorSave(admin.page);
    expect(admin.dialogs.filter((d) => /Save failed/.test(d))).toEqual([]);

    await expectCardSurvivesCategoryRemoval({
      session,
      db,
      removedCategory: name,
      card: { title, slug: slugify(title) },
      cardCountBefore: cardsOf(blob).length,
    });
  });
});

test.describe('card flows (labs)', () => {
  test('K1 add a card with title, description and an existing category', async ({ session, db }) => {
    const title = qaCard('k1');
    const desc = `QA short description ${title}`;
    const category = 'COMPUTER LAB';
    const labs = await mustReadPage(db, 'labs');

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = await editorAddCard(admin.page);
    await setCardTitle(row, title);
    await setCardDescription(row, desc);
    await cardCategoryPill(row, category).click();
    await editorSave(admin.page);
    expect(admin.dialogs.filter((d) => /Save failed/.test(d))).toEqual([]);

    const after = await mustReadPage(db, 'labs');
    const card = findCard(after.pageData, title);
    expect.soft(card, 'card saved in DB').toBeTruthy();
    expect.soft(card?.slug, 'slug derived from title').toBe(slugify(title));
    expect.soft(card?.categories).toEqual([category]);
    expect.soft(card?.description).toBe(desc);
    expect.soft(card?.active, 'new card is live').not.toBe(false);
    expect.soft(cardsOf(after.pageData)).toHaveLength(4);

    const pub = await session.publicPage();
    await openHub(pub.page, 'labs');
    await clickChip(pub.page, category);
    expect.soft(await visibleCardTitles(pub.page), `public /labs under "${category}"`).toContain(title);
    await expect.soft(pub.page.getByText(desc)).toBeVisible();

    const detail = await openDetail(pub.page, 'labs', slugify(title));
    expect.soft(detail.found, `/labs/${slugify(title)} renders`).toBe(true);
    expect.soft(detail.heading).toBe(title);

    const cat = await fetchCatalog('labs');
    const item = cat.items.find((i: any) => i.title === title);
    expect.soft(item, 'hub catalog lists the card').toBeTruthy();
    expect.soft(item?.categories).toEqual([category]);
    expect.soft(item?.href).toBe(`/labs/${slugify(title)}`);
    expect.soft(catalogHub(cat, 'labs')?.totalCount).toBe(4);

    const found = await pollSearch(title, { title }, 'present');
    note('K1-search', `found=${found.ok} attempts=${found.attempts}`);
    if (!found.ok) {
      const control = await searchFinder(BASE_CARD);
      const controlHits = searchHitsFor(control.body, { title: BASE_CARD }).length;
      note('K1-search-control', `baseline card "${BASE_CARD}" found by finder=${controlHits > 0}; summary=${control.body?.requirementSummary?.intentSummary}`);
    }
    expect.soft(found.ok, 'solutions finder search returns the new card within 25s').toBe(true);
  });

  test('K2 a card without any category is visible on the public hub grid', async ({ session, db }) => {
    const title = qaCard('k2');
    const labs = await mustReadPage(db, 'labs');

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = await editorAddCard(admin.page);
    await setCardTitle(row, title);
    await setCardDescription(row, 'QA uncategorised card');
    await editorSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    const card = findCard(after.pageData, title);
    expect.soft(card, 'saved in DB').toBeTruthy();
    note('K2-db-categories', JSON.stringify(card?.categories));

    const pub = await session.publicPage();
    const reach = await reachableOnHub(pub.page, 'labs', title);
    note('reachability', `reachable=${reach.reachable} where=${reach.where}; default view=[${reach.defaultView.join(' | ')}]`);
    expect.soft(
      reach.reachable,
      `uncategorised card "${title}" must appear on the public /labs grid; default view shows [${reach.defaultView.join(' | ')}] and none of the chips [${reach.chips.join(' | ')}] shows it`
    ).toBe(true);

    const detail = await openDetail(pub.page, 'labs', slugify(title));
    expect.soft(detail.found, 'detail page renders').toBe(true);

    const cat = await fetchCatalog('labs');
    const item = cat.items.find((i: any) => i.title === title);
    expect.soft(item, 'hub catalog lists the card').toBeTruthy();
    note('K2-catalog-categories', JSON.stringify(item?.categories));
  });

  test('K3 editing a card title keeps its slug and URL', async ({ session, db }) => {
    const title = qaCard('k3');
    const edited = `${title} EDITED`;
    await setupLabs(db, (b) => b.cards.push(newDbCard(title, ['COMPUTER LAB'])));
    const labs = await mustReadPage(db, 'labs');
    const oldSlug = slugify(title);

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = cardRow(admin.page, title);
    await expandCard(row);
    await setCardTitle(row, edited);
    await editorSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    const card = findCard(after.pageData, edited);
    expect.soft(card, 'edited card in DB').toBeTruthy();
    expect.soft(card?.slug, 'slug unchanged after title edit').toBe(oldSlug);

    const pub = await session.publicPage();
    await openHub(pub.page, 'labs');
    const titles = await (async () => {
      await clickChip(pub.page, 'COMPUTER LAB');
      return visibleCardTitles(pub.page);
    })();
    expect.soft(titles, 'new title shown on grid').toContain(edited);
    expect.soft(titles, 'old title gone from grid').not.toContain(title);

    const detail = await openDetail(pub.page, 'labs', oldSlug);
    expect.soft(detail.found, `old URL /labs/${oldSlug} still works`).toBe(true);
    expect.soft(detail.heading, 'old URL shows the new title').toBe(edited);

    const cat = await fetchCatalog('labs');
    expect.soft(cat.items.find((i: any) => i.title === edited)?.slug).toBe(oldSlug);
  });

  test('K3b editing the title of a just-saved card in the same editor session keeps its slug', async ({ session, db }) => {
    const title = qaCard('k3b');
    const edited = `${title} EDITED`;
    const labs = await mustReadPage(db, 'labs');

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = await editorAddCard(admin.page);
    await setCardTitle(row, title);
    await cardCategoryPill(row, 'COMPUTER LAB').click();
    await editorSave(admin.page);
    const first = findCard((await mustReadPage(db, 'labs')).pageData, title);
    expect(first?.slug).toBe(slugify(title));

    // Same page, no reload: rename and save again.
    await setCardTitle(admin.page.locator('#card-item-3'), edited);
    await editorSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    const card = findCard(after.pageData, edited);
    expect.soft(card?.slug, `slug stays "${slugify(title)}" so existing links keep working`).toBe(slugify(title));

    const pub = await session.publicPage();
    const detail = await openDetail(pub.page, 'labs', slugify(title));
    expect.soft(detail.found, `original URL /labs/${slugify(title)} still works`).toBe(true);
  });

  test('K4 hiding a card removes it from the public grid and catalog', async ({ session, db }) => {
    const title = qaCard('k4');
    const slug = slugify(title);
    await setupLabs(db, (b) => b.cards.push(newDbCard(title, ['COMPUTER LAB'])));
    const labs = await mustReadPage(db, 'labs');

    // Precondition: visible to the public before hiding.
    const pub = await session.publicPage();
    const before = await reachableOnHub(pub.page, 'labs', title);
    expect(before.reachable, 'card visible before hiding').toBe(true);

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = cardRow(admin.page, title);
    await row.getByRole('button', { name: 'Live', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Hidden', exact: true })).toBeVisible();
    await editorSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    expect.soft(findCard(after.pageData, title)?.active, 'DB marks the card inactive').toBe(false);

    const fresh = await session.publicPage();
    const reach = await reachableOnHub(fresh.page, 'labs', title);
    expect.soft(reach.reachable, `hidden card must not appear on the public grid (seen via ${reach.where})`).toBe(false);

    const cat = await fetchCatalog('labs');
    expect.soft(cat.items.some((i: any) => i.title === title), 'hidden card not in hub catalog').toBe(false);

    const detail = await openDetail(fresh.page, 'labs', slug);
    note('K4-detail-page', detail.found ? `detail page still renders publicly (h1="${detail.heading}")` : 'detail page shows "couldn\'t be found"');

    const hits = await pollSearch(title, { title }, 'present', 6_000);
    note('K4-search', `hidden card ${hits.ok ? 'IS' : 'is not'} returned by the solutions finder`);
  });

  test('K5 deleting a card removes it everywhere', async ({ session, db }) => {
    const title = qaCard('k5');
    const slug = slugify(title);
    const labs = await mustReadPage(db, 'labs');

    // Create through the admin API so the search index rebuild hook fires, like a real save.
    const blob = JSON.parse(JSON.stringify(labs.pageData));
    blob.cards.push(newDbCard(title, ['COMPUTER LAB']));
    const put = await apiJson(`/pages/${labs.id}`, { auth: true, method: 'PUT', body: { pageData: blob } });
    expect(put.status).toBe(200);
    const seeded = await pollSearch(title, { title }, 'present');
    note('K5-search-precondition', `card findable before delete=${seeded.ok}`);

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = cardRow(admin.page, title);
    await row.locator('button[title="Delete this card"]').click();
    await expect(cardRow(admin.page, title)).toHaveCount(0);
    await editorSave(admin.page);

    const after = await mustReadPage(db, 'labs');
    expect.soft(findCard(after.pageData, title), 'removed from DB').toBeUndefined();
    expect.soft(cardsOf(after.pageData)).toHaveLength(3);

    const pub = await session.publicPage();
    const reach = await reachableOnHub(pub.page, 'labs', title);
    expect.soft(reach.reachable, 'gone from the public grid').toBe(false);
    const detail = await openDetail(pub.page, 'labs', slug);
    expect.soft(detail.found, 'detail page shows not found').toBe(false);

    const cat = await fetchCatalog('labs');
    expect.soft(cat.items.some((i: any) => i.title === title), 'gone from catalog').toBe(false);
    expect.soft(catalogHub(cat, 'labs')?.totalCount).toBe(3);

    const gone = await pollSearch(title, { title }, 'absent');
    expect.soft(gone.ok, 'gone from solutions finder after rebuild (25s)').toBe(true);
  });

  test('K6 tech-infra (no categories): add a card, see it publicly, delete it', async ({ session, db }) => {
    const title = qaCard('k6');
    const slug = slugify(title);
    const tech = await mustReadPage(db, 'tech-infra');
    const templateBefore = tech.template;

    const admin = await session.adminPage();
    await gotoEditor(admin.page, tech.id);
    const row = await editorAddCard(admin.page);
    await setCardTitle(row, title);
    await setCardDescription(row, 'QA tech card');
    await editorSave(admin.page);
    expect(admin.dialogs.filter((d) => /Save failed/.test(d))).toEqual([]);

    const afterAdd = await mustReadPage(db, 'tech-infra');
    expect.soft(findCard(afterAdd.pageData, title), 'saved in DB').toBeTruthy();
    note('K6-template', `before="${templateBefore}" after-save="${afterAdd.template}"; pageData.template="${afterAdd.pageData.template}"`);
    expect.soft(afterAdd.template, 'editing a card must not change the page template').toBe(templateBefore);

    const pub = await session.publicPage();
    await openHub(pub.page, 'tech-infra');
    expect.soft(await visibleCardTitles(pub.page), 'visible on public /tech-infra').toContain(title);
    const detail = await openDetail(pub.page, 'tech-infra', slug);
    expect.soft(detail.found, '/tech-infra/<slug> renders').toBe(true);
    expect.soft(detail.heading).toBe(title);
    const cat = await fetchCatalog('tech-infra');
    expect.soft(cat.items.some((i: any) => i.title === title), 'listed in hub catalog').toBe(true);

    // Delete it again through the UI.
    await gotoEditor(admin.page, tech.id);
    const row2 = cardRow(admin.page, title);
    await row2.locator('button[title="Delete this card"]').click();
    await editorSave(admin.page);

    const afterDelete = await mustReadPage(db, 'tech-infra');
    expect.soft(findCard(afterDelete.pageData, title), 'removed from DB').toBeUndefined();
    expect.soft(cardsOf(afterDelete.pageData)).toHaveLength(cardsOf(tech.pageData).length);
    const pub2 = await session.publicPage();
    await openHub(pub2.page, 'tech-infra');
    expect.soft(await visibleCardTitles(pub2.page)).not.toContain(title);
    const detail2 = await openDetail(pub2.page, 'tech-infra', slug);
    expect.soft(detail2.found, 'detail gone after delete').toBe(false);
  });

  test('K7 freshness: public visitors see an admin save immediately', async ({ session, db }) => {
    const edited = `${BASE_CARD} FRESH ${Date.now().toString(36)}`;
    const labs = await mustReadPage(db, 'labs');

    // Visitor B1 already has /labs open (cache-enabled context, so any Cache-Control staleness would show).
    const b1 = await session.publicPage({ cacheable: true });
    await openHub(b1.page, 'labs');
    expect(await visibleCardTitles(b1.page)).toContain(BASE_CARD);

    const admin = await session.adminPage();
    await gotoEditor(admin.page, labs.id);
    const row = cardRow(admin.page, BASE_CARD);
    await expandCard(row);
    await setCardTitle(row, edited);
    await editorSave(admin.page);

    // Visitor B2: brand new browser context.
    const b2 = await session.publicPage({ cacheable: true });
    await openHub(b2.page, 'labs');
    expect.soft(await visibleCardTitles(b2.page), 'fresh context sees the change immediately').toContain(edited);

    // Visitor B1 reloads.
    await b1.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(b1.page.locator('main h1').first()).toBeVisible();
    await b1.page.waitForLoadState('networkidle').catch(() => undefined);
    expect.soft(await visibleCardTitles(b1.page), 'already-open visitor sees it after a reload').toContain(edited);

    // Fresh context, hub catalog consumed exactly as the shop would (no cache buster).
    const cat = await b2.page.evaluate(async (u) => (await fetch(u)).json(), `${API}/pages/hub/catalog?hub=labs`);
    expect.soft(cat.items.some((i: any) => i.title === edited), 'catalog (no cache buster) fresh in a new context').toBe(true);
  });

  test('K8 concurrency: category added on the Categories page survives a later card edit in a stale editor tab', async ({ session, db }) => {
    const name = qaCat('k8');
    const edited = `${BASE_CARD} K8 ${Date.now().toString(36)}`;
    const labs = await mustReadPage(db, 'labs');

    const ctx = await session.adminContext();
    const tab1 = await session.track(ctx);
    const tab2 = await session.track(ctx);

    await gotoEditor(tab1.page, labs.id); // opened first, now stale
    await gotoCategories(tab2.page, 'labs');
    await categoriesAddInput(tab2.page, name);
    await categoriesSave(tab2.page);
    expect((await mustReadPage(db, 'labs')).pageData.categories).toContain(name);

    const row = cardRow(tab1.page, BASE_CARD);
    await expandCard(row);
    await setCardTitle(row, edited);
    await editorSave(tab1.page);

    const after = await mustReadPage(db, 'labs');
    expect.soft(findCard(after.pageData, edited), 'card title edit saved').toBeTruthy();
    expect.soft(after.pageData.categories, `category "${name}" added in tab 2 must survive the tab 1 save (categories now ${JSON.stringify(after.pageData.categories)})`).toContain(name);
  });

  test('K8b concurrency: card edit saved in the editor survives a later save from a stale Categories tab', async ({ session, db }) => {
    const name = qaCat('k8b');
    const edited = `${BASE_CARD} K8B ${Date.now().toString(36)}`;
    const labs = await mustReadPage(db, 'labs');

    const ctx = await session.adminContext();
    const tab1 = await session.track(ctx);
    const tab2 = await session.track(ctx);

    await gotoCategories(tab2.page, 'labs'); // opened first, now stale (holds the old cards)
    await gotoEditor(tab1.page, labs.id);
    const row = cardRow(tab1.page, BASE_CARD);
    await expandCard(row);
    await setCardTitle(row, edited);
    await editorSave(tab1.page);
    expect(findCard((await mustReadPage(db, 'labs')).pageData, edited)).toBeTruthy();

    await categoriesAddInput(tab2.page, name);
    await categoriesSave(tab2.page);

    const after = await mustReadPage(db, 'labs');
    expect.soft(after.pageData.categories, 'category added in the Categories tab saved').toContain(name);
    expect.soft(findCard(after.pageData, edited), `card title edit from the editor tab must survive (titles now ${JSON.stringify(cardsOf(after.pageData).map((c) => c.title))})`).toBeTruthy();
  });
});
