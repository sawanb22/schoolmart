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

export function parseLLMJson<T = any>(rawContent: string): T {
  let cleaned = (rawContent || '').trim();

  // Strip leading code fence ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  // Strip trailing code fence ```
  cleaned = cleaned.replace(/\s*```$/i, '').trim();

  // Extract JSON payload bounded by outermost braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as T;
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  'campus-design': 'Campus Design & Architecture',
  'furniture': 'Furniture & Interiors',
  'sports-infra': 'Sports Infrastructure',
  'ai-tech': 'AI & Technology Infrastructure',
  'labs': 'Science & Healthcare Labs',
  'libraries': 'Library & Learning Resources',
  'additional-infra': 'Student Life & Campus Amenities',
  'strategic-services': 'Strategic Campus Services',
  'automation': 'Campus Management & Automation',
  'turnkey-projects': 'Turnkey Academic Projects',
  'renovation': 'Renovation & Modernisation',
  'hr-placements': 'Strategic Campus Services',
  'innovation': 'Turnkey Academic Projects',
};

const INSTITUTION_LABEL_MAP: Record<string, string> = {
  'all': 'All Educational Institutions',
  'universities': 'Universities (State & Private)',
  'engineering': 'Engineering & Technical Colleges',
  'degree': 'Degree & Management Colleges',
  'vocational': 'Vocational & Polytechnic Institutes',
  'skill': 'Skill Development Centers',
  'schools': 'K-12 & International Schools',
  'medical': 'Medical & Healthcare Colleges',
};

export class InceptionMercuryProvider implements IAIProvider {
  readonly name = 'inception-mercury';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly timeoutMs: number;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    modelName?: string;
    timeoutMs?: number;
  }) {
    this.apiKey = options?.apiKey !== undefined ? options.apiKey : (process.env.INCEPTION_API_KEY || '');
    this.baseUrl = (options?.baseUrl || process.env.INCEPTION_BASE_URL || 'https://api.inceptionlabs.ai/v1').replace(/\/+$/, '');
    this.modelName = options?.modelName || process.env.INCEPTION_MODEL || 'mercury-3';
    this.timeoutMs = options?.timeoutMs || 4000;
  }

  isAvailable(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.trim().length > 0;
  }

  async extractIntent(request: AIIntentRequest): Promise<AIIntentResult> {
    if (!this.isAvailable()) {
      throw new Error('[InceptionMercuryProvider] INCEPTION_API_KEY is not configured');
    }

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.callInceptionAPI(request);
      } catch (err: any) {
        lastError = err;
        console.warn(`[InceptionMercuryProvider] Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 350));
        }
      }
    }

    throw new Error(`[InceptionMercuryProvider] Exhausted all ${maxRetries} retry attempts. Last error: ${lastError?.message}`);
  }

  private async callInceptionAPI(request: AIIntentRequest): Promise<AIIntentResult> {
    const startTime = Date.now();
    const systemPrompt = `You are the executive solution intent classifier for SchoolMart, India's premier B2B school procurement and infrastructure platform.
Analyze the user's institution brief and extract structured institutional intent in strict JSON format:
{
  "intentSummary": "Short 5-10 word executive procurement proposal title",
  "categoryId": "one of: campus-design, furniture, sports-infra, ai-tech, labs, libraries, additional-infra, strategic-services, automation, turnkey-projects",
  "institutionId": "one of: universities, engineering, degree, vocational, skill, schools, medical, all",
  "scale": "Estimated capacity/scale (e.g. '50 Workstations', '100-Seater Auditorium') or null",
  "scopeTags": ["Array", "Of", "3-5", "Key", "Deliverable", "Tags"],
  "detectedKeywords": ["array", "of", "search", "keywords"],
  "confidenceScore": 0.95
}
Return strictly raw JSON. Do not include introductory text, explanations, or markdown fences.`;

    const userContent = JSON.stringify({
      userBrief: request.queryText,
      institutionHint: request.institutionHint || null,
      categoryHint: request.categoryHint || null,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.5,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Inception API responded with HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const payload = (await response.json()) as any;
      const content = payload?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('Inception API returned an empty completion content');
      }

      const parsed = parseLLMJson<any>(content);
      const rawCat = (parsed.categoryId || request.categoryHint || 'ai-tech').trim().toLowerCase();
      const validCat = CATEGORY_LABEL_MAP[rawCat] ? rawCat : (request.categoryHint || 'ai-tech');

      const rawInst = (parsed.institutionId || request.institutionHint || 'engineering').trim().toLowerCase();
      const validInst = INSTITUTION_LABEL_MAP[rawInst] ? rawInst : (request.institutionHint || 'all');

      const rawScope = Array.isArray(parsed.scopeTags)
        ? parsed.scopeTags.map((s: any) => String(s).trim()).filter((s: string) => s.length > 0)
        : [];

      const rawKeywords = Array.isArray(parsed.detectedKeywords)
        ? parsed.detectedKeywords.map((k: any) => String(k).trim().toLowerCase()).filter(Boolean)
        : [];

      return {
        intentSummary: String(parsed.intentSummary || request.queryText || 'Institutional Campus Solution').slice(0, 140),
        categoryId: validCat,
        categoryLabel: CATEGORY_LABEL_MAP[validCat] || 'Campus Solutions',
        institutionId: validInst,
        institutionLabel: INSTITUTION_LABEL_MAP[validInst] || 'Educational Institutions',
        detectedKeywords: rawKeywords.length > 0 ? rawKeywords : [validCat],
        scale: parsed.scale ? String(parsed.scale).slice(0, 60) : null,
        scopeTags: rawScope.length > 0 ? rawScope.slice(0, 5) : ['Turnkey Design', 'Procurement', 'Installation'],
        confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.max(0.1, Math.min(1.0, parsed.confidenceScore)) : 0.90,
        providerName: this.name,
        rawLatencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`[InceptionMercuryProvider] Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Call 1: Discovery & Section A Synthesis ─────────────────────────────────
  async discoverSolutions(request: AIDiscoveryRequest): Promise<AIDiscoveryResult> {
    if (!this.isAvailable()) {
      throw new Error('[InceptionMercuryProvider] INCEPTION_API_KEY is not configured');
    }

    const startTime = Date.now();
    const systemPrompt = `You are the Executive School Infrastructure Consultant for SchoolMart India.
Analyze the user's institution brief and select 3 to 6 matching service cards in order of relevance (best match first) from the provided catalog.

IMPORTANT COPYWRITING RULES FOR sectionA:
- NEVER use the word 'turnkey', 'orchestration', 'paradigm', or complex vendor jargon. Use simple, everyday words that a college principal or customer understands.
- "headline":
  * If the brief specifies an institution (e.g. Engineering College, Medical College, School, University): Use "Solutions for your [Institution Name]" (e.g., "Solutions for your Engineering College").
  * If no specific institution is mentioned: Use "Solutions for your Campus: [Simple Subject]" (e.g., "Solutions for your Campus: Classroom Chairs & Seating" or "Solutions for your Campus: Indoor Badminton Courts").
- "narrative":
  * Write a natural, grammatically correct sentence: "We understand that you are looking for [plain language need] for your [institution/campus]."
  * Do NOT force a scale or quantity unless the user specifically wrote one (e.g. "40 chairs" or "500 seats"). If mentioned, include it naturally (e.g. "approx. 40 units"); if not mentioned, do NOT invent numbers.
- "userTags": 2 to 4 clean tags reflecting user requirement and scale only (e.g. ["Campus Furniture", "40 Chairs"]).

Return strict JSON:
{
  "sectionA": {
    "headline": "Solutions for your [Institution] or Solutions for your Campus: [Simple Subject]",
    "narrative": "We understand that you are looking for [plain language need] for your [institution/campus].",
    "userTags": ["2-4 clean tags"]
  },
  "categoryId": "primary category slug matching: campus-design, furniture, sports-infra, ai-tech, labs, libraries, additional-infra, strategic-services, automation, turnkey-projects",
  "institutionId": "universities, engineering, degree, vocational, skill, schools, medical, or all",
  "scale": "Extracted scale (e.g. '40 Workstations') ONLY if explicitly mentioned in user brief, otherwise null",
  "scopeTags": ["3-5", "scope", "tags"],
  "selectedCardSlugs": ["card_id_1", "card_id_2", "card_id_3"],
  "selectedPageSlugs": ["page_slug_1", "page_slug_2"],
  "complementaryCategories": ["Category 1", "Category 2", "Category 3"],
  "confidenceScore": 0.95
}
Only return valid card IDs from the catalog. Order matters: place the card that most directly satisfies the user's exact query at index 0. Return raw JSON only.`;

    const compactCatalog = (request.catalog || []).slice(0, 60).map(c => ({
      id: c.cardSlug || c.slug,
      slug: c.slug,
      title: c.title,
      cat: c.categorySlug,
      summary: (c.summary || '').slice(0, 100),
    }));

    const userContent = JSON.stringify({
      userBrief: request.queryText,
      institutionHint: request.institutionHint || null,
      categoryHint: request.categoryHint || null,
      catalog: compactCatalog,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Inception API responded with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as any;
      const content = payload?.choices?.[0]?.message?.content;
      const parsed = parseLLMJson<any>(content);

      const rawCat = (parsed.categoryId || request.categoryHint || 'ai-tech').trim().toLowerCase();
      const validCat = CATEGORY_LABEL_MAP[rawCat] ? rawCat : 'ai-tech';

      const rawInst = (parsed.institutionId || request.institutionHint || 'engineering').trim().toLowerCase();
      const validInst = INSTITUTION_LABEL_MAP[rawInst] ? rawInst : 'all';

      const rawCardSlugs = Array.isArray(parsed.selectedCardSlugs)
        ? parsed.selectedCardSlugs.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];
      const validSlugs = Array.isArray(parsed.selectedPageSlugs)
        ? parsed.selectedPageSlugs.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : (rawCardSlugs.length > 0 ? rawCardSlugs : []);
      const selectedCardSlugs = rawCardSlugs.length > 0 ? rawCardSlugs : validSlugs;

      const sanitizeText = (txt: string) => txt.replace(/\bturnkey\s*/gi, '').replace(/\s{2,}/g, ' ').trim();

      const rawHeadline = String(parsed.sectionA?.headline || (
        validInst !== 'all' ? `Solutions for your ${INSTITUTION_LABEL_MAP[validInst] || 'Institution'}` : `Solutions for your Campus: ${CATEGORY_LABEL_MAP[validCat]}`
      )).slice(0, 120);

      const rawNarrative = String(parsed.sectionA?.narrative || (
        `We understand that you are looking for ${CATEGORY_LABEL_MAP[validCat].toLowerCase()} solutions for your institution.`
      )).slice(0, 400);

      return {
        sectionA: {
          headline: sanitizeText(rawHeadline),
          narrative: sanitizeText(rawNarrative),
          userTags: Array.isArray(parsed.sectionA?.userTags) ? parsed.sectionA.userTags.map((t: any) => sanitizeText(String(t))).slice(0, 4) : [INSTITUTION_LABEL_MAP[validInst] || 'Institution', CATEGORY_LABEL_MAP[validCat]],
        },
        categoryId: validCat,
        categoryLabel: CATEGORY_LABEL_MAP[validCat],
        institutionId: validInst,
        institutionLabel: INSTITUTION_LABEL_MAP[validInst],
        scale: parsed.scale ? String(parsed.scale).slice(0, 60) : null,
        scopeTags: Array.isArray(parsed.scopeTags) ? parsed.scopeTags.map(String).slice(0, 5) : [],
        selectedPageSlugs: validSlugs.length > 0 ? validSlugs : ['ai-ml', 'smart-classrooms'],
        selectedCardSlugs: selectedCardSlugs.length > 0 ? selectedCardSlugs : validSlugs,
        complementaryCategories: Array.isArray(parsed.complementaryCategories) ? parsed.complementaryCategories.map(String).slice(0, 4) : ['Smart Classrooms', 'Advanced Engineering Labs', 'Campus Networking & IT'],
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.95,
        providerName: this.name,
        rawLatencyMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Call 2: Authentic Content Extraction & Consultant Reasoning ─────────────
  async extractPageCards(request: AIExtractCardsRequest): Promise<AIExtractedCardsResult> {
    if (!this.isAvailable()) {
      throw new Error('[InceptionMercuryProvider] INCEPTION_API_KEY is not configured');
    }

    const startTime = Date.now();
    const systemPrompt = `You are the Senior Technical Solutions Architect for SchoolMart.
Extract card metadata for each provided service page based strictly on the provided page content snippets.

CRITICAL RULES:
1. STRICT AUTHENTICITY: All inclusions and summaries MUST be sourced from the provided page snippets. Do NOT invent deliverables.
2. KEY INCLUSIONS: Extract up to 3 distinct deliverables mentioned on that page. If the page does not contain deliverables, return an empty array [].
3. WHY RELEVANT: Write a 1-sentence consultant rationale explaining why this service page addresses the user's requirement.

Return strict JSON:
{
  "cards": [
    {
      "slug": "page-slug",
      "title": "Clean service title",
      "summary": "1-2 sentence description",
      "inclusions": ["Inclusion 1", "Inclusion 2", "Inclusion 3"],
      "whyRelevant": "1-sentence consultant explanation"
    }
  ]
}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ userRequirement: request.userRequirement, pages: request.pages }) },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Inception API responded with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as any;
      const content = payload?.choices?.[0]?.message?.content;
      const parsed = parseLLMJson<{ cards: ExtractedCardItem[] }>(content);

      return {
        cards: Array.isArray(parsed?.cards) ? parsed.cards : [],
        providerName: this.name,
        rawLatencyMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
