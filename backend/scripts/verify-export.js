const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../prisma/database-export.json'), 'utf-8'));
console.log('Exported at:', data.exportedAt);
console.log('Total pages:', data.pages.length);
console.log('Sample page:', {
  slug: data.pages[0].slug,
  title: data.pages[0].title,
  template: data.pages[0].template,
  hasPageData: !!data.pages[0].pageData,
  pageDataLength: data.pages[0].pageData ? data.pages[0].pageData.length : 0
});
const pagesWithData = data.pages.filter(p => p.pageData && p.pageData !== '{}');
console.log('Pages with non-empty pageData:', pagesWithData.length);
