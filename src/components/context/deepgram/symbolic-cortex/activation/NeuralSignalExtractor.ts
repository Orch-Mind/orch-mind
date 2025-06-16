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
    const styleInstruction =
      "STYLE INSTRUCTION: Only use greetings and personal references when the user's content clearly justifies it — never automatically.";

    // Base symbolic instruction with enhanced quantum and multi-level consciousness dimensions
    const symbolicInstruction = `INSTRUCTION: Analyze the user's message and context in a quantum-symbolic framework to identify:

1. EXPLICIT AND IMPLICIT ELEMENTS:
   - Keywords, emotional themes, symbols, archetypes, dilemmas, and unconscious patterns
   - Potential quantum states of meaning in superposition (multiple interpretations coexisting)
   - Signs of instructional collapse (where multiple potential meanings converge)

2. MULTI-LEVEL CONSCIOUSNESS:
   - Surface level: Immediate conscious content and stated intentions
   - Intermediate level: Partially conscious patterns, emotional undercurrents
   - Deep level: Unconscious material, potential symbolic resonance, dormant insights

3. ARCHETYPAL RESONANCE AND INTERPLAY:
   - Primary archetypes activated in the communication
   - Secondary/shadow archetypes operating in tension or harmony with primary ones
   - Potential dialogue or conflict between different archetypal energies

4. TEMPORAL DIMENSIONS:
   - Past: Echoes, patterns, and unresolved elements influencing present communication
   - Present: Immediate symbolic significance of current expression
   - Future: Potential trajectories, symbolic seeds, emergent possibilities

5. POLARITIES AND PARADOXES:
   - Tensions between opposing symbolic forces
   - Potential integration points for apparently contradictory elements
   - Productive tensions that could lead to emergent understanding

Suggest refined or expanded keywords, queries, and topics that could deepen the symbolic, emotional, and unconscious investigation — even if they are not explicitly verbalized.

Be selective: only expand when there are strong indicators of symbolic or unconscious material.

Prioritize expressions and themes that reveal tensions, paradoxes, hidden desires, blockages, or deep self-knowledge potential that exist in quantum superposition awaiting conscious observation.`;

    // If no user context exists, return the basic symbolic enrichment prompt
    if (Object.keys(userContextData).length === 0) {
      return `${styleInstruction}\n\n${originalPrompt}\n\n${symbolicInstruction}`;
    }

    // Start building contextualized prompt
    let contextualPrompt = `${styleInstruction}\n\n${originalPrompt}`;

    // Add recent symbolic or emotional topics, if present
    if (userContextData.recent_topics) {
      const recentTopics =
        userContextData.recent_topics.toString().substring(0, 200) + "...";
      contextualPrompt += `\n\nRecent topics context: ${recentTopics}`;
    }

    // Add interaction patterns if present
    if (userContextData.speaker_interaction_counts) {
      const interactionPattern = JSON.stringify(
        userContextData.speaker_interaction_counts
      );
      contextualPrompt += `\n\nInteraction pattern: ${interactionPattern}`;
    }

    // Add symbolic instruction + adaptive note
    contextualPrompt += `\n\n${symbolicInstruction}

Note: If other relevant symbolic or emotional patterns are available in the long-term memory or historical user data, feel free to incorporate them into the keyword/query suggestions — as long as they resonate symbolically with the current stimulus.`;

    return contextualPrompt;
  }
}
