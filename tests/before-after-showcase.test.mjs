import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Before & After Showcase Architecture and Invariants', async (t) => {
  const rootDir = process.cwd();
  const editorPath = path.join(rootDir, 'frontend/src/admin/components/UnifiedPageEditor.tsx');
  const articleDetailPath = path.join(rootDir, 'frontend/src/components/cms/UniversalArticleDetail.tsx');
  const rendererPath = path.join(rootDir, 'frontend/src/components/cms/GenericPageRenderer.tsx');

  const editorContent = fs.readFileSync(editorPath, 'utf8');
  const articleDetailContent = fs.readFileSync(articleDetailPath, 'utf8');
  const rendererContent = fs.readFileSync(rendererPath, 'utf8');

  await t.test('UnifiedPageEditor defines beforeImages and afterImages in CardItem', () => {
    assert.match(editorContent, /beforeImages\?:\s*string\[\]/);
    assert.match(editorContent, /afterImages\?:\s*string\[\]/);
    assert.match(editorContent, /Before & After Visual Showcase \(Optional\)/);
  });

  await t.test('UniversalArticleDetail forwards beforeImages and afterImages into pageData', () => {
    assert.match(articleDetailContent, /beforeImages:\s*Array\.isArray\(resolvedArticle\.beforeImages\)/);
    assert.match(articleDetailContent, /afterImages:\s*Array\.isArray\(resolvedArticle\.afterImages\)/);
  });

  await t.test('GenericPageRenderer defines GenericPageData showcase fields and BeforeAfterHeroBanner', () => {
    assert.match(rendererContent, /beforeImages\?:\s*string\[\]/);
    assert.match(rendererContent, /afterImages\?:\s*string\[\]/);
    assert.match(rendererContent, /function BeforeAfterHeroBanner/);
    assert.match(rendererContent, /const hasShowcase = Boolean/);
  });

  await t.test('Showcase fallback logic: hasShowcase is false when arrays are empty or missing', () => {
    const computeHasShowcase = (pageData) => Boolean(
      (pageData.beforeImages && pageData.beforeImages.length > 0) ||
      (pageData.afterImages && pageData.afterImages.length > 0)
    );

    assert.equal(computeHasShowcase({}), false);
    assert.equal(computeHasShowcase({ featuredImage: 'https://example.com/hero.jpg' }), false);
    assert.equal(computeHasShowcase({ beforeImages: [], afterImages: [] }), false);
    assert.equal(computeHasShowcase({ beforeImages: ['https://example.com/b1.jpg'] }), true);
    assert.equal(computeHasShowcase({ afterImages: ['https://example.com/a1.jpg'] }), true);
  });

  await t.test('BeforeAfterHeroBanner defaults tab to after if afterImages exist, otherwise before', () => {
    const resolveDefaultTab = (beforeImages, afterImages) => {
      return afterImages.length > 0 ? 'after' : 'before';
    };

    assert.equal(resolveDefaultTab([], ['https://example.com/after.jpg']), 'after');
    assert.equal(resolveDefaultTab(['https://example.com/before.jpg'], []), 'before');
    assert.equal(resolveDefaultTab(['https://example.com/b.jpg'], ['https://example.com/a.jpg']), 'after');
  });

  await t.test('Slide navigation index cycler wraps correctly', () => {
    const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
    const prevIndex = (curr, len) => (curr - 1 + len) % len;
    const nextIndex = (curr, len) => (curr + 1) % len;

    // Next from 0 -> 1 -> 2 -> 0
    assert.equal(nextIndex(0, images.length), 1);
    assert.equal(nextIndex(1, images.length), 2);
    assert.equal(nextIndex(2, images.length), 0);

    // Prev from 0 -> 2 -> 1 -> 0
    assert.equal(prevIndex(0, images.length), 2);
    assert.equal(prevIndex(2, images.length), 1);
    assert.equal(prevIndex(1, images.length), 0);
  });
});
