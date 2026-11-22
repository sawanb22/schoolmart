import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { resetContentTables } from '../helpers/db';
import { loadAllPageFixtures, seedPagesFromFixtures } from '../helpers/seed-fixtures';
import { runMigration } from '../../scripts/migrate-page-items';

describe('Payload Size Measurement (Legacy vs v2 Summary)', () => {
  const targetSlugs = ['labs', 'campus-design-execution', 'campus-master-planning'];

  beforeAll(async () => {
    await resetContentTables();
    const fixtures = loadAllPageFixtures();
    const testFixtures = fixtures.filter((f) => targetSlugs.includes(f.slug));
    await seedPagesFromFixtures(testFixtures);
    await runMigration({ mode: 'apply', prisma });
  }, 60000);

  it('measures and logs payload sizes for target hubs', async () => {
    const results: Array<{
      slug: string;
      legacyBytes: number;
      v2Bytes: number;
      reductionBytes: number;
      reductionPercent: string;
    }> = [];

    for (const slug of targetSlugs) {
      const legacyRes = await request(app).get(`/api/pages/${slug}`);
      expect(legacyRes.status).toBe(200);
      const legacyText = JSON.stringify(legacyRes.body);
      const legacyBytes = Buffer.byteLength(legacyText, 'utf8');

      const v2Res = await request(app).get(`/api/pages/${slug}?v=2`);
      expect(v2Res.status).toBe(200);
      const v2Text = JSON.stringify(v2Res.body);
      const v2Bytes = Buffer.byteLength(v2Text, 'utf8');

      const reductionBytes = legacyBytes - v2Bytes;
      const reductionPercent = ((reductionBytes / legacyBytes) * 100).toFixed(1) + '%';

      results.push({
        slug,
        legacyBytes,
        v2Bytes,
        reductionBytes,
        reductionPercent,
      });

      expect(v2Bytes).toBeLessThan(legacyBytes);
    }

    console.log('=== PAYLOAD SIZE MEASUREMENTS ===');
    console.table(results);
    console.log('=================================');
  });
});
