import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { UPLOADS_DIR } from '../src/lib/uploads-dir';

interface AuditResult {
    totalScanned: number;
    hostnames: Record<string, number>;
    uploadsFound: {
        total: number;
        existingOnDisk: number;
        missingOnDisk: number;
        missingFiles: Array<{
            source: string;
            url: string;
            expectedPath: string;
        }>;
        existingFiles: string[];
    };
    sportsurfUrls: Array<{
        source: string;
        url: string;
    }>;
}

function extractUrlsFromValue(value: unknown, source: string, urls: Array<{ source: string; url: string }>): void {
    if (!value) return;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        // Check if string is JSON (e.g. Product.images, SiteContent.value)
        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            try {
                const parsed = JSON.parse(trimmed);
                extractUrlsFromValue(parsed, source, urls);
                return;
            } catch {
                // not JSON, fall through
            }
        }

        const cleanUrl = trimmed.replace(/^["'\[]+|["'\]]+$/g, '').trim();

        // Check if string is or contains a URL or /uploads/ path
        if (
            cleanUrl.startsWith('http://') ||
            cleanUrl.startsWith('https://') ||
            cleanUrl.includes('/uploads/') ||
            cleanUrl.startsWith('data:') ||
            cleanUrl.startsWith('blob:')
        ) {
            urls.push({ source, url: cleanUrl });
        }
        return;
    }

    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            extractUrlsFromValue(value[i], `${source}[${i}]`, urls);
        }
        return;
    }

    if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            extractUrlsFromValue(v, `${source}.${k}`, urls);
        }
    }
}

export async function runMediaAudit(): Promise<AuditResult> {
    console.log(`[audit-media-urls] Starting audit against UPLOADS_DIR: ${UPLOADS_DIR}`);
    console.log(`[audit-media-urls] Checking directory exists: ${fs.existsSync(UPLOADS_DIR)}`);

    const extracted: Array<{ source: string; url: string }> = [];

    // 1. Pages (pageData JSON)
    const pages = await prisma.page.findMany({ select: { slug: true, pageData: true } });
    for (const page of pages) {
        extractUrlsFromValue(page.pageData, `Page(${page.slug}).pageData`, extracted);
    }

    // 2. PageItems (data, detail, imageUrl)
    const items = await prisma.pageItem.findMany({
        select: { id: true, pageId: true, slug: true, imageUrl: true, data: true, detail: true }
    });
    for (const item of items) {
        if (item.imageUrl) {
            extracted.push({ source: `PageItem(${item.id}, ${item.slug}).imageUrl`, url: item.imageUrl });
        }
        extractUrlsFromValue(item.data, `PageItem(${item.id}, ${item.slug}).data`, extracted);
        extractUrlsFromValue(item.detail, `PageItem(${item.id}, ${item.slug}).detail`, extracted);
    }

    // 3. SiteContent (value)
    const siteContents = await prisma.siteContent.findMany({ select: { key: true, value: true } });
    for (const sc of siteContents) {
        extractUrlsFromValue(sc.value, `SiteContent(${sc.key}).value`, extracted);
    }

    // 4. Products (imageUrl, images)
    const products = await prisma.product.findMany({ select: { id: true, slug: true, imageUrl: true, images: true } });
    for (const prod of products) {
        if (prod.imageUrl) {
            extracted.push({ source: `Product(${prod.id}, ${prod.slug}).imageUrl`, url: prod.imageUrl });
        }
        if (prod.images) {
            extractUrlsFromValue(prod.images, `Product(${prod.id}, ${prod.slug}).images`, extracted);
        }
    }

    // 5. BlogPosts (imageUrl)
    const blogPosts = await prisma.blogPost.findMany({ select: { id: true, slug: true, imageUrl: true } });
    for (const post of blogPosts) {
        if (post.imageUrl) {
            extracted.push({ source: `BlogPost(${post.id}, ${post.slug}).imageUrl`, url: post.imageUrl });
        }
    }

    // 6. CaseStudies (imageUrl)
    const caseStudies = await prisma.caseStudy.findMany({ select: { id: true, slug: true, imageUrl: true } });
    for (const cs of caseStudies) {
        if (cs.imageUrl) {
            extracted.push({ source: `CaseStudy(${cs.id}, ${cs.slug}).imageUrl`, url: cs.imageUrl });
        }
    }

    // 7. Catalogues (fileUrl, thumbnailUrl)
    const catalogues = await prisma.catalogue.findMany({ select: { id: true, fileUrl: true, thumbnailUrl: true } });
    for (const cat of catalogues) {
        if (cat.fileUrl) {
            extracted.push({ source: `Catalogue(${cat.id}).fileUrl`, url: cat.fileUrl });
        }
        if (cat.thumbnailUrl) {
            extracted.push({ source: `Catalogue(${cat.id}).thumbnailUrl`, url: cat.thumbnailUrl });
        }
    }

    // Analyze extracted URLs
    const result: AuditResult = {
        totalScanned: extracted.length,
        hostnames: {},
        uploadsFound: {
            total: 0,
            existingOnDisk: 0,
            missingOnDisk: 0,
            missingFiles: [],
            existingFiles: []
        },
        sportsurfUrls: []
    };

    const seenUploads = new Set<string>();

    for (const { source, url } of extracted) {
        // Check for sportsurf.in
        if (url.includes('sportsurf.in')) {
            result.sportsurfUrls.push({ source, url });
        }

        // Check if it's an upload path (either relative /uploads/... or http(s)://.../uploads/...)
        if (url.includes('/uploads/')) {
            result.uploadsFound.total++;
            const uploadIdx = url.indexOf('/uploads/');
            const relSubPath = url.substring(uploadIdx + '/uploads/'.length); // e.g. "media/1791660943402-382732975.jpg"
            const cleanRel = relSubPath.split('?')[0].split('#')[0].replace(/["'\]]+$/, '');
            const decodedSubPath = decodeURIComponent(cleanRel);
            const targetFilePath = path.join(UPLOADS_DIR, decodedSubPath);

            const hostKey = 'relative (/uploads/)';
            result.hostnames[hostKey] = (result.hostnames[hostKey] || 0) + 1;

            if (fs.existsSync(targetFilePath)) {
                result.uploadsFound.existingOnDisk++;
                seenUploads.add(decodedSubPath);
            } else {
                result.uploadsFound.missingOnDisk++;
                result.uploadsFound.missingFiles.push({
                    source,
                    url,
                    expectedPath: targetFilePath
                });
            }
            continue;
        }

        // Parse hostname for remote URLs
        try {
            if (/^https?:\/\//i.test(url)) {
                const parsed = new URL(url);
                result.hostnames[parsed.hostname] = (result.hostnames[parsed.hostname] || 0) + 1;
            } else if (url.startsWith('data:')) {
                result.hostnames['data: URI'] = (result.hostnames['data: URI'] || 0) + 1;
            } else if (url.startsWith('blob:')) {
                result.hostnames['blob: URI'] = (result.hostnames['blob: URI'] || 0) + 1;
            } else {
                result.hostnames['other relative / unknown'] = (result.hostnames['other relative / unknown'] || 0) + 1;
            }
        } catch {
            result.hostnames['unparseable'] = (result.hostnames['unparseable'] || 0) + 1;
        }
    }

    result.uploadsFound.existingFiles = Array.from(seenUploads);
    return result;
}

if (require.main === module) {
    runMediaAudit()
        .then((res) => {
            console.log('\n================ MEDIA URL AUDIT REPORT ================');
            console.log(`Total URLs / media entries scanned: ${res.totalScanned}`);
            console.log('\nBreakdown by Hostname / Source:');
            for (const [host, count] of Object.entries(res.hostnames).sort((a, b) => b[1] - a[1])) {
                console.log(`  - ${host.padEnd(35)} : ${count}`);
            }

            console.log('\nUploads on Disk (/uploads/):');
            console.log(`  Total upload references       : ${res.uploadsFound.total}`);
            console.log(`  Existing files on disk        : ${res.uploadsFound.existingOnDisk}`);
            console.log(`  Missing files on disk         : ${res.uploadsFound.missingOnDisk}`);

            if (res.uploadsFound.missingFiles.length > 0) {
                console.log('\n[WARNING] Missing Upload Files:');
                for (const m of res.uploadsFound.missingFiles) {
                    console.log(`  - [${m.source}] ${m.url} -> expected at: ${m.expectedPath}`);
                }
            } else {
                console.log('\n[SUCCESS] All referenced /uploads/ files exist in UPLOADS_DIR!');
            }

            if (res.sportsurfUrls.length > 0) {
                console.log(`\nFound ${res.sportsurfUrls.length} references mentioning sportsurf.in:`);
                for (const s of res.sportsurfUrls) {
                    console.log(`  - [${s.source}] ${s.url}`);
                }
            }

            console.log('========================================================\n');
        })
        .catch((err) => {
            console.error('[audit-media-urls] Failed:', err);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
