const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 SETUP COLLEGE & SISTER PAGES LAYOUT VERIFICATION TEST');
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

const files = {
    setupArticle: {
        path: path.resolve(__dirname, '../frontend/src/pages/setup-college-article.tsx'),
        content: ''
    },
    setupPage: {
        path: path.resolve(__dirname, '../frontend/src/pages/setup-college.tsx'),
        content: ''
    },
    ugcArticle: {
        path: path.resolve(__dirname, '../frontend/src/pages/ugc-guideline-article.tsx'),
        content: ''
    },
    aiArticle: {
        path: path.resolve(__dirname, '../frontend/src/pages/ai-guide-article.tsx'),
        content: ''
    }
};

for (const key of Object.keys(files)) {
    assert(fs.existsSync(files[key].path), `File must exist: ${files[key].path}`);
    files[key].content = fs.readFileSync(files[key].path, 'utf8');
}

const allFour = [files.setupArticle, files.setupPage, files.ugcArticle, files.aiArticle];
const articlePages = [files.setupArticle, files.ugcArticle, files.aiArticle];

// 1. Antique background removal
test("All 4 files no longer contain the antique '#faf8f0' background", () => {
    for (const f of allFour) {
        assert(!f.content.includes('#faf8f0'), `File ${f.path} must not contain #faf8f0`);
    }
});

// 2. Brown serif removal
test("All 4 files no longer use 'text-[#3c2f26]' or 'font-serif'", () => {
    for (const f of allFour) {
        assert(!f.content.includes('#3c2f26'), `File ${f.path} must not contain #3c2f26`);
        assert(!f.content.includes('font-serif'), `File ${f.path} must not contain font-serif`);
    }
});

// 3. Modern bg-slate-50/60 on article pages
test("Article pages use 'bg-slate-50/60' background", () => {
    for (const f of articlePages) {
        assert(f.content.includes('bg-slate-50/60'), `File ${f.path} must use bg-slate-50/60`);
    }
});

// 4. Max width and padding container on article pages
test("Article pages use standard 'mx-auto max-w-4xl px-4 sm:px-6' container", () => {
    for (const f of articlePages) {
        assert(f.content.includes('max-w-4xl px-4 sm:px-6'), `File ${f.path} must use max-w-4xl px-4 sm:px-6 container`);
    }
});

// 5. Rounded-2xl card box on article pages
test("Article pages use 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm'", () => {
    for (const f of articlePages) {
        assert(f.content.includes('rounded-2xl border border-slate-200/80 bg-white shadow-sm'), `File ${f.path} must use rounded-2xl border border-slate-200/80 bg-white shadow-sm`);
    }
});

// 6. Title styling on article pages
test("Article pages use 'text-cm-blue-dark font-extrabold' for title", () => {
    for (const f of articlePages) {
        assert(f.content.includes('text-cm-blue-dark') && f.content.includes('font-extrabold'), `File ${f.path} must use text-cm-blue-dark font-extrabold for title`);
    }
});

// 7. RichTextContent integration
test("Article pages import and render RichTextContent", () => {
    for (const f of articlePages) {
        assert(f.content.includes("import RichTextContent from '@/components/common/RichTextContent'"), `File ${f.path} must import RichTextContent`);
        assert(f.content.includes("<RichTextContent"), `File ${f.path} must render <RichTextContent`);
    }
});

// 8. Standard CampusMart CTA Banner
test("Article pages contain standard CampusMart CTA banner with partnership link", () => {
    for (const f of articlePages) {
        assert(f.content.includes('Planning to establish or expand your campus?'), `File ${f.path} must contain planning heading in CTA`);
        assert(f.content.includes('Speak with our campus planning specialists'), `File ${f.path} must contain planning description in CTA`);
        assert(f.content.includes('to="/partnership"'), `File ${f.path} must link to /partnership in CTA`);
        assert(f.content.includes('Get Guidance'), `File ${f.path} must have 'Get Guidance' CTA button`);
        assert(f.content.includes('bg-cm-blue-dark') && f.content.includes('bg-cm-yellow'), `File ${f.path} CTA must use standard bg-cm-blue-dark and bg-cm-yellow styling`);
    }
});

// 9. Back links on article pages
test("Article pages have standard back link with ArrowLeft", () => {
    assert(files.setupArticle.content.includes('Back to Setup College'), "setup-college-article.tsx must have 'Back to Setup College' link");
    assert(files.ugcArticle.content.includes('Back to UGC Guidelines'), "ugc-guideline-article.tsx must have 'Back to UGC Guidelines' link");
    assert(files.aiArticle.content.includes('Back to AI Guide'), "ai-guide-article.tsx must have 'Back to AI Guide' link");
});

// 10. Setup College layout reset
test("frontend/src/pages/setup-college.tsx container .setup-inner width reset to standard 1280px", () => {
    assert(files.setupPage.content.includes('min(calc(100% - 48px),1280px)'), "setup-college.tsx must use min(calc(100% - 48px),1280px)");
    assert(files.setupPage.content.includes('max-width: 1280px; margin: auto;'), "setup-college.tsx must have max-width: 1280px; margin: auto;");
});

test("frontend/src/pages/setup-college.tsx .setup-title font size reset to clean clamp(40px,5vw,68px)", () => {
    assert(files.setupPage.content.includes('clamp(40px,5vw,68px)'), "setup-college.tsx must use clamp(40px,5vw,68px)");
    assert(files.setupPage.content.includes('letter-spacing:-2px'), "setup-college.tsx must use letter-spacing:-2px");
    assert(!files.setupPage.content.includes('letter-spacing:-7px'), "setup-college.tsx must no longer have giant letter-spacing:-7px");
});

test("frontend/src/pages/setup-college.tsx background adjusted to clean modern styling", () => {
    assert(!files.setupPage.content.includes('#f5f8e8'), "setup-college.tsx must no longer contain antique #f5f8e8");
    assert(files.setupPage.content.includes('bg-slate-50/60') || files.setupPage.content.includes('#f8fafc'), "setup-college.tsx must use modern slate/clean styling");
});

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) {
    process.exit(1);
}
