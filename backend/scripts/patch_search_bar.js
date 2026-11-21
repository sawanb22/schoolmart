const fs = require('fs');
const file = 'd:/schoolmart/campusmart-base/frontend/src/components/sections/search-bar.tsx';
let content = fs.readFileSync(file, 'utf8');
const target = 'relative bg-cm-yellow py-3 px-3 sm:px-4 shadow-inner';
const replacement = 'relative bg-slate-50 border-y border-slate-200/70 py-3.5 px-3 sm:px-4 shadow-xs';
if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Search bar updated successfully!');
} else {
  console.log('Target string not found in search-bar.tsx');
}
