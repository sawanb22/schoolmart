import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const distDir = path.resolve(frontendDir, 'dist');
const htmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error(`❌ Cannot check bundle budget: ${htmlPath} does not exist. Run build first.`);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Identify entry script and all modulepreload chunks
const filesToCheck = new Set();

// 1. Entry scripts: <script type="module" ... src="...">
const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const src = match[1];
  if (src && (src.endsWith('.js') || src.endsWith('.mjs'))) {
    filesToCheck.add(src);
  }
}

// 2. Modulepreload links: <link rel="modulepreload" ... href="...">
const linkRegex = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
while ((match = linkRegex.exec(html)) !== null) {
  const tag = match[0];
  const href = match[1];
  if (/rel=["']modulepreload["']/i.test(tag) && href) {
    filesToCheck.add(href);
  }
}

if (filesToCheck.size === 0) {
  console.error('❌ No entry scripts or modulepreload links found in dist/index.html');
  process.exit(1);
}

console.log(`\n🔍 Checking Bundle Budget (Target: <= 170.00 KB Gzip)`);
console.log('='.repeat(70));
console.log(`${'Asset / Chunk'.padEnd(45)} | ${'Raw (KB)'.padStart(10)} | ${'Gzip (KB)'.padStart(10)}`);
console.log('-'.repeat(70));

let totalRawBytes = 0;
let totalGzipBytes = 0;

for (const rawUrl of filesToCheck) {
  const cleanPath = rawUrl.replace(/^\//, '');
  const filePath = path.resolve(distDir, cleanPath);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: Referenced file not found on disk: ${filePath}`);
    continue;
  }

  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content).length;

  totalRawBytes += rawBytes;
  totalGzipBytes += gzipBytes;

  const rawKb = (rawBytes / 1024).toFixed(2);
  const gzipKb = (gzipBytes / 1024).toFixed(2);
  const displayUrl = cleanPath.length > 44 ? '...' + cleanPath.slice(-41) : cleanPath;
  console.log(`${displayUrl.padEnd(45)} | ${(rawKb + ' KB').padStart(10)} | ${(gzipKb + ' KB').padStart(10)}`);
}

console.log('='.repeat(70));
const totalRawKb = (totalRawBytes / 1024).toFixed(2);
const totalGzipKb = (totalGzipBytes / 1024).toFixed(2);
console.log(`${'TOTAL (Entry + Modulepreloads)'.padEnd(45)} | ${(totalRawKb + ' KB').padStart(10)} | ${(totalGzipKb + ' KB').padStart(10)}`);

const BUDGET_KB = 170;
const BUDGET_BYTES = BUDGET_KB * 1024;

if (totalGzipBytes > BUDGET_BYTES) {
  console.error(`\n❌ BUNDLE BUDGET EXCEEDED!`);
  console.error(`Total Gzip size is ${totalGzipKb} KB, exceeding the budget of ${BUDGET_KB} KB by ${((totalGzipBytes - BUDGET_BYTES) / 1024).toFixed(2)} KB.`);
  process.exit(1);
} else {
  console.log(`\n✅ BUNDLE BUDGET PASSED!`);
  console.log(`Total Gzip size is ${totalGzipKb} KB, which is within the ${BUDGET_KB} KB budget (${(BUDGET_KB - parseFloat(totalGzipKb)).toFixed(2)} KB under budget).\n`);
  process.exit(0);
}
