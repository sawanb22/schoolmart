/**
 * Shared constants and safety guards for the CMS end-to-end suite.
 *
 * SAFETY MODEL
 *  - The production database host contains `ep-green-morning`. It must never be used.
 *  - Only DATABASE_URL_TEST from backend/.env (host contains `ep-super-paper`) is accepted.
 *  - Because other processes (vitest, `prisma migrate reset`) may be using the `public`
 *    schema of that disposable database at the same time, the suite works in its own
 *    Postgres schema (default `cms_e2e`) inside the same test database.
 *  - Nothing in this file prints a connection string.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(here, '../../../..');
export const BACKEND_DIR = path.join(REPO_ROOT, 'backend');
export const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend');
export const ARTIFACTS_DIR = path.join(REPO_ROOT, 'tests', 'e2e', 'artifacts', 'cms');

export const BACKEND_PORT = 3101;
export const FRONTEND_PORT = 5174;
export const SITE = `http://localhost:${FRONTEND_PORT}`;
export const API_ORIGIN = `http://localhost:${BACKEND_PORT}`;
export const API = `${API_ORIGIN}/api`;

export const PROD_DB_MARKER = 'ep-green-morning';
export const TEST_DB_MARKER = 'ep-super-paper';

export const QA_ADMIN_EMAIL = 'qa-admin@schoolmart.test';
export const SNAPSHOT_FILE = path.join(ARTIFACTS_DIR, 'snapshot.json');
export const STORAGE_STATE_FILE = path.join(ARTIFACTS_DIR, 'admin-storage-state.json');

export const HUB_SLUGS = ['labs', 'libraries', 'sports-infra', 'tech-infra'] as const;
export type HubSlug = (typeof HUB_SLUGS)[number];

export function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Postgres schema used by this suite. `public` is refused on purpose. */
export function e2eSchema(): string {
  const schema = process.env.CMS_E2E_SCHEMA || 'cms_e2e';
  if (!/^[a-z][a-z0-9_]{2,40}$/.test(schema) || schema === 'public') {
    throw new Error('CMS_E2E_SCHEMA must match ^[a-z][a-z0-9_]{2,40}$ and must not be "public".');
  }
  return schema;
}

/** Throws unless `url` is the disposable test database and not production. */
export function assertSafeDbUrl(url: string | undefined, label = 'database url'): asserts url is string {
  if (!url) throw new Error(`[SAFETY] ${label} is empty.`);
  if (url.includes(PROD_DB_MARKER)) {
    throw new Error(`[SAFETY] ${label} points at the production database host. Aborting.`);
  }
  if (!url.includes(TEST_DB_MARKER)) {
    throw new Error(`[SAFETY] ${label} does not point at the disposable test database host. Aborting.`);
  }
}

/** DATABASE_URL_TEST from backend/.env (no schema parameter). */
export function baseTestDbUrl(): string {
  const env = parseEnvFile(path.join(BACKEND_DIR, '.env'));
  const url = process.env.DATABASE_URL_TEST || env.DATABASE_URL_TEST;
  assertSafeDbUrl(url, 'DATABASE_URL_TEST');
  const confirm = process.env.TEST_DB_CONFIRM || env.TEST_DB_CONFIRM;
  if (confirm !== 'yes-reset-this-db') {
    throw new Error('[SAFETY] TEST_DB_CONFIRM=yes-reset-this-db is required in backend/.env.');
  }
  return url;
}

/** Test DB url pinned to the suite's own schema. */
export function schemaDbUrl(): string {
  const u = new URL(baseTestDbUrl());
  u.searchParams.set('schema', e2eSchema());
  const out = u.toString();
  assertSafeDbUrl(out, 'schema database url');
  return out;
}

/** Environment passed to the backend child process. Process env wins over backend/.env (dotenv never overrides). */
export function backendEnv(): Record<string, string> {
  const url = schemaDbUrl();
  return {
    DATABASE_URL: url,
    DATABASE_URL_UNPOOLED: url,
    DATABASE_URL_POOLED: url,
    PORT: String(BACKEND_PORT),
    ALLOWED_ORIGINS: SITE,
    FRONTEND_URL: SITE,
    ADMIN_URL: SITE,
    NODE_ENV: 'development',
  };
}

export function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
