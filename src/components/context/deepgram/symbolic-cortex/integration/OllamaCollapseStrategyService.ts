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
        content: `You are a collapse strategy engine. Decide the optimal collapse approach (deterministic or probabilistic) based on the metrics provided.

IMPORTANT: Some models may respond using this format:
<|python_tag|>{"function": "decideCollapseStrategy", "parameters": {"deterministic": true, "temperature": 0.3, "justification": "Your justification here"}}

The response MUST include:
- deterministic: boolean (true or false)
- temperature: number between 0.1 and 1.5
- justification: string explaining the decision`,
      };

      const userPrompt = {
        role: "user" as const,
        content: `LANGUAGE: ${
          getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "PT-BR"
        }
      
      Metrics:
      - cores: ${params.activatedCores.join(", ")}
      - emotion: ${params.averageEmotionalWeight.toFixed(2)}
      - contradiction: ${params.averageContradictionScore.toFixed(2)}
      - text: "${params.originalText || "Not provided"}"
      
      Please decide: deterministic/probabilistic, temperature, and justification (write justification in the language specified above).`,
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
          `🦙 [OllamaCollapseStrategy] No valid tool calls found, trying content fallback`
        );
      }

      // Fallback: try to parse from content
      const content = response.choices?.[0]?.message?.content;
      if (content) {
        console.log(
          `🦙 [OllamaCollapseStrategy] Attempting to parse from content:`,
          content.substring(0, 200) + "..."
        );
        try {
          // Clean think tags from content before processing
          const cleanedContent = cleanThinkTags(content);

          // Try alternative parsing formats (python_tag, pythonic, etc)
          // Various models may use these formats for function calling
          console.log(
            `🦙 [OllamaCollapseStrategy] Trying alternative format parsing (python_tag, pythonic)`
          );

          // Look for python_tag format first
          const pythonTagRegex = /<\|python_tag\|>\s*(\{[\s\S]*?\})/;
          const pythonTagMatch = cleanedContent.match(pythonTagRegex);

          if (pythonTagMatch) {
            console.log(`🦙 [OllamaCollapseStrategy] Found python_tag format`);
            try {
              const jsonData = JSON.parse(pythonTagMatch[1]);
              if (
                jsonData.function === "decideCollapseStrategy" &&
                jsonData.parameters
              ) {
                const params = jsonData.parameters;
                if (
                  typeof params.deterministic === "boolean" &&
                  params.justification
                ) {
                  return {
                    deterministic: params.deterministic,
                    temperature: params.temperature || 0.1,
                    justification: params.justification,
                    userIntent: params.userIntent,
                    emergentProperties: params.emergentProperties,
                  };
                }
              }
            } catch (e) {
              console.warn(
                `🦙 [OllamaCollapseStrategy] Failed to parse python_tag JSON:`,
                e
              );
            }
          }

          // Look for pythonic function calls like: decideCollapseStrategy(deterministic=True, temperature=0.3, ...)
          const pythonFunctionRegex = /decideCollapseStrategy\s*\(([^)]+)\)/;
          const pythonMatch = cleanedContent.match(pythonFunctionRegex);

          if (pythonMatch) {
            console.log(
              `🦙 [OllamaCollapseStrategy] Found pythonic function call:`,
              pythonMatch[0]
            );

            // Parse pythonic parameters
            const paramsString = pythonMatch[1];
            const params: any = {};

            // Match parameter=value pairs
            const paramRegex = /(\w+)\s*=\s*([^,]+)(?:,|$)/g;
            let paramMatch;

            while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
              const key = paramMatch[1];
              let value = paramMatch[2].trim();

              // Convert Python values to JavaScript
              if (value === "True") value = "true";
              if (value === "False") value = "false";
              if (value === "None") value = "null";

              // Remove quotes if present
              if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
              ) {
                value = value.slice(1, -1);
              }

              // Try to parse as JSON
              try {
                params[key] = JSON.parse(value);
              } catch {
                // If not valid JSON, keep as string
                params[key] = value;
              }
            }

            console.log(
              `🦙 [OllamaCollapseStrategy] Parsed pythonic params:`,
              params
            );

            // Validate and return
            if (
              typeof params.deterministic === "boolean" &&
              params.justification
            ) {
              return {
                deterministic: params.deterministic,
                temperature: params.temperature || 0.1,
                justification: params.justification,
                userIntent: params.userIntent,
                emergentProperties: params.emergentProperties,
              };
            }
          }

          // Try multiple JSON extraction strategies
          const jsonExtractionStrategies = [
            // Strategy 1: Look for JSON in code blocks
            /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g,
            // Strategy 2: Look for standalone JSON objects with deterministic
            /(\{[\s\S]*?"deterministic"[\s\S]*?\})/g,
            // Strategy 3: Look for standalone JSON objects with shouldCollapse (legacy)
            /(\{[\s\S]*?"shouldCollapse"[\s\S]*?\})/g,
            // Strategy 4: Look for any JSON object
            /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
          ];

          let decisionData = null;
          for (const regex of jsonExtractionStrategies) {
            const matches = [...cleanedContent.matchAll(regex)];
            for (const match of matches) {
              try {
                const candidate = JSON.parse(match[1]);

                // Check for new format
                if (
                  typeof candidate.deterministic === "boolean" &&
                  candidate.justification
                ) {
                  decisionData = candidate;
                  console.log(
                    `🦙 [OllamaCollapseStrategy] Successfully extracted decision JSON from content (new format, cleaned)`
                  );
                  break;
                }

                // Check for legacy format
                if (
                  typeof candidate.shouldCollapse === "boolean" &&
                  candidate.reason
                ) {
                  decisionData = {
                    deterministic: candidate.shouldCollapse,
                    justification: candidate.reason,
                    temperature: candidate.temperature || 0.1,
                  };
                  console.log(
                    `🦙 [OllamaCollapseStrategy] Successfully extracted decision JSON from content (legacy format, cleaned)`
                  );
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            if (decisionData) break;
          }

          if (decisionData) {
            return {
              deterministic: decisionData.deterministic,
              temperature: decisionData.temperature || 0.1,
              justification: decisionData.justification,
              userIntent: decisionData.userIntent,
              emergentProperties: decisionData.emergentProperties,
            };
          }
        } catch (parseError) {
          console.warn(
            `🦙 [OllamaCollapseStrategy] Failed to parse decision JSON from content:`,
            {
              error: parseError,
              contentPreview: content.substring(0, 300),
            }
          );
        }
      }

      // No fallback - throw error if all parsing failed
      console.error(
        `🦙 [OllamaCollapseStrategy] All parsing strategies failed for model: ${model}`
      );

      throw new Error(
        `Failed to parse collapse strategy decision from ${model}. Response content: ${
          content?.substring(0, 500) || "empty"
        }`
      );
    } catch (error) {
      console.error(
        "🦙 [OllamaCollapseStrategy] Error in collapse strategy decision:",
        error
      );

      // Re-throw the error with context
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Collapse strategy decision failed: ${String(error)}`);
      }
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
