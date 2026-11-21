const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../src/pages/my-account.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split(/\r?\n/);
console.log('Total lines:', lines.length);
console.log('Line 288:', lines[287]);
console.log('Line 289:', lines[288]);
console.log('Line 290:', lines[289]);
console.log('Line 291:', lines[290]);
console.log('Line 292:', lines[291]);
console.log('Line 293:', lines[292]);
console.log('Line 294:', lines[293]);

// Remove lines 290, 291 (0-indexed 290 and 291)
if (lines[290].trim() === '</div>' && lines[291].trim() === ')}') {
    lines.splice(290, 2);
    console.log('Removed leftover lines.');
} else {
    console.log('Lines do not match expected tags:', lines[290], lines[291]);
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✓ Successfully cleaned my-account.tsx');
