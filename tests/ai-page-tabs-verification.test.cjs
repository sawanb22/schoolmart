const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 AI PAGE CATEGORY TABS & FILTERING VERIFICATION TEST');
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

// 1. Static Source Code Verification of src/pages/ai-ml.tsx
const aiMlPath = path.resolve(__dirname, '../frontend/src/pages/ai-ml.tsx');
const aiMlContent = fs.readFileSync(aiMlPath, 'utf8');

test("categoryOptions starts with 'All' as the very first chip", () => {
    assert(
        aiMlContent.includes("['All', ...Array.from(new Set(allCards.flatMap((card) => card.categories ?? []).filter(Boolean).filter((c) => c !== 'All')))]"),
        "ai-ml.tsx must prepend 'All' and filter out any card category named 'All' to avoid duplicates"
    );
});

test("Clicking 'All' resets category and page in filter buttons", () => {
    assert(
        aiMlContent.includes("setActiveCategory(category)"),
        "Button click must call setActiveCategory with the clicked category"
    );
    assert(
        aiMlContent.includes("setPage(1)"),
        "Button click must reset page to 1"
    );
});

test("Active category style highlighting works for 'All'", () => {
    assert(
        aiMlContent.includes("style={activeCategory === category ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' } : undefined}"),
        "Active category chip must apply inline style with primaryColor"
    );
    assert(
        aiMlContent.includes("activeCategory === category ? 'border-transparent text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'"),
        "Active category chip must toggle proper classNames"
    );
});

test("filteredCards logic returns allCards when activeCategory is 'All'", () => {
    assert(
        aiMlContent.includes("activeCategory === 'All' ? allCards : allCards.filter"),
        "filteredCards must return allCards directly when activeCategory === 'All'"
    );
});

// 2. Behavioral Unit Test of categoryOptions & filtering logic
test("categoryOptions ensures 'All' is first and unique even if cards have 'All' category", () => {
    const sampleCards = [
        { id: 1, title: 'Card 1', categories: ['Learning Station', 'Robotics'] },
        { id: 2, title: 'Card 2', categories: ['AI Lab', 'All'] },
        { id: 3, title: 'Card 3', categories: ['Robotics', 'Vision Systems'] },
        { id: 4, title: 'Card 4', categories: null },
    ];

    // Replicate the exact categoryOptions expression from src/pages/ai-ml.tsx
    const categoryOptions = ['All', ...Array.from(new Set(sampleCards.flatMap((card) => card.categories ?? []).filter(Boolean).filter((c) => c !== 'All')))];

    assert.strictEqual(categoryOptions[0], 'All', "First option must be 'All'");
    assert.deepStrictEqual(categoryOptions, ['All', 'Learning Station', 'Robotics', 'AI Lab', 'Vision Systems']);

    // Ensure no duplicate 'All'
    const allCount = categoryOptions.filter(c => c === 'All').length;
    assert.strictEqual(allCount, 1, "'All' must appear exactly once");
});

test("Category switching cycle: 'All' -> selected category -> back to 'All'", () => {
    const sampleCards = [
        { id: 1, title: 'Card 1', categories: ['Learning Station', 'Robotics'] },
        { id: 2, title: 'Card 2', categories: ['AI Lab'] },
        { id: 3, title: 'Card 3', categories: ['Robotics'] },
    ];

    let activeCategory = 'All';
    let page = 1;

    function getFilteredCards(cat) {
        return cat === 'All' ? sampleCards : sampleCards.filter((card) => (card.categories ?? []).includes(cat));
    }

    // Initial state: 'All'
    let filtered = getFilteredCards(activeCategory);
    assert.strictEqual(filtered.length, 3, "Initial filter should show all 3 cards");

    // Click 'Learning Station'
    activeCategory = 'Learning Station';
    page = 1;
    filtered = getFilteredCards(activeCategory);
    assert.strictEqual(filtered.length, 1, "Only 1 card matches 'Learning Station'");
    assert.strictEqual(filtered[0].title, 'Card 1');

    // Click 'Robotics'
    activeCategory = 'Robotics';
    page = 1;
    filtered = getFilteredCards(activeCategory);
    assert.strictEqual(filtered.length, 2, "2 cards match 'Robotics'");

    // Click 'All' to return back to all
    activeCategory = 'All';
    page = 1;
    filtered = getFilteredCards(activeCategory);
    assert.strictEqual(filtered.length, 3, "Returning to 'All' shows all 3 cards again");
});

test("Empty card categories array behaves cleanly", () => {
    const sampleCards = [];
    const categoryOptions = ['All', ...Array.from(new Set(sampleCards.flatMap((card) => card.categories ?? []).filter(Boolean).filter((c) => c !== 'All')))];
    assert.deepStrictEqual(categoryOptions, ['All']);

    const filtered = 'All' === 'All' ? sampleCards : sampleCards.filter((card) => (card.categories ?? []).includes('All'));
    assert.deepStrictEqual(filtered, []);
});

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) {
    process.exit(1);
}
