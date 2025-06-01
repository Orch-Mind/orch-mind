// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ICollapseStrategyService, CollapseStrategyParams, CollapseStrategyDecision } from './ICollapseStrategyService';
import { HuggingFaceLocalService } from '../../../../../services/huggingface/HuggingFaceLocalService';

/**
 * HuggingFace implementation of the collapse strategy service
 * Symbolic: Simulates function calling via prompt engineering to decide symbolic collapse
 */
export class HuggingFaceCollapseStrategyService implements ICollapseStrategyService {
  constructor(private huggingFaceService: HuggingFaceLocalService) { }

  /**
   * Gets the function definition for HuggingFace (simulated)
   * @returns Function definition for the simulated function calling
   */
  private getCollapseStrategyFunctionDefinition() {
    return {
      type: "function",
      function: {
        name: "decideCollapseStrategy",
        description: "Decides the symbolic collapse strategy (deterministic or not) based on emotional intensity, symbolic tension, and nature of the user's input.",
        parameters: {
          type: "object",
          properties: {
            activatedCores: {
              type: "array",
              items: { type: "string" },
              description: "Cores activated in this cognitive cycle."
            },
            averageEmotionalWeight: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Average emotional intensity across activated cores."
            },
            averageContradictionScore: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Average contradiction score among retrieved insights."
            },
            userIntent: {
              type: "object",
              description: "User intent weights for different categories. Each value represents the intensity/importance of that intent type (0-1).",
              properties: {
                practical: { type: "number", minimum: 0, maximum: 1, description: "Weight for practical intent." },
                analytical: { type: "number", minimum: 0, maximum: 1, description: "Weight for analytical intent." },
                reflective: { type: "number", minimum: 0, maximum: 1, description: "Weight for reflective intent." },
                existential: { type: "number", minimum: 0, maximum: 1, description: "Weight for existential intent." },
                symbolic: { type: "number", minimum: 0, maximum: 1, description: "Weight for symbolic intent." },
                emotional: { type: "number", minimum: 0, maximum: 1, description: "Weight for emotional intent." },
                narrative: { type: "number", minimum: 0, maximum: 1, description: "Weight for narrative intent." },
                mythic: { type: "number", minimum: 0, maximum: 1, description: "Weight for mythic intent." },
                trivial: { type: "number", minimum: 0, maximum: 1, description: "Weight for trivial intent." },
                ambiguous: { type: "number", minimum: 0, maximum: 1, description: "Weight for ambiguous intent." }
              }
            },
            emergentProperties: {
              type: "array",
              description: "Emergent properties detected in the neural responses, such as redundancies, contradictions, or patterns",
              items: {
                type: "string"
              }
            }
          },
          required: ["activatedCores", "averageEmotionalWeight", "averageContradictionScore", "userIntent", "emergentProperties"]
        }
      }
    };
  }

  /**
   * Decides the symbolic collapse strategy using HuggingFace local model
   * Symbolic: Simulates function calling via prompt engineering and parses JSON response
   */
  async decideCollapseStrategy(params: CollapseStrategyParams): Promise<CollapseStrategyDecision> {
    const functionDef = this.getCollapseStrategyFunctionDefinition();
    // Create a comprehensive prompt that describes the task
    const systemPrompt = `You are a specialized neural symbolic collapse analyzer within a cognitive neural framework.

     Your task is to determine the optimal symbolic collapse strategy (deterministic or probabilistic) based on cognitive parameters and detect any emergent properties in the neural response patterns.
     
     GUIDELINES FOR COLLAPSE STRATEGY:
     - Deterministic collapse (true) should be used when precise, logical, factual responses are needed
     - Probabilistic collapse (false) should be used when creative, exploratory, or nuanced responses are preferred
     - Consider activated neural cores: memory requires precision, metacognitive allows exploration
     - Higher emotional weight (>0.5) typically suggests probabilistic approach
     - Higher contradiction score (>0.5) typically suggests probabilistic approach
     - For user intent: practical/analytical intents favor deterministic, while symbolic/mythic favor probabilistic
     
     GUIDELINES FOR EMERGENT PROPERTIES DETECTION:
     - Detect redundancy patterns (e.g., "Low response diversity" when similar phrases repeat)
     - Identify cognitive dissonance when conflicting ideas coexist
     - Note emotional ambivalence when mixed feelings are expressed
     - Flag low complexity when responses are overly simplistic
     - Mark "Severe content redundancy" when multiple types of repetition are found
     
     Always use the decideCollapseStrategy function to provide your analysis.`;

    // Calculate cognitive complexity score for better decision making
    const complexityScore = Math.min(
      0.9, // Cap at 0.9 to avoid extreme values
      (params.activatedCores.length / 6) + // Number of cores relative to maximum
      (params.averageContradictionScore * 0.4) // Contradiction contributes to complexity
    );

    const userPrompt = `Analyze the following neural symbolic parameters and decide the appropriate collapse strategy:
    - Activated cores: ${params.activatedCores.join(', ')}
    - Average emotional weight: ${params.averageEmotionalWeight.toFixed(2)}
    - Average contradiction score: ${params.averageContradictionScore.toFixed(2)}
    - Cognitive complexity: ${complexityScore.toFixed(2)}
    ${params.originalText ? `- Original user query: "${params.originalText}"` : ''}
    
    ${params.originalText ? 'IMPORTANT: Analyze the original user query to infer whether the user intent is practical, analytical, reflective, existential, symbolic, emotional, narrative, mythic, trivial, or ambiguous. Use this inferred intent to guide your decision.' : ''}
    
    PART 1: COLLAPSE STRATEGY
    Determine if the collapse should be deterministic (consistent/predictable) or probabilistic (creative/variable). Higher emotional weight, contradiction, and complexity generally favor probabilistic approaches. Practical and analytical intents favor deterministic collapse, while reflective, existential, symbolic, emotional, and mythic intents favor probabilistic collapse.
    
    PART 2: EMERGENT PROPERTY DETECTION
    Carefully analyze the activated cores and overall patterns to identify possible emergent properties such as:
    - "Low response diversity" if you observe repetition of similar greetings or phrases
    - "Cognitive dissonance" if contradictory ideas appear in the activated cores
    - "Semantic redundancy" if similar paragraph starts or content appears multiple times
    - "Overemphasis on greeting" if multiple greetings are detected
    - "Excessive repetition" if the same information is presented in multiple ways
    - "Severe content redundancy" when multiple types of repetition are detected`;

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: userPrompt
      }
    ];

    try {
      const response = await this.huggingFaceService.generateWithFunctions(
        messages,
        [functionDef],
        { temperature: 0.2 }
      );

      // First check if we have tool_calls from the response
      if (response.tool_calls && Array.isArray(response.tool_calls) && response.tool_calls[0]?.function?.arguments) {
        try {
          // Extract the function arguments
          const functionArgs = JSON.parse(response.tool_calls[0].function.arguments);
          
          // Create the collapse strategy decision including the inferred userIntent and contextual metadata
          const decision: CollapseStrategyDecision = {
            deterministic: functionArgs.deterministic,
            temperature: typeof functionArgs.temperature === 'number' ? functionArgs.temperature : (functionArgs.deterministic ? 0.7 : 1.4),
            justification: functionArgs.justification || 'Decision based on context analysis.',
            userIntent: functionArgs.userIntent,
            emergentProperties: functionArgs.emergentProperties || []
          };
          
          // Return decision directly - logging will be handled in DefaultNeuralIntegrationService
          return decision;
        } catch (e) {
          // Failed to parse JSON, continue to fallback
        }
      }

      // Try to parse from content if tool_calls is not available or failed
      if (response.content) {
        const functionCallMatch = response.content.match(/<function_call>(.*?)<\/function_call>/s);
        if (functionCallMatch && functionCallMatch[1]) {
          try {
            // Extract the function arguments from the pattern match
            const functionArgs = JSON.parse(functionCallMatch[1]);
            
            // Create the collapse strategy decision including the inferred userIntent and contextual metadata
            const decision: CollapseStrategyDecision = {
              deterministic: functionArgs.deterministic,
              temperature: typeof functionArgs.temperature === 'number' ? functionArgs.temperature : (functionArgs.deterministic ? 0.7 : 1.4),
              justification: functionArgs.justification || 'Decision based on context analysis.',
              userIntent: functionArgs.userIntent,
              emergentProperties: functionArgs.emergentProperties || []
            };
            
            // Return decision directly - logging will be handled in DefaultNeuralIntegrationService
            return decision;
          } catch (e) {
            // Failed to parse JSON, continue to fallback
          }
        }
      }
      // Simple fallback if function calling fails
      const fallbackDecision: CollapseStrategyDecision = {
        deterministic: params.averageEmotionalWeight < 0.5,
        temperature: params.averageEmotionalWeight < 0.5 ? 0.7 : 1.4,
        justification: 'Fallback strategy based on emotional weight due to HuggingFace function calling failure.'
      };
      
      // Return fallback strategy - logging will be handled in DefaultNeuralIntegrationService
      return fallbackDecision;
    } catch (error) {
      // Handle error with simple fallback strategy
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in HuggingFace collapse strategy decision:", error);
      
      const errorFallbackDecision: CollapseStrategyDecision = {
        deterministic: params.averageEmotionalWeight < 0.5,
        temperature: params.averageEmotionalWeight < 0.5 ? 0.7 : 1.4,
        justification: `Fallback strategy based on emotional weight due to error: ${errorMessage.substring(0, 100)}`
      };
      
      return errorFallbackDecision;
    }
  }
}
