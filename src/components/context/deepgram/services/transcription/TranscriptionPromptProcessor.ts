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
  async processWithOpenAI(temporaryContext?: string): Promise<void> {
    await this._processTranscriptionPrompt("openai", temporaryContext);
  }

  /**
   * Process transcription with HuggingFace backend
   * Local neural processing with enhanced privacy
   */
  async processWithHuggingFace(temporaryContext?: string): Promise<void> {
    await this._processTranscriptionPrompt("huggingface", temporaryContext);
  }

  /**
   * Main transcription processing orchestration - adaptable to different backends
   */
  private async _processTranscriptionPrompt(
    mode: ProcessorMode,
    temporaryContext?: string
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

      // Validate transcription availability
      const hasTranscriptions = this.storageService.hasValidTranscriptions();

      if (!hasTranscriptions) {
        LoggingUtils.logWarning("No transcription detected");

        // Verify if there is text in lastTranscription (it might not have gone to transcriptionList)
        if (this.storageService.getLastTranscription()) {
          LoggingUtils.logInfo(
            `Using last known transcription: "${this.storageService.getLastTranscription()}"`
          );
        } else if (!temporaryContext) {
          // Notify error if there is no transcription or context
          this.uiService.notifyPromptError(
            "No transcription detected for processing"
          );
          LoggingUtils.logInfo(`No transcription detected for processing`);
          return;
        } else {
          this.uiService.notifyPromptError(
            "No transcription detected for processing"
          );
        }
      }

      // Garante que o backend já abstraído está pronto (Ollama ou HuggingFace)
      if (!(await this.llmService.ensureOpenAIClient())) return;

      // Notify processing start
      this.uiService.notifyPromptProcessingStarted(temporaryContext);

      // Extract new transcription lines or fallback to temporary context (manual prompt)
      const extractedLines = this.transcriptionExtractor.extractNewLines();
      let promptText: string | null = extractedLines;

      if (!promptText || promptText.trim().length === 0) {
        // Use temporaryContext as fallback when in Basic mode (manual prompt input)
        if (temporaryContext?.trim()?.length) {
          promptText = temporaryContext.trim();
          LoggingUtils.logInfo("Using temporary context as prompt input.");
        } else {
          LoggingUtils.logInfo(
            "No new transcription or temporary context to send."
          );
          return;
        }
      }

      // Log cognitive activities
      symbolicCognitionTimelineLogger.logRawPrompt(promptText);
      if (temporaryContext?.trim()) {
        symbolicCognitionTimelineLogger.logTemporaryContext(temporaryContext);
      }

      LoggingUtils.logInfo(
        `Processing transcription: "${promptText.substring(0, 50)}..."`
      );

      // Process using orchestrated pipeline
      const result = await this._executeProcessingPipeline(
        mode,
        promptText,
        temporaryContext
      );

      // Update UI and complete processing
      this.uiService.updateUI({ aiResponse: result.response });
      this.uiService.notifyPromptComplete(result.response);
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
    temporaryContext?: string
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

    // PHASE 2: Query Enrichment & Memory Retrieval
    const enrichedSignals = await this.signalEnricher.enrichSignals(
      neuralActivation.signals,
      this.currentLanguage
    );
    const processingResults = await this.memoryRetriever.processSignals(
      enrichedSignals,
    );

    // PHASE 3: Neural Integration
    LoggingUtils.logInfo(
      "💥 Third phase - Integrating neural processing into final prompt..."
    );
    const integratedPrompt = await this.neuralIntegrationService.integrate(
      processingResults,
      transcriptionToSend,
      this.currentLanguage
    );

    // Symbolic context synthesis log (clean think tags before logging)
    const cleanIntegratedPrompt = cleanThinkTags(integratedPrompt);
    symbolicCognitionTimelineLogger.logSymbolicContextSynthesized({
      summary: cleanIntegratedPrompt, // summary is required in SymbolicContext
      modules: processingResults.map((r) => ({
        core: r.core,
        intensity: r.intensity,
      })),
    });

    // PHASE 4: Generate Response
    const fullResponse = await this.responseGenerator.generateResponse(
      cleanIntegratedPrompt,
      temporaryContext
    );

    const response = cleanThinkTags(fullResponse);

    // PHASE 5: Save and Log Results
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
