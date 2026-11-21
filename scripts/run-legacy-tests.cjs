const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const testDir = path.resolve('tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.cjs') || f.endsWith('.test.mjs')).sort();
console.log(`Found ${files.length} test files`);

const baselineDir = path.resolve('docs/plans/baseline');
if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

const results = [];
for (const file of files) {
  const filePath = path.join('tests', file);
  const start = Date.now();
  let status = 'PASS';
  let errorMsg = '';
  try {
    const res = cp.spawnSync(process.execPath, [filePath], {
      cwd: path.resolve('.'),
      timeout: 30000,
      encoding: 'utf8',
      env: { ...process.env }
    });
    const duration = Date.now() - start;
    if (res.status !== 0) {
      status = 'FAIL';
      errorMsg = (res.stderr || res.stdout || ('Exited with status ' + res.status)).slice(0, 300).trim();
      if (res.error && res.error.code === 'ETIMEDOUT') {
        errorMsg = 'Timeout (30s)';
      }
    }
    results.push({ file, status, duration, errorMsg, exitCode: res.status });
  } catch (err) {
    results.push({ file, status: 'ERROR', duration: Date.now() - start, errorMsg: err.message, exitCode: -1 });
  }
  console.log(`[${results[results.length - 1].status}] ${file} (${results[results.length - 1].duration}ms)`);
}

const passedCount = results.filter(r => r.status === 'PASS').length;
const failedCount = results.filter(r => r.status !== 'PASS').length;

let md = '# Baseline Legacy Test Results\n\n';
md += `- **Date:** ${new Date().toISOString()}\n`;
md += `- **Total Files Tested:** ${results.length}\n`;
md += `- **Passed:** ${passedCount}\n`;
md += `- **Failed:** ${failedCount}\n\n`;
md += '## Per-file Status\n\n';
md += '| File | Status | Duration (ms) | Notes |\n';
md += '|---|---|---|---|\n';
for (const r of results) {
  const notes = r.errorMsg ? r.errorMsg.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|') : '';
  md += `| \`${r.file}\` | **${r.status}** | ${r.duration} | ${notes} |\n`;
}

fs.writeFileSync(path.join(baselineDir, 'legacy-tests.md'), md, 'utf8');
console.log('Successfully wrote docs/plans/baseline/legacy-tests.md');
