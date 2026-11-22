import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { solutionsRepository } from '../../src/services/solutions-finder';
import { runMigration } from '../../scripts/migrate-page-items';
import { SolutionCardDto } from '../../src/services/solutions-finder/types/solutions-card.types';

function normalizeCardForSnapshot(card: SolutionCardDto): Record<string, unknown> {
  const { id, createdAt, updatedAt, ...rest } = card;
  return rest;
}

describe('Solutions Extractor Golden Equality Snapshot (Parity across migration)', () => {
  let preMigrationCards: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    // 1. Reset tables and seed unmigrated fixtures
    await resetContentTables();
    await seedPagesFromFixtures(loadAllPageFixtures());

    // 2. Extract active cards through repository in unmigrated state
    const rawPreCards = await solutionsRepository.fetchActiveCards();
    preMigrationCards = rawPreCards
      .map(normalizeCardForSnapshot)
      .sort((a, b) => (a.cardSlug as string).localeCompare(b.cardSlug as string));
  }, 120000);

  it('matches golden file snapshot before migration', async () => {
    expect(preMigrationCards.length).toBeGreaterThan(0);
    await expect(JSON.stringify(preMigrationCards, null, 2)).toMatchFileSnapshot(
      './__snapshots__/extractor-golden.json'
    );
  }, 120000);

  it('post-migration extraction equals golden snapshot (100% output parity)', async () => {
    // 3. Apply migration to convert structured pages from JSON blobs into relational tables
    await runMigration({ mode: 'apply', prisma });

    // 4. Extract active cards through repository in migrated state
    const rawPostCards = await solutionsRepository.fetchActiveCards();
    const postMigrationCards = rawPostCards
      .map(normalizeCardForSnapshot)
      .sort((a, b) => (a.cardSlug as string).localeCompare(b.cardSlug as string));

    expect(postMigrationCards.length).toBe(preMigrationCards.length);

    // Assert exact deep equality between pre-migration and post-migration extracted cards
    expect(postMigrationCards).toEqual(preMigrationCards);

    // Assert post-migration cards match the golden snapshot
    await expect(JSON.stringify(postMigrationCards, null, 2)).toMatchFileSnapshot(
      './__snapshots__/extractor-golden.json'
    );
  }, 120000);
});
