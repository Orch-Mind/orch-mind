// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { getOption, STORAGE_KEYS } from "../../../../../../services/StorageService";
import { buildIntegrationSystemPrompt } from "../../../../../../shared/utils/neuralPromptBuilder";
import { IMemoryService } from "../../../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../../../interfaces/openai/IOpenAIService";
import { Message } from "../../../interfaces/transcription/TranscriptionTypes";
import { NeuralIntegrationResult } from "../../../symbolic-cortex/integration/INeuralIntegrationService";
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
  private readonly MAX_TEMPERATURE = 0.7;

  constructor(
    private memoryService: IMemoryService,
    private llmService: IOpenAIService
  ) {}

  /**
   * Generate response using the selected backend
   * @param prompt The user's direct input message.
   * @param integrationResult The result from the neural integration service.
   * @param temporaryContext Optional temporary context for persona modulation.
   * @param conversationMessages Optional conversation history from the chat UI.
   * @param onStreamingChunk Optional callback for streaming chunks.
   */
  async generateResponse(
    prompt: string,
    integrationResult: NeuralIntegrationResult,
    temporaryContext?: string,
    conversationMessages?: Message[],
    onStreamingChunk?: (chunk: string) => void
  ): Promise<string> {
    // Validate temperature parameter
    const validatedTemperature = Math.max(
      this.MIN_TEMPERATURE,
      Math.min(this.MAX_TEMPERATURE, integrationResult.temperature)
    );

    if (integrationResult.temperature !== validatedTemperature) {
      LoggingUtils.logWarning(
        `[ResponseGenerator] Temperature ${integrationResult.temperature} was clamped to ${validatedTemperature}`
      );
    }

    symbolicCognitionTimelineLogger.logFusionInitiated();

    // Get the current conversation history (which is clean, without system prompts)
    const conversationHistory = this.memoryService.getConversationHistory();

    // QUERY EXPANDED: Retrieve additional context from memory based on the user's prompt
    LoggingUtils.logInfo(
      "🔍 [ResponseGenerator] Retrieving expanded context from memory..."
    );
    let expandedMemoryContext = "";
    try {
      const contextResults = await this.memoryService.queryExpandedMemory(
        prompt,
        [], // no specific keywords for neural mode
        8 // get top 8 relevant memories for richer context
      );

      if (contextResults && contextResults.trim().length > 0) {
        expandedMemoryContext = `\n\nEXPANDED CONTEXT FROM MEMORY:\n${contextResults}`;
        LoggingUtils.logInfo(
          `✅ [ResponseGenerator] Retrieved ${contextResults.length} chars of expanded context from memory`
        );
      } else {
        LoggingUtils.logInfo(
          "ℹ️ [ResponseGenerator] No relevant expanded context found in memory"
        );
      }
    } catch (memoryError) {
      LoggingUtils.logWarning(
        "⚠️ [ResponseGenerator] Error retrieving expanded memory context, proceeding without it: " +
          (memoryError instanceof Error
            ? memoryError.message
            : String(memoryError))
      );
    }

    // Build the dynamic system prompt using all available context (neural + expanded memory)
    const systemPromptContent =
      buildIntegrationSystemPrompt(
        integrationResult.neuralResults,
        getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE), // Language can be added here if needed
        integrationResult.strategyDecision,
        temporaryContext
      ) + expandedMemoryContext; // Add expanded memory context to system prompt

    const systemMessage: Message = {
      role: "system",
      content: systemPromptContent,
    };

    // Build the final messages array
    let messages: Message[];

    if (conversationMessages && conversationMessages.length > 0) {
      // Build messages with chat conversation history
      messages = this._buildMessagesWithChatHistory(
        prompt,
        conversationMessages,
        systemMessage
      );
    } else {
      // Build messages with standard conversation history
      messages = this._buildMessagesWithConversationHistory(
        prompt,
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

    return await this._generate(
      messages,
      validatedTemperature,
      onStreamingChunk
    );
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
    temperature: number,
    onStreamingChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const response = await this.llmService.streamOpenAIResponse(
        messages,
        temperature,
        onStreamingChunk
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
