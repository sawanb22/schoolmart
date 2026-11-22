/**
 * Full database backup: copies EVERY table in the "public" schema (found automatically),
 * so new tables are never missed. No pg_dump needed.
 *
 *   npm run db:export                         -> backs up DATABASE_URL
 *   SOURCE_DATABASE_URL=... npm run db:export -> backs up another database
 *
 * Output: backend/prisma/backups/backup-<timestamp>.json (git-ignored).
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SKIP_TABLES = new Set(['_prisma_migrations']);
const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
if (!sourceUrl) {
  console.error('DATABASE_URL (or SOURCE_DATABASE_URL) is not set.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const q = (name) => `"${name.replace(/"/g, '""')}"`;

async function main() {
  const tables = (await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
  )).map((r) => r.table_name).filter((t) => !SKIP_TABLES.has(t));

  const backup = { format: 'schoolmart-full-backup-v1', exportedAt: new Date().toISOString(), tables: {} };
  let totalRows = 0;
  for (const t of tables) {
    const [{ rows }] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(json_agg(x), '[]'::json) AS rows FROM ${q(t)} x`
    );
    backup.tables[t] = rows;
    totalRows += rows.length;
    console.log(`  ${t.padEnd(20)} ${rows.length} rows`);
  }

  const dir = path.resolve(__dirname, '../prisma/backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `backup-${backup.exportedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup), 'utf8');
  console.log(`\nBackup complete: ${tables.length} tables, ${totalRows} rows`);
  console.log(`Saved to: ${file}`);
}

main()
  .catch((e) => { console.error('Backup failed:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
