const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../src/admin/components/UnifiedPageEditor.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF temporarily for regex reliability
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Replace CardCategoriesField
const startMarker = 'function CardCategoriesField({';
const endMarker = '// ─── Normalizes card hrefs to ensure internal subpages have a leading slash ───';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find CardCategoriesField markers:', { startIndex, endIndex });
    process.exit(1);
}

const newCardCategoriesField = `function CardCategoriesField({
    categories = [],
    availableCategories = [],
    onChange,
    pageSlug,
}: {
    categories?: string[];
    availableCategories: string[];
    onChange: (cats: string[]) => void;
    onAddGlobalCategory?: (cat: string) => void;
    pageSlug?: string;
}) {
    const currentCats = Array.isArray(categories) ? categories : [];

    const handleToggle = (cat: string) => {
        if (currentCats.some((c) => c.toLowerCase() === cat.toLowerCase())) {
            onChange(currentCats.filter((c) => c.toLowerCase() !== cat.toLowerCase()));
        } else {
            onChange([...currentCats, cat]);
        }
    };

    return (
        <div className="space-y-2 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Categories (Card Filter Chips)
                </label>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-2 py-0.5 rounded-full">
                    {currentCats.length} assigned
                </span>
            </div>

            {availableCategories.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-2">
                    <span>No categories registered for this page yet. Use the central Categories page to add them.</span>
                    {pageSlug && (
                        <a
                            href={\`/admin/categories?page=\${pageSlug}\`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                        >
                            Open Categories Manager &rarr;
                        </a>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 font-medium">
                        Click category pills below to toggle them on/off for this card:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableCategories.map((cat) => {
                            const isAssigned = currentCats.some((c) => c.toLowerCase() === cat.toLowerCase());
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleToggle(cat)}
                                    className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${
                                        isAssigned
                                            ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }\`}
                                >
                                    {isAssigned ? (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    <span>{cat}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

`;

content = content.substring(0, startIndex) + newCardCategoriesField + content.substring(endIndex);

// 2. Replace the Global Add Category Bar in the filter categories section
const oldGlobalBarRegex = /\{\/\* Global Add Category Bar \*\/\}[\s\S]*?<\/button>\s*<\/div>/m;
const newGlobalBar = `{/* Central Categories Manager Shortcut */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-blue-200/60">
                                                <div className="text-xs text-blue-800 font-medium flex items-center gap-1.5">
                                                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Categories are managed centrally to maintain clean classification across the platform.</span>
                                                </div>
                                                <a
                                                    href={\`/admin/categories?page=\${page.slug}\`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                                                >
                                                    <FolderOpen className="w-3.5 h-3.5" />
                                                    <span>Manage Categories in Central Hub</span>
                                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                                </a>
                                            </div>`;

if (!oldGlobalBarRegex.test(content)) {
    console.error('Could not find Global Add Category Bar target in UnifiedPageEditor.tsx');
    process.exit(1);
}

content = content.replace(oldGlobalBarRegex, newGlobalBar);

// 3. Pass pageSlug to CardCategoriesField
content = content.replace(
    /<CardCategoriesField\s+categories=\{card\.categories \?\? \[\]\}\s+availableCategories=\{allAvailableCategories\}/g,
    `<CardCategoriesField
                                                            categories={card.categories ?? []}
                                                            availableCategories={allAvailableCategories}
                                                            pageSlug={page.slug}`
);

// 4. In individual card fields, hide legacy single Field when cardsUseCategories is active
content = content.replace(
    /<Field label=\{page\.slug === 'science-tech-labs' \? 'Lab Category \(for Filter\)' : page\.slug === 'classifieds' \? 'Opportunity Category' : 'Card Category'\} value=\{card\.category \?\? card\.categories\?\.\[0\] \?\? ''\} onChange=\{\(v\) => \{ setCard\(i, 'category', v\); setCard\(i, 'categories', \[v\]\); \}\} placeholder=\{page\.slug === 'science-tech-labs' \? 'Physics' : page\.slug === 'classifieds' \? 'Institutions' : 'e\.g\. Planning'\} \/>/g,
    `{!cardsUseCategories && (
                                                            <Field label={page.slug === 'science-tech-labs' ? 'Lab Category (for Filter)' : page.slug === 'classifieds' ? 'Opportunity Category' : 'Card Category'} value={card.category ?? card.categories?.[0] ?? ''} onChange={(v) => { setCard(i, 'category', v); setCard(i, 'categories', [v]); }} placeholder={page.slug === 'science-tech-labs' ? 'Physics' : page.slug === 'classifieds' ? 'Institutions' : 'e.g. Planning'} />
                                                        )}`
);

if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Successfully updated UnifiedPageEditor.tsx');
