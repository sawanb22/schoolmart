import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

test.describe.serial('Admin Items & Strict Structured Writes E2E', () => {
  const timestamp = Date.now();
  const testCardTitle = `E2E Test Lab ${timestamp}`;
  const testCardTitleUpdated = `E2E Test Lab ${timestamp} Updated`;
  const testCardSlug = `e2e-test-lab-${timestamp}`;
  let createdItemId: number | null = null;
  let labsPageId: number = 1;
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    // Generate valid admin JWT token
    const secret = process.env.JWT_SECRET || 'test_jwt_secret_for_vitest_harness_only_not_prod';
    adminToken = jwt.sign(
      { id: 1, email: 'admin@schoolmart.in', role: 'admin' },
      secret,
      { expiresIn: '1d' }
    );

    // Fetch labs page ID via API
    try {
      const pageRes = await request.get('/api/pages/labs');
      if (pageRes.ok()) {
        const body = await pageRes.json();
        if (body.id) labsPageId = body.id;
      }
    } catch {
      // Fallback to default page ID 1
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up created card so database is left in a clean state
    if (createdItemId) {
      try {
        await request.delete(`/api/admin/pages/${labsPageId}/items/${createdItemId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (err) {
        console.warn('Failed to clean up E2E test item:', err);
      }
    }
  });

  test('creates new card on labs in ItemsManager and verifies on /labs and subpage', async ({ page }) => {
    test.setTimeout(90000);

    // Inject admin authentication in localStorage
    await page.addInitScript(({ token }) => {
      const userStr = JSON.stringify({ id: 1, email: 'admin@schoolmart.in', role: 'admin' });
      localStorage.setItem('cm_admin_token', token);
      localStorage.setItem('cm_admin_user', userStr);
      localStorage.setItem('cm_token', token);
      localStorage.setItem('cm_user', userStr);
    }, { token: adminToken });

    // 1. Visit /admin/pages?edit=labs
    await page.goto('/admin/pages?edit=labs', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#sec-cards')).toBeVisible({ timeout: 60000 });

    // 2. Click "New Item"
    const newBtn = page.locator('#sec-cards').getByRole('button', { name: /New Item/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    // 3. Fill card details in drawer
    const drawer = page.locator('div[role="dialog"]').or(page.locator('.fixed.inset-0'));
    await expect(drawer.getByRole('heading', { level: 2, name: /New Item/i })).toBeVisible({ timeout: 10000 });

    const titleInput = drawer.locator('input[placeholder="Card Title"]');
    await titleInput.fill(testCardTitle);

    const slugInput = drawer.locator('input[placeholder="custom-card-slug"]').or(drawer.locator('input[title*="custom destination"]')).first();
    if (await slugInput.isVisible()) {
      await slugInput.fill(testCardSlug);
    }

    const descInput = drawer.locator('textarea[placeholder="Card teaser description..."]');
    if (await descInput.isVisible()) {
      await descInput.fill('Automated E2E test laboratory equipment and facilities.');
    }

    // Assign COMPUTER LAB category so the card is visible under the default category filter on /labs
    const compLabBtn = drawer.locator('button').filter({ hasText: /COMPUTER LAB/i }).first();
    if (await compLabBtn.isVisible()) {
      await compLabBtn.click();
    } else {
      const anyCatBtn = drawer.locator('button').filter({ hasText: /\+ / }).first();
      if (await anyCatBtn.isVisible()) {
        await anyCatBtn.click();
      }
    }

    // 4. Save new item
    const saveBtn = drawer.getByRole('button', { name: /Create Item|Save Changes/i });
    await saveBtn.click();

    // 5. Verify item appears in the ItemsManager list
    await expect(page.locator('#sec-cards').getByText(testCardTitle)).toBeVisible({ timeout: 15000 });

    // Record created item ID from page API
    try {
      const itemsRes = await page.request.get(`/api/admin/pages/${labsPageId}/items?collection=cards`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (itemsRes.ok()) {
        const body = await itemsRes.json();
        const found = (body.items || []).find((it: any) => it.title === testCardTitle || it.slug === testCardSlug);
        if (found) createdItemId = found.id;
      }
    } catch {
      // Non-fatal
    }

    // 6. Navigate to public /labs and verify card appears
    await page.goto('/labs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(testCardTitle).first()).toBeVisible({ timeout: 20000 });

    // 7. Navigate to public subpage /labs/<slug>
    await page.goto(`/labs/${testCardSlug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(testCardTitle)).first()).toBeVisible({ timeout: 20000 });
  });

  test('edits card title in ItemsManager and verifies updated title on public subpage', async ({ page }) => {
    test.setTimeout(90000);
    // Inject admin authentication
    await page.addInitScript(({ token }) => {
      const userStr = JSON.stringify({ id: 1, email: 'admin@schoolmart.in', role: 'admin' });
      localStorage.setItem('cm_admin_token', token);
      localStorage.setItem('cm_admin_user', userStr);
      localStorage.setItem('cm_token', token);
      localStorage.setItem('cm_user', userStr);
    }, { token: adminToken });

    // Visit /admin/pages?edit=labs
    await page.goto('/admin/pages?edit=labs', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#sec-cards')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#sec-cards').getByText(testCardTitle)).toBeVisible({ timeout: 30000 });

    // Locate card row and click Edit
    const cardRow = page.locator('#sec-cards [data-testid="item-row"]').filter({ hasText: testCardTitle });
    const editBtn = cardRow.getByRole('button', { name: /Edit/i });
    await editBtn.click();

    // Drawer opens
    const drawer = page.locator('.fixed.inset-0');
    await expect(drawer.getByRole('heading', { level: 2, name: new RegExp(`Edit: ${testCardTitle}`) })).toBeVisible({ timeout: 10000 });

    // Change title
    const titleInput = drawer.locator('input[placeholder="Card Title"]');
    await titleInput.fill(testCardTitleUpdated);

    // Save changes
    const saveBtn = drawer.getByRole('button', { name: /Save Changes/i });
    await saveBtn.click();

    // Verify updated title in ItemsManager list
    await expect(page.locator('#sec-cards').getByText(testCardTitleUpdated)).toBeVisible({ timeout: 15000 });

    // Verify on subpage /labs/<slug>
    await page.goto(`/labs/${testCardSlug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(testCardTitleUpdated)).first()).toBeVisible({ timeout: 20000 });
  });

  test('reorders cards in ItemsManager with Move up / Move down', async ({ page }) => {
    test.setTimeout(90000);
    // Inject admin auth
    await page.addInitScript(({ token }) => {
      const userStr = JSON.stringify({ id: 1, email: 'admin@schoolmart.in', role: 'admin' });
      localStorage.setItem('cm_admin_token', token);
      localStorage.setItem('cm_admin_user', userStr);
      localStorage.setItem('cm_token', token);
      localStorage.setItem('cm_user', userStr);
    }, { token: adminToken });

    await page.goto('/admin/pages?edit=labs', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#sec-cards')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#sec-cards').getByText(testCardTitleUpdated)).toBeVisible({ timeout: 30000 });

    // Find card row
    const cardRow = page.locator('#sec-cards [data-testid="item-row"]').filter({ hasText: testCardTitleUpdated });
    const moveUpBtn = cardRow.getByTitle('Move up');
    const moveDownBtn = cardRow.getByTitle('Move down');

    // Click move button if enabled
    if (await moveUpBtn.isEnabled()) {
      await moveUpBtn.click();
      await page.waitForTimeout(1000);
    } else if (await moveDownBtn.isEnabled()) {
      await moveDownBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('handles concurrent version conflict dialog when saving with stale version', async ({ browser, request }) => {
    test.setTimeout(90000);
    if (!createdItemId) {
      test.skip(true, 'Skipping conflict test because item was not created via UI');
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(({ token }) => {
      const userStr = JSON.stringify({ id: 1, email: 'admin@schoolmart.in', role: 'admin' });
      localStorage.setItem('cm_admin_token', token);
      localStorage.setItem('cm_admin_user', userStr);
      localStorage.setItem('cm_token', token);
      localStorage.setItem('cm_user', userStr);
    }, { token: adminToken });

    // 1. Open card in admin drawer
    await page.goto(`/admin/pages?edit=labs&card=${testCardSlug}`, { waitUntil: 'domcontentloaded' });
    const drawer = page.locator('.fixed.inset-0');
    await expect(drawer.getByRole('heading', { level: 2, name: /Edit:/i })).toBeVisible({ timeout: 30000 });

    // 2. In background, increment the item version via API to simulate concurrent write
    const currentItemRes = await request.get(`/api/admin/pages/${labsPageId}/items?collection=cards`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const currentItems = await currentItemRes.json();
    const currentItem = (currentItems.items || []).find((it: any) => it.id === createdItemId);
    const serverVersion = currentItem ? currentItem.version : 1;

    await request.patch(`/api/admin/pages/${labsPageId}/items/${createdItemId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        version: serverVersion,
        card: {
          title: `${testCardTitleUpdated} (Concurrent Edit)`,
          slug: testCardSlug,
        },
      },
    });

    // 3. User in drawer tries to save with stale version
    const titleInput = drawer.locator('input[placeholder="Card Title"]');
    await titleInput.fill(`${testCardTitleUpdated} (Stale Save)`);

    const saveBtn = drawer.getByRole('button', { name: /Save Changes/i });
    await saveBtn.click();

    // 4. Verify ConflictDialog appears
    await expect(page.getByText(/Version Conflict on/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Reload Latest/i)).toBeVisible();
    await expect(page.getByText(/Overwrite With Mine/i)).toBeVisible();

    // 5. Click "Reload Latest"
    await page.getByText(/Reload Latest/i).click();
    await expect(page.getByText(/Version Conflict on/i)).not.toBeVisible();

    await context.close();
  });
});
