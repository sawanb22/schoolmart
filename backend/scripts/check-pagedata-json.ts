import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { PrismaClient } from '@prisma/client';

if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
});

interface InvalidEntry {
    id: number;
    slug: string;
    title: string;
    error: string;
    rawSnippet: string;
}

async function checkPageDataJson() {
    try {
        console.log(`Connecting to database...`);
        // Mask db credentials in logs
        const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log(`Target database: ${maskedUrl}`);

        const pages = await prisma.page.findMany({
            select: {
                id: true,
                slug: true,
                title: true,
                pageData: true,
            },
            orderBy: { id: 'asc' },
        });

        const totalPages = pages.length;
        let nullCount = 0;
        let nonNullCount = 0;
        let validObjectCount = 0;
        const invalidEntries: InvalidEntry[] = [];

        for (const page of pages) {
            const raw = page.pageData;
            if (raw === null || raw === undefined) {
                nullCount++;
                continue;
            }

            nonNullCount++;

            if (typeof raw === 'object') {
                if (Array.isArray(raw)) {
                    invalidEntries.push({
                        id: page.id,
                        slug: page.slug,
                        title: page.title,
                        error: 'pageData is a JSON array, expected JSON object',
                        rawSnippet: JSON.stringify(raw).slice(0, 100),
                    });
                } else {
                    validObjectCount++;
                }
            } else if (typeof raw === 'string') {
                const trimmed = raw.trim();
                if (trimmed === '') {
                    // empty string treated as null or check if valid?
                    // In Postgres USING: CASE WHEN "pageData" IS NULL OR btrim("pageData") = '' THEN NULL ELSE ...
                    // Let's check how migration handles it: empty string becomes NULL.
                    // But is it valid JSON object?
                    invalidEntries.push({
                        id: page.id,
                        slug: page.slug,
                        title: page.title,
                        error: 'pageData is an empty string (whitespace only)',
                        rawSnippet: raw,
                    });
                    continue;
                }

                try {
                    const parsed = JSON.parse(trimmed);
                    if (typeof parsed !== 'object' || parsed === null) {
                        invalidEntries.push({
                            id: page.id,
                            slug: page.slug,
                            title: page.title,
                            error: `pageData parsed to primitive type: ${typeof parsed}`,
                            rawSnippet: trimmed.slice(0, 100),
                        });
                    } else if (Array.isArray(parsed)) {
                        invalidEntries.push({
                            id: page.id,
                            slug: page.slug,
                            title: page.title,
                            error: 'pageData parsed to array, expected object',
                            rawSnippet: trimmed.slice(0, 100),
                        });
                    } else {
                        validObjectCount++;
                    }
                } catch (err: any) {
                    invalidEntries.push({
                        id: page.id,
                        slug: page.slug,
                        title: page.title,
                        error: `JSON.parse failed: ${err.message}`,
                        rawSnippet: trimmed.slice(0, 100),
                    });
                }
            } else {
                invalidEntries.push({
                    id: page.id,
                    slug: page.slug,
                    title: page.title,
                    error: `Unexpected type for pageData: ${typeof raw}`,
                    rawSnippet: String(raw).slice(0, 100),
                });
            }
        }

        console.log('\n--- Preflight JSON Integrity Report ---');
        console.log(`Total pages:                ${totalPages}`);
        console.log(`Pages with null pageData:   ${nullCount}`);
        console.log(`Pages with non-null data:   ${nonNullCount}`);
        console.log(`Valid JSON object pages:    ${validObjectCount}`);
        console.log(`Invalid pages:              ${invalidEntries.length}`);

        if (invalidEntries.length > 0) {
            console.error('\nINVALID ENTRIES FOUND:');
            for (const item of invalidEntries) {
                console.error(`  - [ID ${item.id}] "${item.slug}" (${item.title}): ${item.error}`);
                console.error(`    Snippet: ${item.rawSnippet}`);
            }
            process.exit(1);
        } else {
            console.log('\nSUCCESS: All non-null pageData values parse as valid JSON objects!');
            process.exit(0);
        }
    } catch (err) {
        console.error('Fatal error during preflight check:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkPageDataJson();
