import { SolutionCardDto, SolutionsTaxonomy } from './types/solutions-card.types';

export const EXCLUDED_PAGE_SLUGS = new Set<string>([
  'contact-us',
  'about-us',
  'privacy-policy',
  'payment-policy',
  'replacement-return',
  'terms-of-use',
  'order-rejection',
  'how-it-works',
  'brand-help',
  'sell-on-schoolmart',
  'sell-on-campusmart',
  'faq',
  'blog',
  'shop',
  'job-openings',
  'partner-with-colleges',
  'resources',
  'home',
  'catalogues',
  'classifieds',
  'colleges-universities-for-sale',
]);

export const CATEGORY_DELIVERABLE_FALLBACKS: Record<string, [string, string, string]> = {
  'campus-design': [
    'Comprehensive Architectural & Master Planning Blueprint',
    'Zoning, Circulation & Regulatory Compliance Layout',
    'Detailed Bill of Quantities (BOQ) & Tender Specifications',
  ],
  'furniture': [
    'Ergonomic Space Layout & Density Planning',
    'Institutional Grade Modular Furniture Supply',
    'On-Site Assembly, Installation & Warranty Coverage',
  ],
  'sports-infra': [
    'FIBA/FIFA Regulation Surface Engineering',
    'High-Durability Sports Equipment Procurement',
    'Civil Ground Preparation, Lighting & Annual Maintenance',
  ],
  'ai-tech': [
    'Turnkey Hardware & Computing Cluster Procurement',
    'Specialized Software & API Pipeline Deployment',
    'End-to-End Commissioning, Training & AMC Support',
  ],
  'labs': [
    'Laboratory Layout, Safety & Ventilation Design',
    'Precision Instrument & Workstation Installation',
    'Calibration Certification, SOPs & Faculty Training',
  ],
  'libraries': [
    'Modern Digital Cataloguing & RFID Setup',
    'Acoustic Seating & Collaborative Study Pods',
    'Knowledge Management System & Cloud Archiving',
  ],
  'additional-infra': [
    'Campus Facility Assessment & Need Mapping',
    'Turnkey Facility Design, Procurement & Setup',
    'Operations Handover, Signage & SLA Documentation',
  ],
  'strategic-services': [
    'Regulatory Approvals, UGC / AICTE Affiliation Roadmap',
    'NAAC / NBA Accreditation Readiness & Quality Assessment',
    'Institutional DPR Feasibility, Financial Planning & Governance',
  ],
  'automation': [
    'Campus-Wide ERP & Student Information Cloud Systems',
    'Smart Campus Security, AI Video Surveillance & RFID Access',
    'Energy Management, Solar Integration & Smart IoT Monitoring',
  ],
  'turnkey-projects': [
    'Complete Greenfield / Brownfield Turnkey Campus Execution',
    'Department-Level Modernisation & Specialized Infrastructure',
    'Advanced Centre of Excellence & Student Startup Incubation Hub',
  ],
  'renovation': [
    'Structural Integrity & Modernisation Audit',
    'Phased MEP & Interior Retrofitting Execution',
    'Civil Handover, Quality Certification & Warranty',
  ],
  'hr-placements': [
    'Corporate Internship & Campus Drive Tie-Ups',
    'Executive Placement Cell Digitisation & CRM',
    'Industry Mentorship & Soft Skills Development Modules',
  ],
  'innovation': [
    'Maker-Space & Prototyping Lab Engineering',
    'Incubation Pipeline & IP Filing Infrastructure',
    'Industry Mentorship Network & Demo Day Setup',
  ],
  'default': [
    'Architectural Planning & Technical Blueprint',
    'Turnkey Equipment Procurement & Integration',
    'Comprehensive Handover, AMC & Operational SLA',
  ],
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'campus', 'mart', 'solution',
  'solutions', 'our', 'your', 'we', 'they', 'this', 'these', 'those',
]);

export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function cleanText(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function synthesizeStrictThreeInclusions(rawCard: any, categorySlug: string): [string, string, string] {
  const items: string[] = [];
  const seen = new Set<string>();

  const addValid = (str?: string | null) => {
    if (!str || typeof str !== 'string') return;
    const clean = cleanText(str);
    const key = clean.toLowerCase();
    if (clean.length >= 10 && clean.length <= 160 && !seen.has(key)) {
      seen.add(key);
      items.push(clean);
    }
  };

  // 1. Explicit deliverables / inclusions arrays
  if (Array.isArray(rawCard.deliverables)) {
    for (const d of rawCard.deliverables) {
      addValid(typeof d === 'string' ? d : (d?.title || d?.name || d?.label));
    }
  }
  if (Array.isArray(rawCard.inclusions)) {
    for (const inc of rawCard.inclusions) {
      addValid(typeof inc === 'string' ? inc : (inc?.title || inc?.name || inc?.label));
    }
  }

  // 2. Sentence boundary extraction from description / body
  const descSource = rawCard.description || rawCard.body || rawCard.content;
  if (items.length < 3 && typeof descSource === 'string') {
    const rawSentences = cleanText(descSource).split(/(?:\r?\n|•|\.\s+(?=[A-Z0-9]))/);
    for (const s of rawSentences) {
      if (items.length >= 3) break;
      const stripped = s.replace(/^[-*•\d.)\s]+/, '').trim();
      addValid(stripped);
    }
  }

  // 3. Category-tailored fallback padding
  const fallbacks = CATEGORY_DELIVERABLE_FALLBACKS[categorySlug] || CATEGORY_DELIVERABLE_FALLBACKS['default'];
  for (const fb of fallbacks) {
    if (items.length >= 3) break;
    addValid(fb);
  }

  // Guarantee strictly 3 non-empty items
  return [
    items[0] || fallbacks[0],
    items[1] || fallbacks[1],
    items[2] || fallbacks[2],
  ];
}

export const MASTER_TAXONOMY_MAP: Record<string, { label: string; subcategories: string[] }> = {
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

export function resolvePageCategory(
  page: { slug: string; template?: string | null; pageData?: any },
  rawCard?: any,
  taxonomy?: SolutionsTaxonomy | null
): string {
  // 1. Direct card-level override
  if (rawCard && typeof rawCard.categorySlug === 'string' && rawCard.categorySlug.trim()) {
    return rawCard.categorySlug.trim();
  }
  if (rawCard && typeof rawCard.category === 'string' && rawCard.category.trim()) {
    const cSlug = slugify(rawCard.category);
    if (cSlug) return cSlug;
  }
  if (rawCard && typeof rawCard.objective === 'string' && rawCard.objective.trim()) {
    const oSlug = slugify(rawCard.objective);
    if (oSlug) return oSlug;
  }

  // 2. Parent Hub Page category dynamic inheritance
  if (page && (page as any).pageData) {
    let pd = (page as any).pageData;
    if (typeof pd === 'string') {
      try {
        pd = JSON.parse(pd);
      } catch {
        pd = {};
      }
    }
    if (pd && typeof pd.category === 'string' && pd.category.trim()) {
      return pd.category.trim();
    }
  }

  const s = page.slug.toLowerCase();
  const t = (page.template || '').toLowerCase();

  // 3. Strategic Campus Services
  if (
    s.includes('setup-college') ||
    s.includes('ugc-guidelines') ||
    s.includes('colleges-universities-for-sale') ||
    s.includes('partnership') ||
    s.includes('partner-with') ||
    s.includes('corporate') ||
    t.includes('partnership') ||
    t.includes('corporate')
  ) {
    return 'strategic-services';
  }

  // 4. Campus Management & Automation
  if (
    s.includes('campus-automation') ||
    s.includes('lms') ||
    s.includes('assessment-system') ||
    t.includes('lms') ||
    t.includes('assessment')
  ) {
    return 'automation';
  }

  // 5. Turnkey Academic Projects
  if (
    s.includes('innovation') ||
    s.includes('innovation-centres') ||
    s.includes('turnkey') ||
    s.includes('solutions')
  ) {
    return 'turnkey-projects';
  }

  // 6. Student Life & Campus Amenities
  if (
    s.includes('collaboration') ||
    s.includes('new-environments') ||
    s.includes('amenit') ||
    t.includes('collaboration')
  ) {
    return 'additional-infra';
  }

  // 7. Libraries & Learning Resources
  if (s.includes('librar') || t.includes('libraries')) {
    return 'libraries';
  }

  // 8. Science & Healthcare Labs
  if (s.includes('science-tech-labs') || s.includes('lab') || t.includes('labs')) {
    return 'labs';
  }

  // 9. Sports Infrastructure
  if (s.includes('sports') || t.includes('sports')) {
    return 'sports-infra';
  }

  // 10. Furniture & Interiors
  if (s.includes('furniture') || t.includes('furniture')) {
    return 'furniture';
  }

  // 11. AI & Technology Infrastructure
  if (
    s.includes('ai-') ||
    s.includes('ml') ||
    s.includes('smart-classroom') ||
    s.includes('tech-infra') ||
    s.includes('ar-vr') ||
    t.includes('ai') ||
    t.includes('smart-classrooms')
  ) {
    return 'ai-tech';
  }

  // 12. Campus Design & Architecture
  if (
    s.includes('campus-design') ||
    s.includes('master-planning') ||
    s.includes('planning') ||
    s.includes('landscape') ||
    s.includes('services') ||
    s.includes('renovat') ||
    s.includes('modernis') ||
    t.includes('campus-design') ||
    t.includes('renovation')
  ) {
    return 'campus-design';
  }

  // Fallback to valid taxonomy category if available, else campus-design
  if (taxonomy && taxonomy.categories.length > 0) {
    return taxonomy.categories[0].id;
  }
  return 'campus-design';
}

export function resolvePageSubcategory(
  categorySlug: string,
  page: { slug: string; title?: string },
  rawCard?: any
): string {
  // If card has an explicit subcategory
  if (rawCard && typeof rawCard.subcategory === 'string' && rawCard.subcategory.trim()) {
    return rawCard.subcategory.trim();
  }
  if (rawCard && typeof rawCard.subcategorySlug === 'string' && rawCard.subcategorySlug.trim()) {
    return rawCard.subcategorySlug.trim();
  }

  const s = (page.slug || '').toLowerCase();
  const t = (page.title || '').toLowerCase();
  const rawTitle = rawCard ? (rawCard.title || rawCard.name || rawCard.heading || '') : '';
  const rawDesc = rawCard ? (rawCard.description || rawCard.desc || rawCard.body || '') : '';
  const text = `${s} ${t} ${rawTitle} ${rawDesc}`.toLowerCase();

  const def = MASTER_TAXONOMY_MAP[categorySlug];
  if (!def || !def.subcategories || def.subcategories.length === 0) {
    return 'General Campus Solutions';
  }

  switch (categorySlug) {
    case 'campus-design':
      if (text.includes('master plan') || text.includes('site analysis') || text.includes('zoning')) return 'Campus Master Planning';
      if (text.includes('landscape') || text.includes('flora') || text.includes('swale') || text.includes('rainwater') || text.includes('outdoor design')) return 'Campus Landscaping';
      if (text.includes('interior') || text.includes('acoustic') || text.includes('wayfinding') || text.includes('signage')) return 'Interior Architecture';
      if (text.includes('renovat') || text.includes('modernis') || text.includes('retrofit') || text.includes('revamp')) return 'Renovation & Modernisation';
      if (text.includes('building') || text.includes('construction') || text.includes('mep') || text.includes('civil') || text.includes('structure')) return 'Building Design & Execution';
      if (text.includes('turnkey') || text.includes('new campus') || text.includes('handover') || text.includes('development')) return 'Turnkey Campus Development';
      return 'Architectural Design';

    case 'furniture':
      if (text.includes('faculty') || text.includes('admin') || text.includes('office') || text.includes('teacher') || text.includes('staff')) return 'Faculty & Administrative Furniture';
      if (text.includes('library') || text.includes('bookshelf') || text.includes('reading')) return 'Library Furniture';
      if (text.includes('lab') || text.includes('workbench') || text.includes('fume')) return 'Laboratory Furniture';
      if (text.includes('hostel') || text.includes('bed') || text.includes('wardrobe') || text.includes('bunk')) return 'Hostel Furniture';
      if (text.includes('auditorium') || text.includes('seating') || text.includes('tiered') || text.includes('cinema')) return 'Auditorium Seating';
      if (text.includes('cafeteria') || text.includes('dining') || text.includes('canteen') || text.includes('mess')) return 'Cafeteria & Dining Furniture';
      if (text.includes('custom') || text.includes('modular') || text.includes('bespoke') || text.includes('bulk')) return 'Custom Furniture';
      return 'Classroom Furniture';

    case 'sports-infra':
      if (text.includes('indoor') || text.includes('badminton') || text.includes('squash') || text.includes('table tennis')) return 'Indoor Sports Facilities';
      if (text.includes('turf') || text.includes('synthetic') || text.includes('astroturf')) return 'Synthetic Turf';
      if (text.includes('gym') || text.includes('fitness') || text.includes('cardio') || text.includes('workout')) return 'Gymnasium & Fitness Centres';
      if (text.includes('pool') || text.includes('swimming') || text.includes('aquatic')) return 'Swimming Pool Infrastructure';
      if (text.includes('equipment') || text.includes('scoreboard') || text.includes('post') || text.includes('mat') || text.includes('net')) return 'Sports Equipment';
      if (text.includes('ground') || text.includes('playfield') || text.includes('cricket') || text.includes('football') || text.includes('track') || text.includes('athletics')) return 'Sports Grounds & Playfields';
      return 'Outdoor Sports Facilities';

    case 'ai-tech':
      if (text.includes('station') || text.includes('kiosk') || text.includes('touchscreen') || text.includes('literacy')) return 'AI Learning Stations';
      if (text.includes('holo') || text.includes('hologram') || text.includes('ar') || text.includes('vr') || text.includes('virtual reality') || text.includes('holoteacher')) return 'AI HoloTeacher & Holographic Learning';
      if (text.includes('gpu') || text.includes('server') || text.includes('computing') || text.includes('cluster') || text.includes('cloud') || text.includes('hpc')) return 'GPU Servers & Computing Infrastructure';
      if (text.includes('robotics') || text.includes('embedded') || text.includes('iot') || text.includes('drone')) return 'Robotics & Embedded AI Labs';
      if (text.includes('humanoid') || text.includes('social robot')) return 'Humanoid Robots';
      if (text.includes('smart classroom') || text.includes('whiteboard') || text.includes('av system') || text.includes('podium') || text.includes('digital learning')) return 'Smart Classrooms';
      return 'AI & Machine Learning Labs';

    case 'labs':
      if (text.includes('chemistry') || text.includes('chemical') || text.includes('fume')) return 'Chemistry Laboratories';
      if (text.includes('biology') || text.includes('life science') || text.includes('botany') || text.includes('zoology') || text.includes('biotech')) return 'Biology & Life Sciences Labs';
      if (text.includes('medical') || text.includes('nursing') || text.includes('clinical') || text.includes('simulation') || text.includes('anatomy')) return 'Medical & Nursing Skill Labs';
      if (text.includes('pharmacy') || text.includes('formulation') || text.includes('drug') || text.includes('pharmacology')) return 'Pharmacy & Formulation Labs';
      if (text.includes('maker') || text.includes('workshop') || text.includes('engineering') || text.includes('3d print') || text.includes('lathe') || text.includes('cnc')) return 'Engineering Workshop & Maker Spaces';
      if (text.includes('instrument') || text.includes('research') || text.includes('spectro') || text.includes('testing')) return 'Research Instrumentation Labs';
      return 'Physics Laboratories';

    case 'libraries':
      if (text.includes('rfid') || text.includes('barcode') || text.includes('gate') || text.includes('automated') || text.includes('issue')) return 'Automated Library (RFID & Barcode)';
      if (text.includes('book') || text.includes('periodical') || text.includes('journal') || text.includes('print')) return 'Books, Periodicals & Print Resources';
      if (text.includes('repository') || text.includes('e-resource') || text.includes('database') || text.includes('archive')) return 'E-Resources & Institutional Repositories';
      if (text.includes('furniture') || text.includes('reading') || text.includes('study pod') || text.includes('commons') || text.includes('carrel')) return 'Library Furniture & Reading Commons';
      return 'Digital Library Systems';

    case 'additional-infra':
      if (text.includes('hostel') || text.includes('living') || text.includes('dorm') || text.includes('residence')) return 'Student Hostels & Living Spaces';
      if (text.includes('cafeteria') || text.includes('food') || text.includes('dining') || text.includes('canteen') || text.includes('mess')) return 'Cafeteria & Food Courts';
      if (text.includes('health') || text.includes('infirmary') || text.includes('medical room') || text.includes('wellness') || text.includes('doctor')) return 'Health Centre & Infirmary';
      if (text.includes('store') || text.includes('utility') || text.includes('shop') || text.includes('stationery') || text.includes('laundry')) return 'Campus Store & Utility Services';
      return 'Student Lounges & Activity Zones';

    case 'strategic-services':
      if (text.includes('ugc') || text.includes('regulatory') || text.includes('approval') || text.includes('affiliation') || text.includes('aicte')) return 'Regulatory Approvals & Affiliations';
      if (text.includes('naac') || text.includes('nba') || text.includes('nirf') || text.includes('accreditation') || text.includes('quality')) return 'NAAC / NBA Accreditation Readiness';
      if (text.includes('feasibility') || text.includes('financial') || text.includes('funding') || text.includes('dpr') || text.includes('loan') || text.includes('investment')) return 'Campus Feasibility & Financial Planning';
      if (text.includes('restructuring') || text.includes('turnaround') || text.includes('partnership') || text.includes('revival') || text.includes('alliance')) return 'Institutional Restructuring & Turnaround';
      return 'New College & University Setup';

    case 'automation':
      if (text.includes('security') || text.includes('cctv') || text.includes('access control') || text.includes('surveillance') || text.includes('biometric')) return 'Smart Security & Access Control';
      if (text.includes('energy') || text.includes('solar') || text.includes('power') || text.includes('sustainability') || text.includes('hvac')) return 'Energy Management & Sustainability';
      if (text.includes('network') || text.includes('wifi') || text.includes('lan') || text.includes('datacenter') || text.includes('it infra')) return 'IT Infrastructure & Networking';
      if (text.includes('signage') || text.includes('display') || text.includes('pa system') || text.includes('broadcast') || text.includes('communication')) return 'Digital Signage & Campus Communications';
      return 'Campus ERP & Student Information Systems';

    case 'turnkey-projects':
      if (text.includes('department') || text.includes('modernisation') || text.includes('upgrad') || text.includes('facelift')) return 'Department-Level Modernisation';
      if (text.includes('centre of excellence') || text.includes('coe') || text.includes('advanced')) return 'Centre of Excellence Setup';
      if (text.includes('incubat') || text.includes('startup') || text.includes('entrepreneurship') || text.includes('prototyping') || text.includes('demo day')) return 'Incubation Centre & Startup Hub';
      if (text.includes('auditorium') || text.includes('convention') || text.includes('hall') || text.includes('theatre')) return 'Multipurpose Auditoriums & Convention Centres';
      return 'Complete New Campus Development';

    default:
      return def.subcategories[0];
  }
}

export const SPORT_DOMAIN_SYNONYMS: Record<string, string[]> = {
  badminton: ['court', 'arena', 'racket', 'bwf', 'indoor'],
  basketball: ['court', 'hoop', 'fiba', 'indoor'],
  tennis: ['court', 'itf', 'synthetic', 'racket'],
  football: ['turf', 'pitch', 'fifa', 'ground'],
  swimming: ['pool', 'aquatic', 'olympic'],
  volleyball: ['court', 'indoor', 'net'],
  cricket: ['pitch', 'ground', 'stadium', 'turf'],
  athletics: ['track', 'iaaf', 'running', 'synthetic'],
  gymnasium: ['fitness', 'workout', 'cardio', 'weights'],
};

export function extractKeywords(text: string): string[] {
  const words = cleanText(text).toLowerCase().split(/[^a-z0-9]+/);
  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const w of words) {
    if (w.length >= 3 && !STOPWORDS.has(w) && !seen.has(w)) {
      seen.add(w);
      keywords.push(w);

      // Domain sport and infrastructure enrichment
      if (SPORT_DOMAIN_SYNONYMS[w]) {
        for (const syn of SPORT_DOMAIN_SYNONYMS[w]) {
          if (!seen.has(syn)) {
            seen.add(syn);
            keywords.push(syn);
          }
        }
      }

      if (keywords.length >= 25) break;
    }
  }

  return keywords;
}

export interface RawPageInput {
  id: number;
  title: string;
  slug: string;
  template?: string | null;
  pageData?: string | any | null;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PageSolutionsExtractor {
  static extractFromPages(
    pages: readonly RawPageInput[],
    taxonomy?: SolutionsTaxonomy | null
  ): SolutionCardDto[] {
    const extractedCards: SolutionCardDto[] = [];

    for (const page of pages) {
      if (!page.published) continue;

      const slug = (page.slug || '').trim().toLowerCase();
      if (!slug) continue;

      // Filter blacklist and test fixtures
      if (EXCLUDED_PAGE_SLUGS.has(slug) || slug.startsWith('test-') || slug.startsWith('draft-')) {
        continue;
      }

      let parsedData: any = null;
      if (typeof page.pageData === 'string' && page.pageData.trim()) {
        try {
          parsedData = JSON.parse(page.pageData);
        } catch {
          parsedData = null;
        }
      } else if (page.pageData && typeof page.pageData === 'object') {
        parsedData = page.pageData;
      }

      if (!parsedData) continue;

      // Collect raw card candidate items from cards, section2Cards, moreCards, and sections
      const rawCandidates: Array<{ raw: any; sourceKey: string }> = [];

      if (Array.isArray(parsedData.cards) && parsedData.cards.length > 0) {
        for (const c of parsedData.cards) rawCandidates.push({ raw: c, sourceKey: 'cards' });
      }
      if (Array.isArray(parsedData.section2Cards) && parsedData.section2Cards.length > 0) {
        for (const c of parsedData.section2Cards) rawCandidates.push({ raw: c, sourceKey: 'section2Cards' });
      }
      if (Array.isArray(parsedData.moreCards) && parsedData.moreCards.length > 0) {
        for (const c of parsedData.moreCards) rawCandidates.push({ raw: c, sourceKey: 'moreCards' });
      }
      if (rawCandidates.length === 0 && Array.isArray(parsedData.sections) && parsedData.sections.length > 0) {
        for (const s of parsedData.sections) rawCandidates.push({ raw: s, sourceKey: 'sections' });
      }

      const seenSlugsOnPage = new Set<string>();

      for (let i = 0; i < rawCandidates.length; i++) {
        const { raw, sourceKey } = rawCandidates[i];
        if (!raw || typeof raw !== 'object') continue;

        // Extract title & description, supporting heading/body variations
        const rawTitle = raw.title || raw.heading || raw.name || raw.label;
        const cleanTitleStr = cleanText(rawTitle);
        if (!cleanTitleStr || cleanTitleStr.length < 3) continue;

        const rawDesc = raw.description || raw.body || raw.content || raw.summary || '';
        let cleanSummary = cleanText(rawDesc);
        if (!cleanSummary || cleanSummary.length < 10) {
          cleanSummary = `${cleanTitleStr} turnkey solutions, technical design and infrastructure setup for educational institutions.`;
        }
        if (cleanSummary.length > 220) {
          cleanSummary = cleanSummary.slice(0, 217).replace(/\s+\S*$/, '') + '...';
        }

        // Category & Subcategory resolution
        const categorySlug = resolvePageCategory(page, raw, taxonomy);
        const subcategorySlug = resolvePageSubcategory(categorySlug, page, raw);

        // Deduplication & Unique Slug generation per page
        const baseSlug = `${page.slug}--${slugify(cleanTitleStr)}`;
        let uniqueCardSlug = baseSlug;
        if (seenSlugsOnPage.has(uniqueCardSlug)) {
          uniqueCardSlug = `${baseSlug}--${i + 1}`;
        }
        seenSlugsOnPage.add(uniqueCardSlug);

        // Strict 3 inclusions
        const inclusions = synthesizeStrictThreeInclusions(raw, categorySlug);

        // Target slug: use raw.href if present (stripped of leading /), otherwise construct leaf child route
        let targetSlug = page.slug;
        if (typeof raw.href === 'string' && raw.href.trim().startsWith('/')) {
          targetSlug = raw.href.trim().replace(/^\/+/, '');
        } else {
          const childSlug = (typeof raw.slug === 'string' && raw.slug.trim())
            ? raw.slug.trim().replace(/^\/+/, '')
            : slugify(cleanTitleStr);
          if (childSlug && childSlug !== page.slug) {
            targetSlug = childSlug.startsWith(`${page.slug}/`)
              ? childSlug
              : `${page.slug}/${childSlug}`;
          }
        }

        const keywords = extractKeywords(`${cleanTitleStr} ${cleanSummary} ${page.title}`);
        const badge = raw.badge ? cleanText(raw.badge) : (sourceKey === 'section2Cards' ? 'Strategic Focus' : 'Campus Solution');
        const imageUrl = raw.image || raw.imageUrl || parsedData.heroImage || null;

        // Negative ID safely derived from page.id and card index to prevent collision with database IDs
        const syntheticId = -((page.id * 1000) + (i + 1));

        extractedCards.push({
          id: syntheticId,
          cardSlug: uniqueCardSlug,
          targetSlug,
          sectionAnchor: null,
          categorySlug,
          subcategorySlug,
          secondaryCategorySlugs: [],
          title: cleanTitleStr,
          summary: cleanSummary,
          inclusions,
          badge,
          imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : null,
          keywords,
          institutionTypes: ['all'],
          relatedCardSlugs: [],
          priority: 50, // Editorial baseline
          active: true,
          createdAt: page.createdAt ? new Date(page.createdAt) : new Date(),
          updatedAt: page.updatedAt ? new Date(page.updatedAt) : new Date(),
        });
      }
    }

    return extractedCards;
  }
}
