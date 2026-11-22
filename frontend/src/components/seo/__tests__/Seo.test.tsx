import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { Seo, formatTitle, truncateDescription, formatCanonicalUrl, formatImageUrl } from '../Seo';
import { usePageSeo } from '@/hooks/usePageSeo';

describe('Seo Component and Helpers (T16)', () => {
  beforeEach(() => {
    // Clear head elements added during previous tests if needed
    document.title = '';
    const metas = document.head.querySelectorAll('meta, link[rel="canonical"]');
    metas.forEach((el) => el.remove());
  });

  describe('formatTitle helper', () => {
    it('appends | SchoolMart if title does not contain SchoolMart', () => {
      expect(formatTitle('Science & Tech Labs')).toBe('Science & Tech Labs | SchoolMart');
      expect(formatTitle('Furniture')).toBe('Furniture | SchoolMart');
    });

    it('does not duplicate SchoolMart if already present in title', () => {
      expect(formatTitle('SchoolMart')).toBe('SchoolMart');
      expect(formatTitle('SchoolMart - Higher Education Setup')).toBe('SchoolMart - Higher Education Setup');
      expect(formatTitle('Welcome to schoolmart')).toBe('Welcome to schoolmart');
    });

    it('defaults to SchoolMart when title is empty or undefined', () => {
      expect(formatTitle('')).toBe('SchoolMart');
      expect(formatTitle(undefined)).toBe('SchoolMart');
    });
  });

  describe('truncateDescription helper', () => {
    it('returns short description as-is without ellipsis', () => {
      const short = 'A concise overview of our laboratory solutions.';
      expect(truncateDescription(short, 160)).toBe(short);
    });

    it('truncates at word boundary within 160 characters and appends ellipsis', () => {
      const longText =
        'This is a comprehensive description of our modern university laboratories designed specifically for engineering, biotechnology, robotics, and applied physics courses with cutting-edge equipment and setups.';
      expect(longText.length).toBeGreaterThan(160);

      const truncated = truncateDescription(longText, 160);
      expect(truncated.length).toBeLessThanOrEqual(160);
      expect(truncated.endsWith('...')).toBe(true);
      // Ensure the word before ellipsis is not sliced mid-word
      const beforeEllipsis = truncated.slice(0, -3);
      expect(longText.startsWith(beforeEllipsis)).toBe(true);
      // Sliced chunk should be followed by a space or boundary in original text
      const nextCharInOriginal = longText.charAt(beforeEllipsis.length);
      expect(nextCharInOriginal === ' ' || nextCharInOriginal === '').toBe(true);
    });

    it('handles empty or undefined descriptions gracefully', () => {
      expect(truncateDescription('')).toBe('');
      expect(truncateDescription(undefined)).toBe('');
    });
  });

  describe('formatCanonicalUrl helper', () => {
    it('generates canonical URL with custom baseUrl and normalized path', () => {
      expect(formatCanonicalUrl('/labs', 'https://schoolmart.in/')).toBe('https://schoolmart.in/labs');
      expect(formatCanonicalUrl('labs', 'https://schoolmart.in')).toBe('https://schoolmart.in/labs');
      expect(formatCanonicalUrl('/', 'https://schoolmart.in')).toBe('https://schoolmart.in/');
    });

    it('normalizes multi-segment paths correctly', () => {
      expect(formatCanonicalUrl('/solutions/stem-lab', 'https://schoolmart.in')).toBe(
        'https://schoolmart.in/solutions/stem-lab'
      );
    });
  });

  describe('formatImageUrl helper', () => {
    it('preserves absolute URLs', () => {
      expect(formatImageUrl('https://cdn.example.com/image.jpg')).toBe('https://cdn.example.com/image.jpg');
      expect(formatImageUrl('http://cdn.example.com/image.jpg')).toBe('http://cdn.example.com/image.jpg');
    });

    it('prepends site URL to relative image paths', () => {
      expect(formatImageUrl('/uploads/banner.webp', 'https://schoolmart.in')).toBe(
        'https://schoolmart.in/uploads/banner.webp'
      );
      expect(formatImageUrl('uploads/banner.webp', 'https://schoolmart.in')).toBe(
        'https://schoolmart.in/uploads/banner.webp'
      );
    });

    it('returns undefined when image is omitted', () => {
      expect(formatImageUrl(undefined)).toBeUndefined();
      expect(formatImageUrl('')).toBeUndefined();
    });
  });

  describe('<Seo /> component rendering & hoisting', () => {
    it('renders and hoists title, meta description, canonical link, and OpenGraph tags into head', () => {
      render(
        <Seo
          title="Smart Classrooms"
          description="Interactive digital learning spaces for colleges."
          path="/smart-classrooms"
          image="/uploads/classroom.jpg"
        />
      );

      // In React 19, metadata is hoisted to document.head
      expect(document.title).toBe('Smart Classrooms | SchoolMart');

      const metaDesc = document.querySelector('meta[name="description"]');
      expect(metaDesc).not.toBeNull();
      expect(metaDesc?.getAttribute('content')).toBe('Interactive digital learning spaces for colleges.');

      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical).not.toBeNull();
      expect(canonical?.getAttribute('href')).toContain('/smart-classrooms');

      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle?.getAttribute('content')).toBe('Smart Classrooms | SchoolMart');

      const ogUrl = document.querySelector('meta[property="og:url"]');
      expect(ogUrl?.getAttribute('content')).toContain('/smart-classrooms');

      const ogImage = document.querySelector('meta[property="og:image"]');
      expect(ogImage?.getAttribute('content')).toContain('/uploads/classroom.jpg');

      const twitterCard = document.querySelector('meta[name="twitter:card"]');
      expect(twitterCard?.getAttribute('content')).toBe('summary_large_image');
    });

    it('renders meta robots noindex when noindex is true', () => {
      render(
        <Seo
          title="Admin Login"
          noindex={true}
          path="/admin/login"
        />
      );

      expect(document.title).toBe('Admin Login | SchoolMart');
      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta?.getAttribute('content')).toContain('noindex');
      expect(robotsMeta?.getAttribute('content')).toContain('nofollow');
    });

    it('does not render meta robots when noindex is false', () => {
      render(
        <Seo
          title="Public Solutions"
          noindex={false}
          path="/solutions"
        />
      );

      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).toBeNull();
    });
  });

  describe('usePageSeo hook', () => {
    it('follows the complete fallback chain for title and description', () => {
      // 1. Full settings provided
      const { result: r1 } = renderHook(() =>
        usePageSeo(
          {
            seoTitle: 'Custom SEO Title',
            seoDescription: 'Custom SEO Description',
            ogImage: '/images/seo.jpg',
            noindex: true,
          },
          'Fallback Title',
          'Fallback Description',
          '/page'
        )
      );

      expect(r1.current.title).toBe('Custom SEO Title');
      expect(r1.current.description).toBe('Custom SEO Description');
      expect(r1.current.image).toBe('/images/seo.jpg');
      expect(r1.current.noindex).toBe(true);

      // 2. heroTitle & heroSubtitle fallback
      const { result: r2 } = renderHook(() =>
        usePageSeo(
          {
            heroTitle: 'Hero Headline',
            heroSubtitle: 'Hero Subtitle',
          },
          'Fallback Title',
          'Fallback Description',
          '/page'
        )
      );

      expect(r2.current.title).toBe('Hero Headline');
      expect(r2.current.description).toBe('Hero Subtitle');

      // 3. Fallback arguments
      const { result: r3 } = renderHook(() =>
        usePageSeo({}, 'Final Fallback Title', 'Final Fallback Description')
      );

      expect(r3.current.title).toBe('Final Fallback Title');
      expect(r3.current.description).toBe('Final Fallback Description');
      expect(r3.current.noindex).toBe(false);

      // 4. Default SchoolMart fallback
      const { result: r4 } = renderHook(() => usePageSeo(null));
      expect(r4.current.title).toBe('SchoolMart');
      expect(r4.current.description).toBe('');
    });
  });
});
