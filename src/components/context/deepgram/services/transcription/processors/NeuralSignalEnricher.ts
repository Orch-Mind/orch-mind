// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NeuralSignal } from "../../../interfaces/neural/NeuralSignalTypes";
import { IOpenAIService } from "../../../interfaces/openai/IOpenAIService";
import { LoggingUtils } from "../../../utils/LoggingUtils";

/**
 * Processor mode: OpenAI or HuggingFace
 */
export type ProcessorMode = "openai" | "huggingface";

/**
 * Neural signal semantic enrichment processor
 * Responsible for enhancing neural signals with semantic queries and context
 */
export class NeuralSignalEnricher {
  constructor(private llmService: IOpenAIService) {}

  /**
   * Enrich neural signals with semantic queries using batch processing
   */
  async enrichSignals(
    signals: NeuralSignal[],
    currentLanguage: string
  ): Promise<NeuralSignal[]> {
    if (signals.length === 0) {
      return [];
    }

    try {
      // Prepare batch data
      const batchData = signals.map((signal) => ({
        core: signal.core,
        query: signal.symbolic_query?.query || "",
        intensity: signal.intensity,
        context:
          typeof signal === "object" && signal && "context" in signal
            ? (signal.context as string)
            : undefined,
      }));

      LoggingUtils.logInfo(
        `[Batch Enrichment] Processing ${signals.length} signals in a single batch`
      );

      // Execute batch enrichment
      const enrichments = await this.llmService.enrichSemanticQuery(
        batchData,
        currentLanguage
      );

      // Map enrichments back to signals
      return signals.map((signal, index) => {
        const enrichment = enrichments[index] || {
          enrichedQuery: signal.symbolic_query?.query || "",
          keywords: [],
        };

        let topK = signal.topK;
        if (typeof topK !== "number" || isNaN(topK)) {
          topK = Math.round(5 + (signal.intensity || 0) * 10);
        }

        // Symbolic enrichment logging
        LoggingUtils.logInfo(
          `[Batch Enrichment] Core: ${signal.core} | Query: ${
            enrichment.enrichedQuery
          } | Keywords: ${JSON.stringify(
            enrichment.keywords
          )} | Filters: ${JSON.stringify(signal.filters || {})} | topK: ${topK}`
        );

        return {
          ...signal,
          symbolic_query: {
            ...signal.symbolic_query,
            query: enrichment.enrichedQuery,
          },
          keywords: enrichment.keywords,
          filters: signal.filters || undefined,
          topK,
        };
      });
    } catch (error) {
      LoggingUtils.logError("Batch enrichment failed", error);
      // Return signals with original queries as fallback
      return signals.map((signal) => ({
        ...signal,
        topK: signal.topK || Math.round(5 + (signal.intensity || 0) * 10),
      }));
    }
  }
}
