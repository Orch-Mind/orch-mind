// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IFunctionCallingService, FunctionCallOptions, FunctionCallResponse } from "../../interfaces/function-calling/IFunctionCallingService";
import { IFunctionDefinition, AIFunctionDefinition } from "../../interfaces/function-calling/IFunctionDefinition";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { Message } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";

/**
 * Adapter that implements function calling using the existing IOpenAIService
 * This allows us to gradually migrate to the new architecture
 */
export class FunctionCallingAdapter implements IFunctionCallingService {
  constructor(private aiService: IOpenAIService) {}

  /**
   * Call AI model with function definitions
   */
  async callWithFunctions(
    messages: Message[],
    functions: IFunctionDefinition[],
    options?: FunctionCallOptions
  ): Promise<FunctionCallResponse> {
    try {
      // Convert function definitions to AI provider format
      const tools = functions.map(func => ({
        type: "function" as const,
        function: func
      }));

      // Map messages to expected format
      const mappedMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call the underlying service
      const response = await this.aiService.callOpenAIWithFunctions({
        model: options?.model || '',
        messages: mappedMessages,
        tools: tools,
        tool_choice: options?.toolChoice,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens
      });

      return response;
    } catch (error) {
      LoggingUtils.logError("Error in function calling adapter", error);
      throw error;
    }
  }

  /**
   * Check if the service supports function calling
   */
  supportsFunctionCalling(): boolean {
    // Both OpenAI and HuggingFace facades implement callOpenAIWithFunctions
    return typeof this.aiService.callOpenAIWithFunctions === 'function';
  }
}