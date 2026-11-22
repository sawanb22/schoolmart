import crypto from 'crypto';
import { ISolutionsRepository } from './solutions-repository.interface';
import { SolutionCardDto, SolutionsTaxonomy, DataWatermarks, CaseStudyDto } from './types/solutions-card.types';

export class SolutionsIndexService {
  private cache: readonly SolutionCardDto[] = Object.freeze([]);
  private taxonomy: SolutionsTaxonomy | null = null;
  private caseStudies: readonly CaseStudyDto[] = Object.freeze([]);
  private version = '';
  private isInitialized = false;

  private currentRebuildPromise: Promise<void> | null = null;
  private needsRebuild = false;

  private initialNightlyTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastCmsVersion = 0;
  private memoizedCmsVersion: { version: number; expiresAt: number } | null = null;
  private clock: () => number = () => Date.now();
  private syncedWatermark: DataWatermarks = {
    pageMax: 0,
    pageCount: 0,
    cardMax: 0,
    cardCount: 0,
    taxonomyMax: 0,
    caseMax: 0,
    caseCount: 0,
    cmsVersion: 0,
  };

  constructor(private readonly repository: ISolutionsRepository) {}

  /**
   * Calculates milliseconds to the next occurrence of targetHour:targetMinute.
   * If now is at or past that target today, schedules for tomorrow.
   */
  static calculateDelayToTarget(now: Date, targetHour = 3, targetMinute = 0): number {
    const target = new Date(now);
    target.setHours(targetHour, targetMinute, 0, 0);
    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return Math.max(0, target.getTime() - now.getTime());
  }

  /**
   * Validates that all watermark fields are valid, finite, non-negative numbers.
   */
  static isValidWatermarks(w: any): w is DataWatermarks {
    return (
      w !== null &&
      typeof w === 'object' &&
      typeof w.pageMax === 'number' && !isNaN(w.pageMax) && isFinite(w.pageMax) && w.pageMax >= 0 &&
      typeof w.pageCount === 'number' && !isNaN(w.pageCount) && isFinite(w.pageCount) && w.pageCount >= 0 &&
      typeof w.cardMax === 'number' && !isNaN(w.cardMax) && isFinite(w.cardMax) && w.cardMax >= 0 &&
      typeof w.cardCount === 'number' && !isNaN(w.cardCount) && isFinite(w.cardCount) && w.cardCount >= 0 &&
      typeof w.taxonomyMax === 'number' && !isNaN(w.taxonomyMax) && isFinite(w.taxonomyMax) && w.taxonomyMax >= 0 &&
      (w.caseMax === undefined || (typeof w.caseMax === 'number' && !isNaN(w.caseMax) && isFinite(w.caseMax) && w.caseMax >= 0)) &&
      (w.caseCount === undefined || (typeof w.caseCount === 'number' && !isNaN(w.caseCount) && isFinite(w.caseCount) && w.caseCount >= 0)) &&
      (w.cmsVersion === undefined || (typeof w.cmsVersion === 'number' && !isNaN(w.cmsVersion) && isFinite(w.cmsVersion) && w.cmsVersion >= 0))
    );
  }

  /**
   * Promise-chaining mutex pattern.
   * Guarantees all concurrent callers wait until their rebuild is fully complete.
   */
  async rebuild(): Promise<void> {
    if (this.currentRebuildPromise) {
      this.needsRebuild = true;
      await this.currentRebuildPromise;
      if (this.needsRebuild) {
        return this.rebuild();
      }
      return;
    }

    this.currentRebuildPromise = (async () => {
      try {
        do {
          this.needsRebuild = false;
          await this.compileIndex();
        } while (this.needsRebuild);
      } finally {
        this.currentRebuildPromise = null;
      }
    })();

    await this.currentRebuildPromise;
  }

  private async compileIndex(): Promise<void> {
    const [rawCards, publishedSlugs, taxonomy, rawCaseStudies, currentCmsVersion] = await Promise.all([
      this.repository.fetchActiveCards(),
      this.repository.fetchPublishedSlugs(),
      this.repository.fetchTaxonomy(),
      this.repository.fetchCaseStudies(),
      this.repository.fetchCmsVersion
        ? this.repository.fetchCmsVersion()
        : this.repository.fetchDataWatermarks().then(w => w.cmsVersion ?? 1),
    ]);

    // 1. Filter cards whose target page (or root parent hub) is published
    const validCards = rawCards.filter(c => {
      if (!c.active) return false;
      if (publishedSlugs.has(c.targetSlug)) return true;
      const rootSlug = c.targetSlug.split('/')[0];
      return publishedSlugs.has(rootSlug);
    });
    const validSlugs = new Set(validCards.map(c => c.cardSlug));

    // 2. Sanitize cross-sell links against validSlugs and purge self-references
    const sanitizedCards: SolutionCardDto[] = validCards.map(c => {
      const cleanRelated = (c.relatedCardSlugs || []).filter(
        slug => slug !== c.cardSlug && validSlugs.has(slug)
      );
      return {
        ...c,
        relatedCardSlugs: cleanRelated,
      };
    });

    // 3. Deep-freeze objects so downstream queries cannot mutate them in-place
    const frozenCards: readonly SolutionCardDto[] = Object.freeze(
      sanitizedCards.map(c =>
        Object.freeze({
          ...c,
          inclusions: Object.freeze([...c.inclusions]),
          keywords: Object.freeze([...c.keywords]),
          institutionTypes: Object.freeze([...c.institutionTypes]),
          secondaryCategorySlugs: Object.freeze([...c.secondaryCategorySlugs]),
          relatedCardSlugs: Object.freeze([...c.relatedCardSlugs]),
        })
      )
    );

    const frozenCaseStudies: readonly CaseStudyDto[] = Object.freeze(
      (rawCaseStudies || []).map(cs => Object.freeze({ ...cs }))
    );

    // 4. Deterministic content hash (cards + taxonomy + case studies)
    const hashPayload = JSON.stringify({
      cards: frozenCards,
      taxonomy: taxonomy || null,
      caseStudies: frozenCaseStudies,
    });
    const nextVersion = crypto.createHash('sha256').update(hashPayload).digest('hex').slice(0, 16);

    // 5. Atomic pointer swap
    this.cache = frozenCards;
    this.taxonomy = taxonomy ? Object.freeze(taxonomy) : null;
    this.caseStudies = frozenCaseStudies;
    this.version = nextVersion;
    this.lastCmsVersion = currentCmsVersion;
    this.isInitialized = true;
  }

  /**
   * Heartbeat polling for multi-worker Passenger environments.
   * Watermark only advances if rebuild() succeeds.
   */
  async checkSync(): Promise<boolean> {
    try {
      const current = await this.repository.fetchDataWatermarks();
      if (!SolutionsIndexService.isValidWatermarks(current)) {
        console.warn('[SolutionsIndexService] Background sync received invalid watermarks, skipping check');
        return false;
      }
      if (this.hasWatermarkAdvanced(current, this.syncedWatermark)) {
        await this.rebuild();
        this.syncedWatermark = current;
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[SolutionsIndexService] Background sync check warning; watermark not advanced:', err?.message || err);
      return false;
    }
  }

  private hasWatermarkAdvanced(current: DataWatermarks, synced: DataWatermarks): boolean {
    return (
      current.pageMax > synced.pageMax ||
      current.pageCount !== synced.pageCount ||
      current.cardMax > synced.cardMax ||
      current.cardCount !== synced.cardCount ||
      current.taxonomyMax > synced.taxonomyMax ||
      (current.caseMax ?? 0) > (synced.caseMax ?? 0) ||
      (current.caseCount ?? 0) !== (synced.caseCount ?? 0) ||
      (current.cmsVersion !== undefined && synced.cmsVersion !== undefined && current.cmsVersion > synced.cmsVersion)
    );
  }

  /**
   * Schedules a daily background sync at targetHour:targetMinute (default: 03:00 AM off-peak).
   * Calculates milliseconds to the next off-peak target, runs the sync safely,
   * then repeats every 24 hours. Both timers are marked with .unref() so Node exits cleanly.
   */
  startNightlySync(targetHour = 3, targetMinute = 0): void {
    this.stopHeartbeat();

    const initialDelayMs = SolutionsIndexService.calculateDelayToTarget(new Date(), targetHour, targetMinute);
    this.initialNightlyTimer = setTimeout(async () => {
      try {
        await this.checkSync();
      } catch (err: any) {
        console.warn('[SolutionsIndexService] Off-peak nightly sync check warning:', err?.message || err);
      }

      this.heartbeatTimer = setInterval(async () => {
        try {
          await this.checkSync();
        } catch (err: any) {
          console.warn('[SolutionsIndexService] Off-peak nightly sync recurring interval warning:', err?.message || err);
        }
      }, 24 * 60 * 60 * 1000);

      if (this.heartbeatTimer.unref) {
        this.heartbeatTimer.unref();
      }
    }, initialDelayMs);

    if (this.initialNightlyTimer.unref) {
      this.initialNightlyTimer.unref();
    }
  }

  /**
   * Heartbeat interval polling (retained for backward compatibility or testing).
   * Defaults to 24 hours if no interval provided.
   */
  startHeartbeat(intervalMs = 86400000): void {
    if (this.heartbeatTimer || this.initialNightlyTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.checkSync().catch((err: any) => {
        console.warn('[SolutionsIndexService] Heartbeat sync warning:', err?.message || err);
      });
    }, intervalMs);
    // Unref timer so it doesn't prevent Node process exits or test runner completion
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  stopHeartbeat(): void {
    if (this.initialNightlyTimer) {
      clearTimeout(this.initialNightlyTimer);
      this.initialNightlyTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  stop(): void {
    this.stopHeartbeat();
  }

  getCards(): readonly SolutionCardDto[] {
    return this.cache;
  }

  getTaxonomy(): SolutionsTaxonomy | null {
    return this.taxonomy;
  }

  getCaseStudies(): readonly CaseStudyDto[] {
    return this.caseStudies;
  }

  getVersion(): string {
    return this.version;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  setClock(fn: () => number): void {
    this.clock = fn;
  }

  resetFreshnessMemo(): void {
    this.memoizedCmsVersion = null;
  }

  getLastCmsVersion(): number {
    return this.lastCmsVersion;
  }

  /**
   * Ensures the index reflects current CmsState.version across processes.
   * Compares lastCmsVersion with CmsState.version (memoized in-process for up to 5s).
   * If changed or index not ready, triggers rebuild() behind the mutex lock.
   */
  async ensureFresh(): Promise<void> {
    const now = this.clock();
    let currentVersion: number;

    if (this.memoizedCmsVersion && this.memoizedCmsVersion.expiresAt > now) {
      currentVersion = this.memoizedCmsVersion.version;
    } else {
      currentVersion = this.repository.fetchCmsVersion
        ? await this.repository.fetchCmsVersion()
        : ((await this.repository.fetchDataWatermarks()).cmsVersion ?? 1);
      this.memoizedCmsVersion = {
        version: currentVersion,
        expiresAt: now + 5000,
      };
    }

    if (!this.isInitialized || this.lastCmsVersion !== currentVersion) {
      await this.rebuild();
      this.memoizedCmsVersion = {
        version: this.lastCmsVersion,
        expiresAt: this.clock() + 5000,
      };
    }
  }
}
