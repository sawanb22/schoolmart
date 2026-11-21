import {
  IAIProvider,
  AIIntentRequest,
  AIIntentResult,
  AIDiscoveryRequest,
  AIDiscoveryResult,
  AIExtractCardsRequest,
  AIExtractedCardsResult,
} from './ai-provider.interface';
import { InceptionMercuryProvider } from './inception-mercury.provider';
import { LocalRuleNLPProvider } from './local-nlp.provider';

export interface AIProviderFactoryOptions {
  preferredProvider?: string;
  inceptionApiKey?: string;
  inceptionBaseUrl?: string;
  inceptionModel?: string;
  timeoutMs?: number;
}

/**
 * Resilient AI Provider wrapper that executes the primary provider (e.g. Inception Mercury-3)
 * with transparent, zero-downtime fallback to LocalRuleNLPProvider on timeout or network error.
 */
export class ResilientAIProvider implements IAIProvider {
  readonly name: string;

  constructor(
    private readonly primary: IAIProvider,
    private readonly fallback: IAIProvider = new LocalRuleNLPProvider()
  ) {
    this.name = primary.name;
  }

  isAvailable(): boolean {
    return this.primary.isAvailable() || this.fallback.isAvailable();
  }

  async extractIntent(request: AIIntentRequest): Promise<AIIntentResult> {
    if (this.primary.isAvailable()) {
      try {
        return await this.primary.extractIntent(request);
      } catch (err: any) {
        console.warn(`[ResilientAIProvider] Primary provider ${this.primary.name} failed (${err.message}). Falling back to ${this.fallback.name}.`);
      }
    }

    return this.fallback.extractIntent(request);
  }

  async discoverSolutions(request: AIDiscoveryRequest): Promise<AIDiscoveryResult> {
    if (this.primary.isAvailable() && typeof this.primary.discoverSolutions === 'function') {
      try {
        return await this.primary.discoverSolutions(request);
      } catch (err: any) {
        console.warn(`[ResilientAIProvider] Primary provider ${this.primary.name} discoverSolutions failed (${err.message}). Falling back to ${this.fallback.name}.`);
      }
    }

    if (typeof this.fallback.discoverSolutions === 'function') {
      return this.fallback.discoverSolutions(request);
    }

    throw new Error('[ResilientAIProvider] Neither primary nor fallback supports discoverSolutions');
  }

  async extractPageCards(request: AIExtractCardsRequest): Promise<AIExtractedCardsResult> {
    if (this.primary.isAvailable() && typeof this.primary.extractPageCards === 'function') {
      try {
        return await this.primary.extractPageCards(request);
      } catch (err: any) {
        console.warn(`[ResilientAIProvider] Primary provider ${this.primary.name} extractPageCards failed (${err.message}). Falling back to ${this.fallback.name}.`);
      }
    }

    if (typeof this.fallback.extractPageCards === 'function') {
      return this.fallback.extractPageCards(request);
    }

    throw new Error('[ResilientAIProvider] Neither primary nor fallback supports extractPageCards');
  }
}

export class AIProviderFactory {
  static create(options?: AIProviderFactoryOptions): IAIProvider {
    const preferred = (options?.preferredProvider || process.env.AI_PROVIDER || 'local').toLowerCase().trim();
    const apiKey = options?.inceptionApiKey || process.env.INCEPTION_API_KEY;

    if ((preferred === 'inception' || preferred === 'mercury' || preferred === 'mercury-3') && apiKey) {
      const primary = new InceptionMercuryProvider({
        apiKey,
        baseUrl: options?.inceptionBaseUrl,
        modelName: options?.inceptionModel,
        timeoutMs: options?.timeoutMs,
      });
      return new ResilientAIProvider(primary, new LocalRuleNLPProvider());
    }

    return new LocalRuleNLPProvider();
  }
}
