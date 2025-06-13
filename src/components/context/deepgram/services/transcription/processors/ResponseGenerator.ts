// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../../../interfaces/openai/IOpenAIService";
import { Message } from "../../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../../utils/LoggingUtils";
import symbolicCognitionTimelineLogger from "../../utils/SymbolicCognitionTimelineLoggerSingleton";

/**
 * Neural response cognitive generator
 * Responsible for generating responses using different AI backends
 */
export class ResponseGenerator {
  constructor(
    private memoryService: IMemoryService,
    private openAIService: IOpenAIService
  ) {}

  /**
   * Generate response using the selected backend
   */
  async generateResponse(
    integratedPrompt: string,
    temporaryContext?: string
  ): Promise<string> {
    symbolicCognitionTimelineLogger.logFusionInitiated();

    // Prepare context messages (shared by both backends)
    const contextMessages = this._prepareContextMessages(temporaryContext);

    if (contextMessages.length > 0) {
      this.memoryService.addContextToHistory(contextMessages);
    }

    const conversationHistory = this.memoryService.getConversationHistory();
    
    const messages = this.memoryService.buildPromptMessagesForModel(
      integratedPrompt,
      conversationHistory
    );

    return await this._generate(messages);
  }



  /**
   * Prepare context messages for processing
   */
  private _prepareContextMessages(temporaryContext?: string): Message[] {
    const contextMessages: Message[] = [];

    if (temporaryContext?.trim()) {
      contextMessages.push({
        role: "developer",
        content: `🧠 Temporary instructions:\n${temporaryContext.trim()}`,
      });
    }

    return contextMessages;
  }

  /**
   * Generate response using OpenAI backend
   */
  private async _generate(messages: Message[]): Promise<string> {
    try {
      const response = await this.openAIService.streamOpenAIResponse(messages);
      return response.responseText;
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
