const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyDDL() {
  console.log('🔄 Applying SearchCard DDL to database...');
  const sqlPath = path.resolve(__dirname, '../prisma/sql/add_search_card.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // Strip single-line comments (-- ...) and clean up statements
  const cleanSql = rawSql.replace(/--.*$/gm, '').trim();
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} DDL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    console.log(stmt.slice(0, 60) + '...');
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`✓ Statement ${i + 1} succeeded.`);
    } catch (err) {
      console.error(`❌ Error executing statement ${i + 1}:`, err.message);
      throw err;
    }
  }

  console.log('✅ SearchCard table and indexes applied successfully.');
}

applyDDL()
  .catch(err => {
    console.error('Fatal DDL error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
