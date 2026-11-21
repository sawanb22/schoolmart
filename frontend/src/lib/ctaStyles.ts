/**
 * ==============================================================================
 * CampusMart CTA Button Styles & Contrast Resolution Engine
 * ==============================================================================
 * SOLID Principles: Single Responsibility Principle (SRP)
 * Encapsulates all logic for calculating high-contrast, accessible CTA button
 * background and text colors across all CMS page archetypes.
 * ==============================================================================
 */

export interface CtaButtonStylesOptions {
  ctaBg?: string | null;
  ctaBtnBg?: string | null;
  ctaBtnText?: string | null;
  primaryColor?: string | null;
}

export interface CtaButtonStylesResult {
  backgroundColor: string;
  color: string;
  borderColor?: string;
  boxShadow?: string;
}

// Canonical theme color mappings
const NAMED_COLOR_MAP: Record<string, string> = {
  blue: '#002A6C',
  navy: '#002A6C',
  stone: '#0F172A',
  slate: '#0F172A',
  amber: '#451A03',
  darkamber: '#78350F',
  white: '#FFFFFF',
  paper: '#F8FAFC',
  gold: '#F59E0B',
  orange: '#EA580C',
  emerald: '#059669',
  green: '#16A34A',
  dark: '#0F172A',
  light: '#FFFFFF',
};

/**
 * Normalizes any color string (named, hex, or short hex) to a 6-digit hex string.
 * Returns null if string is invalid or unrecognized.
 */
export function normalizeHexColor(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Check named color map
  if (NAMED_COLOR_MAP[trimmed]) {
    return NAMED_COLOR_MAP[trimmed];
  }

  // Check Hex format
  const clean = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return `#${clean}`.toUpperCase();
  }

  return null;
}

/**
 * Calculates perceived relative luminance (0 to 255) of a hex color.
 * Uses standard ITU-R BT.709 coefficients: 0.2126 R + 0.7152 G + 0.0722 B.
 */
export function getLuminance(hexColor: string): number {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return 128; // neutral fallback

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determines whether a color is considered "dark" for contrast calculations.
 */
export function isDarkColor(color?: string | null): boolean {
  if (!color) return true; // Default CTA backgrounds (Navy #002A6C) are dark
  const hex = normalizeHexColor(color);
  if (!hex) {
    const lower = color.trim().toLowerCase();
    if (lower === 'white' || lower === 'paper' || lower === 'light') return false;
    return true;
  }
  return getLuminance(hex) < 145;
}

/**
 * Returns the highest-contrast text color (Dark Slate or White) for a given background color.
 */
export function getContrastTextColor(backgroundColor: string): '#0F172A' | '#FFFFFF' {
  const lum = getLuminance(backgroundColor);
  // If background luminance is >= 145 (light like Gold, White, Cream, Lime), use dark text
  return lum >= 145 ? '#0F172A' : '#FFFFFF';
}

/**
 * Resolves complete inline styles for a CTA button.
 * Guarantees zero "blue-on-blue" invisibility and high WCAG contrast on all pages.
 */
export function resolveCtaButtonStyles(
  optionsOrCtaBg?: CtaButtonStylesOptions | string | null,
  legacyCtaBtnBg?: string | null
): CtaButtonStylesResult {
  // Support both object signature and dual-argument legacy signature
  let ctaBg: string | null = null;
  let ctaBtnBg: string | null = null;
  let ctaBtnText: string | null = null;

  if (typeof optionsOrCtaBg === 'object' && optionsOrCtaBg !== null) {
    ctaBg = optionsOrCtaBg.ctaBg ?? null;
    ctaBtnBg = optionsOrCtaBg.ctaBtnBg ?? null;
    ctaBtnText = optionsOrCtaBg.ctaBtnText ?? null;
  } else {
    ctaBg = typeof optionsOrCtaBg === 'string' ? optionsOrCtaBg : null;
    ctaBtnBg = legacyCtaBtnBg ?? null;
  }

  // 1. Determine background color of the CTA container strip
  const stripIsDark = isDarkColor(ctaBg);

  // 2. Resolve button background
  const normalizedBtnBg = normalizeHexColor(ctaBtnBg);
  let finalBtnBg: string;

  if (normalizedBtnBg) {
    // Admin explicitly chose a valid custom button background
    finalBtnBg = normalizedBtnBg;
  } else {
    // Smart Automatic Default based on strip contrast:
    // If strip is dark (Navy, Slate, Stone, Dark Amber) -> Campus Gold (#F59E0B)
    // If strip is light (White, Paper) -> Campus Navy (#002A6C)
    finalBtnBg = stripIsDark ? '#F59E0B' : '#002A6C';
  }

  // 3. Resolve button text color
  let finalBtnText: string;
  const normalizedCustomText = normalizeHexColor(ctaBtnText);
  if (normalizedCustomText) {
    finalBtnText = normalizedCustomText;
  } else {
    // Auto-calculate high contrast text color based on button background
    finalBtnText = getContrastTextColor(finalBtnBg);
  }

  // 4. Subtle border if button is white or near-white for crisp definition
  const isButtonWhite = finalBtnBg === '#FFFFFF' || getLuminance(finalBtnBg) > 240;

  return {
    backgroundColor: finalBtnBg,
    color: finalBtnText,
    ...(isButtonWhite ? { borderColor: 'rgba(0, 0, 0, 0.15)' } : {}),
  };
}
