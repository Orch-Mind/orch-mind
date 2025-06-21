// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// NeuralSignalExtractor.ts
// Module responsible for extracting symbolic neural signals from the transcription context

import { NeuralSignalResponse } from "../../interfaces/neural/NeuralSignalTypes";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import {
  INeuralSignalExtractor,
  NeuralExtractionConfig,
} from "../interfaces/INeuralSignalExtractor";

/**
 * Class responsible for extracting symbolic neural signals from the transcription context
 * This is the first impulse of an artificial symbolic mind
 * Automatically selects between Ollama (advanced mode) and HuggingFace (basic mode) services
 */
export class NeuralSignalExtractor implements INeuralSignalExtractor {
  private readonly aiService: IOpenAIService;

  /**
   * Constructor
   * @param aiService AI service for communication with the language model (OpenAI or HuggingFace facade)
   */
  constructor(aiService: IOpenAIService) {
    this.aiService = aiService;
  }

  /**
   * Extracts symbolic neural signals from the current context
   * This is the first impulse of an artificial symbolic mind
   * @param config Configuration containing the current context
   * @returns Array of neural signals representing the activation of the symbolic brain
   */
  public async extractNeuralSignals(
    config: NeuralExtractionConfig
  ): Promise<NeuralSignalResponse> {
    try {
      // The config should already have transcription and userContextData ready!
      const {
        transcription,
        temporaryContext,
        userContextData = {},
        sessionState = {},
      } = config;

      // Determine language from session state
      const language =
        sessionState &&
        typeof sessionState === "object" &&
        "language" in sessionState
          ? (sessionState.language as string)
          : undefined;

      LoggingUtils.logInfo(
        "🧠 [NeuralSignalExtractor] Starting neural signal extraction..."
      );
      LoggingUtils.logInfo(
        `🧠 [NeuralSignalExtractor] Config: ${JSON.stringify({
          transcriptionLength: transcription.length,
          transcriptionPreview: transcription.substring(0, 100) + "...",
          hasTemporaryContext: !!temporaryContext,
          temporaryContextLength: temporaryContext?.length || 0,
          userContextDataKeys: Object.keys(userContextData),
          language,
          aiServiceType: this.aiService.constructor.name,
          aiServiceInitialized: this.aiService.isInitialized?.() ?? "unknown",
        })}`
      );

      // Prepare an enriched prompt with all available contextual data
      const enrichedPrompt = this.prepareEnrichedPrompt(
        transcription,
        userContextData
      );

      LoggingUtils.logInfo(
        `🧠 [NeuralSignalExtractor] Enriched prompt prepared: ${JSON.stringify({
          enrichedPromptLength: enrichedPrompt.length,
          enrichedPromptPreview: enrichedPrompt.substring(0, 200) + "...",
        })}`
      );

      // Verify AI service availability before proceeding
      if (this.aiService.ensureOpenAIClient) {
        const isReady = await this.aiService.ensureOpenAIClient();
        if (!isReady) {
          LoggingUtils.logError(
            "🧠 [NeuralSignalExtractor] AI service is not ready. Using fallback signals."
          );
          return this.generateFallbackSignals(transcription);
        }
      }

      LoggingUtils.logInfo(
        "🧠 [NeuralSignalExtractor] Calling generateNeuralSignal..."
      );

      // Generate neural signals adapted for memory queries (works with both Pinecone and DuckDB)
      const neuralResponse = await this.aiService.generateNeuralSignal(
        enrichedPrompt, // Enriched stimulus with user context
        temporaryContext,
        language // Pass language from session state
      );

      LoggingUtils.logInfo(
        `🧠 [NeuralSignalExtractor] Neural response received: ${JSON.stringify({
          hasSignals: !!neuralResponse.signals,
          signalsLength: neuralResponse.signals?.length || 0,
          signalsPreview:
            neuralResponse.signals?.map((s) => ({
              core: s?.core,
              intensity: s?.intensity,
              hasQuery: !!s?.symbolic_query?.query,
            })) || [],
        })}`
      );

      // Verify if the response contains valid signals
      if (!neuralResponse.signals || neuralResponse.signals.length === 0) {
        LoggingUtils.logWarning(
          "🧠 [NeuralSignalExtractor] No neural signals were generated. Using default signals."
        );

        return this.generateFallbackSignals(transcription);
      }

      // DEBUG: Log raw signals before validation
      LoggingUtils.logInfo(
        `🧠 [NeuralSignalExtractor] Raw signals before validation: ${JSON.stringify(
          neuralResponse.signals.map((s) => ({
            core: s?.core,
            intensity: s?.intensity,
            hasQuery: !!s?.symbolic_query?.query,
            hasSymbolicInsights: !!s?.symbolicInsights,
            queryLength: s?.symbolic_query?.query?.length || 0,
          }))
        )}`
      );

      // ENHANCED VALIDATION: More flexible validation for debugging
      const validSignals = neuralResponse.signals.filter((signal) => {
        const isValid =
          signal &&
          signal.core &&
          typeof signal.intensity === "number" &&
          signal.intensity >= 0 &&
          signal.intensity <= 1;

        if (!isValid) {
          LoggingUtils.logWarning(
            `🧠 [NeuralSignalExtractor] Invalid signal filtered out: ${JSON.stringify(
              signal
            )}`
          );
        }

        return isValid;
      });

      if (validSignals.length === 0) {
        LoggingUtils.logWarning(
          "🧠 [NeuralSignalExtractor] All signals were invalid after validation. Using fallback signals."
        );
        return this.generateFallbackSignals(transcription);
      }

      LoggingUtils.logInfo(
        `✅ [NeuralSignalExtractor] Successfully validated ${validSignals.length} neural signals`
      );

      return { signals: validSignals };
    } catch (error) {
      // In case of error, log and provide a fallback response
      LoggingUtils.logError(
        "🧠 [NeuralSignalExtractor] Error extracting neural signals",
        error as Error
      );

      return this.generateFallbackSignals(config.transcription);
    }
  }

  /**
   * Generates fallback neural signals when the main extraction fails
   * @param transcription The original transcription text
   * @returns Fallback neural signal response
   */
  private generateFallbackSignals(transcription: string): NeuralSignalResponse {
    LoggingUtils.logInfo(
      "🧠 [NeuralSignalExtractor] Generating fallback neural signals..."
    );

    return {
      signals: [
        {
          core: "memory",
          intensity: 0.8,
          symbolic_query: {
            query: `memories related to: ${transcription.substring(0, 100)}`,
          },
          symbolicInsights: {
            recall_type: "semantic",
            temporal: "recent",
            importance: "high",
          },
        },
        {
          core: "metacognitive",
          intensity: 0.7,
          symbolic_query: {
            query: `reflection on: ${transcription.substring(0, 100)}`,
          },
          symbolicInsights: {
            thought: "Processing cognitive stimulus",
            state: "conscious",
          },
        },
        {
          core: "valence",
          intensity: 0.6,
          symbolic_query: {
            query: `emotions about: ${transcription.substring(0, 100)}`,
          },
          symbolicInsights: {
            emotion: "neutral",
            intensity: "moderate",
          },
        },
      ],
    };
  }

  /**
   * Prepares an enriched prompt with full user context.
   * @param originalPrompt The user's original prompt
   * @param userContextData Contextual data related to the user
   * @returns A contextually enriched symbolic/psychoanalytic prompt
   */
  private prepareEnrichedPrompt(
    originalPrompt: string,
    userContextData: Record<string, unknown>
  ): string {
    const styleGuide =
      "STYLE: Use greetings only when contextually appropriate.";

    // Refactored: More concise and focused symbolic instruction
    const symbolicAnalysis = `ANALYSIS FRAMEWORK: Extract multi-layered meaning from the user's message.

DETECT:
• Explicit content + implicit patterns (emotions, symbols, archetypes)
• Multiple interpretations coexisting (quantum superposition of meanings)
• Consciousness levels: surface → intermediate → unconscious
• Temporal echoes: past patterns → present expression → future potential
• Tensions and paradoxes that reveal deeper insights

GENERATE:
• Keywords and queries that explore symbolic/emotional dimensions
• Focus on: conflicts, desires, patterns, transformative potential
• Only expand when detecting rich symbolic material

OUTPUT: Refined keywords and queries for deeper exploration.`;

    // Build the complete prompt
    let enrichedPrompt = `${styleGuide}\n\nUSER MESSAGE: ${originalPrompt}`;

    // Add context if available (more concise)
    if (Object.keys(userContextData).length > 0) {
      if (userContextData.recent_topics) {
        enrichedPrompt += `\nCONTEXT: ${userContextData.recent_topics
          .toString()
          .substring(0, 150)}...`;
      }
      if (userContextData.speaker_interaction_counts) {
        enrichedPrompt += `\nPATTERN: ${JSON.stringify(
          userContextData.speaker_interaction_counts
        )}`;
      }
    }

    enrichedPrompt += `\n\n${symbolicAnalysis}`;

    return enrichedPrompt;
  }
}
