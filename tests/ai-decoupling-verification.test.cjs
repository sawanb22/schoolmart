/**
 * ai-decoupling-verification.test.cjs
 * Comprehensive verification of the permanent removal and purge of legacy AI/chatbot artifacts.
 *
 * Verifies:
 * 1. Dead frontend components (ChatbotWidget.tsx, useChatbot.ts) are permanently removed from the repo.
 * 2. Dead backend services (chatbot.service.ts, chatbot.routes.ts) are permanently removed from the repo.
 * 3. Misleading markdown specifications (CHATBOT_*.md, GROQ_MIGRATION_COMPLETE.md) are permanently removed from the repo.
 * 4. scratch/ directory contains zero legacy AI archive files.
 * 5. backend/src/index.ts has no references to chatbotRoutes or /api/chatbot.
 * 6. All 14 legitimate production backend routes remain registered and operational.
 * 7. Zero dangling imports of ChatbotWidget or useChatbot exist anywhere in active src/.
 * 8. Live homepage search bar and 5-group CMS page renderers remain 100% intact.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 PERMANENT PURGE OF LEGACY AI ARTIFACTS VERIFICATION TEST');
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

const ROOT_DIR = path.resolve(__dirname, '..');

// --- 1. Permanent Purge of Dead Code Files ---
console.log('--- 1. Permanent Purge of Dead Code Files ---');

test('frontend/src/components/ChatbotWidget.tsx is permanently removed', () => {
  assert(!fs.existsSync(path.join(ROOT_DIR, 'frontend/src/components/ChatbotWidget.tsx')));
});

test('frontend/src/hooks/useChatbot.ts is permanently removed', () => {
  assert(!fs.existsSync(path.join(ROOT_DIR, 'frontend/src/hooks/useChatbot.ts')));
});

test('backend/src/routes/chatbot.routes.ts is permanently removed', () => {
  assert(!fs.existsSync(path.join(ROOT_DIR, 'backend/src/routes/chatbot.routes.ts')));
});

test('backend/src/services/chatbot.service.ts is permanently removed', () => {
  assert(!fs.existsSync(path.join(ROOT_DIR, 'backend/src/services/chatbot.service.ts')));
});

// --- 2. Permanent Purge of Misleading Markdown Documentation ---
console.log('\n--- 2. Permanent Purge of Misleading Docs ---');

const legacyDocs = [
  'CHATBOT_ARCHITECTURE.md',
  'CHATBOT_IMPLEMENTATION.md',
  'CHATBOT_QUICKSTART.md',
  'CHATBOT_SETUP.md',
  'GROQ_MIGRATION_COMPLETE.md',
];

legacyDocs.forEach((doc) => {
  test(`${doc} is permanently removed from the repository`, () => {
    assert(!fs.existsSync(path.join(ROOT_DIR, doc)));
  });
});

test('scratch/ directory contains zero legacy-ai-archive files', () => {
  assert(!fs.existsSync(path.join(ROOT_DIR, 'scratch/legacy-ai-archive')));
});

// --- 3. Backend Entry Point (backend/src/index.ts) Cleanliness ---
console.log('\n--- 3. Backend Entry Point Integrity ---');

const indexPath = path.join(ROOT_DIR, 'backend/src/index.ts');
const indexSource = fs.readFileSync(indexPath, 'utf8');

test('backend/src/index.ts contains no import of chatbotRoutes', () => {
  assert(!indexSource.includes('chatbotRoutes'), 'Must not import or reference chatbotRoutes');
});

test('backend/src/index.ts contains no registration of /api/chatbot', () => {
  assert(!indexSource.includes('/api/chatbot'), 'Must not mount /api/chatbot route');
});

test('All 14 legitimate production backend routes remain registered in backend/src/index.ts', () => {
  const expectedRoutes = [
    '/api/auth',
    '/api/products',
    '/api/blog',
    '/api/orders',
    '/api/wishlist',
    '/api/addresses',
    '/api/classifieds',
    '/api/contact',
    '/api/catalogues',
    '/api/case-studies',
    '/api/admin',
    '/api/content',
    '/api/pages',
    '/api/media',
  ];
  expectedRoutes.forEach((route) => {
    assert(indexSource.includes(route), `Route ${route} must remain registered`);
  });
});

// --- 4. Zero Dangling Imports in Active Frontend Code ---
console.log('\n--- 4. Active Frontend Code Integrity ---');

function scanDirForPatterns(dir, patterns) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'scratch') {
        scanDirForPatterns(fullPath, patterns);
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      patterns.forEach((pattern) => {
        assert(
          !content.includes(pattern),
          `Found dangling reference '${pattern}' in active file: ${fullPath}`
        );
      });
    }
  }
}

test('Active src/ directory contains zero imports of ChatbotWidget or useChatbot', () => {
  const srcDir = path.join(ROOT_DIR, 'src');
  scanDirForPatterns(srcDir, ['ChatbotWidget', 'useChatbot']);
});

test('Homepage search bar (src/components/sections/search-bar.tsx) remains intact', () => {
  const searchBarPath = path.join(ROOT_DIR, 'frontend/src/components/sections/search-bar.tsx');
  assert(fs.existsSync(searchBarPath), 'search-bar.tsx must exist');
  const searchBarContent = fs.readFileSync(searchBarPath, 'utf8');
  assert(searchBarContent.includes('export default SearchBar'), 'SearchBar must export default');
  assert(searchBarContent.includes('INSTITUTION_OPTIONS'), 'Must retain INSTITUTION_OPTIONS');
  assert(searchBarContent.includes('OBJECTIVE_OPTIONS'), 'Must retain OBJECTIVE_OPTIONS');
});

test('Unified 5-Group CMS master engines remain intact', () => {
  const engines = [
    'frontend/src/components/cms/UniversalArticleDetail.tsx',
    'frontend/src/components/cms/GenericPageRenderer.tsx',
    'frontend/src/components/cms/SolutionPageRenderer.tsx',
    'frontend/src/components/cms/ServicePageRenderer.tsx',
    'frontend/src/components/cms/ServiceDetailPage.tsx',
  ];
  engines.forEach((enginePath) => {
    assert(fs.existsSync(path.join(ROOT_DIR, enginePath)), `Engine ${enginePath} must exist`);
  });
});

// --- 5. Summary ---
console.log('\n================================================================');
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL LEGACY AI PURGE VERIFICATION TESTS PASSED (16/16)!');
  console.log('================================================================\n');
}
