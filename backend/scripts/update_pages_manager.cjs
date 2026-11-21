const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/admin/pages/PagesManager.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update initialPageData and api.post call
const targetInitialPageData = `        const initialPageData = newPageType === 'article'
            ? {
                category: '',
                heroTitle: title,
                heroImage: '',
                body: '<p>Write your detailed article and content here...</p>',
                ctaTitle: '',
                ctaSubtitle: '',
                ctaButtonLabel: '',
                ctaHref: '/contact-us',
                hideHero: false,
                hideBody: false,
                hideCta: true,
            }
            : {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Solutions & Offerings',
                cards: [],
                ctaTitle: '',
                ctaSubtitle: '',
                ctaButtonLabel: '',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: true,
                styles: {
                    headingFont: 'playfair',
                    bodyFont: 'opensans',
                    primaryColor: '#ea580c',
                    heroBg: 'amber',
                    ctaBg: 'stone',
                    heroLayout: 'split-right',
                    cardColumns: '3',
                    showFeatured: true,
                    showFilters: true,
                },
            };

        try {
            const { data } = await api.post('/pages', {
                title,
                slug,
                template: newPageType === 'article' ? 'article' : 'grid',
                published: true,
                pageData: JSON.stringify(initialPageData)
            });`;

const replacementInitialPageData = `        const initialPageData = newPageType === 'article'
            ? {
                category: '',
                heroTitle: title,
                heroImage: '',
                body: '<p>Write your detailed article and content here...</p>',
                ctaTitle: '',
                ctaSubtitle: '',
                ctaButtonLabel: '',
                ctaHref: '/contact-us',
                hideHero: false,
                hideBody: false,
                hideCta: true,
            }
            : newPageType === 'solution-hub'
            ? {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Facilities & Solutions',
                cards: [],
                ctaTitle: 'Ready to Elevate Your Campus Facilities?',
                ctaSubtitle: 'Partner with our specialists to plan, equip, and maintain state-of-the-art infrastructure.',
                ctaButtonLabel: 'Get Project Audit',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: false,
                styles: {
                    headingFont: 'poppins',
                    bodyFont: 'opensans',
                    primaryColor: '#0047ab',
                    heroBg: '#002a6c',
                    ctaBg: '#002a6c',
                    heroLayout: 'split-right',
                    cardColumns: '3',
                    showFeatured: false,
                    showFilters: true,
                },
            }
            : newPageType === 'service-suite'
            ? {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Phases & Execution Steps',
                stepCountLabel: 'Phases',
                readMoreLabel: 'Explore Service',
                cards: [],
                ctaTitle: 'Ready to Execute Your Campus Project?',
                ctaSubtitle: 'Share your project scope, area, and timelines with our architectural and engineering team.',
                ctaButtonLabel: 'Get a Project Quote',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: false,
                styles: {
                    headingFont: 'poppins',
                    bodyFont: 'opensans',
                    primaryColor: '#0047ab',
                    heroBg: 'white',
                    ctaBg: '#002a6c',
                    heroLayout: 'minimal',
                    cardColumns: '3',
                    showFeatured: false,
                    showFilters: false,
                },
            }
            : {
                heroEyebrow: '',
                heroTitle: title,
                heroSubtitle: '',
                heroImage: '',
                section1Title: 'Solutions & Offerings',
                cards: [],
                ctaTitle: '',
                ctaSubtitle: '',
                ctaButtonLabel: '',
                ctaHref: '/contact-us',
                hideHero: false,
                hideCards: false,
                hideCta: true,
                styles: {
                    headingFont: 'poppins',
                    bodyFont: 'opensans',
                    primaryColor: '#0047ab',
                    heroBg: 'blue',
                    ctaBg: '#002a6c',
                    heroLayout: 'split-right',
                    cardColumns: '3',
                    showFeatured: false,
                    showFilters: true,
                },
            };

        try {
            const { data } = await api.post('/pages', {
                title,
                slug,
                template: newPageType,
                published: true,
                pageData: JSON.stringify(initialPageData)
            });`;

// Normalize CRLF to LF for matching, then restore CRLF if needed
const isCRLF = content.includes('\r\n');
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetInitialPageData.replace(/\r\n/g, '\n');
const normalizedReplacement = replacementInitialPageData.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedTarget)) {
  console.error('[ERR] Target initialPageData not found!');
  process.exit(1);
}

let updated = normalizedContent.replace(normalizedTarget, normalizedReplacement);

// 2. Update Template UI Selector
const targetUI = `<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setNewPageType('article')}
                                className={\`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 \${
                                    newPageType === 'article'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }\`}
                            >
                                <div className={\`p-2.5 rounded-lg shrink-0 \${newPageType === 'article' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">📄 Detail / Article Page</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Recommended</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For linking from any card (Classifieds, Solutions, Programs). Features rich text description, cover image, highlights, and enquiry CTA button.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('grid')}
                                className={\`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 \${
                                    newPageType === 'grid'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }\`}
                            >
                                <div className={\`p-2.5 rounded-lg shrink-0 \${newPageType === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🗂️ Hub / Grid Page</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Collection of interactive cards, filters, and categories (like a category landing page or directory).
                                    </p>
                                </div>
                            </button>
                        </div>`;

const replacementUI = `<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <button
                                type="button"
                                onClick={() => setNewPageType('article')}
                                className={\`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 \${
                                    newPageType === 'article'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }\`}
                            >
                                <div className={\`p-2.5 rounded-lg shrink-0 \${newPageType === 'article' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">📄 Detail / Article Page</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Group 1</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For policies, guidelines, announcements, and deep-dive article reading. Features rich text editor and inquiry CTA.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('grid')}
                                className={\`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 \${
                                    newPageType === 'grid'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }\`}
                            >
                                <div className={\`p-2.5 rounded-lg shrink-0 \${newPageType === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🗂️ Knowledge & Guide Hub</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Group 2</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Interactive guides and directory cards (e.g. AI Guide, College Setup, UGC Guidelines). Features 12-card pagination.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('solution-hub')}
                                className={\`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 \${
                                    newPageType === 'solution-hub'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }\`}
                            >
                                <div className={\`p-2.5 rounded-lg shrink-0 \${newPageType === 'solution-hub' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🏟️ Solution Infrastructure Hub</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Group 4</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For physical campus infra, labs, libraries, and sports products. Includes wishlist heart engine and category filter.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewPageType('service-suite')}
                                className={\`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 \${
                                    newPageType === 'service-suite'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }\`}
                            >
                                <div className={\`p-2.5 rounded-lg shrink-0 \${newPageType === 'service-suite' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                    <Compass className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">🏗️ Turnkey Service & Execution</span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Group 5</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        For phased service delivery and architectural execution (e.g. Design & Execution, Furniture Design). Features step badges.
                                    </p>
                                </div>
                            </button>
                        </div>`;

if (!updated.includes(targetUI)) {
  console.error('[ERR] Target UI not found!');
  process.exit(1);
}

updated = updated.replace(targetUI, replacementUI);

// 3. Update Create button label
updated = updated.replace(
  "Create {newPageType === 'article' ? 'Article Page' : 'Grid Page'}",
  "Create {newPageType === 'article' ? 'Article Page' : newPageType === 'solution-hub' ? 'Solution Hub' : newPageType === 'service-suite' ? 'Service Suite' : 'Grid Hub'}"
);

// 4. Update table template badges
const targetBadge = `{page.template === 'article' ? 'ARTICLE' : page.template ? 'REACT' : 'HTML'}`;
const replacementBadge = `{page.template === 'article' ? 'ARTICLE' : page.template === 'solution-hub' ? 'SOLUTION' : page.template === 'service-suite' ? 'SERVICE' : page.template ? 'REACT' : 'HTML'}`;

updated = updated.replace(targetBadge, replacementBadge);

// Restore CRLF if file originally had it
if (isCRLF) {
  updated = updated.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, updated, 'utf8');
console.log('[OK] PagesManager.tsx successfully updated with 4 template choices!');
