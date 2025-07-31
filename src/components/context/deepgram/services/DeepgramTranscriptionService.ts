// SPDX-License-Identifier: MIT OR Apache-2.0
import { getOption, STORAGE_KEYS } from "./../../../../services/StorageService";
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DeepgramTranscriptionService.ts
// Main transcription service for Deepgram that orchestrates other services

import { getPrimaryUser } from "../../../../config/UserConfig";
import { IDeepgramTranscriptionService } from "../interfaces/deepgram/IDeepgramService";
import { IMemoryService } from "../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../interfaces/openai/IOpenAIService";
import { ITranscriptionStorageService } from "../interfaces/transcription/ITranscriptionStorageService";
import {
  SpeakerTranscription,
  SpeakerTranscriptionLog,
  UIUpdater,
} from "../interfaces/transcription/TranscriptionTypes";
import { ISpeakerIdentificationService } from "../interfaces/utils/ISpeakerIdentificationService";
import { IUIUpdateService } from "../interfaces/utils/IUIUpdateService";
import { DefaultNeuralIntegrationService } from "../symbolic-cortex/integration/DefaultNeuralIntegrationService";
import { INeuralIntegrationService } from "../symbolic-cortex/integration/INeuralIntegrationService";
import { LoggingUtils } from "../utils/LoggingUtils";
import { MemoryService } from "./memory/MemoryService";
import { AgentPromptProcessor } from "./transcription/agent/AgentPromptProcessor";
import { SimplePromptProcessor } from "./transcription/SimplePromptProcessor";
import { TranscriptionPromptProcessor } from "./transcription/TranscriptionPromptProcessor";
import { TranscriptionStorageService } from "./transcription/TranscriptionStorageService";
import { SpeakerIdentificationService } from "./utils/SpeakerIdentificationService";
import { UIUpdateService } from "./utils/UIUpdateService";

export class DeepgramTranscriptionService
  implements IDeepgramTranscriptionService
{
  // Essential services
  private speakerService: ISpeakerIdentificationService;
  private storageService: ITranscriptionStorageService;
  private memoryService: IMemoryService;
  // Generic LLM service (could be Ollama or HuggingFace facade)
  private llmService: IOpenAIService;
  private uiService: IUIUpdateService;

  // Configuration
  private model: string =
    getOption(STORAGE_KEYS.DEEPGRAM_MODEL) || "nova-2-general";
  private interimResultsEnabled: boolean = true;
  private useSimplifiedHistory: boolean = false;
  private currentLanguage: string =
    getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR";

  // Properties for the neural system (kept for backward compatibility)
  private _neuralMemory: Array<{
    timestamp: number;
    core: string;
    intensity: number;
    pattern?: string;
  }> = [];

  /**
   * Returns the current state of prompt processing
   * @returns true if a prompt is currently being processed, false otherwise
   */
  public isProcessingPromptRequest(): boolean {
    return (
      this.transcriptionPromptProcessor.isProcessingPromptRequest() ||
      this.simplePromptProcessor.isProcessingPromptRequest()
    );
  }

  /**
   * Checks if quantum processing is enabled
   * @returns true if quantum processing is enabled, false otherwise
   */
  private isQuantumProcessingEnabled(): boolean {
    return getOption(STORAGE_KEYS.QUANTUM_PROCESSING_ENABLED) === true;
  }

  // Neural integration service
  private neuralIntegrationService: INeuralIntegrationService;

  // Transcription prompt processors
  private transcriptionPromptProcessor: TranscriptionPromptProcessor;
  private simplePromptProcessor: SimplePromptProcessor;
  private agentPromptProcessor: AgentPromptProcessor;

  constructor(
    setTexts: UIUpdater,
    llmService: IOpenAIService,
    primaryUserSpeaker: string = getPrimaryUser()
  ) {
    // Initialize services
    this.speakerService = new SpeakerIdentificationService(primaryUserSpeaker);
    this.storageService = new TranscriptionStorageService(
      this.speakerService,
      setTexts
    );
    this.llmService = llmService; // May be HuggingFaceServiceFacade in Basic mode
    this.memoryService = new MemoryService(this.llmService);
    this.uiService = new UIUpdateService(setTexts);

    // Initialize the neural integration service
    this.neuralIntegrationService = new DefaultNeuralIntegrationService(
      this.llmService
    );

    // Initialize the transcription prompt processors
    this.transcriptionPromptProcessor = new TranscriptionPromptProcessor(
      this.storageService,
      this.memoryService,
      this.llmService,
      this.uiService,
      this.speakerService,
      this.neuralIntegrationService
    );

    // Initialize the simple prompt processor for when quantum processing is disabled
    this.simplePromptProcessor = new SimplePromptProcessor(
      this.storageService,
      this.memoryService,
      this.llmService,
      this.uiService,
      this.speakerService
    );

    // Initialize the agent prompt processor for agent mode
    this.agentPromptProcessor = new AgentPromptProcessor(
      this.storageService,
      this.memoryService,
      this.llmService,
      this.uiService,
      this.speakerService
    );

    // Set reference back to this service in the storage service to enable auto-triggering
    if (this.storageService instanceof TranscriptionStorageService) {
      this.storageService.setTranscriptionService(this);
    }

    // Load API key
    this.loadApiKey();
  }

  // Main interface methods

  /**
   * Sets the name of the primary speaker (user)
   */
  setPrimaryUserSpeaker(name: string): void {
    this.speakerService.setPrimaryUserSpeaker(name);
  }

  /**
   * Adds a new transcription received from the Deepgram service
   */
  addTranscription(text: string, speaker?: string): void {
    this.storageService.addTranscription(text, speaker);
  }

  /**
   * Clears transcription data
   */
  clearTranscriptionData(): void {
    this.storageService.clearTranscriptionData();
    this.memoryService.clearMemoryData();
    this.memoryService.resetTranscriptionSnapshot();
  }

  /**
   * Returns the current list of transcriptions
   */
  getTranscriptionList(): string[] {
    return this.storageService.getTranscriptionList();
  }

  /**
   * Returns transcriptions organized by speaker
   */
  getSpeakerTranscriptions(): SpeakerTranscription[] {
    return this.storageService.getSpeakerTranscriptions();
  }

  /**
   * Returns transcription logs grouped by speaker
   */
  getTranscriptionLogs(): SpeakerTranscriptionLog[] {
    return this.storageService.getTranscriptionLogs();
  }

  /**
   * Accesses the internal storage service directly
   * @returns The instance of the storage service
   * @internal Only for internal use
   */
  getStorageServiceForIntegration(): ITranscriptionStorageService {
    return this.storageService;
  }

  /**
   * Verifies if only the primary user speaker is speaking
   */
  isOnlyUserSpeaking(): boolean {
    return this.speakerService.isOnlyUserSpeaking(
      this.storageService.getSpeakerTranscriptions()
    );
  }

  /**
   * Activates or deactivates the simplified history mode
   */
  setSimplifiedHistoryMode(enabled: boolean): void {
    this.useSimplifiedHistory = enabled;
    this.memoryService.setSimplifiedHistoryMode(enabled);
    LoggingUtils.logInfo(
      `Simplified history mode: ${enabled ? "activated" : "deactivated"}`
    );
  }

  /**
   * Sets the processing language for transcription and neural processing
   */
  setProcessingLanguage(language: string): void {
    this.currentLanguage = language;
    this.transcriptionPromptProcessor.setLanguage(language);
    this.simplePromptProcessor.setLanguage(language);
    LoggingUtils.logInfo(`Processing language updated to: ${language}`);
  }

  /**
   * Gets the current processing language
   */
  getProcessingLanguage(): string {
    return this.transcriptionPromptProcessor.getCurrentLanguage();
  }

  /**
   * Processes the transcription using the appropriate processor based on AI mode selection
   * Routes between SimplePromptProcessor (Chat mode) and AgentPromptProcessor (Agent mode)
   * @param temporaryContext Optional additional context
   * @param conversationMessages Optional conversation messages from chat (including summaries)
   */
  async sendTranscriptionPrompt(
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    // Get AI mode from storage (set by ChatInputArea toggle)
    const aiMode = getOption<string>(STORAGE_KEYS.AI_MODE) || "chat";
    const useQuantumProcessing = this.isQuantumProcessingEnabled();
    const transcriptionText = this.storageService.getUITranscriptionText() || "";

    console.log("🚀 [DEEPGRAM_SERVICE] sendTranscriptionPrompt called:", {
      temporaryContext,
      hasContext: !!temporaryContext,
      hasConversationMessages: !!conversationMessages,
      messageCount: conversationMessages?.length || 0,
      aiMode,
      quantumProcessingEnabled: useQuantumProcessing,
      transcriptionText: transcriptionText.substring(0, 100),
      hasTranscriptionText: !!transcriptionText,
      timestamp: new Date().toISOString(),
    });
    
    // DEBUG: Check what mode is being used
    console.log(`🔍 [DEBUG] AI Mode check: aiMode='${aiMode}', will use ${aiMode === "agent" ? "AgentPromptProcessor" : "SimplePromptProcessor/QuantumProcessing"}`);

    try {
      if (aiMode === "agent") {
        // Agent mode: Use the refactored AgentPromptProcessor
        LoggingUtils.logInfo("🤖 Using Agent Processing (Agent mode)");
        console.log("📤 [DEEPGRAM_SERVICE] Calling AgentPromptProcessor");
        console.log(`🔍 [DEBUG] AgentPromptProcessor initialized: ${!!this.agentPromptProcessor}`);
        console.log(`🔍 [DEBUG] Transcription text for agent: "${transcriptionText}"`); 
        
        if (!this.agentPromptProcessor) {
          console.error("❌ [ERROR] AgentPromptProcessor not initialized!");
          throw new Error("AgentPromptProcessor not initialized");
        }
        
        if (!transcriptionText?.trim()) {
          console.warn("⚠️ [WARNING] No transcription text available for agent processing");
          return;
        }
        
        const response = await this.agentPromptProcessor.processAgentMessage(
          this.storageService.getUITranscriptionText() || "",
          temporaryContext,
          conversationMessages
        );
        
        console.log("✅ [DEEPGRAM_SERVICE] AgentPromptProcessor completed:", {
          hasResponse: !!response.response,
          hasActions: !!response.actions?.length,
          actionCount: response.actions?.length || 0
        });
      } else if (useQuantumProcessing) {
        // Chat mode with quantum processing: Use TranscriptionPromptProcessor
        LoggingUtils.logInfo("🧠 Using Quantum Processing (Chat + Neural mode)");
        console.log("📤 [DEEPGRAM_SERVICE] Calling processWithOpenAI");
        await this.transcriptionPromptProcessor.processWithOpenAI(
          temporaryContext,
          conversationMessages
        );
        console.log("✅ [DEEPGRAM_SERVICE] processWithOpenAI completed");
      } else {
        // Chat mode with simple processing: Use SimplePromptProcessor
        LoggingUtils.logInfo("⚡ Using Simple Processing (Chat + Direct mode)");
        console.log("📤 [DEEPGRAM_SERVICE] Calling processTranscription");
        await this.simplePromptProcessor.processTranscription(
          temporaryContext,
          conversationMessages
        );
        console.log("✅ [DEEPGRAM_SERVICE] processTranscription completed");
      }
    } catch (error) {
      console.error(
        "❌ [DEEPGRAM_SERVICE] Error in sendTranscriptionPrompt:",
        error
      );
      throw error;
    }
  }

  /**
   * Processes a direct message from chat interface
   * Uses the appropriate processor based on quantum processing setting
   * @param message The message from chat input
   * @param temporaryContext Optional additional context
   * @param conversationMessages Optional conversation messages from chat (including summaries)
   */
  async sendDirectMessage(
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    // Get AI mode from storage (set by ChatInputArea toggle)
    const aiMode = getOption<string>(STORAGE_KEYS.AI_MODE) || "chat";
    const useQuantumProcessing = this.isQuantumProcessingEnabled();

    console.log("💬 [DEEPGRAM_SERVICE] sendDirectMessage called:", {
      message: message.substring(0, 50),
      hasContext: !!temporaryContext,
      hasConversationMessages: !!conversationMessages,
      messageCount: conversationMessages?.length || 0,
      aiMode,
      quantumProcessingEnabled: useQuantumProcessing,
      timestamp: new Date().toISOString(),
    });
    
    // DEBUG: Check what mode is being used
    console.log(`🔍 [DEBUG] AI Mode check in sendDirectMessage: aiMode='${aiMode}', will use ${aiMode === "agent" ? "AgentPromptProcessor" : useQuantumProcessing ? "TranscriptionPromptProcessor" : "SimplePromptProcessor"}`);

    try {
      if (aiMode === "agent") {
        // Agent mode: Use the refactored AgentPromptProcessor
        LoggingUtils.logInfo("🤖 Using Agent Processing (Agent mode via sendDirectMessage)");
        console.log("📤 [DEEPGRAM_SERVICE] Calling AgentPromptProcessor from sendDirectMessage");
        console.log(`🔍 [DEBUG] AgentPromptProcessor initialized: ${!!this.agentPromptProcessor}`);
        console.log(`🔍 [DEBUG] Message for agent: "${message}"`); 
        
        if (!this.agentPromptProcessor) {
          console.error("❌ [ERROR] AgentPromptProcessor not initialized!");
          throw new Error("AgentPromptProcessor not initialized");
        }
        
        if (!message?.trim()) {
          console.warn("⚠️ [WARNING] No message available for agent processing");
          return;
        }
        
        const response = await this.agentPromptProcessor.processAgentMessage(
          message,
          temporaryContext,
          conversationMessages
        );
        
        LoggingUtils.logInfo(`✅ [AGENT] Agent processing completed: ${response.response?.substring(0, 100)}...`);
      } else if (useQuantumProcessing) {
        await this.transcriptionPromptProcessor.processDirectMessage(
          message,
          temporaryContext,
          conversationMessages
        );
      } else {
        await this.simplePromptProcessor.processDirectMessage(
          message,
          temporaryContext,
          conversationMessages
        );
      }
      console.log("✅ [DEEPGRAM_SERVICE] sendDirectMessage completed");
    } catch (error) {
      console.error("❌ [DEEPGRAM_SERVICE] Error in sendDirectMessage:", error);
      throw error;
    }
  }

  /**
   * Processes the transcription using HuggingFace backend specifically
   * Always uses HuggingFace regardless of the current mode
   */
  async sendTranscriptionPromptWithHuggingFace(
    temporaryContext?: string
  ): Promise<void> {
    LoggingUtils.logInfo("🤖 Explicitly using HuggingFace service");
    return await this.transcriptionPromptProcessor.processWithHuggingFace(
      temporaryContext
    );
  }

  /**
   * Loads the LLM service API key from the environment
   */
  private async loadApiKey(): Promise<void> {
    await this.llmService.loadApiKey();
  }

  // Implementation of IDeepgramTranscriptionService methods

  async connect(language?: string): Promise<void> {
    if (language) {
      this.currentLanguage = language;
      this.transcriptionPromptProcessor.setLanguage(language);
    }
    LoggingUtils.logInfo(
      `Connecting transcription service. Language: ${this.currentLanguage}`
    );
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    LoggingUtils.logInfo("Disconnecting transcription service");
    return Promise.resolve();
  }

  async startProcessing(): Promise<void> {
    LoggingUtils.logInfo("Starting transcription processing");
    return Promise.resolve();
  }

  async stopProcessing(): Promise<void> {
    LoggingUtils.logInfo("Stopping transcription processing");
    return Promise.resolve();
  }

  setModel(model: string): void {
    if (this.model !== model) {
      this.model = model;
      LoggingUtils.logInfo(`Model defined for: ${model}`);
    }
  }

  toggleInterimResults(enabled: boolean): void {
    this.interimResultsEnabled = enabled;
    LoggingUtils.logInfo(
      `Interim results: ${enabled ? "enabled" : "disabled"}`
    );
  }

  // ... (rest of the code remains the same)
  reset(): void {
    LoggingUtils.logInfo("Resetting transcription state");
    this.clearTranscriptionData();
    this.transcriptionPromptProcessor.reset();
    this.simplePromptProcessor.reset();
  }

  isConnected(): boolean {
    return false;
  }

  /**
   * Enable or disable automatic detection of questions for auto-triggering prompts
   */
  setAutoQuestionDetection(enabled: boolean): void {
    if (this.storageService instanceof TranscriptionStorageService) {
      this.storageService.setAutoQuestionDetection(enabled);
      LoggingUtils.logInfo(
        `Auto-question detection ${enabled ? "enabled" : "disabled"}`
      );
    }
  }

  /**
   * Flush all accumulated transcriptions to the UI
   * Should be called when recording stops or when sending a message
   */
  flushTranscriptionsToUI(): void {
    this.storageService.flushTranscriptionsToUI();
    LoggingUtils.logInfo("Flushing transcriptions to UI");
  }

  /**
   * Notifies conversation change to synchronize memory service
   * Should be called when switching between chat conversations
   * @param conversationMessages Messages from the new conversation to sync with
   */
  onConversationChanged(conversationMessages?: any[]): void {
    LoggingUtils.logInfo(
      `[CONVERSATION_SYNC] Conversation changed notification received`
    );

    if (conversationMessages && conversationMessages.length > 0) {
      // Sync with existing conversation
      this.memoryService.syncConversationHistory(conversationMessages);
      LoggingUtils.logInfo(
        `[CONVERSATION_SYNC] Synced with ${conversationMessages.length} existing messages`
      );
    } else {
      // Clear for new conversation
      this.memoryService.clearConversationHistory();
      LoggingUtils.logInfo(
        "[CONVERSATION_SYNC] Cleared conversation history for new conversation"
      );
    }
  }

  /**
   * Clears conversation history for a fresh start
   * Used when creating a new conversation
   */
  clearConversationHistory(): void {
    this.memoryService.clearConversationHistory();
    LoggingUtils.logInfo("[CONVERSATION_SYNC] Conversation history cleared");
  }
}
