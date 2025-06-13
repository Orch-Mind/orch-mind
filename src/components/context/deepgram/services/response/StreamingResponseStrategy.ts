// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IResponseGenerationStrategy, ResponseGenerationContext, ResponseGenerationResult } from "../../interfaces/response/IResponseGenerationStrategy";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { IMemoryService } from "../../interfaces/memory/IMemoryService";
import { LoggingUtils } from "../../utils/LoggingUtils";

/**
 * Strategy for generating responses using streaming
 * Used for final response generation in the neural integration pipeline
 */
export class StreamingResponseStrategy implements IResponseGenerationStrategy {
  constructor(
    private aiService: IOpenAIService,
    private memoryService: IMemoryService
  ) {}

  /**
   * Generate response using streaming approach
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

      // Stream the response
      const streamResponse = await this.aiService.streamOpenAIResponse(messages);

      return {
        response: streamResponse.responseText,
        messageId: streamResponse.messageId,
        metadata: {
          isComplete: streamResponse.isComplete,
          isDone: streamResponse.isDone
        }
      };
    } catch (error: any) {
      if (error.message?.includes("does not have access to model")) {
        LoggingUtils.logError(
          "Invalid model detected, falling back to gpt-4o-mini",
          error
        );
        // Clear invalid model and retry with default
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem("chatgptModel");
        }
        throw new Error(
          "Invalid model configuration. Please restart the application."
        );
      }
      throw error;
    }
  }

  /**
   * Get strategy name
   */
  getStrategyName(): string {
    return "StreamingResponse";
  }
}