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
  static buildFromArgs(args: any, originalPrompt?: string): any {
    if (!args.core) {
      throw new Error("Missing required field 'core'");
    }

    // Initialize default values
    let query = "";
    let keywords: string[] = [];

    // Extract keywords first (they might be at the top level)
    if (Array.isArray(args.keywords) && args.keywords.length > 0) {
      keywords = args.keywords.filter(
        (k: string) => typeof k === "string" && k.trim().length > 0
      );
    }

    // First check if symbolic_query is provided as expected
    if (args.symbolic_query && typeof args.symbolic_query === "object") {
      // Check for query field
      if (
        args.symbolic_query.query &&
        typeof args.symbolic_query.query === "string"
      ) {
        query = args.symbolic_query.query.trim();
      }
      // If symbolic_query is empty object or missing query, generate from keywords
      else if (keywords.length > 0) {
        query = keywords.join(" ");
      }
    }
    // Also check if symbolic_query is a string that needs parsing
    else if (args.symbolic_query && typeof args.symbolic_query === "string") {
      try {
        const parsed = JSON.parse(args.symbolic_query);
        if (parsed.query && typeof parsed.query === "string") {
          query = parsed.query.trim();
        }
      } catch {
        // Not JSON, treat as query directly
        query = args.symbolic_query.trim();
      }
    }

    // Clean query from any metadata patterns
    if (query.includes("intensity") && query.includes("%")) {
      // Remove patterns like "(valence intensity 0%)" from query
      query = query.replace(/\([^)]*intensity\s*\d+%[^)]*\)/gi, "").trim();
    }

    // If query still contains metadata patterns, try to extract meaningful part
    if (query.includes("(") && query.includes(")")) {
      const cleanQuery = query.replace(/\([^)]+\)/g, "").trim();
      if (cleanQuery.length > 3) {
        query = cleanQuery;
      }
    }

    // Fallback: Generate a meaningful query if empty or too short
    if (!query || query.length < 5) {
      // Try to generate from keywords if available
      if (keywords.length > 0) {
        query = keywords.join(" ");
      } else {
        // Extract first meaningful words from the original input
        const inputContext =
          originalPrompt || args.userInput || args.context || "";
        const meaningfulWords = inputContext
          .split(/\s+/)
          .filter((word: string) => word.length > 3)
          .slice(0, 5)
          .join(" ");

        query = `analyze ${meaningfulWords || "user input"} from ${
          args.core
        } perspective`;
      }
    }

    const signal = {
      core: args.core,
      intensity: Math.max(0.3, Math.min(1, args.intensity ?? 0.5)),
      symbolic_query: {
        query: query,
      },
      keywords: keywords,
      topK: args.topK,
      symbolicInsights: args.symbolicInsights,
    };

    return signal;
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
      const model = this.getModel();
      const tools = this.getTools();
      const messages = this.buildMessages(prompt, temporaryContext, language);

      const response =
        await this.ollamaCompletionService.callModelWithFunctions({
          model,
          messages,
          tools,
          temperature: 0.1,
        });

      const signals = this.extractSignals(response, prompt);

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

  // SOLID: Open/Closed - Métodos privados podem ser estendidos sem modificar a interface pública
  private getModel(): string {
    // Use one of the filtered models that support tools
    const configuredModel = getOption(STORAGE_KEYS.OLLAMA_MODEL);
    const fallbackModel = "qwen3:4b";

    const finalModel = configuredModel || fallbackModel;
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

Generate 3-8 keywords that unfold these hidden dimensions.
IMPORTANT: Never include metadata or intensity percentages in the enriched query.`;

    let userPrompt = `NEURAL SIGNAL TO ENRICH:
Core: ${core} (Cognitive specialization: ${this.getCoreDescription(core)})
Intensity: ${(intensity * 100).toFixed(0)}% (Signal strength)
Original Query: ${query}`;

    if (context) userPrompt += `\nContext: ${context}`;
    if (language) userPrompt += `\nLanguage: ${language}`;

    userPrompt += `\n\nUNFOLD THE IMPLICATE ORDER: Generate enriched search query and keywords that reveal hidden connections.`;

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];
  }

  private getCoreDescription(core: string): string {
    const coreDescriptions: Record<string, string> = {
      // Executive cores
      executive_central: "Control and coordination",
      attention: "Salience and relevance detection",
      working_memory: "Active information maintenance",
      // Emotional cores
      amygdala: "Threat and emotional significance",
      hippocampus: "Memory and contextual navigation",
      anterior_cingulate: "Conflict monitoring",
      // Sensory cores
      visual: "Visual and spatial processing",
      auditory: "Auditory and linguistic processing",
      somatosensorial: "Body sensations and proprioception",
      // Language cores
      broca: "Language production",
      wernicke: "Language comprehension",
      // Integration cores
      thalamus: "Multi-modal relay and integration",
      claustrum: "Consciousness unification",
      default_mode: "Internal processing and self-reference",
      salience: "Internal/external focus switching",
    };
    return coreDescriptions[core] || "Unknown specialization";
  }

  private extractSignals(response: any, originalPrompt?: string): any[] {
    const toolCalls = response.choices?.[0]?.message?.tool_calls;

    if (toolCalls?.length > 0) {
      return this.extractFromToolCalls(toolCalls, originalPrompt);
    }

    // Fallback: Try to extract from content if no tool calls found
    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      // Try to find JSON-like structures in the content
      const jsonMatches = content.match(/\{[^{}]*\}/g);
      if (jsonMatches) {
        const extractedSignals = [];
        for (const match of jsonMatches) {
          try {
            const parsed = JSON.parse(match);
            // Check if it looks like a brain activation
            if (parsed.core && parsed.intensity && parsed.symbolic_query) {
              const signal = NeuralSignalBuilder.buildFromArgs(
                parsed,
                originalPrompt
              );
              if (signal) {
                extractedSignals.push(signal);
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }

        if (extractedSignals.length > 0) {
          return extractedSignals;
        }
      }
    }

    // No tool calls found - return empty array
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

          // Validate and fix arguments if needed
          if (!args.symbolic_query || typeof args.symbolic_query !== "object") {
            args.symbolic_query = {};
          }

          // If symbolic_query.query is missing but we have keywords, generate it
          if (
            !args.symbolic_query.query &&
            args.keywords &&
            args.keywords.length > 0
          ) {
            args.symbolic_query.query = args.keywords.join(" ");
          }

          // If still no query, use the original prompt
          if (!args.symbolic_query.query) {
            args.symbolic_query.query = originalPrompt || "analyze user input";
          }

          return NeuralSignalBuilder.buildFromArgs(args, originalPrompt);
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
