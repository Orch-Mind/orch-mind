// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  NeuralProcessingResult,
  NeuralSignalResponse,
} from "../../interfaces/neural/NeuralSignalTypes";
import { NeuralSignalExtractor } from "../../symbolic-cortex/activation/NeuralSignalExtractor";
import { LoggingUtils } from "../../utils/LoggingUtils";
import symbolicCognitionTimelineLogger from "../utils/SymbolicCognitionTimelineLoggerSingleton";
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
import { INeuralIntegrationService } from "../../symbolic-cortex/integration/INeuralIntegrationService";

// Neural processors
import { cleanThinkTags } from "../../utils/ThinkTagCleaner";
import {
  NeuralConfigurationBuilder,
  NeuralMemoryRetriever,
  NeuralSignalEnricher,
  ProcessingResultsSaver,
  ProcessorMode,
  ResponseGenerator,
  SessionManager,
  TranscriptionExtractor,
} from "./processors";

/**
 * Response from transcription processing
 */
export interface TranscriptionProcessingResponse {
  response: string;
  neuralActivation: NeuralSignalResponse;
  processingResults: NeuralProcessingResult[];
}

/**
 * Neural transcription cognitive orchestrator
 * Coordinates specialized processors for transcription prompt processing
 * Supports both Ollama and HuggingFace backends for cognitive diversity
 */
export class TranscriptionPromptProcessor {
  private isProcessingPrompt: boolean = false;
  private currentLanguage: string;

  // Neural components
  private _neuralSignalExtractor: NeuralSignalExtractor;

  // Specialized processors (SOLID architecture)
  private transcriptionExtractor!: TranscriptionExtractor;
  private configurationBuilder!: NeuralConfigurationBuilder;
  private sessionManager!: SessionManager;
  private signalEnricher!: NeuralSignalEnricher;
  private memoryRetriever!: NeuralMemoryRetriever;
  private responseGenerator!: ResponseGenerator;
  private resultsSaver!: ProcessingResultsSaver;

  constructor(
    private storageService: ITranscriptionStorageService,
    private memoryService: IMemoryService,
    private llmService: IOpenAIService, // Pode ser Ollama ou HuggingFace, já abstraído
    private uiService: IUIUpdateService,
    private speakerService: ISpeakerIdentificationService,
    private neuralIntegrationService: INeuralIntegrationService
  ) {
    this.currentLanguage = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR";
    this._neuralSignalExtractor = new NeuralSignalExtractor(this.llmService);

    // Inicializa os processors com a instância já abstraída (Ollama ou HuggingFace)
    this._initializeProcessors();
  }

  /**
   * Initialize all specialized neural processors following SOLID principles
   */
  private _initializeProcessors(): void {
    this.transcriptionExtractor = new TranscriptionExtractor(
      this.storageService
    );
    this.sessionManager = new SessionManager();

    this.configurationBuilder = new NeuralConfigurationBuilder(
      this.storageService,
      this.memoryService,
      this.speakerService,
      this.sessionManager
    );

    this.signalEnricher = new NeuralSignalEnricher(this.llmService);

    this.memoryRetriever = new NeuralMemoryRetriever(this.memoryService);

    this.responseGenerator = new ResponseGenerator(
      this.memoryService,
      this.llmService
    );

    this.resultsSaver = new ProcessingResultsSaver(
      this.memoryService,
      this.storageService,
      this.speakerService,
      this.sessionManager
    );
  }

  /**
   * Process transcription with LLM backend (Ollama in Advanced mode, OpenAI compatible)
   * Full neural processing with symbolic cognition
   */
  async processWithOpenAI(
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    await this._processTranscriptionPrompt(
      "openai",
      temporaryContext,
      conversationMessages
    );
  }

  /**
   * Process transcription with HuggingFace backend
   * Local neural processing with enhanced privacy
   */
  async processWithHuggingFace(
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    await this._processTranscriptionPrompt(
      "huggingface",
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
    const mode = this.llmService.constructor.name.includes("HuggingFace")
      ? "huggingface"
      : "openai";
    await this._processDirectMessage(
      mode,
      message,
      temporaryContext,
      conversationMessages
    );
  }

  /**
   * Process a direct message from chat interface
   */
  private async _processDirectMessage(
    mode: ProcessorMode,
    message: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessingPrompt) {
      LoggingUtils.logWarning(
        "Blocking prompt request: Already processing another prompt"
      );
      return;
    }

    this.uiService.updateUI({ aiResponse: "Processing..." });

    try {
      this.isProcessingPrompt = true;

      // Garante que o backend já abstraído está pronto
      if (!(await this.llmService.ensureOpenAIClient())) return;

      LoggingUtils.logInfo("Processing direct message from chat");

      // Log cognitive activities
      symbolicCognitionTimelineLogger.logRawPrompt(message);
      if (temporaryContext?.trim()) {
        LoggingUtils.logInfo(`Using additional context: "${temporaryContext}"`);
        symbolicCognitionTimelineLogger.logTemporaryContext(temporaryContext);
      }

      // Notify processing start
      this.uiService.notifyPromptProcessingStarted(temporaryContext);

      LoggingUtils.logInfo(
        `Processing message: "${message.substring(0, 50)}..."${
          temporaryContext ? " with additional context" : ""
        }`
      );

      // Process using orchestrated pipeline
      const result = await this._executeProcessingPipeline(
        mode,
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
      LoggingUtils.logError("Error processing message", error);
      this.uiService.updateUI({ aiResponse: `Error: ${errorMessage}` });
      this.uiService.notifyPromptError(errorMessage);
    } finally {
      this.isProcessingPrompt = false;
      LoggingUtils.logInfo("Message processing completed, releasing lock");
    }
  }

  /**
   * Main transcription processing orchestration - adaptable to different backends
   */
  private async _processTranscriptionPrompt(
    mode: ProcessorMode,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessingPrompt) {
      LoggingUtils.logWarning(
        "Blocking prompt request: Already processing another prompt"
      );
      return;
    }

    this.uiService.updateUI({ aiResponse: "Processing..." });

    try {
      this.isProcessingPrompt = true;

      // Garante que o backend já abstraído está pronto (Ollama ou HuggingFace)
      if (!(await this.llmService.ensureOpenAIClient())) return;

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
        return;
      }

      // Log cognitive activities
      symbolicCognitionTimelineLogger.logRawPrompt(promptText);

      // Log temporary context if provided
      if (temporaryContext?.trim()) {
        LoggingUtils.logInfo(`Using additional context: "${temporaryContext}"`);
        symbolicCognitionTimelineLogger.logTemporaryContext(temporaryContext);
      }

      LoggingUtils.logInfo(
        `Processing transcription: "${promptText.substring(0, 50)}..."${
          temporaryContext ? " with additional context" : ""
        }`
      );

      // Process using orchestrated pipeline
      const result = await this._executeProcessingPipeline(
        mode,
        promptText,
        temporaryContext,
        conversationMessages
      );

      // Update UI and complete processing
      this.uiService.updateUI({ aiResponse: result.response });
      this.uiService.notifyPromptComplete(result.response);

      // Note: Transcriptions were already marked as sent during extraction
      // This prevents race conditions and duplicate sends

      // Update UI to show only new transcriptions (empty initially)
      if (this.storageService.updateUIWithNewTranscriptions) {
        this.storageService.updateUIWithNewTranscriptions();
      }
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingUtils.logError("Error processing prompt", error);
      this.uiService.updateUI({ aiResponse: `Error: ${errorMessage}` });
      this.uiService.notifyPromptError(errorMessage);
    } finally {
      this.isProcessingPrompt = false;
      LoggingUtils.logInfo("Prompt processing completed, releasing lock");
    }
  }

  /**
   * Execute the full neural processing pipeline using specialized processors
   */
  private async _executeProcessingPipeline(
    mode: ProcessorMode,
    transcriptionToSend: string,
    temporaryContext?: string,
    conversationMessages?: any[]
  ): Promise<TranscriptionProcessingResponse> {
    // PHASE 1: Neural Signal Extraction
    LoggingUtils.logInfo(
      "🧠 Starting neural system: Phase 1 - Sensory analysis..."
    );

    const extractionConfig =
      await this.configurationBuilder.buildExtractionConfig(
        transcriptionToSend,
        temporaryContext,
        this.currentLanguage
      );
    const neuralActivation =
      await this._neuralSignalExtractor.extractNeuralSignals(extractionConfig);

    // PHASE 2: Query Enrichment
    const enrichedSignals = await this.signalEnricher.enrichSignals(
      neuralActivation.signals,
      this.currentLanguage
    );

    // PHASE 3: PARALLEL MEMORY RETRIEVAL (Jung + Modern Neuroscience)
    LoggingUtils.logInfo(
      "🧠 PHASE 3 - Parallel Specialized Memory Processing..."
    );

    const processingResults = await this.memoryRetriever.processSignals(
      enrichedSignals
    );

    LoggingUtils.logInfo(
      `✅ Phase 3 complete: ${processingResults.length} memory retrievals processed`
    );

    // PHASE 4: Neural Integration
    LoggingUtils.logInfo(
      "💥 PHASE 4 - Integrating neural processing into final prompt..."
    );
    const integrationResult = await this.neuralIntegrationService.integrate(
      processingResults,
      transcriptionToSend,
      this.currentLanguage
    );

    const integratedUserPrompt = integrationResult.prompt;

    // Log integration decision
    LoggingUtils.logInfo(
      `📊 Integration decision: ${
        integrationResult.isDeterministic ? "Deterministic" : "Probabilistic"
      }, Temperature: ${integrationResult.temperature}`
    );

    // Log symbolic context synthesis
    symbolicCognitionTimelineLogger.logSymbolicContextSynthesized({
      summary: integratedUserPrompt, // summary is required in SymbolicContext
      modules: processingResults.map((r: NeuralProcessingResult) => ({
        core: r.core,
        intensity: r.intensity,
      })),
    });

    // PHASE 5: Generate Response with dynamic temperature
    const fullResponse = await this.responseGenerator.generateResponse(
      integratedUserPrompt,
      integrationResult.temperature,
      temporaryContext,
      conversationMessages
    );

    const response = cleanThinkTags(fullResponse);

    // PHASE 6: Save and Log Results
    await this.resultsSaver.saveResults(
      transcriptionToSend,
      response,
      neuralActivation,
      processingResults
    );

    return {
      response,
      neuralActivation,
      processingResults,
    };
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
   * Reset transcription processing state across all processors
   */
  public reset(): void {
    this.isProcessingPrompt = false;
    this.transcriptionExtractor.reset();
    this.sessionManager.resetSession();
  }
}
