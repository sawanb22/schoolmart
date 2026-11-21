import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function resetContentTables(): Promise<void> {
  // Truncate existing content tables
  await prisma.$executeRawUnsafe(
    'TRUNCATE "page", "sitecontent", "searchcard" RESTART IDENTITY CASCADE;'
  );
}

export async function seedPagesFromFixtures(names: string[]): Promise<void> {
  // Helper stub for T2 fixture loading
  console.log(`[db.ts] seedPagesFromFixtures stub called for: ${names.join(', ')}`);
}
