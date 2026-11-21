import crypto from 'crypto';
import { IAIProvider, RawPageSnippet, AIDiscoveryResult, AIExtractedCardsResult } from './ai-providers';
import { COMMON_TYPOS, fuzzyMatchesToken } from './ai-providers/local-nlp.provider';
import { SolutionsIndexService } from './solutions-index.service';
import { SolutionCardDto } from './types/solutions-card.types';
import {
  SearchRequestDto,
  ProposalResponseDto,
  CuratedSolutionDto,
  ComplementarySolutionDto,
  ProposalCaseStudyDto,
  RequirementSummaryDto,
} from './types/solutions-search.types';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'our', 'your', 'this', 'that',
  'have', 'need', 'want', 'require', 'looking', 'are', 'can', 'will',
  'all', 'any', 'per', 'how', 'what', 'into', 'such', 'more', 'campus',
  'mart', 'setup', 'institution', 'college', 'school', 'university',
]);

interface ScoredCard {
  card: SolutionCardDto;
  score: number;
  categoryScore: number;
  institutionScore: number;
  keywordScore: number;
  editorialScore: number;
  matchedTokens: string[];
}

export class IntentScorerService {
  constructor(
    private readonly indexService: SolutionsIndexService,
    private readonly aiProvider: IAIProvider
  ) {}

  async generateProposal(request: SearchRequestDto): Promise<ProposalResponseDto> {
    const startTime = Date.now();
    if (!this.indexService.isReady()) {
      try {
        await this.indexService.rebuild();
      } catch (err: any) {
        console.warn('[IntentScorerService] Auto-rebuild on cold index failed:', err.message);
      }
    }
    let activeCards = this.indexService.getCards();
    const taxonomy = this.indexService.getTaxonomy();

    // ── Call 1: Intent Extraction & Page Discovery ──────────────────────────────
    let discoveryResult: AIDiscoveryResult | null = null;
    let intentSummaryStr = '';
    let categoryId = 'ai-tech';
    let institutionId = 'all';
    let scaleVal: string | null = null;
    let scopeTagsList: string[] = [];
    let confidence = 0.90;
    let providerName = this.aiProvider.name;

    // Smart pre-filtering for AI Call 1 catalog (up to 60 candidates)
    const rawTokensForCatalog = (request.queryText || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t));
    const normalizedTokensForCatalog = rawTokensForCatalog.map(t => COMMON_TYPOS[t] || t);

    const isExplicitCategory = typeof request.categoryHint === 'string' &&
      request.categoryHint.trim().length > 0 &&
      request.categoryHint.trim() !== 'all';
    const targetCategoryHint = isExplicitCategory ? request.categoryHint!.trim() : null;

    const candidateCards = [...activeCards];
    candidateCards.sort((a, b) => {
      // Prioritize active requested category
      if (targetCategoryHint) {
        const aCat = (a.categorySlug === targetCategoryHint || a.secondaryCategorySlugs.includes(targetCategoryHint)) ? 1 : 0;
        const bCat = (b.categorySlug === targetCategoryHint || b.secondaryCategorySlugs.includes(targetCategoryHint)) ? 1 : 0;
        if (bCat !== aCat) return bCat - aCat;
      }
      // Prioritize query token matches
      let aMatches = 0;
      let bMatches = 0;
      const aText = `${a.cardSlug} ${a.title} ${a.keywords.join(' ')}`.toLowerCase();
      const bText = `${b.cardSlug} ${b.title} ${b.keywords.join(' ')}`.toLowerCase();
      for (const t of normalizedTokensForCatalog) {
        if (aText.includes(t)) aMatches++;
        if (bText.includes(t)) bMatches++;
      }
      if (bMatches !== aMatches) return bMatches - aMatches;
      return b.priority - a.priority;
    });

    const catalog = candidateCards.slice(0, 60).map(c => ({
      cardSlug: c.cardSlug,
      slug: c.targetSlug,
      title: c.title,
      categorySlug: c.categorySlug,
      subcategorySlug: c.subcategorySlug || undefined,
      summary: c.summary,
    }));

    if (typeof this.aiProvider.discoverSolutions === 'function') {
      try {
        discoveryResult = await this.aiProvider.discoverSolutions({
          queryText: (request.queryText || '').trim(),
          institutionHint: request.institutionHint || null,
          categoryHint: request.categoryHint || null,
          catalog,
        });

        categoryId = discoveryResult.categoryId;
        institutionId = discoveryResult.institutionId;
        scaleVal = discoveryResult.scale || null;
        scopeTagsList = [...discoveryResult.scopeTags];
        confidence = discoveryResult.confidenceScore;
        providerName = discoveryResult.providerName;
        intentSummaryStr = discoveryResult.sectionA.headline;
      } catch (err: any) {
        console.warn('[IntentScorerService] AI Call 1 discoverSolutions failed, falling back to extractIntent:', err.message);
      }
    }

    if (!discoveryResult) {
      const intentResult = await this.aiProvider.extractIntent({
        queryText: (request.queryText || '').trim(),
        institutionHint: request.institutionHint || null,
        categoryHint: request.categoryHint || null,
      });

      categoryId = intentResult.categoryId;
      institutionId = intentResult.institutionId;
      scaleVal = intentResult.scale || null;
      scopeTagsList = [...intentResult.scopeTags];
      confidence = intentResult.confidenceScore;
      providerName = intentResult.providerName;
      intentSummaryStr = intentResult.intentSummary;
    }

    // Resolve human-readable category and institution labels
    const categoryObj = taxonomy?.categories.find(c => c.id === categoryId);
    const categoryLabel = categoryObj?.label || 'Campus Solutions';

    const instObj = taxonomy?.institutions.find(i => i.id === institutionId);
    const institutionLabel = instObj?.label || 'Educational Institutions';

    // Build Section A metadata (Anti-Jargon, Natural Grammar)
    const rawHeadline = discoveryResult?.sectionA?.headline || (
      institutionId !== 'all' ? `Solutions for your ${institutionLabel}` : `Solutions for your Campus: ${categoryLabel}`
    );

    const rawNarrative = discoveryResult?.sectionA?.narrative || (
      `We understand that you are looking for ${categoryLabel.toLowerCase()} solutions for your institution.`
    );

    const sanitizeSectionA = (txt: string) => txt.replace(/\bturnkey\s*/gi, '').replace(/\s{2,}/g, ' ').trim();
    const headline = sanitizeSectionA(rawHeadline);
    const narrative = sanitizeSectionA(rawNarrative);

    const userTags: string[] = discoveryResult?.sectionA?.userTags
      ? discoveryResult.sectionA.userTags.map(sanitizeSectionA).filter(Boolean)
      : [];
    if (userTags.length === 0) {
      if (institutionId !== 'all') userTags.push(institutionLabel);
      userTags.push(sanitizeSectionA(categoryLabel));
      if (scaleVal) userTags.push(scaleVal);
    }

    const requirementSummary: RequirementSummaryDto = {
      intentSummary: intentSummaryStr,
      institutionId,
      institutionLabel,
      categoryId,
      categoryLabel,
      scale: scaleVal,
      scopeTags: scopeTagsList,
      headline,
      narrative,
      userTags,
    };

    // ── Candidate Scoring & Selection ───────────────────────────────────────────
    const rawTokens = (request.queryText || intentSummaryStr)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t));

    const queryTokens = Array.from(new Set(rawTokens.map(t => COMMON_TYPOS[t] || t)));

    // Strict Category Gate: if user explicitly selected a category from UI dropdown,
    // only cards from that category (or secondary) are eligible for Section B.
    const eligibleCards = isExplicitCategory
      ? activeCards.filter(c => c.categorySlug === targetCategoryHint || c.secondaryCategorySlugs.includes(targetCategoryHint!))
      : activeCards;

    // 1. Direct AI Selection Ordering
    const aiSelectedSlugs = (discoveryResult?.selectedCardSlugs && discoveryResult.selectedCardSlugs.length > 0)
      ? discoveryResult.selectedCardSlugs
      : (discoveryResult?.selectedPageSlugs || []);

    const directAiCards: SolutionCardDto[] = [];
    const seenAiSlugs = new Set<string>();

    for (const slug of aiSelectedSlugs) {
      if (!slug) continue;
      const cleanSlug = String(slug).trim().toLowerCase();
      // Match by cardSlug or targetSlug
      const matchedCard = eligibleCards.find(c =>
        c.cardSlug.toLowerCase() === cleanSlug ||
        c.targetSlug.toLowerCase() === cleanSlug ||
        c.targetSlug.toLowerCase() === cleanSlug.replace(/^\/+/, '')
      );
      if (matchedCard && !seenAiSlugs.has(matchedCard.cardSlug)) {
        seenAiSlugs.add(matchedCard.cardSlug);
        directAiCards.push(matchedCard);
      }
    }

    // 2. Deterministic Scoring for Points & Offline Fallback
    const scoredCards: ScoredCard[] = [];

    for (const card of eligibleCards) {
      if (!card.active) continue;

      // Factor 1: Category Alignment (40 pts)
      let categoryScore = 0;
      if (card.categorySlug === categoryId) {
        categoryScore = 40;
      } else if (card.secondaryCategorySlugs.includes(categoryId)) {
        categoryScore = 20;
      }

      // Factor 2: Institution Relevance (25 pts)
      let institutionScore = 5;
      if (
        institutionId === 'all' ||
        card.institutionTypes.includes('all') ||
        card.institutionTypes.includes(institutionId)
      ) {
        institutionScore = card.institutionTypes.includes(institutionId) ? 25 : 20;
      }

      // Factor 3: Fuzzy Keyword & Scope Overlap (25 pts)
      const cardKeywords = new Set([
        ...card.keywords.map(k => k.toLowerCase()),
        ...card.title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3),
      ]);

      const matchedTokens: string[] = [];
      for (const qt of queryTokens) {
        let matched = false;
        for (const ck of cardKeywords) {
          if (fuzzyMatchesToken(qt, ck)) {
            matched = true;
            break;
          }
        }
        if (matched) matchedTokens.push(qt);
      }

      const denominator = Math.min(5, queryTokens.length);
      const overlapRatio = denominator > 0 ? matchedTokens.length / denominator : 0;
      const keywordScore = Math.min(25, Math.round(overlapRatio * 25));

      // Factor 4: Editorial Priority (10 pts)
      const editorialScore = Math.min(10, Math.round((Math.max(0, card.priority) / 100) * 10));

      // Dominant Title / Subject Match Bonus (+35 pts)
      let titleBonus = 0;
      const lowerTitle = card.title.toLowerCase();
      const titleTokens = lowerTitle.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
      for (const qt of queryTokens) {
        if (titleTokens.some(tt => fuzzyMatchesToken(qt, tt))) {
          titleBonus = 35;
          break;
        }
      }

      // AI Call 1 Discovery Bonus (+20 pts if chosen by Call 1)
      const isChosenByAi = seenAiSlugs.has(card.cardSlug) || aiSelectedSlugs.some(s => s === card.targetSlug);
      const discoveryBonus = isChosenByAi ? 20 : 0;

      const totalScore = Math.min(100, categoryScore + institutionScore + keywordScore + editorialScore + titleBonus + discoveryBonus);

      scoredCards.push({
        card,
        score: totalScore,
        categoryScore,
        institutionScore,
        keywordScore,
        editorialScore,
        matchedTokens,
      });
    }

    scoredCards.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.card.priority !== a.card.priority) return b.card.priority - a.card.priority;
      return a.card.cardSlug.localeCompare(b.card.cardSlug);
    });

    let topScored: ScoredCard[] = [];
    let unmatchedFallback = false;

    if (directAiCards.length >= 3) {
      // AI direct ordering takes absolute precedence for ranking
      for (const ac of directAiCards.slice(0, 6)) {
        const scored = scoredCards.find(sc => sc.card.cardSlug === ac.cardSlug);
        if (scored) {
          topScored.push(scored);
        } else {
          topScored.push({
            card: ac,
            score: 95,
            categoryScore: 40,
            institutionScore: 20,
            keywordScore: 25,
            editorialScore: 10,
            matchedTokens: queryTokens,
          });
        }
      }
    } else {
      // Deterministic fallback using fuzzy scoring and title dominance
      let curatedMatches = scoredCards.filter(sc => sc.score >= 35);
      if (curatedMatches.length === 0) {
        curatedMatches = scoredCards.slice(0, 3);
      }
      topScored = curatedMatches.slice(0, Math.min(6, Math.max(3, curatedMatches.length)));
    }

    // ── Call 2: Authentic Content Extraction & Consultant Reasoning ─────────────
    let extractedCardsMap = new Map<string, { summary?: string; inclusions?: readonly string[]; whyRelevant?: string }>();

    if (typeof this.aiProvider.extractPageCards === 'function') {
      try {
        const pageSnippets: RawPageSnippet[] = topScored.map(sc => ({
          slug: sc.card.targetSlug,
          cardSlug: sc.card.cardSlug,
          title: sc.card.title,
          heroTitle: sc.card.title,
          heroSubtitle: sc.card.summary,
          heroImage: sc.card.imageUrl,
          contentSnippets: sc.card.inclusions,
        }));

        const extractionResult: AIExtractedCardsResult = await this.aiProvider.extractPageCards({
          userRequirement: (request.queryText || intentSummaryStr),
          institutionLabel,
          pages: pageSnippets,
        });

        for (const item of extractionResult.cards) {
          if (item.cardSlug) extractedCardsMap.set(item.cardSlug, item);
          if (item.slug) extractedCardsMap.set(item.slug, item);
        }
      } catch (err: any) {
        console.warn('[IntentScorerService] AI Call 2 extractPageCards failed, using deterministic synthesis:', err.message);
      }
    }

    const curatedCardSlugs = new Set<string>();
    const curatedSolutions: CuratedSolutionDto[] = topScored.map(sc => {
      curatedCardSlugs.add(sc.card.cardSlug);
      const aiExtracted = extractedCardsMap.get(sc.card.cardSlug) || extractedCardsMap.get(sc.card.targetSlug);
      const whyRelevant = aiExtracted?.whyRelevant || this.buildWhyRelevantRationale(sc, requirementSummary);
      const summary = aiExtracted?.summary || sc.card.summary;
      const inclusions = (aiExtracted?.inclusions && aiExtracted.inclusions.length > 0)
        ? aiExtracted.inclusions
        : sc.card.inclusions;

      const targetUrl = sc.card.targetSlug ? `/${sc.card.targetSlug}` : '/find-solutions';

      return {
        cardSlug: sc.card.cardSlug,
        targetUrl,
        title: sc.card.title,
        summary,
        inclusions,
        badge: sc.card.badge,
        imageUrl: sc.card.imageUrl,
        categorySlug: sc.card.categorySlug,
        whyRelevant,
        score: sc.score,
      };
    });

    // ── Section C: Exactly 3 Full-Sized Hub Cards (Edge-to-Edge) ────────────────
    const complementaryInfra: ComplementarySolutionDto[] = [];
    const seenCompSlugs = new Set<string>();
    const seenCategories = new Set<string>([categoryId]);

    // Priority 0: Pick from AI Call 1 recommended complementary categories if available
    const aiCompCategories = discoveryResult?.complementaryCategories || [];
    for (const compCat of aiCompCategories) {
      if (complementaryInfra.length >= 3) break;
      const cleanComp = String(compCat).toLowerCase().trim();
      const match = activeCards.find(c =>
        c.active &&
        !curatedCardSlugs.has(c.cardSlug) &&
        !seenCategories.has(c.categorySlug) &&
        (c.categorySlug === cleanComp ||
         cleanComp.includes(c.categorySlug) ||
         c.categorySlug.includes(cleanComp) ||
         (taxonomy?.categories.find(cat => cat.id === c.categorySlug)?.label.toLowerCase().includes(cleanComp)))
      );
      if (match) {
        seenCompSlugs.add(match.cardSlug);
        seenCategories.add(match.categorySlug);
        complementaryInfra.push({
          cardSlug: match.cardSlug,
          targetUrl: `/${match.targetSlug}`,
          title: match.title,
          badge: match.badge || 'Complementary Hub',
          imageUrl: match.imageUrl,
          categorySlug: match.categorySlug,
          description: match.summary,
        });
      }
    }

    // Priority 1: Pick related cards from distinct adjacent categories
    for (const sc of topScored) {
      for (const relSlug of sc.card.relatedCardSlugs) {
        if (!curatedCardSlugs.has(relSlug) && !seenCompSlugs.has(relSlug)) {
          const match = activeCards.find(c => c.cardSlug === relSlug && c.active);
          if (match && !seenCategories.has(match.categorySlug)) {
            seenCompSlugs.add(relSlug);
            seenCategories.add(match.categorySlug);
            complementaryInfra.push({
              cardSlug: match.cardSlug,
              targetUrl: `/${match.targetSlug}`,
              title: match.title,
              badge: match.badge || 'Complementary Hub',
              imageUrl: match.imageUrl,
              categorySlug: match.categorySlug,
              description: match.summary,
            });
            if (complementaryInfra.length >= 3) break;
          }
        }
      }
      if (complementaryInfra.length >= 3) break;
    }

    // Priority 2: Fill up to strictly 3 cards from remaining categories
    if (complementaryInfra.length < 3) {
      for (const card of activeCards) {
        if (
          card.active &&
          !curatedCardSlugs.has(card.cardSlug) &&
          !seenCompSlugs.has(card.cardSlug) &&
          !seenCategories.has(card.categorySlug)
        ) {
          seenCompSlugs.add(card.cardSlug);
          seenCategories.add(card.categorySlug);
          complementaryInfra.push({
            cardSlug: card.cardSlug,
            targetUrl: `/${card.targetSlug}`,
            title: card.title,
            badge: card.badge || 'Complementary Hub',
            imageUrl: card.imageUrl,
            categorySlug: card.categorySlug,
            description: card.summary,
          });
          if (complementaryInfra.length >= 3) break;
        }
      }
    }

    // Final safety fill if catalogue has limited distinct categories
    if (complementaryInfra.length < 3) {
      for (const card of activeCards) {
        if (card.active && !curatedCardSlugs.has(card.cardSlug) && !seenCompSlugs.has(card.cardSlug)) {
          seenCompSlugs.add(card.cardSlug);
          complementaryInfra.push({
            cardSlug: card.cardSlug,
            targetUrl: `/${card.targetSlug}`,
            title: card.title,
            badge: card.badge || 'Complementary Hub',
            imageUrl: card.imageUrl,
            categorySlug: card.categorySlug,
            description: card.summary,
          });
          if (complementaryInfra.length >= 3) break;
        }
      }
    }

    // ── Section D: Relevant Projects & Ideas (3 Cards with Badges) ───────────────
    const cachedCaseStudies = this.indexService.getCaseStudies();
    let caseStudies: ProposalCaseStudyDto[] = cachedCaseStudies.slice(0, 3).map((cs, idx) => ({
      title: cs.title,
      slug: cs.slug,
      imageUrl: cs.imageUrl,
      badge: idx === 0 ? 'COMPLETED PROJECT' : 'CONCEPTUAL DESIGN',
      description: cs.description || 'Turnkey institutional architecture, specialized lab setup, and academic planning.',
    }));

    // If zero case studies exist in index, provide standard architectural references
    if (caseStudies.length === 0) {
      caseStudies = [
        {
          title: 'Institutional Computing & AI Research Center',
          slug: 'computing-center-case-study',
          imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=700&q=80',
          badge: 'COMPLETED PROJECT',
          description: 'Turnkey 120-workstation GPU laboratory installation with raised acoustic flooring and dedicated server racks.',
        },
        {
          title: 'Robotics & Advanced Engineering Hub Master Plan',
          slug: 'robotics-hub-master-plan',
          imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80',
          badge: 'CONCEPTUAL DESIGN',
          description: '3D architectural spatial concept with integrated server rooms, tiered glass observation galleries & makerspace.',
        },
        {
          title: 'Smart Academic Complex & Active Learning Wings',
          slug: 'smart-academic-complex',
          imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=700&q=80',
          badge: 'CONCEPTUAL DESIGN',
          description: 'Modular workstation floor layout with under-floor cable raceways and ceiling-mounted 4K lecture tracking systems.',
        },
      ];
    }

    const traceId = `trace-cm-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      traceId,
      executionTimeMs,
      unmatchedFallback,
      provider: providerName,
      confidenceScore: confidence,
      requirementSummary,
      curatedSolutions,
      complementaryInfra: complementaryInfra.slice(0, 3),
      caseStudies: caseStudies.slice(0, 3),
    };
  }

  private buildWhyRelevantRationale(sc: ScoredCard, summary: RequirementSummaryDto): string {
    const cardTitle = sc.card.title.toLowerCase();
    const cat = sc.card.categorySlug;

    if (cat === 'ai-tech' && (cardTitle.includes('gpu') || cardTitle.includes('ai') || cardTitle.includes('centre of excellence'))) {
      return 'Directly satisfies your requirement for high-density computing clusters and turnkey AI workstations.';
    }

    if (cat === 'ai-tech' && (cardTitle.includes('smart') || cardTitle.includes('classroom'))) {
      return 'Configured for hybrid digital pedagogy, interactive presentation displays, and connected audio-visual control.';
    }

    if (cat === 'furniture') {
      return 'Ergonomic, modular institutional furniture configured for high-density modern campus learning spaces.';
    }

    if (cat === 'sports-infra') {
      if (cardTitle.includes('badminton')) {
        return 'BWF-standard shock-absorbing tournament court configuration engineered for professional indoor badminton play.';
      }
      if (cardTitle.includes('basketball')) {
        return 'FIBA-compliant regulation court engineered for high-impact shock absorption and inter-collegiate play.';
      }
      if (cardTitle.includes('tennis')) {
        return 'ITF-approved multi-layer cushioned surface designed for all-weather collegiate tournament competition.';
      }
      if (cardTitle.includes('football') || cardTitle.includes('turf')) {
        return 'FIFA-certified artificial turf with integrated sub-base drainage and competition floodlighting.';
      }
      if (cardTitle.includes('swimming')) {
        return 'Semi-Olympic competitive swimming facility equipped with sand filtration and anti-slip racing decks.';
      }
      if (cardTitle.includes('track') || cardTitle.includes('athletics')) {
        return 'IAAF-certified seamless polyurethane running track engineered for high energy return and athlete joint safety.';
      }
      return 'Regulation FIBA/FIFA compliant sporting infrastructure designed for university athletic programs.';
    }

    if (cat === 'labs') {
      return 'Turnkey laboratory installation meeting national research, ventilation, and academic safety standards.';
    }

    if (sc.matchedTokens.length > 0) {
      return `Targeted solution aligned with your requirements for ${sc.matchedTokens.slice(0, 3).join(', ')}.`;
    }

    return `Recommended turnkey infrastructure for ${summary.institutionLabel} modernising their ${summary.categoryLabel} facilities.`;
  }
}
