-- ==============================================================================
-- CampusMart Production Database Push Script
-- File: backend/prisma/sql/2026-11-05-prod-push-search-taxonomy.sql
-- Date: November 05, 2026
-- Target: PostgreSQL (ideascom_campusmart on cPanel)
-- Purpose: Safely insert or update the full Solutions Finder Taxonomy in the
--          sitecontent table at the time of cPanel production deployment.
-- Usage in cPanel:
--   Option A: Open phpPgAdmin -> Select 'ideascom_campusmart' -> SQL tab -> Paste & Run.
--   Option B: psql -U ideascom_campusmart -d ideascom_campusmart -f 2026-11-05-prod-push-search-taxonomy.sql
-- ==============================================================================

-- ── 1. Ensure required Solutions Finder tables exist ──────────────────────────
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

-- ── 2. Upsert Solutions Finder Taxonomy (10 Categories, 61 Subcategories, 23 Institutions) ──
INSERT INTO public.sitecontent (key, value, "updatedAt")
VALUES (
  'solutions_finder_taxonomy',
  $TAXONOMY_JSON${
  "categories": [
    {
      "id": "campus-design",
      "letterCode": "A",
      "label": "Campus Design & Architecture",
      "shortLabel": "Design & Architecture",
      "iconName": "Compass",
      "subcategories": [
        "Campus Master Planning",
        "Architectural Design",
        "Campus Landscaping",
        "Building Design & Execution",
        "Interior Architecture",
        "Renovation & Modernisation",
        "Turnkey Campus Development"
      ]
    },
    {
      "id": "furniture",
      "letterCode": "B",
      "label": "Furniture & Interiors",
      "shortLabel": "Furniture & Interiors",
      "iconName": "Armchair",
      "subcategories": [
        "Classroom Furniture",
        "Faculty & Administrative Furniture",
        "Library Furniture",
        "Laboratory Furniture",
        "Hostel Furniture",
        "Auditorium Seating",
        "Cafeteria & Dining Furniture",
        "Custom Furniture"
      ]
    },
    {
      "id": "sports-infra",
      "letterCode": "C",
      "label": "Sports Infrastructure",
      "shortLabel": "Sports Infrastructure",
      "iconName": "Trophy",
      "subcategories": [
        "Indoor Sports Facilities",
        "Outdoor Sports Facilities",
        "Sports Grounds & Playfields",
        "Synthetic Turf",
        "Gymnasium & Fitness Centres",
        "Swimming Pool Infrastructure",
        "Sports Equipment"
      ]
    },
    {
      "id": "ai-tech",
      "letterCode": "D",
      "label": "AI & Technology Infrastructure",
      "shortLabel": "AI & Tech Infrastructure",
      "iconName": "Cpu",
      "subcategories": [
        "AI Learning Stations",
        "AI & Machine Learning Labs",
        "AI HoloTeacher & Holographic Learning",
        "GPU Servers & Computing Infrastructure",
        "Robotics & Embedded AI Labs",
        "Humanoid Robots",
        "Smart Classrooms"
      ]
    },
    {
      "id": "labs",
      "letterCode": "E",
      "label": "Science & Healthcare Labs",
      "shortLabel": "Science & Labs",
      "iconName": "Microscope",
      "subcategories": [
        "Physics Laboratories",
        "Chemistry Laboratories",
        "Biology & Life Sciences Labs",
        "Medical & Nursing Skill Labs",
        "Pharmacy & Formulation Labs",
        "Engineering Workshop & Maker Spaces",
        "Research Instrumentation Labs"
      ]
    },
    {
      "id": "libraries",
      "letterCode": "F",
      "label": "Library & Learning Resources",
      "shortLabel": "Library & Learning",
      "iconName": "BookOpen",
      "subcategories": [
        "Digital Library Systems",
        "Automated Library (RFID & Barcode)",
        "Books, Periodicals & Print Resources",
        "E-Resources & Institutional Repositories",
        "Library Furniture & Reading Commons"
      ]
    },
    {
      "id": "additional-infra",
      "letterCode": "G",
      "label": "Student Life & Campus Amenities",
      "shortLabel": "Campus Amenities",
      "iconName": "Users",
      "subcategories": [
        "Student Hostels & Living Spaces",
        "Cafeteria & Food Courts",
        "Health Centre & Infirmary",
        "Student Lounges & Activity Zones",
        "Campus Store & Utility Services"
      ]
    },
    {
      "id": "strategic-services",
      "letterCode": "H",
      "label": "Strategic Campus Services",
      "shortLabel": "Strategic Services",
      "iconName": "ShieldCheck",
      "subcategories": [
        "New College & University Setup",
        "Regulatory Approvals & Affiliations",
        "NAAC / NBA Accreditation Readiness",
        "Campus Feasibility & Financial Planning",
        "Institutional Restructuring & Turnaround"
      ]
    },
    {
      "id": "automation",
      "letterCode": "I",
      "label": "Campus Management & Automation",
      "shortLabel": "Management & Automation",
      "iconName": "Wrench",
      "subcategories": [
        "Campus ERP & Student Information Systems",
        "Smart Security & Access Control",
        "Energy Management & Sustainability",
        "IT Infrastructure & Networking",
        "Digital Signage & Campus Communications"
      ]
    },
    {
      "id": "turnkey-projects",
      "letterCode": "J",
      "label": "Turnkey Academic Projects",
      "shortLabel": "Turnkey Projects",
      "iconName": "Building2",
      "subcategories": [
        "Complete New Campus Development",
        "Department-Level Modernisation",
        "Centre of Excellence Setup",
        "Incubation Centre & Startup Hub",
        "Multipurpose Auditoriums & Convention Centres"
      ]
    }
  ],
  "institutions": [
    { "id": "university", "label": "University", "shortLabel": "University", "group": "higher-ed", "iconName": "Landmark" },
    { "id": "private-university", "label": "Private University", "shortLabel": "Private Univ", "group": "higher-ed", "iconName": "Landmark" },
    { "id": "deemed-university", "label": "Deemed University", "shortLabel": "Deemed Univ", "group": "higher-ed", "iconName": "Landmark" },
    { "id": "engineering", "label": "Engineering Colleges", "shortLabel": "Engineering", "group": "higher-ed", "iconName": "Building2" },
    { "id": "medical-college", "label": "Medical College", "shortLabel": "Medical", "group": "higher-ed", "iconName": "Microscope" },
    { "id": "dental-college", "label": "Dental College", "shortLabel": "Dental", "group": "higher-ed", "iconName": "Microscope" },
    { "id": "pharmacy-college", "label": "Pharmacy College", "shortLabel": "Pharmacy", "group": "higher-ed", "iconName": "Microscope" },
    { "id": "management-school", "label": "Management / Business School", "shortLabel": "B-School", "group": "higher-ed", "iconName": "Award" },
    { "id": "arts-science-college", "label": "Arts & Science College", "shortLabel": "Arts & Science", "group": "higher-ed", "iconName": "BookOpen" },
    { "id": "law-college", "label": "Law College", "shortLabel": "Law", "group": "higher-ed", "iconName": "ShieldCheck" },
    { "id": "architecture-college", "label": "Architecture College", "shortLabel": "Architecture", "group": "higher-ed", "iconName": "Compass" },
    { "id": "polytechnic-college", "label": "Polytechnic College", "shortLabel": "Polytechnic", "group": "higher-ed", "iconName": "Wrench" },
    { "id": "agricultural-college", "label": "Agricultural University / College", "shortLabel": "Agriculture", "group": "higher-ed", "iconName": "Landmark" },
    { "id": "research-institution", "label": "Research Institution", "shortLabel": "Research", "group": "higher-ed", "iconName": "Microscope" },
    { "id": "skill", "label": "Skill Development Centers", "shortLabel": "Skill Centers", "group": "higher-ed", "iconName": "Award" },
    { "id": "vocational", "label": "Vocational Institutes", "shortLabel": "Vocational", "group": "higher-ed", "iconName": "Wrench" },
    { "id": "degree", "label": "Degree Colleges", "shortLabel": "Degree", "group": "higher-ed", "iconName": "GraduationCap" },
    { "id": "school", "label": "School", "shortLabel": "School", "group": "other", "iconName": "School" },
    { "id": "international-school", "label": "International School", "shortLabel": "Intl School", "group": "other", "iconName": "School" },
    { "id": "training-academy", "label": "Training Academy", "shortLabel": "Academy", "group": "other", "iconName": "Award" },
    { "id": "corporate-training", "label": "Corporate Training Centre", "shortLabel": "Corporate Training", "group": "other", "iconName": "Building2" },
    { "id": "government-education", "label": "Government Education Institution", "shortLabel": "Govt Education", "group": "other", "iconName": "Landmark" },
    { "id": "other-custom", "label": "Other (Specify Institution)", "shortLabel": "Other", "group": "other", "iconName": "Layers" }
  ],
  "popularSearchPrompts": [
    "40-seat AI lab with GPU workstations",
    "Smart Classrooms with interactive panels",
    "Modern ergonomic furniture for classrooms and hostel",
    "Synthetic athletic turf and indoor sports complex",
    "I want to build a new university campus"
  ],
  "popularChips": [
    { "label": "40-Seat GPU Lab", "query": "40-seat AI lab with GPU workstations" },
    { "label": "Smart Classrooms", "query": "Smart Classrooms with interactive panels" },
    { "label": "Ergonomic Furniture", "query": "Modern ergonomic furniture for classrooms and hostel" },
    { "label": "Sports Arena", "query": "Synthetic athletic turf and indoor sports complex" },
    { "label": "Turnkey Campus Setup", "query": "I want to build a new university campus" }
  ],
  "placeholder": "Describe your campus need (e.g. 40-seat AI lab, hostel furniture, sports arena)..."
}$TAXONOMY_JSON$,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, "updatedAt" = NOW();

-- ── 3. Upsert Legacy Compatibility Keys ───────────────────────────────────────
INSERT INTO public.sitecontent (key, value, "updatedAt")
VALUES
  ('home_search_placeholder', 'Describe your campus need (e.g. 40-seat AI lab, hostel furniture, sports arena)...', NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, "updatedAt" = NOW();
