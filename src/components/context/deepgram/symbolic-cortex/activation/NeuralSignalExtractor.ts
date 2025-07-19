// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// NeuralSignalExtractor.ts
// Module responsible for extracting symbolic neural signals from the transcription context

import {
  NeuralSignal,
  NeuralSignalResponse,
} from "../../interfaces/neural/NeuralSignalTypes";
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
        userContextData,
        language
      );

      LoggingUtils.logInfo(
        `🧠 [NeuralSignalExtractor] Enriched prompt prepared: ${JSON.stringify({
          enrichedPromptLength: enrichedPrompt.length,
          enrichedPromptPreview: enrichedPrompt.substring(0, 200) + "...",
          language: language || "not specified",
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

      // Natural cognitive limits - be more selective
      let finalSignals = validSignals;

      // Filter out very weak signals (intensity < 0.4)
      const MIN_INTENSITY_THRESHOLD = 0.4;

      console.log(`🧠 [NeuralSignalExtractor] 📊 INTENSITY FILTERING:`);
      validSignals.forEach((signal, idx) => {
        const status =
          signal.intensity >= MIN_INTENSITY_THRESHOLD ? "✅ KEEP" : "❌ FILTER";
        console.log(
          `🧠 [NeuralSignalExtractor]   ${idx + 1}. [${
            signal.core
          }] intensity=${signal.intensity.toFixed(3)} - ${status}`
        );
      });

      finalSignals = finalSignals.filter(
        (s) => s.intensity >= MIN_INTENSITY_THRESHOLD
      );

      console.log(
        `🧠 [NeuralSignalExtractor] After intensity filter: ${finalSignals.length}/${validSignals.length} signals remaining`
      );

      if (finalSignals.length === 0 && validSignals.length > 0) {
        // If all signals are weak, keep the strongest 2
        console.log(
          `🧠 [NeuralSignalExtractor] ⚠️ All signals were too weak! Keeping strongest 2 signals as fallback`
        );
        finalSignals = validSignals
          .sort((a, b) => b.intensity - a.intensity)
          .slice(0, 2);
        finalSignals.forEach((signal, idx) => {
          console.log(
            `🧠 [NeuralSignalExtractor]   Fallback ${idx + 1}. [${
              signal.core
            }] intensity=${signal.intensity.toFixed(3)}`
          );
        });
      } else {
        // Always sort by intensity
        finalSignals.sort((a, b) => b.intensity - a.intensity);
      }

      // Apply strict limiting - maximum 3 cores for most cases
      const maxSignals = 3;

      if (finalSignals.length > maxSignals) {
        console.log(
          `🧠 [NeuralSignalExtractor] 📏 CORE LIMIT FILTERING (max ${maxSignals}):`
        );
        finalSignals.forEach((signal, idx) => {
          const status = idx < maxSignals ? "✅ KEEP" : "❌ LIMIT";
          console.log(
            `🧠 [NeuralSignalExtractor]   ${idx + 1}. [${
              signal.core
            }] intensity=${signal.intensity.toFixed(3)} - ${status}`
          );
        });

        LoggingUtils.logWarning(
          `⚠️ [NeuralSignalExtractor] Limiting to top ${maxSignals} signals (intensity threshold: ${MIN_INTENSITY_THRESHOLD}).`
        );
        finalSignals = finalSignals.slice(0, maxSignals);
      }

      LoggingUtils.logInfo(
        `✅ [NeuralSignalExtractor] Signal filtering summary:
        - Raw signals from LLM: ${neuralResponse.signals.length}
        - After validation: ${validSignals.length}
        - After intensity filter (>=${MIN_INTENSITY_THRESHOLD}): ${finalSignals.length}
        - Final output: ${finalSignals.length} signals`
      );

      // Log activated cores for debugging
      const activatedCores = finalSignals
        .map((s) => `${s.core}(${s.intensity.toFixed(2)})`)
        .join(", ");
      LoggingUtils.logInfo(
        `🎯 [NeuralSignalExtractor] FINAL ACTIVATED CORES: ${activatedCores}`
      );

      return { signals: finalSignals };
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
   * @returns Fallback neural signals based on content analysis
   */
  private generateFallbackSignals(transcription: string): NeuralSignalResponse {
    LoggingUtils.logInfo(
      "🧠 [NeuralSignalExtractor] Generating fallback neural signals..."
    );

    // Analyze input to determine activated brain areas
    const wordCount = transcription.split(/\s+/).length;
    const hasQuestionMark = transcription.includes("?");
    const hasEmotionalWords =
      /feel|love|hate|sad|happy|anxious|lost|confused/i.test(transcription);
    const hasGreeting = /hi|hello|hey|good morning|good evening/i.test(
      transcription
    );
    const hasPlanning = /will|going to|plan|tomorrow|future|next/i.test(
      transcription
    );
    const hasSelfReference = /i|me|my|myself/i.test(transcription);

    // Generate signals for detected activations
    const signals: NeuralSignal[] = [];

    // Language activation
    if (hasQuestionMark || wordCount > 20) {
      const intensity = 0.6;
      signals.push({
        core: "language",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 11
        symbolic_query: {
          query: `linguistic expression: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "language_production",
          complexity: wordCount > 20 ? "complex" : "simple",
        },
      });
    }

    // Relational activation for greetings
    if (hasGreeting) {
      const intensity = 0.8;
      signals.push({
        core: "relational",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 13
        symbolic_query: {
          query: `social interaction: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "social_engagement",
          context: "greeting",
        },
      });
    }

    // Emotional processing
    if (hasEmotionalWords) {
      const intensity = 0.9;
      signals.push({
        core: "valence",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 14
        symbolic_query: {
          query: `emotional content: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "emotion_processing",
          valence: transcription.match(/happy|joy|love/i)
            ? "positive"
            : "negative",
        },
      });
    }

    // Shadow processing
    if (
      hasEmotionalWords &&
      transcription.length > 200 &&
      /conflict|struggle|dark|unconscious|repress/i.test(transcription)
    ) {
      const intensity = 0.5;
      signals.push({
        core: "shadow",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 10
        symbolic_query: {
          query: `shadow content: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "unconscious_processing",
        },
      });
    }

    // Future-oriented thinking activates planning
    if (hasPlanning) {
      const intensity = 0.7;
      signals.push({
        core: "planning",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 12
        symbolic_query: {
          query: `planning content: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "future_planning",
          temporal_focus: "prospective",
        },
      });
    }

    // Integrity activation
    if (
      hasSelfReference &&
      /values|ethics|who I am|identity|principle|belief/i.test(transcription)
    ) {
      const intensity = 0.6;
      signals.push({
        core: "integrity",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 11
        symbolic_query: {
          query: `self-reference: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "self_awareness",
          temporal_focus: "retrospective",
        },
      });
    }

    // Will activation for intention expressions
    if (transcription.match(/want|need|must|should|will do/i)) {
      const intensity = 0.65;
      signals.push({
        core: "will",
        intensity: intensity,
        topK: Math.round(5 + intensity * 10), // topK = 12
        symbolic_query: {
          query: `intentional content: ${transcription.substring(0, 100)}`,
        },
        symbolicInsights: {
          function: "volition",
          agency: "personal",
        },
      });
    }

    // Sort by intensity and keep only top 3
    signals.sort((a, b) => b.intensity - a.intensity);
    if (signals.length > 3) {
      signals.splice(3);
    }

    LoggingUtils.logInfo(
      `🧠 [NeuralSignalExtractor] Generated ${signals.length} fallback signals`
    );

    return { signals };
  }

  /**
   * Prepares an enriched prompt with full user context.
   * @param originalPrompt The user's original prompt
   * @param userContextData Contextual data related to the user
   * @param language The language/locale for the response
   * @returns A contextually enriched prompt
   */
  private prepareEnrichedPrompt(
    originalPrompt: string,
    userContextData: Record<string, unknown>,
    language?: string
  ): string {
    const styleGuide = `COGNITIVE ACTIVATION FRAMEWORK (Orch-Mind):
  Process this input using holographic neural simulation. Each cognitive core represents a functional module based on symbolic and neurobiological mappings.`;

    const languageSpec = language
      ? `\n\nLANGUAGE CONTEXT: All analysis must respect the cultural and linguistic characteristics of ${language}.`
      : "";

    const analysisProtocol = `USER BRAIN ANALYSIS PROTOCOL:
  
  1. DETECT which cognitive processes are activated in the input.
  2. IDENTIFY the 2–3 most relevant cognitive cores based on symbolic resonance.
  3. ESTIMATE their intensity (between 0.3 and 1.0).
  4. CALL the function activateBrainArea for each activation.`;

    let prompt = `${styleGuide}${languageSpec}\n\nHOLOGRAPHIC INPUT:\n${originalPrompt}`;

    if (Object.keys(userContextData).length > 0) {
      prompt += `\n\nCONTEXTUAL MEMORY PATTERNS:`;

      if (userContextData.recent_topics) {
        prompt += `\n- Recent Activations: ${userContextData.recent_topics
          .toString()
          .substring(0, 200)}...`;
      }
      if (userContextData.speaker_interaction_counts) {
        prompt += `\n- Interaction Frequency: ${JSON.stringify(
          userContextData.speaker_interaction_counts
        )}`;
      }
      if (userContextData.emotional_history) {
        prompt += `\n- Emotional History: ${JSON.stringify(
          userContextData.emotional_history
        ).substring(0, 150)}...`;
      }
    }

    prompt += `\n\n${analysisProtocol}`;

    return prompt;
  }
}
