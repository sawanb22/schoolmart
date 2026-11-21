import { describe, it, expect } from 'vitest';
import { itemToCard } from './item-to-card';
import itemsFixtures from '../test/fixtures/items/items.json';

describe('itemToCard', () => {
  describe('Backend characterization parity fixtures', () => {
    it('matches backend buildItem output for all generated fixtures (with and without detail)', () => {
      expect(itemsFixtures.length).toBeGreaterThan(30);

      for (const fixture of itemsFixtures) {
        const noDetail = itemToCard(fixture.item, { includeDetail: false });
        expect(noDetail).toEqual(fixture.expectedLegacyNoDetail);

        const withDetail = itemToCard(fixture.item, { includeDetail: true });
        expect(withDetail).toEqual(fixture.expectedLegacyWithDetail);
      }
    });
  });

  describe('Explicit edge cases and unit behaviors', () => {
    it('returns empty object for null, undefined, or non-object inputs', () => {
      expect(itemToCard(null)).toEqual({});
      expect(itemToCard(undefined)).toEqual({});
      expect(itemToCard('not an object')).toEqual({});
      expect(itemToCard(123)).toEqual({});
    });

    it('omits title when data.__titleDerived is true', () => {
      const item = {
        title: 'Auto Generated Title',
        data: {
          __titleDerived: true,
          customField: 'preserved',
        },
      };
      const card = itemToCard(item);
      expect(card.title).toBeUndefined();
      expect(card.customField).toBe('preserved');
      expect(card.__titleDerived).toBeUndefined();
    });

    it('preserves title when data.__titleDerived is false or absent', () => {
      const item = {
        title: 'My Custom Title',
        slug: 'my-custom-title',
        data: {
          level: 'advanced',
        },
      };
      const card = itemToCard(item);
      expect(card.title).toBe('My Custom Title');
      expect(card.slug).toBe('my-custom-title');
      expect(card.level).toBe('advanced');
    });

    it('maps summary to description and imageUrl to image', () => {
      const item = {
        title: 'Test Item',
        summary: 'This is the summary text',
        imageUrl: '/images/photo.png',
        href: '/labs/test-item',
        badge: 'NEW',
      };
      const card = itemToCard(item);
      expect(card.description).toBe('This is the summary text');
      expect(card.image).toBe('/images/photo.png');
      expect(card.href).toBe('/labs/test-item');
      expect(card.badge).toBe('NEW');
    });

    it('omits null or undefined summary, imageUrl, href, badge', () => {
      const item = {
        title: 'Sparse Item',
        summary: null,
        imageUrl: null,
        href: null,
        badge: null,
      };
      const card = itemToCard(item);
      expect('description' in card).toBe(false);
      expect('image' in card).toBe(false);
      expect('href' in card).toBe(false);
      expect('badge' in card).toBe(false);
    });

    it('handles categories from categoryNames array', () => {
      const item = {
        title: 'Categorized Item',
        categoryNames: ['STEM', 'Robotics'],
      };
      const card = itemToCard(item);
      expect(card.categories).toEqual(['STEM', 'Robotics']);
    });

    it('handles categories from object array with name or category.name', () => {
      const item = {
        title: 'Object Categorized Item',
        categories: [
          { name: 'Physics' },
          { category: { name: 'Lab Gear' } },
          'DirectString',
        ],
      };
      const card = itemToCard(item);
      expect(card.categories).toEqual(['Physics', 'Lab Gear', 'DirectString']);
    });

    it('spreads detail only when includeDetail is true', () => {
      const item = {
        title: 'Detail Rich Item',
        detail: {
          methodology: '<p>Methodology</p>',
          deliverables: [{ title: 'D1' }],
          useCustomDetail: true,
          detailContent: 'Custom',
        },
      };

      const withoutDetail = itemToCard(item, { includeDetail: false });
      expect(withoutDetail.methodology).toBeUndefined();
      expect(withoutDetail.deliverables).toBeUndefined();
      expect(withoutDetail.useCustomDetail).toBeUndefined();

      const withDetail = itemToCard(item, { includeDetail: true });
      expect(withDetail.methodology).toBe('<p>Methodology</p>');
      expect(withDetail.deliverables).toEqual([{ title: 'D1' }]);
      expect(withDetail.useCustomDetail).toBe(true);
      expect(withDetail.detailContent).toBe('Custom');
    });
  });
});
