// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaCollapseStrategyService.ts
// Symbolic: Collapse strategy service using Ollama (cortex: ollama)

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import {
  buildCollapseStrategySystemPrompt,
  buildCollapseStrategyUserPrompt,
} from "../../../../../shared/utils/neuralPromptBuilder";
import { OllamaToolCallParser } from "../../../../../utils/OllamaToolCallParser";
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
          temperature: 0.5,
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
        content: buildCollapseStrategySystemPrompt(),
      };

      const userPrompt = {
        role: "user" as const,
        content: buildCollapseStrategyUserPrompt(
          params,
          getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR"
        ),
      };

      console.log(
        `🦙 [OllamaCollapseStrategy] Analyzing collapse strategy for cores: [${params.activatedCores.join(
          ", "
        )}]`
      );

      // Log detailed analysis of what we're evaluating
      console.log(`🦙 [OllamaCollapseStrategy] 📊 COLLAPSE ANALYSIS:`);
      console.log(
        `🦙 [OllamaCollapseStrategy]   • Total Cores: ${params.activatedCores.length}`
      );
      console.log(
        `🦙 [OllamaCollapseStrategy]   • Emotional Weight: ${params.averageEmotionalWeight.toFixed(
          3
        )}`
      );
      console.log(
        `🦙 [OllamaCollapseStrategy]   • Contradiction Score: ${params.averageContradictionScore.toFixed(
          3
        )}`
      );
      console.log(
        `🦙 [OllamaCollapseStrategy]   • Original Text: "${(
          params.originalText || ""
        ).substring(0, 100)}..."`
      );
      console.log(
        `🦙 [OllamaCollapseStrategy] 🎯 This service will evaluate ALL ${params.activatedCores.length} candidates and decide optimal collapse strategy`
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

          // Fix emergentProperties if it's a string (llama3.1 issue)
          if (typeof args.emergentProperties === "string") {
            try {
              args.emergentProperties = JSON.parse(args.emergentProperties);
            } catch {
              // If parsing fails, try to extract array elements
              const match = args.emergentProperties.match(/\[(.*)\]/);
              if (match) {
                args.emergentProperties = match[1]
                  .split(",")
                  .map((s: string) => s.trim().replace(/["']/g, ""));
              } else {
                // Fallback: split by comma
                args.emergentProperties = args.emergentProperties
                  .split(",")
                  .map((s: string) => s.trim());
              }
            }
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

            console.log(
              `🦙 [OllamaCollapseStrategy] ✅ DECISION REACHED: ${
                args.deterministic ? "DETERMINISTIC" : "PROBABILISTIC"
              } collapse of ${params.activatedCores.length} candidates`
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

      // Fallback: Try to parse alternative formats using OllamaToolCallParser
      const content = response.choices?.[0]?.message?.content;
      if (content) {
        console.log(
          `🦙 [OllamaCollapseStrategy] Attempting to parse alternative tool call format from content`
        );

        // Check if this might be gemma3 format or other alternative formats
        const parser = new OllamaToolCallParser();
        const parsedCalls = parser.parse(content);

        if (parsedCalls && parsedCalls.length > 0) {
          const call = parsedCalls[0];
          console.log(
            `🦙 [OllamaCollapseStrategy] Parsed tool call:`,
            JSON.stringify(call, null, 2)
          );

          if (call.function.name === "decideCollapseStrategy") {
            try {
              let args: any = {};
              if (typeof call.function.arguments === "string") {
                args = JSON.parse(call.function.arguments);
              } else {
                args = call.function.arguments;
              }

              console.log(
                `🦙 [OllamaCollapseStrategy] Parsed arguments:`,
                args
              );

              // Try to extract decision from parsed args
              if (
                typeof args.deterministic === "boolean" &&
                typeof args.justification === "string"
              ) {
                console.log(
                  `🦙 [OllamaCollapseStrategy] Successfully parsed collapse decision from alternative format`
                );

                return {
                  deterministic: args.deterministic,
                  temperature:
                    typeof args.temperature === "number"
                      ? args.temperature
                      : 0.7,
                  justification: args.justification,
                  userIntent: args.userIntent,
                  emergentProperties: args.emergentProperties,
                };
              } else {
                // Try to be more flexible with field names
                // Sometimes models might use slightly different field names
                const deterministic =
                  args.deterministic ?? args.shouldCollapse ?? false;
                const justification =
                  args.justification ??
                  args.reason ??
                  args.explanation ??
                  "No justification provided";
                const temperature = args.temperature ?? 0.7;

                if (typeof deterministic === "boolean" && justification) {
                  console.log(
                    `🦙 [OllamaCollapseStrategy] Successfully parsed collapse decision with flexible field mapping`
                  );

                  return {
                    deterministic,
                    temperature,
                    justification: String(justification),
                    userIntent: args.userIntent,
                    emergentProperties: args.emergentProperties,
                  };
                }
              }
            } catch (error) {
              console.warn(
                `🦙 [OllamaCollapseStrategy] Failed to parse alternative format arguments:`,
                error
              );
            }
          }
        } else if (content.includes("decideCollapseStrategy(")) {
          // Direct function call format - try manual parsing
          console.log(
            `🦙 [OllamaCollapseStrategy] Detected direct function call format, attempting manual parsing`
          );

          // Look for pattern like: decideCollapseStrategy(deterministic:true, temperature:0.3, justification:"...")
          // Use a more robust regex that handles nested parentheses in strings
          const match = content.match(
            /decideCollapseStrategy\s*\(((?:[^()"]|"[^"]*")*)\)/s
          );
          if (match) {
            try {
              const argsString = match[1];
              const args: any = {};

              console.log(
                `🦙 [OllamaCollapseStrategy] Parsing direct call arguments:`,
                argsString.substring(0, 100) + "..."
              );

              // Parse deterministic
              const deterministicMatch = argsString.match(
                /deterministic\s*:\s*(true|false)/i
              );
              if (deterministicMatch) {
                args.deterministic =
                  deterministicMatch[1].toLowerCase() === "true";
                console.log(
                  `🦙 [OllamaCollapseStrategy] Found deterministic: ${args.deterministic}`
                );
              }

              // Parse temperature
              const tempMatch = argsString.match(/temperature\s*:\s*([\d.]+)/);
              if (tempMatch) {
                args.temperature = parseFloat(tempMatch[1]);
                console.log(
                  `🦙 [OllamaCollapseStrategy] Found temperature: ${args.temperature}`
                );
              }

              // Parse justification (handle multi-line strings)
              const justMatch = argsString.match(
                /justification\s*:\s*"((?:[^"\\]|\\.)*)"/s
              );
              if (justMatch) {
                args.justification = justMatch[1];
                console.log(
                  `🦙 [OllamaCollapseStrategy] Found justification: ${args.justification.substring(
                    0,
                    50
                  )}...`
                );
              } else {
                console.log(
                  `🦙 [OllamaCollapseStrategy] No justification match found`
                );
              }

              if (
                typeof args.deterministic === "boolean" &&
                args.justification
              ) {
                console.log(
                  `🦙 [OllamaCollapseStrategy] Successfully parsed from direct function call format`
                );

                return {
                  deterministic: args.deterministic,
                  temperature: args.temperature ?? 0.5,
                  justification: args.justification,
                };
              }
            } catch (error) {
              console.warn(
                `🦙 [OllamaCollapseStrategy] Failed to manually parse direct function call:`,
                error
              );
            }
          }
        }
      }

      // Fallback: use conservative strategy if no tool calls found
      console.warn(
        `🦙 [OllamaCollapseStrategy] No valid collapse decision found - using conservative fallback`
      );
      return {
        deterministic: false,
        temperature: 0.5,
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
        temperature: 0.5,
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
