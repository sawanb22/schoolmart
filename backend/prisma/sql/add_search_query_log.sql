-- ==============================================================================
-- CampusMart Solutions Finder - SearchQueryLog Table DDL
-- Target: PostgreSQL (compatible with Render Dev and cPanel Production)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "searchquerylog" (
    "id" SERIAL NOT NULL,
    "queryText" TEXT NOT NULL,
    "institutionType" TEXT,
    "categorySlug" TEXT,
    "matchedCardSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION,
    "userIp" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "searchquerylog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SearchQueryLog_createdAt_idx" ON "searchquerylog"("createdAt");
CREATE INDEX IF NOT EXISTS "SearchQueryLog_categorySlug_idx" ON "searchquerylog"("categorySlug");
CREATE INDEX IF NOT EXISTS "SearchQueryLog_converted_idx" ON "searchquerylog"("converted");
CREATE INDEX IF NOT EXISTS "SearchQueryLog_matchedCount_idx" ON "searchquerylog"("matchedCount");
