const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../src/admin/pages/Categories.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    'All categories in sync with cloud PostgreSQL database.',
    'All categories are up to date.'
);

content = content.replace(
    '● You have unsaved changes. Click save to push to cloud database.',
    '● You have unsaved changes. Click save to apply changes.'
);

content = content.replace(
    'saved to cloud! Active on live',
    'saved! Active on live'
);

content = content.replace(
    "Failed to save categories to the cloud.",
    "Failed to save categories."
);

content = content.replace(
    '{pageCards.length} Total Cards in Cloud Database',
    '{pageCards.length} Total Cards'
);

content = content.replace(
    "{savingPage ? 'Saving to Cloud...' :",
    "{savingPage ? 'Saving...' :"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Cleaned text in Categories.tsx');
