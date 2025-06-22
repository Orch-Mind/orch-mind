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
        content: `You are the Collapse-Strategy Orchestrator in Orch-OS.

Choose the best symbolic collapse approach:
- Dominance      (clear hierarchy)
- Synthesis      (complementary cores)
- Dialectic      (productive contradictions)
- Context        (user intent focus)

Call decideCollapseStrategy with:
• deterministic          (true/false)
• temperature            (0.1–1.5)
• justification          (in LANGUAGE specified in the user prompt, mention the approach)
• emotionalIntensity     (0–1, optional)
• emergentProperties     (string[], optional)
• userIntent             (object: technical, philosophical, creative, emotional, relational, all 0–1, optional)

Respond only via the tool call.`,
      };

      const userPrompt = {
        role: "user" as const,
        content: `
      COGNITIVE METRICS:
      Activated Cores: ${params.activatedCores.join(", ")}
      Emotional Weight: ${params.averageEmotionalWeight.toFixed(2)}
      Contradiction Score: ${params.averageContradictionScore.toFixed(2)}
      
      USER INPUT:
      "${params.originalText || "Not provided"}"
      
      LANGUAGE:
      ${getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR"}
      
      ANALYZE:
      Select the most suitable collapse approach: dominance, synthesis, dialectic, or context.
      
      DECIDE:
      Call decideCollapseStrategy with:
      - deterministic          (true or false)
      - temperature           (0.1–1.5)
      - justification         (short, in ${getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR"}, referencing the chosen approach)
      - emotionalIntensity    (optional, 0–1)
      - emergentProperties    (optional, string array)
      - userIntent            (optional, object: technical, philosophical, creative, emotional, relational — all 0–1)
      
      Respond only via the tool call.
      `
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
}
