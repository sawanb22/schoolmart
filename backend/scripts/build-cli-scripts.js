const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const distScriptsDir = path.resolve(__dirname, '../dist/scripts');
if (!fs.existsSync(distScriptsDir)) {
  fs.mkdirSync(distScriptsDir, { recursive: true });
}

async function buildScripts() {
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'bootstrap-pages.ts')],
    bundle: true,
    platform: 'node',
    packages: 'external',
    outfile: path.join(distScriptsDir, 'bootstrap-pages.js'),
  });
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'migrate-page-items.ts')],
    bundle: true,
    platform: 'node',
    packages: 'external',
    outfile: path.join(distScriptsDir, 'migrate-page-items.js'),
  });
  console.log('✓ Compiled bootstrap-pages.js and migrate-page-items.js into dist/scripts/');
}

buildScripts().catch((err) => {
  console.error('Failed to compile CLI scripts:', err);
  process.exit(1);
});
