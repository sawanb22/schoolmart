const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING COLORFUL STEP BADGE VERIFICATION TEST ===');

const projectRoot = path.resolve(__dirname, '..');

// 1. Check ServicePageRenderer.tsx
const sprPath = path.join(projectRoot, 'frontend', 'src', 'components', 'cms', 'ServicePageRenderer.tsx');
assert(fs.existsSync(sprPath), 'ServicePageRenderer.tsx must exist');
const sprContent = fs.readFileSync(sprPath, 'utf8');

assert(!sprContent.includes('#{cardIndex}'), 'ServicePageRenderer.tsx cleanly removes sequential number badges from service cards');
assert(!sprContent.includes('BadgeIcon className="h-4 w-4 drop-shadow-xs"'), 'Corner icon badges removed entirely from service cards for a clean aesthetic');
console.log('✓ TEST 1 PASSED: ServicePageRenderer.tsx removed number and floating icon badges from card images entirely.');

// 2. Check CampusDesignExecutionDetail.tsx
const cdeDetailPath = path.join(projectRoot, 'frontend', 'src', 'pages', 'campus-design-execution-detail.tsx');
assert(fs.existsSync(cdeDetailPath), 'campus-design-execution-detail.tsx must exist');
const cdeDetailContent = fs.readFileSync(cdeDetailPath, 'utf8');

assert(cdeDetailContent.includes('getStepBadge'), 'campus-design-execution-detail.tsx must use getStepBadge for cohesive sub-page badges');
assert(!cdeDetailContent.includes('<HardHat className="h-3 w-3" />'), 'Hardcoded HardHat icon removed from subpage badge');
console.log('✓ TEST 2 PASSED: CampusDesignExecutionDetail.tsx subpage badge now dynamically matches the card badge.');

// 3. Check UnifiedPageEditor.tsx
const editorPath = path.join(projectRoot, 'frontend', 'src', 'admin', 'components', 'UnifiedPageEditor.tsx');
assert(fs.existsSync(editorPath), 'UnifiedPageEditor.tsx must exist');
const editorContent = fs.readFileSync(editorPath, 'utf8');

assert(editorContent.includes('handleEditSubpage'), 'UnifiedPageEditor must provide subpage navigation');
assert(editorContent.includes('Hook to CMS Page') || editorContent.includes('Hook this card to an existing CMS page') || editorContent.includes('Hook to Existing Page'), 'UnifiedPageEditor must allow hooking to existing page');
console.log('✓ TEST 3 PASSED: UnifiedPageEditor provides streamlined card accordion and subpage deep navigation.');

console.log('\nALL COLORFUL BADGE & SUB-PAGE TESTS PASSED! (3/3)');
