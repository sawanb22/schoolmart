const fs = require('fs');
const path = require('path');

const rootDir = 'd:/schoolmart/campusmart-base';
const hits = [];

const patterns = [/campus\s*mart/i, /campus-mart/i, /campus_mart/i];

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (['node_modules', 'dist', '.git', 'build', '.gemini', 'package-lock.json'].includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else {
      const ext = path.extname(item).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.env', '.webmanifest'].includes(ext)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (patterns.some(p => p.test(line))) {
              hits.push({
                file: full.replace(rootDir + '\\', '').replace(rootDir + '/', ''),
                line: idx + 1,
                snippet: line.trim().slice(0, 120)
              });
            }
          });
        } catch (e) {}
      }
    }
  }
}

walk(rootDir);

// Group by file
const grouped = {};
hits.forEach(h => {
  if (!grouped[h.file]) grouped[h.file] = [];
  grouped[h.file].push(h);
});

console.log(`Total occurrences: ${hits.length} in ${Object.keys(grouped).length} files.`);
fs.writeFileSync('C:/Users/Administrator/Desktop/campusmart_complete_audit.json', JSON.stringify({ total: hits.length, filesCount: Object.keys(grouped).length, grouped }, null, 2));
