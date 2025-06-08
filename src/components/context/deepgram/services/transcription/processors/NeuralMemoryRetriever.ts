// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IMemoryService } from '../../../interfaces/memory/IMemoryService';
import { NeuralProcessingResult, NeuralSignal } from '../../../interfaces/neural/NeuralSignalTypes';
import { SymbolicInsight } from '../../../types/SymbolicInsight';
import { LoggingUtils } from '../../../utils/LoggingUtils';
import symbolicCognitionTimelineLogger from '../../utils/SymbolicCognitionTimelineLoggerSingleton';
import { ProcessorMode } from './NeuralSignalEnricher';

// HuggingFace service interface (for dependency inversion)
interface IHuggingFaceService {
  queryMemory(query: string, keywords?: string[], topK?: number, filters?: any): Promise<string[]>;
}

/**
 * Neural memory cognitive retrieval processor
 * Responsible for processing neural signals and retrieving relevant memories
 */
export class NeuralMemoryRetriever {
  constructor(
    private memoryService: IMemoryService
  ) {}

  /**
   * Process neural signals and retrieve relevant memories based on selected backend
   */
  async processSignals(enrichedSignals: NeuralSignal[], mode: ProcessorMode): Promise<NeuralProcessingResult[]> {
    LoggingUtils.logInfo(`⚡ Segunda fase - Processando ${enrichedSignals.length} áreas cerebrais ativadas...`);

    // Log neural signals for symbolic cognition tracking
    for (const signal of enrichedSignals) {
      symbolicCognitionTimelineLogger.logNeuralSignal(
        signal.core,
        {
          query: signal.symbolic_query?.query || '',
          keywords: signal.keywords ?? [],
          filters: signal.filters ?? {},
        },
        signal.intensity,
        signal.topK || 10,
        {}
      );
    }

    const processedSignals = await Promise.all(
      enrichedSignals.map(async (signal) => {
        LoggingUtils.logInfo(`→ Activating neural core: ${signal.core} (${(signal.intensity * 100).toFixed(1)}%)`);
        
        const memoryResults = await this._retrieveMemoriesForSignal(signal, mode);
        const insights = this._extractInsightsFromSignal(signal);

        // Symbolic retrieval logging
        const insightsArray: SymbolicInsight[] = Object.values(insights) as SymbolicInsight[];
        symbolicCognitionTimelineLogger.logSymbolicRetrieval(
          signal.core,
          insightsArray,
          memoryResults.matchCount,
          memoryResults.durationMs
        );

        return {
          ...signal,
          pineconeResults: memoryResults.results,
          insights
        };
      })
    );

    // Transform to standard neural processing format
    return this._transformToNeuralProcessingResults(processedSignals);
  }

  /**
   * Retrieve memories for a specific neural signal
   */
  private async _retrieveMemoriesForSignal(signal: NeuralSignal, mode: ProcessorMode): Promise<{
    results: string[];
    matchCount: number;
    durationMs: number;
  }> {
    let results: string[] = [];
    let matchCount = 0;
    const start = Date.now();

    try {
      results = await this._retrieveWithMemoryService(signal);
      matchCount = results.length;
    } catch (memoryError) {
      LoggingUtils.logError(`Error searching memories for core ${signal.core} with ${mode}`, memoryError);
    }

    const durationMs = Date.now() - start;
    return { results, matchCount, durationMs };
  }

  /**
   * Retrieve memories using standard memory service
   */
  private async _retrieveWithMemoryService(signal: NeuralSignal): Promise<string[]> {
    const result = await this.memoryService.queryExpandedMemory(
      signal.symbolic_query?.query || '',
      signal.keywords,
      signal.topK,
      signal.filters,
    );
    
    if (result) {
      return Array.isArray(result) ? result : [result];
    }
    return [];
  }

  /**
   * Extract and normalize insights from neural signal
   */
  private _extractInsightsFromSignal(signal: NeuralSignal): Record<string, unknown> {
    let insights: Record<string, unknown> = {};
    
    if (Array.isArray(signal.symbolicInsights)) {
      insights = signal.symbolicInsights.reduce((acc: Record<string, unknown>, ins: SymbolicInsight) => {
        if (ins && typeof ins.type === 'string') {
          acc[ins.type] = ins;
        }
        return acc;
      }, {});
    } else if (typeof signal.symbolicInsights === 'object' && signal.symbolicInsights !== null) {
      insights = signal.symbolicInsights;
    }
    
    return insights;
  }

  /**
   * Transform processed signals to standard neural processing results format
   */
  private _transformToNeuralProcessingResults(processedSignals: any[]): NeuralProcessingResult[] {
    return processedSignals.map(signal => ({
      core: signal.core,
      intensity: signal.intensity,
      output: signal.pineconeResults.join("\n"),
      insights: Array.isArray(signal.symbolicInsights)
        ? signal.symbolicInsights.reduce((acc: Record<string, unknown>, ins: SymbolicInsight) => {
          if (ins && typeof ins.type === 'string') {
            acc[ins.type] = ins;
          }
          return acc;
        }, {})
        : (typeof signal.symbolicInsights === 'object' && signal.symbolicInsights !== null ? signal.symbolicInsights : {})
    }));
  }
} 