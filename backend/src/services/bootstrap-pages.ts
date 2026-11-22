import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parsePageData } from '../lib/page-data';

export const COLLEGE_SALE_SLUG = 'colleges-universities-for-sale';
export const COLLEGE_SALE_DATA = {
    heroTitle: 'Businesses for Sale and Investment',
    heroSubtitle: 'Showing businesses for sale and investment. Buy or invest in a business listed by direct business owners and business brokers.',
    filterLabel: 'cbse schools',
    cards: [
        { title: 'School for Sale in Bahraich, India', description: 'CBSE school with 800+ students, day and boarding facility for sale in Bahraich. The school encompasses a total area of 87,000 square feet and includes approximately 40 rooms, fully equipped science and computer labs.', location: 'Bahraich', rating: '6.8', sales: 'INR 2.6 crore', margin: '40 %', askingPrice: 'INR 20 Cr', premium: true, image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=700&q=80' },
        { title: 'Playschool Seeking Loan in Haryana, India', description: 'Education society in Haryana with 5 CBSE schools and 70 playschools. This is an educational society with primary and play schools seeking growth funding.', location: 'Haryana', rating: '6.8', sales: 'INR 30 crore', margin: '25 %', askingPrice: 'INR 5 Cr at 15%', premium: true, image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=700&q=80' },
        { title: 'School for Sale in Thiruvananthapuram, India', description: 'CBSE-affiliated school with 400+ students and owned facilities. Located in Thiruvananthapuram, this school offers quality education from a well-established campus.', location: 'Thiruvananthapuram', rating: '6.2', sales: 'INR 1.6 crore', margin: '10 - 20 %', askingPrice: 'INR 8 Cr', image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=700&q=80' },
    ],
};

export const PARTNER_SLUG = 'partner-with-colleges';
export const JOB_OPENINGS_SLUG = 'job-openings';

export function createEmptyArticlePageData(title: string) {
    return {
        category: '',
        heroTitle: title || '',
        heroImage: '',
        body: '',
        ctaTitle: '',
        ctaSubtitle: '',
        ctaButtonLabel: '',
        ctaHref: '/contact-us',
        hideHero: false,
        hideBody: false,
        hideCta: true,
    };
}

export const ARTICLE_PAGE_SLUGS = new Set([
    'how-it-works',
    'brand-help',
    'sell-on-schoolmart',
    'sell-on-campusmart',
    '20-stunning-college-buildings',
    'academic-buildings',
    'research-facilities',
    'student-life-centers',
    'privacy-policy',
    'terms-of-use',
    'payment-policy',
    'replacement-return',
    'order-rejection',
]);

export const requiredDefaults: [string, string][] = [
    ['science-tech-labs', 'Science & Tech Labs'],
    ['campus-master-planning', 'Campus Master Planning'],
    ['ar-vr-experiences', 'AR / VR Learning'],
    ['campus-furniture-design', 'Campus Furniture Design'],
    ['collaboration-spaces', 'Collaboration Spaces'],
    ['contact-us', 'Contact Us'],
    ['catalogues', 'Catalogues & Downloads'],
    ['faq', 'Frequently Asked Questions'],
    ['how-it-works', 'How It Works'],
    ['brand-help', 'Brand Help'],
    ['sell-on-schoolmart', 'Sell on SchoolMart'],
    ['sell-on-campusmart', 'Sell on CampusMart'],
    ['20-stunning-college-buildings', '20 Stunning College Buildings'],
    ['academic-buildings', 'Academic Buildings'],
    ['research-facilities', 'Research Facilities'],
    ['student-life-centers', 'Student Life Centers'],
    ['privacy-policy', 'Privacy Policy'],
    ['terms-of-use', 'Terms of Use'],
    ['payment-policy', 'Payment Policy'],
    ['replacement-return', 'Replacement & Return Policy'],
    ['order-rejection', 'Order Rejection Policy'],
    ['home', 'Homepage'],
    ['campus-design', 'Campus Design'],
    ['campus-design-execution', 'Campus Design & Execution'],
    ['ai-guide', 'AI Implementation Guide'],
    ['setup-college', 'Setup Your College'],
    ['ugc-guidelines', 'UGC Guidelines'],
    ['innovation', 'Innovation'],
    ['resources', 'Resources & Guides'],
    ['collaboration', 'Collaboration Spaces'],
];

async function safeCreatePage(data: {
    title: string;
    slug: string;
    template: string;
    published: boolean;
    pageData: Prisma.InputJsonValue;
}): Promise<'created' | 'existed'> {
    try {
        await prisma.page.create({ data });
        return 'created';
    } catch (err: any) {
        if (err?.code === 'P2002') {
            await prisma.page.findUnique({ where: { slug: data.slug } });
            return 'existed';
        }
        throw err;
    }
}

export async function bootstrapPages(): Promise<{ created: string[]; updated: string[] }> {
    const created: string[] = [];
    const updated: string[] = [];

    const existingPages = await prisma.page.findMany();
    const pageMap = new Map(existingPages.map((p) => [p.slug, p]));

    // 1. College Sale Page
    if (!pageMap.has(COLLEGE_SALE_SLUG)) {
        const res = await safeCreatePage({
            title: 'Colleges / Universities for Sale',
            slug: COLLEGE_SALE_SLUG,
            template: COLLEGE_SALE_SLUG,
            published: true,
            pageData: COLLEGE_SALE_DATA,
        });
        if (res === 'created') created.push(COLLEGE_SALE_SLUG);
    }

    // 2. Partner Page
    if (!pageMap.has(PARTNER_SLUG)) {
        const res = await safeCreatePage({
            title: 'Partner With Running Colleges',
            slug: PARTNER_SLUG,
            template: PARTNER_SLUG,
            published: true,
            pageData: {},
        });
        if (res === 'created') created.push(PARTNER_SLUG);
    }

    // 3. Job Openings Page
    if (!pageMap.has(JOB_OPENINGS_SLUG)) {
        const res = await safeCreatePage({
            title: 'Job Openings',
            slug: JOB_OPENINGS_SLUG,
            template: JOB_OPENINGS_SLUG,
            published: true,
            pageData: {},
        });
        if (res === 'created') created.push(JOB_OPENINGS_SLUG);
    }

    // 4. Partnership Enquiry Page
    if (!pageMap.has('partnership')) {
        const res = await safeCreatePage({
            title: 'Partnership Enquiry',
            slug: 'partnership',
            template: 'partnership',
            published: true,
            pageData: {},
        });
        if (res === 'created') created.push('partnership');
    }

    // 5. Required Defaults
    for (const [slug, title] of requiredDefaults) {
        const existing = pageMap.get(slug);
        const isArticle = ARTICLE_PAGE_SLUGS.has(slug);

        if (!existing) {
            const res = await safeCreatePage({
                title,
                slug,
                template: isArticle ? 'article' : slug,
                published: true,
                pageData: isArticle
                    ? createEmptyArticlePageData(title)
                    : {},
            });
            if (res === 'created') created.push(slug);
        } else if (isArticle) {
            let needsUpdate = false;
            const updateData: Record<string, any> = {};

            if (existing.template !== 'article') {
                updateData.template = 'article';
                needsUpdate = true;
            }

            const currentData = parsePageData(existing.pageData);

            if (Object.keys(currentData).length === 0) {
                updateData.pageData = createEmptyArticlePageData(existing.title || title);
                needsUpdate = true;
            } else if (!currentData.body && Array.isArray(currentData.sections) && currentData.sections.length > 0) {
                const parts: string[] = [];
                if (currentData.heroSubtitle) {
                    parts.push(`<p><strong>${currentData.heroSubtitle}</strong></p>`);
                }
                for (const s of currentData.sections as any[]) {
                    if (!s || s.active === false) continue;
                    if (s.heading) parts.push(`<h3>${s.heading}</h3>`);
                    if (s.body) parts.push(`<p>${s.body}</p>`);
                    if (Array.isArray(s.bullets) && s.bullets.length > 0) {
                        parts.push(`<ul>${s.bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>`);
                    }
                }
                const cleanArticleData = {
                    category: currentData.category || currentData.heroEyebrow || '',
                    heroTitle: currentData.heroTitle || currentData.title || existing.title || title || '',
                    heroImage: currentData.heroImage || currentData.featuredImage || '',
                    body: parts.join('\n'),
                    ctaTitle: currentData.ctaTitle || '',
                    ctaSubtitle: currentData.ctaSubtitle || '',
                    ctaButtonLabel: currentData.ctaButtonLabel || '',
                    ctaHref: currentData.ctaHref || '/contact-us',
                    hideHero: Boolean(currentData.hideHero),
                    hideBody: Boolean(currentData.hideBody),
                    hideCta: currentData.hideCta !== undefined ? Boolean(currentData.hideCta) : !currentData.ctaTitle,
                };
                updateData.pageData = cleanArticleData;
                needsUpdate = true;
            }

            if (needsUpdate) {
                try {
                    await prisma.page.update({
                        where: { slug },
                        data: updateData,
                    });
                    updated.push(slug);
                } catch (err) {
                    console.warn(`Failed to update page ${slug} to article template:`, err);
                }
            }
        }
    }

    return {
        created: Array.from(new Set(created)),
        updated: Array.from(new Set(updated)),
    };
}
