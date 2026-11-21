import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { parsePageData } from '../src/lib/page-data';
import {
  classifyPage,
  splitLegacyPageData,
  buildLegacyPageData,
  SplitResult,
} from '../src/services/page-content/legacy-mapper';
import { writeStructuredPage } from '../src/services/page-content/structured-writer';

export interface MigrationOptions {
  mode?: 'dry-run' | 'apply' | 'rollback';
  pages?: string[];
  force?: boolean;
  outputPath?: string;
  prisma?: PrismaClient;
}

export interface PageMigrationReport {
  id: number;
  slug: string;
  classification: 'document' | 'structured';
  status: 'migrated' | 'skipped' | 'failed' | 'rolled_back';
  itemCounts: Record<string, number>;
  totalItems: number;
  categoryCount: number;
  warnings: string[];
  bytesBefore: number;
  bytesAfter: number;
  unknownArrayKeys: string[];
  error?: string;
}

export interface MigrationReport {
  mode: 'dry-run' | 'apply' | 'rollback';
  timestamp: string;
  totalPages: number;
  totals: {
    structured: number;
    document: number;
    items: number;
    categories: number;
    warnings: number;
    errors: number;
  };
  pages: PageMigrationReport[];
}

export async function runMigration(options: MigrationOptions = {}): Promise<MigrationReport> {
  const db = options.prisma || prisma;
  const mode = options.mode || 'dry-run';
  const force = options.force || false;
  const targetPages = options.pages && options.pages.length > 0 ? options.pages : undefined;

  console.log(`\n==================================================`);
  console.log(`🚀 Starting Page Items Migration [Mode: ${mode.toUpperCase()}]`);
  console.log(`Force re-migration: ${force}`);
  if (targetPages) {
    console.log(`Targeting pages: ${targetPages.join(', ')}`);
  }
  console.log(`==================================================\n`);

  // Query pages in ID order
  const whereClause: any = {};
  if (targetPages) {
    whereClause.slug = { in: targetPages };
  }

  const allPages = await db.page.findMany({
    where: whereClause,
    orderBy: { id: 'asc' },
  });

  const reportPages: PageMigrationReport[] = [];
  let structuredCount = 0;
  let documentCount = 0;
  let totalItemsCount = 0;
  let totalCategoriesCount = 0;
  let totalWarningsCount = 0;
  let totalErrorsCount = 0;

  if (mode === 'rollback') {
    for (const page of allPages) {
      if (page.contentModel !== 'structured') {
        documentCount++;
        console.log(`[ROLLBACK SKIP] '${page.slug}' (Page ${page.id}) is not structured (contentModel=${page.contentModel})`);
        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'document',
          status: 'skipped',
          itemCounts: {},
          totalItems: 0,
          categoryCount: 0,
          warnings: ['Not structured, skipped rollback'],
          bytesBefore: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          bytesAfter: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          unknownArrayKeys: [],
        });
        continue;
      }

      structuredCount++;
      const preMigrationRev = await db.pageRevision.findFirst({
        where: { pageId: page.id, reason: 'pre-migration' },
        orderBy: { id: 'desc' },
      });

      if (!preMigrationRev || !preMigrationRev.snapshot || typeof preMigrationRev.snapshot !== 'object') {
        totalErrorsCount++;
        console.error(`ERROR: No pre-migration revision found for structured page '${page.slug}' (Page ${page.id})`);
        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'structured',
          status: 'failed',
          itemCounts: {},
          totalItems: 0,
          categoryCount: 0,
          warnings: [],
          bytesBefore: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          bytesAfter: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          unknownArrayKeys: [],
          error: 'No pre-migration revision snapshot found',
        });
        continue;
      }

      const snapshot = preMigrationRev.snapshot as any;
      const restoredPageData = snapshot.pageData;
      const restoredContentModel = snapshot.contentModel || 'document';
      const bytesBefore = Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8');
      const bytesAfter = Buffer.byteLength(JSON.stringify(restoredPageData || {}), 'utf8');

      try {
        await db.$transaction(
          async tx => {
            // Delete join rows
            await tx.pageItemCategory.deleteMany({
              where: { item: { pageId: page.id } },
            });
            // Delete items
            await tx.pageItem.deleteMany({
              where: { pageId: page.id },
            });
            // Delete categories
            await tx.pageCategory.deleteMany({
              where: { pageId: page.id },
            });

            // Restore page
            await tx.page.update({
              where: { id: page.id },
              data: {
                pageData: restoredPageData as any,
                contentModel: restoredContentModel,
                version: { increment: 1 },
              },
            });

            // Bump CmsState version
            await tx.cmsState.upsert({
              where: { id: 1 },
              create: { id: 1, version: 2 },
              update: { version: { increment: 1 } },
            });
          },
          { maxWait: 15000, timeout: 60000 }
        );

        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'structured',
          status: 'rolled_back',
          itemCounts: {},
          totalItems: 0,
          categoryCount: 0,
          warnings: [],
          bytesBefore,
          bytesAfter,
          unknownArrayKeys: [],
        });

        console.log(
          `⏪ [ROLLED BACK] '${page.slug}' (Page ${page.id}): Restored to ${restoredContentModel}. Size: ${bytesBefore}B -> ${bytesAfter}B`
        );
      } catch (rollbackErr: any) {
        totalErrorsCount++;
        console.error(`ERROR: Rollback transaction failed for page '${page.slug}':`, rollbackErr);
        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'structured',
          status: 'failed',
          itemCounts: {},
          totalItems: 0,
          categoryCount: 0,
          warnings: [],
          bytesBefore,
          bytesAfter,
          unknownArrayKeys: [],
          error: String(rollbackErr?.message || rollbackErr),
        });
      }
    }
  } else {
    for (const page of allPages) {
    let sourceBlob: Record<string, unknown>;

    // 1. If page is already structured
    if (page.contentModel === 'structured') {
      if (!force) {
        console.log(`[SKIP] Page '${page.slug}' (Page ${page.id}) is already structured (use --force to re-migrate)`);
        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'structured',
          status: 'skipped',
          itemCounts: {},
          totalItems: 0,
          categoryCount: 0,
          warnings: ['Already structured, skipped without --force'],
          bytesBefore: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          bytesAfter: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          unknownArrayKeys: [],
        });
        continue;
      }

      // If force is true, fetch the original pre-migration snapshot
      const preMigrationRev = await db.pageRevision.findFirst({
        where: { pageId: page.id, reason: 'pre-migration' },
        orderBy: { id: 'desc' },
      });
      if (preMigrationRev && preMigrationRev.snapshot && typeof preMigrationRev.snapshot === 'object') {
        sourceBlob = parsePageData((preMigrationRev.snapshot as any).pageData);
      } else {
        sourceBlob = parsePageData(page.pageData);
      }
    } else {
      // 2. Unmigrated page: classify
      const classification = classifyPage(page);

      if (classification === 'document') {
        documentCount++;
        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'document',
          status: 'skipped',
          itemCounts: {},
          totalItems: 0,
          categoryCount: 0,
          warnings: [],
          bytesBefore: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          bytesAfter: Buffer.byteLength(JSON.stringify(page.pageData || {}), 'utf8'),
          unknownArrayKeys: [],
        });
        console.log(`[DOCUMENT] Skipping '${page.slug}' (Page ${page.id}) - Classified as document page`);
        continue;
      }

      sourceBlob = parsePageData(page.pageData);
    }

    structuredCount++;
    const bytesBefore = Buffer.byteLength(JSON.stringify(sourceBlob || {}), 'utf8');

    let splitResult: SplitResult;
    try {
      splitResult = splitLegacyPageData(sourceBlob);
    } catch (err: any) {
      totalErrorsCount++;
      console.error(`ERROR: Failed to parse or split legacy blob for page '${page.slug}':`, err);
      reportPages.push({
        id: page.id,
        slug: page.slug,
        classification: 'structured',
        status: 'failed',
        itemCounts: {},
        totalItems: 0,
        categoryCount: 0,
        warnings: [],
        bytesBefore,
        bytesAfter: bytesBefore,
        unknownArrayKeys: [],
        error: String(err?.message || err),
      });
      continue;
    }

    // Per-collection item counts
    const itemCounts: Record<string, number> = {};
    for (const it of splitResult.items) {
      itemCounts[it.collection] = (itemCounts[it.collection] || 0) + 1;
    }

    // Unknown array-valued keys left in settings
    const unknownArrayKeys: string[] = [];
    for (const [k, v] of Object.entries(splitResult.settings)) {
      if (Array.isArray(v)) {
        unknownArrayKeys.push(k);
      }
    }

    const bytesAfter = Buffer.byteLength(JSON.stringify(splitResult.settings || {}), 'utf8');
    const warnings = [...splitResult.warnings];
    totalWarningsCount += warnings.length;
    totalItemsCount += splitResult.items.length;
    totalCategoriesCount += splitResult.categories.length;

    if (mode === 'apply') {
      try {
        await db.$transaction(
          async tx => {
            // 1. Create pre-migration PageRevision snapshot
            await tx.pageRevision.create({
              data: {
                pageId: page.id,
                version: page.version,
                reason: 'pre-migration',
                snapshot: {
                  pageData: sourceBlob,
                  contentModel: page.contentModel || 'document',
                },
                authorId: null,
              },
            });

            // 2. Write structured items, categories, links, and update page
            await writeStructuredPage(tx, page.id, splitResult, {
              reason: 'pre-migration',
              authorId: null,
            });

            // 3. Bump CmsState version
            await tx.cmsState.upsert({
              where: { id: 1 },
              create: { id: 1, version: 2 },
              update: { version: { increment: 1 } },
            });
          },
          { maxWait: 15000, timeout: 60000 }
        );

        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'structured',
          status: 'migrated',
          itemCounts,
          totalItems: splitResult.items.length,
          categoryCount: splitResult.categories.length,
          warnings,
          bytesBefore,
          bytesAfter,
          unknownArrayKeys,
        });

        console.log(
          `✅ [APPLIED] '${page.slug}' (Page ${page.id}): ` +
            `${splitResult.items.length} items (${Object.entries(itemCounts).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}), ` +
            `${splitResult.categories.length} categories, ${warnings.length} warnings. ` +
            `Size: ${bytesBefore}B -> ${bytesAfter}B`
        );
      } catch (applyErr: any) {
        totalErrorsCount++;
        console.error(`ERROR: Transaction failed for page '${page.slug}':`, applyErr);
        reportPages.push({
          id: page.id,
          slug: page.slug,
          classification: 'structured',
          status: 'failed',
          itemCounts,
          totalItems: splitResult.items.length,
          categoryCount: splitResult.categories.length,
          warnings,
          bytesBefore,
          bytesAfter,
          unknownArrayKeys,
          error: String(applyErr?.message || applyErr),
        });
      }
    } else {
      // Dry run
      reportPages.push({
        id: page.id,
        slug: page.slug,
        classification: 'structured',
        status: 'migrated',
        itemCounts,
        totalItems: splitResult.items.length,
        categoryCount: splitResult.categories.length,
        warnings,
        bytesBefore,
        bytesAfter,
        unknownArrayKeys,
      });

      console.log(
        `🔍 [DRY-RUN] '${page.slug}' (Page ${page.id}): ` +
          `${splitResult.items.length} items (${Object.entries(itemCounts).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}), ` +
          `${splitResult.categories.length} categories, ${warnings.length} warnings. ` +
          `Size: ${bytesBefore}B -> ${bytesAfter}B`
      );
    }
  }
}

  const report: MigrationReport = {
    mode,
    timestamp: new Date().toISOString(),
    totalPages: allPages.length,
    totals: {
      structured: structuredCount,
      document: documentCount,
      items: totalItemsCount,
      categories: totalCategoriesCount,
      warnings: totalWarningsCount,
      errors: totalErrorsCount,
    },
    pages: reportPages,
  };

  // Ensure output directory exists and write report
  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultOutputFile = path.join(outputDir, `migrate-page-items-${timestampStr}.json`);
  const finalOutputFile = options.outputPath || defaultOutputFile;

  fs.writeFileSync(finalOutputFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 Report written to: ${finalOutputFile}`);

  console.log(`\n================ Summary ================`);
  console.log(`Total Pages Processed : ${allPages.length}`);
  console.log(`Structured Pages      : ${structuredCount}`);
  console.log(`Document Pages        : ${documentCount}`);
  console.log(`Total Items           : ${totalItemsCount}`);
  console.log(`Total Categories      : ${totalCategoriesCount}`);
  console.log(`Total Warnings        : ${totalWarningsCount}`);
  console.log(`Total Errors          : ${totalErrorsCount}`);
  console.log(`=========================================\n`);

  return report;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  let mode: 'dry-run' | 'apply' | 'rollback' = 'dry-run';
  let force = false;
  let outputPath: string | undefined;
  const pages: string[] = [];

  for (const arg of args) {
    if (arg === '--apply') {
      mode = 'apply';
    } else if (arg === '--dry-run') {
      mode = 'dry-run';
    } else if (arg === '--rollback') {
      mode = 'rollback';
    } else if (arg === '--force') {
      force = true;
    } else if (arg.startsWith('--page=')) {
      const pageVal = arg.slice(7);
      for (const p of pageVal.split(',')) {
        if (p.trim()) pages.push(p.trim());
      }
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.slice(9).trim();
    }
  }

  runMigration({ mode, force, pages, outputPath })
    .then(report => {
      if (report.totals.errors > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}
