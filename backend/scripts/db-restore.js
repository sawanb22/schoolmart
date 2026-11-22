/**
 * Full database restore from a db-backup.js file.
 * The target database must already have the schema: run `npx prisma migrate deploy` on it first.
 *
 *   TARGET_DATABASE_URL=... npm run db:restore -- <backup-file.json>
 *   (add --force to wipe tables that already contain data)
 *
 * Safety: refuses to run if the target already has data unless --force is given.
 * Inserts tables in foreign-key order, then resets id sequences.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const args = process.argv.slice(2);
const force = args.includes('--force');
const fileArg = args.find((a) => !a.startsWith('--'));
const targetUrl = process.env.TARGET_DATABASE_URL;
if (!targetUrl) {
  console.error('Set TARGET_DATABASE_URL to the database you want to restore INTO.');
  process.exit(1);
}
if (!fileArg || !fs.existsSync(fileArg)) {
  console.error('Usage: TARGET_DATABASE_URL=... npm run db:restore -- <backup-file.json> [--force]');
  process.exit(1);
}
const backup = JSON.parse(fs.readFileSync(fileArg, 'utf8'));
if (backup.format !== 'schoolmart-full-backup-v1') {
  console.error('Not a full backup file (expected format schoolmart-full-backup-v1).');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });
const q = (name) => `"${name.replace(/"/g, '""')}"`;

async function sortByForeignKeys(tables) {
  const deps = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT tc.table_name AS child, ccu.table_name AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`);
  const parents = new Map(tables.map((t) => [t, new Set()]));
  for (const d of deps) {
    if (d.child !== d.parent && parents.has(d.child) && parents.has(d.parent)) parents.get(d.child).add(d.parent);
  }
  const ordered = [];
  const seen = new Set();
  const visit = (t, stack = new Set()) => {
    if (seen.has(t)) return;
    if (stack.has(t)) throw new Error(`Circular foreign keys involving ${t}`);
    stack.add(t);
    for (const p of parents.get(t)) visit(p, stack);
    stack.delete(t);
    seen.add(t);
    ordered.push(t);
  };
  tables.forEach((t) => visit(t));
  return ordered;
}

async function main() {
  const existing = new Set((await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  )).map((r) => r.table_name));
  const tables = Object.keys(backup.tables);
  const missing = tables.filter((t) => !existing.has(t));
  if (missing.length) {
    console.error(`Target is missing tables: ${missing.join(', ')}. Run "npx prisma migrate deploy" on it first.`);
    process.exit(1);
  }

  const order = await sortByForeignKeys(tables);
  let hasData = false;
  for (const t of order) {
    const [{ n }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${q(t)}`);
    if (n > 0) { hasData = true; console.log(`  target already has ${n} rows in ${t}`); }
  }
  if (hasData && !force) {
    console.error('\nTarget database is not empty. Re-run with --force to replace its data.');
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    if (hasData) await tx.$executeRawUnsafe(`TRUNCATE ${order.map(q).join(', ')} RESTART IDENTITY CASCADE`);
    for (const t of order) {
      const rows = backup.tables[t];
      if (!rows.length) continue;
      // Insert in chunks; json_populate_recordset maps JSON back to the real column types.
      for (let i = 0; i < rows.length; i += 500) {
        await tx.$executeRawUnsafe(
          `INSERT INTO ${q(t)} SELECT * FROM json_populate_recordset(NULL::${q(t)}, $1::json)`,
          JSON.stringify(rows.slice(i, i + 500))
        );
      }
      console.log(`  ${t.padEnd(20)} ${rows.length} rows`);
    }
    // Reset every serial/identity sequence to the current max id.
    const seqCols = await tx.$queryRawUnsafe(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'`);
    for (const c of seqCols) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${q(c.table_name)}', '${c.column_name}'),
                GREATEST((SELECT COALESCE(MAX(${q(c.column_name)}), 0) FROM ${q(c.table_name)}), 1),
                (SELECT COUNT(*) > 0 FROM ${q(c.table_name)}))`
      );
    }
  }, { timeout: 300000, maxWait: 20000 });

  console.log(`\nRestore complete from backup taken ${backup.exportedAt}.`);
}

main()
  .catch((e) => { console.error('Restore failed (nothing was changed):', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
