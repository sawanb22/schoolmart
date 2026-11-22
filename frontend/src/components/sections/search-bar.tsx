import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Building2,
  Target,
  Sparkles,
  Compass,
  Laptop,
  BookOpen,
  Microscope,
  Trophy,
  ShieldCheck,
  Armchair,
  GraduationCap,
  Wrench,
  Award,
  Users,
  X,
  Landmark,
  Layers,
  Cpu,
  School,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSiteContent } from '@/contexts/SiteContentContext';

// ─── ICON LOOKUP FOR DYNAMIC CLOUD DATABASE OPTIONS ──────────────────────────
export const SEARCH_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Landmark,
  GraduationCap,
  Wrench,
  Award,
  Layers,
  Target,
  Cpu,
  Users,
  ShieldCheck,
  Compass,
  Sparkles,
  Laptop,
  BookOpen,
  Microscope,
  Trophy,
  Armchair,
  School,
};

export const SEARCH_ICON_OPTIONS = [
  { value: 'Building2', label: 'Building (College / Campus)' },
  { value: 'Landmark', label: 'Landmark (University Pillars)' },
  { value: 'GraduationCap', label: 'Graduation Cap (Degree)' },
  { value: 'Wrench', label: 'Wrench (Vocational / Technical)' },
  { value: 'Award', label: 'Award (Skill / Admissions)' },
  { value: 'Layers', label: 'Layers (All / Upgrade)' },
  { value: 'Target', label: 'Target (Objectives)' },
  { value: 'Cpu', label: 'CPU (Smart Campus / Tech)' },
  { value: 'Users', label: 'Users (Ecosystem / Community)' },
  { value: 'ShieldCheck', label: 'Shield Check (Accreditation)' },
  { value: 'Compass', label: 'Compass (Architecture / Master Plan)' },
  { value: 'Sparkles', label: 'Sparkles (Innovation)' },
  { value: 'Laptop', label: 'Laptop (Digital)' },
  { value: 'BookOpen', label: 'Book (Library)' },
  { value: 'Microscope', label: 'Microscope (Research / Labs)' },
  { value: 'Trophy', label: 'Trophy (Sports)' },
  { value: 'Armchair', label: 'Armchair (Furniture)' },
  { value: 'School', label: 'School (K-12 / International)' },
];

export interface RawSearchOption {
  id: string;
  label: string;
  shortLabel?: string;
  iconName?: string;
  defaultRoute?: string;
  active?: boolean;
}

export const DEFAULT_INSTITUTIONS_DATA: RawSearchOption[] = [
  { id: 'all', label: 'All Institutions', shortLabel: 'All', iconName: 'Layers', active: true },
  { id: 'engineering', label: 'Engineering Colleges', shortLabel: 'Engineering', iconName: 'Building2', active: true },
  { id: 'universities', label: 'Universities', shortLabel: 'Universities', iconName: 'Landmark', active: true },
  { id: 'degree', label: 'Degree Colleges', shortLabel: 'Degree', iconName: 'GraduationCap', active: true },
  { id: 'vocational', label: 'Vocational Institutes', shortLabel: 'Vocational', iconName: 'Wrench', active: true },
  { id: 'skill', label: 'Skill Development Centers', shortLabel: 'Skill Centers', iconName: 'Award', active: true },
];

export const DEFAULT_OBJECTIVES_DATA: RawSearchOption[] = [
  { id: 'all', label: 'All Objectives', shortLabel: 'Looking For', iconName: 'Target', active: true },
  { id: 'build-new', label: 'Build New Colleges', shortLabel: 'Build New', defaultRoute: '/campus-design-execution', iconName: 'Building2', active: true },
  { id: 'upgrade', label: 'Upgrade Existing Campuses', shortLabel: 'Upgrade', defaultRoute: '/campus-design-execution', iconName: 'Layers', active: true },
  { id: 'smart-campus', label: 'Become Smart Campus', shortLabel: 'Smart Campus', defaultRoute: '/smart-classrooms', iconName: 'Cpu', active: true },
  { id: 'innovation', label: 'Create Innovation Ecosystems', shortLabel: 'Innovation', defaultRoute: '/innovation', iconName: 'Users', active: true },
  { id: 'accreditation', label: 'Improve Accreditation', shortLabel: 'Accreditation', defaultRoute: '/resources', iconName: 'ShieldCheck', active: true },
  { id: 'admissions', label: 'Entrance Admissions', shortLabel: 'Admissions', defaultRoute: '/partner-with-colleges', iconName: 'Award', active: true },
];

export const DEFAULT_POPULAR_CHIPS = [
  { label: '40-Seat GPU Lab', query: '40-seat AI lab with GPU workstations' },
  { label: 'Smart Classrooms', query: 'Smart Classrooms with interactive panels' },
  { label: 'Ergonomic Furniture', query: 'Modern ergonomic furniture for classrooms and hostel' },
  { label: 'Sports Arena', query: 'Synthetic athletic turf and indoor sports complex' },
  { label: 'Turnkey Campus Setup', query: 'I want to build a new university campus' },
];

export const OTHER_INSTITUTION_IDS = new Set([
  'school',
  'international-school',
  'training-academy',
  'corporate-training',
  'government-education',
  'other-custom',
]);

export const INSTITUTION_DEFAULT_ICON_NAME: Record<string, string> = {
  university: 'Landmark',
  'private-university': 'Landmark',
  'deemed-university': 'Landmark',
  engineering: 'Building2',
  'medical-college': 'Microscope',
  'dental-college': 'Microscope',
  'pharmacy-college': 'Microscope',
  'management-school': 'Award',
  'arts-science-college': 'BookOpen',
  'law-college': 'ShieldCheck',
  'architecture-college': 'Compass',
  'polytechnic-college': 'Wrench',
  'agricultural-college': 'Landmark',
  'research-institution': 'Microscope',
  skill: 'Award',
  vocational: 'Wrench',
  degree: 'GraduationCap',
  school: 'School',
  'international-school': 'School',
  'training-academy': 'Award',
  'corporate-training': 'Building2',
  'government-education': 'Landmark',
  'other-custom': 'Layers',
};

export const CATEGORY_DEFAULT_ICON_NAME: Record<string, string> = {
  'campus-design': 'Compass',
  furniture: 'Armchair',
  'sports-infra': 'Trophy',
  'ai-tech': 'Cpu',
  labs: 'Microscope',
  libraries: 'BookOpen',
  'additional-infra': 'Users',
  'strategic-services': 'ShieldCheck',
  automation: 'Wrench',
  'turnkey-projects': 'Building2',
};

export interface TaxonomyCategoryItem {
  id: string;
  letterCode: string;
  label: string;
  shortLabel: string;
  iconName?: string;
  subcategories: string[];
}

export interface TaxonomyInstitutionItem {
  id: string;
  label: string;
  shortLabel: string;
  group?: 'higher-ed' | 'other';
  iconName?: string;
  active?: boolean;
}

export interface TaxonomyPopularChip {
  label: string;
  query: string;
}

export interface TaxonomyStoreData {
  categories: TaxonomyCategoryItem[];
  institutions: TaxonomyInstitutionItem[];
  popularSearchPrompts?: string[];
  popularChips?: TaxonomyPopularChip[];
  placeholder?: string;
}

// ─── TIER 1: INSTITUTION TYPES (Contract preserved for regression tests) ─────
export interface InstitutionOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  category?: 'higher-ed' | 'other';
}

export const INSTITUTION_OPTIONS: InstitutionOption[] = [
  { id: 'all', label: 'All Institutions', shortLabel: 'All', icon: Layers, category: 'higher-ed' },
  { id: 'engineering', label: 'Engineering Colleges', shortLabel: 'Engineering', icon: Building2, category: 'higher-ed' },
  { id: 'universities', label: 'Universities', shortLabel: 'Universities', icon: Landmark, category: 'higher-ed' },
  { id: 'degree', label: 'Degree Colleges', shortLabel: 'Degree', icon: GraduationCap, category: 'higher-ed' },
  { id: 'vocational', label: 'Vocational Institutes', shortLabel: 'Vocational', icon: Wrench, category: 'higher-ed' },
  { id: 'skill', label: 'Skill Development Centers', shortLabel: 'Skill Centers', icon: Award, category: 'higher-ed' },
];

// ─── FULL CLIENT INSTITUTION HIERARCHY (16 Higher Ed + 6 Other) ──────────────
export const HIGHER_ED_INSTITUTIONS: InstitutionOption[] = [
  { id: 'university', label: 'University', shortLabel: 'University', icon: Landmark, category: 'higher-ed' },
  { id: 'private-university', label: 'Private University', shortLabel: 'Private Univ', icon: Landmark, category: 'higher-ed' },
  { id: 'deemed-university', label: 'Deemed University', shortLabel: 'Deemed Univ', icon: Landmark, category: 'higher-ed' },
  { id: 'engineering', label: 'Engineering Colleges', shortLabel: 'Engineering', icon: Building2, category: 'higher-ed' },
  { id: 'medical-college', label: 'Medical College', shortLabel: 'Medical', icon: Microscope, category: 'higher-ed' },
  { id: 'dental-college', label: 'Dental College', shortLabel: 'Dental', icon: Microscope, category: 'higher-ed' },
  { id: 'pharmacy-college', label: 'Pharmacy College', shortLabel: 'Pharmacy', icon: Microscope, category: 'higher-ed' },
  { id: 'management-school', label: 'Management / Business School', shortLabel: 'B-School', icon: Award, category: 'higher-ed' },
  { id: 'arts-science-college', label: 'Arts & Science College', shortLabel: 'Arts & Science', icon: BookOpen, category: 'higher-ed' },
  { id: 'law-college', label: 'Law College', shortLabel: 'Law', icon: ShieldCheck, category: 'higher-ed' },
  { id: 'architecture-college', label: 'Architecture College', shortLabel: 'Architecture', icon: Compass, category: 'higher-ed' },
  { id: 'polytechnic-college', label: 'Polytechnic College', shortLabel: 'Polytechnic', icon: Wrench, category: 'higher-ed' },
  { id: 'agricultural-college', label: 'Agricultural University / College', shortLabel: 'Agriculture', icon: Landmark, category: 'higher-ed' },
  { id: 'research-institution', label: 'Research Institution', shortLabel: 'Research', icon: Microscope, category: 'higher-ed' },
  { id: 'skill', label: 'Skill Development Centers', shortLabel: 'Skill Centers', icon: Award, category: 'higher-ed' },
  { id: 'vocational', label: 'Vocational Institutes', shortLabel: 'Vocational', icon: Wrench, category: 'higher-ed' },
  { id: 'degree', label: 'Degree Colleges', shortLabel: 'Degree', icon: GraduationCap, category: 'higher-ed' },
];

export const OTHER_INSTITUTIONS: InstitutionOption[] = [
  { id: 'school', label: 'School', shortLabel: 'School', icon: School, category: 'other' },
  { id: 'international-school', label: 'International School', shortLabel: 'Intl School', icon: School, category: 'other' },
  { id: 'training-academy', label: 'Training Academy', shortLabel: 'Academy', icon: Award, category: 'other' },
  { id: 'corporate-training', label: 'Corporate Training Centre', shortLabel: 'Corporate Training', icon: Building2, category: 'other' },
  { id: 'government-education', label: 'Government Education Institution', shortLabel: 'Govt Education', icon: Landmark, category: 'other' },
  { id: 'other-custom', label: 'Other (Specify Institution)', shortLabel: 'Other', icon: Layers, category: 'other' },
];

// ─── TIER 2: OBJECTIVES (Contract preserved for regression tests) ──────────────
export interface ObjectiveOption {
  id: string;
  label: string;
  shortLabel: string;
  defaultRoute?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const OBJECTIVE_OPTIONS: ObjectiveOption[] = [
  { id: 'all', label: 'All Objectives', shortLabel: 'Looking For', icon: Target },
  { id: 'build-new', label: 'Build New Colleges', shortLabel: 'Build New', defaultRoute: '/campus-design-execution', icon: Building2 },
  { id: 'upgrade', label: 'Upgrade Existing Campuses', shortLabel: 'Upgrade', defaultRoute: '/campus-design-execution', icon: Layers },
  { id: 'smart-campus', label: 'Become Smart Campus', shortLabel: 'Smart Campus', defaultRoute: '/smart-classrooms', icon: Cpu },
  { id: 'innovation', label: 'Create Innovation Ecosystems', shortLabel: 'Innovation', defaultRoute: '/innovation', icon: Users },
  { id: 'accreditation', label: 'Improve Accreditation', shortLabel: 'Accreditation', defaultRoute: '/resources', icon: ShieldCheck },
  { id: 'admissions', label: 'Entrance Admissions', shortLabel: 'Admissions', defaultRoute: '/partner-with-colleges', icon: Award },
];

// ─── 10 MASTER CAMPUSMART CATEGORIES (A through J) WITH CLEAN LABELS ─────────
export interface MasterCategory {
  id: string;
  letterCode: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  subcategories: string[];
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  {
    id: 'campus-design',
    letterCode: 'A',
    label: 'Campus Design & Architecture',
    shortLabel: 'Design & Architecture',
    icon: Compass,
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
  {
    id: 'furniture',
    letterCode: 'B',
    label: 'Furniture & Interiors',
    shortLabel: 'Furniture & Interiors',
    icon: Armchair,
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
  {
    id: 'sports-infra',
    letterCode: 'C',
    label: 'Sports Infrastructure',
    shortLabel: 'Sports Infrastructure',
    icon: Trophy,
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
  {
    id: 'ai-tech',
    letterCode: 'D',
    label: 'AI & Technology Infrastructure',
    shortLabel: 'AI & Tech Infrastructure',
    icon: Cpu,
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
  {
    id: 'labs',
    letterCode: 'E',
    label: 'Science & Healthcare Labs',
    shortLabel: 'Science & Labs',
    icon: Microscope,
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
  {
    id: 'libraries',
    letterCode: 'F',
    label: 'Library & Learning Resources',
    shortLabel: 'Library & Learning',
    icon: BookOpen,
    subcategories: [
      'Digital Library Systems',
      'Automated Library (RFID & Barcode)',
      'Books, Periodicals & Print Resources',
      'E-Resources & Institutional Repositories',
      'Library Furniture & Reading Commons',
    ],
  },
  {
    id: 'additional-infra',
    letterCode: 'G',
    label: 'Student Life & Campus Amenities',
    shortLabel: 'Campus Amenities',
    icon: Users,
    subcategories: [
      'Student Hostels & Living Spaces',
      'Cafeteria & Food Courts',
      'Health Centre & Infirmary',
      'Student Lounges & Activity Zones',
      'Campus Store & Utility Services',
    ],
  },
  {
    id: 'strategic-services',
    letterCode: 'H',
    label: 'Strategic Campus Services',
    shortLabel: 'Strategic Services',
    icon: ShieldCheck,
    subcategories: [
      'New College & University Setup',
      'Regulatory Approvals & Affiliations',
      'NAAC / NBA Accreditation Readiness',
      'Campus Feasibility & Financial Planning',
      'Institutional Restructuring & Turnaround',
    ],
  },
  {
    id: 'automation',
    letterCode: 'I',
    label: 'Campus Management & Automation',
    shortLabel: 'Management & Automation',
    icon: Wrench,
    subcategories: [
      'Campus ERP & Student Information Systems',
      'Smart Security & Access Control',
      'Energy Management & Sustainability',
      'IT Infrastructure & Networking',
      'Digital Signage & Campus Communications',
    ],
  },
  {
    id: 'turnkey-projects',
    letterCode: 'J',
    label: 'Turnkey Academic Projects',
    shortLabel: 'Turnkey Projects',
    icon: Building2,
    subcategories: [
      'Complete New Campus Development',
      'Department-Level Modernisation',
      'Centre of Excellence Setup',
      'Incubation Centre & Startup Hub',
      'Multipurpose Auditoriums & Convention Centres',
    ],
  },
];

// ─── CONSULTANT PROMPT SUGGESTIONS ────────────────────────────────────────────
export interface ConsultantPrompt {
  id: string;
  category: string;
  prompt: string;
  tag: string;
}

export const CONSULTANT_PROMPTS: ConsultantPrompt[] = [
  {
    id: 'new-campus',
    category: 'campus-design',
    prompt: 'I want to build a new university campus with green building standards',
    tag: 'Turnkey Campus',
  },
  {
    id: 'gpu-lab',
    category: 'ai-tech',
    prompt: 'I need a 40-seat AI lab with high-performance GPU workstations and seating',
    tag: 'GPU Lab',
  },
  {
    id: 'renovate-labs',
    category: 'labs',
    prompt: 'We need to renovate our existing science and biotechnology laboratories',
    tag: 'Lab Upgrade',
  },
  {
    id: 'smart-classrooms',
    category: 'ai-tech',
    prompt: 'Smart classrooms with 86-inch interactive panels and lecture capture',
    tag: 'Smart Classrooms',
  },
  {
    id: 'classroom-furniture',
    category: 'furniture',
    prompt: 'Looking for modern ergonomic modular furniture for 50 lecture halls',
    tag: 'Furniture',
  },
  {
    id: 'sports-complex',
    category: 'sports-infra',
    prompt: 'Setting up a FIFA-standard synthetic football turf and athletics track',
    tag: 'Sports Complex',
  },
  {
    id: 'digital-library',
    category: 'libraries',
    prompt: 'RFID-automated digital library management system with individual study pods',
    tag: 'RFID Library',
  },
  {
    id: 'hostel-setup',
    category: 'furniture',
    prompt: 'Hostel furniture and dining hall setup for 300 residential students',
    tag: 'Hostel Setup',
  },
  {
    id: 'accreditation-prep',
    category: 'strategic-services',
    prompt: 'Comprehensive NAAC and NBA infrastructure audit compliance readiness',
    tag: 'Accreditation',
  },
  {
    id: 'maker-space',
    category: 'labs',
    prompt: 'Engineering workshop and rapid prototyping maker space with 3D printers',
    tag: 'Maker Space',
  },
];

// Preserved for legacy contract tests
export interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
  route: string;
  badge: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  objectiveIds: string[];
  institutionIds?: string[];
  keywords: string[];
}

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 'master-planning',
    title: 'Campus Master Planning & Architecture',
    description: 'Full campus zoning, architectural blueprints and civil execution',
    route: '/find-solutions?category=campus-design&q=Campus+Master+Planning',
    badge: 'Turnkey Service',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Compass,
    objectiveIds: ['build-new', 'upgrade', 'all'],
    keywords: ['master planning', 'architecture', 'building', 'campus design'],
  },
  {
    id: 'smart-classrooms',
    title: 'Smart Classrooms & Hybrid Displays',
    description: 'Interactive flat panels, acoustic soundbars and lecture capture',
    route: '/find-solutions?category=ai-tech&q=Smart+Classrooms',
    badge: 'Smart Tech',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Laptop,
    objectiveIds: ['smart-campus', 'upgrade', 'all'],
    keywords: ['smart classroom', 'interactive panel', 'touch screen'],
  },
];

// ─── BACKWARD COMPATIBILITY EXPORTS ──────────────────────────────────────────
export interface CategoryOption {
  value: string;
  label: string;
  route: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'all', label: 'All Categories', route: '/shop' },
  { value: 'campus-design', label: 'Campus Design', route: '/campus-design' },
  { value: 'furniture', label: 'Furniture', route: '/furniture' },
  { value: 'sports-infra', label: 'Sports Infra', route: '/sports-infra' },
  { value: 'ai-ml', label: 'AI / ML Solutions', route: '/ai-ml' },
  { value: 'tech-infra', label: 'Tech Infrastructure', route: '/tech-infra' },
  { value: 'libraries', label: 'Libraries', route: '/libraries' },
  { value: 'labs', label: 'Science & Tech Labs', route: '/labs' },
  { value: 'shop', label: 'Products Catalog', route: '/shop' },
];

export const PAGE_ROUTES = [
  { terms: ['furniture', 'classroom desk', 'office furniture', 'hostel furniture'], route: '/furniture' },
  { terms: ['sports', 'sports infra', 'basketball', 'football', 'athletics'], route: '/sports-infra' },
  { terms: ['lab', 'laboratory', 'stem'], route: '/labs' },
  { terms: ['library', 'libraries', 'bookshelf'], route: '/libraries' },
  { terms: ['technology', 'tech infra', 'interactive board', 'school management'], route: '/tech-infra' },
  { terms: ['ai', 'machine learning', 'ai station'], route: '/ai-ml' },
  { terms: ['campus design', 'architecture', 'master planning'], route: '/campus-design' },
];

export interface SearchRoutingResult {
  targetRoute?: string;
  type: 'navigate' | 'api' | 'empty';
  message?: string;
}

export function resolveSearchRoute(category: string, query: string): SearchRoutingResult {
  const trimmed = query.trim();
  const selected = CATEGORY_OPTIONS.find((c) => c.value === category);
  const baseRoute = selected ? selected.route : `/${category}`;

  if (!trimmed) {
    if (category === 'all') {
      return { type: 'empty', message: 'Please enter something to search.' };
    }
    return { type: 'navigate', targetRoute: baseRoute };
  }

  if (category === 'shop') {
    return { type: 'navigate', targetRoute: `/shop?search=${encodeURIComponent(trimmed)}` };
  }

  if (category !== 'all') {
    return { type: 'navigate', targetRoute: `${baseRoute}?search=${encodeURIComponent(trimmed)}` };
  }

  return { type: 'api' };
}

export const DEFAULT_SEARCH_TAXONOMY: TaxonomyStoreData = {
  categories: MASTER_CATEGORIES.map((c) => ({
    id: c.id,
    letterCode: c.letterCode || '',
    label: c.label,
    shortLabel: c.shortLabel || c.label,
    iconName: CATEGORY_DEFAULT_ICON_NAME[c.id] || 'Target',
    subcategories: [...c.subcategories],
  })),
  institutions: [
    ...HIGHER_ED_INSTITUTIONS.map((i) => ({
      id: i.id,
      label: i.label,
      shortLabel: i.shortLabel || i.label,
      group: 'higher-ed' as const,
      iconName: INSTITUTION_DEFAULT_ICON_NAME[i.id] || 'Building2',
      active: true,
    })),
    ...OTHER_INSTITUTIONS.map((i) => ({
      id: i.id,
      label: i.label,
      shortLabel: i.shortLabel || i.label,
      group: 'other' as const,
      iconName: INSTITUTION_DEFAULT_ICON_NAME[i.id] || 'School',
      active: true,
    })),
  ],
  popularSearchPrompts: [
    '40-seat AI lab with GPU workstations',
    'Modern ergonomic furniture for classrooms and hostel',
    'Synthetic athletic turf and indoor sports complex',
    'Smart Classrooms with interactive panels',
    'Complete turnkey university campus execution',
  ],
  popularChips: DEFAULT_POPULAR_CHIPS,
  placeholder: 'Describe what you need (e.g. 40-seat AI lab with GPU workstations)',
};

// ─── MAIN SEARCH BAR COMPONENT ────────────────────────────────────────────────
const SearchBar = () => {
  const { content } = useSiteContent();
  const navigate = useNavigate();

  // Selection States
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [selectedInstitutionLabel, setSelectedInstitutionLabel] = useState<string>('');
  const [customInstitutionText, setCustomInstitutionText] = useState<string>('');
  const [showOtherInstitutions, setShowOtherInstitutions] = useState<boolean>(false);

  const [selectedObjective, setSelectedObjective] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  
  // Hovered Category for two-column flyout (null by default so right side does NOT open by default!)
  const [hoveredCategory, setHoveredCategory] = useState<MasterCategory | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Validation Error State
  const [validationError, setValidationError] = useState<string>('');

  // Popover Visibility States (strictly mutually exclusive)
  const [isInstitutionOpen, setIsInstitutionOpen] = useState(false);
  const [isObjectiveOpen, setIsObjectiveOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // DOM Refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Dynamic Options (Cloud Database Fallback preserving legacy contracts)
  const activeTaxonomy: TaxonomyStoreData = useMemo(() => {
    const raw = content.solutions_finder_taxonomy;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.institutions)) {
          return parsed as TaxonomyStoreData;
        }
      } catch (e) {
        console.warn('Failed to parse solutions_finder_taxonomy from content', e);
      }
    }
    return DEFAULT_SEARCH_TAXONOMY;
  }, [content.solutions_finder_taxonomy]);

  const higherEdInstitutions = useMemo<InstitutionOption[]>(() => {
    if (activeTaxonomy?.institutions && activeTaxonomy.institutions.length > 0) {
      return activeTaxonomy.institutions
        .filter((i) => i.active !== false && i.group === 'higher-ed')
        .map((i) => ({
          id: i.id,
          label: i.label,
          shortLabel: i.shortLabel || i.label,
          icon: SEARCH_ICON_MAP[i.iconName || ''] || Building2,
          category: 'higher-ed' as const,
        }));
    }
    return HIGHER_ED_INSTITUTIONS;
  }, [activeTaxonomy]);

  const otherInstitutions = useMemo<InstitutionOption[]>(() => {
    if (activeTaxonomy?.institutions && activeTaxonomy.institutions.length > 0) {
      return activeTaxonomy.institutions
        .filter((i) => i.active !== false && i.group === 'other')
        .map((i) => ({
          id: i.id,
          label: i.label,
          shortLabel: i.shortLabel || i.label,
          icon: SEARCH_ICON_MAP[i.iconName || ''] || School,
          category: 'other' as const,
        }));
    }
    return OTHER_INSTITUTIONS;
  }, [activeTaxonomy]);

  const categoriesList = useMemo<MasterCategory[]>(() => {
    if (activeTaxonomy?.categories && activeTaxonomy.categories.length > 0) {
      return activeTaxonomy.categories.map((c) => ({
        id: c.id,
        letterCode: c.letterCode,
        label: c.label,
        shortLabel: c.shortLabel || c.label,
        icon: SEARCH_ICON_MAP[c.iconName || ''] || Target,
        subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
      }));
    }
    return MASTER_CATEGORIES;
  }, [activeTaxonomy]);

  const popularChips = useMemo<TaxonomyPopularChip[]>(() => {
    if (activeTaxonomy?.popularChips && activeTaxonomy.popularChips.length > 0) {
      return activeTaxonomy.popularChips;
    }
    const raw = content.home_search_popular_chips;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }
    return DEFAULT_POPULAR_CHIPS;
  }, [activeTaxonomy, content.home_search_popular_chips]);

  // Derived Display Labels
  const currentInstitutionDisplay = useMemo(() => {
    if (selectedInstitutionLabel) return selectedInstitutionLabel;
    if (selectedInstitution === 'all' || !selectedInstitution) return 'Institution Type';
    const match =
      higherEdInstitutions.find((i) => i.id === selectedInstitution) ||
      otherInstitutions.find((i) => i.id === selectedInstitution) ||
      HIGHER_ED_INSTITUTIONS.find((i) => i.id === selectedInstitution) ||
      OTHER_INSTITUTIONS.find((i) => i.id === selectedInstitution);
    return match?.shortLabel || match?.label || 'Institution Type';
  }, [selectedInstitution, selectedInstitutionLabel, higherEdInstitutions, otherInstitutions]);

  const currentObjectiveDisplay = useMemo(() => {
    if (selectedSubcategory) return selectedSubcategory;
    if (selectedObjective === 'all' || !selectedObjective) return 'I am looking for';
    const match =
      categoriesList.find((c) => c.id === selectedObjective) ||
      MASTER_CATEGORIES.find((c) => c.id === selectedObjective);
    return match?.label || 'I am looking for';
  }, [selectedObjective, selectedSubcategory, categoriesList]);

  // Suggested Prompts based on selected category & query
  const relevantSuggestions = useMemo(() => {
    let list = CONSULTANT_PROMPTS;
    if (selectedObjective && selectedObjective !== 'all') {
      const filtered = list.filter((p) => p.category === selectedObjective);
      if (filtered.length > 0) list = filtered;
    }

    const clean = searchQuery.trim().toLowerCase();
    if (clean) {
      list = list.filter(
        (p) =>
          p.prompt.toLowerCase().includes(clean) ||
          p.tag.toLowerCase().includes(clean)
      );
    }
    return list.slice(0, 5);
  }, [selectedObjective, searchQuery]);

  // Handle click outside to close all dropdowns and popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsInstitutionOpen(false);
        setIsObjectiveOpen(false);
        setIsFocused(false);
        setHoveredCategory(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsInstitutionOpen(false);
        setIsObjectiveOpen(false);
        setIsFocused(false);
        setHoveredCategory(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Entrance GSAP animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.8 });
      tl.fromTo(
        containerRef.current,
        { scaleX: 0, transformOrigin: 'center' },
        { scaleX: 1, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }
      )
        .fromTo(
          inputRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
          '-=0.3'
        )
        .fromTo(
          buttonRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' },
          '-=0.2'
        );
    });

    return () => ctx.revert();
  }, []);

  // Form submission with strict validation (Both Institution and Subcategory are mandatory)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory Check 1: Institution must be selected
    if (!selectedInstitution || selectedInstitution === 'all' || !selectedInstitutionLabel) {
      setValidationError('Please select your institution type');
      setIsInstitutionOpen(true);
      setIsObjectiveOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }

    // Mandatory Check 2: Subcategory / Category must be selected
    if (!selectedObjective || selectedObjective === 'all' || !selectedSubcategory) {
      setValidationError('Please select what you are looking for');
      setIsObjectiveOpen(true);
      setIsInstitutionOpen(false);
      setIsFocused(false);
      setHoveredCategory(null);
      inputRef.current?.blur();
      return;
    }

    setValidationError('');
    setIsFocused(false);
    setIsInstitutionOpen(false);
    setIsObjectiveOpen(false);
    setHoveredCategory(null);
    setSearching(true);

    const query = searchQuery.trim();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('institution', selectedInstitutionLabel || selectedInstitution);
    params.set('category', selectedObjective);
    if (selectedSubcategory) {
      params.set('subcategory', selectedSubcategory);
    }

    navigate(`/find-solutions?${params.toString()}`);
    setSearching(false);
  };

  const handleSelectPrompt = (promptText: string) => {
    setSearchQuery(promptText);
    setIsFocused(false);

    // If both institution and category are ready, submit immediately
    if (selectedInstitution && selectedInstitution !== 'all' && selectedObjective && selectedObjective !== 'all') {
      const params = new URLSearchParams();
      params.set('q', promptText);
      params.set('institution', selectedInstitutionLabel || selectedInstitution);
      params.set('category', selectedObjective);
      if (selectedSubcategory) {
        params.set('subcategory', selectedSubcategory);
      }
      navigate(`/find-solutions?${params.toString()}`);
    } else {
      // Focus on whichever requirement is missing
      if (!selectedInstitution || selectedInstitution === 'all') {
        setValidationError('Please select your institution type');
        setIsInstitutionOpen(true);
      } else if (!selectedSubcategory) {
        setValidationError('Please select what you are looking for');
        setIsObjectiveOpen(true);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-50 border-y border-slate-200/70 py-3.5 px-3 sm:px-4 shadow-xs overflow-visible transition-colors ${
        isInstitutionOpen || isObjectiveOpen || isFocused ? 'z-50' : 'z-30'
      }`}
    >
      <div
        ref={wrapperRef}
        className={`relative mx-auto transition-all duration-300 ease-out overflow-visible ${
          isInstitutionOpen || isObjectiveOpen || isFocused ? 'z-50' : 'z-30'
        } ${isFocused ? 'max-w-4xl' : 'max-w-3xl'}`}
      >
        {/* Main Search Bar Form Container */}
        <form
          onSubmit={handleSearch}
          className={`w-full rounded-full bg-white shadow-lg flex items-center border transition-all ${
            validationError
              ? 'border-rose-400 ring-2 ring-rose-200'
              : isFocused
              ? 'ring-4 ring-cm-blue/15 border-cm-blue shadow-xl'
              : 'border-black/10 hover:border-black/20 focus-within:ring-2 focus-within:ring-cm-blue/30 focus-within:border-cm-blue'
          }`}
        >
          {/* ─── DROPDOWN 1: INSTITUTION TYPE ─── */}
          <div
            className={`relative shrink-0 flex items-center rounded-l-full border-r border-slate-200 transition-colors ${
              isInstitutionOpen ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsInstitutionOpen((prev) => !prev);
                setIsObjectiveOpen(false);
                setIsFocused(false);
                setHoveredCategory(null);
                setValidationError('');
                inputRef.current?.blur();
              }}
              className="flex items-center gap-1.5 pl-3.5 sm:pl-4 pr-3 sm:pr-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold cursor-pointer select-none focus:outline-none"
              title="Select Your Institution Type"
              aria-expanded={isInstitutionOpen}
            >
              <Building2 className="w-3.5 h-3.5 text-cm-blue hidden sm:inline shrink-0" />
              <span className={`truncate max-w-[105px] sm:max-w-[135px] md:max-w-[165px] ${
                !selectedInstitutionLabel ? 'text-slate-500' : 'text-slate-900 font-bold'
              }`}>
                {currentInstitutionDisplay}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isInstitutionOpen ? 'rotate-180 text-cm-blue' : ''
                }`}
              />
            </button>

            {/* Custom Popover 1: Institution Selection (Scrollbar completely hidden) */}
            {isInstitutionOpen && (
              <div
                className="absolute top-full left-0 mt-2.5 w-84 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2.5 z-[100] animate-in fade-in zoom-in-95 duration-150 max-h-[420px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2.5">
                  {/* Group 1: Higher Education */}
                  <div>
                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Higher Education
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {higherEdInstitutions.map((inst) => {
                        const isSelected = selectedInstitution === inst.id;
                        const InstIcon = inst.icon;
                        return (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => {
                              setSelectedInstitution(inst.id);
                              setSelectedInstitutionLabel(inst.label);
                              setValidationError('');
                              setIsInstitutionOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'bg-blue-50 text-cm-blue font-bold'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <InstIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{inst.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cm-blue shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group 2: Other Institutions (Clean Reveal without Scrollbar) */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowOtherInstitutions((prev) => !prev)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <School className="w-3.5 h-3.5 text-amber-500" />
                        <span>Other Institutions</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                          showOtherInstitutions ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {showOtherInstitutions && (
                      <div className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                        {otherInstitutions.map((item) => {
                          const isSelected = selectedInstitution === item.id;
                          const ItemIcon = item.icon;
                          if (item.id === 'other-custom') {
                            return (
                              <div key={item.id} className="pt-1.5 px-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  Other (Enter Custom Type)
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={customInstitutionText}
                                    onChange={(e) => setCustomInstitutionText(e.target.value)}
                                    placeholder="e.g. Autonomous Academy"
                                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cm-blue"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (customInstitutionText.trim()) {
                                        setSelectedInstitution('other-custom');
                                        setSelectedInstitutionLabel(customInstitutionText.trim());
                                        setValidationError('');
                                        setIsInstitutionOpen(false);
                                      }
                                    }}
                                    disabled={!customInstitutionText.trim()}
                                    className="px-2.5 py-1.5 bg-cm-blue hover:bg-cm-blue-dark text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedInstitution(item.id);
                                setSelectedInstitutionLabel(item.label);
                                setValidationError('');
                                setIsInstitutionOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-blue-50 text-cm-blue font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ItemIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cm-blue shrink-0 ml-1.5" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── DROPDOWN 2: I AM LOOKING FOR (Opens Side Panel ONLY on Hover/Click) ─── */}
          <div
            className={`sm:relative shrink-0 flex items-center border-r border-slate-200 transition-colors ${
              isObjectiveOpen ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsObjectiveOpen((prev) => !prev);
                setIsInstitutionOpen(false);
                setIsFocused(false);
                setHoveredCategory(null); // Do NOT fly out subcategories by default!
                setValidationError('');
                inputRef.current?.blur();
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold cursor-pointer select-none focus:outline-none"
              title="Select a Service or Solution Category"
              aria-expanded={isObjectiveOpen}
            >
              <Target className="w-3.5 h-3.5 text-cm-blue hidden sm:inline shrink-0" />
              <span className={`truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px] ${
                !selectedSubcategory ? 'text-slate-500' : 'text-slate-900 font-bold'
              }`}>
                {currentObjectiveDisplay}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isObjectiveOpen ? 'rotate-180 text-cm-blue' : ''
                }`}
              />
            </button>

            {/* Custom Popover 2: Clean Two-Column Layout (Zero Scrollbars, Options Open to the Right ONLY on Hover) */}
            {isObjectiveOpen && (
              <div
                className={`absolute top-full left-0 right-0 sm:left-auto sm:right-0 md:left-0 md:right-auto mt-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-0 z-[100] animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col md:flex-row transition-all ${
                  hoveredCategory
                    ? 'sm:w-[720px] md:w-[820px] sm:max-w-[860px]'
                    : 'sm:w-[400px] md:w-[420px]'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── LEFT COLUMN: 10 Categories List (Clean Text, No A/B Prefixes, No Scrollbars) ── */}
                <div
                  className={`p-2 max-h-[38vh] md:max-h-[440px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white ${
                    hoveredCategory ? 'w-full md:w-[350px] shrink-0 border-b md:border-b-0 md:border-r border-slate-100' : 'w-full'
                  }`}
                >
                  <span className="sr-only">Discover Your Objective</span>
                  <div className="space-y-0.5">
                    {categoriesList.map((cat) => {
                      const isHovered = hoveredCategory?.id === cat.id;
                      const isSelected = selectedObjective === cat.id;
                      const CatIcon = cat.icon;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onMouseEnter={() => setHoveredCategory(cat)}
                          onClick={() => setHoveredCategory(cat)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-left ${
                            isHovered
                              ? 'bg-blue-50 text-cm-blue font-bold shadow-2xs'
                              : isSelected
                              ? 'bg-slate-100 text-slate-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isHovered || isSelected
                                  ? 'bg-cm-blue text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <CatIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{cat.label}</span>
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 shrink-0 ml-1 transition-transform ${
                              isHovered ? 'text-cm-blue translate-x-0.5' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── RIGHT COLUMN: Connected Flyout Panel (Opens ONLY when category is hovered/clicked) ── */}
                {hoveredCategory && (
                  <div className="flex-1 p-4 bg-slate-50/70 max-h-[45vh] md:max-h-[420px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col justify-between animate-in fade-in duration-100">
                    <div>
                      {/* Clean Header: Category Title without Robotic Elements */}
                      <div className="pb-2.5 border-b border-slate-200 mb-3">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-poppins">
                          {hoveredCategory.label}
                        </h4>
                      </div>

                      {/* Parent Option: Entire Category Selection */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedObjective(hoveredCategory.id);
                          setSelectedSubcategory(`All ${hoveredCategory.label}`);
                          setValidationError('');
                          setIsObjectiveOpen(false);
                          setHoveredCategory(null);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer mb-3 ${
                          selectedObjective === hoveredCategory.id && selectedSubcategory === `All ${hoveredCategory.label}`
                            ? 'bg-cm-blue text-white border-cm-blue shadow-sm'
                            : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-cm-blue/30 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Check className={`w-4 h-4 ${
                            selectedObjective === hoveredCategory.id && selectedSubcategory === `All ${hoveredCategory.label}` ? 'text-white' : 'text-cm-blue'
                          }`} />
                          <span>All {hoveredCategory.label}</span>
                        </div>
                      </button>

                      {/* Clean Subcategories Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {hoveredCategory.subcategories.map((subcat) => {
                          const isSubSelected =
                            selectedObjective === hoveredCategory.id && selectedSubcategory === subcat;

                          return (
                            <button
                              key={subcat}
                              type="button"
                              onClick={() => {
                                setSelectedObjective(hoveredCategory.id);
                                setSelectedSubcategory(subcat);
                                setValidationError('');
                                setIsObjectiveOpen(false);
                                setHoveredCategory(null);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${
                                isSubSelected
                                  ? 'bg-blue-50 text-cm-blue font-bold border border-blue-200 shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                              }`}
                            >
                              <span className="leading-snug break-words">{subcat}</span>
                              {isSubSelected && (
                                <Check className="w-3.5 h-3.5 text-cm-blue shrink-0 ml-1.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── PART 3: SEARCH INPUT & ICON-ONLY ACTION BUTTON ─── */}
          <div className="flex-1 flex items-center min-w-0 px-2 sm:px-3">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isFocused) setIsFocused(true);
              }}
              onFocus={() => {
                // When input is focused, close all dropdowns immediately so only input suggestions show
                setIsInstitutionOpen(false);
                setIsObjectiveOpen(false);
                setHoveredCategory(null);
                setIsFocused(true);
              }}
              onClick={() => {
                setIsInstitutionOpen(false);
                setIsObjectiveOpen(false);
                setHoveredCategory(null);
                setIsFocused(true);
              }}
              placeholder={
                activeTaxonomy?.placeholder ||
                content.home_search_placeholder ||
                'Describe what you need (e.g. 40-seat AI lab with GPU workstations)'
              }
              className="flex-1 w-full py-2 sm:py-2.5 text-xs sm:text-sm md:text-base text-slate-800 placeholder-slate-400 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 min-w-0"
              aria-label="Search"
            />

            {/* Clear Input Shortcut */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors mr-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Submit Action Button: Icon-Only for Maximum Room */}
            <button
              ref={buttonRef}
              type="submit"
              disabled={searching}
              className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-cm-blue hover:bg-cm-blue-dark text-white rounded-full transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-70 cursor-pointer ml-1"
              aria-label="Search"
              title="Search Solutions"
            >
              <Search className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${searching ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline sr-only">Search</span>
            </button>
          </div>
        </form>

        {/* Validation Error Tooltip */}
        {validationError && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-rose-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg z-[80] flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ─── FLOATING CONSULTANT PROMPTS POPOVER (Reveals on Focus / Typing) ─── */}
        {isFocused && (
          <div
            className="absolute top-full left-0 right-0 mt-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-[90] animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Digital Consultant Guidance */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>What are you planning? Suggested Requirements:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsFocused(false)}
                className="text-slate-400 hover:text-slate-600 text-[11px] font-medium cursor-pointer"
              >
                Dismiss ✕
              </button>
            </div>

            {/* Prompt Suggestions List (Scrollbar completely hidden) */}
            <div className="p-2 space-y-1 max-h-[340px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {relevantSuggestions.length > 0 ? (
                relevantSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPrompt(item.prompt)}
                    className="w-full group flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/70 transition-all text-left cursor-pointer border border-transparent hover:border-blue-100"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100/60 text-cm-blue flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-cm-blue group-hover:text-white transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-cm-blue transition-colors">
                          "{item.prompt}"
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {item.tag}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cm-blue group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Press <strong className="text-slate-800">Enter</strong> or click search to generate your customized campus proposal for <strong className="text-slate-800">"{searchQuery}"</strong>.
                </div>
              )}
            </div>

            {/* Frequently Explored Keyword Chips Footer */}
            <div className="px-3.5 py-2.5 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Popular Briefs:
              </span>
              {popularChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(chip.query);
                    const p = new URLSearchParams();
                    p.set('q', chip.query);
                    if (selectedInstitution && selectedInstitution !== 'all') {
                      p.set('institution', selectedInstitutionLabel || selectedInstitution);
                    }
                    if (selectedObjective && selectedObjective !== 'all') {
                      p.set('category', selectedObjective);
                    }
                    navigate(`/find-solutions?${p.toString()}`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-700 hover:border-cm-blue hover:text-cm-blue transition-all cursor-pointer shadow-2xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
