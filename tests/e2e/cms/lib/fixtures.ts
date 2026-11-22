/**
 * Baseline hub content, mirroring the shape of the real hub pages:
 *  - labs         template solution-hub, 3 categories, 3 cards (one category each)
 *  - libraries    template solution-hub, 7 categories, 7 cards
 *  - sports-infra template solution-hub, 5 categories, 5 cards
 *  - tech-infra   template tech-infra, no categories, 4 cards with categories null
 * Pages are stored as contentModel "document" with the whole blob in pageData.
 */
import { HUB_SLUGS, slugify, type HubSlug } from './env';
import type { Prisma } from './db';

interface HubSeed {
  title: string;
  template: string;
  categories: string[] | null;
  cardTitles: string[];
}

const HUB_SEEDS: Record<HubSlug, HubSeed> = {
  labs: {
    title: 'Composite & Skill Labs',
    template: 'solution-hub',
    categories: ['COMPUTER LAB', 'COMPOSITE SKILLS LAB', 'STEM LAB'],
    cardTitles: ['Baseline Computer Lab', 'Baseline Composite Skills Lab', 'Baseline STEM Lab'],
  },
  libraries: {
    title: 'Smart Libraries',
    template: 'solution-hub',
    categories: ['Reading Rooms', 'Digital Library', 'Archive', 'Children Section', 'Study Pods', 'Makerspace', 'Periodicals'],
    cardTitles: [
      'Baseline Reading Room',
      'Baseline Digital Library',
      'Baseline Archive',
      'Baseline Children Section',
      'Baseline Study Pods',
      'Baseline Makerspace',
      'Baseline Periodicals',
    ],
  },
  'sports-infra': {
    title: 'Sports Infrastructure',
    template: 'solution-hub',
    categories: ['Indoor Courts', 'Outdoor Fields', 'Athletics Tracks', 'Aquatics', 'Fitness'],
    cardTitles: [
      'Baseline Indoor Court',
      'Baseline Outdoor Field',
      'Baseline Athletics Track',
      'Baseline Aquatics Centre',
      'Baseline Fitness Zone',
    ],
  },
  'tech-infra': {
    title: 'Tech Infrastructure',
    template: 'tech-infra',
    categories: null,
    cardTitles: ['Baseline Smart Board', 'Baseline Campus Wi-Fi', 'Baseline Server Room', 'Baseline CCTV'],
  },
};

export function buildHubBlob(slug: HubSlug): Record<string, any> {
  const seed = HUB_SEEDS[slug];
  const cards = seed.cardTitles.map((title, i) => ({
    title,
    slug: slugify(title),
    description: `${title} short description`,
    image: '',
    href: '',
    categories: seed.categories ? [seed.categories[i % seed.categories.length]] : null,
  }));
  const blob: Record<string, any> = {
    template: seed.template,
    heroTitle: seed.title,
    heroSubtitle: `${seed.title} baseline subtitle`,
    section1Title: `${seed.title} solutions`,
    cards,
  };
  if (seed.categories) blob.categories = [...seed.categories];
  return blob;
}

/** Creates every hub page that does not exist yet. Returns the slugs it created. */
export async function seedHubs(prisma: Prisma): Promise<string[]> {
  const created: string[] = [];
  for (const slug of HUB_SLUGS) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) continue;
    const seed = HUB_SEEDS[slug];
    await prisma.page.create({
      data: {
        slug,
        title: seed.title,
        template: seed.template,
        published: true,
        contentModel: 'document',
        pageData: buildHubBlob(slug),
      },
    });
    created.push(slug);
  }
  return created;
}
