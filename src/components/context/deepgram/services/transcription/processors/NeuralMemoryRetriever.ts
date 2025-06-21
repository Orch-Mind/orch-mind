// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import {
  NeuralProcessingResult,
  NeuralSignal,
} from "../../../interfaces/neural/NeuralSignalTypes";
import { SymbolicInsight } from "../../../types/SymbolicInsight";
import { LoggingUtils } from "../../../utils/LoggingUtils";
import symbolicCognitionTimelineLogger from "../../utils/SymbolicCognitionTimelineLoggerSingleton";

/**
 * Neural memory cognitive retrieval processor
 * Responsible for processing neural signals and retrieving relevant memories
 */
export class NeuralMemoryRetriever {
  constructor(private memoryService: IMemoryService) {}

  /**
   * Process neural signals and retrieve relevant memories based on selected backend
   */
  async processSignals(
    enrichedSignals: NeuralSignal[]
  ): Promise<NeuralProcessingResult[]> {
    LoggingUtils.logInfo(
      `⚡ Segunda fase - Processando ${enrichedSignals.length} áreas cerebrais ativadas...`
    );

    // Log neural signals for symbolic cognition tracking
    for (const signal of enrichedSignals) {
      symbolicCognitionTimelineLogger.logNeuralSignal(
        signal.core,
        {
          query: signal.symbolic_query?.query || "",
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
        LoggingUtils.logInfo(
          `→ Activating neural core: ${signal.core} (${(
            signal.intensity * 100
          ).toFixed(1)}%)`
        );

        const memoryResults = await this._retrieveMemoriesForSignal(signal);
        const insights = this._extractInsightsFromSignal(signal);

        // 🔍 DEBUG: Log detalhado dos resultados antes de passar para o timeline
        LoggingUtils.logInfo(
          `🔍 [MEMORY-DEBUG] === RESULTS FOR CORE: ${signal.core} ===`
        );
        LoggingUtils.logInfo(
          `📊 [MEMORY-DEBUG] Memory results: ${JSON.stringify({
            matchCount: memoryResults.matchCount,
            durationMs: memoryResults.durationMs,
            resultsLength: memoryResults.results.length,
            firstResult: memoryResults.results[0]?.substring(0, 50) + "...",
          })}`
        );
        LoggingUtils.logInfo(
          `🧠 [MEMORY-DEBUG] Insights extracted: ${JSON.stringify(insights)}`
        );

        // 🔧 CORREÇÃO: Symbolic retrieval logging com dados corretos
        // Converter insights para array de SymbolicInsight de forma mais robusta
        let insightsArray: SymbolicInsight[] = [];

        // 🔍 PRIORIDADE 1: Usar insights do signal se disponíveis
        if (
          Array.isArray(signal.symbolicInsights) &&
          signal.symbolicInsights.length > 0
        ) {
          insightsArray = signal.symbolicInsights.filter(
            (ins) => ins && typeof ins === "object"
          );
          LoggingUtils.logInfo(
            `🔍 [INSIGHTS-DEBUG] Using signal.symbolicInsights: ${insightsArray.length} insights`
          );
        }
        // 🔧 CORREÇÃO: Criar insights baseados APENAS nos resultados reais de memória
        // 🎯 PRIORIDADE 1: Insights originais do signal (se válidos)
        if (
          Array.isArray(signal.symbolicInsights) &&
          signal.symbolicInsights.length > 0
        ) {
          const validOriginalInsights = signal.symbolicInsights
            .filter((ins) => ins && ins.content && ins.content.trim())
            .map((ins, index) => ({
              id: ins.id || `original_${index}`,
              content: ins.content,
              score: ins.score || 0.6,
              type: ins.type || "original",
            }));
          insightsArray.push(...validOriginalInsights);
        }
        // 🔍 VERIFICAÇÃO: Garantir que matchCount reflete dados reais
        const actualMatchCount = memoryResults.matchCount; // ✅ Usar matchCount real do DuckDB
        const actualDuration = memoryResults.durationMs;

        // 🔍 DEBUG: Log antes de chamar o timeline logger
        LoggingUtils.logInfo(
          `📝 [TIMELINE-DEBUG] Calling logSymbolicRetrieval with: ${JSON.stringify(
            {
              core: signal.core,
              insightsCount: insightsArray.length,
              insightsPreview: insightsArray.slice(0, 2),
              matchCount: actualMatchCount,
              originalMatchCount: memoryResults.matchCount,
              durationMs: actualDuration,
            }
          )}`
        );

        // ✅ CORREÇÃO: Usar dados verificados e incluir keywords do signal
        // 🔧 CORREÇÃO: Adicionar keywords ao insight para manter consistência
        const enrichedInsights = insightsArray.map((insight) => ({
          ...insight,
          keywords: signal.keywords || [], // Adicionar keywords do signal original
        }));

        // 🔍 DEBUG: Log final antes de enviar para timeline
        LoggingUtils.logInfo(
          `🔍 [FINAL-TIMELINE-DEBUG] Final data being sent to timeline: ${JSON.stringify(
            {
              core: signal.core,
              enrichedInsightsCount: enrichedInsights.length,
              actualMatchCount,
              actualDuration,
              enrichedInsightsPreview: enrichedInsights.slice(0, 2),
            }
          )}`
        );

        symbolicCognitionTimelineLogger.logSymbolicRetrieval(
          signal.core,
          enrichedInsights,
          actualMatchCount, // Usar contagem real dos resultados
          actualDuration
        );

        return {
          ...signal,
          pineconeResults: memoryResults.results,
          symbolicInsights: enrichedInsights, // ✅ Usar insights estruturados em vez de campos técnicos
        };
      })
    );

    // Transform to standard neural processing format
    return this._transformToNeuralProcessingResults(processedSignals);
  }

  /**
   * Retrieve memories for a specific neural signal
   */
  private async _retrieveMemoriesForSignal(signal: NeuralSignal): Promise<{
    results: string[];
    matchCount: number;
    durationMs: number;
  }> {
    let results: string[] = [];
    let matchCount = 0;
    const start = Date.now();

    try {
      // 🔧 CORREÇÃO: Usar queryMemoryWithCount para obter contagem real
      const memoryResult = await this._retrieveWithMemoryServiceAndCount(
        signal
      );
      results = memoryResult.results;
      matchCount = memoryResult.matchCount;

      // 🔍 DEBUG: Log detalhado da recuperação de memórias
      LoggingUtils.logInfo(
        `🔍 [MEMORY-RETRIEVAL-DEBUG] Core: ${signal.core} | Results: ${
          results.length
        } | MatchCount: ${matchCount} | First result preview: ${results[0]?.substring(
          0,
          100
        )}...`
      );
    } catch (memoryError) {
      LoggingUtils.logError(
        `Error searching memories for core ${signal.core}`,
        memoryError
      );
      // Garantir que em caso de erro, os valores sejam consistentes
      results = [];
      matchCount = 0;
    }

    const durationMs = Date.now() - start;

    LoggingUtils.logInfo(
      `🔍 [MEMORY-FINAL-DEBUG] Core: ${signal.core} | Final matchCount: ${matchCount} | Results length: ${results.length} | Duration: ${durationMs}ms`
    );

    return { results, matchCount, durationMs };
  }

  /**
   * Retrieve memories using standard memory service
   */
  private async _retrieveWithMemoryService(
    signal: NeuralSignal
  ): Promise<string[]> {
    const query = signal.symbolic_query?.query || "";
    LoggingUtils.logInfo(
      `🧠 [NEURAL-MEMORY] Querying: "${query}" for core: ${signal.core}`
    );
    LoggingUtils.logInfo(
      `🔍 [NEURAL-MEMORY] Keywords: [${
        Array.isArray(signal.keywords) ? signal.keywords.join(", ") : "none"
      }], topK: ${signal.topK || "default"}`
    );

    const result = await this.memoryService.queryExpandedMemory(
      query,
      signal.keywords,
      signal.topK,
      signal.filters
    );

    if (result && result.trim()) {
      const resultArray = Array.isArray(result) ? result : [result];
      LoggingUtils.logInfo(
        `✅ [NEURAL-MEMORY] Found ${resultArray.length} memory results for core: ${signal.core}`
      );
      return resultArray;
    } else {
      LoggingUtils.logWarning(
        `❌ [NEURAL-MEMORY] No memories found for core: ${signal.core} with query: "${query}"`
      );
      return [];
    }
  }

  /**
   * Retrieve memories with accurate match count from DuckDB
   */
  private async _retrieveWithMemoryServiceAndCount(
    signal: NeuralSignal
  ): Promise<{ results: string[]; matchCount: number }> {
    const query = signal.symbolic_query?.query || "";

    try {
      // 🔧 CORREÇÃO: Consultar DuckDB diretamente para obter contagem real
      if (!window.electronAPI?.queryDuckDB) {
        LoggingUtils.logWarning(
          "[NEURAL-MEMORY] DuckDB not available, using fallback"
        );
        const fallbackResults = await this._retrieveWithMemoryService(signal);
        return { results: fallbackResults, matchCount: fallbackResults.length };
      }

      // Criar embedding para a query
      const embeddingService = (this.memoryService as any).embeddingService;
      if (!embeddingService?.isInitialized()) {
        LoggingUtils.logWarning(
          "[NEURAL-MEMORY] Embedding service not initialized"
        );
        const fallbackResults = await this._retrieveWithMemoryService(signal);
        return { results: fallbackResults, matchCount: fallbackResults.length };
      }

      const queryEmbedding = await embeddingService.createEmbedding(query);
      if (!queryEmbedding || queryEmbedding.length === 0) {
        LoggingUtils.logWarning("[NEURAL-MEMORY] Failed to create embedding");
        return { results: [], matchCount: 0 };
      }

      // Consultar DuckDB diretamente
      LoggingUtils.logInfo(
        `🧠 [NEURAL-MEMORY-DIRECT] Querying DuckDB directly for: "${query}"`
      );

      const queryResponse = await window.electronAPI.queryDuckDB(
        queryEmbedding,
        signal.topK || 10,
        signal.keywords || [],
        signal.filters || {}
      );

      // Extrair resultados e contagem real
      const matches = queryResponse.matches || [];

      // 🔍 DEBUG: Log detalhado dos matches
      LoggingUtils.logInfo(
        `🔍 [NEURAL-MEMORY-DEBUG] Raw matches from DuckDB: ${JSON.stringify(
          matches.map((match: any, index: number) => ({
            index,
            hasMetadata: !!match.metadata,
            hasContent: !!(match.metadata && match.metadata.content),
            contentLength: match.metadata?.content?.length || 0,
            contentPreview: match.metadata?.content?.substring(0, 50) || "N/A",
          }))
        )}`
      );

      const validMatches = matches.filter(
        (match: any) => match.metadata && match.metadata.content
      );
      const results = validMatches.map(
        (match: any) => match.metadata.content as string
      );

      const matchCount = validMatches.length; // ✅ Contagem dos matches válidos após filtro

      LoggingUtils.logInfo(
        `✅ [NEURAL-MEMORY-DIRECT] Core: ${signal.core} | DuckDB returned ${matches.length} raw matches | Filtered to ${matchCount} valid matches | Extracted ${results.length} results`
      );

      // 🔍 DEBUG: Log final dos resultados
      LoggingUtils.logInfo(
        `🔍 [NEURAL-MEMORY-FINAL] Final results: ${JSON.stringify({
          matchCount,
          resultsLength: results.length,
          resultsPreview: results.map(
            (r, i) => `${i}: ${r.substring(0, 100)}...`
          ),
        })}`
      );

      return { results, matchCount };
    } catch (error) {
      LoggingUtils.logError(
        `[NEURAL-MEMORY-DIRECT] Error querying DuckDB directly for core ${signal.core}`,
        error
      );
      // Fallback para método original
      const fallbackResults = await this._retrieveWithMemoryService(signal);
      return { results: fallbackResults, matchCount: fallbackResults.length };
    }
  }

  /**
   * Extract and normalize insights from neural signal following Orch-OS theory
   */
  private _extractInsightsFromSignal(
    signal: NeuralSignal
  ): Record<string, unknown> {
    let insights: Record<string, unknown> = {};

    // 🎭 ORCH-OS: Mapear cores para arquétipos junguianos
    const coreArchetypes: Record<
      string,
      { archetype: string; essence: string }
    > = {
      "valência emocional": {
        archetype: "The Mirror",
        essence: "emotional reflection and inner truth",
      },
      "intensidade emocional": {
        archetype: "The Warrior",
        essence: "emotional strength and resilience",
      },
      "conexões interacionais": {
        archetype: "The Lover",
        essence: "bonds and relational harmony",
      },
      "estado emocional": {
        archetype: "The Wanderer",
        essence: "emotional journey and discovery",
      },
      memory: {
        archetype: "The Sage",
        essence: "wisdom and accumulated knowledge",
      },
      metacognitive: {
        archetype: "The Seeker",
        essence: "self-awareness and introspection",
      },
      shadow: {
        archetype: "The Shadow",
        essence: "hidden aspects and inner conflicts",
      },
      soul: { archetype: "The Hero", essence: "purpose and transcendence" },
      self: {
        archetype: "The Pioneer",
        essence: "identity and authentic expression",
      },
    };

    // 🔮 ORCH-OS: Detectar propriedades emergentes baseadas na intensidade e contexto
    const emergentProperties: string[] = [];

    if (signal.intensity > 0.8) {
      emergentProperties.push("High symbolic resonance");
    }
    if (signal.intensity < 0.3) {
      emergentProperties.push("Low response diversity");
    }
    if (
      signal.keywords &&
      Array.isArray(signal.keywords) &&
      signal.keywords.length > 3
    ) {
      emergentProperties.push("Cognitive dissonance");
    }

    // 🎯 ORCH-OS: Criar insights simbólicos baseados na teoria
    const coreInfo = coreArchetypes[signal.core] || {
      archetype: "The Unknown",
      essence: "unexplored symbolic territory",
    };

    insights = {
      // Query simbólica (se disponível)
      ...(signal.symbolic_query?.query && {
        symbolic_query: {
          query: signal.symbolic_query.query,
          symbolic_tension: "meaning collapse in progress",
        },
      }),

      // Keywords como fragmentos simbólicos
      ...(signal.keywords &&
        Array.isArray(signal.keywords) &&
        signal.keywords.length > 0 && {
          symbolic_fragments: signal.keywords.map((keyword) => ({
            fragment: keyword,
            resonance: "active",
          })),
        }),
    };

    return insights;
  }

  /**
   * Transform processed signals to standard neural processing results format
   */
  private _transformToNeuralProcessingResults(
    processedSignals: any[]
  ): NeuralProcessingResult[] {
    return processedSignals.map((signal) => ({
      core: signal.core,
      intensity: signal.intensity,
      output: signal.pineconeResults.join("\n"),
      insights: Array.isArray(signal.symbolicInsights)
        ? signal.symbolicInsights.reduce(
            (acc: Record<string, unknown>, ins: SymbolicInsight) => {
              if (ins && typeof ins.type === "string") {
                acc[ins.type] = ins;
              }
              return acc;
            },
            {}
          )
        : typeof signal.symbolicInsights === "object" &&
          signal.symbolicInsights !== null
        ? signal.symbolicInsights
        : {},
    }));
  }
}
