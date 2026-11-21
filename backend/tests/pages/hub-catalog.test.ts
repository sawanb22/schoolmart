import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { runMigration } from '../../scripts/migrate-page-items';

describe('Modernized Hub Catalog Endpoint (Post-migration verification against T2 snapshots)', () => {
  const t2SnapshotPath = path.resolve(__dirname, '../contract/__snapshots__/hub-catalog.json');
  const t2LabsSnapshotPath = path.resolve(__dirname, '../contract/__snapshots__/hub-catalog-labs.json');

  const t2Snapshot = JSON.parse(fs.readFileSync(t2SnapshotPath, 'utf8'));
  const t2LabsSnapshot = JSON.parse(fs.readFileSync(t2LabsSnapshotPath, 'utf8'));

  beforeAll(async () => {
    // Seed fixtures and apply migration so structured pages read from PageItem & PageCategory
    await resetContentTables();
    await seedPagesFromFixtures(loadAllPageFixtures());
    await runMigration({ mode: 'apply', prisma });
  }, 120000);

  it('GET /api/pages/hub/catalog matches T2 snapshot subcategories, titles, counts and items with pi-<id> format', async () => {
    const res = await request(app).get('/api/pages/hub/catalog');
    expect(res.status).toBe(200);

    const body = res.body;
    expect(body.activeHub).toBe(t2Snapshot.activeHub);

    // Verify Hub Configs parity
    expect(body.hubs).toHaveLength(t2Snapshot.hubs.length);
    for (let i = 0; i < t2Snapshot.hubs.length; i++) {
      const snapHub = t2Snapshot.hubs[i];
      const actualHub = body.hubs.find((h: any) => h.id === snapHub.id);
      expect(actualHub).toBeDefined();
      expect(actualHub.title).toBe(snapHub.title);
      expect(actualHub.totalCount).toBe(snapHub.totalCount);

      // Verify subcategory set equality
      const snapSubcats = new Set(snapHub.subcategories);
      const actualSubcats = new Set(actualHub.subcategories);
      expect(actualSubcats).toEqual(snapSubcats);
    }

    // Verify Items parity
    expect(body.items).toHaveLength(t2Snapshot.items.length);
    for (let i = 0; i < t2Snapshot.items.length; i++) {
      const snapItem = t2Snapshot.items[i];
      const actualItem = body.items[i];

      expect(actualItem).toBeDefined();
      expect(actualItem.title).toBe(snapItem.title);
      expect(actualItem.href).toBe(snapItem.href);
      expect(actualItem.hubSlug).toBe(snapItem.hubSlug);
      expect(actualItem.hubTitle).toBe(snapItem.hubTitle);
      expect(actualItem.categories).toEqual(snapItem.categories);

      // Verify ID convention: pi-<id> for CMS items, prod-<id> for furniture
      if (actualItem.hubSlug === 'furniture') {
        expect(String(actualItem.id)).toMatch(/^prod-/);
      } else {
        expect(String(actualItem.id)).toMatch(/^pi-\d+$/);
      }
    }
  });

  it('GET /api/pages/hub/catalog?hub=labs yields identical filtered items matching T2 labs snapshot with pi-<id>', async () => {
    const res = await request(app).get('/api/pages/hub/catalog?hub=labs');
    expect(res.status).toBe(200);

    const body = res.body;
    expect(body.activeHub).toBe('labs');
    expect(body.items).toHaveLength(t2LabsSnapshot.items.length);

    for (let i = 0; i < t2LabsSnapshot.items.length; i++) {
      const snapItem = t2LabsSnapshot.items[i];
      const actualItem = body.items[i];

      expect(actualItem.title).toBe(snapItem.title);
      expect(actualItem.href).toBe(snapItem.href);
      expect(actualItem.hubSlug).toBe('labs');
      expect(actualItem.categories).toEqual(snapItem.categories);
      expect(String(actualItem.id)).toMatch(/^pi-\d+$/);
    }
  });
});
