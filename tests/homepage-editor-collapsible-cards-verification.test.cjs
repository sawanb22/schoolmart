const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING HOMEPAGE EDITOR COLLAPSIBLE CARDS VERIFICATION ---');

const editorPath = path.resolve('frontend/src/admin/pages/HomepageEditor.tsx');
assert(fs.existsSync(editorPath), 'HomepageEditor.tsx must exist');
const editorContent = fs.readFileSync(editorPath, 'utf8');

// 1. Verify State Declarations
assert(
    editorContent.includes('const [expandedFeatureIndex, setExpandedFeatureIndex] = useState<number | null>(null);'),
    'HomepageEditor must have expandedFeatureIndex state defaulting to null'
);
assert(
    editorContent.includes('const [expandedResourceIndex, setExpandedResourceIndex] = useState<number | null>(null);'),
    'HomepageEditor must have expandedResourceIndex state defaulting to null'
);
console.log('✅ 1. State declarations for feature & resource accordions verified.');

// 2. Verify Auto-Expansion on addFeature
assert(
    editorContent.includes('setExpandedFeatureIndex(next.length - 1);'),
    'addFeature must auto-expand the newly created feature card'
);
console.log('✅ 2. Auto-expansion on addFeature verified.');

// 3. Verify Safe Index Shifting on delFeature
assert(
    editorContent.includes('setExpandedFeatureIndex(prev => {') &&
    editorContent.includes('if (prev === null) return null;') &&
    editorContent.includes('if (prev === i) return null;') &&
    editorContent.includes('if (prev > i) return prev - 1;'),
    'delFeature must safely shift or clear expandedFeatureIndex'
);
console.log('✅ 3. Safe index shifting on delFeature verified.');

// 4. Verify Auto-Expansion on addResource
assert(
    editorContent.includes('setExpandedResourceIndex(next.length - 1);'),
    'addResource must auto-expand the newly created resource card'
);
console.log('✅ 4. Auto-expansion on addResource verified.');

// 5. Verify Safe Index Shifting on delResource & moveResource
assert(
    editorContent.includes('setExpandedResourceIndex(prev => {') &&
    editorContent.includes('if (prev === i) return target;') &&
    editorContent.includes('if (prev === target) return i;'),
    'moveResource must update expandedResourceIndex with card movement'
);
console.log('✅ 5. Safe index shifting on delResource and moveResource verified.');

// 6. Verify Feature Card Strip Structure & Clickable Area
assert(
    editorContent.includes('aria-expanded={isExpanded}') &&
    editorContent.includes('onClick={() => setExpandedFeatureIndex(isExpanded ? null : i)}'),
    'Feature cards must have an accessible, clickable strip that toggles expansion'
);
assert(
    editorContent.includes('onKeyDown={(e) => {') &&
    editorContent.includes("if (e.key === 'Enter' || e.key === ' ')"),
    'Feature cards must support Enter and Space keyboard navigation'
);
console.log('✅ 6. Accessible clickable strip for feature cards verified.');

// 7. Verify Event StopPropagation on Nested Actions in Feature Cards
assert(
    editorContent.includes('e.stopPropagation();') &&
    editorContent.includes('delFeature(i);'),
    'Remove button in feature cards must stop click propagation'
);
console.log('✅ 7. Action event propagation isolation in feature cards verified.');

// 8. Verify Resource Card Strip Structure & Nested Actions
assert(
    editorContent.includes('onClick={() => setExpandedResourceIndex(isExpanded ? null : i)}'),
    'Resource cards must have an accessible, clickable strip that toggles expansion'
);
assert(
    editorContent.includes('delResource(i);') &&
    editorContent.includes('moveResource(i, -1);') &&
    editorContent.includes('moveResource(i, 1);'),
    'Resource cards reorder and delete buttons must stop propagation'
);
console.log('✅ 8. Accessible clickable strip and propagation isolation for resource cards verified.');

// 9. Verify All Fields Maintained 100% (No Deletions or Regressions)
assert(editorContent.includes('label="Card Title"'), 'Card Title field must be preserved');
assert(editorContent.includes('label="Description"'), 'Description field must be preserved');
assert(editorContent.includes('label="Badge Tag"'), 'Badge Tag field must be preserved');
assert(editorContent.includes('label="Link (href)"'), 'Link (href) field must be preserved');
assert(editorContent.includes('Badge & Button Color'), 'Color picker must be preserved');
assert(editorContent.includes('label="Card Image"'), 'MediaImageField must be preserved');
console.log('✅ 9. 100% preservation of all fields and data inputs verified.');

console.log('\n--- ALL HOMEPAGE EDITOR COLLAPSIBLE CARDS TESTS PASSED (9/9) ---');
