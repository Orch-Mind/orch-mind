// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IResponseGenerationStrategy, ResponseGenerationContext, ResponseGenerationResult } from "../../interfaces/response/IResponseGenerationStrategy";
import { IFunctionCallingService } from "../../interfaces/function-calling/IFunctionCallingService";
import { IMemoryService } from "../../interfaces/memory/IMemoryService";
import { FunctionSchemaRegistry } from "../function-calling/FunctionSchemaRegistry";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { getOption, STORAGE_KEYS } from "../../../../../services/StorageService";

/**
 * Strategy for generating responses using function calling
 * Can be used to structure responses or call specific functions
 */
export class FunctionCallingResponseStrategy implements IResponseGenerationStrategy {
  private schemaRegistry: FunctionSchemaRegistry;

  constructor(
    private functionCallingService: IFunctionCallingService,
    private memoryService: IMemoryService
  ) {
    this.schemaRegistry = FunctionSchemaRegistry.getInstance();
  }

  /**
   * Generate response using function calling approach
   */
  async generateResponse(
    prompt: string,
    context: ResponseGenerationContext
  ): Promise<ResponseGenerationResult> {
    try {
      // Build messages for the model
      const messages = this.memoryService.buildPromptMessagesForModel(
        prompt,
        context.messages
      );

      // Define a function for structured response generation
      const responseFunction = {
        name: "generateStructuredResponse",
        description: "Generate a structured response with metadata",
        parameters: {
          type: "object",
          properties: {
            response: {
              type: "string",
              description: "The generated response text"
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confidence level of the response"
            },
            metadata: {
              type: "object",
              description: "Additional metadata about the response",
              properties: {
                responseType: {
                  type: "string",
                  enum: ["informative", "reflective", "creative", "analytical"],
                  description: "Type of response generated"
                },
                emotionalTone: {
                  type: "string",
                  description: "Emotional tone of the response"
                }
              }
            }
          },
          required: ["response"]
        }
      };

      // Call with function
      const result = await this.functionCallingService.callWithFunctions(
        messages,
        [responseFunction],
        {
          model: getOption(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-4o-mini',
          temperature: context.language ? 0.7 : 0.8,
          toolChoice: {
            type: "function",
            function: { name: "generateStructuredResponse" }
          }
        }
      );

      // Extract response from function call
      if (result.choices[0]?.message?.tool_calls?.[0]) {
        const functionCall = result.choices[0].message.tool_calls[0];
        const args = JSON.parse(functionCall.function.arguments);
        
        return {
          response: args.response,
          messageId: Date.now().toString(),
          metadata: {
            ...args.metadata,
            confidence: args.confidence,
            functionCalled: true
          }
        };
      }

      // Fallback to content if no function call
      return {
        response: result.choices[0]?.message?.content || "No response generated",
        messageId: Date.now().toString(),
        metadata: {
          functionCalled: false
        }
      };
    } catch (error) {
      LoggingUtils.logError("Error in function calling response strategy", error);
      throw error;
    }
  }

  /**
   * Get strategy name
   */
  getStrategyName(): string {
    return "FunctionCallingResponse";
  }
}