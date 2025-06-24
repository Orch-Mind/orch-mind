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
  buildBatchEnrichSystemPrompt,
  buildBatchEnrichUserPrompt,
  buildCombinedSystemPrompt,
  buildCombinedUserPrompt,
} from "../../../shared/utils/neuralPromptBuilder";
import {
  buildSignalFromArgs,
  extractNeuralSignalJsons,
  isValidNeuralSignal,
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
      const systemPromptContent = buildCombinedSystemPrompt(language);
      let userPromptContent = buildCombinedUserPrompt(
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
              // Use centralized buildSignalFromArgs
              const signal = buildSignalFromArgs(args, prompt);
              return signal && isValidNeuralSignal(signal) ? signal : null;
            } catch {
              return null;
            }
          })
          .filter((signal: any): signal is any => signal !== null);
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
   * Batch semantic enrichment using HuggingFace
   * Processes multiple signals in a single LLM call for improved efficiency
   */
  async enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>> {
    try {
      const enrichBatchSchema = FunctionSchemaRegistry.getInstance().get(
        "enrichSemanticQueryBatch"
      );
      const enrichmentTools = enrichBatchSchema
        ? [{ type: "function", function: enrichBatchSchema }]
        : [];

      // Use same prompts as Ollama
      const systemPrompt = buildBatchEnrichSystemPrompt(
        signals.length,
        language
      );
      const userPrompt = buildBatchEnrichUserPrompt(signals, language);

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
          function: { name: "enrichSemanticQueryBatch" },
        },
        temperature: 0.2,
      });

      // Extract batch results
      const toolCalls = response.choices?.[0]?.message?.tool_calls;
      if (
        toolCalls &&
        Array.isArray(toolCalls) &&
        toolCalls[0]?.function?.arguments
      ) {
        try {
          const args =
            typeof toolCalls[0].function.arguments === "string"
              ? JSON.parse(toolCalls[0].function.arguments)
              : toolCalls[0].function.arguments;
          if (args.enrichedSignals && Array.isArray(args.enrichedSignals)) {
            // Ensure we return the same number of results as inputs
            const results = signals.map((signal, index) => {
              const enriched = args.enrichedSignals[index];
              if (enriched && enriched.enrichedQuery) {
                return {
                  enrichedQuery: enriched.enrichedQuery,
                  keywords: enriched.keywords || [],
                };
              }
              // Fallback to original if enrichment failed for this signal
              return { enrichedQuery: signal.query, keywords: [] };
            });
            return results;
          }
        } catch (error) {
          console.error("Batch enrichment parsing error:", error);
        }
      }

      // Fallback: return original queries if batch processing fails
      console.warn("Batch enrichment failed, returning original queries");
      return signals.map((signal) => ({
        enrichedQuery: signal.query,
        keywords: [],
      }));
    } catch (error) {
      console.error("Batch semantic enrichment error:", error);
      // Return original queries as fallback
      return signals.map((signal) => ({
        enrichedQuery: signal.query,
        keywords: [],
      }));
    }
  }
}
