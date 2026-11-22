import dns from 'dns';
import prisma from '../../src/lib/prisma';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

export { prisma };

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export async function resetContentTables(): Promise<void> {
  // Truncate all content tables and reset identity with retry for remote db stability
  await withRetry(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "pageitemcategory", "pagecategory", "pageitem", "pagerevision", "slugredirect", "page", "sitecontent", "searchcard", "cmsstate" RESTART IDENTITY CASCADE;'
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO "cmsstate" ("id", "version", "updatedAt") VALUES (1, 1, NOW()) ON CONFLICT ("id") DO NOTHING;'
    );
  });
}

export async function seedPagesFromFixtures(names: string[]): Promise<void> {
  // Helper stub for T2 fixture loading
  console.log(`[db.ts] seedPagesFromFixtures stub called for: ${names.join(', ')}`);
}
