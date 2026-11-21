const fs = require('fs');
const path = require('path');
const puppeteer = require('D:/schoolmart/campusmart-base/node_modules/puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const desktopDir = 'C:\\Users\\Administrator\\Desktop';
const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\c8046279-62f3-4d81-8bf6-671719dfb2ec';

// MAP 1: SchoolMart Master Architecture Mind Map HTML
const map1Html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SchoolMart Master Architecture & Platform Map</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 2560px;
    height: 1440px;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    position: relative;
    overflow: hidden;
  }
  
  /* Top Header */
  .header {
    width: 100%;
    height: 90px;
    background: #ffffff;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
  }
  .title-group { display: flex; align-items: center; gap: 16px; }
  .brand-badge {
    background: #FBBF24;
    color: #0B192C;
    font-weight: 900;
    font-size: 18px;
    padding: 6px 14px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .main-title {
    font-size: 24px;
    font-weight: 800;
    color: #0B192C;
    letter-spacing: -0.5px;
  }
  .sub-title {
    font-size: 13px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 500;
  }
  .pill-group { display: flex; gap: 10px; }
  .header-pill {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
  }
  .header-pill.accent {
    background: #eff6ff;
    color: #2563eb;
    border-color: #bfdbfe;
  }
  .header-pill.green {
    background: #f0fdf4;
    color: #16a34a;
    border-color: #bbf7d0;
  }

  /* Main Canvas Layout */
  .canvas {
    width: 2560px;
    height: 1280px;
    position: relative;
    padding: 24px 40px;
    display: flex;
    justify-content: space-between;
  }

  /* Left and Right Columns */
  .column {
    width: 960px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
    z-index: 2;
  }

  /* Central Hub */
  .center-hub {
    position: absolute;
    left: 1080px;
    top: 520px;
    width: 400px;
    height: 240px;
    background: linear-gradient(135deg, #0B192C 0%, #1E3E62 100%);
    border-radius: 20px;
    box-shadow: 0 20px 40px -15px rgba(11, 25, 44, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
    color: #ffffff;
    padding: 30px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    z-index: 10;
  }
  .hub-tag {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 800;
    color: #FBBF24;
    margin-bottom: 8px;
  }
  .hub-title {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  .hub-desc {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.4;
    max-width: 320px;
    margin-bottom: 16px;
  }
  .hub-badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .hub-badge {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
  }

  /* Cards */
  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
    height: 236px;
    display: flex;
    flex-direction: column;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .card-title {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    flex: 1;
  }
  .sub-block h4 {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #475569;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sub-block ul {
    list-style: none;
    font-size: 11px;
    line-height: 1.45;
    color: #334155;
  }
  .sub-block li {
    position: relative;
    padding-left: 10px;
    margin-bottom: 3px;
  }
  .sub-block li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #94a3b8;
    font-weight: bold;
  }
  .sub-block li strong {
    color: #0f172a;
  }

  /* SVG Connections Overlay */
  .connections-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 2560px;
    height: 1280px;
    pointer-events: none;
    z-index: 1;
  }

  /* Footer */
  .footer {
    width: 100%;
    height: 70px;
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    font-size: 12px;
    color: #64748b;
  }
  .taxonomy-legend {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
</style>
</head>
<body>

  <!-- Top Header -->
  <div class="header">
    <div class="title-group">
      <div class="brand-badge">SCHOOLMART</div>
      <div>
        <div class="main-title">MASTER APPLICATION ARCHITECTURE & PLATFORM MAP</div>
        <div class="sub-title">Comprehensive Full-Stack Specification · Single Master CMS Engines · 18 Relational Models · Production Deployment Runbook</div>
      </div>
    </div>
    <div class="pill-group">
      <div class="header-pill accent">V3.2 Unified Architecture</div>
      <div class="header-pill green">100% Codebase Grounded</div>
      <div class="header-pill">PostgreSQL (Neon) · Express · React 18 / Vite</div>
      <div class="header-pill">Zero-Fallback Clean Contracts</div>
    </div>
  </div>

  <!-- Main Canvas -->
  <div class="canvas">

    <!-- Left Column (5 Cards) -->
    <div class="column">
      
      <!-- Card 1 -->
      <div class="card" id="card-1">
        <div class="card-header">
          <div class="card-title">⚡ 1. Core Technology Stack</div>
          <div class="card-badge">Runtimes & Frameworks</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Frontend Runtime</h4>
            <ul>
              <li><strong>React 18 + Vite:</strong> SPA with route code-splitting</li>
              <li><strong>Tailwind CSS 3.4:</strong> SchoolMart Yellow (#FBBF24) & Navy</li>
              <li><strong>Lucide React:</strong> Semantic vector icons (9 core suites)</li>
              <li><strong>GSAP + ScrollTrigger:</strong> Dynamic hardware animations</li>
              <li><strong>DOMPurify:</strong> Strict clientside HTML sanitization</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Backend API Runtime</h4>
            <ul>
              <li><strong>Node.js (v18+ LTS):</strong> Express HTTP REST architecture</li>
              <li><strong>TypeScript (tsc):</strong> Strict compilation & type pipeline</li>
              <li><strong>DNS IPv4-First:</strong> Resolves ipv4first preventing timeout</li>
              <li><strong>17 Domain Routers:</strong> Modular backend/src/routes/</li>
              <li><strong>High Payload:</strong> 10MB JSON and URL-encoded limit</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Database & Persistence</h4>
            <ul>
              <li><strong>PostgreSQL (Neon):</strong> Dedicated schoolmart_V2 branch</li>
              <li><strong>Prisma ORM:</strong> Typed client, foreign keys, cascade rules</li>
              <li><strong>Pooled Connection:</strong> PgBouncer & direct compute pooling</li>
              <li><strong>Instant Compute Wake:</strong> Autoscaling zero-downtime serverless</li>
              <li><strong>Referential Integrity:</strong> Automatic cascading foreign keys</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="card" id="card-2">
        <div class="card-header">
          <div class="card-title">🏛️ 2. Relational Database Architecture (18 Models)</div>
          <div class="card-badge">PostgreSQL / Prisma Schema</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Content & CMS Models</h4>
            <ul>
              <li><strong>Page:</strong> id, title, slug (unique), template, pageData</li>
              <li><strong>SiteContent:</strong> id, key (unique), value (JSON), updatedAt</li>
              <li><strong>BlogPost & Category:</strong> slug, body, author, excerpt</li>
              <li><strong>Catalogue:</strong> title, description, fileUrl, active</li>
              <li><strong>CaseStudy:</strong> title, slug (unique), body, imageUrl</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Commerce & Products</h4>
            <ul>
              <li><strong>Product:</strong> name, slug, sku, price, specs, stock</li>
              <li><strong>Category:</strong> slug, name, page relation ('furniture')</li>
              <li><strong>Order & OrderItem:</strong> total, status, qty, unitPrice</li>
              <li><strong>WishlistItem:</strong> userId, productId, designKey, title</li>
              <li><strong>Shop Redirect:</strong> schoolmart.store external integration</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>CRM, Identity & Search</h4>
            <ul>
              <li><strong>User & Address:</strong> email, passwordHash, role, verification</li>
              <li><strong>ContactEnquiry:</strong> name, email, phone, message, read</li>
              <li><strong>QuoteRequest:</strong> institution, items, message, read flag</li>
              <li><strong>SearchCard:</strong> cardSlug, targetSlug, keywords, priority</li>
              <li><strong>SearchQueryLog:</strong> queryText, score, userIp analytics</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="card" id="card-3">
        <div class="card-header">
          <div class="card-title">🛡️ 3. Security, Network & Access Control</div>
          <div class="card-badge">Defense-in-Depth</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Authentication & Identity</h4>
            <ul>
              <li><strong>Stateless JWT:</strong> Cryptographic token signing & verify</li>
              <li><strong>Argon2 / Bcrypt:</strong> Password hash storage with salting</li>
              <li><strong>Dual Login Portals:</strong> /login vs dedicated /admin/login</li>
              <li><strong>Admin Guard:</strong> ADMIN_PORTAL_REQUIRED role safety</li>
              <li><strong>Session Sync:</strong> ensureSessionSynced() client guard</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Safe Hybrid CORS</h4>
            <ul>
              <li><strong>Hardcoded Prod Guard:</strong> schoolmart.in & www domain</li>
              <li><strong>Dynamic Ingestion:</strong> ALLOWED_ORIGINS, FRONTEND_URL</li>
              <li><strong>Auto Normalization:</strong> Strips stray paths & trailing /</li>
              <li><strong>Dev Ports:</strong> Localhost allowlists for 5173, 5174, 3001</li>
              <li><strong>Headers:</strong> Authorization, X-Requested-With safe pass</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Traffic & Rate Defense</h4>
            <ul>
              <li><strong>Helmet Middleware:</strong> Cross-origin resource policies</li>
              <li><strong>Global Limiter:</strong> 100 requests / 15 minutes / IP</li>
              <li><strong>Auth Limiter:</strong> 10 login attempts / 15 minutes</li>
              <li><strong>OTP Limiter:</strong> 5 verification requests / 15 minutes</li>
              <li><strong>Anti-Cache Headers:</strong> no-store on dynamic /api/* endpoints</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="card" id="card-4">
        <div class="card-header">
          <div class="card-title">⚙️ 4. Specialized Engines & Integration Services</div>
          <div class="card-badge">Native Middleware & Pipelines</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Document & Upload Engine</h4>
            <ul>
              <li><strong>Name-Preserving Multer:</strong> Retains genuine filenames</li>
              <li><strong>Path Sanitization:</strong> Strips traversal, hyphens spaces</li>
              <li><strong>Collision Safety:</strong> Appends sequential -1.pdf suffixes</li>
              <li><strong>Size Quotas:</strong> 5MB images, 100MB videos, 50MB docs</li>
              <li><strong>Live Image CDN:</strong> Routes /uploads to sportsurf.in/new/</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>External Cloud Sync</h4>
            <ul>
              <li><strong>Google Sheets Sync:</strong> Non-blocking background push</li>
              <li><strong>Transactional Email:</strong> Nodemailer SMTP templates</li>
              <li><strong>Persistent Storage:</strong> UPLOADS_DIR & RESUMES_DIR</li>
              <li><strong>Direct File Serving:</strong> 7-day immutable asset caching</li>
              <li><strong>Zero-Overwrite:</strong> Uploaded media preserved across deploy</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Search & Discovery Engine</h4>
            <ul>
              <li><strong>Solutions Finder Index:</strong> Weighted keyword & tag matrix</li>
              <li><strong>Multi-Taxonomy Queries:</strong> Category + subcategory match</li>
              <li><strong>Query Analytics:</strong> Logs queries, conversions & user IPs</li>
              <li><strong>Zero-Fallback Invariant:</strong> No artificial dummy card generation</li>
              <li><strong>Hook To Page:</strong> Dropdown linking cards to internal routes</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 5 -->
      <div class="card" id="card-5">
        <div class="card-header">
          <div class="card-title">🚀 5. Deployment & Production Server Architecture</div>
          <div class="card-badge">cPanel Shared Hosting (ideascom)</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Server Host Architecture</h4>
            <ul>
              <li><strong>cPanel Web Server:</strong> Apache reverse proxy routing</li>
              <li><strong>Passenger Node.js:</strong> Daemon executing dist/index.js</li>
              <li><strong>Live API Endpoint:</strong> https://api.schoolmart.in</li>
              <li><strong>Live Web Endpoint:</strong> https://www.schoolmart.in</li>
              <li><strong>SPA Rewrite Rules:</strong> Root .htaccess index.html fallback</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Pre-Extraction Protocol</h4>
            <ul>
              <li><strong>cPanel Merge Quirk:</strong> Zip extraction merges without delete</li>
              <li><strong>Golden Rule:</strong> Delete old assets/ & dist/ before extracting</li>
              <li><strong>Chunk Cache Buster:</strong> Prevents 404s on stale hashed JS</li>
              <li><strong>Protected Invariants:</strong> Live .htaccess, .env never touched</li>
              <li><strong>Desktop Packaging:</strong> Clean tar.exe / zip automated distribution</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Operational Health Checks</h4>
            <ul>
              <li><strong>API Health Endpoint:</strong> GET /health status check (active)</li>
              <li><strong>Log Auditing:</strong> cPanel passenger error logs monitoring</li>
              <li><strong>Zero Downtime Workflow:</strong> Restart Node app from cPanel UI</li>
              <li><strong>Database Snapshots:</strong> Neon instant branch points & sync</li>
              <li><strong>Staging Worktrees:</strong> Isolated git test environments</li>
            </ul>
          </div>
        </div>
      </div>

    </div>

    <!-- Center Hub -->
    <div class="center-hub">
      <div class="hub-tag">PLATFORM CORE HUB</div>
      <div class="hub-title">SCHOOLMART</div>
      <div class="hub-desc">Turnkey School Infrastructure, Unified Master CMS & Institutional Procurement Platform</div>
      <div class="hub-badges">
        <div class="hub-badge">Node + Express</div>
        <div class="hub-badge">React 18 + Vite</div>
        <div class="hub-badge">Postgres (Neon)</div>
        <div class="hub-badge">cPanel Prod</div>
      </div>
    </div>

    <!-- SVG Connectors -->
    <svg class="connections-svg" viewBox="0 0 2560 1280">
      <!-- Left Card Connections -->
      <path d="M 1080 620 C 1020 620, 1000 130, 960 130" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6" opacity="0.6"/>
      <path d="M 1080 630 C 1020 630, 1000 380, 960 380" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6"/>
      <path d="M 1080 640 C 1020 640, 1000 640, 960 640" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.8"/>
      <path d="M 1080 650 C 1020 650, 1000 900, 960 900" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6"/>
      <path d="M 1080 660 C 1020 660, 1000 1150, 960 1150" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6" opacity="0.6"/>

      <!-- Right Card Connections -->
      <path d="M 1480 620 C 1540 620, 1560 130, 1600 130" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6" opacity="0.6"/>
      <path d="M 1480 630 C 1540 630, 1560 380, 1600 380" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6"/>
      <path d="M 1480 640 C 1540 640, 1560 640, 1600 640" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.8"/>
      <path d="M 1480 650 C 1540 650, 1560 900, 1600 900" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6"/>
      <path d="M 1480 660 C 1540 660, 1560 1150, 1600 1150" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6" opacity="0.6"/>
    </svg>

    <!-- Right Column (5 Cards) -->
    <div class="column" style="margin-left: auto;">
      
      <!-- Card 6 -->
      <div class="card" id="card-6">
        <div class="card-header">
          <div class="card-title">📚 6. Unified 5-Group CMS Taxonomy (Master Engines)</div>
          <div class="card-badge">Single-Engine Architecture</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>G1: Articles & Guides</h4>
            <ul>
              <li><strong>Engine:</strong> UniversalArticle</li>
              <li><strong>Template:</strong> article</li>
              <li><strong>Routes:</strong> /p/* (79 resource pages)</li>
              <li><strong>Prose:</strong> Clean typography & rich text</li>
              <li><strong>CTA:</strong> Consultation & Inquiry strip</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>G2: Strategic Hubs</h4>
            <ul>
              <li><strong>Engine:</strong> GenericPage</li>
              <li><strong>Template:</strong> grid</li>
              <li><strong>Routes:</strong> Architecture, Digital, Designs</li>
              <li><strong>Hero:</strong> Dynamic split & hero header</li>
              <li><strong>Controls:</strong> Masonry interactive cards</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>G4: Solution Hubs & Turnkey</h4>
            <ul>
              <li><strong>Engine:</strong> SolutionPage / ServicePage</li>
              <li><strong>Template:</strong> solution-hub / service-suite</li>
              <li><strong>Routes:</strong> Labs, Sports, Libraries, Math</li>
              <li><strong>Filters:</strong> Sticky aside + category pills</li>
              <li><strong>Wishlist & RFP:</strong> 1-click quote triggers</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 7 -->
      <div class="card" id="card-7">
        <div class="card-header">
          <div class="card-title">🔍 7. User Discovery & Interaction Workflows</div>
          <div class="card-badge">Client Journeys & Experience</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Navigation Chrome</h4>
            <ul>
              <li><strong>TopBar:</strong> Institutional ticker & direct phone</li>
              <li><strong>Header:</strong> Mega-menu, search trigger & login</li>
              <li><strong>CategoryBar:</strong> 9 distinct icons (no fallbacks)</li>
              <li><strong>Service Pills:</strong> Row 1 (4 cards) + Row 2 (2 cards 50/50)</li>
              <li><strong>Footer CMS:</strong> Managed links, credentials & policy</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Design Wishlist Engine</h4>
            <ul>
              <li><strong>Hook:</strong> useDesignWishlist reactive state</li>
              <li><strong>Dual-State:</strong> Anonymous localStorage + DB sync</li>
              <li><strong>Prompt Modal:</strong> Prompts login on guest interaction</li>
              <li><strong>Customer Portal:</strong> Dedicated /my-account tab</li>
              <li><strong>Lead Conversion:</strong> Converts wishlist to bulk RFP</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>RFP & Lead Conversion</h4>
            <ul>
              <li><strong>Quote Request Modal:</strong> Captures specs, items, school</li>
              <li><strong>WhatsApp / Call:</strong> 1-click institutional director line</li>
              <li><strong>Catalogue Downloads:</strong> Direct PDF view & download</li>
              <li><strong>Partnership Form:</strong> Embedded institutional inquiries</li>
              <li><strong>Enquiry Triage:</strong> Real-time storage & Sheets export</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 8 -->
      <div class="card" id="card-8">
        <div class="card-header">
          <div class="card-title">🛍️ 8. Institutional Marketplace & Commerce</div>
          <div class="card-badge">Procurement & Merchandising</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Equipment Catalog & Store</h4>
            <ul>
              <li><strong>Store Redirect:</strong> /shop -> schoolmart.store</li>
              <li><strong>Furniture Catalog:</strong> Handled in final staged phase</li>
              <li><strong>Product Detail:</strong> Image gallery, pricing, specs</li>
              <li><strong>Institutional Categories:</strong> Classroom, Lab, AV</li>
              <li><strong>Quote Assembly:</strong> Add to institutional RFP</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Institutional Classifieds</h4>
            <ul>
              <li><strong>Marketplace Route:</strong> /school-sale</li>
              <li><strong>Opportunity Cards:</strong> School sales, growth funding</li>
              <li><strong>Financial Metrics:</strong> Asking price, student capacity</li>
              <li><strong>Confidentiality:</strong> NDA & Mandate document upload</li>
              <li><strong>In-Page Modal:</strong> Direct owner & broker flow</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Partnership Programs</h4>
            <ul>
              <li><strong>Partner Routes:</strong> /partnerships, /corporate</li>
              <li><strong>Models:</strong> Incubation, AI Research hubs, Labs</li>
              <li><strong>Case Studies:</strong> Verified delivery showcases</li>
              <li><strong>Turnkey Contracting:</strong> Institutional rollout</li>
              <li><strong>Workshops & Training:</strong> Faculty skill workshops</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 9 -->
      <div class="card" id="card-9">
        <div class="card-header">
          <div class="card-title">🛠️ 9. Admin CMS & Operations Center</div>
          <div class="card-badge">Unified Governance Hub</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Unified Page Editor</h4>
            <ul>
              <li><strong>Hero Studio:</strong> Layouts, brand color & customizer</li>
              <li><strong>Card Studio:</strong> Rich text, image uploads, internal links</li>
              <li><strong>Filter Chip Manager:</strong> Live add/remove category pills</li>
              <li><strong>CTA Builder:</strong> Custom headings, buttons & colors</li>
              <li><strong>Starter Presets:</strong> 1-click baseline theme injection</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Content & Inventory Ops</h4>
            <ul>
              <li><strong>PagesManager:</strong> Directory, slug collision safety</li>
              <li><strong>Product Manager:</strong> SKU, prices, stock toggle, images</li>
              <li><strong>Categories Manager:</strong> Filter chips vs Store mode</li>
              <li><strong>Catalogues Manager:</strong> PDFs, thumbnails & active flags</li>
              <li><strong>Homepage Editor:</strong> Hero slider, stats, value props</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>CRM, Users & Insights</h4>
            <ul>
              <li><strong>Enquiries Inbox:</strong> Read/unread toggle, downloads</li>
              <li><strong>Wishlist Reports:</strong> Aggregated product demand</li>
              <li><strong>User Management:</strong> Role assignment (admin/user)</li>
              <li><strong>Site Content:</strong> Phones, emails, announcement copy</li>
              <li><strong>Solutions Finder Ops:</strong> Search card weights & tuning</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Card 10 -->
      <div class="card" id="card-10">
        <div class="card-header">
          <div class="card-title">🧪 10. Quality Assurance & Verification Architecture</div>
          <div class="card-badge">Continuous Verification Suites</div>
        </div>
        <div class="card-grid">
          <div class="sub-block">
            <h4>Automated Test Suites</h4>
            <ul>
              <li><strong>Routing Suite:</strong> Verifies normalizeCardHref & links</li>
              <li><strong>Rich Text Suite:</strong> Verifies DOMPurify & sanitization</li>
              <li><strong>Zero-Fallback Suite:</strong> Validates absence of dummy copy</li>
              <li><strong>PDF Upload Suite:</strong> Tests filename preservation</li>
              <li><strong>CMS Editor Suite:</strong> Slug collisions & formula guards</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Zero-Fallback Invariant</h4>
            <ul>
              <li><strong>Empty Guard:</strong> Never render artificial default text</li>
              <li><strong>Title & Description:</strong> Clean suppression when hidden</li>
              <li><strong>Badge Removal:</strong> Purged step pills from card images</li>
              <li><strong>Card Structure:</strong> Strictly [Img] -> [Title] -> [Desc] -> [CTA]</li>
              <li><strong>Clean DOM:</strong> Zero orphaned wrapper divs or breaks</li>
            </ul>
          </div>
          <div class="sub-block">
            <h4>Build & Type Safety</h4>
            <ul>
              <li><strong>Frontend Compilation:</strong> tsc -b && vite build (0 errors)</li>
              <li><strong>Backend Compilation:</strong> npx tsc strict type validation</li>
              <li><strong>Prisma Validation:</strong> Foreign key referential checks</li>
              <li><strong>Anti-Regression:</strong> Pre-commit test runs before deploy</li>
              <li><strong>Live Route Check:</strong> Headless Chrome visual verification</li>
            </ul>
          </div>
        </div>
      </div>

    </div>

  </div>

  <!-- Bottom Legend -->
  <div class="footer">
    <div class="taxonomy-legend">
      <strong>TAXONOMY KEY:</strong>
      <div class="legend-item"><span class="dot" style="background: #2563eb;"></span> Core Stack</div>
      <div class="legend-item"><span class="dot" style="background: #0284c7;"></span> Relational DB</div>
      <div class="legend-item"><span class="dot" style="background: #e11d48;"></span> Security & Auth</div>
      <div class="legend-item"><span class="dot" style="background: #d97706;"></span> Specialized Engines</div>
      <div class="legend-item"><span class="dot" style="background: #16a34a;"></span> Server Ops</div>
      <div class="legend-item"><span class="dot" style="background: #7c3aed;"></span> Unified CMS Engines</div>
      <div class="legend-item"><span class="dot" style="background: #0d9488;"></span> Discovery Workflows</div>
      <div class="legend-item"><span class="dot" style="background: #ea580c;"></span> Institutional Commerce</div>
      <div class="legend-item"><span class="dot" style="background: #4f46e5;"></span> Admin Operations</div>
      <div class="legend-item"><span class="dot" style="background: #059669;"></span> Quality Assurance</div>
    </div>
    <div>SchoolMart Systems Engineering · Master Architecture Mind Map · Generated November 2026</div>
  </div>

</body>
</html>
`;

// MAP 2: SchoolMart Total Page Relationship Tree HTML
const map2Html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SchoolMart Total Page Relationship Tree & Sitemap Architecture</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 2560px;
    height: 1440px;
    background-color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f8fafc;
    position: relative;
    overflow: hidden;
  }

  /* Header Bar */
  .tree-header {
    width: 100%;
    height: 90px;
    background: #1e293b;
    border-bottom: 2px solid #334155;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
  }
  .title-group { display: flex; align-items: center; gap: 16px; }
  .tree-badge {
    background: #FBBF24;
    color: #0B192C;
    font-weight: 900;
    font-size: 18px;
    padding: 6px 14px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .main-title {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
  }
  .sub-title {
    font-size: 13px;
    color: #94a3b8;
    margin-top: 2px;
    font-weight: 500;
  }
  .kpi-pills { display: flex; gap: 10px; }
  .kpi-pill {
    background: #334155;
    border: 1px solid #475569;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #f1f5f9;
  }
  .kpi-pill.highlight {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
  }
  .kpi-pill.green {
    background: #166534;
    border-color: #22c55e;
    color: #ffffff;
  }

  /* Main Canvas */
  .canvas {
    width: 2560px;
    height: 1280px;
    position: relative;
    padding: 20px 40px;
  }

  /* Head Node (Root Homepage) */
  .root-node {
    position: absolute;
    top: 20px;
    left: 1080px;
    width: 400px;
    height: 100px;
    background: linear-gradient(135deg, #FBBF24 0%, #D97706 100%);
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4), 0 0 0 2px #fef08a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #0B192C;
    z-index: 10;
  }
  .root-badge {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    background: #0B192C;
    color: #FBBF24;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .root-title {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.5px;
  }
  .root-subtitle {
    font-size: 11px;
    font-weight: 700;
    opacity: 0.85;
    margin-top: 2px;
  }

  /* Branch Columns Grid */
  .branches-row {
    position: absolute;
    top: 155px;
    left: 40px;
    width: 2480px;
    height: 1100px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    z-index: 5;
  }

  .branch-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    height: 1080px;
    overflow: hidden;
  }
  .branch-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    margin-bottom: 10px;
    border-bottom: 1px solid #334155;
  }
  .branch-title {
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .branch-count {
    background: #0f172a;
    border: 1px solid #475569;
    font-size: 10px;
    font-weight: 700;
    color: #38bdf8;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .sub-section-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    margin: 8px 0 4px 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .page-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    overflow-y: auto;
  }
  .page-item {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 5px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .page-name {
    font-weight: 600;
    color: #e2e8f0;
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .page-slug {
    font-size: 9px;
    color: #64748b;
    font-family: monospace;
  }
  .page-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    background: #1e293b;
    border: 1px solid #475569;
    color: #cbd5e1;
    white-space: nowrap;
  }
  .page-badge.verified {
    background: #064e3b;
    color: #6ee7b7;
    border-color: #059669;
  }
  .page-badge.staged {
    background: #78350f;
    color: #fde68a;
    border-color: #d97706;
  }
  .page-badge.ext {
    background: #4c1d95;
    color: #c4b5fd;
    border-color: #7c3aed;
  }

  /* Tree SVG Wires */
  .tree-wires {
    position: absolute;
    top: 0;
    left: 0;
    width: 2560px;
    height: 1280px;
    pointer-events: none;
    z-index: 2;
  }

  /* Footer Summary */
  .tree-footer {
    width: 100%;
    height: 70px;
    background: #1e293b;
    border-top: 1px solid #334155;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    font-size: 12px;
    color: #94a3b8;
  }
  .legend-items {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .status-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-circle { width: 8px; height: 8px; border-radius: 50%; }
</style>
</head>
<body>

  <!-- Top Header -->
  <div class="tree-header">
    <div class="title-group">
      <div class="tree-badge">SCHOOLMART</div>
      <div>
        <div class="main-title">TOTAL PAGE RELATIONSHIP TREE & SITEMAP ARCHITECTURE</div>
        <div class="sub-title">Hierarchical Site Map · 100% Codebase & CMS API Grounded · Strict Tree Layout · Head-Root to Leaf Graph</div>
      </div>
    </div>
    <div class="kpi-pills">
      <div class="kpi-pill green">Total Live Endpoints: 90</div>
      <div class="kpi-pill highlight">Published CMS Pages: 79</div>
      <div class="kpi-pill">Home Dynamic Tiles: 16</div>
      <div class="kpi-pill">Category Hubs: 9</div>
      <div class="kpi-pill">Admin Center: 10</div>
    </div>
  </div>

  <!-- Main Canvas -->
  <div class="canvas">

    <!-- Head Node -->
    <div class="root-node">
      <div class="root-badge">HEAD OF SITE TREE</div>
      <div class="root-title">HOME PAGE ( / )</div>
      <div class="root-subtitle">Root Master Node · 23 SiteContent Keys · 1 Page Model · 100% Verified in Neon DB</div>
    </div>

    <!-- Tree SVG Connections -->
    <svg class="tree-wires" viewBox="0 0 2560 1280">
      <!-- Root to Branch 1 (Col 1: Navigation & Hubs) -->
      <path d="M 1280 120 C 1280 145, 246 140, 246 155" fill="none" stroke="#FBBF24" stroke-width="2.5" opacity="0.8"/>
      <!-- Root to Branch 2 (Col 2: Home Tiles 1-8) -->
      <path d="M 1280 120 C 1280 145, 660 140, 660 155" fill="none" stroke="#FBBF24" stroke-width="2.5" opacity="0.8"/>
      <!-- Root to Branch 3 (Col 3: Home Tiles 9-16 & Environments 1-7) -->
      <path d="M 1280 120 C 1280 145, 1073 140, 1073 155" fill="none" stroke="#FBBF24" stroke-width="2.5" opacity="0.8"/>
      <!-- Root to Branch 4 (Col 4: Environments 8-15 & Guides) -->
      <path d="M 1280 120 C 1280 145, 1486 140, 1486 155" fill="none" stroke="#FBBF24" stroke-width="2.5" opacity="0.8"/>
      <!-- Root to Branch 5 (Col 5: Corporate & Programs) -->
      <path d="M 1280 120 C 1280 145, 1900 140, 1900 155" fill="none" stroke="#FBBF24" stroke-width="2.5" opacity="0.8"/>
      <!-- Root to Branch 6 (Col 6: Support, Policies & Admin) -->
      <path d="M 1280 120 C 1280 145, 2313 140, 2313 155" fill="none" stroke="#FBBF24" stroke-width="2.5" opacity="0.8"/>
    </svg>

    <!-- 6 Columns Branch Structure -->
    <div class="branches-row">

      <!-- Column 1: Navigation Chrome & Core Category Hubs -->
      <div class="branch-card">
        <div class="branch-header">
          <div class="branch-title">🌲 1. Navigation Chrome & Hubs</div>
          <div class="branch-count">19 Nodes</div>
        </div>

        <div class="sub-section-title">Navigation Chrome (Universal)</div>
        <ul class="page-list">
          <li class="page-item"><div class="page-name">TopBar Header Bar</div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div class="page-name">Mega-Menu Bar</div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div class="page-name">Universal Search Overlay</div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div class="page-name">CategoryBar (9 Lucide Icons)</div><span class="page-badge verified">Verified</span></li>
        </ul>

        <div class="sub-section-title">9 Core Category Hubs</div>
        <ul class="page-list">
          <li class="page-item"><div class="page-name">01. School Furniture</div><span class="page-badge staged">/furniture</span></li>
          <li class="page-item"><div class="page-name">02. Architecture & Design</div><span class="page-badge verified">/school-building-design</span></li>
          <li class="page-item"><div class="page-name">03. Digital Infrastructure</div><span class="page-badge verified">/digital</span></li>
          <li class="page-item"><div class="page-name">04. School Designs Hub</div><span class="page-badge verified">/design</span></li>
          <li class="page-item"><div class="page-name">05. Libraries & Innovation</div><span class="page-badge verified">/libraries</span></li>
          <li class="page-item"><div class="page-name">06. Sports Infrastructure</div><span class="page-badge verified">/sports</span></li>
          <li class="page-item"><div class="page-name">07. Gamified Math Labs</div><span class="page-badge verified">/mathematics</span></li>
          <li class="page-item"><div class="page-name">08. Science & Fun Labs</div><span class="page-badge verified">/science</span></li>
          <li class="page-item"><div class="page-name">09. Composite Skill Labs</div><span class="page-badge verified">/labs</span></li>
          <li class="page-item"><div class="page-name">10. Environments Hub</div><span class="page-badge verified">/environments</span></li>
        </ul>

        <div class="sub-section-title">Homepage Service Pills (4+2 Layout)</div>
        <ul class="page-list">
          <li class="page-item"><div class="page-name">01. School Furniture (Row 1)</div><span class="page-badge verified">25% Col</span></li>
          <li class="page-item"><div class="page-name">02. Digital Infrastructure (Row 1)</div><span class="page-badge verified">25% Col</span></li>
          <li class="page-item"><div class="page-name">03. Sports Infrastructure (Row 1)</div><span class="page-badge verified">25% Col</span></li>
          <li class="page-item"><div class="page-name">04. School Architecture (Row 1)</div><span class="page-badge verified">25% Col</span></li>
          <li class="page-item"><div class="page-name">05. Learning Environments (Row 2)</div><span class="page-badge verified">50% Col</span></li>
          <li class="page-item"><div class="page-name">06. School Design & Planning (Row 2)</div><span class="page-badge verified">50% Col</span></li>
        </ul>
      </div>

      <!-- Column 2: Homepage Masonry Resource Tiles (1 to 8) -->
      <div class="branch-card">
        <div class="branch-header">
          <div class="branch-title">🌲 2. Home Dynamic Tiles (1-8)</div>
          <div class="branch-count">8 Pages</div>
        </div>
        <div class="sub-section-title">Direct Homepage Click Routes</div>
        <ul class="page-list">
          <li class="page-item">
            <div>
              <div class="page-name">01. Immersive Learning</div>
              <div class="page-slug">/p/immersive-learning</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">02. Kindergarten Design</div>
              <div class="page-slug">/p/kindergarten-design</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">03. Composite Skill Lab</div>
              <div class="page-slug">/p/composite-skill-lab</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">04. Library Innovations</div>
              <div class="page-slug">/p/library-innovations</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">05. Furniture Design Planning</div>
              <div class="page-slug">/p/furniture-design-planning-</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">06. Selling or Buying a School</div>
              <div class="page-slug">/p/sellning-or-buying-a-school</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">07. Gamified Math Lab</div>
              <div class="page-slug">/p/gamified-math-lab</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">08. Interactivities Walls</div>
              <div class="page-slug">/p/interactivities-walls</div>
            </div>
            <span class="page-badge verified">Article</span>
          </li>
        </ul>

        <div class="sub-section-title">Content Engine Specs</div>
        <ul class="page-list">
          <li class="page-item"><div class="page-name">Target Model: Page (slug=p/*)</div><span class="page-badge verified">Prisma</span></li>
          <li class="page-item"><div class="page-name">Template: UniversalArticle</div><span class="page-badge verified">Template</span></li>
          <li class="page-item"><div class="page-name">Assets: sportsurf.in/new/uploads/</div><span class="page-badge verified">Live CDN</span></li>
          <li class="page-item"><div class="page-name">Fallback Guard: Zero Artificial Text</div><span class="page-badge verified">Active</span></li>
        </ul>
      </div>

      <!-- Column 3: Homepage Masonry Resource Tiles (9 to 16) & Environments (1-7) -->
      <div class="branch-card">
        <div class="branch-header">
          <div class="branch-title">🌲 3. Home Tiles (9-16) & Envs</div>
          <div class="branch-count">15 Pages</div>
        </div>
        <div class="sub-section-title">Home Dynamic Tiles (9 to 16)</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">09. 16 Latest Solutions</div><div class="page-slug">/p/16-latetest-</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">10. 20 AI Tools for Schools</div><div class="page-slug">/p/20-ai-tools</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">11. The Best Learning Spaces</div><div class="page-slug">/p/the-best-</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">12. Gamified Science Lab</div><div class="page-slug">/p/gamified-science-lab</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">13. Smart Sports Infrastructure</div><div class="page-slug">/p/smart-sports</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">14. Complete School Setup</div><div class="page-slug">/p/complete-school-setup</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">15. Talk to Us (Consulting)</div><div class="page-slug">/p/talks-to-us</div></div><span class="page-badge verified">Article</span></li>
          <li class="page-item"><div><div class="page-name">16. Wondergartens Learning</div><div class="page-slug">/p/wondergartens</div></div><span class="page-badge verified">Article</span></li>
        </ul>

        <div class="sub-section-title">Learning Environments (1 to 7)</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">Art & Craft Rooms</div><div class="page-slug">/p/environment-art-craft-rooms</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Dynamic Learning Spaces</div><div class="page-slug">/p/environment-creating-dynamic...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Safe Learning Spaces</div><div class="page-slug">/p/environment-creating-safe...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Dining Hall Design</div><div class="page-slug">/p/environment-dining-hall...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Home Science Rooms</div><div class="page-slug">/p/environment-home-science-room</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Indoor Play Activity Rooms</div><div class="page-slug">/p/environment-indoor-play...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Interactive Kids Library</div><div class="page-slug">/p/environment-interactive-kids...</div></div><span class="page-badge verified">Env</span></li>
        </ul>
      </div>

      <!-- Column 4: Learning Environments (8-15) & Institutional Guides -->
      <div class="branch-card">
        <div class="branch-header">
          <div class="branch-title">🌲 4. Environments & Guides</div>
          <div class="branch-count">13 Pages</div>
        </div>
        <div class="sub-section-title">Learning Environments (8 to 15)</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">Jungle Room Features</div><div class="page-slug">/p/environment-jungle-room...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Kindergarten Physical Activity</div><div class="page-slug">/p/environment-kindergarten-...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Mini Auditoriums</div><div class="page-slug">/p/environment-mini-auditoriums...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Rumpus Rooms</div><div class="page-slug">/p/environment-rumpus-rooms</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Smart Music Rooms</div><div class="page-slug">/p/environment-smart-music...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Smart STEM Labs</div><div class="page-slug">/p/environment-smart-stem-labs...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Daylight In Classrooms</div><div class="page-slug">/p/environment-the-importance...</div></div><span class="page-badge verified">Env</span></li>
          <li class="page-item"><div><div class="page-name">Classroom Walls Beyond Whiteboard</div><div class="page-slug">/p/environment-why-should...</div></div><span class="page-badge verified">Env</span></li>
        </ul>

        <div class="sub-section-title">Institutional Guides & Frameworks</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">50 Global Resources for Excellence</div><div class="page-slug">/p/guide-50-global-resources...</div></div><span class="page-badge verified">Guide</span></li>
          <li class="page-item"><div><div class="page-name">Legendary School Brand Guide</div><div class="page-slug">/p/guide-ultimate-guide-...</div></div><span class="page-badge verified">Guide</span></li>
          <li class="page-item"><div><div class="page-name">Institutional Setup Guide</div><div class="page-slug">/setup-guide</div></div><span class="page-badge verified">Guide</span></li>
          <li class="page-item"><div><div class="page-name">Guides Directory Hub</div><div class="page-slug">/guides</div></div><span class="page-badge verified">Hub</span></li>
          <li class="page-item"><div><div class="page-name">Blog & Editorial Insights</div><div class="page-slug">/blog</div></div><span class="page-badge verified">Blog</span></li>
        </ul>
      </div>

      <!-- Column 5: Corporate, Institutional & Commercial Programs -->
      <div class="branch-card">
        <div class="branch-header">
          <div class="branch-title">🌲 5. Corporate & Programs</div>
          <div class="branch-count">11 Pages</div>
        </div>
        <div class="sub-section-title">Institutional Engagement</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">About SchoolMart</div><div class="page-slug">/aboutus</div></div><span class="page-badge verified">Corp</span></li>
          <li class="page-item"><div><div class="page-name">Corporate Solutions</div><div class="page-slug">/corporate</div></div><span class="page-badge verified">Corp</span></li>
          <li class="page-item"><div><div class="page-name">Institutional Partnerships</div><div class="page-slug">/partnerships</div></div><span class="page-badge verified">Program</span></li>
          <li class="page-item"><div><div class="page-name">School Fundraising & Grants</div><div class="page-slug">/fundraising</div></div><span class="page-badge verified">Program</span></li>
          <li class="page-item"><div><div class="page-name">School Sale & Classifieds</div><div class="page-slug">/school-sale</div></div><span class="page-badge verified">Market</span></li>
          <li class="page-item"><div><div class="page-name">Institutional Manufacturing</div><div class="page-slug">/manufacturing</div></div><span class="page-badge verified">Supply</span></li>
          <li class="page-item"><div><div class="page-name">Workshops & Faculty Training</div><div class="page-slug">/workshops</div></div><span class="page-badge verified">Training</span></li>
          <li class="page-item"><div><div class="page-name">Sell on SchoolMart</div><div class="page-slug">/sell-on-schoolmart</div></div><span class="page-badge verified">Vendor</span></li>
          <li class="page-item"><div><div class="page-name">Catalogues & Downloads</div><div class="page-slug">/catalogues</div></div><span class="page-badge verified">PDFs</span></li>
        </ul>

        <div class="sub-section-title">Commercial Store Integration</div>
        <ul class="page-list">
          <li class="page-item">
            <div>
              <div class="page-name">SchoolMart Store (External)</div>
              <div class="page-slug">schoolmart.store</div>
            </div>
            <span class="page-badge ext">301 Redirect</span>
          </li>
          <li class="page-item">
            <div>
              <div class="page-name">Furniture Catalog (Staged)</div>
              <div class="page-slug">/furniture</div>
            </div>
            <span class="page-badge staged">Final Phase</span>
          </li>
        </ul>
      </div>

      <!-- Column 6: Support, Policies & Admin Governance -->
      <div class="branch-card">
        <div class="branch-header">
          <div class="branch-title">🌲 6. Policies & Admin Hub</div>
          <div class="branch-count">24 Pages</div>
        </div>

        <div class="sub-section-title">Customer Support & Statutory Policies</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">Contact Us & RFP</div><div class="page-slug">/contact-us</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">How It Works</div><div class="page-slug">/how-it-works</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Pricing & Procurements</div><div class="page-slug">/pricing</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Payments & Banking</div><div class="page-slug">/payments</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Shipping Policy</div><div class="page-slug">/shipping-policy</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Cancellation Policy</div><div class="page-slug">/cancellation-policy</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Returns & Refunds</div><div class="page-slug">/replacement-return</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Order Rejection Policy</div><div class="page-slug">/order-rejection-policy</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Delivery Locations</div><div class="page-slug">/delivery-locations</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Report Issue / Grievance</div><div class="page-slug">/report-issue</div></div><span class="page-badge verified">Verified</span></li>
          <li class="page-item"><div><div class="page-name">Seller Help Center</div><div class="page-slug">/seller-help</div></div><span class="page-badge verified">Verified</span></li>
        </ul>

        <div class="sub-section-title">Admin Governance & Operations Hub</div>
        <ul class="page-list">
          <li class="page-item"><div><div class="page-name">Dedicated Admin Login</div><div class="page-slug">/admin/login</div></div><span class="page-badge verified">Portal</span></li>
          <li class="page-item"><div><div class="page-name">Operations Dashboard</div><div class="page-slug">/admin/dashboard</div></div><span class="page-badge verified">Portal</span></li>
          <li class="page-item"><div><div class="page-name">Pages Manager (CMS)</div><div class="page-slug">/admin/pages</div></div><span class="page-badge verified">CMS</span></li>
          <li class="page-item"><div><div class="page-name">Site Content & Ticker</div><div class="page-slug">/admin/site-content</div></div><span class="page-badge verified">CMS</span></li>
          <li class="page-item"><div><div class="page-name">Products & Inventory</div><div class="page-slug">/admin/products</div></div><span class="page-badge verified">Commerce</span></li>
          <li class="page-item"><div><div class="page-name">Category Chip Manager</div><div class="page-slug">/admin/categories</div></div><span class="page-badge verified">Commerce</span></li>
          <li class="page-item"><div><div class="page-name">Catalogues PDF Manager</div><div class="page-slug">/admin/catalogues</div></div><span class="page-badge verified">Assets</span></li>
          <li class="page-item"><div><div class="page-name">Enquiries & RFP Inbox</div><div class="page-slug">/admin/enquiries</div></div><span class="page-badge verified">CRM</span></li>
          <li class="page-item"><div><div class="page-name">Orders & Invoices</div><div class="page-slug">/admin/orders</div></div><span class="page-badge verified">Commerce</span></li>
          <li class="page-item"><div><div class="page-name">User Roles & Access</div><div class="page-slug">/admin/users</div></div><span class="page-badge verified">Auth</span></li>
        </ul>
      </div>

    </div>

  </div>

  <!-- Footer Legend -->
  <div class="tree-footer">
    <div class="legend-items">
      <strong>STATUS LEGEND:</strong>
      <div class="status-tag"><span class="status-circle" style="background: #22c55e;"></span> Verified / Live Grounded</div>
      <div class="status-tag"><span class="status-circle" style="background: #eab308;"></span> Furniture (Staged for Final Phase)</div>
      <div class="status-tag"><span class="status-circle" style="background: #a855f7;"></span> External Store 301 Redirect</div>
      <div class="status-tag"><span class="status-circle" style="background: #38bdf8;"></span> Dynamic Universal Article / Template</div>
    </div>
    <div>Hierarchical Full-Tree Sitemap Architecture · SchoolMart Systems Engineering · Total Records: 90 Endpoints</div>
  </div>

</body>
</html>
`;

// Execution Function
(async () => {
  console.log('Writing HTML files...');
  const map1HtmlPath = path.join(artifactDir, 'SchoolMart_Master_Architecture_Mind_Map.html');
  const map2HtmlPath = path.join(artifactDir, 'SchoolMart_Total_Page_Relationship_Tree.html');
  
  fs.writeFileSync(map1HtmlPath, map1Html, 'utf8');
  fs.writeFileSync(map2HtmlPath, map2Html, 'utf8');
  console.log('HTML files created.');

  console.log('Launching Puppeteer Chrome...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=max']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 1 });

  // 1. Render Map 1: Master Architecture
  console.log('Rendering Map 1: SchoolMart Master Architecture...');
  await page.goto('file:///' + map1HtmlPath.replace(/\\\\/g, '/'), { waitUntil: 'networkidle0' });
  
  const map1PngPath = path.join(artifactDir, 'SchoolMart_Master_Architecture_Mind_Map.png');
  const map1DesktopPng = path.join(desktopDir, 'SchoolMart_Master_Architecture_Mind_Map.png');
  const map1PdfPath = path.join(artifactDir, 'SchoolMart_Master_Architecture_Mind_Map.pdf');
  const map1DesktopPdf = path.join(desktopDir, 'SchoolMart_Master_Architecture_Mind_Map.pdf');

  await page.screenshot({ path: map1PngPath, fullPage: true });
  fs.copyFileSync(map1PngPath, map1DesktopPng);

  await page.pdf({
    path: map1PdfPath,
    width: '2560px',
    height: '1440px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  fs.copyFileSync(map1PdfPath, map1DesktopPdf);
  console.log('Map 1 generated and saved to Artifacts and Desktop!');

  // 2. Render Map 2: Total Page Relationship Tree
  console.log('Rendering Map 2: Total Page Relationship Tree...');
  await page.goto('file:///' + map2HtmlPath.replace(/\\\\/g, '/'), { waitUntil: 'networkidle0' });

  const map2PngPath = path.join(artifactDir, 'SchoolMart_Total_Page_Relationship_Tree.png');
  const map2DesktopPng = path.join(desktopDir, 'SchoolMart_Total_Page_Relationship_Tree.png');
  const map2PdfPath = path.join(artifactDir, 'SchoolMart_Total_Page_Relationship_Tree.pdf');
  const map2DesktopPdf = path.join(desktopDir, 'SchoolMart_Total_Page_Relationship_Tree.pdf');

  await page.screenshot({ path: map2PngPath, fullPage: true });
  fs.copyFileSync(map2PngPath, map2DesktopPng);

  await page.pdf({
    path: map2PdfPath,
    width: '2560px',
    height: '1440px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  fs.copyFileSync(map2PdfPath, map2DesktopPdf);
  console.log('Map 2 generated and saved to Artifacts and Desktop!');

  await browser.close();
  console.log('All operations completed successfully!');
})();
