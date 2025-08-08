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
import i18n from "../../../../../i18n";

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
 * Streamlined implementation following DRY, KISS, and YAGNI principles
 */
export class SimplePromptProcessor {
  private isProcessingPrompt: boolean = false;
  private currentLanguage: string;
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
    
    const uiAdapter = new UIServiceAdapter(this.uiService);
    this.webSearchService = new WebSearchService(this.llmService, uiAdapter);
  }

  private _initializeProcessors(): void {
    this.transcriptionExtractor = new TranscriptionExtractor(this.storageService);
    this.sessionManager = new SessionManager();
  }

  private updateStatus(message: string): void {
    if (typeof window !== "undefined" && (window as any).__updateProcessingStatus) {
      (window as any).__updateProcessingStatus(message);
    }
  }

  private clearStatus(): void {
    if (typeof window !== "undefined" && (window as any).__clearProcessingStatus) {
      (window as any).__clearProcessingStatus();
    }
  }

  public async processTranscription(
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    const transcription = this.storageService.getLastTranscription();
    if (!transcription?.trim()) return;
    
    await this._processMessage(transcription, temporaryContext, conversationMessages);
  }

  public async processDirectMessage(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    if (!message?.trim()) return;
    await this._processMessage(message, temporaryContext, conversationMessages);
  }

  private async _processMessage(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    if (this.isProcessingPrompt) {
      LoggingUtils.logWarning("⚠️ Already processing a request");
      this.uiService.notifyPromptError?.("Please wait for the current request to complete.");
      return;
    }

    this.isProcessingPrompt = true;
    this.updateStatus("⚡ Processing...");

    try {
      if (!(await this.llmService.ensureOpenAIClient())) {
        throw new Error("LLM service not available");
      }

      const result = await this._executeCompletion(message, temporaryContext, conversationMessages);
      this.uiService.updateUI({ aiResponse: result.response });
      this.uiService.notifyPromptComplete?.(result.response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      LoggingUtils.logError("❌ Processing error", error);
      this.uiService.updateUI({ aiResponse: `Error: ${errorMessage}` });
      this.uiService.notifyPromptError?.(errorMessage);
    } finally {
      this.isProcessingPrompt = false;
      this.clearStatus();
    }
  }

  private async _executeCompletion(
    prompt: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<SimpleProcessingResponse> {
    // Get memory context
    let memoryContext = "";
    try {
      const contextResults = await this.memoryService.queryExpandedMemory(prompt, [], 5);
      if (contextResults?.trim()) {
        memoryContext = contextResults;
      }
    } catch (error) {
      LoggingUtils.logWarning("⚠️ Memory context unavailable");
    }

    // Notify processing start to set isProcessing=true in frontend BEFORE web search
    this.uiService.notifyPromptProcessingStarted?.(temporaryContext);

    // Get web search results if enabled
    let webContext = "";
    const isWebSearchEnabled = getOption(STORAGE_KEYS.WEB_SEARCH_ENABLED) || false;
    if (isWebSearchEnabled) {
      try {
        const conversationHistory = this.memoryService.getConversationHistory();
        const searchStrategy = await this.webSearchService.generateSearchStrategy(prompt, conversationHistory);
        const webResults = await this.webSearchService.searchWeb(searchStrategy.searchQueries, {
          maxResults: searchStrategy.resultsCount,
          safeSearch: true,
        });
        if (webResults?.length > 0) {
          webContext = await this.webSearchService.processSearchResults(webResults, prompt);
        }
      } catch (error) {
        LoggingUtils.logWarning("⚠️ Web search unavailable");
      }
    }

    // Build messages for LLM
    const messages = this._buildMessages(prompt, memoryContext, webContext, temporaryContext, conversationMessages);
    
    // Show "Generating response" status using both methods for guaranteed visibility
    this.updateStatus(i18n.t('chatMessages.generatingResponse'));
    
    // Fallback: Also show in UI response area if status bar doesn't work
    this.uiService.updateUI({ aiResponse: i18n.t('chatMessages.generatingResponseEllipsis') });

    // Execute streaming with first chunk handling (like backup)
    let accumulatedResponse = "";
    let firstChunkReceived = false;
    
    const streamingHandler = (chunk: string) => {
      if (!chunk) return;
      
      // On first real chunk, clear processing status and notify streaming started (like backup)
      if (!firstChunkReceived) {
        firstChunkReceived = true;
        this.clearStatus();
        this.uiService.notifyStreamingStarted?.();
      }
      
      // Accumulate response
      accumulatedResponse += chunk;
      
      // Send chunk via IPC (like backup)
      this.uiService.notifyStreamingChunk?.(chunk);
    };

    try {
      const response = await this.llmService.streamOpenAIResponse(messages, 0.7, streamingHandler);
      this.uiService.notifyStreamingComplete?.();
      
      const finalResponse = accumulatedResponse || response.responseText || "";
      
      // Save interaction
      await this._saveInteraction(prompt, finalResponse, conversationMessages);
      
      return { response: finalResponse };
    } catch (error) {
      LoggingUtils.logError("❌ Streaming failed", error);
      throw error;
    }
  }

  private _buildMessages(
    prompt: string,
    memoryContext: string,
    webContext: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): any[] {
    const messages = [];
    
    // System prompt
    messages.push({
      role: "system",
      content: buildSimpleSystemPrompt(this.currentLanguage)
    });

    // Add conversation history
    if (conversationMessages?.length) {
      // Convert ChatMessage[] to LLM format
      const convertedMessages = conversationMessages.map((msg: any) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content
      }));
      
      LoggingUtils.logInfo(`📝 [CONTEXT] Adding ${convertedMessages.length} conversation messages to context`);
      messages.push(...convertedMessages);
    } else {
      const history = this.memoryService.getConversationHistory();
      LoggingUtils.logInfo(`📝 [CONTEXT] Adding ${history.length} history messages to context`);
      messages.push(...history);
    }

    // Build user prompt with context
    let userPrompt = prompt;
    if (memoryContext) {
      userPrompt += `\n\nRELEVANT CONTEXT: ${memoryContext}`;
    }
    if (webContext) {
      userPrompt += `\n\nWEB SEARCH CONTEXT: ${webContext}`;
    }
    if (temporaryContext) {
      userPrompt += `\n\nADDITIONAL CONTEXT: ${temporaryContext}`;
    }

    messages.push({
      role: "user",
      content: buildSimpleUserPrompt(userPrompt, this.currentLanguage)
    });

    return messages;
  }

  private async _saveInteraction(
    prompt: string,
    response: string,
    conversationMessages?: any[]
  ): Promise<void> {
    try {
      // Add to conversation history only if not already there
      if (!conversationMessages?.length) {
        this.memoryService.addToConversationHistory({ role: "user", content: prompt });
        this.memoryService.addToConversationHistory({ role: "assistant", content: response });
      }

      // Save interaction
      await this.memoryService.saveDirectInteraction(
        prompt,
        response,
        this.speakerService.getPrimaryUserSpeaker(),
        true
      );
    } catch (error) {
      LoggingUtils.logWarning("⚠️ Could not save interaction");
    }
  }

  // Compatibility methods for existing code
  public isProcessingPromptRequest(): boolean {
    return this.isProcessingPrompt;
  }

  public setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public reset(): void {
    this.isProcessingPrompt = false;
    this.clearStatus();
    this.transcriptionExtractor.reset();
    this.sessionManager.resetSession();
  }
}

/**
 * Simplified UI Service adapter for WebSearchService
 */
class UIServiceAdapter implements WebUIUpdateService {
  constructor(private originalUIService: IUIUpdateService) {}

  updateProcessingStatus(message: string): void {
    if (typeof window !== "undefined" && (window as any).__updateProcessingStatus) {
      (window as any).__updateProcessingStatus(message);
    }
  }

  notifyWebSearchStep(step: string, details?: string): void {
    const statusMessage = details ? `🌐 ${step}: ${details}` : `🌐 ${step}`;
    this.updateProcessingStatus(statusMessage);
    LoggingUtils.logInfo(`🔍 [WEB_SEARCH] ${statusMessage}`);
  }
}
