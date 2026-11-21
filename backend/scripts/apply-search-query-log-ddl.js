const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyDDL() {
  console.log('🔄 Applying SearchQueryLog DDL to database...');
  const sqlPath = path.resolve(__dirname, '../prisma/sql/add_search_query_log.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // Strip line comments
  const cleanSql = rawSql.replace(/--.*$/gm, '').trim();

  // Split on semicolons
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}: ${stmt.slice(0, 50)}...`);
    await prisma.$executeRawUnsafe(stmt);
  }

  console.log('✅ SearchQueryLog DDL applied successfully!');
}

applyDDL()
  .catch(err => {
    console.error('❌ Failed to apply SearchQueryLog DDL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
