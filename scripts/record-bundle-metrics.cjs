const fs = require('fs');
const path = require('path');

const assetsDir = path.resolve('frontend/dist/assets');
const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));

const chunks = files.map(file => {
  const filePath = path.join(assetsDir, file);
  const stat = fs.statSync(filePath);
  return {
    name: file,
    bytes: stat.size,
    kb: (stat.size / 1024).toFixed(2)
  };
});

chunks.sort((a, b) => b.bytes - a.bytes);

const totalBytes = chunks.reduce((sum, c) => sum + c.bytes, 0);
const totalKb = (totalBytes / 1024).toFixed(2);
const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

let md = '# Baseline Frontend Bundle Metrics\n\n';
md += `- **Date:** ${new Date().toISOString()}\n`;
md += `- **Build Command:** \`npm run build:frontend\` (Vite 7.3.0)\n`;
md += `- **Total JS Chunks:** ${chunks.length}\n`;
md += `- **Total JS Size:** ${totalKb} KB (${totalMb} MB / ${totalBytes.toLocaleString()} bytes)\n`;
md += `- **ESLint Problems:** 562 problems (531 errors, 31 warnings)\n\n`;

md += '## JavaScript Chunks (Largest First)\n\n';
md += '| Chunk | Size (KB) | Size (Bytes) |\n';
md += '|---|---|---|\n';
for (const c of chunks) {
  md += `| \`${c.name}\` | ${c.kb} | ${c.bytes.toLocaleString()} |\n`;
}

fs.writeFileSync(path.resolve('docs/plans/baseline/bundle.md'), md, 'utf8');
console.log(`Successfully wrote docs/plans/baseline/bundle.md with ${chunks.length} chunks, total ${totalKb} KB`);
