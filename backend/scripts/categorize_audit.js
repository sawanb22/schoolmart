const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/Administrator/Desktop/campusmart_complete_audit.json', 'utf8'));
const files = Object.keys(data.grouped);

const categories = {
  'Browser Metadata, Icons & Public': [],
  'Admin Suite (Dashboard, Sidebar, Editors)': [],
  'Frontend UI Pages & Components': [],
  'Backend API, Emails, CORS & AI Prompts': [],
  'Root Configs & Build Scripts': []
};

files.forEach(f => {
  const norm = f.replace(/\\/g, '/');
  const count = data.grouped[f].length;
  const samples = data.grouped[f].map(s => `L${s.line}: ${s.snippet}`);

  if (norm.startsWith('frontend/public') || norm === 'frontend/index.html') {
    categories['Browser Metadata, Icons & Public'].push({ file: norm, count, samples });
  } else if (norm.includes('frontend/src/admin')) {
    categories['Admin Suite (Dashboard, Sidebar, Editors)'].push({ file: norm, count, samples });
  } else if (norm.startsWith('frontend/src')) {
    categories['Frontend UI Pages & Components'].push({ file: norm, count, samples });
  } else if (norm.startsWith('backend/src')) {
    categories['Backend API, Emails, CORS & AI Prompts'].push({ file: norm, count, samples });
  } else {
    categories['Root Configs & Build Scripts'].push({ file: norm, count, samples });
  }
});

for (const [k, v] of Object.entries(categories)) {
  const total = v.reduce((sum, item) => sum + item.count, 0);
  console.log(`\n=== ${k}: ${v.length} files (${total} hits) ===`);
  v.forEach(item => {
    console.log(` - ${item.file} (${item.count} hits)`);
  });
}
