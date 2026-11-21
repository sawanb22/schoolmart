const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const pages = await prisma.page.count();
    console.log('✅ Neon connection successful! Pages count:', pages);
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
