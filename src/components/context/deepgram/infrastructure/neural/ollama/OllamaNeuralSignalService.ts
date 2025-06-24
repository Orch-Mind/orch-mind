// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaNeuralSignalService.ts
// Symbolic: Neural signal extraction service using Ollama (cortex: ollama)

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import {
  buildBatchEnrichSystemPrompt,
  buildBatchEnrichUserPrompt,
  buildCombinedSystemPrompt,
  buildCombinedUserPrompt,
} from "../../../../../../shared/utils/neuralPromptBuilder";
import {
  buildSignalFromArgs,
  isValidNeuralSignal,
} from "../../../../../../shared/utils/neuralSignalParser";
import { OllamaToolCallParser } from "../../../../../../utils/OllamaToolCallParser";
import { NeuralSignalResponse } from "../../../interfaces/neural/NeuralSignalTypes";
import { FunctionSchemaRegistry } from "../../../services/function-calling/FunctionSchemaRegistry";
import { OllamaCompletionService } from "../../../services/ollama/neural/OllamaCompletionService";
import { cleanThinkTagsFromJSON } from "../../../utils/ThinkTagCleaner";

// SOLID: Interface Segregation Principle - Interfaces específicas
interface INeuralSignalService {
  generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse>;
}

interface ISemanticEnricher {
  enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>>;
}

// SOLID: Single Responsibility - Classe para parsing de argumentos
class ArgumentParser {
  static parseToolCallArguments(rawArguments: any): any {
    // Ollama já retorna os argumentos no formato correto
    if (typeof rawArguments === "object" && rawArguments !== null) {
      return rawArguments;
    }

    // Se for string, faz parse do JSON após limpar think tags
    if (typeof rawArguments === "string") {
      try {
        const cleanedArguments = cleanThinkTagsFromJSON(rawArguments);

        // Log para debug
        if (cleanedArguments.length > 200) {
          console.log("🦙 [ArgumentParser] Long arguments detected:", {
            length: cleanedArguments.length,
            preview: cleanedArguments.substring(0, 200) + "...",
            lastChars: cleanedArguments.substring(cleanedArguments.length - 50),
          });
        }

        return JSON.parse(cleanedArguments);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error("🦙 [ArgumentParser] JSON parse error:", {
          error: errorMessage,
          rawLength: rawArguments.length,
          rawPreview: rawArguments.substring(0, 200),
          rawLastChars: rawArguments.substring(rawArguments.length - 50),
        });

        // Try to salvage partial JSON if possible
        if (errorMessage.includes("Unexpected end of JSON input")) {
          console.warn("🦙 [ArgumentParser] Attempting to fix truncated JSON");
          // This is a basic attempt - in production you might want more sophisticated handling
          return null;
        }

        throw error;
      }
    }

    throw new Error("Invalid arguments type");
  }
}

// SOLID: Single Responsibility - Classe para logging estruturado
class ServiceLogger {
  static logError(context: string, error: any): void {
    console.error(`🦙 [OllamaNeuralSignal] ${context}:`, error);
  }
}

/**
 * SOLID: Single Responsibility - Serviço focado apenas em geração de sinais neurais
 * DRY: Eliminação de código duplicado através de classes auxiliares
 * KISS: Lógica simplificada e métodos pequenos
 * YAGNI: Removido código desnecessário e logs excessivos
 */
export class OllamaNeuralSignalService
  implements INeuralSignalService, ISemanticEnricher
{
  constructor(private ollamaCompletionService: OllamaCompletionService) {}

  async generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse> {
    try {
      const model = getOption(STORAGE_KEYS.OLLAMA_MODEL);
      const tools = this.getTools();
      const messages = this.buildMessages(prompt, temporaryContext, language);

      console.log(`🦙 [OllamaNeuralSignal] Using model: ${model}`);

      const response =
        await this.ollamaCompletionService.callModelWithFunctions({
          model,
          messages,
          tools,
          temperature: 0.1,
        });

      // Debug logging
      console.log(
        "🦙 [OllamaNeuralSignal] Raw response:",
        JSON.stringify({
          hasChoices: !!response.choices,
          choicesLength: response.choices?.length,
          firstChoice: response.choices?.[0]
            ? {
                hasMessage: !!response.choices[0].message,
                hasToolCalls: !!response.choices[0].message?.tool_calls,
                toolCallsLength:
                  response.choices[0].message?.tool_calls?.length,
                content: response.choices[0].message?.content?.substring(
                  0,
                  200
                ),
              }
            : null,
        })
      );

      const signals = this.extractSignals(response, prompt);

      console.log("🦙 [OllamaNeuralSignal] Extracted signals:", signals.length);

      return { signals };
    } catch (error) {
      ServiceLogger.logError("generateNeuralSignal", error);
      return { signals: [] };
    }
  }

  /**
   * Batch semantic enrichment for multiple neural signals
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
      if (!enrichBatchSchema) {
        throw new Error("enrichSemanticQueryBatch schema not found");
      }
      const tools = [
        { type: "function" as const, function: enrichBatchSchema },
      ];

      // Use centralized prompts
      const systemPrompt = buildBatchEnrichSystemPrompt(
        signals.length,
        language
      );
      const userPrompt = buildBatchEnrichUserPrompt(signals, language);

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];

      const model = getOption(STORAGE_KEYS.OLLAMA_MODEL);

      console.log(
        `🦙 [OllamaNeuralSignal] Batch enriching ${signals.length} signals`
      );

      const response =
        await this.ollamaCompletionService.callModelWithFunctions({
          model: model,
          messages,
          tools,
          temperature: 0.1,
        });

      // Extract batch results
      const toolCalls = response.choices?.[0]?.message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        try {
          const args = ArgumentParser.parseToolCallArguments(
            toolCalls[0].function.arguments
          );

          if (args.enrichedSignals && Array.isArray(args.enrichedSignals)) {
            // Map results ensuring same order as input
            const results = signals.map((signal, index) => {
              const enriched = args.enrichedSignals[index];
              if (enriched && enriched.enrichedQuery) {
                return {
                  enrichedQuery: enriched.enrichedQuery,
                  keywords: Array.isArray(enriched.keywords)
                    ? enriched.keywords
                    : [],
                };
              }
              // Fallback to original if enrichment failed for this signal
              return { enrichedQuery: signal.query, keywords: [] };
            });

            console.log(`🦙 [OllamaNeuralSignal] Batch enrichment successful`);
            return results;
          }
        } catch (error) {
          ServiceLogger.logError("parsing batch enrichment", error);
        }
      }

      // Fallback: if batch processing fails, return original queries
      console.warn(
        "🦙 [OllamaNeuralSignal] Batch enrichment failed, returning original queries"
      );
      return signals.map((signal) => ({
        enrichedQuery: signal.query,
        keywords: [],
      }));
    } catch (error) {
      ServiceLogger.logError("enrichSemanticQuery", error);
      // Return original queries as fallback
      return signals.map((signal) => ({
        enrichedQuery: signal.query,
        keywords: [],
      }));
    }
  }

  private getTools(): any[] {
    const schema =
      FunctionSchemaRegistry.getInstance().get("activateBrainArea");
    if (!schema) {
      throw new Error("activateBrainArea schema not found");
    }
    return [{ type: "function" as const, function: schema }];
  }

  private buildMessages(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Array<{ role: string; content: string }> {
    const systemPrompt = buildCombinedSystemPrompt(language);
    const userPrompt = buildCombinedUserPrompt(
      prompt,
      temporaryContext,
      language
    );

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    return messages;
  }

  private extractSignals(response: any, originalPrompt?: string): any[] {
    // Ollama retorna tool_calls no formato padrão quando usa models com suporte a tools
    const toolCalls = response.choices?.[0]?.message?.tool_calls;

    console.log("🦙 [OllamaNeuralSignal] extractSignals:", {
      hasToolCalls: !!toolCalls,
      toolCallsLength: toolCalls?.length || 0,
    });

    if (toolCalls?.length > 0) {
      return this.extractFromToolCalls(toolCalls, originalPrompt);
    }

    // Try to parse non-standard formats with OllamaToolCallParser
    const content = response.choices?.[0]?.message?.content;
    if (content) {
      console.log(
        "🦙 [OllamaNeuralSignal] Trying OllamaToolCallParser for non-standard format"
      );

      const parser = new OllamaToolCallParser();
      const parsedToolCalls = parser.parse(content);

      if (parsedToolCalls.length > 0) {
        console.log(
          `🦙 [OllamaNeuralSignal] Successfully parsed ${parsedToolCalls.length} tool calls from non-standard format`
        );
        return this.extractFromToolCalls(parsedToolCalls, originalPrompt);
      }
    }

    // Se não houver tool_calls, modelo não suporta ou não identificou necessidade de tools
    console.log("🦙 [OllamaNeuralSignal] No tool calls found in response");
    return [];
  }

  private extractFromToolCalls(
    toolCalls: any[],
    originalPrompt?: string
  ): any[] {
    return toolCalls
      .filter(
        (call) =>
          call?.function?.name === "activateBrainArea" &&
          call?.function?.arguments
      )
      .map((call) => {
        try {
          const args = ArgumentParser.parseToolCallArguments(
            call.function.arguments
          );

          // Debug logging for Llama 3.1
          console.log(
            "🦙 [OllamaNeuralSignal] Tool call arguments:",
            JSON.stringify(args, null, 2)
          );

          // Se temos enriched_query (do prompt combinado), usa ele como query principal
          if (args.enriched_query && typeof args.symbolic_query === "object") {
            args.symbolic_query.query = args.enriched_query;
          }

          const signal = buildSignalFromArgs(args, originalPrompt);
          return signal && isValidNeuralSignal(signal) ? signal : null;
        } catch (error) {
          ServiceLogger.logError("parsing tool call", error);
          return null;
        }
      })
      .filter((signal) => signal !== null);
  }
}
