import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaImage, getUploadVariantPath } from '../media-image';

describe('MediaImage component (T15)', () => {
  describe('getUploadVariantPath helper', () => {
    it('appends -<width>.webp before extension', () => {
      expect(getUploadVariantPath('/uploads/media/photo.jpg', 480)).toBe('/uploads/media/photo-480.webp');
      expect(getUploadVariantPath('/uploads/media/image.png', 960)).toBe('/uploads/media/image-960.webp');
    });

    it('replaces existing variant suffix if present', () => {
      expect(getUploadVariantPath('/uploads/media/photo-960.webp', 480)).toBe('/uploads/media/photo-480.webp');
    });

    it('preserves query strings and hashes', () => {
      expect(getUploadVariantPath('/uploads/media/photo.png?v=2#hash', 1600)).toBe('/uploads/media/photo-1600.webp?v=2#hash');
    });
  });

  describe('srcSet generation', () => {
    it('generates responsive srcSet and sizes for /uploads/ images when widths are provided', () => {
      render(
        <MediaImage
          src="/uploads/media/hero.jpg"
          alt="Hero"
          widths={[480, 960, 1600]}
          sizes="(max-width: 768px) 100vw, 960px"
        />
      );

      const img = screen.getByRole('img', { name: 'Hero' });
      const srcSet = img.getAttribute('srcset');
      expect(srcSet).toBeDefined();
      expect(srcSet).toContain('/uploads/media/hero-480.webp 480w');
      expect(srcSet).toContain('/uploads/media/hero-960.webp 960w');
      expect(srcSet).toContain('/uploads/media/hero-1600.webp 1600w');
      expect(img.getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 960px');
    });

    it('defaults sizes to 100vw when widths are provided and sizes is omitted', () => {
      render(
        <MediaImage
          src="/uploads/media/card.png"
          alt="Card"
          widths={[480, 960]}
        />
      );

      const img = screen.getByRole('img', { name: 'Card' });
      expect(img.getAttribute('sizes')).toBe('100vw');
      expect(img.getAttribute('srcset')).toContain('/uploads/media/card-480.webp 480w');
      expect(img.getAttribute('srcset')).toContain('/uploads/media/card-960.webp 960w');
    });

    it('omits srcSet for remote URLs even if widths are provided', () => {
      render(
        <MediaImage
          src="https://images.unsplash.com/photo-123456"
          alt="Unsplash"
          widths={[480, 960]}
        />
      );

      const img = screen.getByRole('img', { name: 'Unsplash' });
      expect(img.getAttribute('srcset')).toBeNull();
      expect(img.getAttribute('src')).toBe('https://images.unsplash.com/photo-123456');
    });

    it('omits srcSet for SVG images', () => {
      render(
        <MediaImage
          src="/uploads/media/icon.svg"
          alt="SVG Icon"
          widths={[480, 960]}
        />
      );

      const img = screen.getByRole('img', { name: 'SVG Icon' });
      expect(img.getAttribute('srcset')).toBeNull();
    });
  });

  describe('onError fallback behavior', () => {
    it('falls back to original src by dropping srcSet when variant fails', () => {
      const onErrorMock = vi.fn();
      render(
        <MediaImage
          src="/uploads/media/complex-photo.png"
          alt="Fallback test"
          widths={[480, 960]}
          onError={onErrorMock}
        />
      );

      const img = screen.getByRole('img', { name: 'Fallback test' });
      expect(img.getAttribute('srcset')).toBeDefined();

      // Simulate variant loading failure
      fireEvent.error(img);

      // After first error, srcset should be removed so browser falls back to original src
      expect(img.getAttribute('srcset')).toBeNull();
      expect(img.getAttribute('src')).toContain('/uploads/media/complex-photo.png');
      expect(onErrorMock).toHaveBeenCalledTimes(1);
    });

    it('switches to fallbackSrc if original image fails', () => {
      render(
        <MediaImage
          src="https://broken-domain.com/broken.jpg"
          fallbackSrc="/uploads/media/placeholder.png"
          alt="Broken Image"
        />
      );

      let img = screen.getByRole('img', { name: 'Broken Image' });
      expect(img.getAttribute('src')).toBe('https://broken-domain.com/broken.jpg');

      // Trigger error on primary src
      fireEvent.error(img);

      // Now should switch to fallbackSrc
      img = screen.getByRole('img', { name: 'Broken Image' });
      expect(img.getAttribute('src')).toContain('/uploads/media/placeholder.png');
    });

    it('renders placeholder div when both primary and fallback fail', () => {
      render(
        <MediaImage
          src="https://broken-domain.com/broken.jpg"
          fallbackSrc="https://broken-domain.com/broken-fallback.jpg"
          alt="Totally Broken"
        />
      );

      const img = screen.getByRole('img', { name: 'Totally Broken' });
      // Error 1: primary src fails -> switches to fallback
      fireEvent.error(img);
      // Error 2: fallback src fails -> renders placeholder div
      fireEvent.error(img);

      const placeholder = screen.getByRole('img', { name: 'Totally Broken' });
      expect(placeholder.tagName.toLowerCase()).toBe('div');
    });

    it('placeholder never gets a fixed pixel width/height, so it fills its container (home card grid regression)', () => {
      render(
        <MediaImage
          src="/uploads/media/missing-card.jpg"
          alt="Missing card image"
          width={480}
          height={240}
          widths={[480, 960]}
          className="w-full h-full object-cover"
        />
      );

      let img = screen.getByRole('img', { name: 'Missing card image' });
      fireEvent.error(img); // responsive variant fails -> retry original
      img = screen.getByRole('img', { name: 'Missing card image' });
      fireEvent.error(img); // original fails -> placeholder div

      const placeholder = screen.getByRole('img', { name: 'Missing card image' });
      expect(placeholder.tagName.toLowerCase()).toBe('div');
      expect(placeholder.style.width).toBe('');
      expect(placeholder.style.height).toBe('');
      expect(placeholder.className).toContain('w-full');
    });
  });

  describe('priority, loading, and dimensions', () => {
    it('maps priority=true to loading="eager" and fetchpriority="high"', () => {
      render(
        <MediaImage
          src="/uploads/media/hero.jpg"
          alt="Priority Hero"
          priority
        />
      );

      const img = screen.getByRole('img', { name: 'Priority Hero' });
      expect(img.getAttribute('loading')).toBe('eager');
      expect(img.getAttribute('fetchpriority')).toBe('high');
    });

    it('defaults non-priority images to loading="lazy"', () => {
      render(
        <MediaImage
          src="/uploads/media/card.jpg"
          alt="Lazy Card"
        />
      );

      const img = screen.getByRole('img', { name: 'Lazy Card' });
      expect(img.getAttribute('loading')).toBe('lazy');
    });

    it('renders explicit width and height attributes', () => {
      render(
        <MediaImage
          src="/uploads/media/banner.jpg"
          alt="Banner"
          width={800}
          height={400}
        />
      );

      const img = screen.getByRole('img', { name: 'Banner' });
      expect(img.getAttribute('width')).toBe('800');
      expect(img.getAttribute('height')).toBe('400');
    });
  });
});
