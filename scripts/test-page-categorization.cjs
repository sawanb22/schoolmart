const fs = require('fs');
const path = require('path');

const runSeedContent = fs.readFileSync('backend/src/runSeed.ts', 'utf8');

// Extract PAGE_DATA
const pageDataMatch = runSeedContent.match(/const PAGE_DATA:[\s\S]*?=\s*\{([\s\S]*?)\n\s*const corePages/);
const corePagesMatch = runSeedContent.match(/const corePages\s*=\s*\[([\s\S]*?)\];/);

const corePages = eval('[' + corePagesMatch[1] + ']');
console.log('Loaded core pages count:', corePages.length);

const MASTER_TAXONOMY_MAP = {
  'campus-design': {
    label: 'Campus Design & Architecture',
    subcategories: [
      'Campus Master Planning',
      'Architectural Design',
      'Campus Landscaping',
      'Building Design & Execution',
      'Interior Architecture',
      'Renovation & Modernisation',
      'Turnkey Campus Development',
    ],
  },
  'furniture': {
    label: 'Furniture & Interiors',
    subcategories: [
      'Classroom Furniture',
      'Faculty & Administrative Furniture',
      'Library Furniture',
      'Laboratory Furniture',
      'Hostel Furniture',
      'Auditorium Seating',
      'Cafeteria & Dining Furniture',
      'Custom Furniture',
    ],
  },
  'sports-infra': {
    label: 'Sports Infrastructure',
    subcategories: [
      'Indoor Sports Facilities',
      'Outdoor Sports Facilities',
      'Sports Grounds & Playfields',
      'Synthetic Turf',
      'Gymnasium & Fitness Centres',
      'Swimming Pool Infrastructure',
      'Sports Equipment',
    ],
  },
  'ai-tech': {
    label: 'AI & Technology Infrastructure',
    subcategories: [
      'AI Learning Stations',
      'AI & Machine Learning Labs',
      'AI HoloTeacher & Holographic Learning',
      'GPU Servers & Computing Infrastructure',
      'Robotics & Embedded AI Labs',
      'Humanoid Robots',
      'Smart Classrooms',
    ],
  },
  'labs': {
    label: 'Science & Healthcare Labs',
    subcategories: [
      'Physics Laboratories',
      'Chemistry Laboratories',
      'Biology & Life Sciences Labs',
      'Medical & Nursing Skill Labs',
      'Pharmacy & Formulation Labs',
      'Engineering Workshop & Maker Spaces',
      'Research Instrumentation Labs',
    ],
  },
  'libraries': {
    label: 'Library & Learning Resources',
    subcategories: [
      'Digital Library Systems',
      'Automated Library (RFID & Barcode)',
      'Books, Periodicals & Print Resources',
      'E-Resources & Institutional Repositories',
      'Library Furniture & Reading Commons',
    ],
  },
  'additional-infra': {
    label: 'Student Life & Campus Amenities',
    subcategories: [
      'Student Hostels & Living Spaces',
      'Cafeteria & Food Courts',
      'Health Centre & Infirmary',
      'Student Lounges & Activity Zones',
      'Campus Store & Utility Services',
    ],
  },
  'strategic-services': {
    label: 'Strategic Campus Services',
    subcategories: [
      'New College & University Setup',
      'Regulatory Approvals & Affiliations',
      'NAAC / NBA Accreditation Readiness',
      'Campus Feasibility & Financial Planning',
      'Institutional Restructuring & Turnaround',
    ],
  },
  'automation': {
    label: 'Campus Management & Automation',
    subcategories: [
      'Campus ERP & Student Information Systems',
      'Smart Security & Access Control',
      'Energy Management & Sustainability',
      'IT Infrastructure & Networking',
      'Digital Signage & Campus Communications',
    ],
  },
  'turnkey-projects': {
    label: 'Turnkey Academic Projects',
    subcategories: [
      'Complete New Campus Development',
      'Department-Level Modernisation',
      'Centre of Excellence Setup',
      'Incubation Centre & Startup Hub',
      'Multipurpose Auditoriums & Convention Centres',
    ],
  },
};

function resolvePageCategory(slug, title, card) {
  const s = (slug || '').toLowerCase();
  const t = (title || '').toLowerCase();
  const ct = card && (card.title || card.name || card.heading || '').toLowerCase();
  const cd = card && (card.description || card.desc || card.body || '').toLowerCase();
  const text = `${s} ${t} ${ct} ${cd}`;

  // 1. Strategic Services
  if (s.includes('setup-college') || s.includes('ugc-guidelines') || s.includes('colleges-universities-for-sale') ||
      s.includes('partnership') || s.includes('partner-with') || s.includes('corporate') ||
      text.includes('accreditation') || text.includes('naac') || text.includes('affiliation')) {
    return 'strategic-services';
  }

  // 2. Campus Management & Automation
  if (s.includes('campus-automation') || s.includes('lms') || s.includes('assessment-system') ||
      text.includes('campus erp') || text.includes('student information system') ||
      (s.includes('tech-infra') && (text.includes('security') || text.includes('networking') || text.includes('cctv')))) {
    return 'automation';
  }

  // 3. Turnkey Academic Projects
  if (s.includes('innovation') || s.includes('solutions') ||
      text.includes('centre of excellence') || text.includes('incubation') || text.includes('startup hub')) {
    return 'turnkey-projects';
  }

  // 4. Student Life & Campus Amenities
  if (s.includes('collaboration') || s.includes('new-environments') ||
      text.includes('hostel living') || text.includes('cafeteria') || text.includes('student lounge')) {
    return 'additional-infra';
  }

  // 5. Libraries & Learning Resources
  if (s.includes('librar') || text.includes('library management') || text.includes('rfid')) {
    return 'libraries';
  }

  // 6. Science & Healthcare Labs
  if (s.includes('science-tech-labs') || s.includes('labs') ||
      text.includes('physics lab') || text.includes('chemistry lab') || text.includes('nursing lab')) {
    return 'labs';
  }

  // 7. Sports Infrastructure
  if (s.includes('sports')) {
    return 'sports-infra';
  }

  // 8. Furniture & Interiors
  if (s.includes('furniture')) {
    return 'furniture';
  }

  // 9. AI & Technology Infrastructure
  if (s.includes('ai-') || s.includes('ar-vr') || s.includes('smart-classroom') ||
      s.includes('tech-infra') || text.includes('gpu') || text.includes('machine learning')) {
    return 'ai-tech';
  }

  // 10. Campus Design & Architecture
  if (s.includes('campus-design') || s.includes('planning') || s.includes('master-planning') || s.includes('landscape') || s.includes('services')) {
    return 'campus-design';
  }

  return 'campus-design';
}

function resolvePageSubcategory(categorySlug, slug, title, card) {
  const s = (slug || '').toLowerCase();
  const t = (title || '').toLowerCase();
  const ct = card && (card.title || card.name || card.heading || '').toLowerCase();
  const cd = card && (card.description || card.desc || card.body || '').toLowerCase();
  const text = `${s} ${t} ${ct} ${cd}`;

  const def = MASTER_TAXONOMY_MAP[categorySlug];
  if (!def) return null;

  switch (categorySlug) {
    case 'campus-design':
      if (text.includes('master plan') || text.includes('planning') || text.includes('zoning')) return 'Campus Master Planning';
      if (text.includes('landscape') || text.includes('flora') || text.includes('green') || text.includes('rainwater')) return 'Campus Landscaping';
      if (text.includes('interior') || text.includes('acoustic') || text.includes('signage')) return 'Interior Architecture';
      if (text.includes('renovat') || text.includes('modernis') || text.includes('retrofit')) return 'Renovation & Modernisation';
      if (text.includes('building') || text.includes('civil') || text.includes('construction') || text.includes('structure')) return 'Building Design & Execution';
      if (text.includes('turnkey') || text.includes('new campus') || text.includes('execution')) return 'Turnkey Campus Development';
      return 'Architectural Design';

    case 'furniture':
      if (text.includes('faculty') || text.includes('admin') || text.includes('teacher') || text.includes('staff')) return 'Faculty & Administrative Furniture';
      if (text.includes('library') || text.includes('bookshelf') || text.includes('study carrel')) return 'Library Furniture';
      if (text.includes('lab') || text.includes('workbench') || text.includes('fume')) return 'Laboratory Furniture';
      if (text.includes('hostel') || text.includes('bed') || text.includes('wardrobe')) return 'Hostel Furniture';
      if (text.includes('auditorium') || text.includes('seating') || text.includes('tiered')) return 'Auditorium Seating';
      if (text.includes('cafeteria') || text.includes('dining') || text.includes('canteen')) return 'Cafeteria & Dining Furniture';
      if (text.includes('custom') || text.includes('bespoke') || text.includes('modular')) return 'Custom Furniture';
      return 'Classroom Furniture';

    case 'sports-infra':
      if (text.includes('indoor') || text.includes('badminton') || text.includes('squash')) return 'Indoor Sports Facilities';
      if (text.includes('turf') || text.includes('synthetic') || text.includes('astroturf')) return 'Synthetic Turf';
      if (text.includes('gym') || text.includes('fitness') || text.includes('workout')) return 'Gymnasium & Fitness Centres';
      if (text.includes('pool') || text.includes('swimming') || text.includes('aquatic')) return 'Swimming Pool Infrastructure';
      if (text.includes('equipment') || text.includes('scoreboard') || text.includes('post') || text.includes('mat')) return 'Sports Equipment';
      if (text.includes('ground') || text.includes('field') || text.includes('track') || text.includes('athletics')) return 'Sports Grounds & Playfields';
      return 'Outdoor Sports Facilities';

    case 'ai-tech':
      if (text.includes('station') || text.includes('kiosk') || text.includes('touchscreen')) return 'AI Learning Stations';
      if (text.includes('holo') || text.includes('hologram') || text.includes('ar') || text.includes('vr') || text.includes('virtual reality')) return 'AI HoloTeacher & Holographic Learning';
      if (text.includes('gpu') || text.includes('server') || text.includes('cluster') || text.includes('compute')) return 'GPU Servers & Computing Infrastructure';
      if (text.includes('robotics') || text.includes('embedded') || text.includes('iot')) return 'Robotics & Embedded AI Labs';
      if (text.includes('humanoid') || text.includes('social robot')) return 'Humanoid Robots';
      if (text.includes('smart classroom') || text.includes('whiteboard') || text.includes('av')) return 'Smart Classrooms';
      return 'AI & Machine Learning Labs';

    case 'labs':
      if (text.includes('chemistry') || text.includes('chemical') || text.includes('fume')) return 'Chemistry Laboratories';
      if (text.includes('biology') || text.includes('life science') || text.includes('botany') || text.includes('zoology')) return 'Biology & Life Sciences Labs';
      if (text.includes('medical') || text.includes('nursing') || text.includes('clinical') || text.includes('anatomy')) return 'Medical & Nursing Skill Labs';
      if (text.includes('pharmacy') || text.includes('formulation') || text.includes('drug')) return 'Pharmacy & Formulation Labs';
      if (text.includes('maker') || text.includes('workshop') || text.includes('engineering') || text.includes('3d print')) return 'Engineering Workshop & Maker Spaces';
      if (text.includes('instrument') || text.includes('research') || text.includes('spectro')) return 'Research Instrumentation Labs';
      return 'Physics Laboratories';

    case 'libraries':
      if (text.includes('rfid') || text.includes('barcode') || text.includes('gate') || text.includes('automated')) return 'Automated Library (RFID & Barcode)';
      if (text.includes('book') || text.includes('journal') || text.includes('periodical') || text.includes('print')) return 'Books, Periodicals & Print Resources';
      if (text.includes('repository') || text.includes('database') || text.includes('e-resource')) return 'E-Resources & Institutional Repositories';
      if (text.includes('furniture') || text.includes('reading') || text.includes('study pod') || text.includes('carrel')) return 'Library Furniture & Reading Commons';
      return 'Digital Library Systems';

    case 'additional-infra':
      if (text.includes('hostel') || text.includes('living') || text.includes('dorm')) return 'Student Hostels & Living Spaces';
      if (text.includes('cafeteria') || text.includes('food') || text.includes('dining') || text.includes('mess')) return 'Cafeteria & Food Courts';
      if (text.includes('health') || text.includes('infirmary') || text.includes('medical room') || text.includes('doctor')) return 'Health Centre & Infirmary';
      if (text.includes('store') || text.includes('utility') || text.includes('shop') || text.includes('laundry')) return 'Campus Store & Utility Services';
      return 'Student Lounges & Activity Zones';

    case 'strategic-services':
      if (text.includes('ugc') || text.includes('regulatory') || text.includes('approval') || text.includes('affiliation') || text.includes('aicte')) return 'Regulatory Approvals & Affiliations';
      if (text.includes('naac') || text.includes('nba') || text.includes('nirf') || text.includes('accreditation') || text.includes('quality')) return 'NAAC / NBA Accreditation Readiness';
      if (text.includes('feasibility') || text.includes('financial') || text.includes('dpr') || text.includes('funding')) return 'Campus Feasibility & Financial Planning';
      if (text.includes('restructuring') || text.includes('turnaround') || text.includes('revival') || text.includes('partnership')) return 'Institutional Restructuring & Turnaround';
      return 'New College & University Setup';

    case 'automation':
      if (text.includes('security') || text.includes('cctv') || text.includes('access control') || text.includes('surveillance')) return 'Smart Security & Access Control';
      if (text.includes('energy') || text.includes('solar') || text.includes('power') || text.includes('sustainability')) return 'Energy Management & Sustainability';
      if (text.includes('network') || text.includes('wifi') || text.includes('lan') || text.includes('datacenter')) return 'IT Infrastructure & Networking';
      if (text.includes('signage') || text.includes('display') || text.includes('pa system') || text.includes('broadcast')) return 'Digital Signage & Campus Communications';
      return 'Campus ERP & Student Information Systems';

    case 'turnkey-projects':
      if (text.includes('department') || text.includes('modernisation') || text.includes('upgrade')) return 'Department-Level Modernisation';
      if (text.includes('centre of excellence') || text.includes('coe') || text.includes('advanced')) return 'Centre of Excellence Setup';
      if (text.includes('incubat') || text.includes('startup') || text.includes('entrepreneurship') || text.includes('maker')) return 'Incubation Centre & Startup Hub';
      if (text.includes('auditorium') || text.includes('convention') || text.includes('hall') || text.includes('theatre')) return 'Multipurpose Auditoriums & Convention Centres';
      return 'Complete New Campus Development';

    default:
      return def.subcategories[0];
  }
}

// Test against all 45 pages
const distribution = {};
for (const p of corePages) {
  const cat = resolvePageCategory(p.slug, p.title);
  const sub = resolvePageSubcategory(cat, p.slug, p.title);
  distribution[cat] = distribution[cat] || [];
  distribution[cat].push({ slug: p.slug, title: p.title, subcategory: sub });
}

console.log('\n=== MAPPING SUMMARY ACROSS 10 MASTER CATEGORIES ===');
for (const [cat, items] of Object.entries(distribution)) {
  console.log(`\n📂 [${cat}] -> ${MASTER_TAXONOMY_MAP[cat].label} (${items.length} pages):`);
  for (const it of items) {
    console.log(`   • ${it.slug.padEnd(30)} -> Subcategory: [${it.subcategory}]`);
  }
}
