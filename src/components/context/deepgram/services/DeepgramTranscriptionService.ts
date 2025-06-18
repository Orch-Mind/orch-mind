// SPDX-License-Identifier: MIT OR Apache-2.0
import { getOption, STORAGE_KEYS } from "./../../../../services/StorageService";
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DeepgramTranscriptionService.ts
// Main transcription service for Deepgram that orchestrates other services

import { getPrimaryUser } from "../../../../config/UserConfig";
import { ModeService, OrchOSModeEnum } from "../../../../services/ModeService";
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
    return this.transcriptionPromptProcessor.isProcessingPromptRequest();
  }

  // Neural integration service
  private neuralIntegrationService: INeuralIntegrationService;

  // Transcription prompt processor
  private transcriptionPromptProcessor: TranscriptionPromptProcessor;

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

    // Initialize the transcription prompt processor
    this.transcriptionPromptProcessor = new TranscriptionPromptProcessor(
      this.storageService,
      this.memoryService,
      this.llmService,
      this.uiService,
      this.speakerService,
      this.neuralIntegrationService
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
    LoggingUtils.logInfo(`Processing language updated to: ${language}`);
  }

  /**
   * Gets the current processing language
   */
  getProcessingLanguage(): string {
    return this.transcriptionPromptProcessor.getCurrentLanguage();
  }

  /**
   * Processes the transcription using the appropriate AI service based on current mode
   * Automatically selects between Ollama (advanced mode) and HuggingFace (basic mode)
   */
  async sendTranscriptionPrompt(temporaryContext?: string): Promise<void> {
    console.log("🚀 [DEEPGRAM_SERVICE] sendTranscriptionPrompt called:", {
      temporaryContext,
      hasContext: !!temporaryContext,
      currentMode: ModeService.getMode(),
      timestamp: new Date().toISOString(),
    });

    const currentMode = ModeService.getMode();

    try {
      if (currentMode === OrchOSModeEnum.BASIC) {
        LoggingUtils.logInfo("🤖 Using HuggingFace service (Basic mode)");
        console.log("📤 [DEEPGRAM_SERVICE] Calling processWithHuggingFace");
        await this.transcriptionPromptProcessor.processWithHuggingFace(
          temporaryContext
        );
        console.log("✅ [DEEPGRAM_SERVICE] processWithHuggingFace completed");
      } else {
        LoggingUtils.logInfo("🧠 Using Ollama service (Advanced mode)");
        console.log("📤 [DEEPGRAM_SERVICE] Calling processWithOpenAI");
        await this.transcriptionPromptProcessor.processWithOpenAI(
          temporaryContext
        );
        console.log("✅ [DEEPGRAM_SERVICE] processWithOpenAI completed");
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
   * @param message The message from chat input
   * @param temporaryContext Optional additional context
   */
  async sendDirectMessage(
    message: string,
    temporaryContext?: string
  ): Promise<void> {
    console.log("💬 [DEEPGRAM_SERVICE] sendDirectMessage called:", {
      message: message.substring(0, 50),
      hasContext: !!temporaryContext,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.transcriptionPromptProcessor.processDirectMessage(
        message,
        temporaryContext
      );
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
}
