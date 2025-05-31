// SPDX-License-Identifier: MIT OR Apache-2.0
import { getOption, setOption, STORAGE_KEYS } from './../../../../services/StorageService';
import { ModeService } from './../../../../services/ModeService'; // Orch-OS Mode Cortex
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DeepgramTranscriptionService.ts
// Main transcription service for Deepgram that orchestrates other services

import { getPrimaryUser } from '../../../../config/UserConfig';
import { IDeepgramTranscriptionService } from "../interfaces/deepgram/IDeepgramService";
import { IMemoryService } from "../interfaces/memory/IMemoryService";
import { IOpenAIService } from "../interfaces/openai/IOpenAIService";
import { NeuralProcessingResult, NeuralSignalResponse, NeuralSignal } from "../interfaces/neural/NeuralSignalTypes";
import { ITranscriptionStorageService } from "../interfaces/transcription/ITranscriptionStorageService";
import { Message, SpeakerTranscription, SpeakerTranscriptionLog, UIUpdater } from "../interfaces/transcription/TranscriptionTypes";
import { ISpeakerIdentificationService } from "../interfaces/utils/ISpeakerIdentificationService";
import { IUIUpdateService } from "../interfaces/utils/IUIUpdateService";
import { NeuralSignalExtractor } from "../symbolic-cortex/activation/NeuralSignalExtractor";
import { DefaultNeuralIntegrationService } from "../symbolic-cortex/integration/DefaultNeuralIntegrationService";
import { INeuralIntegrationService } from "../symbolic-cortex/integration/INeuralIntegrationService";
import { LoggingUtils } from "../utils/LoggingUtils";
import symbolicCognitionTimelineLogger from "./utils/SymbolicCognitionTimelineLoggerSingleton";
import { SymbolicInsight } from "../types/SymbolicInsight";
import { MemoryService } from "./memory/MemoryService";
import { OpenAIService } from "./openai/OpenAIService";
import { TranscriptionStorageService } from "./transcription/TranscriptionStorageService";
import { SpeakerIdentificationService } from "./utils/SpeakerIdentificationService";
import { UIUpdateService } from "./utils/UIUpdateService";

export class DeepgramTranscriptionService implements IDeepgramTranscriptionService {
  /**
   * Index of the last line sent from the formatted UI transcription
   */
  private lastSentLineIndex: number = -1;

  // Essential services
  private speakerService: ISpeakerIdentificationService;
  private storageService: ITranscriptionStorageService;
  private memoryService: IMemoryService;
  private openAIService: IOpenAIService;
  private uiService: IUIUpdateService;

  // Configuration
  private model: string = getOption(STORAGE_KEYS.DEEPGRAM_MODEL) || "nova-2-general";
  private interimResultsEnabled: boolean = true;
  private useSimplifiedHistory: boolean = false;
  private currentLanguage: string = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || 'pt-BR';

  // Properties for the neural system
  private _brainSessionId?: string;
  private _interactionCount: number = 0;
  private _neuralMemory: Array<{
    timestamp: number;
    core: string;
    intensity: number;
    pattern?: string;
  }> = [];

  // Processing prompt flag
  private isProcessingPrompt: boolean = false;

  /**
   * Returns the current state of prompt processing
   * @returns true if a prompt is currently being processed, false otherwise
   */
  public isProcessingPromptRequest(): boolean {
    return this.isProcessingPrompt;
  }

  // Neural signal extractor (first impulse of the artificial mind)
  private _neuralSignalExtractor: NeuralSignalExtractor;

  // Neural integration service
  private neuralIntegrationService: INeuralIntegrationService;

  constructor(setTexts: UIUpdater, primaryUserSpeaker: string = getPrimaryUser()) {
    // Initialize services
    this.speakerService = new SpeakerIdentificationService(primaryUserSpeaker);
    this.storageService = new TranscriptionStorageService(this.speakerService, setTexts);
    this.openAIService = new OpenAIService();
    this.memoryService = new MemoryService(this.openAIService);
    this.uiService = new UIUpdateService(setTexts);

    // Initialize the neural signal extractor
    this._neuralSignalExtractor = new NeuralSignalExtractor(this.openAIService);

    // Initialize the neural integration service
    this.neuralIntegrationService = new DefaultNeuralIntegrationService(this.openAIService);

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
    return this.speakerService.isOnlyUserSpeaking(this.storageService.getSpeakerTranscriptions());
  }

  /**
   * Activates or deactivates the simplified history mode
   */
  setSimplifiedHistoryMode(enabled: boolean): void {
    this.useSimplifiedHistory = enabled;
    this.memoryService.setSimplifiedHistoryMode(enabled);
    LoggingUtils.logInfo(`Simplified history mode: ${enabled ? "activated" : "deactivated"}`);
  }

  /**
   * Generates a consistent session ID for the symbolic brain
   * @returns Session ID for neural continuity tracking
   */
  private generateSessionId(): string {
    // Create an ID if it doesn't exist, or use the existing one for continuity
    if (!this._brainSessionId) {
      this._brainSessionId = `brain-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    return this._brainSessionId;
  }

  /**
   * Saves neural processing data for system evolution
   * This method helps the artificial brain to "evolve" over time
   * @param activation Initial neural activations
   * @param processingResults Processing results
   */
  private async saveNeuralProcessingData(
    activation: NeuralSignalResponse,
    processingResults: NeuralProcessingResult[] = []
  ): Promise<void> {
    try {
      // Increment the neural interaction counter (brain maturity)
      this._interactionCount++;

      // Store activation data for neural continuity
      const timestamp = Date.now();

      // Store only the main insights of each processed core
      const memorizedInsights = processingResults.map(result => ({
        timestamp,
        core: result.core,
        intensity: result.intensity,
        // Extract only the main insights to store in memory
        insights: Object.entries(result.insights || {})
          .slice(0, 3) // Limit to 3 insights per core to avoid memory overload
          .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
      }));

      // Store only the N most recent insights to limit memory usage
      this._neuralMemory = [
        ...this._neuralMemory,
        ...memorizedInsights
      ].slice(-100); // Keep only the 100 most recent insights

      // In a real implementation, we could save this to a database for persistence
      LoggingUtils.logInfo(`Neural memory updated: ${memorizedInsights.length} new insights`);
    } catch (error) {
      // Errors here should not interrupt the main flow
      LoggingUtils.logError("Error saving neural data", error);
    }
  }

  /**
   * Processes the transcription and sends it to the OpenAI API
   */
  async sendTranscriptionPrompt(temporaryContext?: string): Promise<void> {
    // If already processing a prompt, block new request
    if (this.isProcessingPrompt) {
      LoggingUtils.logWarning("Blocking prompt request: Already processing another prompt");
      return;
    }

    if (window.electronAPI.sendPromptUpdate) {
      window.electronAPI.sendPromptUpdate('partial', "Processing...");
    }

    try {
      // Mark that we are processing a prompt
      this.isProcessingPrompt = true;
      // Verify if there is text to process
      const hasTranscriptions = this.storageService.hasValidTranscriptions();

      if (!hasTranscriptions) {
        LoggingUtils.logWarning("No transcription detected");

        // Verify if there is text in lastTranscription (it might not have gone to transcriptionList)
        if (this.storageService.getLastTranscription()) {
          LoggingUtils.logInfo(`Using last known transcription: "${this.storageService.getLastTranscription()}"`);
        } else if (!temporaryContext) {
          // Notify error if there is no transcription or context
          LoggingUtils.logInfo(`No transcription detected for processing`);
          return;
        }
      }

      // Ensure OpenAI client is initialized
      if (!await this.openAIService.ensureOpenAIClient()) return;

      // Notify prompt processing start via IPC
      this.uiService.notifyPromptProcessingStarted(temporaryContext);

      // Get relevant context from long-term memory, based on speakers
      // --- Deduplication by position: always sends lines starting from the last index sent ---
      const fullTranscription = this.storageService.getUITranscriptionText();
      const lines = fullTranscription.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const newLines = lines.slice(this.lastSentLineIndex + 1);

      if (newLines.length === 0) {
        LoggingUtils.logInfo("No new transcription to send.");
        return;
      }
      const transcriptionToSend = newLines.join('\n');
      // LOG COGNITIVO: prompt bruto
      symbolicCognitionTimelineLogger.logRawPrompt(transcriptionToSend);
      // COGNITIVE LOG: temporary context, if present
      if (temporaryContext && temporaryContext.trim().length > 0) {
        symbolicCognitionTimelineLogger.logTemporaryContext(temporaryContext);
      }
      // After successful send, update the index
      this.lastSentLineIndex = lines.length - 1;

      LoggingUtils.logInfo(`Processing transcription: "${transcriptionToSend.substring(0, 50)}..."`);

      // [NEURAL IMPULSE] Phase 1: Identification of which brain areas should be activated
      LoggingUtils.logInfo("🧠 Starting neural system: Phase 1 - Sensory analysis...");

      // Get relevant context from long-term memory before neural extraction
      const userTranscriptions = this.storageService.getSpeakerTranscriptions().filter(transcription => transcription.speaker.includes(getPrimaryUser()));
      const detectedSpeakers = this.storageService.getDetectedSpeakers();
      // If desired, obtain externalTranscriptions according to your model, or leave as empty array
      const externalTranscriptions = this.storageService.getSpeakerTranscriptions().filter(transcription => transcription.speaker !== getPrimaryUser());

      const userContextData = await this.memoryService.fetchContextualMemory(
        userTranscriptions,
        externalTranscriptions,
        detectedSpeakers,
        temporaryContext
      );

      // Configure neural signal extraction with current context
      const extractionConfig = {
        transcription: transcriptionToSend,
        temporaryContext: temporaryContext,
        sessionState: {
          sessionId: this.generateSessionId(),
          interactionCount: this._interactionCount,
          timestamp: new Date().toISOString(),
          language: this.currentLanguage // Add current language to session state
        },
        speakerMetadata: {
          primarySpeaker: this.speakerService.getPrimaryUserSpeaker(),
          detectedSpeakers: Array.from(detectedSpeakers),
          speakerTranscriptions: userTranscriptions
        },
        userContextData // <-- user context now included
      };

      // PHASE 1: Extract neural signals - determine which brain areas to activate
      // This is the first impulse of the artificial mind - initial stimulus detection
      const neuralActivation = await this._neuralSignalExtractor.extractNeuralSignals(extractionConfig);

      // QUERY ENRICHMENT: For each activated core, semantically expand the query using the enrichSemanticQueryForSignal tool
      const enrichedSignals = await Promise.all(
        neuralActivation.signals.map(async (signal: NeuralSignal) => {
          try {
            const enrichment = await this.openAIService.enrichSemanticQueryForSignal(
              signal.core,
              signal.symbolic_query?.query || '',
              signal.intensity,
              (typeof signal === 'object' && signal && 'context' in signal) ? (signal.context as string) : undefined,
              this.currentLanguage
            );
            // Dynamically adjust topK if not defined
            let topK = signal.topK;
            if (typeof topK !== 'number' || isNaN(topK)) {
              // Example: maximum intensity searches for more memories
              topK = Math.round(5 + (signal.intensity || 0) * 10); // 5~15
            }
            // Garantir que filters/contextHints existam se forem passados
            const filters = signal.filters || undefined;

            // Log detalhado para debug
            LoggingUtils.logInfo(`[Enrichment] Core: ${signal.core} | Query: ${enrichment.enrichedQuery} | Keywords: ${JSON.stringify(enrichment.keywords)}  | Filters: ${JSON.stringify(filters)} | topK: ${topK}`);
            return {
              ...signal,
              symbolic_query: {
                ...signal.symbolic_query,
                query: enrichment.enrichedQuery
              },
              keywords: enrichment.keywords,

              filters,
              topK
            };
          } catch (err) {
            LoggingUtils.logError(`Error enriching query for core ${signal.core}`, err);
            return signal; // fallback para a query original
          }
        })
      );

      // Log Neural Signal
      for (const signal of enrichedSignals) {
        symbolicCognitionTimelineLogger.logNeuralSignal(
          signal.core,
          {
            query: signal.symbolic_query?.query || '',
            keywords: signal.keywords ?? [],
            filters: signal.filters ?? {},
            // Add other required SymbolicQuery fields if necessary
          },
          signal.intensity,
          signal.topK || 10,
          (typeof signal === 'object' && signal && 'params' in signal)
            ? (signal.params as Record<string, unknown>)
            : {}
        );
      }

      // PHASE 2: Process each activated neural core individually
      LoggingUtils.logInfo(`⚡ Segunda fase - Processando ${neuralActivation.signals.length} áreas cerebrais ativadas...`);

      // Processamento de cada sinal neural ativado

      const pineconeResults = await Promise.all(
        enrichedSignals.map(async (signal) => {
          LoggingUtils.logInfo(`→ Activating neural core: ${signal.core} (${(signal.intensity * 100).toFixed(1)}%)`);
          let pineconeResults: string[] = [];
          // Corrigir insights para garantir type safety (Record<string, unknown>)
          let insights: Record<string, unknown> = {};
          if (Array.isArray(signal.symbolicInsights)) {
            insights = signal.symbolicInsights.reduce((acc: Record<string, unknown>, ins: SymbolicInsight) => {
              if (ins && typeof ins.type === 'string') {
                acc[ins.type] = ins;
              }
              return acc;
            }, {});
          } else if (typeof signal.symbolicInsights === 'object' && signal.symbolicInsights !== null) {
            insights = signal.symbolicInsights;
          }
          let matchCount = 0;
          let durationMs = 0;
          const start = Date.now();

          try {
            // Pass filters for contextualized search, if supported
            const pineconeResult = await this.memoryService.queryExpandedMemory(
              signal.symbolic_query?.query || '',
              signal.keywords,
              signal.topK,
              signal.filters,
            );
            durationMs = Date.now() - start;
            if (pineconeResult) {
              pineconeResults = Array.isArray(pineconeResult) ? pineconeResult : [pineconeResult];
              matchCount = pineconeResults.length;
            }
          } catch (pineconeError) {
            LoggingUtils.logError(`Error searching memories in Pinecone for core ${signal.core}`, pineconeError);
          }

          // Symbolic retrieval log
          // Converter insights (Record<string, unknown>) para SymbolicInsight[] para logging
          const insightsArray: SymbolicInsight[] = Object.values(insights) as SymbolicInsight[];
          symbolicCognitionTimelineLogger.logSymbolicRetrieval(
            signal.core,
            insightsArray,
            matchCount,
            durationMs
          );

          // Corrigir insights para garantir type safety (Record<string, unknown>)
          let safeInsights: Record<string, unknown> = {};
          if (Array.isArray(insights)) {
            safeInsights = insights.reduce((acc: Record<string, unknown>, ins: SymbolicInsight) => {
              if (ins && typeof ins.type === 'string') {
                acc[ins.type] = ins;
              }
              return acc;
            }, {});
          } else if (typeof insights === 'object' && insights !== null) {
            safeInsights = insights;
          }
          return {
            ...signal,
            pineconeResults,
            insights: safeInsights
          };
        })
      );

      // Map results to the standard neural processing format
      const neuralProcessingResults: NeuralProcessingResult[] = pineconeResults.map(signal => ({
        core: signal.core,
        intensity: signal.intensity,
        output: signal.pineconeResults.join("\n"),
        insights: Array.isArray(signal.symbolicInsights)
          ? signal.symbolicInsights.reduce((acc: Record<string, unknown>, ins: SymbolicInsight) => {
            if (ins && typeof ins.type === 'string') {
              acc[ins.type] = ins;
            }
            return acc;
          }, {})
          : (typeof signal.symbolicInsights === 'object' && signal.symbolicInsights !== null ? signal.symbolicInsights : {})
      }));

      // Phase 3: Integrate all signals into a consolidated prompt
      symbolicCognitionTimelineLogger.logFusionInitiated();
      LoggingUtils.logInfo("💥 Third phase - Integrating neural processing into final prompt...");
      const integratedPrompt = await this.neuralIntegrationService.integrate(
        neuralProcessingResults,
        transcriptionToSend,
        this.currentLanguage // Pass the current language to the neural integration service
      );
      // Symbolic context synthesis log
      symbolicCognitionTimelineLogger.logSymbolicContextSynthesized({
        summary: integratedPrompt, // summary is required in SymbolicContext
        fusionPrompt: integratedPrompt,
        modules: neuralProcessingResults.map(r => ({ core: r.core, intensity: r.intensity }))
      });

      // --- [NOVO FLUXO] ---
      // 1. Add context messages to the actual history (if present)
      const contextMessages: Message[] = [];
      // Example: add temporaryContext as instruction, if it exists
      if (temporaryContext && temporaryContext.trim().length > 0) {
        contextMessages.push({
          role: "developer",
          content: `🧠 Temporary instructions:\n${temporaryContext.trim()}`
        });
      }
      // (Optional) Add other relevant memories/contexts here
      if (contextMessages.length > 0) {
        this.memoryService.addContextToHistory(contextMessages);
      }

      // 2. Compose messages for the model: actual history + neural prompt
      const conversationHistory = this.memoryService.getConversationHistory();
      const messages = this.memoryService.buildPromptMessagesForModel(
        integratedPrompt,
        conversationHistory
      );

      // 3. Send request to OpenAI API and process response stream
      const response = await this.openAIService.streamOpenAIResponse(messages);

      // 6. Final Log of User Response (text, symbolic topics, insights)
      const symbolicTopics = neuralProcessingResults.map(r => r.core);
      // Ensure insights is always SymbolicInsight[], never a generic object
      const importantInsights: SymbolicInsight[] = neuralProcessingResults
        .flatMap(r => Array.isArray(r.insights) ? r.insights : [])
        .filter(insight => insight && typeof insight.type === 'string');
      symbolicCognitionTimelineLogger.logGptResponse({
        response: response.response,
        symbolicTopics,
        insights: importantInsights
      });

      // 4. Update the actual history with the user's original transcription and the model's response
      this.memoryService.addToConversationHistory({ role: "user", content: transcriptionToSend });

      // 5. Save to long-term memory with speaker information
      await this.memoryService.saveToLongTermMemory(
        transcriptionToSend,
        response.response,
        this.storageService.getSpeakerTranscriptions(),
        this.speakerService.getPrimaryUserSpeaker()
      );

      // 6. Also log the generated neural context for brain evolution
      await this.saveNeuralProcessingData(neuralActivation, neuralProcessingResults);

      // 7. Update UI and notify about final response
      this.uiService.updateUI({ aiResponse: response.response });
      this.uiService.notifyPromptComplete(response.response);

    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggingUtils.logError("Error processing prompt", error);
      this.uiService.updateUI({ aiResponse: `Error: ${errorMessage}` });
      this.uiService.notifyPromptError(errorMessage);
    } finally {
      // Always release the processing lock at the end, regardless of the result
      this.isProcessingPrompt = false;
      LoggingUtils.logInfo("Prompt processing completed, releasing lock");
    }
  }

  /**
   * Loads the OpenAI API key from the environment
   */
  private async loadApiKey(): Promise<void> {
    await this.openAIService.loadApiKey();
  }

  // Implementation of IDeepgramTranscriptionService methods

  async connect(language?: string): Promise<void> {
    if (language) {
      this.currentLanguage = language;
    }
    LoggingUtils.logInfo(`Connecting transcription service. Language: ${this.currentLanguage}`);
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
    this.model = model;
    LoggingUtils.logInfo(`Model defined for: ${model}`);
    // Optional: save to StorageService
    setOption(STORAGE_KEYS.DEEPGRAM_MODEL, model);
  }

  toggleInterimResults(enabled: boolean): void {
    this.interimResultsEnabled = enabled;
    LoggingUtils.logInfo(`Interim results: ${enabled ? "enabled" : "disabled"}`);
  }

  // ... (rest of the code remains the same)
  reset(): void {
    LoggingUtils.logInfo("Resetting transcription state");
    this.clearTranscriptionData();
    this.lastSentLineIndex = -1;
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
      LoggingUtils.logInfo(`Auto-question detection ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}