// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaNeuralSignalService.ts
// Symbolic: Neural signal extraction service using Ollama (cortex: ollama)

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import {
  buildErichSystemPrompt,
  buildErichUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "../../../../../../shared/utils/neuralPromptBuilder";
import { NeuralSignalResponse } from "../../../interfaces/neural/NeuralSignalTypes";
import { FunctionSchemaRegistry } from "../../../services/function-calling/FunctionSchemaRegistry";
import { OllamaCompletionService } from "../../../services/ollama/neural/OllamaCompletionService";
import { cleanThinkTagsFromJSON } from "../../../utils/ThinkTagCleaner";

// SOLID: Interface Segregation Principle - Interfaces específicas
// SOLID: Interface Segregation Principle - Interfaces específicas
interface INeuralSignalService {
  generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse>;
}

interface ISemanticEnricher {
  enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }>;
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
          temperature: 0.7, // Higher for more natural response
          max_tokens: 2048, // Increased for complete JSON responses
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

  async enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }> {
    try {
      const tools = this.getEnrichmentTools();
      const messages = this.buildEnrichmentMessages(
        core,
        query,
        intensity,
        context,
        language
      );

      const model = getOption(STORAGE_KEYS.OLLAMA_MODEL);

      const response =
        await this.ollamaCompletionService.callModelWithFunctions({
          model: model,
          messages,
          tools,
          temperature: 0.2,
        });

      const result = this.extractEnrichment(response, query);
      return result;
    } catch (error) {
      ServiceLogger.logError("enrichSemanticQueryForSignal", error);
      return { enrichedQuery: query, keywords: [] };
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

  private getEnrichmentTools(): any[] {
    const schema = FunctionSchemaRegistry.getInstance().get(
      "enrichSemanticQuery"
    );
    if (!schema) {
      throw new Error("enrichSemanticQuery schema not found");
    }
    return [{ type: "function" as const, function: schema }];
  }

  private buildMessages(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Array<{ role: string; content: string }> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prompt, temporaryContext, language);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    return messages;
  }

  private buildEnrichmentMessages(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): any[] {
    const systemPrompt = buildErichSystemPrompt();

    const userPrompt = buildErichUserPrompt(
      core,
      query,
      intensity,
      context,
      language
    );

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
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
          // Ollama já retorna arguments como objeto quando suporta tools nativamente
          const args = ArgumentParser.parseToolCallArguments(
            call.function.arguments
          );

          // Validate and build signal
          return this.buildSignalFromArgs(args, originalPrompt);
        } catch (error) {
          ServiceLogger.logError("parsing tool call", error);
          return null;
        }
      })
      .filter((signal) => signal !== null);
  }

  private buildSignalFromArgs(args: any, originalPrompt?: string): any {
    // Validate required fields
    if (!args.core) {
      console.warn("🦙 [OllamaNeuralSignal] Missing core field in args");
      return null;
    }

    // Initialize signal with defaults
    const signal = {
      core: args.core,
      intensity: Math.max(0.3, Math.min(1, args.intensity ?? 0.5)),
      symbolic_query: args.symbolic_query || {
        query: originalPrompt || "analyze user input",
      },
      keywords: Array.isArray(args.keywords) ? args.keywords : [],
      topK: args.topK,
      symbolicInsights: args.symbolicInsights,
    };

    // Ensure symbolic_query has a query field
    if (!signal.symbolic_query.query && signal.keywords.length > 0) {
      signal.symbolic_query.query = signal.keywords.join(" ");
    }

    return signal;
  }

  private extractEnrichment(
    response: any,
    originalQuery: string
  ): { enrichedQuery: string; keywords: string[] } {
    const toolCalls = response.choices?.[0]?.message?.tool_calls;

    if (toolCalls?.length > 0) {
      try {
        const args = ArgumentParser.parseToolCallArguments(
          toolCalls[0].function.arguments
        );

        if (args.enrichedQuery) {
          // Ensure keywords is an array
          let keywords: string[] = [];
          if (Array.isArray(args.keywords)) {
            keywords = args.keywords;
          } else if (typeof args.keywords === "string") {
            // Check if it's a JSON string first
            if (args.keywords.startsWith("[") && args.keywords.endsWith("]")) {
              try {
                keywords = JSON.parse(args.keywords);
              } catch (e) {
                // If JSON parsing fails, treat as comma-separated
                keywords = args.keywords
                  .split(",")
                  .map((k: string) => k.trim())
                  .filter((k: string) => k.length > 0);
              }
            } else {
              // Handle case where keywords might be a comma-separated string
              keywords = args.keywords
                .split(",")
                .map((k: string) => k.trim())
                .filter((k: string) => k.length > 0);
            }
          }

          return {
            enrichedQuery: args.enrichedQuery,
            keywords: keywords,
          };
        }
      } catch (error) {
        ServiceLogger.logError("parsing enrichment", error);
      }
    }

    // KISS: Fallback simples
    return { enrichedQuery: originalQuery, keywords: [] };
  }
}
