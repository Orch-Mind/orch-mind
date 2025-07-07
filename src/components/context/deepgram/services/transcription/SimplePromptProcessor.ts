// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  buildSimpleSystemPrompt,
  buildSimpleUserPrompt,
} from "../../../../../shared/utils/neuralPromptBuilder";
import { LoggingUtils } from "../../utils/LoggingUtils";
import {
  getOption,
  STORAGE_KEYS,
} from "./../../../../../services/StorageService";

// Services interfaces
import { IMemoryService } from "../../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { ITranscriptionStorageService } from "../../interfaces/transcription/ITranscriptionStorageService";
import { ISpeakerIdentificationService } from "../../interfaces/utils/ISpeakerIdentificationService";
import { IUIUpdateService } from "../../interfaces/utils/IUIUpdateService";

// Neural processors (reusing for conversation management)
import { SessionManager, TranscriptionExtractor } from "./processors";

/**
 * Simple response from prompt processing
 */
export interface SimpleProcessingResponse {
  response: string;
}

/**
 * Simple prompt processor for direct LLM communication
 * Used when quantum processing is disabled for faster, simpler responses
 * Includes context retrieval from DuckDB and result saving
 */
export class SimplePromptProcessor {
  private isProcessingPrompt: boolean = false;
  private currentLanguage: string;
  private processingStatusInterval: NodeJS.Timeout | null = null;

  // Reused processors for conversation management
  private transcriptionExtractor!: TranscriptionExtractor;
  private sessionManager!: SessionManager;

  constructor(
    private storageService: ITranscriptionStorageService,
    private memoryService: IMemoryService,
    private llmService: IOpenAIService,
    private uiService: IUIUpdateService,
    private speakerService: ISpeakerIdentificationService
  ) {
    this.currentLanguage = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR";
    this._initializeProcessors();
  }

  /**
   * Initialize minimal processors for conversation management
   */
  private _initializeProcessors(): void {
    this.transcriptionExtractor = new TranscriptionExtractor(
      this.storageService
    );
    this.sessionManager = new SessionManager();
  }

  /**
   * Show simple processing status with animated indicator
   */
  private showProcessingStatus(message: string): void {
    // Clear any existing interval
    if (this.processingStatusInterval) {
      clearInterval(this.processingStatusInterval);
    }

    let dotCount = 0;
    const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

    const updateStatus = () => {
      const spinner = spinnerChars[dotCount % spinnerChars.length];
      const dots = ".".repeat((dotCount % 3) + 1);
      const statusMessage = `⚡ ${message}${dots} ${spinner}`;

      // Update processing status via window function
      if (
        typeof window !== "undefined" &&
        (window as any).__updateProcessingStatus
      ) {
        (window as any).__updateProcessingStatus(statusMessage);
      }

      dotCount++;
    };

    // Initial update
    updateStatus();

    // Update every 400ms for smooth animation
    this.processingStatusInterval = setInterval(updateStatus, 400);
  }

  /**
   * Clear processing status animation
   */
  private clearProcessingStatus(): void {
    if (this.processingStatusInterval) {
      clearInterval(this.processingStatusInterval);
      this.processingStatusInterval = null;
    }

    // Clear status display
    if (
      typeof window !== "undefined" &&
      (window as any).__updateProcessingStatus
    ) {
      (window as any).__updateProcessingStatus("");
    }
  }

  /**
   * Process transcription with simple LLM completion
   * No neural processing, just direct response
   */
  async processTranscription(
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    await this._processTranscriptionPrompt(
      temporaryContext,
      conversationMessages
    );
  }

  /**
   * Process direct message from chat (no transcription)
   * @param message The message from chat input
   * @param temporaryContext Optional additional context
   * @param conversationMessages Optional conversation messages from chat
   */
  async processDirectMessage(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    await this._processDirectMessage(
      message,
      temporaryContext,
      conversationMessages
    );
  }

  /**
   * Process a direct message from chat interface
   */
  private async _processDirectMessage(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessingPrompt) {
      LoggingUtils.logWarning(
        "⚠️ [SIMPLE_MODE] Blocking prompt request: Already processing another prompt"
      );
      // Show user feedback for blocked request
      if (this.uiService.notifyPromptError) {
        this.uiService.notifyPromptError(
          "Please wait for the current request to complete before sending another message."
        );
      }
      return;
    }

    // Show initial processing message
    this.uiService.updateUI({ aiResponse: "Processing..." });
    this.showProcessingStatus("Processing your message");

    try {
      this.isProcessingPrompt = true;

      // Ensure LLM service is ready
      if (!(await this.llmService.ensureOpenAIClient())) {
        this.clearProcessingStatus();
        return;
      }

      LoggingUtils.logInfo("⚡ [SIMPLE_MODE] Processing direct message");

      // Notify processing start
      this.uiService.notifyPromptProcessingStarted(temporaryContext);

      // Process using simple completion
      const result = await this._executeSimpleCompletion(
        message,
        temporaryContext,
        conversationMessages
      );

      // Update UI and complete processing
      this.uiService.updateUI({ aiResponse: result.response });
      this.uiService.notifyPromptComplete(result.response);
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingUtils.logError("❌ [SIMPLE_MODE] Error processing message", error);
      this.uiService.updateUI({ aiResponse: `Error: ${errorMessage}` });
      this.uiService.notifyPromptError(errorMessage);
    } finally {
      this.isProcessingPrompt = false;
      this.clearProcessingStatus();
      LoggingUtils.logInfo("✅ [SIMPLE_MODE] Message processing completed");
    }
  }

  /**
   * Main transcription processing - simple mode
   */
  private async _processTranscriptionPrompt(
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessingPrompt) {
      LoggingUtils.logWarning(
        "⚠️ [SIMPLE_MODE] Blocking transcription request: Already processing"
      );
      return;
    }

    // Show initial processing message
    this.uiService.updateUI({ aiResponse: "Processing..." });
    this.showProcessingStatus("Processing transcription");

    try {
      this.isProcessingPrompt = true;

      // Ensure LLM service is ready
      if (!(await this.llmService.ensureOpenAIClient())) {
        this.clearProcessingStatus();
        return;
      }

      // Validate and extract transcriptions
      const hasTranscriptions = this.storageService.hasValidTranscriptions();

      if (!hasTranscriptions) {
        LoggingUtils.logWarning("No transcription detected");

        // Verify if there is text in lastTranscription
        const lastTranscription = this.storageService.getLastTranscription();
        if (lastTranscription) {
          LoggingUtils.logInfo(
            `Using last known transcription: "${lastTranscription}"`
          );
        } else {
          // Notify error if there is no transcription
          this.uiService.notifyPromptError(
            "No transcription detected for processing"
          );
          LoggingUtils.logInfo(`No transcription detected for processing`);
          this.clearProcessingStatus();
          return;
        }
      }

      // Notify processing start
      this.uiService.notifyPromptProcessingStarted(temporaryContext);

      // Extract new transcription lines AND mark as sent atomically
      const extractedLines = this.transcriptionExtractor.extractAndMarkAsSent();
      let promptText: string | null = extractedLines;

      if (!promptText || promptText.trim().length === 0) {
        LoggingUtils.logInfo("No new transcription to send.");
        this.clearProcessingStatus();
        return;
      }

      LoggingUtils.logInfo(
        `⚡ [SIMPLE_MODE] Processing transcription: "${promptText.substring(
          0,
          50
        )}..."${temporaryContext ? " with additional context" : ""}`
      );

      // Process using simple completion
      const result = await this._executeSimpleCompletion(
        promptText,
        temporaryContext,
        conversationMessages
      );

      // Update UI and complete processing
      this.uiService.updateUI({ aiResponse: result.response });
      this.uiService.notifyPromptComplete(result.response);

      // Update UI to show only new transcriptions (empty initially)
      if (this.storageService.updateUIWithNewTranscriptions) {
        this.storageService.updateUIWithNewTranscriptions();
      }
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingUtils.logError("❌ [SIMPLE_MODE] Error processing prompt", error);
      this.uiService.updateUI({ aiResponse: `Error: ${errorMessage}` });
      this.uiService.notifyPromptError(errorMessage);
    } finally {
      this.isProcessingPrompt = false;
      this.clearProcessingStatus();
      LoggingUtils.logInfo(
        "✅ [SIMPLE_MODE] Transcription processing completed"
      );
    }
  }

  /**
   * Execute simple completion without neural processing using OllamaCompletionService
   * Includes context retrieval from DuckDB and result saving
   */
  private async _executeSimpleCompletion(
    prompt: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<SimpleProcessingResponse> {
    try {
      // STEP 1: Retrieve context from DuckDB memory
      LoggingUtils.logInfo(
        "🔍 [SIMPLE_MODE] Retrieving context from memory..."
      );
      this.showProcessingStatus("Retrieving context");

      let memoryContext = "";
      try {
        // Search for relevant context using the prompt as query
        const contextResults = await this.memoryService.queryExpandedMemory(
          prompt,
          [], // no specific keywords for simple mode
          5 // get top 5 relevant memories
        );

        if (contextResults && contextResults.trim().length > 0) {
          memoryContext = `\n\nRELEVANT CONTEXT FROM MEMORY:\n${contextResults}`;
          LoggingUtils.logInfo(
            `✅ Retrieved ${contextResults.length} chars of context from memory`
          );
        } else {
          LoggingUtils.logInfo("ℹ️ No relevant context found in memory");
        }
      } catch (memoryError) {
        LoggingUtils.logWarning(
          "⚠️ Error retrieving memory context, proceeding without it: " +
            (memoryError instanceof Error
              ? memoryError.message
              : String(memoryError))
        );
      }

      // STEP 2: Build enhanced system prompt with context
      LoggingUtils.logInfo("📝 [SIMPLE_MODE] Building prompt...");
      this.showProcessingStatus("Building prompt");

      const baseSystemPrompt = buildSimpleSystemPrompt(this.currentLanguage);
      const enhancedSystemPrompt = baseSystemPrompt + memoryContext;

      const userPrompt = buildSimpleUserPrompt(
        prompt,
        temporaryContext,
        this.currentLanguage
      );

      // STEP 3: Get conversation history
      const conversationHistory = this.memoryService.getConversationHistory();

      // Prepare messages for completion (format compatible with IOpenAIService)
      const messages = [
        { role: "system", content: enhancedSystemPrompt, speaker: "system" },
        // Add conversation history (excluding system messages to avoid duplication)
        ...conversationHistory.filter((msg) => msg.role !== "system"),
        // Add conversation messages from chat if provided
        ...(conversationMessages || []),
        { role: "user", content: userPrompt, speaker: "user" },
      ];

      // STEP 4: Generate response with streaming
      LoggingUtils.logInfo("🎯 [SIMPLE_MODE] Generating response...");
      this.showProcessingStatus("Generating response");

      let firstChunkReceived = false;
      let accumulatedResponse = "";

      // Create streaming chunk handler
      const onStreamingChunk = (chunk: string) => {
        if (!chunk || chunk.trim() === "") return;

        // On first real chunk, clear processing status and notify streaming started
        if (!firstChunkReceived) {
          firstChunkReceived = true;

          // Clear processing status animation
          this.clearProcessingStatus();

          if (this.uiService.notifyStreamingStarted) {
            this.uiService.notifyStreamingStarted();
          }
        }

        // Accumulate response
        accumulatedResponse += chunk;

        // Send chunk via IPC if available
        if (this.uiService.notifyStreamingChunk) {
          this.uiService.notifyStreamingChunk(chunk);
        }
      };

      // Try streaming first
      const response = await this.llmService.streamOpenAIResponse(
        messages,
        0.7, // temperature
        onStreamingChunk
      );

      // Notify streaming complete
      if (this.uiService.notifyStreamingComplete) {
        this.uiService.notifyStreamingComplete();
      }

      // Use accumulated response if available, otherwise use the returned response
      const finalResponse = accumulatedResponse || response.responseText || "";

      // STEP 5: Save interaction to memory and conversation history
      LoggingUtils.logInfo("💾 [SIMPLE_MODE] Saving interaction...");

      try {
        // Add user message to conversation history
        this.memoryService.addToConversationHistory({
          role: "user",
          content: prompt,
        });

        // Add assistant response to conversation history
        this.memoryService.addToConversationHistory({
          role: "assistant",
          content: finalResponse,
        });

        // Save to long-term memory (DuckDB) using direct save method
        await this.memoryService.saveDirectInteraction(
          prompt,
          finalResponse,
          this.speakerService.getPrimaryUserSpeaker(),
          true // forceSave = true for immediate persistence
        );

        LoggingUtils.logInfo("✅ Interaction saved to memory successfully");
      } catch (saveError) {
        LoggingUtils.logError(
          "❌ Error saving interaction to memory: " +
            (saveError instanceof Error ? saveError.message : String(saveError))
        );
        // Don't throw here - response was successful, just saving failed
      }

      return {
        response: finalResponse,
      };
    } catch (error) {
      LoggingUtils.logError("❌ [SIMPLE_MODE] Error in completion", error);

      // Fallback: try without streaming using callOpenAIWithFunctions
      try {
        LoggingUtils.logInfo("🔄 [SIMPLE_MODE] Attempting fallback completion");
        this.showProcessingStatus("Retrying with fallback");

        // Build simpler fallback messages
        const fallbackSystemPrompt = buildSimpleSystemPrompt(
          this.currentLanguage
        );
        const fallbackUserPrompt = buildSimpleUserPrompt(
          prompt,
          temporaryContext,
          this.currentLanguage
        );

        const fallbackMessages = [
          { role: "system", content: fallbackSystemPrompt },
          { role: "user", content: fallbackUserPrompt },
        ];

        const fallbackResponse = await this.llmService.callOpenAIWithFunctions({
          model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "gemma3:latest",
          messages: fallbackMessages,
          temperature: 0.7,
          max_tokens: 4000,
        });

        const fallbackContent =
          fallbackResponse.choices[0]?.message?.content ||
          "Error generating response";

        // Still try to save the interaction in fallback mode
        try {
          this.memoryService.addToConversationHistory({
            role: "user",
            content: prompt,
          });
          this.memoryService.addToConversationHistory({
            role: "assistant",
            content: fallbackContent,
          });
          await this.memoryService.saveDirectInteraction(
            prompt,
            fallbackContent,
            this.speakerService.getPrimaryUserSpeaker(),
            true // forceSave = true for immediate persistence
          );
        } catch (saveError) {
          LoggingUtils.logWarning(
            "⚠️ Could not save fallback interaction: " +
              (saveError instanceof Error
                ? saveError.message
                : String(saveError))
          );
        }

        return {
          response: fallbackContent,
        };
      } catch (fallbackError) {
        LoggingUtils.logError(
          "❌ [SIMPLE_MODE] Fallback also failed",
          fallbackError
        );
        throw error; // Re-throw original error
      }
    }
  }

  /**
   * Check if currently processing a prompt
   */
  public isProcessingPromptRequest(): boolean {
    return this.isProcessingPrompt;
  }

  /**
   * Update current language for processing
   */
  public setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * Get current processing language
   */
  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Reset processing state
   */
  public reset(): void {
    this.isProcessingPrompt = false;
    this.clearProcessingStatus();
    this.transcriptionExtractor.reset();
    this.sessionManager.resetSession();
  }
}
