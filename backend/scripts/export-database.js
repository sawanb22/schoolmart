const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('🔄 Starting full database export from Render...');

  const data = {};

  try {
    data.exportedAt = new Date().toISOString();
    
    // Core CMS and Page Data
    data.pages = await prisma.page.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.pages.length} Pages`);

    data.siteContent = await prisma.siteContent.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.siteContent.length} SiteContent rows`);

    data.categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.categories.length} Categories`);

    data.products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.products.length} Products`);

    data.blogCategories = await prisma.blogCategory.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.blogCategories.length} Blog Categories`);

    data.blogPosts = await prisma.blogPost.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.blogPosts.length} Blog Posts`);

    data.catalogues = await prisma.catalogue.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.catalogues.length} Catalogues`);

    data.caseStudies = await prisma.caseStudy.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.caseStudies.length} Case Studies`);

    data.users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.users.length} Users`);

    data.contactEnquiries = await prisma.contactEnquiry.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.contactEnquiries.length} Contact Enquiries`);

    data.quoteRequests = await prisma.quoteRequest.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.quoteRequests.length} Quote Requests`);

    data.searchCards = await prisma.searchCard.findMany({ orderBy: { id: 'asc' } });
    console.log(`✓ Fetched ${data.searchCards.length} Search Cards`);

    data.searchQueryLogs = await prisma.searchQueryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    console.log(`✓ Fetched ${data.searchQueryLogs.length} Search Query Logs (capped at 1,000 recent)`);

    // Write to JSON
    const exportPath = path.resolve(__dirname, '../prisma/database-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n🎉 FULL BACKUP SAVED TO: ${exportPath}`);
    console.log(`File size: ${(fs.statSync(exportPath).size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();
