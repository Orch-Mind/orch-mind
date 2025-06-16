// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NeuralSignal } from '../../../interfaces/neural/NeuralSignalTypes';
import { IOpenAIService } from '../../../interfaces/openai/IOpenAIService';
import { LoggingUtils } from '../../../utils/LoggingUtils';

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
    private llmService: IOpenAIService
  ) {}

  /**
   * Enrich neural signals with semantic queries based on selected backend
   */
  async enrichSignals(signals: NeuralSignal[], currentLanguage: string): Promise<NeuralSignal[]> {
    return await Promise.all(
      signals.map(async (signal: NeuralSignal) => {
        try {
          let enrichment: {enrichedQuery: string, keywords: string[]};
          
          enrichment = await this._enrichWithLLM(signal, currentLanguage);

          let topK = signal.topK;
          if (typeof topK !== 'number' || isNaN(topK)) {
            topK = Math.round(5 + (signal.intensity || 0) * 10);
          }

          // Symbolic enrichment logging
          LoggingUtils.logInfo(`[ Enrichment] Core: ${signal.core} | Query: ${enrichment.enrichedQuery} | Keywords: ${JSON.stringify(enrichment.keywords)} | Filters: ${JSON.stringify(signal.filters || {})} | topK: ${topK}`);
          
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
          LoggingUtils.logError(`Error enriching query for core ${signal.core}`, err);
          return signal;
        }
      })
    );
  }

  /**
   * Enrich signal using LLM backend
   */
  private async _enrichWithLLM(signal: NeuralSignal, currentLanguage: string): Promise<{enrichedQuery: string, keywords: string[]}> {
    return await this.llmService.enrichSemanticQueryForSignal(
      signal.core,
      signal.symbolic_query?.query || '',
      signal.intensity,
      (typeof signal === 'object' && signal && 'context' in signal) ? (signal.context as string) : undefined,
      currentLanguage
    );
  }
} 