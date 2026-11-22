import React, { useState, useEffect } from 'react';
import { resolveMediaUrl } from '@/lib/media-url';
import { cn } from '@/lib/utils';

export interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'fetchPriority'> {
  fallbackSrc?: string;
  fallbackNode?: React.ReactNode;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  widths?: number[];
  sizes?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Returns a variant path replacing the file extension with `-${width}.webp`.
 * Strips existing variant suffix if present. Preserves query string and hash.
 */
export function getUploadVariantPath(src: string, width: number): string {
  const match = src.match(/^([^?#]+)\.([a-zA-Z0-9]+)(.*)$/);
  if (!match) return src;
  const basePath = match[1].replace(/-\d+$/, '');
  const queryAndHash = match[3] || '';
  return `${basePath}-${width}.webp${queryAndHash}`;
}

export const MediaImage: React.FC<MediaImageProps> = ({
  src,
  alt = '',
  className,
  fallbackSrc,
  fallbackNode,
  onError,
  loading,
  priority = false,
  fetchPriority,
  widths,
  sizes,
  width,
  height,
  ...rest
}) => {
  const [variantFailed, setVariantFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when source props change
  useEffect(() => {
    setVariantFailed(false);
    setUseFallback(false);
    setHasError(false);
  }, [src, fallbackSrc, widths]);

  const initialUrl = src ? resolveMediaUrl(src) : '';
  const fallbackUrl = fallbackSrc ? resolveMediaUrl(fallbackSrc) : '';

  // Determine which URL should be actively attempted
  const effectiveUrl = !initialUrl || useFallback ? fallbackUrl : initialUrl;

  const isHighPriority = priority === true || fetchPriority === 'high';
  const resolvedLoading: 'eager' | 'lazy' = isHighPriority ? 'eager' : (loading || 'lazy');
  const resolvedFetchPriority = isHighPriority ? 'high' : fetchPriority;

  // Responsive variant generation for /uploads/ URLs
  const isSvg = typeof src === 'string' && (src.toLowerCase().endsWith('.svg') || src.toLowerCase().includes('.svg?'));
  const isUploadUrl = Boolean(
    typeof src === 'string' &&
    src.includes('/uploads/') &&
    !isSvg
  );

  let generatedSrcSet: string | undefined = undefined;
  if (isUploadUrl && widths && widths.length > 0 && !variantFailed && !useFallback) {
    generatedSrcSet = widths
      .map((w) => `${resolveMediaUrl(getUploadVariantPath(src!, w))} ${w}w`)
      .join(', ');
  }

  const effectiveSrcSet = generatedSrcSet || rest.srcSet;
  const effectiveSizes = sizes || (effectiveSrcSet ? '100vw' : undefined);

  if (!effectiveUrl || hasError) {
    if (fallbackNode) {
      return <>{fallbackNode}</>;
    }

    // Default branded SVG fallback placeholder
    return (
      <div
        role="img"
        aria-label={alt || 'Image placeholder'}
        className={cn(
          'relative flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 select-none overflow-hidden',
          className
        )}
        // No fixed pixel width/height here: the placeholder must fill the box given by
        // `className` (e.g. w-full h-full). A hard width broke the home card grid when images were missing.
      >
        <svg
          className="w-10 h-10 opacity-40 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={effectiveUrl}
      alt={alt}
      width={width}
      height={height}
      loading={resolvedLoading}
      {...(effectiveSrcSet ? { srcSet: effectiveSrcSet } : {})}
      {...(effectiveSizes ? { sizes: effectiveSizes } : {})}
      {...(resolvedFetchPriority ? { fetchPriority: resolvedFetchPriority } : {})}
      className={className}
      onError={(e) => {
        if (generatedSrcSet && !variantFailed) {
          // If responsive WebP variant fails to load, fall back to original source without srcSet
          setVariantFailed(true);
          onError?.(e);
          return;
        }

        if (!useFallback && fallbackUrl && fallbackUrl !== effectiveUrl) {
          setUseFallback(true);
          onError?.(e);
          return;
        }

        setHasError(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
};

export default MediaImage;
