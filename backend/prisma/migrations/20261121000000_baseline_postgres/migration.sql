-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "address" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogcategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "blogcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogpost" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "categoryId" INTEGER,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blogpost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casestudy" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casestudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT 'furniture',

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatmessage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatmessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classified" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classified_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactenquiry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "role" TEXT,
    "message" TEXT NOT NULL,
    "resumeFilename" TEXT,
    "resumeOriginalName" TEXT,
    "resumeMimeType" TEXT,
    "resumeSize" INTEGER,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactenquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otpcode" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'verify',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otpcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "template" TEXT,
    "pageData" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "images" TEXT,
    "specifications" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quoterequest" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "institution" TEXT,
    "items" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quoterequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitecontent" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sitecontent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "institution" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlistitem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER,
    "designImage" TEXT,
    "designKey" TEXT,
    "designTitle" TEXT,
    "pageSlug" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlistitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searchcard" (
    "id" SERIAL NOT NULL,
    "cardSlug" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "sectionAnchor" TEXT,
    "categorySlug" TEXT NOT NULL,
    "subcategorySlug" TEXT,
    "secondaryCategorySlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "inclusions" TEXT[],
    "badge" TEXT,
    "imageUrl" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "institutionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedCardSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "searchcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searchquerylog" (
    "id" SERIAL NOT NULL,
    "queryText" TEXT NOT NULL,
    "institutionType" TEXT,
    "categorySlug" TEXT,
    "matchedCardSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION,
    "userIp" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "searchquerylog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "blogcategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "blogpost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_idx" ON "blogpost"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "casestudy"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "Category_page_idx" ON "category"("page");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "chatmessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Classified_userId_idx" ON "classified"("userId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "orderitem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "orderitem"("productId");

-- CreateIndex
CREATE INDEX "OtpCode_email_idx" ON "otpcode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_key_key" ON "sitecontent"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "wishlistitem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "wishlistitem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_designKey_key" ON "wishlistitem"("userId", "designKey");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCard_cardSlug_key" ON "searchcard"("cardSlug");

-- CreateIndex
CREATE INDEX "SearchCard_categorySlug_idx" ON "searchcard"("categorySlug");

-- CreateIndex
CREATE INDEX "SearchCard_targetSlug_idx" ON "searchcard"("targetSlug");

-- CreateIndex
CREATE INDEX "SearchCard_active_idx" ON "searchcard"("active");

-- CreateIndex
CREATE INDEX "SearchQueryLog_createdAt_idx" ON "searchquerylog"("createdAt");

-- CreateIndex
CREATE INDEX "SearchQueryLog_categorySlug_idx" ON "searchquerylog"("categorySlug");

-- CreateIndex
CREATE INDEX "SearchQueryLog_converted_idx" ON "searchquerylog"("converted");

-- CreateIndex
CREATE INDEX "SearchQueryLog_matchedCount_idx" ON "searchquerylog"("matchedCount");

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "Address_user_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogpost" ADD CONSTRAINT "BlogPost_category_fkey" FOREIGN KEY ("categoryId") REFERENCES "blogcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatmessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classified" ADD CONSTRAINT "Classified_user_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "Order_user_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "OrderItem_order_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "OrderItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "Product_category_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistitem" ADD CONSTRAINT "WishlistItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistitem" ADD CONSTRAINT "WishlistItem_user_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

