-- ======================================================================================
-- SURGICAL CMS UPDATE: Campus Design & Campus Design Execution
-- Database: ideascom_campusmart (PostgreSQL)
-- Table: "page"
-- Guarantee: Modifies ONLY slugs 'campus-design' and 'campus-design-execution'.
-- All other 56 pages, 100+ products, categories, blogs, and uploads remain untouched.
-- ======================================================================================

BEGIN;

-- 1. UPDATE 'campus-design' (Design & Architecture Disciplines)
UPDATE "page"
SET
  "title" = 'Campus Design',
  "template" = 'campus-design',
  "pageData" = $PAGE_DATA$
{
  "heroEyebrow": "Design & Architecture",
  "heroTitle": "Campus Design",
  "heroSubtitle": "Visionary campus master planning, architectural engineering, interior learning environments, and landscape design built for modern pedagogy.",
  "heroImage": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1100&q=85",
  "heroButtonLabel": "Explore Services",
  "heroButtonHref": "/contact-us",
  "section1Title": "Core Design Disciplines",
  "stepCountLabel": "Design Disciplines",
  "readMoreLabel": "Explore Discipline",
  "styles": {
    "headingFont": "poppins",
    "bodyFont": "opensans",
    "primaryColor": "#0047ab",
    "heroBg": "white",
    "ctaBg": "blue",
    "heroLayout": "minimal",
    "cardColumns": "2",
    "showFeatured": false,
    "showFilters": false
  },
  "cards": [
    {
      "title": "Master Planning",
      "tag": "Strategic Architecture",
      "description": "Comprehensive campus master planning for new and existing institutions.",
      "image": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "categories": [
        "Planning"
      ],
      "methodology": "Our master planning process blends institutional pedagogy with physical infrastructure, crafting campuses that inspire curiosity while optimizing everyday operational efficiency.",
      "deliverables": [
        {
          "title": "Zoning & Space Allocation",
          "desc": "Holistic land-use zoning balancing academic, residential, sports, and green corridors."
        },
        {
          "title": "Traffic & Pedestrian Circulation",
          "desc": "Safe, accessible pedestrian flow segregated from vehicle service routes."
        },
        {
          "title": "Scalable Growth Roadmap",
          "desc": "10-year scalable master blueprint designed to accommodate future campus expansion."
        },
        {
          "title": "Regulatory Compliance & Codes",
          "desc": "Fully compliant with national building codes, environmental norms, and municipal bylaws."
        }
      ]
    },
    {
      "title": "Architectural Design",
      "tag": "Structural Engineering & Aesthetics",
      "description": "Innovative architectural solutions for educational buildings.",
      "image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "categories": [
        "Architecture"
      ],
      "methodology": "We design modern academic structures that harmoniously balance form, structural durability, and energy efficiency, turning every building into an inspiring learning environment.",
      "deliverables": [
        {
          "title": "Academic Complex Design",
          "desc": "Modular classroom blocks, high-ceiling scientific labs, and tech-enabled lecture halls."
        },
        {
          "title": "Bioclimatic Architecture",
          "desc": "Passive solar design, natural cross-ventilation, and green building envelope specs (GRIHA / LEED)."
        },
        {
          "title": "Acoustic & Lighting Engineering",
          "desc": "Optimized sound attenuation and daylight integration for peak student focus."
        },
        {
          "title": "3D BIM Walkthroughs",
          "desc": "Building Information Modeling (BIM) for precise cost estimation and contractor handoff."
        }
      ]
    },
    {
      "title": "Interior Design",
      "tag": "Experiential Learning Spaces",
      "description": "Functional and aesthetic interior spaces for learning.",
      "image": "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "categories": [
        "Interiors"
      ],
      "methodology": "Every interior space is crafted around how modern students interact, study, and collaborate, maximizing comfort and long-term utility.",
      "deliverables": [
        {
          "title": "Active Learning Classrooms",
          "desc": "Flexible, reconfigurable learning environments tailored to collaborative and digital teaching."
        },
        {
          "title": "Smart Library & Study Hubs",
          "desc": "Ergonomic study pods, silent research zones, and collaborative digital media suites."
        },
        {
          "title": "Ergonomic Campus Furniture",
          "desc": "Heavy-duty institutional seating and desks engineered specifically for student posture."
        },
        {
          "title": "Wayfinding & Visual Identity",
          "desc": "Vibrant institutional signage, architectural graphics, and intuitive wayfinding systems."
        }
      ]
    },
    {
      "title": "Landscape Design",
      "tag": "Outdoor Learning & Greenery",
      "description": "Outdoor spaces that enhance the campus environment.",
      "image": "https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "categories": [
        "Landscape"
      ],
      "methodology": "Campus landscapes should be living educational environments. We integrate natural ecosystems with functional campus life.",
      "deliverables": [
        {
          "title": "Pedestrian Plazas & Amphitheatres",
          "desc": "Open-air gathering spaces, convocation lawns, and student performance amphitheatres."
        },
        {
          "title": "Micro-Forests & Native Flora",
          "desc": "Low-maintenance, drought-tolerant flora and shade trees promoting local biodiversity."
        },
        {
          "title": "Rainwater Harvesting & Swales",
          "desc": "Ecological drainage basins, bioswales, and groundwater recharge infrastructure."
        },
        {
          "title": "Sports & Wellness Zones",
          "desc": "Integrated fitness trails, outdoor seating pods, and recreational jogging tracks."
        }
      ]
    }
  ],
  "ctaTitle": "Ready to Design Your Campus?",
  "ctaSubtitle": "Collaborate with our chief campus architects and planners to create spaces that empower students and faculty.",
  "ctaButtonLabel": "Request a Project Quote",
  "ctaHref": "/contact-us"
}
  $PAGE_DATA$,
  "published" = true,
  "updatedAt" = NOW()
WHERE "slug" = 'campus-design';


-- 2. UPDATE 'campus-design-execution' (Turnkey 6-Step Execution Process)
UPDATE "page"
SET
  "title" = 'Campus Design & Execution',
  "template" = 'campus-design-execution',
  "pageData" = $PAGE_DATA$
{
  "heroEyebrow": "Turnkey Services",
  "heroTitle": "Design & Execution",
  "heroSubtitle": "A single accountable team from first site visit to final handover — planning, design and on-ground construction for campuses that get built on time.",
  "heroImage": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1100&q=85",
  "heroButtonLabel": "",
  "heroButtonHref": "/request-quote",
  "section1Title": "Turnkey Execution Phases",
  "stepCountLabel": "Sequential Steps",
  "readMoreLabel": "Learn More",
  "styles": {
    "headingFont": "poppins",
    "bodyFont": "opensans",
    "primaryColor": "#0047ab",
    "heroBg": "white",
    "ctaBg": "blue",
    "heroLayout": "minimal",
    "cardColumns": "3",
    "showFeatured": false,
    "showFilters": false
  },
  "cards": [
    {
      "title": "Master Planning & Site Analysis",
      "tag": "Phase 01: Planning",
      "description": "Topography, footfall and growth studies that turn a raw site into a phased master plan built around how your campus will actually be used.",
      "image": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80",
      "categories": [
        "Planning"
      ],
      "methodology": "Detailed topographical analysis, boundary demarcations, environmental clearances, and zoning plans laid out to support structured campus expansion.",
      "deliverables": [
        {
          "title": "Topographical & Soil Survey",
          "desc": "Contour mapping, soil bearing capacity reports, and geological assessment."
        },
        {
          "title": "Zoning & Master Blueprint",
          "desc": "Academic, residential, administrative, and sports zoning matrix."
        },
        {
          "title": "Phased Implementation Roadmap",
          "desc": "Multi-stage execution timeline with milestone-based capex forecasting."
        }
      ]
    },
    {
      "title": "Architectural & Interior Design",
      "tag": "Phase 02: Architecture",
      "description": "Concept-to-working drawings for academic blocks, labs and common areas, balancing daylight, acoustics and NEP-ready classroom layouts.",
      "image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80",
      "categories": [
        "Design"
      ],
      "methodology": "Complete architectural drawings, BIM 3D models, structural engineering calculations, and interior space schematics designed for high student volume.",
      "deliverables": [
        {
          "title": "Architectural Working Drawings",
          "desc": "Detailed elevation, section, and construction detailing drawings."
        },
        {
          "title": "Structural Engineering Review",
          "desc": "Seismic and wind load compliance certified by licensed structural engineers."
        },
        {
          "title": "NEP Space Integration",
          "desc": "Collaborative seating layouts, digital-first lecture rooms, and modular furniture plans."
        }
      ]
    },
    {
      "title": "Construction & Site Execution",
      "tag": "Phase 03: Civil Works",
      "description": "Vetted contractors and a dedicated site engineer keep every phase on schedule, with weekly progress reporting back to your team.",
      "image": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80",
      "categories": [
        "Execution"
      ],
      "methodology": "On-site management led by senior project managers. Daily quality audits, material testing certifications, and milestone tracking.",
      "deliverables": [
        {
          "title": "Civil Foundation & Superstructure",
          "desc": "RCC frame structures, brickwork, plastering, and waterproofing standards."
        },
        {
          "title": "Quality Assurance Testing",
          "desc": "On-site cube testing, reinforcement verification, and raw material batch checks."
        },
        {
          "title": "Daily & Weekly Progress Dashboard",
          "desc": "Live photographic and digital milestone reports shared with leadership."
        }
      ]
    },
    {
      "title": "MEP & Technical Infrastructure",
      "tag": "Phase 04: Systems",
      "description": "Electrical, plumbing and network backbone planned alongside construction, not bolted on afterwards.",
      "image": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80",
      "categories": [
        "Infrastructure"
      ],
      "methodology": "Fully integrated Mechanical, Electrical, Plumbing, and HVAC systems coordinated with IT networking conduits to eliminate rework.",
      "deliverables": [
        {
          "title": "Electrical Substation & Backup",
          "desc": "Transformer sizing, solar panel tie-ins, and automated generator backups."
        },
        {
          "title": "Fire Safety & Water Management",
          "desc": "Hydrant systems, smoke detection, STP, and rainwater recycling."
        },
        {
          "title": "Campus Fiber Network Backbone",
          "desc": "Structured cabling, optical fiber runs, and Wi-Fi access point grids."
        }
      ]
    },
    {
      "title": "Landscape & Outdoor Design",
      "tag": "Phase 05: Outdoors",
      "description": "Courtyards, walkways and green zones that hold up to daily campus traffic.",
      "image": "https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80",
      "categories": [
        "Landscape"
      ],
      "methodology": "Pedestrian-first outdoor design incorporating micro-climates, shaded plazas, native flora, and robust outdoor sports surfaces.",
      "deliverables": [
        {
          "title": "Hardscape & Circulation",
          "desc": "Paver blocks, pedestrian boulevards, and emergency vehicle access routes."
        },
        {
          "title": "Softscape & Native Horticulture",
          "desc": "Drought-resistant trees, sodding, and automated drip irrigation networks."
        },
        {
          "title": "Outdoor Lighting & Signage",
          "desc": "Energy-saving solar lighting, directional wayfinding, and safety illumination."
        }
      ]
    },
    {
      "title": "Handover & Quality Assurance",
      "tag": "Phase 06: Handover",
      "description": "Snag-free handover with full documentation, warranties and defect-liability support.",
      "image": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80",
      "categories": [
        "Handover"
      ],
      "methodology": "Rigorous 100-point snag list resolution, regulatory completion certificates, and 12-month defect liability management.",
      "deliverables": [
        {
          "title": "Comprehensive Snagging Audit",
          "desc": "Joint inspections to rectify any architectural or MEP defects."
        },
        {
          "title": "As-Built Drawings & O&M Manuals",
          "desc": "Complete archival handover of AutoCAD/BIM drawings and maintenance guides."
        },
        {
          "title": "Defect Liability Warranty Support",
          "desc": "Dedicated technical response team for first-year operational assurance."
        }
      ]
    }
  ],
  "ctaTitle": "Ready to Execute Your Campus Project?",
  "ctaSubtitle": "Share your project scope, area, and timelines with our architectural and engineering team.",
  "ctaButtonLabel": "Get a Project Quote",
  "ctaHref": "/request-quote"
}
  $PAGE_DATA$,
  "published" = true,
  "updatedAt" = NOW()
WHERE "slug" = 'campus-design-execution';

COMMIT;
