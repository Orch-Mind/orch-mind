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
- Clear user intent suggests contextual collapse`,
      };

      const userPrompt = {
        role: "user" as const,
        content: `COGNITIVE STATE METRICS:
Activated Cores: ${params.activatedCores.join(", ")}
Emotional Weight: ${params.averageEmotionalWeight.toFixed(2)}
Contradiction Score: ${params.averageContradictionScore.toFixed(2)}
User Input: "${params.originalText || "Not provided"}"

ANALYZE: Which collapse strategy is optimal?
DECIDE: Provide deterministic/probabilistic, temperature (0.1-1.5), and justification.`,
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
