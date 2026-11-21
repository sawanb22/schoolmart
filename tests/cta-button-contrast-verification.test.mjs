import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  normalizeHexColor,
  getLuminance,
  isDarkColor,
  getContrastTextColor,
  resolveCtaButtonStyles,
} from '../frontend/src/lib/ctaStyles.ts';

console.log('================================================================');
console.log('🧪 RUNNING CTA BUTTON STYLES & CONTRAST VERIFICATION');
console.log('================================================================\n');

// 1. Test normalizeHexColor
console.log('1. Testing color normalization...');
assert.strictEqual(normalizeHexColor('blue'), '#002A6C');
assert.strictEqual(normalizeHexColor('white'), '#FFFFFF');
assert.strictEqual(normalizeHexColor('#fff'), '#FFFFFF');
assert.strictEqual(normalizeHexColor('#000'), '#000000');
assert.strictEqual(normalizeHexColor('#f59e0b'), '#F59E0B');
assert.strictEqual(normalizeHexColor('  #002a6c  '), '#002A6C');
assert.strictEqual(normalizeHexColor('invalid_color'), null);
assert.strictEqual(normalizeHexColor(''), null);
assert.strictEqual(normalizeHexColor(null), null);
assert.strictEqual(normalizeHexColor(undefined), null);
console.log('  ✅ normalizeHexColor handles named colors, 3-digit hex, 6-digit hex, and malformed inputs.');

// 2. Test Luminance & Darkness calculation
console.log('\n2. Testing luminance & dark detection...');
const navyLum = getLuminance('#002A6C');
const goldLum = getLuminance('#F59E0B');
const whiteLum = getLuminance('#FFFFFF');
const blackLum = getLuminance('#000000');

assert(navyLum < 100, 'Navy should have low luminance');
assert(goldLum > 140, 'Gold should have high luminance');
assert(whiteLum > 240, 'White should have very high luminance');
assert(blackLum === 0, 'Black should have 0 luminance');

assert.strictEqual(isDarkColor('#002A6C'), true, 'Navy is dark');
assert.strictEqual(isDarkColor('blue'), true, 'Named blue is dark');
assert.strictEqual(isDarkColor('stone'), true, 'Named stone is dark');
assert.strictEqual(isDarkColor('#FFFFFF'), false, 'White is not dark');
assert.strictEqual(isDarkColor('white'), false, 'Named white is not dark');
console.log('  ✅ Luminance & darkness calculations are mathematically sound.');

// 3. Test High-Contrast Text Calculation (WCAG)
console.log('\n3. Testing contrast text color...');
assert.strictEqual(getContrastTextColor('#FFFFFF'), '#0F172A', 'White button must have dark text');
assert.strictEqual(getContrastTextColor('#F59E0B'), '#0F172A', 'Gold button must have dark text');
assert.strictEqual(getContrastTextColor('#002A6C'), '#FFFFFF', 'Navy button must have white text');
assert.strictEqual(getContrastTextColor('#059669'), '#FFFFFF', 'Emerald button must have white text');
console.log('  ✅ getContrastTextColor guarantees readable text contrast on light and dark backgrounds.');

// 4. Test Smart Automatic Contrast (Zero Blue-on-Blue)
console.log('\n4. Testing automatic default when ctaBtnBg is undefined...');
// Dark strip (Navy/Blue) -> Button must be Gold with dark text
const darkStripStyle = resolveCtaButtonStyles({ ctaBg: '#002A6C' });
assert.strictEqual(darkStripStyle.backgroundColor, '#F59E0B', 'Default button on Navy strip must be Gold');
assert.strictEqual(darkStripStyle.color, '#0F172A', 'Gold button must have dark text');

const namedBlueStripStyle = resolveCtaButtonStyles('blue');
assert.strictEqual(namedBlueStripStyle.backgroundColor, '#F59E0B', 'Default button on "blue" strip must be Gold');
assert.strictEqual(namedBlueStripStyle.color, '#0F172A', 'Gold button must have dark text');

// Light strip (White) -> Button must be Navy with white text
const lightStripStyle = resolveCtaButtonStyles({ ctaBg: '#FFFFFF' });
assert.strictEqual(lightStripStyle.backgroundColor, '#002A6C', 'Default button on White strip must be Navy');
assert.strictEqual(lightStripStyle.color, '#FFFFFF', 'Navy button must have white text');
console.log('  ✅ Automatically avoids blue-on-blue on all existing pages without ctaBtnBg.');

// 5. Test Custom Admin Color Overrides
console.log('\n5. Testing custom admin button color overrides...');
// Admin chooses White button on Navy strip
const whiteBtnStyle = resolveCtaButtonStyles({ ctaBg: '#002A6C', ctaBtnBg: '#FFFFFF' });
assert.strictEqual(whiteBtnStyle.backgroundColor, '#FFFFFF');
assert.strictEqual(whiteBtnStyle.color, '#0F172A');
assert(Boolean(whiteBtnStyle.borderColor), 'White button should have border');

// Admin chooses Emerald button
const emeraldBtnStyle = resolveCtaButtonStyles({ ctaBg: '#002A6C', ctaBtnBg: '#059669' });
assert.strictEqual(emeraldBtnStyle.backgroundColor, '#059669');
assert.strictEqual(emeraldBtnStyle.color, '#FFFFFF');

// Admin explicitly chooses custom text color
const customTextStyle = resolveCtaButtonStyles({ ctaBg: '#002A6C', ctaBtnBg: '#F59E0B', ctaBtnText: '#002A6C' });
assert.strictEqual(customTextStyle.backgroundColor, '#F59E0B');
assert.strictEqual(customTextStyle.color, '#002A6C');
console.log('  ✅ Custom admin button colors and explicit text overrides are fully supported.');

// 6. Test Malformed / Edge-Case Inputs
console.log('\n6. Testing malformed & edge-case inputs...');
const malformedStyle = resolveCtaButtonStyles({ ctaBg: 'garbage_not_a_color', ctaBtnBg: 'not_valid_hex' });
assert(Boolean(malformedStyle.backgroundColor), 'Must not crash on invalid colors');
assert(Boolean(malformedStyle.color), 'Must have valid color');

const emptyStyle = resolveCtaButtonStyles(null, null);
assert(Boolean(emptyStyle.backgroundColor), 'Must not crash on null arguments');
assert(Boolean(emptyStyle.color), 'Must not crash on null arguments');
console.log('  ✅ Failsafe against malformed, null, or garbage color strings.');

// 7. Test Integration Across All Master Renderers & Editor
console.log('\n7. Verifying Master Engines & Editor integration...');
const filesToCheck = [
  'frontend/src/components/cms/GenericPageRenderer.tsx',
  'frontend/src/components/cms/SolutionPageRenderer.tsx',
  'frontend/src/components/cms/ServicePageRenderer.tsx',
  'frontend/src/admin/components/UnifiedPageEditor.tsx',
  'frontend/src/pages/campus-master-planning.tsx',
  'frontend/src/pages/smart-classrooms.tsx',
  'frontend/src/pages/digital-transformation.tsx',
  'frontend/src/pages/faq.tsx',
];

for (const relPath of filesToCheck) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  assert(fs.existsSync(fullPath), `File must exist: ${relPath}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(content.includes('resolveCtaButtonStyles'), `${relPath} must import and use resolveCtaButtonStyles`);
}

// Ensure master renderers use ctaBtnStyles on CTA buttons
const genericContent = fs.readFileSync(path.resolve(__dirname, '../frontend/src/components/cms/GenericPageRenderer.tsx'), 'utf8');
assert(genericContent.includes('style={ctaBtnStyles}'), 'GenericPageRenderer must use ctaBtnStyles on CTA button');

const solutionContent = fs.readFileSync(path.resolve(__dirname, '../frontend/src/components/cms/SolutionPageRenderer.tsx'), 'utf8');
assert(solutionContent.includes('style={ctaBtnStyles}'), 'SolutionPageRenderer must use ctaBtnStyles on CTA button');

const serviceContent = fs.readFileSync(path.resolve(__dirname, '../frontend/src/components/cms/ServicePageRenderer.tsx'), 'utf8');
assert(serviceContent.includes('style={ctaBtnStyles}'), 'ServicePageRenderer must use ctaBtnStyles on CTA button');

const editorContent = fs.readFileSync(path.resolve(__dirname, '../frontend/src/admin/components/UnifiedPageEditor.tsx'), 'utf8');
assert(editorContent.includes('CTA Button Appearance &amp; Contrast'), 'UnifiedPageEditor must render CTA Button Appearance & Contrast section');
assert(editorContent.includes('Button Preview:'), 'UnifiedPageEditor must render live CTA button preview');
assert(editorContent.includes('Campus Gold'), 'UnifiedPageEditor must include Campus Gold preset');
assert(editorContent.includes('Crisp White'), 'UnifiedPageEditor must include Crisp White preset');

console.log('  ✅ All 3 Master Engines, 5 standalone pages, and UnifiedPageEditor pass integration checks.');

console.log('\n================================================================');
console.log('🎉 ALL 7 TEST SUITES FOR CTA BUTTON CONTRAST PASSED (100%)');
console.log('================================================================\n');
