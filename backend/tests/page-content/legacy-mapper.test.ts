import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  slugify,
  normalizeSlug,
  classifyPage,
  splitLegacyPageData,
  buildLegacyPageData,
} from '../../src/services/page-content/legacy-mapper';
import { assertLegacyEquivalent } from '../helpers/legacy-equivalence';

// Reference algorithm from frontend/src/components/cms/ServiceDetailPage.tsx:16-23
function frontendReferenceSlugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

describe('Legacy Mapper Unit & Edge Fixture Tests', () => {
  describe('slugify parity with frontend algorithm', () => {
    const samples = [
      'Simple Title',
      'UPPERCASE STRING',
      'lowercase string',
      'MixedCaseWithWords',
      '   leading and trailing spaces   ',
      'multiple   spaces   between   words',
      'Phase 01: Planning & Feasibility / 2026!',
      '---Leading & Trailing---',
      'Special Characters: @#$%^&*()',
      'Brackets [and] {braces} and (parentheses)',
      'Quotes "double" and \'single\'',
      'Punctuation, dots... and commas, colons: semicolons;',
      'Question? Marks! And Slashing / Path\\Segments',
      'Under_scores_and-hyphens-mixed_together',
      'Numbers 123 456 7890',
      'Alphanumeric a1b2c3d4e5f6',
      'Robotics & AI Advanced Research Laboratory',
      'Sports & Gymnasium Infrastructure Design',
      'STEM / STEAM Innovation Workspace',
      'Composite Skill & Vocational Lab',
      'IoT & Embedded Systems Hub',
      'Interactive Smart Boards & Digital Panels',
      'K-12 Primary School Physical Education Facility',
      'Daylight Optimization & Acoustic Classroom Walls',
      'High-Speed Campus WiFi & Networking 6E',
      'Colleges & Universities for Sale / Acquisition',
      'Pre-School & Daycare Furniture Setup',
      '3D Printing & Rapid Prototyping Workshop',
      'Clean Room Class 10000 Compliance',
      'HVAC & Environmental Control Setup',
      'Biotechnology & Microbiology Testing Facility',
      'Chemistry Fume Hoods & Acid Storage Units',
      'Math Lab & Geometry Manipulative Kits',
      'Augmented Reality (AR) & Virtual Reality (VR) Classroom',
      'Cafeteria & Dining Hall Turnkey Execution',
      'Auditorium Acoustics & Line-Array Audio System',
      'Library Automation & RFID Tracking Kiosks',
      'Campus Security & CCTV Surveillance Operations',
      'Solar Rooftop Grid & Battery Backup Management',
      'Student Hostel Furniture & Bunk Bed Planning',
      'Playground Turf & Multi-Sport Synthetic Court',
      '100% Turnkey Campus Design & Execution',
      '99.9% Server Uptime Service Level Agreement',
      'A / B / C Testing & Evaluation Metrics',
      'Single-word',
      'a',
      '1',
      '-',
      '---',
      '   ',
    ];

    it('matches frontend slugify byte-for-byte across all 50 sample strings', () => {
      expect(samples.length).toBeGreaterThanOrEqual(50);
      for (const sample of samples) {
        const expected = frontendReferenceSlugify(sample);
        const actual = slugify(sample);
        expect(actual).toBe(expected);
      }
    });

    it('handles null, undefined, empty, and numeric types gracefully', () => {
      expect(slugify('')).toBe('');
      expect(slugify(null)).toBe('');
      expect(slugify(undefined)).toBe('');
      expect(slugify(12345)).toBe('12345');
    });

    it('normalizeSlug trims, lowercases, and extracts last path segment correctly', () => {
      expect(normalizeSlug('/labs/smart-lab/')).toBe('smart-lab');
      expect(normalizeSlug('foo/bar/baz')).toBe('baz');
      expect(normalizeSlug('simple-slug')).toBe('simple-slug');
      expect(normalizeSlug('///')).toBe('');
      expect(normalizeSlug(null)).toBe('');
      expect(normalizeSlug(undefined)).toBe('');
    });
  });

  describe('Edge Fixtures from T2', () => {
    const fixturesDir = path.resolve(__dirname, '../fixtures/pages');

    const readFixture = (name: string): any => {
      const filePath = path.join(fixturesDir, name);
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    };

    it('edge-duplicate-titles: disambiguates duplicate titles and logs warnings', () => {
      const fixture = readFixture('edge-duplicate-titles.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(2);
      expect(split.items[0].slug).toBe('robotics-lab');
      expect(split.items[1].slug).toBe('robotics-lab-2');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-no-card-slugs: generates valid non-empty slugs from titles', () => {
      const fixture = readFixture('edge-no-card-slugs.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(2);
      expect(split.items[0].slug).toBe('advanced-physics-studio');
      expect(split.items[1].slug).toBe('bio-research-facility');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-category-mix: unifies category string and categories array into categories array', () => {
      const fixture = readFixture('edge-category-mix.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(2);
      expect(split.items[0].categoryNames).toEqual(['Robotics']);
      expect(split.items[1].categoryNames).toEqual(['Robotics', 'AI', 'Innovation']);

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-section2-only: parses section2Cards collection accurately', () => {
      const fixture = readFixture('edge-section2-only.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(2);
      expect(split.items[0].collection).toBe('section2Cards');
      expect(split.items[0].title).toBe('Specialized Testing Unit');
      expect(split.items[1].collection).toBe('section2Cards');
      expect(split.items[1].title).toBe('Sensor Calibration Station');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-featured-duplicate: parses both featured and cards without dropped fields', () => {
      const fixture = readFixture('edge-featured-duplicate.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(3);
      const collections = split.items.map(it => it.collection);
      expect(collections).toContain('featured');
      expect(collections).toContain('cards');
      expect(split.warnings.length).toBeGreaterThan(0);

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-featured-empty: discards empty featured object', () => {
      const fixture = readFixture('edge-featured-empty.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(1);
      expect(split.items[0].collection).toBe('cards');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      expect(rebuilt.featured).toBeUndefined();
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-null-entries: discards null and non-object entries from card arrays', () => {
      const fixture = readFixture('edge-null-entries.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(2);
      expect(split.items[0].title).toBe('Valid First Card');
      expect(split.items[1].title).toBe('Valid Second Card');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-faq-no-title: derives title from question and omits title from rebuilt blob', () => {
      const fixture = readFixture('edge-faq-no-title.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(2);
      expect(split.items[0].collection).toBe('faqs');
      expect(split.items[0].title).toBe('What is the warranty period?');
      expect(split.items[0].data.__titleDerived).toBe(true);

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      expect((rebuilt.faqs as any[])[0].title).toBeUndefined();
      expect((rebuilt.faqs as any[])[0].question).toBe('What is the warranty period?');
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-unicode-titles: handles unicode text safely in titles and detail', () => {
      const fixture = readFixture('edge-unicode-titles.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(3);
      expect(split.items[0].title).toBe("Laboratoire d'Innovation 🧪");
      expect(split.items[1].title).toBe('人工智能实验室 (AI Lab) 🤖');
      expect(split.items[2].title).toBe('विद्यालय प्रयोगशाला 🇮🇳');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });

    it('edge-script-injection: preserves detail text in detail field', () => {
      const fixture = readFixture('edge-script-injection.json');
      const blob = JSON.parse(fixture.pageData);
      const split = splitLegacyPageData(blob);

      expect(split.items.length).toBe(1);
      expect((split.items[0].data as any).detail.overview).toContain('<script>alert(1)</script>');

      const rebuilt = buildLegacyPageData(split.settings, split.items, split.categories, { includeDetail: true });
      assertLegacyEquivalent(blob, rebuilt);
    });
  });

  describe('classifyPage', () => {
    it('classifies template=article as document', () => {
      expect(classifyPage({ slug: 'any-slug', template: 'article', pageData: { cards: [] } })).toBe('document');
    });

    it('classifies DOCUMENT_ONLY_SLUGS as document', () => {
      expect(classifyPage({ slug: 'home', pageData: { cards: [{ title: 'Card' }] } })).toBe('document');
      expect(classifyPage({ slug: 'furniture', pageData: { cards: [{ title: 'Card' }] } })).toBe('document');
      expect(classifyPage({ slug: 'contact-us', pageData: { cards: [{ title: 'Card' }] } })).toBe('document');
      expect(classifyPage({ slug: 'about-us', pageData: { cards: [{ title: 'Card' }] } })).toBe('document');
      expect(classifyPage({ slug: 'corporate', pageData: { cards: [{ title: 'Card' }] } })).toBe('document');
    });

    it('classifies ARTICLE_PAGE_SLUGS as document', () => {
      expect(classifyPage({ slug: 'privacy-policy', pageData: { cards: [] } })).toBe('document');
      expect(classifyPage({ slug: 'terms-and-conditions', pageData: { cards: [] } })).toBe('document');
      expect(classifyPage({ slug: 'shipping-policy', pageData: { cards: [] } })).toBe('document');
    });

    it('classifies prefixed slugs (guide-, environment-, resource-) as document', () => {
      expect(classifyPage({ slug: 'guide-school-setup', pageData: { cards: [{ title: 'c' }] } })).toBe('document');
      expect(classifyPage({ slug: 'environment-labs', pageData: { cards: [{ title: 'c' }] } })).toBe('document');
      expect(classifyPage({ slug: 'resource-robotics', pageData: { cards: [{ title: 'c' }] } })).toBe('document');
    });

    it('classifies page with no collections key as document', () => {
      expect(classifyPage({ slug: 'custom-hub', pageData: { heroTitle: 'Hello', styles: {} } })).toBe('document');
    });

    it('classifies valid hub page with collections key as structured', () => {
      expect(classifyPage({ slug: 'labs', pageData: { cards: [] } })).toBe('structured');
      expect(classifyPage({ slug: 'sports-infra', pageData: { cards: [{ title: 'Track' }] } })).toBe('structured');
      expect(classifyPage({ slug: 'job-openings-hub', pageData: { openings: [] } })).toBe('structured');
    });
  });
});
