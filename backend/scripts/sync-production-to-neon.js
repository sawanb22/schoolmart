const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parsePostgresTextVal(val) {
  if (val === '\\N' || val === undefined || val === null) return null;
  let res = '';
  for (let i = 0; i < val.length; i++) {
    if (val[i] === '\\' && i + 1 < val.length) {
      const next = val[i + 1];
      if (next === 'n') { res += '\n'; i++; }
      else if (next === 't') { res += '\t'; i++; }
      else if (next === 'r') { res += '\r'; i++; }
      else if (next === '\\') { res += '\\'; i++; }
      else { res += next; i++; }
    } else {
      res += val[i];
    }
  }
  return res;
}

function parsePostgresArray(str) {
  if (!str || str === '{}' || str === '\\N') return [];
  if (str.startsWith('{') && str.endsWith('}')) {
    const inner = str.slice(1, -1);
    if (!inner) return [];
    const result = [];
    let current = '';
    let inQuotes = false;
    let escape = false;
    for (let i = 0; i < inner.length; i++) {
      const char = inner[i];
      if (escape) {
        current += char;
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
  return [str];
}

async function parseDumpFile(dumpPath) {
  console.log(`📖 Parsing production dump: ${dumpPath}`);
  const fileStream = fs.createReadStream(dumpPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentTable = null;
  const rawTables = {};
  const setvalStatements = [];

  for await (const line of rl) {
    if (line.startsWith('COPY public.')) {
      const match = line.match(/^COPY public\.("?[a-zA-Z0-9_]+"?) \((.*?)\) FROM stdin;$/);
      if (match) {
        currentTable = match[1].replace(/"/g, '');
        rawTables[currentTable] = [];
      }
    } else if (line === '\\.' && currentTable) {
      currentTable = null;
    } else if (currentTable && line.length > 0) {
      rawTables[currentTable].push(line);
    } else if (line.startsWith('SELECT pg_catalog.setval(')) {
      setvalStatements.push(line);
    }
  }

  console.log('✅ Dump file parsed. Transforming table models...');

  const data = {
    exportedAt: new Date().toISOString(),
    users: (rawTables.user || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        name: parsePostgresTextVal(p[1]),
        email: parsePostgresTextVal(p[2]),
        passwordHash: parsePostgresTextVal(p[3]),
        phone: parsePostgresTextVal(p[4]),
        institution: parsePostgresTextVal(p[5]),
        role: parsePostgresTextVal(p[6]),
        emailVerified: p[7] === 't',
        createdAt: new Date(p[8]),
        updatedAt: new Date(p[9]),
      };
    }),
    categories: (rawTables.category || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        name: parsePostgresTextVal(p[1]),
        slug: parsePostgresTextVal(p[2]),
        page: parsePostgresTextVal(p[3]),
      };
    }),
    products: (rawTables.product || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        name: parsePostgresTextVal(p[1]),
        slug: parsePostgresTextVal(p[2]),
        sku: parsePostgresTextVal(p[3]),
        description: parsePostgresTextVal(p[4]),
        price: parseFloat(p[5]),
        categoryId: parseInt(p[6], 10),
        imageUrl: parsePostgresTextVal(p[7]),
        images: parsePostgresTextVal(p[8]),
        specifications: parsePostgresTextVal(p[9]),
        rating: parseFloat(p[10]),
        reviewCount: parseInt(p[11], 10),
        stock: parseInt(p[12], 10),
        active: p[13] === 't',
        featured: p[14] === 't',
        createdAt: new Date(p[15]),
        updatedAt: new Date(p[16]),
      };
    }),
    blogCategories: (rawTables.blogcategory || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        name: parsePostgresTextVal(p[1]),
        slug: parsePostgresTextVal(p[2]),
      };
    }),
    blogPosts: (rawTables.blogpost || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        title: parsePostgresTextVal(p[1]),
        slug: parsePostgresTextVal(p[2]),
        excerpt: parsePostgresTextVal(p[3]),
        body: parsePostgresTextVal(p[4]),
        categoryId: p[5] === '\\N' ? null : parseInt(p[5], 10),
        imageUrl: parsePostgresTextVal(p[6]),
        published: p[7] === 't',
        publishedAt: p[8] === '\\N' ? null : new Date(p[8]),
        authorId: p[9] === '\\N' ? null : parseInt(p[9], 10),
        createdAt: new Date(p[10]),
        updatedAt: new Date(p[11]),
      };
    }),
    pages: (rawTables.page || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        title: parsePostgresTextVal(p[1]),
        slug: parsePostgresTextVal(p[2]),
        content: parsePostgresTextVal(p[3]) || '',
        template: parsePostgresTextVal(p[4]),
        pageData: parsePostgresTextVal(p[5]),
        published: p[6] === 't',
        createdAt: new Date(p[7]),
        updatedAt: new Date(p[8]),
      };
    }),
    siteContent: (rawTables.sitecontent || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        key: parsePostgresTextVal(p[1]),
        value: parsePostgresTextVal(p[2]),
        updatedAt: new Date(p[3]),
      };
    }),
    catalogues: (rawTables.catalogue || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        title: parsePostgresTextVal(p[1]),
        description: parsePostgresTextVal(p[2]),
        fileUrl: parsePostgresTextVal(p[3]),
        thumbnailUrl: parsePostgresTextVal(p[4]),
        active: p[5] === 't',
        createdAt: new Date(p[6]),
      };
    }),
    caseStudies: (rawTables.casestudy || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        title: parsePostgresTextVal(p[1]),
        slug: parsePostgresTextVal(p[2]),
        description: parsePostgresTextVal(p[3]),
        body: parsePostgresTextVal(p[4]),
        imageUrl: parsePostgresTextVal(p[5]),
        active: p[6] === 't',
        createdAt: new Date(p[7]),
        updatedAt: new Date(p[8]),
      };
    }),
    searchCards: (rawTables.searchcard || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        cardSlug: parsePostgresTextVal(p[1]),
        targetSlug: parsePostgresTextVal(p[2]),
        sectionAnchor: parsePostgresTextVal(p[3]),
        categorySlug: parsePostgresTextVal(p[4]),
        subcategorySlug: parsePostgresTextVal(p[5]),
        secondaryCategorySlugs: parsePostgresArray(p[6]),
        title: parsePostgresTextVal(p[7]),
        summary: parsePostgresTextVal(p[8]),
        inclusions: parsePostgresArray(p[9]),
        badge: parsePostgresTextVal(p[10]),
        imageUrl: parsePostgresTextVal(p[11]),
        keywords: parsePostgresArray(p[12]),
        institutionTypes: parsePostgresArray(p[13]),
        relatedCardSlugs: parsePostgresArray(p[14]),
        priority: parseInt(p[15], 10),
        active: p[16] === 't',
        createdAt: new Date(p[17]),
        updatedAt: new Date(p[18]),
      };
    }),
    searchQueryLogs: (rawTables.searchquerylog || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        queryText: parsePostgresTextVal(p[1]),
        institutionType: parsePostgresTextVal(p[2]),
        categorySlug: parsePostgresTextVal(p[3]),
        matchedCardSlugs: parsePostgresArray(p[4]),
        matchedCount: parseInt(p[5], 10),
        confidenceScore: parseFloat(p[6]),
        userIp: parsePostgresTextVal(p[7]),
        converted: p[8] === 't',
        createdAt: new Date(p[9]),
      };
    }),
    contactEnquiries: (rawTables.contactenquiry || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        name: parsePostgresTextVal(p[1]),
        email: parsePostgresTextVal(p[2]),
        phone: parsePostgresTextVal(p[3]),
        subject: parsePostgresTextVal(p[4]),
        role: parsePostgresTextVal(p[5]),
        message: parsePostgresTextVal(p[6]),
        resumeFilename: parsePostgresTextVal(p[7]),
        resumeOriginalName: parsePostgresTextVal(p[8]),
        resumeMimeType: parsePostgresTextVal(p[9]),
        resumeSize: p[10] === '\\N' ? null : parseInt(p[10], 10),
        read: p[11] === 't',
        createdAt: new Date(p[12]),
      };
    }),
    quoteRequests: (rawTables.quoterequest || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        name: parsePostgresTextVal(p[1]),
        email: parsePostgresTextVal(p[2]),
        phone: parsePostgresTextVal(p[3]),
        institution: parsePostgresTextVal(p[4]),
        items: parsePostgresTextVal(p[5]),
        message: parsePostgresTextVal(p[6]),
        read: p[7] === 't',
        createdAt: new Date(p[8]),
      };
    }),
    wishlistItems: (rawTables.wishlistitem || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        userId: parseInt(p[1], 10),
        productId: p[2] === '\\N' ? null : parseInt(p[2], 10),
        designImage: parsePostgresTextVal(p[3]),
        designKey: parsePostgresTextVal(p[4]),
        designTitle: parsePostgresTextVal(p[5]),
        pageSlug: parsePostgresTextVal(p[6]),
        quantity: parseInt(p[7], 10),
        createdAt: new Date(p[8]),
      };
    }),
    otpCodes: (rawTables.otpcode || []).map(line => {
      const p = line.split('\t');
      return {
        id: parseInt(p[0], 10),
        email: parsePostgresTextVal(p[1]),
        code: parsePostgresTextVal(p[2]),
        purpose: parsePostgresTextVal(p[3]),
        expiresAt: new Date(p[4]),
        used: p[5] === 't',
        createdAt: new Date(p[6]),
      };
    }),
  };

  return { data, setvalStatements };
}

async function syncToNeon() {
  const dumpPath = path.resolve(__dirname, '../../production_full_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ Dump file not found: ${dumpPath}`);
    process.exit(1);
  }

  const { data, setvalStatements } = await parseDumpFile(dumpPath);

  // Update backend/prisma/database-export.json
  const exportPath = path.resolve(__dirname, '../prisma/database-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Updated local JSON export at: ${exportPath}`);

  console.log('\n🚀 Starting 1:1 synchronization into Neon Database...');

  try {
    // Step 1: Clean/truncate existing tables in CASCADE
    console.log('🧹 Purging existing stale tables in Neon (CASCADE)...');
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "wishlistitem", 
        "orderitem", 
        "order", 
        "address", 
        "chatmessage", 
        "classified", 
        "searchquerylog", 
        "searchcard", 
        "quoterequest", 
        "contactenquiry", 
        "otpcode", 
        "blogpost", 
        "blogcategory", 
        "product", 
        "category", 
        "user", 
        "page", 
        "catalogue", 
        "casestudy", 
        "sitecontent" 
      CASCADE;
    `);
    console.log('✓ Tables truncated cleanly');

    // Step 2: Insert Users
    if (data.users.length > 0) {
      console.log(`👤 Inserting ${data.users.length} Users...`);
      await prisma.user.createMany({ data: data.users });
      console.log('✓ Users inserted');
    }

    // Step 3: Insert Categories
    if (data.categories.length > 0) {
      console.log(`📁 Inserting ${data.categories.length} Categories...`);
      await prisma.category.createMany({ data: data.categories });
      console.log('✓ Categories inserted');
    }

    // Step 4: Insert Products
    if (data.products.length > 0) {
      console.log(`📦 Inserting ${data.products.length} Products...`);
      await prisma.product.createMany({ data: data.products });
      console.log('✓ Products inserted');
    }

    // Step 5: Insert Blog Categories
    if (data.blogCategories.length > 0) {
      console.log(`📚 Inserting ${data.blogCategories.length} Blog Categories...`);
      await prisma.blogCategory.createMany({ data: data.blogCategories });
      console.log('✓ Blog Categories inserted');
    }

    // Step 6: Insert Blog Posts
    if (data.blogPosts.length > 0) {
      console.log(`📝 Inserting ${data.blogPosts.length} Blog Posts...`);
      await prisma.blogPost.createMany({ data: data.blogPosts });
      console.log('✓ Blog Posts inserted');
    }

    // Step 7: Insert Pages
    if (data.pages.length > 0) {
      console.log(`📄 Inserting ${data.pages.length} CMS Pages...`);
      for (let i = 0; i < data.pages.length; i += 20) {
        const chunk = data.pages.slice(i, i + 20);
        await prisma.page.createMany({ data: chunk });
      }
      console.log('✓ Pages inserted');
    }

    // Step 8: Insert Site Content
    if (data.siteContent.length > 0) {
      console.log(`⚙️ Inserting ${data.siteContent.length} Site Content rows...`);
      await prisma.siteContent.createMany({ data: data.siteContent });
      console.log('✓ Site Content inserted');
    }

    // Step 9: Insert Catalogues
    if (data.catalogues.length > 0) {
      console.log(`📖 Inserting ${data.catalogues.length} Catalogues...`);
      await prisma.catalogue.createMany({ data: data.catalogues });
      console.log('✓ Catalogues inserted');
    }

    // Step 10: Insert Case Studies
    if (data.caseStudies.length > 0) {
      console.log(`💼 Inserting ${data.caseStudies.length} Case Studies...`);
      await prisma.caseStudy.createMany({ data: data.caseStudies });
      console.log('✓ Case Studies inserted');
    }

    // Step 11: Insert Search Cards
    if (data.searchCards.length > 0) {
      console.log(`🔍 Inserting ${data.searchCards.length} Search Cards...`);
      await prisma.searchCard.createMany({ data: data.searchCards });
      console.log('✓ Search Cards inserted');
    }

    // Step 12: Insert Search Query Logs
    if (data.searchQueryLogs.length > 0) {
      console.log(`🔎 Inserting ${data.searchQueryLogs.length} Search Query Logs...`);
      await prisma.searchQueryLog.createMany({ data: data.searchQueryLogs });
      console.log('✓ Search Query Logs inserted');
    }

    // Step 13: Insert Contact Enquiries
    if (data.contactEnquiries.length > 0) {
      console.log(`📨 Inserting ${data.contactEnquiries.length} Contact Enquiries...`);
      await prisma.contactEnquiry.createMany({ data: data.contactEnquiries });
      console.log('✓ Contact Enquiries inserted');
    }

    // Step 14: Insert Quote Requests
    if (data.quoteRequests.length > 0) {
      console.log(`💬 Inserting ${data.quoteRequests.length} Quote Requests...`);
      await prisma.quoteRequest.createMany({ data: data.quoteRequests });
      console.log('✓ Quote Requests inserted');
    }

    // Step 15: Insert Wishlist Items
    if (data.wishlistItems.length > 0) {
      console.log(`❤️ Inserting ${data.wishlistItems.length} Wishlist Items...`);
      await prisma.wishlistItem.createMany({ data: data.wishlistItems });
      console.log('✓ Wishlist Items inserted');
    }

    // Step 16: Insert OTP Codes
    if (data.otpCodes.length > 0) {
      console.log(`🔑 Inserting ${data.otpCodes.length} OTP Codes...`);
      await prisma.otpCode.createMany({ data: data.otpCodes });
      console.log('✓ OTP Codes inserted');
    }

    // Step 17: Synchronize all sequences
    console.log(`\n🔢 Synchronizing ${setvalStatements.length} PostgreSQL sequences...`);
    for (const stmt of setvalStatements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (seqErr) {
        console.warn(`  ⚠️ Sequence warning: ${seqErr.message}`);
      }
    }
    console.log('✓ All sequences synchronized');

    // Step 18: Audit Row Counts
    console.log('\n📊 AUDITING NEON ROW COUNTS:');
    const [
      usersCount,
      catsCount,
      prodsCount,
      pagesCount,
      scCount,
      blogCatsCount,
      blogPostsCount,
      contentCount,
      cataloguesCount,
      caseStudiesCount,
      enquiryCount,
      quotesCount,
      wishlistCount,
      otpCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.page.count(),
      prisma.searchCard.count(),
      prisma.blogCategory.count(),
      prisma.blogPost.count(),
      prisma.siteContent.count(),
      prisma.catalogue.count(),
      prisma.caseStudy.count(),
      prisma.contactEnquiry.count(),
      prisma.quoteRequest.count(),
      prisma.wishlistItem.count(),
      prisma.otpCode.count(),
    ]);

    console.log('----------------------------------------------------------------');
    console.log(`Pages:             ${pagesCount} (Expected: ${data.pages.length})`);
    console.log(`Products:          ${prodsCount} (Expected: ${data.products.length})`);
    console.log(`Categories:        ${catsCount} (Expected: ${data.categories.length})`);
    console.log(`Search Cards:      ${scCount} (Expected: ${data.searchCards.length})`);
    console.log(`Site Content:      ${contentCount} (Expected: ${data.siteContent.length})`);
    console.log(`Blog Posts:        ${blogPostsCount} (Expected: ${data.blogPosts.length})`);
    console.log(`Blog Categories:   ${blogCatsCount} (Expected: ${data.blogCategories.length})`);
    console.log(`Users:             ${usersCount} (Expected: ${data.users.length})`);
    console.log(`Catalogues:        ${cataloguesCount} (Expected: ${data.catalogues.length})`);
    console.log(`Case Studies:      ${caseStudiesCount} (Expected: ${data.caseStudies.length})`);
    console.log(`Contact Enquiries: ${enquiryCount} (Expected: ${data.contactEnquiries.length})`);
    console.log(`Quote Requests:    ${quotesCount} (Expected: ${data.quoteRequests.length})`);
    console.log(`Wishlist Items:    ${wishlistCount} (Expected: ${data.wishlistItems.length})`);
    console.log(`OTP Codes:         ${otpCount} (Expected: ${data.otpCodes.length})`);
    console.log('================================================================');
    console.log('🎉 1:1 NEON DATABASE SYNCHRONIZATION COMPLETE!');
    console.log('================================================================');

  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncToNeon();
