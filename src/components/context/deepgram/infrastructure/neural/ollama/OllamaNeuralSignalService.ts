// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaNeuralSignalService.ts
// Symbolic: Neural signal extraction service using Ollama (cortex: ollama)

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "../../../../../../shared/utils/neuralPromptBuilder";
import { NeuralSignalResponse } from "../../../interfaces/neural/NeuralSignalTypes";
import { FunctionSchemaRegistry } from "../../../services/function-calling/FunctionSchemaRegistry";
import { OllamaCompletionService } from "../../../services/ollama/neural/OllamaCompletionService";
import {
  cleanThinkTags,
  cleanThinkTagsFromJSON,
} from "../../../utils/ThinkTagCleaner";

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
    if (typeof rawArguments === "string") {
      const cleanedArguments = cleanThinkTagsFromJSON(rawArguments);
      return JSON.parse(cleanedArguments);
    }

    if (typeof rawArguments === "object" && rawArguments !== null) {
      return this.cleanObjectValues(rawArguments);
    }

    throw new Error("Invalid arguments type");
  }

  private static cleanObjectValues(obj: any): any {
    if (typeof obj === "string") {
      return cleanThinkTags(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanObjectValues(item));
    }
    if (obj && typeof obj === "object") {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = this.cleanObjectValues(value);
      }
      return cleaned;
    }
    return obj;
  }
}

// SOLID: Single Responsibility - Classe para construção de sinais neurais
class NeuralSignalBuilder {
  static buildFromArgs(args: any): any {
    if (!args.core) {
      throw new Error("Missing required field 'core'");
    }

    // Process keywords - handle string arrays like "[]" or "[\"word1\", \"word2\"]"
    let keywords: string[] = [];
    if (args.keywords !== undefined) {
      if (Array.isArray(args.keywords)) {
        keywords = args.keywords;
      } else if (typeof args.keywords === "string") {
        // Try to parse string as JSON array
        try {
          const parsed = JSON.parse(args.keywords);
          if (Array.isArray(parsed)) {
            keywords = parsed;
            console.log(
              `🦙 [NeuralSignalBuilder] Parsed keywords from JSON string: ${JSON.stringify(
                keywords
              )}`
            );
          }
        } catch (e) {
          // Not valid JSON, treat as empty array
          console.log(
            `🦙 [NeuralSignalBuilder] Keywords string is not valid JSON, using empty array: "${args.keywords}"`
          );
        }
      } else {
        console.log(
          `🦙 [NeuralSignalBuilder] Unexpected keywords type (${typeof args.keywords}), using empty array`
        );
      }
    }

    return {
      core: args.core,
      intensity: Math.max(0, Math.min(1, args.intensity ?? 0.5)),
      symbolic_query: {
        query: typeof args.query === "string" ? args.query.trim() : "",
      },
      keywords: keywords,
      topK: args.topK,
      symbolicInsights: args.symbolicInsights,
    };
  }
}

// SOLID: Single Responsibility - Classe para logging estruturado
class ServiceLogger {
  static logRequest(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): void {
    console.log(`🦙 [OllamaNeuralSignal] Request:`, {
      promptLength: prompt.length,
      hasContext: !!temporaryContext,
      language,
    });
  }

  static logResponse(response: any): void {
    console.log(`🦙 [OllamaNeuralSignal] Response:`, {
      hasChoices: !!response.choices,
      hasToolCalls: !!response.choices?.[0]?.message?.tool_calls,
      toolCallsCount: response.choices?.[0]?.message?.tool_calls?.length || 0,
    });
  }

  static logSignals(signals: any[]): void {
    console.log(
      `🦙 [OllamaNeuralSignal] Generated ${signals.length} signals:`,
      signals.map((s) => ({ core: s?.core, intensity: s?.intensity }))
    );
  }

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
      ServiceLogger.logRequest(prompt, temporaryContext, language);

      const model = this.getModel();
      console.log(`🦙 [OllamaNeuralSignal] Using model: ${model}`);

      const tools = this.getTools();
      console.log(
        `🦙 [OllamaNeuralSignal] Tools available: ${
          tools.length > 0 ? "YES" : "NO"
        }`
      );

      const messages = this.buildMessages(prompt, temporaryContext, language);
      console.log(
        `🦙 [OllamaNeuralSignal] Messages built: ${messages.length} messages`
      );

      console.log(
        `🦙 [OllamaNeuralSignal] About to call OllamaCompletionService...`
      );

      const response =
        await this.ollamaCompletionService.callModelWithFunctions({
          model,
          messages,
          tools,
          temperature: 0.1,
        });

      console.log(
        `🦙 [OllamaNeuralSignal] Response received from OllamaCompletionService`
      );
      ServiceLogger.logResponse(response);

      // Extra debug for response content
      if (response.choices?.[0]?.message) {
        console.log(
          `🦙 [OllamaNeuralSignal] Raw response message:`,
          JSON.stringify(response.choices[0].message, null, 2)
        );
      }

      const signals = this.extractSignals(response);
      console.log(
        `🦙 [OllamaNeuralSignal] Signals extracted: ${signals.length} signals`
      );
      ServiceLogger.logSignals(signals);

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

      const model = this.getModel();
      if (model.includes("llama3.2")) {
        console.log(
          `🦙 [OllamaNeuralSignal] Using Llama 3.2 - extra debug enabled`
        );
        console.log(
          `🦙 [OllamaNeuralSignal] Enrichment messages:`,
          JSON.stringify(messages, null, 2)
        );
        console.log(
          `🦙 [OllamaNeuralSignal] Enrichment tools:`,
          JSON.stringify(tools, null, 2)
        );
      }

      const response =
        await this.ollamaCompletionService.callModelWithFunctions({
          model: model,
          messages,
          tools,
          temperature: 0.2,
        });

      const result = this.extractEnrichment(response, query);
      console.log(
        `🦙 [OllamaNeuralSignal] Enrichment result: ${JSON.stringify(result)}`
      );
      return result;
    } catch (error) {
      ServiceLogger.logError("enrichSemanticQueryForSignal", error);
      return { enrichedQuery: query, keywords: [] };
    }
  }

  // SOLID: Open/Closed - Métodos privados podem ser estendidos sem modificar a interface pública
  private getModel(): string {
    // Use one of the filtered models that support tools
    const configuredModel = getOption(STORAGE_KEYS.OLLAMA_MODEL);
    const fallbackModel = "qwen3:4b"; // Changed from llama3.1:latest to qwen3:4b

    const finalModel = configuredModel || fallbackModel;
    console.log(
      `🦙 [OllamaNeuralSignal] Model selection: configured=${configuredModel}, fallback=${fallbackModel}, final=${finalModel}`
    );

    return finalModel;
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
  ): any[] {
    return [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildUserPrompt(prompt, temporaryContext, language),
      },
    ];
  }

  private buildEnrichmentMessages(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): any[] {
    const systemPrompt = `Enrichment system: expand queries with 3-8 keywords preserving symbolic resonance and productive contradictions.`;

    let userPrompt = `Core: ${core}
    Intensity: ${(intensity * 100).toFixed(0)}%
    Query: ${query}`;
    if (context) userPrompt += `\nContext: ${context}`;
    if (language) userPrompt += `\nLanguage: ${language}.`;

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];
  }

  private extractSignals(response: any): any[] {
    const toolCalls = response.choices?.[0]?.message?.tool_calls;

    if (toolCalls?.length > 0) {
      return this.extractFromToolCalls(toolCalls);
    }

    // Fallback: Try to parse function calls from content
    const content = response.choices?.[0]?.message?.content;
    if (content) {
      console.log(
        `🦙 [OllamaNeuralSignal] No tool calls, trying content parsing: ${content.substring(
          0,
          200
        )}...`
      );

      // Try python_tag format
      const pythonTagRegex = /<\|python_tag\|>\s*(\{[\s\S]*?\})/;
      const pythonTagMatch = content.match(pythonTagRegex);

      if (pythonTagMatch) {
        try {
          const pythonTagData = JSON.parse(pythonTagMatch[1]);
          console.log(
            `🦙 [OllamaNeuralSignal] Found python_tag format: ${JSON.stringify(
              pythonTagData
            )}`
          );

          if (
            pythonTagData.function === "activateBrainArea" &&
            pythonTagData.parameters
          ) {
            const signal = NeuralSignalBuilder.buildFromArgs(
              pythonTagData.parameters
            );
            return [signal];
          }
        } catch (e) {
          console.warn(
            `🦙 [OllamaNeuralSignal] Failed to parse python_tag: ${e}`
          );
        }
      }

      // Try JSON extraction
      const jsonMatches = [
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g,
        /(\{[\s\S]*?"core"[\s\S]*?\})/g,
      ];

      for (const regex of jsonMatches) {
        const matches = [...content.matchAll(regex)];
        for (const match of matches) {
          try {
            const candidate = JSON.parse(match[1]);
            if (candidate.core && typeof candidate.intensity === "number") {
              const signal = NeuralSignalBuilder.buildFromArgs(candidate);
              return [signal];
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    console.warn(
      `🦙 [OllamaNeuralSignal] No signals could be extracted from response`
    );
    return [];
  }

  private extractFromToolCalls(toolCalls: any[]): any[] {
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
          return NeuralSignalBuilder.buildFromArgs(args);
        } catch (error) {
          ServiceLogger.logError("parsing tool call", error);
          return null;
        }
      })
      .filter((signal) => signal !== null);
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
        console.log(
          `🦙 [OllamaNeuralSignal] Enrichment args parsed: ${JSON.stringify(
            args
          )}`
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
                console.log(
                  `🦙 [OllamaNeuralSignal] Keywords received as JSON string, successfully parsed: ${JSON.stringify(
                    keywords
                  )}`
                );
              } catch (e) {
                // If JSON parsing fails, treat as comma-separated
                keywords = args.keywords
                  .split(",")
                  .map((k: string) => k.trim())
                  .filter((k: string) => k.length > 0);
                console.log(
                  `🦙 [OllamaNeuralSignal] Keywords parsed from comma-separated string: ${JSON.stringify(
                    keywords
                  )}`
                );
              }
            } else {
              // Handle case where keywords might be a comma-separated string
              keywords = args.keywords
                .split(",")
                .map((k: string) => k.trim())
                .filter((k: string) => k.length > 0);
              console.log(
                `🦙 [OllamaNeuralSignal] Keywords converted from string to array: ${JSON.stringify(
                  keywords
                )}`
              );
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
