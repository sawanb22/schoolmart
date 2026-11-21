import fs from 'fs';
import path from 'path';
import prisma from '../../src/lib/prisma';

export const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/pages');

export interface PageFixture {
    title: string;
    slug: string;
    template: string | null;
    published: boolean;
    content: string | null;
    pageData: string | null;
}

export function loadPageFixture(slugOrFilename: string): PageFixture {
    const filename = slugOrFilename.endsWith('.json') ? slugOrFilename : `${slugOrFilename}.json`;
    const fullPath = path.join(FIXTURES_DIR, filename);
    const raw = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(raw);
}

export function loadAllPageFixtures(): PageFixture[] {
    const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'));
    return files.map((f) => loadPageFixture(f));
}

export async function seedPagesFromFixtures(fixtures?: PageFixture[]): Promise<void> {
    const items = fixtures || loadAllPageFixtures();
    for (const item of items) {
        await prisma.page.upsert({
            where: { slug: item.slug },
            update: {
                title: item.title,
                template: item.template,
                published: item.published,
                content: item.content,
                pageData: item.pageData,
            },
            create: {
                title: item.title,
                slug: item.slug,
                template: item.template,
                published: item.published,
                content: item.content,
                pageData: item.pageData,
            },
        });
    }
}
