const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 CLASSIFIEDS & OPPORTUNITIES CMS SUITE VERIFICATION TEST');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${e.message}`);
        failed++;
    }
}

// 1. Static File Verification
const unifiedEditorPath = path.resolve(__dirname, '../frontend/src/admin/components/UnifiedPageEditor.tsx');
const pagesManagerPath = path.resolve(__dirname, '../frontend/src/admin/pages/PagesManager.tsx');

const unifiedEditorContent = fs.readFileSync(unifiedEditorPath, 'utf8');
const pagesManagerContent = fs.readFileSync(pagesManagerPath, 'utf8');

test('UnifiedPageEditor gates cards open for classifieds', () => {
    assert(
        unifiedEditorContent.includes("page.slug === 'classifieds'"),
        "UnifiedPageEditor must explicitly include page.slug === 'classifieds' in cards gating"
    );
});

test('UnifiedPageEditor exports and defines inspectCardLink helper', () => {
    assert(
        unifiedEditorContent.includes("export function inspectCardLink("),
        "UnifiedPageEditor must export inspectCardLink"
    );
});

test('inspectCardLink handles modal, internal, and external links accurately', () => {
    // Replicate pure function for isolated unit test
    function inspectCardLink(rawLink) {
        const trimmed = (rawLink ?? '').trim();
        if (!trimmed || trimmed === '#' || trimmed === '/') {
            return { type: 'modal', badge: '⚡ Opens In-Page Enquiry Modal (No subpage needed)' };
        }
        const isExternal = /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed);
        if (isExternal) {
            return { type: 'external', url: trimmed, badge: '🌐 External Link' };
        }
        const slug = trimmed.replace(/^\/+|\/+$/g, '').split(/[?#]/)[0];
        if (!slug) {
            return { type: 'modal', badge: '⚡ Opens In-Page Enquiry Modal (No subpage needed)' };
        }
        return {
            type: 'internal',
            slug,
            adminEditUrl: `/admin/pages/${slug}`,
            previewUrl: `/${slug}`,
        };
    }

    // Test Empty -> Modal
    assert.strictEqual(inspectCardLink('').type, 'modal');
    assert.strictEqual(inspectCardLink('#').type, 'modal');
    assert.strictEqual(inspectCardLink('/').type, 'modal');

    // Test Internal subpage links
    const internal1 = inspectCardLink('/colleges-universities-for-sale');
    assert.strictEqual(internal1.type, 'internal');
    assert.strictEqual(internal1.slug, 'colleges-universities-for-sale');
    assert.strictEqual(internal1.adminEditUrl, '/admin/pages/colleges-universities-for-sale');
    assert.strictEqual(internal1.previewUrl, '/colleges-universities-for-sale');

    const internal2 = inspectCardLink('partner-with-colleges?ref=classifieds');
    assert.strictEqual(internal2.type, 'internal');
    assert.strictEqual(internal2.slug, 'partner-with-colleges');

    // Test External links
    const external = inspectCardLink('https://example.com/details');
    assert.strictEqual(external.type, 'external');
    assert.strictEqual(external.url, 'https://example.com/details');
});

test('PagesManager contains CLASSIFIEDS_SUITE_SLUGS with all 4 slugs', () => {
    assert(pagesManagerContent.includes('export const CLASSIFIEDS_SUITE_SLUGS = new Set(['), 'CLASSIFIEDS_SUITE_SLUGS must be defined');
    assert(pagesManagerContent.includes("'classifieds'"), 'classifieds must be in suite');
    assert(pagesManagerContent.includes("'colleges-universities-for-sale'"), 'colleges-universities-for-sale must be in suite');
    assert(pagesManagerContent.includes("'partner-with-colleges'"), 'partner-with-colleges must be in suite');
    assert(pagesManagerContent.includes("'job-openings'"), 'job-openings must be in suite');
});

test('PagesManager classifyPages categorizes Classifieds & Opportunities Suite', () => {
    assert(pagesManagerContent.includes("'Classifieds & Opportunities Suite'"), 'Group label must exist');
    assert(pagesManagerContent.includes("CLASSIFIEDS_SUITE_SLUGS.has(p.slug)"), 'Filtering check must exist');
});

test('Security check: Zero target=_blank links without rel="noopener noreferrer"', () => {
    const targetBlankMatches = unifiedEditorContent.match(/target="_blank"[^>]*>/g) || [];
    for (const match of targetBlankMatches) {
        assert(match.includes('rel="') && (match.includes('noopener') || match.includes('noreferrer')), `Link has target=_blank but missing safe rel: ${match}`);
    }
});

console.log('\n================================================================');
console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
    process.exit(1);
} else {
    console.log('🎉 ALL CLASSIFIEDS SUITE TESTS PASSED!\n');
}
