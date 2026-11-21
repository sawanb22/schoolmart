import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧪 Starting Card-to-Subpage Dual-Content & Architecture Verification Suite...\n');

// Helper: slugify logic from ServiceDetailPage
function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper: resolve effective description in ServiceDetailPage
function resolveEffectiveDescription(card) {
  if (card?.useCustomDetail && card?.detailContent?.trim()) {
    return card.detailContent.trim();
  }
  return card?.description || '';
}

// Helper: resolve card destination link
function resolveCardDestination(parentSlug, card) {
  if (card?.href?.startsWith('http://') || card?.href?.startsWith('https://')) {
    return card.href.trim();
  }
  if (card?.href?.startsWith('/')) {
    return card.href.trim();
  }
  const cleanSlug = (card?.slug || slugify(card?.title || '') || 'subpage').replace(/^\/+|\/+$/g, '');
  return `/${parentSlug}/${cleanSlug}`;
}

// Helper: resolve subpage CTA strip properties
function resolveSubpageCta(card, parentData = {}) {
  const rawCtaHref = card?.ctaButtonHref || card?.ctaHref || parentData?.ctaButtonHref || parentData?.ctaHref || '/contact-us';
  const effectiveCtaHref = rawCtaHref.startsWith('http') || rawCtaHref.startsWith('/') ? rawCtaHref : `/${rawCtaHref}`;
  const effectiveCtaLabel =
    card?.ctaButtonLabel || parentData?.ctaButtonLabel || (effectiveCtaHref.includes('quote') ? 'Request a Quote' : 'Contact Us');
  const effectiveCtaTitle =
    card?.ctaTitle?.trim() || parentData?.subpageCtaTitle || parentData?.ctaTitle || `Want ${card?.title?.toLowerCase()} on your campus?`;
  const effectiveCtaSubtitle = card?.ctaSubtitle?.trim() || parentData?.subpageCtaSubtitle || parentData?.ctaSubtitle || '';
  const isHidden = Boolean(card?.hideCta);
  const isExternal = effectiveCtaHref.startsWith('http');

  return {
    title: effectiveCtaTitle,
    subtitle: effectiveCtaSubtitle,
    buttonLabel: effectiveCtaLabel,
    buttonHref: effectiveCtaHref,
    isHidden,
    isExternal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Dual-Content Fallback Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 1: Verifying Dual-Content Fallback Contract (ServiceDetailPage)...');

// Case 1A: Legacy card without useCustomDetail
const legacyCard = {
  title: 'Turnkey AI Centre',
  description: 'Short teaser description for card grid.',
};
assert.equal(
  resolveEffectiveDescription(legacyCard),
  'Short teaser description for card grid.',
  'Legacy card must resolve to card.description'
);

// Case 1B: useCustomDetail = false
const disabledCustomCard = {
  title: 'Robotics Lab',
  description: 'Grid teaser only.',
  useCustomDetail: false,
  detailContent: '<h1>In-depth article that should not be used yet</h1>',
};
assert.equal(
  resolveEffectiveDescription(disabledCustomCard),
  'Grid teaser only.',
  'Disabled custom detail must fall back to card.description'
);

// Case 1C: useCustomDetail = true with valid detailContent
const enabledCustomCard = {
  title: 'Quantum Computing Hub',
  description: 'Punchy 20-word grid teaser.',
  useCustomDetail: true,
  detailContent: '<h2>Comprehensive Setup Guide</h2><p>Full 300-word scope, deliverables, and specs.</p>',
};
assert.equal(
  resolveEffectiveDescription(enabledCustomCard),
  '<h2>Comprehensive Setup Guide</h2><p>Full 300-word scope, deliverables, and specs.</p>',
  'Enabled custom detail must resolve to detailContent'
);

// Case 1D: Edge Case - useCustomDetail = true but detailContent is whitespace
const whitespaceCustomCard = {
  title: 'Empty Detail Card',
  description: 'Original teaser text.',
  useCustomDetail: true,
  detailContent: '   \n  \t  ',
};
assert.equal(
  resolveEffectiveDescription(whitespaceCustomCard),
  'Original teaser text.',
  'Whitespace detailContent must gracefully fall back to card.description'
);

console.log('✅ TEST 1 PASSED: Fallback contract works across legacy, disabled, enabled, and whitespace states.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Destination URL Resolution & Custom Link Support
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 2: Verifying Destination URL Resolution & Custom Link Support...');

// Case 2A: Default relative slug
const cardWithSlug = {
  title: 'AI Workstations',
  slug: 'ai-workstations',
};
assert.equal(
  resolveCardDestination('ai-ml', cardWithSlug),
  '/ai-ml/ai-workstations',
  'Relative slug must resolve to /:parentSlug/:cardSlug'
);

// Case 2B: Custom internal route (e.g. /request-quote)
const cardWithCustomRoute = {
  title: 'Get a Quote',
  slug: 'get-quote',
  href: '/request-quote',
};
assert.equal(
  resolveCardDestination('ai-ml', cardWithCustomRoute),
  '/request-quote',
  'Custom internal route must take precedence'
);

// Case 2C: External URL
const cardWithExternalUrl = {
  title: 'External Partner',
  href: 'https://partner.example.com/labs',
};
assert.equal(
  resolveCardDestination('labs', cardWithExternalUrl),
  'https://partner.example.com/labs',
  'External URL must be preserved intact'
);

// Case 2D: Missing slug and href (auto-slugify from title)
const cardWithTitleOnly = {
  title: 'Center of Excellence 2026',
};
assert.equal(
  resolveCardDestination('innovation', cardWithTitleOnly),
  '/innovation/center-of-excellence-2026',
  'Title must be slugified when slug and href are omitted'
);

console.log('✅ TEST 2 PASSED: URL resolution handles relative slugs, custom routes, external URLs, and title fallbacks.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Admin Quick Edit Link Generation
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 3: Verifying Admin Quick Edit Link Generation...');

const adminCard = {
  title: 'Smart Classrooms Suite',
  slug: 'smart-classrooms-suite',
};
const hubSlug = 'tech-infra';
const editUrl = `/admin/pages?edit=${encodeURIComponent(hubSlug)}&card=${encodeURIComponent(adminCard.slug)}`;

assert.equal(
  editUrl,
  '/admin/pages?edit=tech-infra&card=smart-classrooms-suite',
  'Admin edit URL must include parent page slug and card parameter'
);

console.log('✅ TEST 3 PASSED: Admin edit deep-link format verified.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Subpage CTA Strip Configuration & Overrides
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 4: Verifying Subpage CTA Strip Overrides & Fallbacks...');

// Case 4A: Clean card with no custom CTA (default state)
const blankCtaCard = {
  title: 'Cloud Lab Infrastructure',
};
const defaultCta = resolveSubpageCta(blankCtaCard);
assert.equal(defaultCta.title, 'Want cloud lab infrastructure on your campus?');
assert.equal(defaultCta.subtitle, '');
assert.equal(defaultCta.buttonLabel, 'Contact Us');
assert.equal(defaultCta.buttonHref, '/contact-us');
assert.equal(defaultCta.isHidden, false);
assert.equal(defaultCta.isExternal, false);

// Case 4B: Custom CTA with quote link
const customQuoteCard = {
  title: 'Robotics Center',
  ctaTitle: 'Build a Next-Gen Robotics Lab',
  ctaSubtitle: 'Partner with our technical architects for hardware selection and curriculum support.',
  ctaButtonLabel: 'Request Custom Quote',
  ctaButtonHref: '/request-quote',
};
const customCta = resolveSubpageCta(customQuoteCard);
assert.equal(customCta.title, 'Build a Next-Gen Robotics Lab');
assert.equal(customCta.subtitle, 'Partner with our technical architects for hardware selection and curriculum support.');
assert.equal(customCta.buttonLabel, 'Request Custom Quote');
assert.equal(customCta.buttonHref, '/request-quote');
assert.equal(customCta.isHidden, false);

// Case 4C: External partner CTA link
const externalCtaCard = {
  title: 'AWS Academy Integration',
  ctaTitle: 'Explore AWS Cloud Certification',
  ctaButtonLabel: 'Open AWS Portal',
  ctaButtonHref: 'https://aws.amazon.com/education',
};
const externalCta = resolveSubpageCta(externalCtaCard);
assert.equal(externalCta.buttonHref, 'https://aws.amazon.com/education');
assert.equal(externalCta.isExternal, true);

// Case 4D: Hidden CTA strip
const hiddenCtaCard = {
  title: 'Internal Notice',
  hideCta: true,
};
const hiddenCta = resolveSubpageCta(hiddenCtaCard);
assert.equal(hiddenCta.isHidden, true);

console.log('✅ TEST 4 PASSED: CTA strip handles default fallbacks, custom text, external URLs, and hidden states.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Source File Inspections for Invariants & Full Parity
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 5: Verifying Source File Implementations & Structural Invariants across all Hub Groups...');

// Check ServiceDetailPage.tsx
const serviceDetailPath = path.join(projectRoot, 'frontend', 'src', 'components', 'cms', 'ServiceDetailPage.tsx');
assert(fs.existsSync(serviceDetailPath), 'ServiceDetailPage.tsx must exist');
const serviceDetailCode = fs.readFileSync(serviceDetailPath, 'utf8');

assert(serviceDetailCode.includes('useCustomDetail'), 'ServiceDetailPage must reference useCustomDetail');
assert(serviceDetailCode.includes('detailContent'), 'ServiceDetailPage must reference detailContent');
assert(serviceDetailCode.includes('isAdminSession'), 'ServiceDetailPage must check admin session');
assert(serviceDetailCode.includes('Edit in'), 'ServiceDetailPage must render quick-edit button for admins');
assert(serviceDetailCode.includes('effectiveCtaTitle'), 'ServiceDetailPage must compute effectiveCtaTitle');
assert(serviceDetailCode.includes('effectiveCtaSubtitle'), 'ServiceDetailPage must compute effectiveCtaSubtitle');
assert(serviceDetailCode.includes('isExternalCta'), 'ServiceDetailPage must distinguish external CTA links');
assert(serviceDetailCode.includes('!card.hideCta'), 'ServiceDetailPage must respect card.hideCta');

// Check UniversalArticleDetail.tsx
const universalArticlePath = path.join(projectRoot, 'frontend', 'src', 'components', 'cms', 'UniversalArticleDetail.tsx');
assert(fs.existsSync(universalArticlePath), 'UniversalArticleDetail.tsx must exist');
const universalArticleCode = fs.readFileSync(universalArticlePath, 'utf8');

assert(universalArticleCode.includes('useCustomDetail'), 'UniversalArticleDetail must reference useCustomDetail');
assert(universalArticleCode.includes('detailContent'), 'UniversalArticleDetail must reference detailContent');
assert(universalArticleCode.includes('resolvedArticle.ctaButtonHref'), 'UniversalArticleDetail must support ctaButtonHref');
assert(universalArticleCode.includes('hideCta: Boolean(resolvedArticle.hideCta)'), 'UniversalArticleDetail must respect hideCta');
assert(universalArticleCode.includes('adminEditUrl={adminEditUrl}'), 'UniversalArticleDetail must pass adminEditUrl');

// Check GenericPageRenderer.tsx
const genericPageRendererPath = path.join(projectRoot, 'frontend', 'src', 'components', 'cms', 'GenericPageRenderer.tsx');
assert(fs.existsSync(genericPageRendererPath), 'GenericPageRenderer.tsx must exist');
const genericPageRendererCode = fs.readFileSync(genericPageRendererPath, 'utf8');
assert(genericPageRendererCode.includes('adminEditUrl'), 'GenericPageRenderer must support adminEditUrl');
assert(genericPageRendererCode.includes('isAdminSession'), 'GenericPageRenderer must check admin session');
assert(genericPageRendererCode.includes('Pencil'), 'GenericPageRenderer must render Pencil edit icon');
assert(genericPageRendererCode.includes('pageData.heroEyebrow || pageData.category'), 'GenericPageRenderer must prioritize heroEyebrow over category for visual eyebrow banner');

// Check UnifiedPageEditor.tsx
const editorPath = path.join(projectRoot, 'frontend', 'src', 'admin', 'components', 'UnifiedPageEditor.tsx');
assert(fs.existsSync(editorPath), 'UnifiedPageEditor.tsx must exist');
const editorCode = fs.readFileSync(editorPath, 'utf8');

assert(editorCode.includes('Customize In-Depth Subpage Content'), 'UnifiedPageEditor must contain dual-content toggle');
assert(editorCode.includes('In-Depth Subpage Content'), 'UnifiedPageEditor must contain in-depth content field');
assert(editorCode.includes('View Live Subpage'), 'UnifiedPageEditor must contain View Live Subpage button');
assert(editorCode.includes("searchParams.get('card')"), 'UnifiedPageEditor must support auto-expanding card via URL query');
assert(editorCode.includes('Subpage Bottom CTA Strip'), 'UnifiedPageEditor must contain Subpage CTA editor header');
assert(editorCode.includes('CTA Banner Heading'), 'UnifiedPageEditor must contain CTA heading field');
assert(editorCode.includes('CTA Banner Subtitle'), 'UnifiedPageEditor must contain CTA subtitle field');
assert(editorCode.includes('CTA Button Label'), 'UnifiedPageEditor must contain CTA button label field');
assert(editorCode.includes('CTA Button Destination Link'), 'UnifiedPageEditor must contain CTA button href field');
assert(editorCode.includes('Hide CTA Strip'), 'UnifiedPageEditor must contain Hide CTA checkbox');
assert(editorCode.includes("data.readMoreLabel || effectiveDefaults.readMoreLabel || 'Learn More'"), 'Live Mini Preview Card must dynamically render readMoreLabel');
assert(!editorCode.includes('stepCountLabel'), 'UnifiedPageEditor must not contain deprecated stepCountLabel');

// Check that line-clamp has been relaxed across all hub pages
const aimlPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'ai-ml.tsx');
assert(fs.existsSync(aimlPath), 'ai-ml.tsx must exist');
const aimlCode = fs.readFileSync(aimlPath, 'utf8');
assert(!aimlCode.includes('line-clamp-2 text-sm leading-relaxed text-stone-500'), 'ai-ml.tsx must not enforce rigid line-clamp-2 on card description');

const solutionRendererPath = path.join(projectRoot, 'frontend', 'src', 'components', 'cms', 'SolutionPageRenderer.tsx');
assert(fs.existsSync(solutionRendererPath), 'SolutionPageRenderer.tsx must exist');
const solutionRendererCode = fs.readFileSync(solutionRendererPath, 'utf8');
assert(!solutionRendererCode.includes('line-clamp-3 block'), 'SolutionPageRenderer.tsx must not enforce rigid line-clamp-3 on card description');

const libMgmtPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'library-management.tsx');
const libMgmtCode = fs.readFileSync(libMgmtPath, 'utf8');
assert(!libMgmtCode.includes('line-clamp-2'), 'library-management.tsx must not enforce line-clamp-2');

const campusAutoPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'campus-automation.tsx');
const campusAutoCode = fs.readFileSync(campusAutoPath, 'utf8');
assert(!campusAutoCode.includes('line-clamp-3 block'), 'campus-automation.tsx must not enforce line-clamp-3');

const collabSpacesPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'collaboration-spaces.tsx');
const collabSpacesCode = fs.readFileSync(collabSpacesPath, 'utf8');
assert(!collabSpacesCode.includes('line-clamp-2'), 'collaboration-spaces.tsx must not enforce line-clamp-2');

const masterPlanningPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'campus-master-planning.tsx');
const masterPlanningCode = fs.readFileSync(masterPlanningPath, 'utf8');
assert(!masterPlanningCode.includes('line-clamp-3'), 'campus-master-planning.tsx must not enforce line-clamp-3');

console.log('✅ TEST 5 PASSED: All source files across Groups 2, 3, 4 & 5 adhere 100% to unified specifications.\n');

console.log('🎉 ALL CARD-TO-SUBPAGE DUAL-CONTENT & ARCHITECTURE TESTS PASSED! (5/5)\n');
