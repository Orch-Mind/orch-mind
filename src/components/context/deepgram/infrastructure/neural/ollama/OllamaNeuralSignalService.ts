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
      const cleanedArguments = cleanThinkTagsFromJSON(rawArguments);
      return JSON.parse(cleanedArguments);
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
          max_tokens: 1000, // More space for response
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

CURRENT SIGNAL CONTEXT:
- Symbolic Core: ${core} (${this.getCoreDescription(core)})
- Base Query: ${query}
- Signal Intensity: ${(intensity * 100).toFixed(1)}%${
      context ? `\n- Contextual Frame: ${context}` : ""
    }
- Processing Language: ${language || "pt-BR"}

Generate 3-8 keywords that unfold these hidden dimensions.

Use the enrichSemanticQuery function.`;

    const userPrompt = `NEURAL SIGNAL TO ENRICH:
Core: ${core}
Query: "${query}"
Intensity: ${intensity}

Unfold the implicate order of this signal to reveal its hidden semantic connections and associative patterns.`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
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
