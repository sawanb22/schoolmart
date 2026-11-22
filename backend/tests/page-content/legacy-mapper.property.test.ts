import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  COLLECTIONS,
  CARD_COLLECTIONS,
  LIST_COLLECTIONS,
  DETAIL_KEYS,
  Collection,
} from '../../src/services/page-content/constants';
import {
  splitLegacyPageData,
  buildLegacyPageData,
  normalizeSlug,
} from '../../src/services/page-content/legacy-mapper';
import { assertLegacyEquivalent } from '../helpers/legacy-equivalence';

// Arbitrary for clean category string
const arbCategory = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,15}$/);

// Arbitrary for item object with random subsets of fields
const arbItem = fc.record(
  {
    title: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/), { nil: undefined }),
    question: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ?]{1,30}$/), { nil: undefined }),
    name: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/), { nil: undefined }),
    heading: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/), { nil: undefined }),
    label: fc.option(fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/), { nil: undefined }),
    slug: fc.option(fc.stringMatching(/^\/?[a-zA-Z0-9\-_/]{0,25}\/?$/), { nil: undefined }),
    description: fc.option(fc.stringMatching(/^[a-zA-Z0-9 .,!]{0,50}$/), { nil: undefined }),
    image: fc.option(fc.constant('https://images.unsplash.com/photo-test?w=500'), { nil: undefined }),
    href: fc.option(fc.stringMatching(/^\/[a-zA-Z0-9\-_/]{0,20}$/), { nil: undefined }),
    badge: fc.option(fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/), { nil: undefined }),
    category: fc.option(arbCategory, { nil: undefined }),
    categories: fc.option(fc.array(arbCategory, { minLength: 0, maxLength: 3 }), { nil: undefined }),
    body: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    detailContent: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    methodology: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    extraCustomKey: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
    extraNumberKey: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
    published: fc.option(fc.boolean(), { nil: undefined }),
  },
  { requiredKeys: [] }
);

// Arbitrary for random legacy page blob
const arbPageBlob = fc.record(
  {
    heroTitle: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    heroSubtitle: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: undefined }),
    styles: fc.option(fc.record({ background: fc.string(), theme: fc.string() }), { nil: undefined }),
    randomSettingsField: fc.option(fc.string({ maxLength: 40 }), { nil: undefined }),
    categories: fc.option(fc.array(arbCategory, { maxLength: 4 }), { nil: undefined }),
    featured: fc.option(arbItem, { nil: undefined }),
    cards: fc.option(fc.array(arbItem, { maxLength: 4 }), { nil: undefined }),
    section2Cards: fc.option(fc.array(arbItem, { maxLength: 3 }), { nil: undefined }),
    moreCards: fc.option(fc.array(arbItem, { maxLength: 3 }), { nil: undefined }),
    faqs: fc.option(fc.array(arbItem, { maxLength: 3 }), { nil: undefined }),
    openings: fc.option(fc.array(arbItem, { maxLength: 3 }), { nil: undefined }),
    caseStudies: fc.option(fc.array(arbItem, { maxLength: 3 }), { nil: undefined }),
  },
  { requiredKeys: [] }
);

describe('Legacy Mapper Property-Based Tests (fast-check, 200 runs each)', () => {
  it('P1: Round-trip equivalence between legacy blobs and rebuilt blobs (Invariant I4)', () => {
    fc.assert(
      fc.property(arbPageBlob, (blob) => {
        const split = splitLegacyPageData(blob as Record<string, unknown>);
        const rebuilt = buildLegacyPageData(
          split.settings,
          split.items,
          split.categories,
          { includeDetail: true }
        );
        assertLegacyEquivalent(blob, rebuilt);
      }),
      { numRuns: 200 }
    );
  });

  it('P2: Slug uniqueness - all generated slugs are non-empty, unique per page, and valid format', () => {
    fc.assert(
      fc.property(arbPageBlob, (blob) => {
        const split = splitLegacyPageData(blob as Record<string, unknown>);
        const seenSlugs = new Set<string>();

        for (const item of split.items) {
          // Slug must be non-empty string
          expect(typeof item.slug).toBe('string');
          expect(item.slug.length).toBeGreaterThan(0);

          // Slugs must be unique per page across all collections
          expect(seenSlugs.has(item.slug)).toBe(false);
          seenSlugs.add(item.slug);

          // Slug must match valid slug regex
          expect(item.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('P3: Determinism - splitLegacyPageData returns identical results on repeated calls', () => {
    fc.assert(
      fc.property(arbPageBlob, (blob) => {
        const result1 = splitLegacyPageData(blob as Record<string, unknown>);
        const result2 = splitLegacyPageData(blob as Record<string, unknown>);

        expect(result1).toEqual(result2);
      }),
      { numRuns: 200 }
    );
  });

  it('P4: Detail isolation - detail is {} for all LIST_COLLECTIONS items', () => {
    fc.assert(
      fc.property(arbPageBlob, (blob) => {
        const split = splitLegacyPageData(blob as Record<string, unknown>);

        for (const item of split.items) {
          if ((LIST_COLLECTIONS as readonly string[]).includes(item.collection)) {
            expect(item.detail).toEqual({});
          }
        }
      }),
      { numRuns: 200 }
    );
  });
});
