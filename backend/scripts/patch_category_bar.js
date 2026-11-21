const fs = require('fs');
const file = 'd:/schoolmart/campusmart-base/frontend/src/components/sections/category-bar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/hover:text-cm-blue/g, 'hover:text-sm-blue');
content = content.replace(/group-hover:text-cm-blue/g, 'group-hover:text-sm-blue');
content = content.replace(/bg-cm-yellow/g, 'bg-sm-green');

fs.writeFileSync(file, content, 'utf8');
console.log('CategoryBar updated successfully!');
