/**
 * ==============================================================================
 * CampusMart Production Database Push & Synchronization Script
 * File: backend/scripts/2026-11-06-prod-push-renovation-showcase.cjs
 * Date: November 06, 2026
 * ==============================================================================
 * Purpose:
 * Safely deploy the complete Campus Renovation & Modernization Hub Page (template: 'grid')
 * with all 8 project cards, custom subpage HTML case studies, and Before/After
 * showcase image sets to the production PostgreSQL database (ideascom_campusmart)
 * on cPanel shared hosting.
 *
 * It is 100% idempotent and can be safely executed multiple times.
 *
 * Usage on cPanel Terminal (via SSH or cPanel Terminal):
 *   cd /home/ideascom/campusmart-api
 *   source /home/ideascom/nodevenv/campusmart-api/20/bin/activate
 *   node scripts/2026-11-06-prod-push-renovation-showcase.cjs --dry-run
 *   node scripts/2026-11-06-prod-push-renovation-showcase.cjs --apply
 * ==============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isDryRun = !process.argv.includes('--apply');

const RENOVATION_PAGE_DATA = {
  "cards": [
    {
      "href": "/renovation/auditorium-acoustic-stage-modernization",
      "slug": "auditorium-acoustic-stage-modernization",
      "image": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=900&q=80",
      "title": "Heritage Auditorium Acoustic & Stage Modernization",
      "ctaTitle": "Modernize Your University Auditorium",
      "categories": [
        "Auditoriums & AV"
      ],
      "afterImages": [
        "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
      ],
      "ctaSubtitle": "Schedule an on-site acoustic measurement and structural inspection.",
      "description": "Turnkey acoustic and stage engineering for 300 to 1,500 seat university auditoriums. We replace deteriorated seating with ergonomic fire-retardant seats, deploy calibrated NRC 0.85 acoustic timber slats, and integrate intelligent DMX lighting with broadcast-grade Line-Array audio.",
      "beforeImages": [
        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80"
      ],
      "ctaButtonHref": "/contact-us",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Complete turnkey transformation of aging campus auditoriums into world-class cultural, performance, and academic conference venues with computational acoustic engineering.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Acoustic Calibration:</strong> Computational 3D ray-tracing simulations to eliminate flutter echoes and drop reverberation time (RT60) from 2.8s to an optimized, speech-intelligible 1.1s.</li>\n  <li><strong>Seating Architecture:</strong> High-density ergonomic tip-up cushioned seating with integrated anti-panic writing tablets and ADA-compliant accessibility aisles.</li>\n  <li><strong>Stagecraft & Lighting:</strong> Motorised line-voltage fly-bars, DMX-controlled LED profile fixtures, and automated proscenium curtains.</li>\n  <li><strong>Audio-Visual Infrastructure:</strong> Digital Line-Array speaker clusters, redundant Dante audio networking, and 4K laser projection systems.</li>\n</ul>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Project Execution Phases</h3>\n<div class=\"grid grid-cols-1 sm:grid-cols-2 gap-4 my-6\">\n  <div class=\"p-4 rounded-xl bg-slate-50 border border-slate-200\">\n    <span class=\"text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1\">Phase 1 &bull; 10 Days</span>\n    <h4 class=\"font-bold text-slate-900 text-sm mb-1\">Demolition & Structural Testing</h4>\n    <p class=\"text-xs text-slate-600 leading-relaxed\">Laser-leveling floor risers, safely removing deteriorated asbestos/plaster, and load-testing ceiling roof trusses.</p>\n  </div>\n  <div class=\"p-4 rounded-xl bg-slate-50 border border-slate-200\">\n    <span class=\"text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1\">Phase 2 &bull; 18 Days</span>\n    <h4 class=\"font-bold text-slate-900 text-sm mb-1\">Acoustic Shell & AV Pre-Cabling</h4>\n    <p class=\"text-xs text-slate-600 leading-relaxed\">Installing micro-perforated acoustic timber wall panels, ceiling cloud baffles, and redundant optical fibre conduits.</p>\n  </div>\n  <div class=\"p-4 rounded-xl bg-slate-50 border border-slate-200\">\n    <span class=\"text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1\">Phase 3 &bull; 12 Days</span>\n    <h4 class=\"font-bold text-slate-900 text-sm mb-1\">Seating, Carpet & Stagecraft</h4>\n    <p class=\"text-xs text-slate-600 leading-relaxed\">Mounting 850 high-traffic tip-up seats, anti-static commercial carpet tiles, and motorised velvet stage drapes.</p>\n  </div>\n  <div class=\"p-4 rounded-xl bg-slate-50 border border-slate-200\">\n    <span class=\"text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1\">Phase 4 &bull; 5 Days</span>\n    <h4 class=\"font-bold text-slate-900 text-sm mb-1\">Equalization & Commissioning</h4>\n    <p class=\"text-xs text-slate-600 leading-relaxed\">DSP sound calibration, DMX scene programming, emergency egress lighting checks, and campus staff operational handover.</p>\n  </div>\n</div>",
      "ctaButtonLabel": "Request Auditorium Audit",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/smart-lecture-hall-tiered-conversion",
      "slug": "smart-lecture-hall-tiered-conversion",
      "image": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80",
      "title": "Smart Lecture Hall & Tiered Amphitheater Conversion",
      "ctaTitle": "Upgrade Your Campus Classrooms",
      "categories": [
        "Classrooms & Lecture Halls"
      ],
      "ctaSubtitle": "Talk to our learning space architects about turnkey lecture theater conversions.",
      "description": "Convert traditional flat-floor chalk classrooms into modern tiered collaborative amphitheaters. Includes stepped structural risers, in-desk universal USB-C fast charging, auto-tracking PTZ lecture capture, and dual 86-inch 4K interactive touch displays.",
      "ctaButtonHref": "/request-quote",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Re-engineer outdated flat-floor lecture spaces into modern stepped collaborative learning amphitheaters that maximize student sightlines and technological engagement.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Civil & Structural Stepping:</strong> Lightweight steel-reinforced floor risers designed to ensure unobstructed lines of sight from every seat to the presentation zone.</li>\n  <li><strong>Continuous In-Desk Power:</strong> Integrated concealed wireways featuring surge-protected universal AC sockets and 65W USB-C Power Delivery ports at every seat.</li>\n  <li><strong>Hybrid Lecture Capture:</strong> AI-powered optical PTZ cameras with auto-tracking, paired with steerable ceiling microphone arrays for crystal-clear lecture recordings.</li>\n  <li><strong>Interactive Visual Arrays:</strong> Dual 86-inch anti-glare 4K interactive flat panels with wireless casting and multi-source windowing.</li>\n</ul>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Pedagogical Benefits</h3>\n<p class=\"text-slate-600 leading-relaxed mb-4\">By shifting from passive rows to curved, tiered benches, instructors maintain eye contact with all 140 students while fostering peer-to-peer discussion during active learning sessions.</p>",
      "ctaButtonLabel": "Get a Conversion Estimate",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/stem-wet-lab-overhaul",
      "slug": "stem-wet-lab-overhaul",
      "image": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
      "title": "Advanced STEM & Wet Chemistry Laboratory Overhaul",
      "ctaTitle": "Plan Your Lab Modernization",
      "categories": [
        "STEM & Research Labs"
      ],
      "ctaSubtitle": "Our laboratory engineers review ventilation, containment, and utility layout requirements.",
      "description": "Upgrade deteriorated, non-compliant science labs with chemical-resistant monolithic epoxy countertops, high-efficiency VAV fume hoods, safety eyewash/shower stations, and modular utility service spines for gas, vacuum, water, and data.",
      "ctaButtonHref": "/contact-us",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Bring aging science and research laboratories into compliance with international safety, chemical resistance, and air quality benchmarks.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Workstation Surfaces:</strong> Non-porous monolithic epoxy resin countertops completely impervious to corrosive acids, alkaline reagents, and thermal shocks up to 600&deg;C.</li>\n  <li><strong>Ducted Fume Exhaust:</strong> Variable Air Volume (VAV) aerodynamic fume hoods with digital face-velocity monitors, automated sash interlocks, and acid-scrubbed rooftop blowers.</li>\n  <li><strong>Utility Service Spines:</strong> Quick-connect overhead and under-bench raceways providing segregated lines for natural gas, compressed air, deionized water, and high-voltage power.</li>\n  <li><strong>Emergency Life Safety:</strong> Dual stainless-steel emergency eyewash and body deluge shower stations equipped with tempered water mixing valves.</li>\n</ul>",
      "ctaButtonLabel": "Request Lab Assessment",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/student-hostel-modernization",
      "slug": "student-hostel-modernization",
      "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80",
      "title": "Student Hostels & Residential Block Modernization",
      "ctaTitle": "Modernize Your Student Hostels",
      "categories": [
        "Hostels & Dining"
      ],
      "ctaSubtitle": "Deliver safe, modern, and attractive student accommodations across your campus.",
      "description": "Transform aging residential hostels into secure, vibrant living-learning communities. We overhaul washroom plumbing with water-saving fixtures, install durable modular study furniture, deploy secure RFID access locks, and create high-speed Wi-Fi study lounges.",
      "ctaButtonHref": "/contact-us",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Modern campus residences directly influence student recruitment, mental wellbeing, and retention rates. We transform cramped, outdated dormitories into vibrant living-learning communities.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Sanitary & Plumbing Overhaul:</strong> Commercial anti-microbial tiling, touchless sensor faucets, concealed water-saving flush valves, and centralized solar heat-pump water heating.</li>\n  <li><strong>Heavy-Gauge Modular Furniture:</strong> Powder-coated steel bed frames, ergonomic study desks with integrated LED task lighting, lockable wardrobes, and under-bed luggage storage.</li>\n  <li><strong>Smart Access Control:</strong> Contactless RFID keycard and smartphone door locks synchronized with the central campus student management system.</li>\n  <li><strong>Communal Amenities:</strong> Sound-insulated group study pods, recreational student lounges, and energy-efficient commercial laundry zones.</li>\n</ul>",
      "ctaButtonLabel": "Request Hostel Assessment",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/student-dining-commons-revamp",
      "slug": "student-dining-commons-revamp",
      "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
      "title": "Student Dining & Food Commons Revamp",
      "ctaTitle": "Revamp Your Campus Dining Commons",
      "categories": [
        "Hostels & Dining"
      ],
      "ctaSubtitle": "Design a vibrant dining experience with optimized kitchen throughput and comfort.",
      "description": "Reimagine noisy institutional mess halls into modern food-court style social commons. Features acoustic ceiling baffles to lower ambient chatter, heavy-duty commercial banquette seating, digital queue displays, and hygienic touchless tray-return stations.",
      "ctaButtonHref": "/contact-us",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Upgrade institutional mess halls into comfortable, multi-use culinary and social commons that serve as the campus living room.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Acoustic Atmosphere Optimization:</strong> Decorative suspended acoustic baffles and wood-fiber wall panels reducing mealtime noise levels by up to 60%.</li>\n  <li><strong>Diverse Seating Topologies:</strong> High-top counter benches with device charging stations, 4-person booths for quiet study, and movable solid-wood community tables.</li>\n  <li><strong>High-Throughput Kitchen & Serveries:</strong> Commercial stainless-steel hot and cold bain-marie lines, automated plate dishwashers, and digital menu display boards.</li>\n  <li><strong>Hygiene & Waste Management:</strong> Touchless hand-sanitizing portals and segregated organic waste sorting stations.</li>\n</ul>",
      "ctaButtonLabel": "Schedule Dining Audit",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/sports-turf-upgrades",
      "slug": "sports-turf-upgrades",
      "image": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80",
      "title": "Campus Sports Infrastructure & Synthetic Turf Upgrades",
      "ctaTitle": "Build Championship-Grade Sports Facilities",
      "categories": [
        "Sports & Grounds"
      ],
      "ctaSubtitle": "From drainage blueprints to turf installation and spectator seating.",
      "description": "Revitalize neglected outdoor and indoor athletic facilities with FIFA-grade synthetic turf football fields, multi-sport synthetic acrylic basketball courts, automated floodlighting, and covered spectator grandstands.",
      "ctaButtonHref": "/request-quote",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">State-of-the-art sports facilities build school spirit, elevate athletic recruitment, and enable year-round tournament hosting regardless of weather conditions.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Sub-Base & Dynamic Drainage:</strong> Engineered multi-layered crushed stone aggregate base preventing puddling and waterlogging even during peak monsoon downpours.</li>\n  <li><strong>FIFA-Quality Synthetic Turf:</strong> 50mm UV-resistant monofilament polyethylene grass fibers with rounded silica sand and cryogenic rubber infill.</li>\n  <li><strong>Cushioned Acrylic Multi-Courts:</strong> 8-layer ITF-certified acrylic surfacing systems providing superior shock absorption for basketball, volleyball, and tennis.</li>\n  <li><strong>Automated LED Sports Lighting:</strong> Anti-glare 500-lux stadium floodlights with automated timer scheduling to reduce evening electricity consumption.</li>\n</ul>",
      "ctaButtonLabel": "Request Sports Field Proposal",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/facade-restoration-green-spaces",
      "slug": "facade-restoration-green-spaces",
      "image": "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80",
      "title": "Façade Restoration, Landscaping & Campus Green Spaces",
      "ctaTitle": "Enhance Your Campus Curb Appeal",
      "categories": [
        "Green Campus & Energy"
      ],
      "ctaSubtitle": "Get a comprehensive architectural facade and landscaping master plan.",
      "description": "Restore exterior architectural dignity with weather-shield elastomeric coatings, aluminium composite panels (ACP), pedestrianized cobblestone walkways, energy-saving solar streetlights, and drought-tolerant campus gardens.",
      "ctaButtonHref": "/contact-us",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Campus architecture communicates institutional excellence. Our exterior teams restore weathered facades, modernize entry portals, and create pedestrian-friendly green quads.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Exterior Envelope Restoration:</strong> Structural crack repair, hydrophobic elastomeric weather-shield coating, and architectural sun louvres.</li>\n  <li><strong>Pedestrian Circulation:</strong> Interlocking permeable pavers, tactile paving for visual accessibility, and zero-energy solar pathway bollards.</li>\n  <li><strong>Outdoor Learning Quads:</strong> Weatherproof shaded pergolas with high-speed outdoor Wi-Fi access points and outdoor study benches.</li>\n  <li><strong>Sustainable Landscaping:</strong> Low-maintenance native botanical species supported by automated drip irrigation lines and rainwater retention swales.</li>\n</ul>",
      "ctaButtonLabel": "Request Campus Beautification Plan",
      "useCustomDetail": true
    },
    {
      "href": "/renovation/energy-efficiency-solar-integration",
      "slug": "energy-efficiency-solar-integration",
      "image": "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=900&q=80",
      "title": "Campus Energy Efficiency & Rooftop Solar Integration",
      "ctaTitle": "Transition Towards a Net-Zero Campus",
      "categories": [
        "Green Campus & Energy"
      ],
      "ctaSubtitle": "Receive a solar capacity analysis and energy payback calculation report.",
      "description": "Cut institutional operating costs by 40% through turnkey grid-tied rooftop solar PV installations, central chiller HVAC retrofits, smart occupancy sensors, and smart IoT energy metering across academic departments.",
      "ctaButtonHref": "/contact-us",
      "detailContent": "<p class=\"lead text-lg text-slate-700 leading-relaxed font-medium mb-6\">Slash recurring electricity bills and demonstrate environmental stewardship with turnkey clean energy generation and smart building automation.</p>\n<h3 class=\"text-xl font-bold text-slate-900 mt-6 mb-3\">Key Modernization Deliverables</h3>\n<ul class=\"list-disc list-inside space-y-2 text-slate-600 mb-6\">\n  <li><strong>Rooftop Solar PV Farms:</strong> Tier-1 high-efficiency monocrystalline solar panels with grid-tied string inverters and bidirectional net-metering synchronization.</li>\n  <li><strong>HVAC Optimization:</strong> Variable Refrigerant Flow (VRF) and inverter heat-pump systems replacing outdated, power-hungry unitary air conditioners.</li>\n  <li><strong>IoT Energy Monitoring:</strong> Departmental cloud-connected digital sub-meters with live dashboards identifying phantom power loads and peak-demand spikes.</li>\n  <li><strong>Occupancy Automation:</strong> PIR sensor-controlled LED lighting and smart thermostats in classrooms and lecture theaters to eliminate idle energy waste.</li>\n</ul>",
      "ctaButtonLabel": "Request Solar & Energy Audit",
      "useCustomDetail": true
    }
  ],
  "styles": {
    "ctaBg": "stone",
    "heroBg": "blue",
    "bodyFont": "opensans",
    "heroLayout": "split-right",
    "cardColumns": "3",
    "headingFont": "poppins",
    "showFilters": true,
    "primaryColor": "#0047ab",
    "showFeatured": true
  },
  "ctaHref": "/contact-us",
  "category": "renovation",
  "ctaTitle": "Planning a Major Campus Infrastructure Overhaul?",
  "template": "grid",
  "heroImage": "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
  "heroTitle": "Transform Your Campus with Modern, High-Performance Infrastructure",
  "categories": [
    "All",
    "Auditoriums & AV",
    "Classrooms & Lecture Halls",
    "STEM & Research Labs",
    "Hostels & Dining",
    "Sports & Grounds",
    "Green Campus & Energy"
  ],
  "ctaSubtitle": "Our civil engineers, acoustic consultants, and educational technology architects conduct comprehensive on-site facility audits and deliver turnkey project blueprints with fixed timelines and minimal academic disruption.",
  "heroEyebrow": "Campus Modernization",
  "heroSubtitle": "From heritage lecture halls and auditoriums to high-tech STEM labs, student hostels, and athletic facilities—CampusMart delivers complete end-to-end renovation, acoustic calibration, and infrastructure modernization for schools, colleges, and universities.",
  "readMoreLabel": "Explore Transformation",
  "ctaButtonLabel": "Book Facility Inspection",
  "heroButtonHref": "/request-quote",
  "heroButtonLabel": "Request Campus Audit"
};

async function main() {
  console.log('====================================================================');
  console.log('🚀 CampusMart Production Renovation Page & Showcase Sync');
  console.log('Mode:', isDryRun ? '🔍 DRY RUN (Preview only)' : '⚡ LIVE APPLY (Writing to Database)');
  console.log('====================================================================\n');

  // Check if page with slug 'renovation' already exists
  const existing = await prisma.page.findFirst({
    where: { slug: 'renovation' }
  });

  const pagePayload = {
    title: 'Campus Renovation & Modernization',
    slug: 'renovation',
    template: 'grid',
    published: true,
    pageData: JSON.stringify(RENOVATION_PAGE_DATA)
  };

  if (existing) {
    console.log('Found existing page record ID:', existing.id, 'slug:', existing.slug, 'current title:', existing.title);
    if (isDryRun) {
      console.log('\n[DRY RUN] Would update Page ID:', existing.id, 'with new title, template: grid, and 8 project cards.');
    } else {
      const updated = await prisma.page.update({
        where: { id: existing.id },
        data: {
          ...pagePayload,
          updatedAt: new Date()
        }
      });
      console.log('✅ Page ID', updated.id, 'successfully updated to Campus Renovation & Modernization (template: grid).');
    }
  } else {
    console.log('No existing page record found for slug: renovation.');
    if (isDryRun) {
      console.log('\n[DRY RUN] Would create new Page record with slug: renovation.');
    } else {
      const created = await prisma.page.create({
        data: pagePayload
      });
      console.log('✅ Created new Page ID', created.id, 'slug:', created.slug);
    }
  }

  // Trigger search index rebuild if available
  try {
    const { solutionsIndexService } = require('../dist/services/solutions-finder');
    if (solutionsIndexService && typeof solutionsIndexService.rebuild === 'function') {
      if (!isDryRun) {
        console.log('\n🔄 Rebuilding Solutions Finder search index in-memory...');
        await solutionsIndexService.rebuild();
        console.log('✅ Solutions Finder index rebuilt successfully.');
      }
    }
  } catch (err) {
    // Non-fatal if running outside active app process
  }

  console.log('\n====================================================================');
  if (isDryRun) {
    console.log('🔍 DRY RUN COMPLETE: Zero database changes were made.');
    console.log('Run with --apply to write changes to production.');
  } else {
    console.log('🎉 SYNC COMPLETE: Renovation page and Before/After showcase are LIVE in production.');
  }
  console.log('====================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error executing renovation sync:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
