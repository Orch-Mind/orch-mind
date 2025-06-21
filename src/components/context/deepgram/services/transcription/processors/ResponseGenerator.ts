// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

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
  constructor(
    private memoryService: IMemoryService,
    private llmService: IOpenAIService
  ) {}

  /**
   * Generate response using the selected backend
   */
  async generateResponse(
    integratedPrompt: string,
    temporaryContext?: string,
    conversationMessages?: Message[]
  ): Promise<string> {
    symbolicCognitionTimelineLogger.logFusionInitiated();

    // Prepare context messages (shared by both backends)
    const contextMessages = this._prepareContextMessages(temporaryContext);

    if (contextMessages.length > 0) {
      this.memoryService.addContextToHistory(contextMessages);
    }

    const conversationHistory = this.memoryService.getConversationHistory();

    // If we have conversation messages from the chat (including summaries), use them
    // Otherwise fall back to the default conversation history
    let messages: Message[];

    if (conversationMessages && conversationMessages.length > 0) {
      // Build messages with chat conversation history
      messages = this._buildMessagesWithChatHistory(
        integratedPrompt,
        conversationMessages,
        conversationHistory
      );
    } else {
      // Use default memory service method
      messages = this.memoryService.buildPromptMessagesForModel(
        integratedPrompt,
        conversationHistory
      );
    }

    console.log(
      "🧠 [ResponseGenerator] Conversation History:",
      conversationHistory
    );
    console.log(
      "🧠 [ResponseGenerator] Conversation Messages:",
      conversationMessages
    );
    console.log("🧠 [ResponseGenerator] Messages:", messages);

    return await this._generate(messages);
  }

  /**
   * Prepare context messages for processing
   */
  private _prepareContextMessages(temporaryContext?: string): Message[] {
    const contextMessages: Message[] = [];

    if (temporaryContext?.trim()) {
      contextMessages.push({
        role: "system",
        content: `TEMPORARY COGNITIVE MODULATION:
        
THEORETICAL BASIS: Jung's concept of directed thinking vs. passive association
Your cognitive processing should be temporarily modulated by these specific instructions.

MODULATION TYPE: Directed symbolic processing with focused intention
DURATION: This current interaction cycle only
INTEGRATION: Maintain coherence with your core identity while adapting to these parameters

SPECIFIC INSTRUCTIONS:
${temporaryContext.trim()}

REMEMBER: These instructions create a temporary lens through which to process information, not a replacement of your core cognitive architecture.`,
      });
    }

    return contextMessages;
  }

  /**
   * Build messages incorporating chat conversation history
   */
  private _buildMessagesWithChatHistory(
    prompt: string,
    chatMessages: Message[],
    systemHistory: Message[]
  ): Message[] {
    const messages: Message[] = [];

    // Start with system message from history
    if (systemHistory.length > 0 && systemHistory[0].role === "system") {
      messages.push(systemHistory[0]);
    }

    // Add chat messages (includes summaries as system messages)
    // Filter out any duplicate system messages
    const systemMessageContent = messages[0]?.content;
    chatMessages.forEach((msg) => {
      // Skip if it's a duplicate system message
      if (msg.role === "system" && msg.content === systemMessageContent) {
        return;
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
  private async _generate(messages: Message[]): Promise<string> {
    try {
      const response = await this.llmService.streamOpenAIResponse(messages);

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
