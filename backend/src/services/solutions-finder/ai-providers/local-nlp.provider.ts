import {
  IAIProvider,
  AIIntentRequest,
  AIIntentResult,
  AIDiscoveryRequest,
  AIDiscoveryResult,
  AIExtractCardsRequest,
  AIExtractedCardsResult,
  ExtractedCardItem,
} from './ai-provider.interface';

export const COMMON_TYPOS: Record<string, string> = {
  bedminton: 'badminton',
  badmiton: 'badminton',
  basktball: 'basketball',
  basketbal: 'basketball',
  footbal: 'football',
  futball: 'football',
  tenis: 'tennis',
  swimmin: 'swimming',
  seting: 'setting',
  laboratry: 'laboratory',
  furnitur: 'furniture',
  autometion: 'automation',
  artifical: 'artificial',
};

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function fuzzyMatchesToken(queryToken: string, targetToken: string): boolean {
  if (queryToken === targetToken) return true;
  const mapped = COMMON_TYPOS[queryToken] || queryToken;
  if (mapped === targetToken) return true;
  if (targetToken.includes(mapped) || mapped.includes(targetToken)) return true;
  if (mapped.length >= 4 && targetToken.length >= 4 && mapped.length <= 40 && targetToken.length <= 40) {
    const dist = levenshteinDistance(mapped, targetToken);
    return dist <= 1;
  }
  return false;
}

const CATEGORY_MAP: Record<string, { label: string; keywords: string[]; complementary: string[] }> = {
  'campus-design': {
    label: 'Campus Design & Architecture',
    keywords: ['campus design', 'master planning', 'architecture', 'architectural', 'zoning', 'landscape', 'layout', 'blueprint', 'new campus', 'building design', 'renovation', 'modernisation', 'interior architecture', 'turnkey campus'],
    complementary: ['Furniture & Interiors', 'Turnkey Academic Projects', 'Campus Management & Automation'],
  },
  'furniture': {
    label: 'Furniture & Interiors',
    keywords: ['furniture', 'desk', 'chair', 'table', 'bench', 'seating', 'hostel furniture', 'cafeteria furniture', 'ergonomic', 'modular', 'storage', 'pod', 'classroom furniture', 'library furniture', 'auditorium seating', 'custom furniture'],
    complementary: ['Campus Design & Architecture', 'Smart Classrooms', 'Library & Learning Resources'],
  },
  'sports-infra': {
    label: 'Sports Infrastructure',
    keywords: ['sports', 'ground', 'turf', 'court', 'synthetic', 'fiba', 'fifa', 'badminton', 'basketball', 'cricket', 'track', 'gym', 'fitness', 'stadium', 'athletics', 'swimming pool', 'sports equipment'],
    complementary: ['Student Life & Campus Amenities', 'Campus Design & Architecture', 'Furniture & Interiors'],
  },
  'ai-tech': {
    label: 'AI & Technology Infrastructure',
    keywords: ['ai', 'artificial intelligence', 'gpu', 'workstation', 'server', 'computing', 'cloud', 'digital', 'smart classroom', 'smart-classrooms', 'av', 'iot', 'robotics', 'automation', 'holoteacher', 'hologram', 'humanoid', 'ar', 'vr'],
    complementary: ['Smart Classrooms', 'Advanced Engineering Labs', 'Campus Networking & IT', 'University & Lab Furniture'],
  },
  'labs': {
    label: 'Science & Healthcare Labs',
    keywords: ['lab', 'laboratory', 'stem', 'physics', 'chemistry', 'biology', 'robotics lab', 'makerspace', 'research', 'testing', 'instruments', 'fume hood', 'medical simulation', 'nursing lab', 'pharmacy lab'],
    complementary: ['AI & Technology Infrastructure', 'Smart Classrooms', 'Furniture & Interiors'],
  },
  'libraries': {
    label: 'Library & Learning Resources',
    keywords: ['library', 'libraries', 'books', 'digital library', 'rfid', 'knowledge hub', 'study pod', 'reading', 'cataloguing', 'archive', 'periodicals', 'e-resources'],
    complementary: ['Furniture & Interiors', 'Campus Management & Automation', 'Smart Classrooms'],
  },
  'additional-infra': {
    label: 'Student Life & Campus Amenities',
    keywords: ['amenities', 'cafeteria', 'hostel facility', 'hostels', 'medical room', 'infirmary', 'student recreation', 'common room', 'dining services', 'wellness', 'campus store'],
    complementary: ['Furniture & Interiors', 'Sports Infrastructure', 'Campus Design & Architecture'],
  },
  'strategic-services': {
    label: 'Strategic Campus Services',
    keywords: ['strategic', 'setup college', 'university setup', 'ugc', 'aicte', 'regulatory', 'accreditation', 'naac', 'nba', 'nirf', 'feasibility', 'turnaround', 'restructuring', 'corporate tie-ups', 'placements'],
    complementary: ['Turnkey Academic Projects', 'Campus Design & Architecture', 'Campus Management & Automation'],
  },
  'automation': {
    label: 'Campus Management & Automation',
    keywords: ['automation', 'campus erp', 'student information system', 'sis', 'security', 'cctv', 'surveillance', 'access control', 'energy management', 'solar', 'campus wifi', 'networking', 'digital signage'],
    complementary: ['Smart Classrooms', 'AI & Technology Infrastructure', 'Turnkey Academic Projects'],
  },
  'turnkey-projects': {
    label: 'Turnkey Academic Projects',
    keywords: ['turnkey', 'centre of excellence', 'coe', 'department modernisation', 'incubation centre', 'startup hub', 'auditorium development', 'convention centre', 'greenfield campus'],
    complementary: ['AI & Technology Infrastructure', 'Campus Design & Architecture', 'Science & Healthcare Labs'],
  },
  'renovation': {
    label: 'Renovation & Modernisation',
    keywords: ['renovation', 'modernisation', 'modernize', 'retrofit', 'interior', 'civil', 'refurbish', 'upgrade', 'flooring', 'ceiling', 'hvac', 'electrical'],
    complementary: ['Furniture & Interiors', 'Campus Design & Architecture', 'Campus Management & Automation'],
  },
  'hr-placements': {
    label: 'HR, Placements & Corporate Ties',
    keywords: ['placement', 'corporate', 'hr', 'internship', 'recruitment', 'industry connect', 'campus drive', 'training', 'career cell'],
    complementary: ['Strategic Campus Services', 'Turnkey Academic Projects', 'AI & Technology Infrastructure'],
  },
  'innovation': {
    label: 'Innovation & Incubation Hubs',
    keywords: ['innovation', 'incubation', 'startup', 'incubator', 'entrepreneurship', 'prototyping', 'patent', 'accelerator', 'venture'],
    complementary: ['AI & Technology Infrastructure', 'Science & Healthcare Labs', 'Campus Design & Architecture'],
  },
};

const INSTITUTION_MAP: Record<string, { label: string; keywords: string[] }> = {
  'engineering': {
    label: 'Engineering & Technical Colleges',
    keywords: ['engineering', 'btech', 'mtech', 'polytechnic', 'technical', 'technology institute', 'iit', 'nit'],
  },
  'universities': {
    label: 'Universities (State & Private)',
    keywords: ['university', 'state university', 'private university', 'deemed', 'campus-wide'],
  },
  'degree': {
    label: 'Degree & Management Colleges',
    keywords: ['degree', 'arts', 'science', 'commerce', 'management', 'mba', 'bba', 'business school'],
  },
  'medical': {
    label: 'Medical & Healthcare Colleges',
    keywords: ['medical', 'mbbs', 'nursing', 'pharmacy', 'hospital', 'dental', 'allied health'],
  },
  'schools': {
    label: 'K-12 & International Schools',
    keywords: ['school', 'k-12', 'international school', 'cbse', 'icse', 'ib', 'high school'],
  },
  'vocational': {
    label: 'Vocational & Polytechnic Institutes',
    keywords: ['vocational', 'iti', 'diploma', 'trade school'],
  },
  'skill': {
    label: 'Skill Development Centers',
    keywords: ['skill', 'training center', 'upskilling', 'certification center'],
  },
};

export function stripConversationalPrefixes(query: string): string {
  let cleaned = (query || '').trim();
  cleaned = cleaned.replace(/^(?:hello|hi|please|kindly|can you|could you|i\s+(?:need|needs|want|require)|we\s+(?:need|needs|want|require)|looking\s+for|looking\s+to\s+(?:setup|establish|buy|procure|build)|requirement\s+(?:of|for)|setup\s+of|setting\s+up)\s+/i, '');
  return cleaned.trim();
}

export function removeJargon(text: string): string {
  return (text || '').replace(/\bturnkey\s*/gi, '').replace(/\borchestration\s*/gi, '').replace(/\s{2,}/g, ' ').trim();
}

export function buildPlainSubject(cleanQuery: string, categoryLabel: string): string {
  const stripped = stripConversationalPrefixes(cleanQuery).toLowerCase();

  // 1. Check technology & specialized domains first
  if (stripped.includes('gpu') || stripped.includes('ai lab') || stripped.includes('computing') || stripped.includes('deep learning') || /\bai\b/i.test(stripped)) {
    return 'AI Computing Labs';
  }
  if (stripped.includes('smart classroom') || stripped.includes('panel') || stripped.includes('interactive')) {
    return 'Interactive Smart Classrooms';
  }
  if (stripped.includes('badminton') || stripped.includes('bedminton')) return 'Indoor Badminton Courts';
  if (stripped.includes('basketball') || stripped.includes('basktball')) return 'Basketball Courts';
  if (stripped.includes('tennis') || stripped.includes('tenis')) return 'Tennis Courts';
  if (stripped.includes('football') || stripped.includes('footbal') || stripped.includes('turf')) return 'Football Ground & Turf';
  if (stripped.includes('swimming') || stripped.includes('pool')) return 'Campus Aquatic Facilities';
  if (stripped.includes('chemistry') || stripped.includes('physics') || stripped.includes('biology') || stripped.includes('fume')) return 'Science Laboratories';
  if (stripped.includes('robotics') || stripped.includes('maker') || stripped.includes('3d printer')) return 'Robotics & Maker Workspaces';
  if (stripped.includes('library') || stripped.includes('bookshelf') || stripped.includes('rfid')) return 'Library Resources & Reading Spaces';

  // 2. Check furniture (avoid triggering on "-seat" scale descriptors when lab/tech is present)
  if (stripped.includes('chair') || stripped.includes('seating') || (stripped.includes('seat') && !stripped.includes('lab'))) {
    return 'Classroom Chairs & Seating';
  }
  if (stripped.includes('table') || stripped.includes('workbench')) return 'Laboratory Tables & Workbenches';
  if (stripped.includes('desk')) return 'Student Desks & Furniture';
  if (stripped.includes('furniture')) return 'Campus Furniture';

  return removeJargon(categoryLabel);
}

export class LocalRuleNLPProvider implements IAIProvider {
  readonly name = 'local-nlp';

  isAvailable(): boolean {
    return true; // Always available offline
  }

  async extractIntent(request: AIIntentRequest): Promise<AIIntentResult> {
    const startTime = Date.now();
    const cleanText = (request.queryText || '').toLowerCase().trim();

    // 1. Resolve Category
    let resolvedCategoryId = request.categoryHint || '';
    if (!resolvedCategoryId || !CATEGORY_MAP[resolvedCategoryId]) {
      let maxMatches = -1;
      let bestCat = 'campus-design';

      for (const [catId, def] of Object.entries(CATEGORY_MAP)) {
        let count = 0;
        for (const kw of def.keywords) {
          if (cleanText.includes(kw)) {
            count += kw.length > 4 ? 2 : 1;
          }
        }
        if (count > maxMatches) {
          maxMatches = count;
          bestCat = catId;
        }
      }
      resolvedCategoryId = bestCat;
    }

    const categoryDef = CATEGORY_MAP[resolvedCategoryId] || CATEGORY_MAP['campus-design'];

    // 2. Resolve Institution
    let resolvedInstitutionId = request.institutionHint || '';
    if (!resolvedInstitutionId || !INSTITUTION_MAP[resolvedInstitutionId]) {
      let bestInst = 'all';
      for (const [instId, def] of Object.entries(INSTITUTION_MAP)) {
        if (def.keywords.some(kw => cleanText.includes(kw))) {
          bestInst = instId;
          break;
        }
      }
      resolvedInstitutionId = bestInst;
    }

    const institutionDef = INSTITUTION_MAP[resolvedInstitutionId] || {
      label: 'All Educational Institutions',
      keywords: [],
    };

    // 3. Extract Scale (only when explicitly stated in brief)
    const scaleRegex = /(\d+(?:,\d+)?(?:\s*-\s*\d+)?)(?:[\s-]+[\w-]+){0,3}[\s-]+(workstations|seats|seat|chairs?|tables?|systems?|units?|users|acres|sq\.?\s*ft|labs|classrooms|seater|students|capacity)/i;
    const scaleMatch = cleanText.match(scaleRegex);
    const scale = scaleMatch ? `${scaleMatch[1]} ${scaleMatch[2]}` : null;

    // 4. Extract Scope Tags
    const scopeTags: string[] = [];
    if (resolvedCategoryId === 'ai-tech') {
      scopeTags.push('High-Density Compute', 'Specialized Lab Setup', 'Turnkey Commissioning');
    } else if (resolvedCategoryId === 'furniture') {
      scopeTags.push('Ergonomic Space Planning', 'Institutional Modular Supply', 'On-Site Assembly');
    } else if (resolvedCategoryId === 'sports-infra') {
      scopeTags.push('Regulation Surface Engineering', 'Sports Equipment Supply', 'Civil Execution');
    } else if (resolvedCategoryId === 'labs') {
      scopeTags.push('Research Equipment Procurement', 'Safety & Ventilation Layout', 'Faculty Training');
    } else {
      scopeTags.push('Architectural Planning', 'Turnkey Equipment Integration', 'Operational Handover');
    }

    // 5. Build Intent Summary
    let intentSummary: string;
    if (cleanText.length > 5) {
      const words = cleanText.split(/\s+/).slice(0, 8).join(' ');
      intentSummary = words.charAt(0).toUpperCase() + words.slice(1);
    } else {
      intentSummary = `Turnkey ${categoryDef.label} Solution for ${institutionDef.label}`;
    }

    // 6. Keywords
    const queryTokens = cleanText
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 3 && !['need', 'want', 'for', 'our', 'the', 'and', 'with'].includes(w));

    const detectedKeywords = queryTokens.length > 0 ? queryTokens : [resolvedCategoryId];

    return {
      intentSummary,
      categoryId: resolvedCategoryId,
      categoryLabel: categoryDef.label,
      institutionId: resolvedInstitutionId,
      institutionLabel: institutionDef.label,
      detectedKeywords,
      scale,
      scopeTags,
      confidenceScore: request.categoryHint || request.institutionHint ? 0.95 : 0.85,
      providerName: this.name,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  // ── Call 1: Discovery & Section A Synthesis ─────────────────────────────────
  async discoverSolutions(request: AIDiscoveryRequest): Promise<AIDiscoveryResult> {
    const startTime = Date.now();
    const intent = await this.extractIntent({
      queryText: request.queryText,
      institutionHint: request.institutionHint,
      categoryHint: request.categoryHint,
    });

    // 1. Build Section A Personalised Summary (Anti-Jargon, Natural Grammar)
    const cleanQuery = (request.queryText || '').trim();
    const plainSubject = buildPlainSubject(cleanQuery, intent.categoryLabel);

    const headline = intent.institutionId !== 'all'
      ? `Solutions for your ${intent.institutionLabel}`
      : `Solutions for your Campus: ${plainSubject}`;

    const scaleStr = intent.scale ? ` (${intent.scale})` : '';
    const institutionTarget = intent.institutionId !== 'all' ? intent.institutionLabel : 'campus';
    const subjectInSentence = plainSubject
      .replace(/\bAI\b/g, '__AI__')
      .replace(/\bIT\b/g, '__IT__')
      .toLowerCase()
      .replace('__ai__', 'AI')
      .replace('__it__', 'IT');
    const narrative = `We understand that you are looking for ${subjectInSentence}${scaleStr} for your ${institutionTarget}.`;

    // Dynamic user tags strictly based on user query + hints
    const userTags: string[] = [];
    if (intent.institutionId !== 'all') {
      userTags.push(intent.institutionLabel);
    }
    userTags.push(plainSubject);
    if (intent.scale) {
      userTags.push(intent.scale);
    }

    // 2. Select Cards & Slugs from Catalog using fuzzy and dominant title matching
    const rawTokens = (cleanQuery || intent.intentSummary).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
    const queryTokens = rawTokens.map(t => COMMON_TYPOS[t] || t);

    const scoredCatalog = (request.catalog || [])
      .map(item => {
        let score = 0;
        if (item.categorySlug === intent.categoryId) score += 30;

        const cardIdentifier = item.cardSlug || item.slug;
        const titleTokens = item.title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
        const textTokens = `${cardIdentifier} ${item.slug} ${item.title} ${item.subcategorySlug || ''}`.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);

        for (const qt of queryTokens) {
          // Direct or fuzzy title match awards Dominant Title Bonus (+40 pts)
          if (titleTokens.some(tt => fuzzyMatchesToken(qt, tt))) {
            score += 40;
          } else if (textTokens.some(tt => fuzzyMatchesToken(qt, tt))) {
            score += 15;
          }
        }
        return {
          cardSlug: cardIdentifier,
          slug: item.slug,
          score,
        };
      })
      .filter(item => item.score > 0);

    scoredCatalog.sort((a, b) => b.score - a.score);
    const topCardSlugs = Array.from(new Set(scoredCatalog.map(s => s.cardSlug))).slice(0, 6);
    const topPageSlugs = Array.from(new Set(scoredCatalog.map(s => s.slug))).slice(0, 6);

    // Fallback if catalog was empty
    const selectedPageSlugs = topPageSlugs.length > 0
      ? topPageSlugs
      : (intent.categoryId === 'ai-tech' ? ['ai-ml', 'smart-classrooms', 'robotics-lab'] : ['campus-design', 'furniture']);

    const selectedCardSlugs = topCardSlugs.length > 0
      ? topCardSlugs
      : selectedPageSlugs;

    const catDef = CATEGORY_MAP[intent.categoryId] || CATEGORY_MAP['campus-design'];
    const complementaryCategories = catDef.complementary || [
      'Smart Classrooms',
      'Advanced Engineering Labs',
      'Campus Networking & IT',
    ];

    return {
      sectionA: {
        headline,
        narrative,
        userTags,
      },
      categoryId: intent.categoryId,
      categoryLabel: intent.categoryLabel,
      institutionId: intent.institutionId,
      institutionLabel: intent.institutionLabel,
      scale: intent.scale,
      scopeTags: intent.scopeTags,
      selectedPageSlugs,
      selectedCardSlugs,
      complementaryCategories,
      confidenceScore: intent.confidenceScore,
      providerName: this.name,
      rawLatencyMs: Date.now() - startTime,
    };
  }

  // ── Call 2: Authentic Content Extraction & Consultant Reasoning ─────────────
  async extractPageCards(request: AIExtractCardsRequest): Promise<AIExtractedCardsResult> {
    const startTime = Date.now();
    const cards: ExtractedCardItem[] = [];

    for (const page of request.pages) {
      const title = page.heroTitle || page.title;
      let summary = page.heroSubtitle || '';
      if (!summary || summary.length < 15) {
        summary = `${title} turnkey solutions, architecture, and technology infrastructure for educational institutions.`;
      }

      // Strictly extract up to 3 genuine inclusions from contentSnippets
      const validInclusions: string[] = [];
      const seen = new Set<string>();

      for (const snip of page.contentSnippets) {
        if (!snip || typeof snip !== 'string') continue;
        const cleaned = snip.replace(/<[^>]*>/g, '').replace(/^[-•*]\s*/, '').trim();
        const shortName = cleaned.split(/[:\n–-]/)[0].trim();
        const finalItem = shortName.length >= 4 && shortName.length <= 60 ? shortName : cleaned.slice(0, 60).trim();
        const key = finalItem.toLowerCase();
        if (finalItem.length >= 4 && !seen.has(key)) {
          seen.add(key);
          validInclusions.push(finalItem);
          if (validInclusions.length >= 3) break;
        }
      }

      // Generate consultant whyRelevant rationale
      const lower = `${page.slug} ${title}`.toLowerCase();
      let whyRelevant = `Turnkey campus infrastructure tailored to satisfy your ${request.institutionLabel || 'institutional'} operational requirements.`;

      if (lower.includes('gpu') || lower.includes('ai') || lower.includes('machine learning')) {
        whyRelevant = 'Directly satisfies requirements for high-density computing clusters and turnkey AI workstations.';
      } else if (lower.includes('smart') || lower.includes('classroom')) {
        whyRelevant = 'Equips learning spaces with interactive displays, audio-visual integration, and connected lecture capture.';
      } else if (lower.includes('badminton')) {
        whyRelevant = 'BWF-standard shock-absorbing tournament court configuration engineered for professional indoor badminton play.';
      } else if (lower.includes('basketball')) {
        whyRelevant = 'FIBA-compliant regulation basketball court engineered for high-impact shock absorption and inter-collegiate play.';
      } else if (lower.includes('tennis')) {
        whyRelevant = 'ITF-approved multi-layer cushioned surface designed for all-weather collegiate tournament competition.';
      } else if (lower.includes('court') || lower.includes('sports') || lower.includes('track') || lower.includes('turf')) {
        whyRelevant = 'Regulation tournament-grade sports court and athletic infrastructure engineered for safety and durability.';
      } else if (lower.includes('robot') || lower.includes('embedded')) {
        whyRelevant = 'Provides hands-on robotics, IoT, and embedded systems engineering workbenches.';
      } else if (lower.includes('furniture')) {
        whyRelevant = 'Ergonomic, modular institutional furniture configured for high-density modern campus learning spaces.';
      } else if (lower.includes('lab')) {
        whyRelevant = 'Turnkey laboratory installation meeting national research, ventilation, and academic safety standards.';
      }

      cards.push({
        slug: page.slug,
        cardSlug: page.cardSlug,
        title,
        summary,
        inclusions: validInclusions,
        whyRelevant,
      });
    }

    return {
      cards,
      providerName: this.name,
      rawLatencyMs: Date.now() - startTime,
    };
  }
}
