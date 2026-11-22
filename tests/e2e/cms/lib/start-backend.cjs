/**
 * Backend launcher for the CMS e2e suite (used as a Playwright webServer command).
 *
 *  1. Verifies DATABASE_URL is the disposable test DB (never ep-green-morning).
 *  2. Recreates the suite's private Postgres schema inside the test DB and applies
 *     the repo migrations to it (so other processes using the `public` schema are
 *     neither disturbed nor able to disturb the run).
 *  3. Starts the real backend (ts-node-dev, transpile-only) on the port in PORT.
 *
 * Connection strings are never printed.
 */
'use strict';

const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const BACKEND_DIR = path.join(REPO_ROOT, 'backend');

function fail(msg) {
  console.error(`[cms-e2e backend] ${msg}`);
  process.exit(1);
}

function redact(text) {
  return String(text)
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, '<redacted-url>')
    .replace(/ep-[a-z0-9-]+(\.[a-z0-9-]+)+/gi, '<host>');
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is not set.');
if (url.includes('ep-green-morning')) fail('[SAFETY] DATABASE_URL targets production. Aborting.');
if (!url.includes('ep-super-paper')) fail('[SAFETY] DATABASE_URL is not the disposable test DB. Aborting.');
for (const k of ['DATABASE_URL_UNPOOLED', 'DATABASE_URL_POOLED']) {
  if (process.env[k] !== url) fail(`[SAFETY] ${k} must equal DATABASE_URL for this suite.`);
}

let schema;
try {
  schema = new URL(url).searchParams.get('schema');
} catch {
  fail('DATABASE_URL could not be parsed.');
}
if (!schema || schema === 'public' || !/^[a-z][a-z0-9_]{2,40}$/.test(schema)) {
  fail('[SAFETY] DATABASE_URL must carry a private ?schema=<name> (not public).');
}

async function prepareSchema() {
  const { PrismaClient } = require(path.join(BACKEND_DIR, 'node_modules', '@prisma', 'client'));
  const bare = new URL(url);
  bare.searchParams.delete('schema');
  const prisma = new PrismaClient({ datasourceUrl: bare.toString(), log: [] });
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } finally {
    await prisma.$disconnect();
  }
}

function migrate() {
  const prismaBin = path.join(BACKEND_DIR, 'node_modules', 'prisma', 'build', 'index.js');
  let res;
  let out = '';
  // Neon computes can need a moment to wake up; retry connection errors (P1001) a few times.
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    res = spawnSync(process.execPath, [prismaBin, 'migrate', 'deploy'], {
      cwd: BACKEND_DIR,
      env: process.env,
      encoding: 'utf8',
    });
    out = redact(`${res.stdout || ''}\n${res.stderr || ''}`);
    if (res.status === 0 || !/P1001|P1002|ECONNRESET|timed out/i.test(out)) break;
    console.log(`[cms-e2e backend] migrate attempt ${attempt} could not reach the database, retrying`);
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},4000)']);
  }
  const interesting = out.split(/\r?\n/).filter((l) => /migration|error|P\d{4}|applied/i.test(l));
  console.log(`[cms-e2e backend] prisma migrate deploy exit=${res.status}`);
  if (interesting.length) console.log(interesting.map((l) => `  ${l.trim()}`).join('\n'));
  if (res.status !== 0) fail('prisma migrate deploy failed.');
}

(async () => {
  await prepareSchema();
  console.log(`[cms-e2e backend] private schema "${schema}" recreated`);
  migrate();

  const tsNodeDev = path.join(BACKEND_DIR, 'node_modules', 'ts-node-dev', 'lib', 'bin.js');
  const child = spawn(process.execPath, [tsNodeDev, '--transpile-only', '--no-notify', 'src/server.ts'], {
    cwd: BACKEND_DIR,
    env: process.env,
    stdio: 'inherit',
  });
  const stop = () => {
    try { child.kill(); } catch { /* ignore */ }
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  process.on('exit', stop);
  child.on('exit', (code) => process.exit(code ?? 0));
})().catch((err) => fail(redact(err && err.message ? err.message : err)));
