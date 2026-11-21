-- ==============================================================================
-- CampusMart Solutions Finder - SearchCard Table DDL
-- Target: PostgreSQL (compatible with Render Dev and cPanel Production)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "searchcard" (
    "id" SERIAL NOT NULL,
    "cardSlug" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "sectionAnchor" TEXT,
    "categorySlug" TEXT NOT NULL,
    "subcategorySlug" TEXT,
    "secondaryCategorySlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "inclusions" TEXT[] NOT NULL,
    "badge" TEXT,
    "imageUrl" TEXT,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "institutionTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "relatedCardSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "searchcard_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SearchCard_cardSlug_key" UNIQUE ("cardSlug"),
    CONSTRAINT "SearchCard_inclusions_check" CHECK (cardinality("inclusions") = 3)
);

CREATE INDEX IF NOT EXISTS "SearchCard_categorySlug_idx" ON "searchcard"("categorySlug");
CREATE INDEX IF NOT EXISTS "SearchCard_targetSlug_idx" ON "searchcard"("targetSlug");
CREATE INDEX IF NOT EXISTS "SearchCard_active_idx" ON "searchcard"("active");
