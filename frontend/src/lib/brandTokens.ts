/**
 * SchoolMart Brand Identity & Visual Tokens
 * Defines the core palette, typography, HSL CSS variable references,
 * asset paths, and reusable utility styles for the SchoolMart institutional platform.
 */

export const BRAND_IDENTITY = {
  name: 'SchoolMart',
  legalName: 'SchoolMart India',
  tagline: 'Institutional School Infrastructure, Furniture & EdTech',
  description:
    'Comprehensive institutional solutions for schools: classroom furniture, sports infrastructure, STEM/Robotics labs, and campus digital transformation.',
  assets: {
    logo: '/logo.png',
    logoClean: '/logo_clean.png',
    favicon: '/favicon.png',
    faviconIco: '/favicon.ico',
  },
} as const;

export const BRAND_COLORS = {
  // Primary Navy Scale
  primary: {
    50: '#f0f7ff',
    100: '#e0effe',
    500: '#0284c7',
    600: '#004a8e', // Core Primary
    700: '#003d75', // Primary Hover
    800: '#003362', // Primary Dark / Active
    900: '#002548',
    DEFAULT: '#004a8e',
    dark: '#003362',
    foreground: '#FFFFFF',
  },
  // Secondary Lime / Chartreuse Accent
  secondary: {
    DEFAULT: '#9ACD32',
    hover: '#86b32b',
    active: '#759e24',
    foreground: '#000000',
  },
  // Semantic Brand Color Map
  brand: {
    navy: '#004a8e',
    'navy-hover': '#003d75',
    'navy-active': '#003362',
    lime: '#9ACD32',
    'lime-hover': '#86b32b',
    ink: '#0f172a',
    slate: '#334155',
    surface: '#f8fafc',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
  },
} as const;

export const BRAND_HSL = {
  primary: '209 100% 28%',
  primaryForeground: '0 0% 100%',
  secondary: '80 61% 50%',
  secondaryForeground: '0 0% 0%',
  ring: '209 100% 28%',
  sidebarPrimary: '209 100% 28%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarRing: '209 100% 28%',
} as const;

export const BRAND_FONTS = {
  sans: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  heading: '"Plus Jakarta Sans", Poppins, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

/**
 * Common pre-composed Tailwind utility class combinations for SchoolMart UI
 */
export const BRAND_CLASSES = {
  // Buttons
  btnPrimary:
    'bg-[#004a8e] hover:bg-[#003d75] active:bg-[#003362] text-white font-semibold shadow-sm transition-all duration-200',
  btnSecondary:
    'bg-[#9ACD32] hover:bg-[#86b32b] text-black font-semibold shadow-sm transition-all duration-200',
  btnOutline:
    'border-2 border-[#004a8e] text-[#004a8e] hover:bg-[#004a8e] hover:text-white transition-all duration-200',
  
  // Badges & Accents
  badgeNavy: 'bg-[#f0f7ff] text-[#004a8e] border border-[#e0effe]',
  badgeLime: 'bg-[#f7fee7] text-[#4d7c0f] border border-[#d9f99d]',

  // Gradients
  heroGradient: 'bg-gradient-to-r from-[#002548] via-[#004a8e] to-[#003362]',
  cardGradient: 'bg-gradient-to-b from-white to-[#f8fafc]',

  // Header & Navbar
  topBar: 'bg-[#003362] text-white',
  headerNav: 'bg-white/95 backdrop-blur border-b border-gray-100',
} as const;
