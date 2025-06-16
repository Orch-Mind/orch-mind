// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  CollapseStrategyDecision,
  CollapseStrategyParams,
  ICollapseStrategyService,
} from "./ICollapseStrategyService";

import { SUPPORTED_HF_BROWSER_MODELS } from "../../../../../services/huggingface/HuggingFaceLocalService";
import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { FunctionSchemaRegistry } from "../../services/function-calling/FunctionSchemaRegistry";

/**
 * Type for the OpenAI function definition structure
 */
interface AIFunctionDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * HuggingFace implementation of the collapse strategy service
 * Symbolic: Uses FunctionSchemaRegistry for centralized function definitions
 */
export class HuggingFaceCollapseStrategyService
  implements ICollapseStrategyService
{
  constructor(private huggingFaceService: IOpenAIService) {}

  /**
   * Gets the function definition from FunctionSchemaRegistry
   * @returns Function definition for the collapse strategy decision
   */
  private getCollapseStrategyFunctionDefinition(): AIFunctionDefinition {
    const schema = FunctionSchemaRegistry.getInstance().get(
      "decideCollapseStrategy"
    );

    if (!schema) {
      throw new Error(
        "🤗 [HuggingFaceCollapseStrategy] decideCollapseStrategy schema not found in registry"
      );
    }

    return {
      type: "function",
      function: schema,
    };
  }

  /**
   * Decides the symbolic collapse strategy by making an OpenAI function call
   * @param params Parameters to determine collapse strategy
   * @returns Strategy decision with deterministic flag, temperature and justification
   */
  async decideCollapseStrategy(
    params: CollapseStrategyParams
  ): Promise<CollapseStrategyDecision> {
    try {
      // Define available tools for the OpenAI call
      const tools = [this.getCollapseStrategyFunctionDefinition()];

      // 2. Prompts enxutos
      const systemPrompt = {
        role: "system" as const,
        content: `You are a collapse strategy engine. Decide the optimal collapse approach (deterministic or probabilistic) based on the metrics provided.`,
      };

      const userPrompt = {
        role: "user" as const,
        content: `Metrics:
- cores: ${params.activatedCores.join(", ")}
- emotion: ${params.averageEmotionalWeight.toFixed(2)}
- contradiction: ${params.averageContradictionScore.toFixed(2)}
- text: "${params.originalText || "Not provided"}"
Decide: deterministic/probabilistic, temperature, justification.`,
      };

      // Make the HuggingFace call using generic tools; conversion handled downstream
      const response = await this.huggingFaceService.callOpenAIWithFunctions({
        model:
          getOption(STORAGE_KEYS.HF_MODEL) || SUPPORTED_HF_BROWSER_MODELS[0], // Use HuggingFace model
        messages: [systemPrompt, userPrompt],
        tools,
        tool_choice: {
          type: "function",
          function: { name: "decideCollapseStrategy" },
        },
        temperature: 0.2, // Lower temperature for consistent reasoning about strategy
      });

      // Process the function call response
      if (
        response.choices &&
        response.choices[0]?.message?.tool_calls &&
        response.choices[0].message.tool_calls.length > 0 &&
        response.choices[0].message.tool_calls[0].function?.name ===
          "decideCollapseStrategy"
      ) {
        // Extract the function arguments
        const functionArgs = JSON.parse(
          response.choices[0].message.tool_calls[0].function.arguments as string
        );

        // Create the collapse strategy decision including the inferred userIntent and contextual metadata
        const decision: CollapseStrategyDecision = {
          deterministic: functionArgs.deterministic,
          temperature: functionArgs.temperature,
          justification: functionArgs.justification,
          userIntent: functionArgs.userIntent,
          emergentProperties: functionArgs.emergentProperties || [],
        };

        // Return decision directly - logging will be handled in DefaultNeuralIntegrationService
        return decision;
      }

      // Use fallback strategy for HuggingFace models that don't support complex function calling
      // This is expected behavior, not an error
      const fallbackDecision: CollapseStrategyDecision = {
        deterministic: params.averageEmotionalWeight < 0.5,
        temperature: params.averageEmotionalWeight < 0.5 ? 0.7 : 1.4,
        justification: "Using emotion-based strategy for HuggingFace model.",
      };

      // Return fallback strategy - logging will be handled in DefaultNeuralIntegrationService
      return fallbackDecision;
    } catch (error) {
      // Handle error with simple fallback strategy
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error in HuggingFace collapse strategy decision:", error);

      const errorFallbackDecision: CollapseStrategyDecision = {
        deterministic: params.averageEmotionalWeight < 0.5,
        temperature: params.averageEmotionalWeight < 0.5 ? 0.7 : 1.4,
        justification: `Fallback strategy based on emotional weight due to error: ${errorMessage.substring(
          0,
          100
        )}`,
      };

      // Return error fallback strategy - logging will be handled in DefaultNeuralIntegrationService
      return errorFallbackDecision;
    }
  }
}
