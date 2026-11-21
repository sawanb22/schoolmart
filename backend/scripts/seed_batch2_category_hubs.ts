import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface HubData {
  slug: string;
  title: string;
  template?: string;
  categories: string[];
  hero: {
    title?: string;
    titleHtml?: string;
    subtitle?: string;
    bannerImage?: string;
    badge?: string;
    bgColor?: string;
    textColor?: string;
    pageDescription?: string;
    pageDescriptionBgColor?: string;
    pageDescriptionTextColor?: string;
    img?: string;
    mediaUrl?: string;
    mediaType?: string;
  };
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonLabel?: string;
  ctaHref?: string;
  rawBlocks?: Record<string, any>;
}

// Default cards mapped to specific categories for each hub to guarantee rich UI experience
const HUB_CARDS_MAP: Record<string, Array<{
  title: string;
  description: string;
  image: string;
  category: string;
  categories: string[];
  slug: string;
  href?: string;
}>> = {
  'school-building-design': [
    {
      title: 'Traditional School Campus Architecture',
      description: 'Timeless brick and stone educational structures engineered for acoustic privacy, natural thermal comfort, and institutional dignity.',
      image: '/uploads/1776932637991-Gemini_Generated_Image_625qno625qno625q.png',
      category: 'TRADITIONAL',
      categories: ['TRADITIONAL'],
      slug: 'traditional-campus-architecture',
      href: '/school-building-design/traditional-campus-architecture'
    },
    {
      title: 'Futuristic High-Tech Campus Building',
      description: 'Parametric structures featuring smart building management, integrated solar skins, and dynamic collaborative atriums.',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
      category: 'FUTURISTIC',
      categories: ['FUTURISTIC'],
      slug: 'futuristic-campus-building',
      href: '/school-building-design/futuristic-campus-building'
    },
    {
      title: 'Sustainable Vernacular School Design',
      description: 'Net-zero energy designs using locally sourced materials, rainwater harvesting courtyards, and passive wind cooling shafts.',
      image: '/uploads/1776932637991-Gemini_Generated_Image_625qno625qno625q.png',
      category: 'SUSTAINABLE',
      categories: ['SUSTAINABLE'],
      slug: 'sustainable-school-design',
      href: '/school-building-design/sustainable-school-design'
    },
    {
      title: 'New Age Modular Educational Pods',
      description: 'Rapidly deployable prefabricated classroom pavilions providing agile spaces for evolving project-based curricula.',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
      category: 'NEW AGE',
      categories: ['NEW AGE'],
      slug: 'new-age-modular-pods',
      href: '/school-building-design/new-age-modular-pods'
    }
  ],
  'digital': [
    {
      title: '16 Latest Interactive Panels for Classrooms',
      description: 'Ultra-responsive 4K multi-touch displays with built-in Android OS, anti-glare toughened glass, and educational annotation software.',
      image: '/uploads/1777103986877-16 LATESTEST INTERACTIVE FLAT PANELS FOR CLASSROOM.PNG',
      category: 'INTERACTIVE FLAT PANELS',
      categories: ['INTERACTIVE FLAT PANELS'],
      slug: '16-latetest-',
      href: '/p/16-latetest-'
    },
    {
      title: 'Curated AI Tablets for Interactive Classrooms',
      description: 'Ruggedized student learning tablets with enterprise mobile device management, parental controls, and offline-accessible curriculum kits.',
      image: '/uploads/1776939381814-Gemini_Generated_Image_oodsvcoodsvcoods.png',
      category: 'TABLETS',
      categories: ['TABLETS'],
      slug: '20-ai-tools',
      href: '/p/20-ai-tools'
    },
    {
      title: 'Smart Hybrid Digital Boards',
      description: 'Seamless fusion of porcelain magnetic writing surface and optical touch sensors with instant digital cloud archiving.',
      image: '/uploads/1777104808239-IMMERSIVE LEARNING.PNG',
      category: 'DIGITAL BOARDS',
      categories: ['DIGITAL BOARDS'],
      slug: 'talks-to-us',
      href: '/p/talks-to-us'
    }
  ],
  'labs': [
    {
      title: 'Composite Skill Lab & Technical Workshop',
      description: 'Multidisciplinary vocational learning spaces with carpentry, electronics workbench, IoT prototyping stations, and 3D printing.',
      image: '/uploads/1777103755353-COMPOSITE SKILL LAB.PNG',
      category: 'COMPOSITE SKILLS LAB',
      categories: ['COMPOSITE SKILLS LAB'],
      slug: 'composite-skill-lab',
      href: '/p/composite-skill-lab'
    },
    {
      title: 'Next-Gen AI & High-Performance Computer Lab',
      description: 'Ergonomic networked computing workstations configured for computational thinking, graphic coding, and CBSE cyber security curriculums.',
      image: '/uploads/1776969406388-Gemini_Generated_Image_nathq4nathq4nath.png',
      category: 'COMPUTER LAB',
      categories: ['COMPUTER LAB'],
      slug: 'ai-computer-lab',
      href: '/labs/ai-computer-lab'
    },
    {
      title: 'Integrated STEM Discovery & Robotics Studio',
      description: 'Hands-on maker station equipped with modular robotics test tracks, microcontroller kits, sensor matrices, and rapid prototyping tools.',
      image: '/uploads/1777104618774-GAMIFIED SCIENCE LAB.PNG',
      category: 'STEM LAB',
      categories: ['STEM LAB'],
      slug: 'stem-discovery-studio',
      href: '/labs/stem-discovery-studio'
    }
  ],
  'libraries': [
    {
      title: 'Phygital Smart Library & RFID Automation',
      description: 'Automated RFID check-in/check-out kiosks, anti-theft security gates, and digital catalog kiosks connected to school LMS.',
      image: '/uploads/1777103789495-LIBRARY INNOVATIONS.PNG',
      category: 'Phygital Libraries',
      categories: ['Phygital Libraries'],
      slug: 'library-innovations',
      href: '/p/library-innovations'
    },
    {
      title: 'Collaborative Reading Amphitheatres',
      description: 'Tiered upholstered amphitheater seating and ergonomic reading nooks designed to foster quiet immersion and group discussions.',
      image: '/uploads/1777012622668-Gemini_Generated_Image_ngcuvengcuvengcu.png',
      category: 'Reading Zones',
      categories: ['Reading Zones'],
      slug: 'collaborative-reading-zones',
      href: '/libraries/collaborative-reading-zones'
    },
    {
      title: 'Cloud Digital Catalogs & Touch Terminals',
      description: 'OPAC touch consoles enabling instant book lookup, cross-campus inter-library reservations, and digital eBook previews.',
      image: '/uploads/1777012622668-Gemini_Generated_Image_ngcuvengcuvengcu.png',
      category: 'Digital Catalogs',
      categories: ['Digital Catalogs'],
      slug: 'digital-catalogs-terminals',
      href: '/libraries/digital-catalogs-terminals'
    },
    {
      title: 'Augmented Reality Immersive Book Stations',
      description: 'Interactive 3D visual projection desks where physical picture books trigger immersive animated educational models.',
      image: '/uploads/1777104808239-IMMERSIVE LEARNING.PNG',
      category: 'AR Libraries',
      categories: ['AR Libraries'],
      slug: 'ar-libraries-experience',
      href: '/libraries/ar-libraries-experience'
    },
    {
      title: 'Acoustic Focus & Individual Study Pods',
      description: 'Sound-dampening single and dual study pods equipped with task lighting, universal power sockets, and ergonomic seating.',
      image: '/uploads/1777012622668-Gemini_Generated_Image_ngcuvengcuvengcu.png',
      category: 'Study Pods',
      categories: ['Study Pods'],
      slug: 'acoustic-study-pods',
      href: '/libraries/acoustic-study-pods'
    },
    {
      title: 'Curved Modular Open Shelving Displays',
      description: 'Double-sided powder-coated metal book stacks with beechwood end panels and child-height accessible curved perimeter display runs.',
      image: '/uploads/1777012622668-Gemini_Generated_Image_ngcuvengcuvengcu.png',
      category: 'Open Shelving',
      categories: ['Open Shelving'],
      slug: 'curved-open-shelving',
      href: '/libraries/curved-open-shelving'
    },
    {
      title: 'Audio Recording & Audiobook Studio Rooms',
      description: 'Soundproofed media listening booths and podcast recording stations designed for student storytelling and language acquisition.',
      image: '/uploads/1777272882057-SMART MUSIC ROOMS [ PROFESSIONAL ].PNG',
      category: 'Audio Rooms',
      categories: ['Audio Rooms'],
      slug: 'audio-listening-rooms',
      href: '/libraries/audio-listening-rooms'
    }
  ],
  'mathematics': [
    {
      title: 'Mathematica: Universally Mapped Gamified Math Lab',
      description: 'Experiential mathematical discovery room featuring 100+ tangible manipulatives, coordinate floor grids, and digital geometry software.',
      image: '/uploads/1777103933934-GAMIFIED MATH LAB.PNG',
      category: 'MathEMATICA',
      categories: ['MathEMATICA'],
      slug: 'gamified-math-lab',
      href: '/p/gamified-math-lab'
    }
  ],
  'design': [
    {
      title: 'Holistic Kindergarten Architecture & Interiors',
      description: 'Biophilic early education spaces featuring curved corners, non-toxic organic finishes, and developmentally scaled ergonomics.',
      image: '/uploads/1777103713028-KINDERGARTEN DESIGN.PNG',
      category: 'kindergartens',
      categories: ['kindergartens'],
      slug: 'kindergarten-design',
      href: '/p/kindergarten-design'
    },
    {
      title: 'Wondergartens Outdoor & Natural Playgrounds',
      description: 'Sensory nature playgrounds with waterplay channels, mud kitchens, balancing logs, and aromatic discovery gardens.',
      image: '/uploads/1777104764834-WONDERGARTENS.PNG',
      category: 'wondergartens',
      categories: ['wondergartens'],
      slug: 'wondergartens',
      href: '/p/wondergartens'
    },
    {
      title: 'Modern Library Architectural Interiors',
      description: 'Double-height reading spaces with natural light wells, acoustic timber battens, and integrated soft seating clusters.',
      image: '/uploads/1777012622668-Gemini_Generated_Image_ngcuvengcuvengcu.png',
      category: 'libraries',
      categories: ['libraries'],
      slug: 'design-libraries',
      href: '/design/design-libraries'
    },
    {
      title: 'Creative Art & Craft Innovation Studios',
      description: 'Wipe-clean epoxy floors, potter wheels, stainless wash basins, and drying racks tailored for messy artistic exploration.',
      image: '/uploads/1777272957386-ART & CRAFT ROOMS.PNG',
      category: 'art craft',
      categories: ['art craft'],
      slug: 'design-art-craft',
      href: '/design/design-art-craft'
    },
    {
      title: 'Active Interactive Corridors & Hallways',
      description: 'Converting dead circulation corridors into tactile sensory walls, math hopscotches, and exhibition gallery displays.',
      image: '/uploads/1777103960098-INTERACTIVITIES WALLS.PNG',
      category: 'corridors',
      categories: ['corridors'],
      slug: 'design-corridors',
      href: '/p/interactivities-walls'
    },
    {
      title: 'Integrated STEM & Robotics Innovation Center',
      description: 'Zoned maker environments with ideation whiteboards, heavy prototyping bays, and clean electronics testing benches.',
      image: '/uploads/1777272996962-SMART STEM LABS DESIGN TO EXECUTION.PNG',
      category: 'stem/ innovation',
      categories: ['stem/ innovation'],
      slug: 'design-stem-innovation',
      href: '/design/design-stem-innovation'
    },
    {
      title: 'Campus Sports Arenas & Multipurpose Pavilions',
      description: 'Indoor sports stadiums engineered with proper roof acoustics, natural cross-ventilation, and competition timber flooring.',
      image: '/uploads/1776958500100-Gemini_Generated_Image_czxn03czxn03czxn.png',
      category: 'sports',
      categories: ['sports'],
      slug: 'design-sports',
      href: '/design/design-sports'
    },
    {
      title: 'Sensory Rooms & Gross Motor Activity Hubs',
      description: 'Multi-sensory dark rooms, soft play foam pits, and climbing walls supporting physical therapy and sensory integration.',
      image: '/uploads/1777273397940-JUNGLE ROOM FEATURES.PNG',
      category: 'activity /sensory',
      categories: ['activity /sensory'],
      slug: 'design-activity-sensory',
      href: '/design/design-activity-sensory'
    }
  ],
  'science': [
    {
      title: 'Physics Discovery & Mechanics Lab',
      description: 'Anti-vibration optics tables, overhead power tracks, and precision mechanics apparatus meeting CBSE and Cambridge standards.',
      image: '/uploads/1777104618774-GAMIFIED SCIENCE LAB.PNG',
      category: 'PHYSICS LAB',
      categories: ['PHYSICS LAB'],
      slug: 'gamified-science-lab',
      href: '/p/gamified-science-lab'
    },
    {
      title: 'Advanced Chemistry & Reagent Workstation Lab',
      description: 'Chemical-resistant epoxy resin countertops, laminar flow fume hoods, eye-wash stations, and safe chemical storage cabinets.',
      image: '/uploads/1776967655970-Gemini_Generated_Image_rtijkfrtijkfrtij.png',
      category: 'CHEMISTRY LAB',
      categories: ['CHEMISTRY LAB'],
      slug: 'chemistry-workstation-lab',
      href: '/science/chemistry-workstation-lab'
    },
    {
      title: 'Bio-Sciences, Microscopy & Specimen Lab',
      description: 'Binocular LED microscope stations, biological specimen display cases, and digital dissection simulation consoles.',
      image: '/uploads/1776967655970-Gemini_Generated_Image_rtijkfrtijkfrtij.png',
      category: 'BIOLOGY LAB',
      categories: ['BIOLOGY LAB'],
      slug: 'biology-microscopy-lab',
      href: '/science/biology-microscopy-lab'
    }
  ],
  'sports': [
    {
      title: 'IAAF Certified Synthetic Athletic Tracks & Turf',
      description: 'All-weather polyurethane running tracks and FIFA-standard shock-pad artificial turf engineered for high durability.',
      image: '/uploads/1776958500100-Gemini_Generated_Image_czxn03czxn03czxn.png',
      category: 'Track & Field',
      categories: ['Track & Field'],
      slug: 'track-and-field-turf',
      href: '/sports/track-and-field-turf'
    },
    {
      title: 'Dynamic Junior School Playgrounds & Multipurpose Courts',
      description: 'EPDM rubber safety surfacing, climbing towers, and multi-game markings designed for injury-free recess play.',
      image: '/uploads/1777104652290-SMART SPORTS FOR SCHOOLS.PNG',
      category: 'Playground',
      categories: ['Playground'],
      slug: 'junior-playground-courts',
      href: '/p/smart-sports'
    },
    {
      title: 'FIBA Certified Maple Wood & PU Indoor Sports Courts',
      description: 'Cushioned springing system wood courts for basketball, badminton, squash, and volleyball with anti-slip polyurethane coating.',
      image: '/uploads/1776958500100-Gemini_Generated_Image_czxn03czxn03czxn.png',
      category: 'Indoor Courts',
      categories: ['Indoor Courts'],
      slug: 'indoor-sports-courts',
      href: '/sports/indoor-sports-courts'
    },
    {
      title: 'Competition Grade Sports Equipment & Gear',
      description: 'Heavy-duty soccer goals, adjustable basketball posts, tournament volleyball poles, and institutional ball storage carts.',
      image: '/uploads/1777104652290-SMART SPORTS FOR SCHOOLS.PNG',
      category: 'Equipment',
      categories: ['Equipment'],
      slug: 'sports-equipment-gear',
      href: '/sports/sports-equipment-gear'
    },
    {
      title: 'Smart Athlete Performance & Gym Tech Systems',
      description: 'Biometric fitness testing consoles, automated timing gates, and resistance training machines configured for adolescent physical education.',
      image: '/uploads/1776958500100-Gemini_Generated_Image_czxn03czxn03czxn.png',
      category: 'Gym Tech',
      categories: ['Gym Tech'],
      slug: 'gym-tech-systems',
      href: '/sports/gym-tech-systems'
    }
  ]
};

// Convert environments masonry items to cards
function extractEnvironmentsCards(hub: HubData) {
  const masonry = hub.rawBlocks?.environments_page_content?.data?.masonryItems;
  if (!Array.isArray(masonry) || masonry.length === 0) return [];

  const categoryMatcher: Record<string, string> = {
    'DINING HALL': 'Dining Halls & Nutrition',
    'RUMPUS': 'Rumpus & Activity Rooms',
    'MUSIC': 'Smart Music & Audio Studios',
    'ART & CRAFT': 'Art & Craft Innovation',
    'STEM': 'Smart STEM & Maker Labs',
    'HOME SCIENCE': 'Home Science Workspaces',
    'LIBRARY': 'Interactive Kids Libraries',
    'PHYSICAL ACTIVITY': 'Gross Motor & Physical Activity',
    'INDOOR PLAY': 'Gross Motor & Physical Activity',
    'JUNGLE': 'Jungle & Sensory Rooms',
    'AUDITORIUM': 'Mini Auditoriums',
    'DAYLIGHT': 'Dining Halls & Nutrition',
    'WALLS': 'Art & Craft Innovation',
    'DYNAMIC LEARNING': 'Rumpus & Activity Rooms',
    'SAFE LEARNING': 'Dining Halls & Nutrition'
  };

  return masonry.map((item: any, idx: number) => {
    const rawTitle = String(item.t || `Space ${idx + 1}`).trim();
    let matchedCat = 'Dining Halls & Nutrition';
    for (const [key, cat] of Object.entries(categoryMatcher)) {
      if (rawTitle.toUpperCase().includes(key)) {
        matchedCat = cat;
        break;
      }
    }

    const itemSlug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `item-${idx + 1}`;

    return {
      title: rawTitle,
      description: item.cardDescription || item.description || '',
      image: item.mainImg || item.img || '/uploads/1776672867770-images.jpg',
      category: matchedCat,
      categories: [matchedCat],
      slug: itemSlug,
      href: `/environments/${itemSlug}`
    };
  });
}

async function upsertPage(slug: string, title: string, template: string, pageDataStr: string) {
  return await prisma.page.upsert({
    where: { slug },
    update: {
      title,
      template,
      published: true,
      pageData: pageDataStr,
    },
    create: {
      slug,
      title,
      template,
      published: true,
      pageData: pageDataStr,
    }
  });
}

async function main() {
  console.log('================================================================');
  console.log('🌱 SEEDING BATCH 2 CATEGORY HUBS INTO NEON POSTGRESQL 🌱');
  console.log('================================================================\n');

  const jsonPath = path.resolve(__dirname, 'data', 'sportsurf_batch2_category_hubs.json');
  console.log(`[INFO] Reading hubs dataset from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset file not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const hubs: HubData[] = JSON.parse(raw);
  console.log(`[PASS] Loaded ${hubs.length} category hubs from dataset.\n`);

  let upsertedCount = 0;

  for (let i = 0; i < hubs.length; i++) {
    const hub = hubs[i];
    console.log(`[${i + 1}/${hubs.length}] Ingesting Hub: "${hub.title}" (slug: "${hub.slug}")`);

    // Clean categories (trim, filter empty)
    const cleanCategories = (hub.categories || [])
      .map(c => String(c).trim())
      .filter(Boolean);

    // Derive cards
    let cards = HUB_CARDS_MAP[hub.slug] || [];
    if (hub.slug === 'environments') {
      const envCards = extractEnvironmentsCards(hub);
      if (envCards.length > 0) {
        cards = envCards;
      }
    }

    const heroImg = hub.hero?.bannerImage || hub.hero?.mediaUrl || hub.hero?.img || '';
    const heroTitle = hub.hero?.title || hub.title;
    const heroSubtitle = hub.hero?.subtitle || hub.hero?.pageDescription || '';
    const heroBadge = hub.hero?.badge || 'Solution Hub';

    const ctaTitle = hub.ctaTitle || `Configure ${hub.title} Infrastructure`;
    const ctaSubtitle = hub.ctaSubtitle || `Connect with institutional specialists for turnkey ${hub.title.toLowerCase()} execution and equipment supply.`;
    const ctaButtonLabel = hub.ctaButtonLabel || 'Consult Specialists';
    const ctaHref = hub.ctaHref || '/contact-us';

    const pageDataObject = {
      // Core fields required
      categories: cleanCategories,
      hero: hub.hero,
      ctaTitle,
      ctaSubtitle,
      ctaButtonLabel,
      ctaHref,
      ctaButtonHref: ctaHref,
      hideCta: false,
      blocks: hub.rawBlocks || {},
      rawBlocks: hub.rawBlocks || {},

      // Visual & Renderer compatibility
      heroTitle,
      heroSubtitle,
      heroImage: heroImg,
      heroEyebrow: heroBadge,
      heroButtonLabel: ctaButtonLabel,
      heroButtonHref: ctaHref,
      badge: heroBadge,
      heading: heroTitle,
      description: heroSubtitle,
      styles: {
        heroBg: hub.hero?.bgColor || '#002a6c',
        ctaBg: '#002a6c',
        primaryColor: '#0047ab',
        heroLayout: 'split-right',
        cardColumns: '3',
        showFilters: true,
      },
      cards,
      taxonomy: ['Institutional', 'Category Hub', '2026 Spec'],
      technicalParameters: [
        { label: 'Turnkey Architectural Scope', desc: 'Customized layout design, civil specifications, and environmental zoning' },
        { label: 'Equipment & Standard QA', desc: 'Direct-from-manufacturer educational supply meeting institutional benchmarks' },
        { label: 'Integration & Handover', desc: 'End-to-end installation, commissioning, testing, and faculty training workshops' }
      ]
    };

    const pageDataStr = JSON.stringify(pageDataObject);
    const template = hub.template || 'solution-hub';

    // Upsert canonical hub page
    const record = await upsertPage(hub.slug, hub.title, template, pageDataStr);
    console.log(`   ✅ Upserted Page: slug="${record.slug}" (ID: ${record.id}, categories: ${cleanCategories.length}, cards: ${cards.length})`);
    upsertedCount++;

    // If sports hub, also sync sports-infra so both URLs resolve cleanly
    if (hub.slug === 'sports') {
      const sportsInfraRecord = await upsertPage('sports-infra', 'Sports Infrastructure', template, pageDataStr);
      console.log(`   ✅ Synced Alias: slug="${sportsInfraRecord.slug}" (ID: ${sportsInfraRecord.id})`);
      upsertedCount++;
    }
  }

  // Ensure core hub categories exist in the store Category table
  console.log('\n--- Syncing Core Categories into Store Category Table ---');
  const coreStoreCategories = [
    { name: 'Architecture', slug: 'architecture', page: 'school-building-design' },
    { name: 'Digital Infra', slug: 'digital-infra', page: 'digital' },
    { name: 'Environments', slug: 'environments', page: 'environments' },
    { name: 'Labs', slug: 'labs', page: 'labs' },
    { name: 'Libraries', slug: 'libraries', page: 'libraries' },
    { name: 'Mathematics', slug: 'mathematics', page: 'mathematics' },
    { name: 'School Designs', slug: 'school-designs', page: 'design' },
    { name: 'Science', slug: 'science', page: 'science' },
    { name: 'Sports', slug: 'sports', page: 'sports' },
    { name: 'Campus Furniture', slug: 'furniture', page: 'furniture' }
  ];

  for (const cat of coreStoreCategories) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      await prisma.category.update({
        where: { slug: cat.slug },
        data: { name: cat.name, page: cat.page }
      });
      console.log(`   ✓ Updated Store Category: "${cat.name}" (slug: ${cat.slug}, page: ${cat.page})`);
    } else {
      await prisma.category.create({
        data: cat
      });
      console.log(`   + Created Store Category: "${cat.name}" (slug: ${cat.slug}, page: ${cat.page})`);
    }
  }

  const totalPagesInDb = await prisma.page.count();
  const totalCategoriesInDb = await prisma.category.count();

  console.log('\n================================================================');
  console.log(`🎉 COMPLETED BATCH 2 SEEDING!`);
  console.log(`- Hubs Processed: ${hubs.length}`);
  console.log(`- Pages Upserted: ${upsertedCount}`);
  console.log(`- Total Pages in DB: ${totalPagesInDb}`);
  console.log(`- Total Store Categories in DB: ${totalCategoriesInDb}`);
  console.log('================================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error during Batch 2 seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
