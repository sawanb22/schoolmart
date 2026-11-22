import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { parsePageData } from '../lib/page-data';
import { CARD_COLLECTIONS } from './page-content/constants';

let sitemapTimer: NodeJS.Timeout | null = null;

/**
 * Escapes special XML characters in string.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates sitemap.xml content from database pages and structured items.
 */
export async function generateSitemapXml(): Promise<string> {
  const siteUrl = (process.env.SITE_URL || 'https://schoolmart.in').trim().replace(/\/+$/, '');

  // 1. Fetch published pages
  const pages = await prisma.page.findMany({
    where: { published: true },
    select: {
      id: true,
      slug: true,
      contentModel: true,
      pageData: true,
      updatedAt: true,
    },
    orderBy: { slug: 'asc' },
  });

  // Filter eligible pages
  const eligiblePages: Array<{
    id: number;
    slug: string;
    contentModel: string;
    updatedAt: Date;
  }> = [];

  const eligiblePageIdMap = new Map<number, string>();

  for (const page of pages) {
    const slug = (page.slug || '').trim();
    const lowerSlug = slug.toLowerCase();

    // Exclude home, test-*, draft-*
    if (!slug || lowerSlug === 'home' || lowerSlug.startsWith('test-') || lowerSlug.startsWith('draft-')) {
      continue;
    }

    // Check noindex in pageData
    const data = parsePageData(page.pageData);
    const isNoindex = Boolean(
      data.noindex === true ||
      (data.settings && typeof data.settings === 'object' && (data.settings as any).noindex === true) ||
      (data.seo && typeof data.seo === 'object' && (data.seo as any).noindex === true)
    );

    if (isNoindex) {
      continue;
    }

    eligiblePages.push({
      id: page.id,
      slug,
      contentModel: page.contentModel,
      updatedAt: page.updatedAt,
    });

    if (page.contentModel === 'structured') {
      eligiblePageIdMap.set(page.id, slug);
    }
  }

  // 2. Fetch published items in CARD_COLLECTIONS for structured pages
  const items = await prisma.pageItem.findMany({
    where: {
      published: true,
      collection: { in: Array.from(CARD_COLLECTIONS) },
      page: {
        published: true,
        contentModel: 'structured',
      },
      slug: { not: '' },
    },
    select: {
      id: true,
      pageId: true,
      slug: true,
      data: true,
      updatedAt: true,
    },
    orderBy: [{ pageId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  });

  const eligibleItems: Array<{
    hubSlug: string;
    itemSlug: string;
    updatedAt: Date;
  }> = [];

  for (const item of items) {
    const hubSlug = eligiblePageIdMap.get(item.pageId);
    if (!hubSlug) continue; // Parent page was excluded

    const itemSlug = (item.slug || '').trim();
    const lowerItemSlug = itemSlug.toLowerCase();

    if (!itemSlug || lowerItemSlug.startsWith('test-') || lowerItemSlug.startsWith('draft-')) {
      continue;
    }

    // Check item data.seo?.noindex
    const itemData = (item.data && typeof item.data === 'object' ? item.data : {}) as Record<string, unknown>;
    const itemSeo = (itemData.seo && typeof itemData.seo === 'object' ? itemData.seo : {}) as Record<string, unknown>;
    if (itemSeo.noindex === true) {
      continue;
    }

    eligibleItems.push({
      hubSlug,
      itemSlug,
      updatedAt: item.updatedAt,
    });
  }

  // 3. Build XML
  const urls: string[] = [];

  // Root URL
  urls.push(`  <url>\n    <loc>${escapeXml(siteUrl)}/</loc>\n  </url>`);

  // Page URLs
  for (const page of eligiblePages) {
    const loc = `${siteUrl}/${page.slug.replace(/^\/+/, '')}`;
    const lastmod = page.updatedAt.toISOString().split('T')[0];
    urls.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`);
  }

  // Item URLs
  for (const item of eligibleItems) {
    const loc = `${siteUrl}/${item.hubSlug.replace(/^\/+/, '')}/${item.itemSlug.replace(/^\/+/, '')}`;
    const lastmod = item.updatedAt.toISOString().split('T')[0];
    urls.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/**
 * Atomically writes sitemap.xml to destination path by writing to a temporary file
 * and renaming it into place. Never throws.
 */
export async function writeSitemapFileAtomic(destPath?: string): Promise<boolean> {
  const targetPath = destPath || process.env.SITEMAP_WRITE_PATH;
  if (!targetPath) return false;

  let tempPath: string | null = null;
  try {
    const xml = await generateSitemapXml();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempPath, xml, 'utf8');
    fs.renameSync(tempPath, targetPath);
    console.log(`[Sitemap] Atomically wrote sitemap to ${targetPath}`);
    return true;
  } catch (err) {
    console.warn(`[Sitemap] Failed to write atomic sitemap to ${targetPath}:`, err);
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup failure
      }
    }
    return false;
  }
}

/**
 * Cancels any pending debounced sitemap generation timer.
 */
export function cancelPendingSitemapSync(): void {
  if (sitemapTimer) {
    clearTimeout(sitemapTimer);
    sitemapTimer = null;
  }
}

/**
 * Schedules debounced atomic sitemap file sync.
 */
export function scheduleSitemapSync(delayMs = 10000): void {
  if (!process.env.SITEMAP_WRITE_PATH) return;

  if (sitemapTimer) {
    clearTimeout(sitemapTimer);
  }

  sitemapTimer = setTimeout(() => {
    sitemapTimer = null;
    writeSitemapFileAtomic().catch((err) => {
      console.warn('[Sitemap] Debounced sitemap write warning:', err);
    });
  }, delayMs);

  if (sitemapTimer && typeof sitemapTimer.unref === 'function') {
    sitemapTimer.unref();
  }
}
