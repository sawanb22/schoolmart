const fs = require('fs');
const path = require('path');

const rootDir = 'd:/schoolmart/campusmart-base';
const results = {
  frontendHtmlMeta: [],
  frontendSrc: {},
  backendSrc: {},
  publicAssets: [],
  packageJsons: []
};

const patterns = [/campus\s*mart/i, /campus-mart/i, /campus_mart/i];

function searchDir(dir, bucket) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === 'dist' || f === '.git' || f === 'build') continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchDir(full, bucket);
    } else {
      const ext = path.extname(f).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.sql'].includes(ext)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          let count = 0;
          const matchedLines = [];
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (patterns.some(p => p.test(line))) {
              count++;
              if (matchedLines.length < 5) {
                matchedLines.push({ lineNum: idx + 1, text: line.trim().slice(0, 100) });
              }
            }
          });
          if (count > 0) {
            bucket[full.replace(rootDir, '')] = { count, samples: matchedLines };
          }
        } catch (e) {}
      }
    }
  }
}

// 1. Frontend public assets
const publicDir = path.join(rootDir, 'frontend/public');
if (fs.existsSync(publicDir)) {
  results.publicAssets = fs.readdirSync(publicDir);
}

// 2. Frontend index.html
const indexHtml = path.join(rootDir, 'frontend/index.html');
if (fs.existsSync(indexHtml)) {
  const c = fs.readFileSync(indexHtml, 'utf8');
  c.split('\n').forEach((line, i) => {
    if (patterns.some(p => p.test(line))) {
      results.frontendHtmlMeta.push({ line: i + 1, text: line.trim() });
    }
  });
}

// 3. Frontend src
searchDir(path.join(rootDir, 'frontend/src'), results.frontendSrc);

// 4. Backend src & scripts
searchDir(path.join(rootDir, 'backend/src'), results.backendSrc);

console.log(JSON.stringify(results, null, 2));
fs.writeFileSync('C:/Users/Administrator/Desktop/campusmart_audit.json', JSON.stringify(results, null, 2));
