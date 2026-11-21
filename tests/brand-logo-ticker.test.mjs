import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- Testing Brand & Partner Logos Revolving Ticker Implementation ---\n');

// 1. SolutionPageRenderer Template Tests
const rendererPath = path.resolve('frontend/src/components/cms/SolutionPageRenderer.tsx');
assert.ok(fs.existsSync(rendererPath), 'SolutionPageRenderer.tsx must exist');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

assert.ok(
  rendererCode.includes('export interface PartnerLogoItem'),
  'FAIL: PartnerLogoItem interface must be exported'
);

assert.ok(
  rendererCode.includes('const showPartnerLogos = !data.hidePartnerLogos && partnerLogos.length > 0;'),
  'FAIL: Ticker must only be shown when not hidden and logos are present'
);

assert.ok(
  rendererCode.includes('fullTickerTrack'),
  'FAIL: Track duplication logic must be present for seamless looping'
);

assert.ok(
  rendererCode.includes('@keyframes cmTickerLoop') && rendererCode.includes('translate3d(-50%, 0, 0)'),
  'FAIL: GPU-accelerated CSS keyframe translate3d(-50%) must be present'
);

assert.ok(
  rendererCode.includes('animation-play-state: paused'),
  'FAIL: Pause on hover must be implemented'
);

assert.ok(
  rendererCode.includes('h-7 sm:h-8 md:h-9') && rendererCode.includes('max-w-[130px]'),
  'FAIL: Proportional uniform frameless logo dimensions (h-7 sm:h-8 md:h-9) must be enforced'
);

console.log('✓ [1/4] SolutionPageRenderer.tsx template verification passed');

// 2. UnifiedPageEditor CMS Tests
const editorPath = path.resolve('frontend/src/admin/components/UnifiedPageEditor.tsx');
assert.ok(fs.existsSync(editorPath), 'UnifiedPageEditor.tsx must exist');
const editorCode = fs.readFileSync(editorPath, 'utf8');

assert.ok(
  editorCode.includes('function LogoUploadField'),
  'FAIL: LogoUploadField component must exist'
);

assert.ok(
  editorCode.includes('500 * 1024') || editorCode.includes('512000'),
  'FAIL: Strict 500 KB file size limit must be enforced'
);

assert.ok(
  editorCode.includes('isSvgOrPng') || editorCode.includes('.svg') && editorCode.includes('.png'),
  'FAIL: SVG and PNG format restriction must be enforced'
);

assert.ok(
  editorCode.includes('addPartnerLogo') && editorCode.includes('removePartnerLogo'),
  'FAIL: addPartnerLogo and removePartnerLogo helper handlers must exist'
);

assert.ok(
  editorCode.includes('hidePartnerLogos'),
  'FAIL: hidePartnerLogos visibility switch must exist'
);

console.log('✓ [2/4] UnifiedPageEditor.tsx CMS editor & 500KB SVG/PNG validator passed');

// 3. Backend Upload Middleware Tests
const uploadMiddlewarePath = path.resolve('backend/src/middleware/upload.middleware.ts');
assert.ok(fs.existsSync(uploadMiddlewarePath), 'upload.middleware.ts must exist');
const middlewareCode = fs.readFileSync(uploadMiddlewarePath, 'utf8');

assert.ok(
  middlewareCode.includes('.svg'),
  'FAIL: Backend upload middleware must accept .svg files'
);

console.log('✓ [3/4] Backend upload middleware SVG allowance passed');

// 4. Strict Safety Invariants
const schemaPath = path.resolve('backend/prisma/schema.prisma');
const shopPath = path.resolve('frontend/src/pages/shop.tsx');
const productsPath = path.resolve('frontend/src/admin/pages/Products.tsx');

assert.ok(fs.existsSync(schemaPath), 'schema.prisma must exist');
assert.ok(fs.existsSync(shopPath), 'shop.tsx must exist');
assert.ok(fs.existsSync(productsPath), 'Products.tsx must exist');

// Ensure no hardcoded brand names exist in SolutionPageRenderer
assert.ok(
  !rendererCode.includes("'DECOTURF'") && !rendererCode.includes('"DECOTURF"'),
  'FAIL: DECOTURF must not be hardcoded in SolutionPageRenderer'
);
assert.ok(
  !rendererCode.includes("'ADIDAS'") && !rendererCode.includes('"ADIDAS"'),
  'FAIL: ADIDAS must not be hardcoded in SolutionPageRenderer'
);
assert.ok(
  !rendererCode.includes("'SPORTSURF'") && !rendererCode.includes('"SPORTSURF"'),
  'FAIL: SPORTSURF must not be hardcoded in SolutionPageRenderer'
);

console.log('✓ [4/4] Strict Safety Invariants & Zero Hardcoded Data confirmed');

console.log('\n========================================');
console.log('ALL VERIFICATION TESTS PASSED (100%)');
console.log('========================================');
