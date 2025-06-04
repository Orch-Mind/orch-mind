import { NeuralSignal } from '../../../interfaces/neural/NeuralSignalTypes';
import { IOpenAIService } from '../../../interfaces/openai/IOpenAIService';
import { LoggingUtils } from '../../../utils/LoggingUtils';

// HuggingFace service interface (for dependency inversion)
interface IHuggingFaceService {
  enrichSemanticQueryForSignal(core: string, query: string, intensity: number, context?: string, language?: string): Promise<{enrichedQuery: string, keywords: string[]}>;
}

/**
 * Processor mode: OpenAI or HuggingFace
 */
export type ProcessorMode = 'openai' | 'huggingface';

/**
 * Neural signal semantic enrichment processor
 * Responsible for enhancing neural signals with semantic queries and context
 */
export class NeuralSignalEnricher {
  constructor(
    private openAIService: IOpenAIService,
    private huggingFaceService?: IHuggingFaceService
  ) {}

  /**
   * Enrich neural signals with semantic queries based on selected backend
   */
  async enrichSignals(signals: NeuralSignal[], mode: ProcessorMode, currentLanguage: string): Promise<NeuralSignal[]> {
    return await Promise.all(
      signals.map(async (signal: NeuralSignal) => {
        try {
          let enrichment: {enrichedQuery: string, keywords: string[]};
          
          if (mode === 'huggingface') {
            enrichment = await this._enrichWithHuggingFace(signal, currentLanguage);
          } else {
            enrichment = await this._enrichWithOpenAI(signal, currentLanguage);
          }

          let topK = signal.topK;
          if (typeof topK !== 'number' || isNaN(topK)) {
            topK = Math.round(5 + (signal.intensity || 0) * 10);
          }

          // Symbolic enrichment logging
          LoggingUtils.logInfo(`[${mode.toUpperCase()} Enrichment] Core: ${signal.core} | Query: ${enrichment.enrichedQuery} | Keywords: ${JSON.stringify(enrichment.keywords)} | Filters: ${JSON.stringify(signal.filters || {})} | topK: ${topK}`);
          
          return {
            ...signal,
            symbolic_query: {
              ...signal.symbolic_query,
              query: enrichment.enrichedQuery
            },
            keywords: enrichment.keywords,
            filters: signal.filters || undefined,
            topK
          };
        } catch (err) {
          LoggingUtils.logError(`Error enriching query for core ${signal.core} with ${mode}`, err);
          return signal;
        }
      })
    );
  }

  /**
   * Enrich signal using HuggingFace backend
   */
  private async _enrichWithHuggingFace(signal: NeuralSignal, currentLanguage: string): Promise<{enrichedQuery: string, keywords: string[]}> {
    if (this.huggingFaceService) {
      return await this.huggingFaceService.enrichSemanticQueryForSignal(
        signal.core,
        signal.symbolic_query?.query || '',
        signal.intensity,
        (typeof signal === 'object' && signal && 'context' in signal) ? (signal.context as string) : undefined,
        currentLanguage
      );
    } else {
      // Fallback: basic enrichment without external service
      LoggingUtils.logInfo("HuggingFace service not available - using basic enrichment");
      return {
        enrichedQuery: signal.symbolic_query?.query || signal.core,
        keywords: [signal.core]
      };
    }
  }

  /**
   * Enrich signal using OpenAI backend
   */
  private async _enrichWithOpenAI(signal: NeuralSignal, currentLanguage: string): Promise<{enrichedQuery: string, keywords: string[]}> {
    return await this.openAIService.enrichSemanticQueryForSignal(
      signal.core,
      signal.symbolic_query?.query || '',
      signal.intensity,
      (typeof signal === 'object' && signal && 'context' in signal) ? (signal.context as string) : undefined,
      currentLanguage
    );
  }
} 