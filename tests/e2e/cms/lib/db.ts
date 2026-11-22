/**
 * Direct database access for test fixtures, assertions and teardown.
 * Always bound to the suite's private schema inside the disposable test DB.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import {
  BACKEND_DIR,
  HUB_SLUGS,
  SNAPSHOT_FILE,
  ARTIFACTS_DIR,
  QA_ADMIN_EMAIL,
  schemaDbUrl,
  baseTestDbUrl,
  assertSafeDbUrl,
} from './env';

const backendRequire = createRequire(path.join(BACKEND_DIR, 'package.json'));

export type Prisma = any;

export function newPrisma(): Prisma {
  const url = schemaDbUrl();
  assertSafeDbUrl(url, 'schema database url');
  const { PrismaClient } = backendRequire('@prisma/client');
  return new PrismaClient({ datasourceUrl: url, log: [] });
}

/** Connection to the test DB's default search_path. Only used to drop the suite's private schema. */
export function newBarePrisma(): Prisma {
  const url = baseTestDbUrl();
  assertSafeDbUrl(url, 'test database url');
  const { PrismaClient } = backendRequire('@prisma/client');
  return new PrismaClient({ datasourceUrl: url, log: [] });
}

export async function hashPassword(pw: string): Promise<string> {
  const bcrypt = backendRequire('bcryptjs');
  return bcrypt.hash(pw, 10);
}

export function parseBlob(v: unknown): Record<string, any> {
  if (v === null || v === undefined) return {};
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p && typeof p === 'object' ? p : {};
    } catch {
      return {};
    }
  }
  return typeof v === 'object' ? (v as Record<string, any>) : {};
}

export interface PageRow {
  id: number;
  slug: string;
  title: string;
  template: string | null;
  content: string | null;
  contentModel: string;
  published: boolean;
  version: number;
  pageData: Record<string, any>;
  updatedAt: Date;
  createdAt: Date;
}

export async function readPage(prisma: Prisma, slug: string): Promise<PageRow | null> {
  const row = await prisma.page.findUnique({ where: { slug } });
  if (!row) return null;
  return { ...row, pageData: parseBlob(row.pageData) };
}

export async function mustReadPage(prisma: Prisma, slug: string): Promise<PageRow> {
  const p = await readPage(prisma, slug);
  if (!p) throw new Error(`page "${slug}" not found in the test schema`);
  return p;
}

/** Overwrite pageData (and optionally template) directly in the DB. Used only for test setup/reset. */
export async function writeBlob(
  prisma: Prisma,
  slug: string,
  blob: Record<string, any>,
  extra: { template?: string | null; title?: string; published?: boolean } = {}
): Promise<void> {
  await prisma.page.update({ where: { slug }, data: { pageData: blob, ...extra } });
}

export function cardsOf(blob: Record<string, any>): any[] {
  return Array.isArray(blob.cards) ? blob.cards : [];
}

export function findCard(blob: Record<string, any>, title: string): any | undefined {
  return cardsOf(blob).find((c) => c && c.title === title);
}

/* ------------------------------------------------------------------ */
/* Snapshot / restore / verify                                         */
/* ------------------------------------------------------------------ */

export interface HubSnapshot {
  takenAt: string;
  pages: Record<string, any | null>;
  cmsState: any | null;
  maxSearchQueryLogId: number;
}

function stable(v: any): any {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.keys(v)
      .sort()
      .reduce((acc: any, k) => {
        acc[k] = stable(v[k]);
        return acc;
      }, {});
  }
  return v;
}

export function stableJson(v: any): string {
  return JSON.stringify(stable(v));
}

export async function takeSnapshot(prisma: Prisma): Promise<HubSnapshot> {
  const pages: Record<string, any | null> = {};
  for (const slug of HUB_SLUGS) {
    const row = await prisma.page.findUnique({ where: { slug } });
    pages[slug] = row ? JSON.parse(JSON.stringify(row)) : null;
  }
  const cmsState = await prisma.cmsState.findUnique({ where: { id: 1 } });
  const lastLog = await prisma.searchQueryLog.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  const snap: HubSnapshot = {
    takenAt: new Date().toISOString(),
    pages,
    cmsState: cmsState ? JSON.parse(JSON.stringify(cmsState)) : null,
    maxSearchQueryLogId: lastLog ? lastLog.id : 0,
  };
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snap, null, 2));
  return snap;
}

export function loadSnapshot(): HubSnapshot {
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
}

export async function restoreSnapshot(prisma: Prisma, snap: HubSnapshot): Promise<void> {
  for (const slug of HUB_SLUGS) {
    const want = snap.pages[slug];
    const now = await prisma.page.findUnique({ where: { slug } });
    if (!want) {
      if (now) await prisma.page.delete({ where: { slug } });
      continue;
    }
    if (!now) {
      await prisma.page.create({
        data: { ...want, createdAt: new Date(want.createdAt), updatedAt: new Date(want.updatedAt) },
      });
      continue;
    }
    // Remove structured children that a run may have created for a document-model page.
    await prisma.pageItem.deleteMany({ where: { pageId: now.id } });
    await prisma.pageCategory.deleteMany({ where: { pageId: now.id } });
    await prisma.pageRevision.deleteMany({ where: { pageId: now.id } });
    await prisma.page.update({
      where: { slug },
      data: {
        title: want.title,
        content: want.content,
        template: want.template,
        contentModel: want.contentModel,
        pageData: want.pageData,
        published: want.published,
        version: want.version,
        createdAt: new Date(want.createdAt),
        updatedAt: new Date(want.updatedAt),
      },
    });
  }
  if (snap.cmsState) {
    await prisma.cmsState.upsert({
      where: { id: 1 },
      create: { id: 1, version: snap.cmsState.version, updatedAt: new Date(snap.cmsState.updatedAt) },
      update: { version: snap.cmsState.version, updatedAt: new Date(snap.cmsState.updatedAt) },
    });
  } else {
    await prisma.cmsState.deleteMany({});
  }
  await prisma.searchQueryLog.deleteMany({ where: { id: { gt: snap.maxSearchQueryLogId } } });
}

/** Returns human-readable differences between the live DB and the snapshot (empty array = identical). */
export async function diffAgainstSnapshot(prisma: Prisma, snap: HubSnapshot): Promise<string[]> {
  const diffs: string[] = [];
  for (const slug of HUB_SLUGS) {
    const want = snap.pages[slug];
    const now = await prisma.page.findUnique({ where: { slug } });
    if (!want && !now) continue;
    if (!want || !now) {
      diffs.push(`${slug}: existence differs (snapshot=${!!want}, db=${!!now})`);
      continue;
    }
    const nowJson = JSON.parse(JSON.stringify(now));
    for (const key of ['title', 'content', 'template', 'contentModel', 'published', 'version', 'createdAt', 'updatedAt']) {
      if (stableJson(nowJson[key]) !== stableJson(want[key])) diffs.push(`${slug}.${key} differs`);
    }
    if (stableJson(parseBlob(nowJson.pageData)) !== stableJson(parseBlob(want.pageData))) {
      diffs.push(`${slug}.pageData differs`);
    }
    const kids =
      (await prisma.pageItem.count({ where: { pageId: now.id } })) +
      (await prisma.pageCategory.count({ where: { pageId: now.id } })) +
      (await prisma.pageRevision.count({ where: { pageId: now.id } }));
    if (kids !== 0) diffs.push(`${slug}: ${kids} structured child rows exist`);
  }
  const cms = await prisma.cmsState.findUnique({ where: { id: 1 } });
  const cmsNow = cms ? JSON.parse(JSON.stringify(cms)) : null;
  if (stableJson(cmsNow) !== stableJson(snap.cmsState)) diffs.push('cmsState differs');
  return diffs;
}

export async function deleteQaAdmin(prisma: Prisma): Promise<number> {
  const res = await prisma.user.deleteMany({ where: { email: QA_ADMIN_EMAIL } });
  return res.count;
}
