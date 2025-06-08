// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../../../interfaces/openai/IOpenAIService";
import { Message } from "../../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../../utils/LoggingUtils";
import symbolicCognitionTimelineLogger from "../../utils/SymbolicCognitionTimelineLoggerSingleton";
import { ProcessorMode } from "./NeuralSignalEnricher";

// HuggingFace service interface (for dependency inversion)
interface IHuggingFaceService {
  generateResponse(messages: Message[]): Promise<{ response: string }>;
}

/**
 * Neural response cognitive generator
 * Responsible for generating responses using different AI backends
 */
export class ResponseGenerator {
  constructor(
    private memoryService: IMemoryService,
    private openAIService: IOpenAIService,
    private huggingFaceService?: IHuggingFaceService
  ) {}

  /**
   * Generate response using the selected backend
   */
  async generateResponse(
    mode: ProcessorMode,
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

    if (mode === "huggingface") {
      return await this._generateWithHuggingFace(messages);
    } else {
      return await this._generateWithOpenAI(messages);
    }
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
   * Generate response using HuggingFace backend
   */
  private async _generateWithHuggingFace(messages: Message[]): Promise<string> {
    if (this.huggingFaceService) {
      const response = await this.huggingFaceService.generateResponse(messages);
      return response.response;
    } else {
      // NO FALLBACK: Throw error if HuggingFace service is not available
      throw new Error(
        "HuggingFace service not available and NO FALLBACK to OpenAI will be attempted as per user requirements"
      );
    }
  }

  /**
   * Generate response using OpenAI backend
   */
  private async _generateWithOpenAI(messages: Message[]): Promise<string> {
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
