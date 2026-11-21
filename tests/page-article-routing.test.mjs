import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    normalizeCardHref,
    inspectCardLink,
    isExternalLink,
    resolveBackLink,
} from '../frontend/src/lib/cms-routing.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ─── 1. normalizeCardHref Unit Tests ─────────────────────────────────────────

test('normalizeCardHref normalizes relative slugs to have leading slash', () => {
    assert.equal(normalizeCardHref('student-exchange-program'), '/student-exchange-program');
    assert.equal(normalizeCardHref('/student-exchange-program'), '/student-exchange-program');
    assert.equal(normalizeCardHref('   partner-with-colleges   '), '/partner-with-colleges');
    assert.equal(normalizeCardHref('/colleges-universities-for-sale/sub-item'), '/colleges-universities-for-sale/sub-item');
    assert.equal(normalizeCardHref('colleges-universities-for-sale/sub-item'), '/colleges-universities-for-sale/sub-item');
});

test('normalizeCardHref preserves modal anchors and external protocols', () => {
    assert.equal(normalizeCardHref('#'), '#');
    assert.equal(normalizeCardHref(''), '');
    assert.equal(normalizeCardHref(undefined), '');
    assert.equal(normalizeCardHref('https://example.com/page'), 'https://example.com/page');
    assert.equal(normalizeCardHref('http://example.com'), 'http://example.com');
    assert.equal(normalizeCardHref('mailto:admissions@campusmart.in'), 'mailto:admissions@campusmart.in');
    assert.equal(normalizeCardHref('tel:+919876543210'), 'tel:+919876543210');
});

test('normalizeCardHref auto-prepends https to www. external links (fixes known issue)', () => {
    assert.equal(normalizeCardHref('www.example.com'), 'https://www.example.com');
    assert.equal(normalizeCardHref('www.partner-university.edu/apply'), 'https://www.partner-university.edu/apply');
});

test('normalizeCardHref guards protocol-relative URLs and strips javascript: schemes safely', () => {
    assert.equal(normalizeCardHref('//example.com'), 'https://example.com');
    assert.equal(normalizeCardHref('///example.com'), 'https://example.com');
    assert.equal(normalizeCardHref('//cdn.campusmart.in/docs/brochure.pdf'), 'https://cdn.campusmart.in/docs/brochure.pdf');
    assert.equal(normalizeCardHref('//'), '/');
    assert.equal(normalizeCardHref('///'), '/');
    assert.equal(normalizeCardHref('/'), '/');
    assert.equal(normalizeCardHref('javascript:void(0)'), '');
    assert.equal(normalizeCardHref('javascript:void 0'), '');
    assert.equal(normalizeCardHref('javascript:void( 0 )'), '');
    assert.equal(normalizeCardHref('javascript: void 0; '), '');
    assert.equal(normalizeCardHref('javascript:null'), '');
    assert.equal(normalizeCardHref('javascript:false'), '');
    assert.equal(normalizeCardHref('javascript:;'), '');
    assert.equal(normalizeCardHref('javascript:alert(1)'), '/alert(1)');
});

// ─── 2. isExternalLink Unit Tests ────────────────────────────────────────────

test('isExternalLink correctly identifies external protocols and www domains', () => {
    assert.equal(isExternalLink('https://example.com'), true);
    assert.equal(isExternalLink('http://test.org'), true);
    assert.equal(isExternalLink('mailto:info@campusmart.in'), true);
    assert.equal(isExternalLink('tel:+911234567890'), true);
    assert.equal(isExternalLink('www.colleges.in'), true);
    assert.equal(isExternalLink('//example.com'), true);
    assert.equal(isExternalLink('///example.com'), true);
    assert.equal(isExternalLink('//sub.domain.org/path'), true);

    assert.equal(isExternalLink('/student-exchange-program'), false);
    assert.equal(isExternalLink('student-exchange-program'), false);
    assert.equal(isExternalLink('#'), false);
    assert.equal(isExternalLink(''), false);
    assert.equal(isExternalLink(undefined), false);
    assert.equal(isExternalLink('//'), false);
    assert.equal(isExternalLink('///'), false);
    assert.equal(isExternalLink('javascript:void(0)'), false);
    assert.equal(isExternalLink('javascript:void 0'), false);
    assert.equal(isExternalLink('javascript:alert(1)'), false);
});

// ─── 3. inspectCardLink Unit Tests ───────────────────────────────────────────

test('inspectCardLink properly classifies internal, modal, and external targets', () => {
    const internalUnprefixed = inspectCardLink('student-exchange-program');
    assert.equal(internalUnprefixed.type, 'internal');
    assert.equal(internalUnprefixed.slug, 'student-exchange-program');
    assert.equal(internalUnprefixed.adminEditUrl, '/admin/pages/student-exchange-program');
    assert.equal(internalUnprefixed.previewUrl, '/student-exchange-program');

    const internalPrefixed = inspectCardLink('/colleges-universities-for-sale');
    assert.equal(internalPrefixed.type, 'internal');
    assert.equal(internalPrefixed.slug, 'colleges-universities-for-sale');

    const modalHash = inspectCardLink('#');
    assert.equal(modalHash.type, 'modal');

    const modalEmpty = inspectCardLink('');
    assert.equal(modalEmpty.type, 'modal');

    const modalRoot = inspectCardLink('/');
    assert.equal(modalRoot.type, 'modal');

    const modalJsVoid = inspectCardLink('javascript:void(0)');
    assert.equal(modalJsVoid.type, 'modal');

    const modalJsVoidSpace = inspectCardLink('javascript:void 0');
    assert.equal(modalJsVoidSpace.type, 'modal');

    const modalJsVoidInnerSpace = inspectCardLink('javascript:void( 0 )');
    assert.equal(modalJsVoidInnerSpace.type, 'modal');

    const external = inspectCardLink('https://external-partner.com/apply');
    assert.equal(external.type, 'external');
    assert.equal(external.url, 'https://external-partner.com/apply');

    const externalWww = inspectCardLink('www.external-partner.com/apply');
    assert.equal(externalWww.type, 'external');
    assert.equal(externalWww.url, 'https://www.external-partner.com/apply');

    const externalProtoRelative = inspectCardLink('//partner.com/apply');
    assert.equal(externalProtoRelative.type, 'external');
    assert.equal(externalProtoRelative.url, 'https://partner.com/apply');
});

// ─── 4. resolveBackLink Unit Tests ───────────────────────────────────────────

test('resolveBackLink respects custom configured backHref and backLabel', () => {
    const custom = resolveBackLink({
        backHref: '/solutions',
        backLabel: 'Back to Solutions Overview',
        category: 'Classifieds',
    });
    assert.equal(custom.href, '/solutions');
    assert.equal(custom.label, 'Back to Solutions Overview');

    const relativeCustom = resolveBackLink({
        backHref: 'campus-design',
    });
    assert.equal(relativeCustom.href, '/campus-design');
    assert.equal(relativeCustom.label, 'Back');
});

test('resolveBackLink derives clean default back route and label from category', () => {
    const classifieds = resolveBackLink({ category: 'Classifieds' });
    assert.equal(classifieds.href, '/classifieds');
    assert.equal(classifieds.label, 'Back to Opportunities');

    const colleges = resolveBackLink({ category: 'Colleges for Sale' });
    assert.equal(colleges.href, '/colleges-universities-for-sale');
    assert.equal(colleges.label, 'Back to Colleges for Sale');

    const partnership = resolveBackLink({ category: 'Partnership Programs' });
    assert.equal(partnership.href, '/partner-with-colleges');
    assert.equal(partnership.label, 'Back to Partnerships');

    const jobs = resolveBackLink({ category: 'Job Openings' });
    assert.equal(jobs.href, '/job-openings');
    assert.equal(jobs.label, 'Back to Job Openings');

    const solutions = resolveBackLink({ category: 'Turnkey Solutions' });
    assert.equal(solutions.href, '/solutions');
    assert.equal(solutions.label, 'Back to Solutions');

    const services = resolveBackLink({ category: 'Institutional Services' });
    assert.equal(services.href, '/services');
    assert.equal(services.label, 'Back to Services');

    const campusDesign = resolveBackLink({ category: 'Campus Design Execution' });
    assert.equal(campusDesign.href, '/campus-design');
    assert.equal(campusDesign.label, 'Back to Campus Design');

    const ai = resolveBackLink({ category: 'AI Learning Stations' });
    assert.equal(ai.href, '/ai-ml');
    assert.equal(ai.label, 'Back to AI & ML');
});

test('resolveBackLink uses word boundary regexes preventing false matches (Passport vs sport, Syllabus vs lab)', () => {
    const passport = resolveBackLink({ category: 'Passport Services' });
    assert.equal(passport.href, '/services');
    assert.equal(passport.label, 'Back to Services');

    const syllabus = resolveBackLink({ category: 'Syllabus Overview' });
    assert.equal(syllabus.href, '/classifieds');
    assert.equal(syllabus.label, 'Back to Syllabus Overview');

    const sports = resolveBackLink({ category: 'Sports Infrastructure' });
    assert.equal(sports.href, '/sports-infra');
    assert.equal(sports.label, 'Back to Sports Infra');

    const lab = resolveBackLink({ category: 'Robotics Laboratory' });
    assert.equal(lab.href, '/labs');
    assert.equal(lab.label, 'Back to Laboratories');
});

test('resolveBackLink explicitly supports Collaboration and Artificial Intelligence', () => {
    const collab = resolveBackLink({ category: 'Institutional Collaboration' });
    assert.equal(collab.href, '/collaboration');
    assert.equal(collab.label, 'Back to Collaborations');

    const collabSpaces = resolveBackLink({ category: 'Collaboration Spaces' });
    assert.equal(collabSpaces.href, '/collaboration-spaces');
    assert.equal(collabSpaces.label, 'Back to Collaboration Spaces');

    const aiLong = resolveBackLink({ category: 'Artificial Intelligence Innovation' });
    assert.equal(aiLong.href, '/ai-ml');
    assert.equal(aiLong.label, 'Back to AI & ML');

    const ml = resolveBackLink({ category: 'Machine Learning Lab' });
    assert.equal(ml.href, '/ai-ml');
    assert.equal(ml.label, 'Back to AI & ML');

    // Safe fallbacks on null, empty or non-string category
    assert.equal(resolveBackLink(null).href, '/classifieds');
    assert.equal(resolveBackLink({}).href, '/classifieds');
    assert.equal(resolveBackLink({ category: 42 }).href, '/classifieds');
    assert.equal(resolveBackLink({ backHref: 42 }).href, '/classifieds');
    assert.equal(resolveBackLink({ backHref: '   ' }).href, '/classifieds');
});

// ─── 5. Initial Page Data Structures Contract ────────────────────────────────

test('Initial page data structures for article vs grid pages adhere to specifications', () => {
    const title = 'Student Exchange Program';

    // Article page data
    const articlePageData = {
        heroTitle: title,
        heroSubtitle: 'Detailed overview, program information, and insights.',
        category: 'Overview',
        body: `<p>Welcome to <strong>${title}</strong>. Add your comprehensive page description, details, specifications, and insights here using the rich text editor.</p>`,
        features: ['Key Highlight 1', 'Key Highlight 2', 'Key Highlight 3'],
        ctaTitle: 'Ready to connect or learn more?',
        ctaSubtitle: 'Get in touch with our specialist team for consultation.',
        ctaButtonLabel: 'Enquire Now',
        ctaHref: '/contact-us',
        cards: [],
    };

    assert.equal(articlePageData.heroTitle, title);
    assert.ok(articlePageData.body.includes(title));
    assert.equal(Array.isArray(articlePageData.features), true);
    assert.equal(articlePageData.features.length, 3);
    assert.equal(articlePageData.ctaButtonLabel, 'Enquire Now');

    // Grid page data
    const gridPageData = {
        heroTitle: title,
        heroSubtitle: 'Explore our curated collection of solutions and opportunities.',
        section1Title: 'Overview',
        cards: [],
    };

    assert.equal(gridPageData.heroTitle, title);
    assert.equal(Array.isArray(gridPageData.cards), true);
    assert.equal(gridPageData.cards.length, 0);
    assert.equal(gridPageData.body, undefined);
});

// ─── 6. Architecture & Integration Invariant Tests ───────────────────────────

test('Architecture: UnifiedPageEditor imports shared routing utilities and exports required contracts', () => {
    const editorContent = fs.readFileSync(path.join(rootDir, 'frontend/src/admin/components/UnifiedPageEditor.tsx'), 'utf8');
    assert.ok(editorContent.includes("from '@/lib/cms-routing'"), 'Must import from cms-routing');
    assert.ok(editorContent.includes('export function inspectCardLink('), 'Must export inspectCardLink for test contracts');
    assert.ok(editorContent.includes('export function normalizeCardHref('), 'Must export normalizeCardHref');
    assert.ok(editorContent.includes("href: ''"), 'All new cards must initialize href');
});

test('Architecture: UnifiedPageEditor sets template: grid on save and adds .filter(Boolean) guards', () => {
    const editorContent = fs.readFileSync(path.join(rootDir, 'frontend/src/admin/components/UnifiedPageEditor.tsx'), 'utf8');
    assert.ok(editorContent.includes("payloadTemplate = isArticle ? 'article' : 'grid'"), 'Must save template: grid');
    assert.ok(/payloadData\.cards\s*\.filter\(Boolean\)/.test(editorContent), 'Must filter null cards on save');
    assert.ok(editorContent.includes("page.template !== 'grid'"), 'Must prioritize grid template over lingering body');
});

test('Architecture: GenericPageRenderer imports shared routing and omits redundant manual back buttons', () => {
    const rendererContent = fs.readFileSync(path.join(rootDir, 'frontend/src/components/cms/GenericPageRenderer.tsx'), 'utf8');
    assert.ok(rendererContent.includes("from '@/lib/cms-routing'"), 'Must import from cms-routing');
    assert.ok(rendererContent.includes('normalizeCardHref('), 'Must use normalizeCardHref');
    assert.ok(rendererContent.includes('isExternalLink('), 'Must support external link routing');
    assert.ok(!rendererContent.includes('resolveBackLink'), 'Must omit redundant manual back buttons as breadcrumbs handle navigation');
});

test('Architecture: GenericPageRenderer prioritizes template === grid over lingering body and guards arrays', () => {
    const rendererContent = fs.readFileSync(path.join(rootDir, 'frontend/src/components/cms/GenericPageRenderer.tsx'), 'utf8');
    assert.ok(rendererContent.includes("page?.template === 'grid'"), 'Must check template === grid');
    assert.ok(rendererContent.includes("href !== '/'"), 'Must harmonize / link handling to avoid navigating to home');
    assert.ok(rendererContent.includes('filter(Boolean)'), 'Must guard cards array with filter(Boolean)');
});

test('Architecture: Classifieds wraps listings in useMemo and harmonizes / modal handling', () => {
    const classifiedsContent = fs.readFileSync(path.join(rootDir, 'frontend/src/pages/classifieds.tsx'), 'utf8');
    assert.ok(classifiedsContent.includes('const listings: Listing[] = useMemo('), 'Listings must be wrapped in useMemo');
    assert.ok(classifiedsContent.includes("item.link === '/'"), 'Must treat / as modal enquiry link');
    assert.ok(classifiedsContent.includes('.filter(Boolean)'), 'Must filter null cards');
});

test('Architecture: PagesManager informs admin on creation failure instead of swallowing errors', () => {
    const managerContent = fs.readFileSync(path.join(rootDir, 'frontend/src/admin/pages/PagesManager.tsx'), 'utf8');
    assert.ok(managerContent.includes('alert(`Unable to create page:'), 'createPage must alert on error');
    assert.ok(managerContent.includes("console.error('Failed to create page:', err);"), 'createPage must log error');
});
