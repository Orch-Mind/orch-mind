// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceNeuralSignalService.ts
// Symbolic: Neural signal extraction service using HuggingFace (cortex: huggingface)
import { NeuralSignalResponse } from "../../../components/context/deepgram/interfaces/neural/NeuralSignalTypes";
import { FunctionSchemaRegistry } from "../../../components/context/deepgram/services/function-calling/FunctionSchemaRegistry";
import { HuggingFaceServiceFacade } from "../../../components/context/deepgram/services/huggingface/HuggingFaceServiceFacade";
import { INeuralSignalService } from "../../../domain/core/neural/INeuralSignalService";
import { ISemanticEnricher } from "../../../domain/core/neural/ISemanticEnricher";
import { getOption, STORAGE_KEYS } from "../../../services/StorageService";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "../../../shared/utils/neuralPromptBuilder";
import {
  extractNeuralSignalJsons,
  parseNeuralSignal,
} from "../../../shared/utils/neuralSignalParser";

/**
 * Symbolic: HuggingFace implementation of neural signal service
 * This service extracts symbolic neural signals and performs semantic enrichment
 * using local HuggingFace models.
 */
export class HuggingFaceNeuralSignalService
  implements INeuralSignalService, ISemanticEnricher
{
  /**
   * Constructor with dependency injection for HuggingFaceServiceFacade
   */
  constructor(private huggingFaceClient: HuggingFaceServiceFacade) {}

  /**
   * Symbolic: Extracts neural signals using HuggingFace
   */
  async generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse> {
    try {
      const systemPromptContent = buildSystemPrompt();
      let userPromptContent = buildUserPrompt(
        prompt,
        temporaryContext,
        language
      );

      // For HuggingFace models without native function-calling, force JSON output
      userPromptContent += `\n\nReturn JSON array with detected activations. Format: [{core, query, intensity, keywords[], symbolicInsights}]`;

      const activateBrainAreaSchema =
        FunctionSchemaRegistry.getInstance().get("activateBrainArea");
      const tools = activateBrainAreaSchema
        ? [{ type: "function", function: activateBrainAreaSchema }]
        : [];

      const messages = [
        { role: "system" as const, content: systemPromptContent },
        { role: "user" as const, content: userPromptContent },
      ];
      const response = await this.huggingFaceClient.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.HF_MODEL) || "Xenova/llama2.c-stories15M",
        messages,
        tools,
        tool_choice: {
          type: "function",
          function: { name: "activateBrainArea" },
        },
        temperature: 0.2,
      });

      const toolCalls = response.choices?.[0]?.message?.tool_calls;
      let signals: NeuralSignalResponse["signals"] = [];
      if (toolCalls && Array.isArray(toolCalls)) {
        signals = toolCalls
          .filter((call: any) => call.function?.name === "activateBrainArea")
          .map((call: any): any => {
            try {
              const args = call.function?.arguments
                ? JSON.parse(call.function.arguments)
                : {};
              const baseSignal: Partial<any> = {
                core: args.core,
                intensity: Math.max(0, Math.min(1, args.intensity ?? 0.5)),
                symbolic_query: { query: args.query ?? "" },
              };
              if (Array.isArray(args.keywords))
                baseSignal.keywords = args.keywords;
              if (args.filters) baseSignal.filters = args.filters;
              if (typeof args.expand === "boolean")
                baseSignal.expand = args.expand;
              if (args.symbolicInsights)
                baseSignal.symbolicInsights = args.symbolicInsights;
              if (typeof args.topK !== "undefined") baseSignal.topK = args.topK;
              if (typeof baseSignal.core !== "undefined") return baseSignal;
              return undefined;
            } catch {
              return undefined;
            }
          })
          .filter(
            (signal: any): signal is any =>
              !!signal && typeof signal.core !== "undefined"
          );
      }

      // If unable to extract function calls, try to extract text-based signals
      if (signals.length === 0 && response.choices?.[0]?.message?.content) {
        // Parse neural signals using the utility parsers
        const extractedSignals = extractNeuralSignalJsons(
          response.choices?.[0]?.message?.content
        )
          .map(parseNeuralSignal)
          .filter(
            (signal): signal is NeuralSignalResponse["signals"][0] =>
              signal !== null
          );
        signals = extractedSignals;
      }

      return { signals };
    } catch (error) {
      // Log error and return empty signals for graceful degradation
      console.error("Neural signal extraction error:", error);
      return { signals: [] };
    }
  }

  /**
   * Symbolic: Semantic enrichment using HuggingFace
   */
  async enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }> {
    try {
      const enrichSchema = FunctionSchemaRegistry.getInstance().get(
        "enrichSemanticQuery"
      );
      const enrichmentTools = enrichSchema
        ? [{ type: "function", function: enrichSchema }]
        : [];

      const systemPrompt = `You are the Neural Signal Enrichment System based on David Bohm's Implicate Order theory.

THEORETICAL FOUNDATION:
- Bohm's Implicate Order: Reality has an enfolded (implicate) order that unfolds into explicit manifestation
- Your task: Unfold the implicate connections, memories, and patterns hidden within the neural signal

ENRICHMENT MISSION: Enrich this neural signal by unfolding its 'implicate order'—the hidden connections, associative memories, and implicit patterns folded within the information.

UNFOLDING PROCESS:
1. EPISODIC MEMORY ASSOCIATIONS:
   - Similar past experiences
   - Recurring patterns
   - Temporal connections

2. IMPLICIT SEMANTIC NETWORK:
   - Non-obvious related concepts
   - Indirect associations
   - Emergent semantic fields

3. HISTORICAL EMOTIONAL RESONANCE:
   - Emotional echoes from past
   - Recurring affective patterns
   - Activated emotional memory

4. IMPLICIT CULTURAL CONTEXT:
   - Underlying cultural meanings
   - Undeclared assumptions
   - Implicit social codes

5. DEVELOPMENTAL POTENTIAL:
   - Possible evolution directions
   - Future implications
   - Latent potentialities

BOHM PRINCIPLE: "What is implicit must become explicit through unfolding."

Generate 3-8 keywords that unfold these hidden dimensions.`;

      let userPrompt = `NEURAL SIGNAL TO ENRICH:
Core: ${core} (Cognitive specialization: ${this.getCoreDescription(core)})
Intensity: ${(intensity * 100).toFixed(0)}% (Signal strength)
Original Query: ${query}`;

      if (context) userPrompt += `\nContext: ${context}`;
      if (language) userPrompt += `\nLanguage: ${language}`;

      userPrompt += `\n\nUNFOLD THE IMPLICATE ORDER: Generate enriched search query and keywords that reveal hidden connections.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ];

      const response = await this.huggingFaceClient.callOpenAIWithFunctions({
        model: getOption(STORAGE_KEYS.HF_MODEL) || "sshleifer/tiny-gpt2",
        messages: messages,
        tools: enrichmentTools,
        tool_choice: {
          type: "function",
          function: { name: "enrichSemanticQuery" },
        },
        temperature: 0.2,
      });

      // Symbolic: Use central neural signal parser for all JSON arguments (tool_calls)
      const toolCalls = response.choices?.[0]?.message?.tool_calls;
      if (
        toolCalls &&
        Array.isArray(toolCalls) &&
        toolCalls[0]?.function?.arguments
      ) {
        const signal = parseNeuralSignal(
          toolCalls[0].function.arguments as string
        );
        if (signal && signal.symbolic_query?.query) {
          return {
            enrichedQuery: signal.symbolic_query.query,
            keywords: signal.keywords || [],
          };
        } else {
          return { enrichedQuery: query, keywords: [] };
        }
      }
      return { enrichedQuery: query, keywords: [] };
    } catch (error) {
      // Handle general service errors with original query fallback
      console.error("Semantic enrichment error:", error);
      return { enrichedQuery: query, keywords: [] };
    }
  }

  private getCoreDescription(core: string): string {
    const coreDescriptions: Record<string, string> = {
      valence: "Emotional polarity and affective resonance processing",
      memory: "Episodic and semantic memory retrieval and consolidation",
      metacognitive: "Self-awareness and cognitive monitoring processes",
      relational: "Interpersonal dynamics and social cognition",
      creativity: "Creative thinking and novel connection generation",
      will: "Volition, agency and intentional action",
      planning: "Executive planning and strategic thinking",
      language: "Linguistic processing and communication",
      shadow: "Unconscious patterns and repressed content",
      symbolic_alignment: "Symbolic meaning and archetypal pattern recognition",
      integrity: "Core values and ethical alignment",
      evolution: "Growth, learning, and adaptive change processes",
    };

    return coreDescriptions[core] || "Specialized cognitive processing domain";
  }
}
