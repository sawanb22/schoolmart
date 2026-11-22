import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

const TARGET_SLUGS = [
    'labs',
    'ai-ml',
    'campus-master-planning',
    'campus-design-execution',
    'faq',
    'job-openings',
    'catalogues',
    'colleges-universities-for-sale',
    'sports-infra',
    'libraries',
    'tech-infra',
    'privacy-policy',
];

const CANONICAL_SEED_DATA: Record<string, any> = {
    'ai-ml': {
        title: 'AI & ML Labs',
        slug: 'ai-ml',
        template: 'ai-ml',
        published: true,
        content: null,
        pageData: JSON.stringify({
            heroTitle: 'AI & Machine Learning',
            heroSubtitle: 'Cutting-edge AI and ML solutions for educational institutions. Prepare students for the future with hands-on learning experiences.',
            heroImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
            section1Title: 'AI/ML Solutions',
            section2Title: 'Future-Ready Education',
            cards: [
                { title: 'AI Learning Stations', description: 'Interactive AI-powered learning environments' },
                { title: 'ML Labs', description: 'Machine learning experimentation setups' },
                { title: 'Coding Platforms', description: 'Programming and development environments' },
                { title: 'Computing Infrastructure', description: 'High-performance computing solutions' },
            ],
        }),
    },
    'tech-infra': {
        title: 'Tech Infrastructure',
        slug: 'tech-infra',
        template: 'tech-infra',
        published: true,
        content: null,
        pageData: JSON.stringify({
            heroTitle: 'Technology Infrastructure',
            heroSubtitle: 'Future-proof your campus with cutting-edge technology infrastructure. From high-speed networks to smart classrooms, we build the digital backbone of modern education.',
            heroImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
            section1Title: 'Technology Solutions',
            cards: [
                { title: 'Network Infrastructure', description: 'High-speed campus-wide Wi-Fi and LAN systems', image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
                { title: 'Smart Classrooms', description: 'Interactive boards, projectors, and AV systems', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
                { title: 'Data Centers', description: 'Campus servers, cloud integration and data management', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
                { title: 'Security Systems', description: 'CCTV surveillance, access control and safety systems', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
            ],
        }),
    },
};

async function main() {
    console.log('Connecting to dev database...');
    const allPages = await prisma.page.findMany({
        select: {
            id: true,
            title: true,
            slug: true,
            template: true,
            published: true,
            content: true,
            pageData: true,
        },
    });

    console.log(`Found ${allPages.length} total pages in database.`);
    const pageMap = new Map(allPages.map(p => [p.slug, p]));

    // Find prefixed pages: guide-, environment-, resource-
    const prefixPages = allPages.filter(p =>
        (p.slug.startsWith('guide-') || p.slug.startsWith('environment-') || p.slug.startsWith('resource-')) && p.published
    );
    console.log(`Found ${prefixPages.length} published prefix pages:`, prefixPages.map(p => p.slug));

    const exportSlugs = [...TARGET_SLUGS];
    // Export one guide- and one resource-
    const guidePage = prefixPages.find(p => p.slug.startsWith('guide-'));
    if (guidePage && !exportSlugs.includes(guidePage.slug)) {
        exportSlugs.push(guidePage.slug);
    }
    const resourcePage = prefixPages.find(p => p.slug.startsWith('resource-'));
    if (resourcePage && !exportSlugs.includes(resourcePage.slug)) {
        exportSlugs.push(resourcePage.slug);
    }

    const outDir = path.resolve(__dirname, '../tests/fixtures/pages');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    for (const slug of exportSlugs) {
        let fixture = null;
        const page = pageMap.get(slug);

        if (page) {
            fixture = {
                title: page.title,
                slug: page.slug,
                template: page.template,
                published: page.published,
                content: page.content,
                pageData: page.pageData !== null ? String(page.pageData) : null,
            };
        } else if (CANONICAL_SEED_DATA[slug]) {
            console.log(`Using canonical seed fixture for "${slug}"`);
            fixture = CANONICAL_SEED_DATA[slug];
        } else {
            console.warn(`Warning: Page slug "${slug}" not found in database or seed defaults!`);
            continue;
        }

        const targetFile = path.join(outDir, `${slug}.json`);
        fs.writeFileSync(targetFile, JSON.stringify(fixture, null, 2), 'utf8');
        console.log(`Exported fixture: ${slug} -> ${targetFile}`);
    }

    console.log('Export completed.');
}

main()
    .catch(err => {
        console.error('Export failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
