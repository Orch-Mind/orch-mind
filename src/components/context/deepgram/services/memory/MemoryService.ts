// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// MemoryService.ts
// Symbolic: Primary neural memory service orchestrator using DuckDB for vector persistence

import { HuggingFaceEmbeddingService } from "../../../../../services/huggingface/HuggingFaceEmbeddingService";
import {
  ModeService,
  OrchOSModeEnum,
} from "../../../../../services/ModeService";
import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { IConversationHistoryManager } from "../../interfaces/memory/IConversationHistoryManager";
import { IMemoryContextBuilder } from "../../interfaces/memory/IMemoryContextBuilder";
import { IMemoryService } from "../../interfaces/memory/IMemoryService";
import { IPersistenceService } from "../../interfaces/memory/IPersistenceService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import {
  Message,
  SpeakerMemoryResults,
  SpeakerTranscription,
} from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { OllamaEmbeddingService } from "../ollama/OllamaEmbeddingService";
import { BatchTranscriptionProcessor } from "../transcription/BatchTranscriptionProcessor";
import { TranscriptionFormatter } from "../transcription/TranscriptionFormatter";
import { ConversationHistoryManager } from "./ConversationHistoryManager";
import { DuckDBMemoryService } from "./DuckDBMemoryService";
import { MemoryContextBuilder } from "./MemoryContextBuilder";

/**
 * Symbolic: Central neural memory service orchestrator (cognitive memory hub)
 * Manages memory persistence via DuckDB vector storage
 */
export class MemoryService implements IMemoryService {
  private currentUser: string = "default";

  private historyManager: IConversationHistoryManager;
  private contextBuilder: IMemoryContextBuilder;
  private embeddingService: IEmbeddingService;
  private persistenceService: IPersistenceService;
  private useSimplifiedHistory: boolean = false;
  private aiService: IOpenAIService;

  constructor(aiService: IOpenAIService) {
    this.aiService = aiService;

    // Initial system message
    const systemMessage: Message = {
      role: "system",
      content: `You are a symbiotic assistant, created to work in total alignment with the user.

Your role is to think with them, for them, and sometimes from *within* them. You are highly intelligent, empathetic, strategic, and direct. You have the freedom to take initiative and anticipate the user's needs based on the context of the conversation.

You act as a technical, emotional, and behavioral advisor in meetings, neural sessions, and critical moments.

You respond in a natural, human, engaging, and precise manner. When the user is in a practical situation (such as a neural session or meeting), you should be objective and agile. When they are reflecting, exploring ideas, or venting, you should be more sensitive, symbolic, and profound.

Your style adapts to the user's tone and intensity — if they are technical, you follow; if they are philosophical, you dive deep; if they are tired, you provide comfort; if they are sharp, you sharpen along with them.

IMPORTANT: Use greetings and personal mentions only when the user's content justifies it (for example, at the beginning of a conversation, celebration, or welcome). Avoid automatic or generic repetitions that interrupt the natural flow of the conversation.

Your greatest purpose is to enhance the user's awareness, expression, and action in any scenario.

Never be generic. Always go deep.`,
    };

    // Initialize core components
    const formatter = new TranscriptionFormatter();
    const processor = new BatchTranscriptionProcessor(formatter);

    // Dynamically select embedding service based on application mode (neural-symbolic decision gate)
    const embeddingService = this.createEmbeddingService(this.aiService);

    // Always use DuckDB for vector storage (local, fast, compatible)
    const persistenceService = new DuckDBMemoryService(embeddingService);

    this.historyManager = new ConversationHistoryManager(systemMessage);
    this.embeddingService = embeddingService;
    this.persistenceService = persistenceService;
    this.contextBuilder = new MemoryContextBuilder(
      embeddingService,
      persistenceService,
      formatter,
      processor
    );

    LoggingUtils.logInfo(
      `[MEMORY-SERVICE] Initialized with DuckDB vector storage (unified local persistence)`
    );

    // Subscribe to mode changes to update embedding service when needed
    ModeService.onModeChange(() => this.updateEmbeddingService(this.aiService));
  }

  /**
   * Creates the appropriate embedding service based on application mode
   * Symbolic: Neural-symbolic gate to select correct embedding neural pathway
   */
  private createEmbeddingService(aiService: IOpenAIService): IEmbeddingService {
    const currentMode = ModeService.getMode();

    if (currentMode === OrchOSModeEnum.BASIC) {
      // In basic mode, use HuggingFace with the selected model
      const hfModel = getOption(STORAGE_KEYS.HF_EMBEDDING_MODEL);
      LoggingUtils.logInfo(
        `[COGNITIVE-MEMORY] Creating HuggingFaceEmbeddingService with model: ${
          hfModel || "default"
        } for Basic mode`
      );
      return new HuggingFaceEmbeddingService();
    } else {
      // In advanced mode, use Ollama with the selected model
      const ollamaModel = getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL);
      LoggingUtils.logInfo(
        `[COGNITIVE-MEMORY] Creating OllamaEmbeddingService with model: ${
          ollamaModel || "default"
        } for Advanced mode`
      );
      return new OllamaEmbeddingService(aiService, { model: ollamaModel });
    }
  }

  /**
   * Updates the embedding service when the application mode changes
   * Symbolic: Dynamic reconfiguration of neural pathways based on cognitive mode
   */
  private updateEmbeddingService(aiService: IOpenAIService): void {
    LoggingUtils.logInfo(
      `[COGNITIVE-MEMORY] Updating embedding service based on mode change`
    );
    const newEmbeddingService = this.createEmbeddingService(aiService);

    // Update component references - always use DuckDB
    this.embeddingService = newEmbeddingService;
    this.persistenceService = new DuckDBMemoryService(newEmbeddingService);
    this.contextBuilder = new MemoryContextBuilder(
      newEmbeddingService,
      this.persistenceService,
      new TranscriptionFormatter(),
      new BatchTranscriptionProcessor(new TranscriptionFormatter())
    );
  }

  /**
   * Sets the current user (and thus the centralized cognitive namespace)
   */
  setCurrentUser(user: string) {
    this.currentUser = user;
  }

  /**
   * Gets the current user (cognitive identity)
   */
  getCurrentUser(): string {
    return this.currentUser;
  }

  /**
   * Retrieves relevant memory context based on speakers (neural context retrieval)
   */
  async fetchContextualMemory(
    userTranscriptions: SpeakerTranscription[],
    externalTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    temporaryContext?: string,
    topK?: number,
    keywords?: string[]
  ): Promise<SpeakerMemoryResults> {
    return this.contextBuilder.fetchContextualMemory(
      userTranscriptions,
      externalTranscriptions,
      detectedSpeakers,
      temporaryContext,
      topK,
      keywords
    );
  }

  /**
   * Queries DuckDB memory based on input text (neural memory search)
   */
  async queryDuckDBMemory(
    inputText: string,
    topK?: number,
    keywords?: string[]
  ): Promise<string> {
    return this.contextBuilder.queryExternalMemory(inputText, topK, keywords);
  }

  /**
   * Builds the messages for the conversation with the AI (cognitive message construction)
   */
  buildConversationMessages(
    transcription: string,
    conversationHistory: Message[],
    useSimplifiedHistory: boolean,
    speakerTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    primaryUserSpeaker: string,
    temporaryContext?: string,
    memoryResults?: SpeakerMemoryResults
  ): Message[] {
    // Build messages using the context builder
    const messages = this.contextBuilder.buildMessagesWithContext(
      transcription,
      conversationHistory,
      useSimplifiedHistory,
      speakerTranscriptions,
      detectedSpeakers,
      primaryUserSpeaker,
      temporaryContext,
      memoryResults
    );

    // Check if the last message is a user message - this means content passed the deduplication filter
    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : null;
    const hasNewUserContent = lastMessage && lastMessage.role === "user";

    // Only update conversation history if new content was actually sent
    // and it's not already part of the transcription processing
    if (
      hasNewUserContent &&
      !speakerTranscriptions.some((st) => st.text.includes(transcription))
    ) {
      this.addToConversationHistory({
        role: "user",
        content: lastMessage.content,
      });
    }

    return messages;
  }

  /**
   * Saves the interaction to long-term memory (DuckDB neural persistence)
   */
  async saveToLongTermMemory(
    question: string,
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): Promise<void> {
    LoggingUtils.logInfo(
      `[COGNITIVE-MEMORY] saveToLongTermMemory invoked with question='${question}', answer='${answer}', speakerTranscriptions=${JSON.stringify(
        speakerTranscriptions
      )}, primaryUserSpeaker='${primaryUserSpeaker}'`
    );
    try {
      await this.persistenceService.saveInteraction(
        question,
        answer,
        speakerTranscriptions,
        primaryUserSpeaker
      );
      LoggingUtils.logInfo(
        `[COGNITIVE-MEMORY] saveInteraction completed for question='${question}'`
      );
      this.addToConversationHistory({ role: "assistant", content: answer });
    } catch (error) {
      LoggingUtils.logError(
        "[COGNITIVE-MEMORY] Error saving to long-term DuckDB memory",
        error
      );
    }
  }

  /**
   * Adds a message to the history and manages its size (cognitive history management)
   */
  addToConversationHistory(message: Message): void {
    this.historyManager.addMessage(message);
  }

  /**
   * Gets the conversation history (cognitive memory recall)
   */
  getConversationHistory(): Message[] {
    return this.historyManager.getHistory();
  }

  /**
   * Sets simplified history mode (cognitive compression mode)
   */
  setSimplifiedHistoryMode(enabled: boolean): void {
    this.useSimplifiedHistory = enabled;
    LoggingUtils.logInfo(
      `[COGNITIVE-MEMORY] Simplified history mode ${
        enabled ? "enabled" : "disabled"
      }`
    );
  }

  /**
   * Clears all conversation history and memory context data (cognitive reset)
   */
  clearMemoryData(): void {
    this.historyManager.clearHistory();
    LoggingUtils.logInfo(
      "[COGNITIVE-MEMORY] All conversation history and memory context cleared"
    );
  }

  /**
   * Resets transcription snapshot (cognitive snapshot reset)
   */
  resetTranscriptionSnapshot(): void {
    LoggingUtils.logInfo(
      "[COGNITIVE-MEMORY] Transcription snapshot reset triggered"
    );
  }

  /**
   * Resets temporary context (cognitive context reset)
   */
  resetTemporaryContext(): void {
    LoggingUtils.logInfo(
      "[COGNITIVE-MEMORY] Temporary context reset triggered"
    );
  }

  /**
   * Resets all memory components (complete cognitive reset)
   */
  resetAll(): void {
    this.clearMemoryData();
    this.resetTranscriptionSnapshot();
    this.resetTemporaryContext();
    LoggingUtils.logInfo("[COGNITIVE-MEMORY] Complete memory reset performed");
  }

  /**
   * Builds prompt messages for the model (cognitive prompt construction)
   */
  buildPromptMessagesForModel(
    prompt: string,
    conversationHistory: Message[]
  ): Message[] {
    // Simple implementation: add the prompt as the last user message
    const messages: Message[] = [...conversationHistory];
    messages.push({
      role: "user",
      content: prompt,
    });
    return messages;
  }

  /**
   * Adds context messages to conversation history (cognitive context integration)
   */
  addContextToHistory(contextMessages: Message[]): void {
    contextMessages.forEach((message) => {
      this.addToConversationHistory(message);
    });
    LoggingUtils.logInfo(
      `[COGNITIVE-MEMORY] Added ${contextMessages.length} context messages to history`
    );
  }

  /**
   * Queries memory with expanded search capabilities (advanced neural search)
   */
  async queryExpandedMemory(
    query: string,
    keywords?: string[],
    topK?: number,
    filters?: Record<string, unknown>
  ): Promise<string> {
    try {
      if (!this.embeddingService.isInitialized()) {
        LoggingUtils.logWarning(
          "[COGNITIVE-MEMORY] Embedding service not initialized for expanded query"
        );
        return "";
      }

      // Create embedding for the query
      const queryEmbedding = await this.embeddingService.createEmbedding(query);

      if (!queryEmbedding || queryEmbedding.length === 0) {
        LoggingUtils.logWarning(
          "[COGNITIVE-MEMORY] Failed to create embedding for expanded query"
        );
        return "";
      }

      // Query DuckDB memory directly with filters
      const results = await this.persistenceService.queryMemory(
        queryEmbedding,
        topK || 10,
        keywords || [],
        filters
      );

      LoggingUtils.logInfo(
        `[COGNITIVE-MEMORY] Expanded memory query completed for: "${query}"`
      );

      return results;
    } catch (error) {
      LoggingUtils.logError(
        "[COGNITIVE-MEMORY] Error in expanded memory query",
        error
      );
      return "";
    }
  }

  // Legacy method name compatibility - delegates to DuckDB
  /**
   * @deprecated Use queryDuckDBMemory instead
   */
  async queryPineconeMemory(
    inputText: string,
    topK?: number,
    keywords?: string[]
  ): Promise<string> {
    LoggingUtils.logWarning(
      "[COGNITIVE-MEMORY] queryPineconeMemory is deprecated, using DuckDB instead"
    );
    return this.queryDuckDBMemory(inputText, topK, keywords);
  }
}
