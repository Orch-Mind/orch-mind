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

// Web search service
import {
  WebSearchService,
  IUIUpdateService as WebUIUpdateService,
} from "../web/WebSearchService";

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
  private isWebSearchActive: boolean = false; // Track web search state

  // Reused processors for conversation management
  private transcriptionExtractor!: TranscriptionExtractor;
  private sessionManager!: SessionManager;
  private webSearchService!: WebSearchService;

  constructor(
    private storageService: ITranscriptionStorageService,
    private memoryService: IMemoryService,
    private llmService: IOpenAIService,
    private uiService: IUIUpdateService,
    private speakerService: ISpeakerIdentificationService
  ) {
    this.currentLanguage = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR";
    this._initializeProcessors();

    // Create UI adapter for web search service
    const uiAdapter = new UIServiceAdapter(this.uiService, this);
    this.webSearchService = new WebSearchService(this.llmService, uiAdapter);
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
   * Only shows if web search is not active
   */
  private showProcessingStatus(message: string): void {
    // Don't show status if web search is active
    if (this.isWebSearchActive) {
      return;
    }

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
   * Set web search active state
   */
  public setWebSearchActive(active: boolean): void {
    this.isWebSearchActive = active;
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
      // Track if web search was performed
      let wasWebSearchPerformed = false;
      let webSearchResultsCount = 0;

      // STEP 1: Retrieve context from DuckDB memory (silent)
      LoggingUtils.logInfo(
        "🔍 [SIMPLE_MODE] Step 1: Retrieving context from memory..."
      );

      let memoryContextContent = "";
      try {
        // Search for relevant context using the prompt as query
        const contextResults = await this.memoryService.queryExpandedMemory(
          prompt,
          [], // no specific keywords for simple mode
          5 // get top 5 relevant memories
        );

        if (contextResults && contextResults.trim().length > 0) {
          memoryContextContent = contextResults;
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

      // STEP 2: LLM decides web search strategy (only if enabled)
      let webContextContent = "";
      const isWebSearchEnabled =
        getOption(STORAGE_KEYS.WEB_SEARCH_ENABLED) || false;

      if (isWebSearchEnabled) {
        try {
          LoggingUtils.logInfo(
            "🌐 [SIMPLE_MODE] Step 2: LLM deciding search strategy..."
          );
          wasWebSearchPerformed = true;
          this.setWebSearchActive(true);

          // Get conversation history for context-aware search strategy
          const conversationHistory =
            this.memoryService.getConversationHistory();

          const searchStrategy =
            await this.webSearchService.generateSearchStrategy(
              prompt,
              conversationHistory
            );

          LoggingUtils.logInfo(
            `🎯 [WEB_SEARCH] Strategy: ${searchStrategy.searchQueries.length} queries, ${searchStrategy.resultsCount} results - ${searchStrategy.reasoning}`
          );

          // STEP 3: Execute queries and LLM filters results
          LoggingUtils.logInfo(
            "🔍 [SIMPLE_MODE] Step 3: Executing queries and filtering results..."
          );

          const webResults = await this.webSearchService.searchWeb(
            searchStrategy.searchQueries,
            {
              maxResults: searchStrategy.resultsCount,
              safeSearch: true,
            }
          );

          if (webResults && webResults.length > 0) {
            webSearchResultsCount = webResults.length;
            // LLM processes and filters only necessary information
            webContextContent =
              await this.webSearchService.processSearchResults(
                webResults,
                prompt
              );
            LoggingUtils.logInfo(
              `✅ Found and processed ${webResults.length} relevant web results`
            );

            // Debug log for web context content
            LoggingUtils.logInfo(
              `🔍 [WEB_CONTEXT_DEBUG] Web context content length: ${webContextContent.length} chars`
            );
            LoggingUtils.logInfo(
              `🔍 [WEB_CONTEXT_DEBUG] Web context preview: ${webContextContent.substring(
                0,
                300
              )}...`
            );
          } else {
            LoggingUtils.logInfo("ℹ️ No web results found or empty results");
          }

          this.setWebSearchActive(false);
        } catch (webError) {
          this.setWebSearchActive(false);
          LoggingUtils.logWarning(
            "⚠️ Error performing web search, proceeding without it: " +
              (webError instanceof Error ? webError.message : String(webError))
          );
        }
      } else {
        LoggingUtils.logInfo(
          "🚫 [SIMPLE_MODE] Step 2: Web search disabled by user settings"
        );
      }

      // STEP 4: Build message list with temporary context messages
      LoggingUtils.logInfo(
        "📝 [SIMPLE_MODE] Step 4: Building message list with temporary contexts..."
      );

      // Show contextual message based on what was processed
      if (wasWebSearchPerformed && webSearchResultsCount > 0) {
        this.showProcessingStatus(
          `📝 Processing ${webSearchResultsCount} web sources + local memory`
        );
      } else if (isWebSearchEnabled) {
        this.showProcessingStatus("📝 Preparing response with local memory");
      } else {
        this.showProcessingStatus("📝 Preparing response");
      }

      // Clean system prompt - no context mixed in
      const systemPrompt = buildSimpleSystemPrompt(this.currentLanguage);

      // Clean user prompt - no context mixed in
      const userPrompt = buildSimpleUserPrompt(
        prompt,
        temporaryContext,
        this.currentLanguage
      );

      // Get conversation history (only user/assistant messages)
      const conversationHistory = this.memoryService.getConversationHistory();

      LoggingUtils.logInfo(
        `📚 [CONTEXT] Using ${conversationHistory.length} conversation messages`
      );

      // Build complete message list with temporary context messages
      const messages = [
        { role: "system", content: systemPrompt, speaker: "system" },

        // Add conversation history (clean user/assistant only)
        ...conversationHistory.filter((msg) => msg.role !== "system"),

        // Add conversation messages from chat if provided (fallback)
        ...(conversationMessages || []),

        // TEMPORARY CONTEXT MESSAGES (will be removed after response)
        ...(memoryContextContent
          ? [
              {
                role: "system",
                content: `MEMORY CONTEXT (for this response only): ${memoryContextContent}`,
                speaker: "system",
              },
            ]
          : []),

        ...(webContextContent
          ? [
              {
                role: "system",
                content: `WEB SEARCH CONTEXT (for this response only): ${webContextContent}`,
                speaker: "system",
              },
            ]
          : []),

        // Current user message
        { role: "user", content: userPrompt, speaker: "user" },
      ];

      LoggingUtils.logInfo(
        `📚 [CONTEXT_DEBUG] Total messages: ${messages.length} (${
          conversationHistory.length
        } history + ${memoryContextContent ? 1 : 0} memory + ${
          webContextContent ? 1 : 0
        } web + 2 system/user)`
      );

      // STEP 5: Generate response with streaming
      LoggingUtils.logInfo("🎯 [SIMPLE_MODE] Step 5: Generating response...");
      this.showProcessingStatus("🎯 Generating response");

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

      // STEP 6: Save ONLY user/assistant interaction (NO temporary contexts)
      LoggingUtils.logInfo(
        "💾 [SIMPLE_MODE] Step 6: Saving clean interaction..."
      );

      try {
        // Add ONLY the clean user message to conversation history
        this.memoryService.addToConversationHistory({
          role: "user",
          content: prompt, // Original prompt without any context
        });

        // Add ONLY the assistant response to conversation history
        this.memoryService.addToConversationHistory({
          role: "assistant",
          content: finalResponse,
        });

        // Save to long-term memory (DuckDB) using direct save method
        await this.memoryService.saveDirectInteraction(
          prompt, // Clean prompt
          finalResponse, // Clean response
          this.speakerService.getPrimaryUserSpeaker(),
          true // forceSave = true for immediate persistence
        );

        LoggingUtils.logInfo(
          "✅ Clean interaction saved to memory successfully"
        );
        LoggingUtils.logInfo("🗑️ Temporary contexts automatically discarded");
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
        this.showProcessingStatus("🔄 Trying alternative method");

        // Build clean fallback messages with conversation history
        const fallbackSystemPrompt = buildSimpleSystemPrompt(
          this.currentLanguage
        );
        const fallbackUserPrompt = buildSimpleUserPrompt(
          prompt,
          temporaryContext,
          this.currentLanguage
        );

        // Include conversation history in fallback too
        const conversationHistory = this.memoryService.getConversationHistory();
        const fallbackMessages = [
          { role: "system", content: fallbackSystemPrompt },
          // Include recent conversation history for context
          ...conversationHistory
            .filter((msg) => msg.role !== "system")
            .slice(-6), // Last 6 messages
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

        // Still try to save the clean interaction in fallback mode
        try {
          this.memoryService.addToConversationHistory({
            role: "user",
            content: prompt, // Clean prompt
          });
          this.memoryService.addToConversationHistory({
            role: "assistant",
            content: fallbackContent,
          });
          await this.memoryService.saveDirectInteraction(
            prompt, // Clean prompt
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

/**
 * Simplified UI Service adapter
 */
class UIServiceAdapter implements WebUIUpdateService {

  constructor(
    private originalUIService: IUIUpdateService,
    private processor: SimplePromptProcessor
  ) {}

  updateProcessingStatus(message: string): void {
    // Forward to original UI service
    if (
      typeof window !== "undefined" &&
      (window as any).__updateProcessingStatus
    ) {
      (window as any).__updateProcessingStatus(message);
    }
  }

  notifyWebSearchStep(step: string, details?: string): void {
    // Mark web search as active
    this.processor.setWebSearchActive(true);

    // Format the message with visual indicators
    const statusMessage = details ? `🌐 ${step}: ${details}` : `🌐 ${step}`;

    // Update UI immediately
    if (
      typeof window !== "undefined" &&
      (window as any).__updateProcessingStatus
    ) {
      (window as any).__updateProcessingStatus(statusMessage);
    }

    // Reset web search state
    this.processor.setWebSearchActive(false);
    LoggingUtils.logInfo("🔄 [UI_ADAPTER] Web search completed");

    // Log for debugging
    LoggingUtils.logInfo(`🔍 [WEB_SEARCH_UI] ${statusMessage}`);
  }
}
