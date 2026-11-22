import { bootstrapPages } from '../src/services/bootstrap-pages';
import prisma from '../src/lib/prisma';

async function main() {
  try {
    const result = await bootstrapPages();
    console.log(`✓ Bootstrapped pages: ${result.created.length} created, ${result.updated.length} updated`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to bootstrap pages:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main };
