-- AlterTable
ALTER TABLE "page" ADD COLUMN     "contentModel" TEXT NOT NULL DEFAULT 'document',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "page" ALTER COLUMN "pageData" TYPE JSONB
  USING (CASE WHEN "pageData" IS NULL OR btrim("pageData") = '' THEN NULL ELSE "pageData"::jsonb END);

-- CreateTable
CREATE TABLE "pageitem" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "collection" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "imageUrl" TEXT,
    "href" TEXT,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL DEFAULT '{}',
    "detail" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pageitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagecategory" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagecategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pageitemcategory" (
    "itemId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pageitemcategory_pkey" PRIMARY KEY ("itemId","categoryId")
);

-- CreateTable
CREATE TABLE "slugredirect" (
    "id" SERIAL NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slugredirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagerevision" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagerevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cmsstate" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cmsstate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageItem_pageId_collection_sortOrder_idx" ON "pageitem"("pageId", "collection", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PageItem_pageId_slug_key" ON "pageitem"("pageId", "slug");

-- CreateIndex
CREATE INDEX "PageCategory_pageId_sortOrder_idx" ON "pagecategory"("pageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PageCategory_pageId_slug_key" ON "pagecategory"("pageId", "slug");

-- CreateIndex
CREATE INDEX "PageItemCategory_categoryId_idx" ON "pageitemcategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SlugRedirect_fromPath_key" ON "slugredirect"("fromPath");

-- CreateIndex
CREATE INDEX "PageRevision_pageId_createdAt_idx" ON "pagerevision"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "Page_published_idx" ON "page"("published");

-- AddForeignKey
ALTER TABLE "pageitem" ADD CONSTRAINT "pageitem_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagecategory" ADD CONSTRAINT "pagecategory_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pageitemcategory" ADD CONSTRAINT "pageitemcategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "pageitem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pageitemcategory" ADD CONSTRAINT "pageitemcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "pagecategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagerevision" ADD CONSTRAINT "pagerevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Initial CmsState row
INSERT INTO "cmsstate" ("id","version","updatedAt") VALUES (1, 1, NOW()) ON CONFLICT ("id") DO NOTHING;
