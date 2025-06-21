// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaCollapseStrategyService.ts
// Symbolic: Collapse strategy service using Ollama (cortex: ollama)

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { FunctionSchemaRegistry } from "../../services/function-calling/FunctionSchemaRegistry";
import { OllamaCompletionService } from "../../services/ollama/neural/OllamaCompletionService";
import {
  cleanThinkTags,
  cleanThinkTagsFromJSON,
} from "../../utils/ThinkTagCleaner";
import {
  CollapseStrategyDecision,
  CollapseStrategyParams,
  ICollapseStrategyService,
} from "./ICollapseStrategyService";

/**
 * Symbolic: Ollama implementation of collapse strategy service
 * This service determines the optimal collapse strategy for memory operations
 * using local Ollama models.
 */
export class OllamaCollapseStrategyService implements ICollapseStrategyService {
  constructor(private ollamaCompletionService: OllamaCompletionService) {
    console.log(
      `🦙 [OllamaCollapseStrategy] Constructor called with service:`,
      {
        serviceType: typeof this.ollamaCompletionService,
        hasCallModelWithFunctions:
          typeof this.ollamaCompletionService?.callModelWithFunctions,
        serviceConstructor: this.ollamaCompletionService?.constructor?.name,
        serviceKeys: this.ollamaCompletionService
          ? Object.getOwnPropertyNames(this.ollamaCompletionService)
          : "null",
      }
    );
  }

  /**
   * Ensures we have a valid OllamaCompletionService instance with the required method
   */
  private async ensureValidService(): Promise<OllamaCompletionService> {
    // Check if current service is valid
    if (
      this.ollamaCompletionService &&
      typeof this.ollamaCompletionService.callModelWithFunctions === "function"
    ) {
      return this.ollamaCompletionService;
    }

    console.warn(
      `🦙 [OllamaCollapseStrategy] Service invalid, attempting to recreate...`
    );

    try {
      // Import the required classes dynamically to avoid circular dependencies
      const { OllamaClientService } = await import(
        "../../services/ollama/neural/OllamaClientService"
      );
      const { OllamaCompletionService } = await import(
        "../../services/ollama/neural/OllamaCompletionService"
      );

      // Create new instances
      const ollamaClientService = new OllamaClientService();
      const newOllamaCompletionService = new OllamaCompletionService(
        ollamaClientService
      );

      // Verify the new service has the required method
      if (
        typeof newOllamaCompletionService.callModelWithFunctions === "function"
      ) {
        console.log(
          `🦙 [OllamaCollapseStrategy] Successfully recreated service`
        );
        this.ollamaCompletionService = newOllamaCompletionService;
        return newOllamaCompletionService;
      } else {
        throw new Error(
          "Recreated service still missing callModelWithFunctions method"
        );
      }
    } catch (error) {
      console.error(
        `🦙 [OllamaCollapseStrategy] Failed to recreate service:`,
        error
      );
      throw new Error(
        `Unable to create valid OllamaCompletionService: ${error}`
      );
    }
  }

  /**
   * Symbolic: Collapse strategy decision using Ollama
   */
  async decideCollapseStrategy(
    params: CollapseStrategyParams
  ): Promise<CollapseStrategyDecision> {
    try {
      // Ensure we have a valid service instance
      const validService = await this.ensureValidService();
      // Get model info
      const model = getOption(STORAGE_KEYS.OLLAMA_MODEL) ?? "qwen3:latest";

      // Get the decideCollapseStrategy schema from the registry
      const collapseStrategySchema = FunctionSchemaRegistry.getInstance().get(
        "decideCollapseStrategy"
      );

      if (!collapseStrategySchema) {
        console.error(
          "🦙 [OllamaCollapseStrategy] decideCollapseStrategy schema not found in registry"
        );
        return {
          deterministic: false,
          temperature: 0.7,
          justification: "Schema not found - using conservative fallback",
        };
      }

      const tools = [
        {
          type: "function" as const,
          function: collapseStrategySchema,
        },
      ];

      const systemPrompt = {
        role: "system" as const,
        content: `You are the Orchestrated Collapse Strategy System of the Orch-OS architecture.

THEORETICAL FOUNDATION:
- Penrose-Hameroff: Orchestrated Objective Reduction adapted for symbolic collapse
- Brescia: The mind doesn't compute—it collapses meaning through superposition

YOUR MISSION: Determine the optimal collapse strategy based on the cognitive state metrics.

AVAILABLE COLLAPSE STRATEGIES:

1. COLLAPSE BY DOMINANCE:
   - When: One interpretation is clearly stronger
   - Method: Preserve secondary interpretations as context
   - Use: Situations with clear hierarchy of relevance

2. COLLAPSE BY SYNTHESIS:
   - When: Multiple complementary interpretations exist
   - Method: Integrate into emergent synthesis
   - Use: When cores reinforce each other

3. COLLAPSE BY DIALECTIC:
   - When: Fundamental contradictions exist
   - Method: Transcend through dialectical resolution
   - Use: When opposites create productive tension

4. COLLAPSE BY CONTEXT:
   - When: Context determines relevance
   - Method: Select based on situational needs
   - Use: When user intent is highly specific

DECISION FACTORS:
- Emotional intensity indicates need for nuanced response
- Contradictions suggest dialectical approach
- Multiple active cores suggest synthesis
- Clear user intent suggests contextual collapse

Decide:
1. deterministic (true) vs probabilistic (false)
2. temperature (0.1-1.5)
3. justification for strategy
4. emergent properties detected`,
      };

      const userPrompt = {
        role: "user" as const,
        content: `COGNITIVE STATE METRICS:
Activated Cores: ${params.activatedCores.join(", ")}
Emotional Weight: ${params.averageEmotionalWeight.toFixed(2)}
Contradiction Score: ${params.averageContradictionScore.toFixed(2)}
User Input: "${params.originalText || "Not provided"}"
Language: ${getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR"}

ANALYZE: Which collapse strategy is optimal? Consider:
- Dominance: Is one core clearly primary?
- Synthesis: Do cores complement each other?
- Dialectic: Are there productive contradictions?
- Context: Does user intent require specific focus?

DECIDE: Provide strategy decision with justification in the specified language.`,
      };

      console.log(
        `🦙 [OllamaCollapseStrategy] Analyzing collapse strategy for cores: [${params.activatedCores.join(
          ", "
        )}]`
      );

      // Debug log before calling the method
      console.log(
        `🦙 [OllamaCollapseStrategy] About to call callModelWithFunctions:`,
        {
          serviceType: typeof validService,
          hasMethod: typeof validService.callModelWithFunctions,
          serviceInstance: !!validService,
          methodExists: "callModelWithFunctions" in validService,
        }
      );

      // Debug logging for models that might use alternative formats
      console.log(`🦙 [OllamaCollapseStrategy] Model: ${model}`);
      console.log(
        `🦙 [OllamaCollapseStrategy] System prompt:`,
        systemPrompt.content
      );
      console.log(
        `🦙 [OllamaCollapseStrategy] Tools:`,
        JSON.stringify(tools, null, 2)
      );

      const response = await validService.callModelWithFunctions({
        model: model,
        messages: [systemPrompt, userPrompt],
        tools: tools,
        // tool_choice is not supported yet by Ollama (future improvement)
        temperature: 0.1,
      });

      console.log(`🦙 [OllamaCollapseStrategy] Response received:`, {
        hasToolCalls: !!response.choices?.[0]?.message?.tool_calls,
        hasContent: !!response.choices?.[0]?.message?.content,
        toolCallsLength:
          response.choices?.[0]?.message?.tool_calls?.length || 0,
      });

      // Log raw response for debugging alternative formats
      if (response.choices?.[0]?.message) {
        console.log(
          `🦙 [OllamaCollapseStrategy] Raw response from ${model}:`,
          JSON.stringify(response.choices[0].message, null, 2)
        );
      }

      // Try to extract decision from tool calls
      const toolCalls = response.choices?.[0]?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        try {
          const rawArguments = toolCalls[0].function.arguments;

          // Clean think tags from arguments before parsing
          let args: any = {};
          if (typeof rawArguments === "string") {
            const cleanedArguments = cleanThinkTagsFromJSON(rawArguments);
            args = JSON.parse(cleanedArguments);
          } else if (
            typeof rawArguments === "object" &&
            rawArguments !== null
          ) {
            args = this.cleanObjectValues(rawArguments);
          }

          // Validate the parsed arguments for new format
          const hasDeterministic = typeof args.deterministic === "boolean";
          const hasJustification = typeof args.justification === "string";
          const hasTemperature = typeof args.temperature === "number";

          // Validate for legacy format (backward compatibility)
          const hasLegacyShouldCollapse =
            typeof args.shouldCollapse === "boolean";
          const hasLegacyReason = typeof args.reason === "string";
          const hasLegacyStrategy = typeof args.strategy === "string";

          if (hasDeterministic && hasJustification) {
            // Handle new field names
            console.log(
              `🦙 [OllamaCollapseStrategy] Successfully parsed collapse decision (new format, cleaned):`,
              {
                deterministic: args.deterministic,
                justification: args.justification.substring(0, 100) + "...",
                temperature: args.temperature,
              }
            );

            return {
              deterministic: args.deterministic,
              temperature: hasTemperature ? args.temperature : 0.1,
              justification: args.justification,
              userIntent: args.userIntent,
              emergentProperties: args.emergentProperties,
            };
          } else if (hasLegacyShouldCollapse && hasLegacyReason) {
            // Handle legacy field names for backward compatibility
            console.log(
              `🦙 [OllamaCollapseStrategy] Successfully parsed collapse decision (legacy format, cleaned):`,
              {
                shouldCollapse: args.shouldCollapse,
                reason: args.reason.substring(0, 100) + "...",
              }
            );

            return {
              deterministic: args.shouldCollapse,
              temperature: 0.1,
              justification: args.reason,
            };
          } else {
            console.warn(
              `🦙 [OllamaCollapseStrategy] Tool call missing required fields:`,
              {
                args,
                validation: {
                  hasDeterministic,
                  hasJustification,
                  hasTemperature,
                  hasLegacyShouldCollapse,
                  hasLegacyReason,
                  hasLegacyStrategy,
                },
              }
            );
          }
        } catch (parseError) {
          console.warn(
            `🦙 [OllamaCollapseStrategy] Failed to parse tool call arguments:`,
            {
              error: parseError,
              rawArguments: toolCalls[0].function.arguments,
              argumentsType: typeof toolCalls[0].function.arguments,
            }
          );
        }
      } else {
        console.log(
          `🦙 [OllamaCollapseStrategy] No tool calls found in response`
        );
      }

      // Fallback: use conservative strategy if no tool calls found
      console.warn(
        `🦙 [OllamaCollapseStrategy] No valid collapse decision found - using conservative fallback`
      );
      return {
        deterministic: false,
        temperature: 0.7,
        justification:
          "No valid tool call response - using conservative fallback",
      };
    } catch (error) {
      console.error(
        `🦙 [OllamaCollapseStrategy] Error deciding collapse strategy:`,
        error
      );
      return {
        deterministic: false,
        temperature: 0.7,
        justification: `Error in strategy decision: ${error}`,
      };
    }
  }

  /**
   * Helper method to clean think tags from object values recursively
   */
  private cleanObjectValues(obj: any): any {
    if (typeof obj === "string") {
      return cleanThinkTags(obj);
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanObjectValues(item));
    } else if (obj && typeof obj === "object") {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = this.cleanObjectValues(value);
      }
      return cleaned;
    }
    return obj;
  }

  /**
   * Fix malformed Unicode escapes in JSON strings
   * Common issue with Portuguese text from LLMs
   */
  private fixMalformedUnicodeEscapes(jsonString: string): string {
    // Create a more comprehensive fix for malformed Unicode
    let fixed = jsonString;

    // Common Portuguese character issues
    const replacements: Array<[RegExp, string]> = [
      // Process compound patterns first to avoid partial replacements
      [/redund\\u00an\\u00C7\\u00e3s/g, "redund\\u00e2ncias"], // redundâncias (process before \u00an)
      [/n\\u00fao /g, "n\\u00e3o "], // não (with space)
      [/varia\\u00dclibilidade/g, "variabilidade"], // variabilidade (process before \u00dc)
      [/contradi\\u00e7\\u00f3es/g, "contradi\\u00e7\\u00f5es"], // contradições

      // Then process individual patterns
      [/\\u00fdo/g, "\\u00ed"], // ído
      [/\\u00fao/g, "\\u00e3o"], // ão (keep the 'o')
      [/\\u00f5o/g, "\\u00f5"], // õo
      [/\\u00e7\\u00f3es/g, "\\u00e7\\u00f5es"], // ções
      [/\\u00e1\\u00e7/g, "\\u00e1"], // áç -> á
      [/\\u00f3\\u00e7/g, "\\u00e7"], // óç -> ç
      [/\\u00e9\\u00e7/g, "\\u00e9"], // éç -> é
      [/\\u00an/g, "\\u00e2n"], // ân (keep the 'n')
      [/\\u00en/g, "\\u00ean"], // ên (keep the 'n')
      [/\\u00on/g, "\\u00f4n"], // ôn (keep the 'n')
      [/\\u00dclibil/g, "\\u00fa"], // úlibil -> ú
      [/\\u00an\\u00C7\\u00e3s/g, "\\u00e2ncias"], // ânÇãs -> âncias (uppercase C7)
      [/\\u00an\\u00c7/gi, "\\u00e2"], // ânÇ -> â (handle uppercase Ç)
      [/\\u00e7\u00e3o/g, "\\u00e7\\u00e3o"], // ção
      [/mem\\u00f3ria/g, "mem\\u00f3ria"], // memória
      [/patternes/g, "patterns"], // fix common misspelling
    ];

    for (const [pattern, replacement] of replacements) {
      fixed = fixed.replace(pattern, replacement);
    }

    return fixed;
  }
}
