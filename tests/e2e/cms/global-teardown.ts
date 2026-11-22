import fs from 'node:fs';
import type { FullConfig } from '@playwright/test';
import { SNAPSHOT_FILE, STORAGE_STATE_FILE, assertSafeDbUrl, e2eSchema, schemaDbUrl, ARTIFACTS_DIR } from './lib/env';
import { deleteQaAdmin, diffAgainstSnapshot, loadSnapshot, newBarePrisma, newPrisma, restoreSnapshot } from './lib/db';
import path from 'node:path';

/**
 * Restore hub pages exactly to the baseline snapshot, verify the restore by re-reading the DB,
 * delete the QA admin user and drop the suite's private schema.
 * Set CMS_E2E_KEEP_SCHEMA=1 to keep the schema for post-mortem inspection.
 */
export default async function globalTeardown(_config: FullConfig): Promise<void> {
  assertSafeDbUrl(schemaDbUrl(), 'schema database url');
  const report: string[] = [];
  const prisma = newPrisma();
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const snap = loadSnapshot();
      await restoreSnapshot(prisma, snap);
      const diffs = await diffAgainstSnapshot(prisma, snap);
      report.push(diffs.length === 0 ? 'restore verified: hub pages identical to baseline snapshot' : `RESTORE MISMATCH: ${diffs.join('; ')}`);
    } else {
      report.push('no snapshot file found, nothing restored');
    }
    const removed = await deleteQaAdmin(prisma);
    const remaining = await prisma.user.count({ where: { email: 'qa-admin@schoolmart.test' } });
    report.push(`QA admin removed: ${removed} row(s), remaining=${remaining}`);

    if (process.env.CMS_E2E_KEEP_SCHEMA !== '1') {
      // Safe: identifier is validated by e2eSchema() and the url is guarded in newBarePrisma().
      const dropper = newBarePrisma();
      try {
        await dropper.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${e2eSchema()}" CASCADE`);
        report.push(`private schema "${e2eSchema()}" dropped`);
      } finally {
        await dropper.$disconnect();
      }
    } else {
      report.push(`private schema "${e2eSchema()}" kept (CMS_E2E_KEEP_SCHEMA=1)`);
    }
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      /* schema may already be gone */
    }
    if (fs.existsSync(STORAGE_STATE_FILE)) fs.rmSync(STORAGE_STATE_FILE);
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'teardown-report.txt'), report.join('\n') + '\n');
    for (const line of report) console.log(`[cms-e2e teardown] ${line}`);
  }
}
