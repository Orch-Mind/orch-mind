// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { buildIntegrationSystemPrompt } from "../../../../../../shared/utils/neuralPromptBuilder";
import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../../../interfaces/openai/IOpenAIService";
import { Message } from "../../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../../utils/LoggingUtils";
import { cleanThinkTags } from "../../../utils/ThinkTagCleaner";
import symbolicCognitionTimelineLogger from "../../utils/SymbolicCognitionTimelineLoggerSingleton";

/**
 * Neural response cognitive generator
 * Responsible for generating responses using different AI backends
 */
export class ResponseGenerator {
  // Configuration constants
  private readonly MIN_TEMPERATURE = 0.1;
  private readonly MAX_TEMPERATURE = 1.5;

  constructor(
    private memoryService: IMemoryService,
    private llmService: IOpenAIService
  ) {}

  /**
   * Generate response using the selected backend
   * @param integratedPrompt The integrated prompt from neural processing
   * @param temperature Temperature for response generation (0.1-1.5)
   * @param temporaryContext Optional temporary context
   * @param conversationMessages Optional conversation messages
   */
  async generateResponse(
    integratedPrompt: string,
    temperature: number,
    temporaryContext?: string,
    conversationMessages?: Message[]
  ): Promise<string> {
    // Validate temperature parameter
    const validatedTemperature = Math.max(
      this.MIN_TEMPERATURE,
      Math.min(this.MAX_TEMPERATURE, temperature)
    );

    if (temperature !== validatedTemperature) {
      LoggingUtils.logWarning(
        `[ResponseGenerator] Temperature ${temperature} was clamped to ${validatedTemperature}`
      );
    }

    symbolicCognitionTimelineLogger.logFusionInitiated();

    // Get the current conversation history
    const conversationHistory = this.memoryService.getConversationHistory();

    // Prepare the appropriate system message based on context
    const systemMessage = this._prepareSystemMessage(temporaryContext);

    // Build the final messages array
    let messages: Message[];

    if (conversationMessages && conversationMessages.length > 0) {
      // Build messages with chat conversation history
      messages = this._buildMessagesWithChatHistory(
        integratedPrompt,
        conversationMessages,
        systemMessage
      );
    } else {
      // Build messages with standard conversation history
      messages = this._buildMessagesWithConversationHistory(
        integratedPrompt,
        conversationHistory,
        systemMessage
      );
    }

    // Log messages in development only
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🧠 [ResponseGenerator] Conversation History:",
        conversationHistory
      );
      console.log(
        "🧠 [ResponseGenerator] Conversation Messages:",
        conversationMessages
      );
      console.log("🧠 [ResponseGenerator] Messages:", messages);
    }

    return await this._generate(messages, validatedTemperature);
  }

  /**
   * Prepare the appropriate system message based on context
   */
  private _prepareSystemMessage(temporaryContext?: string): Message {
    if (temporaryContext?.trim()) {
      return {
        role: "system",
        content: `TEMPORARY COGNITIVE MODULATION
    
    THEORETICAL BASIS: Jung's directed thinking vs. passive association.
    Your cognitive processing should be modulated by the instructions below for this interaction cycle only.
    
    MODULATION TYPE: Directed symbolic processing with focused intention.
    INTEGRATION: Adapt these instructions while preserving your core Orch-OS symbolic identity.
    
    SPECIFIC INSTRUCTIONS:
    ${temporaryContext.trim()}
    
    REMEMBER: This is a temporary lens, not a replacement of your core symbolic architecture.`,
      };
    } else {
      return {
        role: "system",
        content: buildIntegrationSystemPrompt(),
      };
    }
  }

  /**
   * Build messages with standard conversation history
   */
  private _buildMessagesWithConversationHistory(
    prompt: string,
    conversationHistory: Message[],
    systemMessage: Message
  ): Message[] {
    const messages: Message[] = [];

    // Always start with our system message
    messages.push(systemMessage);

    // Add conversation history (excluding any existing system messages to avoid duplication)
    conversationHistory
      .filter((msg) => msg.role !== "system")
      .forEach((msg) => messages.push(msg));

    // Add the current prompt as the last user message
    messages.push({
      role: "user",
      content: prompt,
    });

    return messages;
  }

  /**
   * Build messages incorporating chat conversation history
   */
  private _buildMessagesWithChatHistory(
    prompt: string,
    conversationMessages: Message[],
    systemMessage: Message
  ): Message[] {
    const messages: Message[] = [systemMessage];

    // Add all conversation messages from chat
    // This includes user messages, assistant responses, and summary messages
    conversationMessages.forEach((msg) => {
      // Skip system messages that aren't summaries to avoid duplication
      if (
        msg.role === "system" &&
        !msg.content.includes("📋 **Conversation Summary**")
      ) {
        return; // Skip regular system messages
      }
      messages.push(msg);
    });

    // Add the current prompt as the last user message
    messages.push({
      role: "user",
      content: prompt,
    });

    return messages;
  }

  /**
   * Generate response using OpenAI backend
   */
  private async _generate(
    messages: Message[],
    temperature: number
  ): Promise<string> {
    try {
      const response = await this.llmService.streamOpenAIResponse(
        messages,
        temperature
      );

      LoggingUtils.logInfo(
        `🌡️ [ResponseGenerator] Generating response with temperature: ${temperature}`
      );

      // Clean think tags from the final response
      const cleanedResponse = cleanThinkTags(response.responseText);

      return cleanedResponse;
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
}
