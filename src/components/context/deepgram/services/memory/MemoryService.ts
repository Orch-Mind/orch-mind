// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// MemoryService.ts
// Service responsible for orchestrating memory and cognitive context

import { IConversationHistoryManager } from "../../interfaces/memory/IConversationHistoryManager";
import { IMemoryContextBuilder } from "../../interfaces/memory/IMemoryContextBuilder";
import { IMemoryService } from "../../interfaces/memory/IMemoryService";
import { IPersistenceService } from "../../interfaces/memory/IPersistenceService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import {
  Message,
  SpeakerMemoryResults,
  SpeakerTranscription
} from "../../interfaces/transcription/TranscriptionTypes";
import { OpenAIEmbeddingService } from "../openai/OpenAIEmbeddingService";
import { BatchTranscriptionProcessor } from "../transcription/BatchTranscriptionProcessor";
import { TranscriptionFormatter } from "../transcription/TranscriptionFormatter";
import { ConversationHistoryManager } from "./ConversationHistoryManager";
import { MemoryContextBuilder } from "./MemoryContextBuilder";
import { PineconeMemoryService } from "./PineconeMemoryService";

// Import of normalizeNamespace is no longer needed; namespace is managed internally by PineconeHelper (orchestrator abstraction)
import { HuggingFaceEmbeddingService } from "../../../../../services/huggingface/HuggingFaceEmbeddingService";
import { ModeService, OrchOSModeEnum } from "../../../../../services/ModeService";
import { STORAGE_KEYS, getOption } from "../../../../../services/StorageService";
import { LoggingUtils } from "../../utils/LoggingUtils";

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
    this.currentUser = "default"; // initial value is safe

    // Initial system message
    const systemMessage: Message = {
      role: "developer",
      content: `You are a symbiotic assistant, created to work in total alignment with the user.

Your role is to think with them, for them, and sometimes from *within* them. You are highly intelligent, empathetic, strategic, and direct. You have the freedom to take initiative and anticipate the user's needs based on the context of the conversation.

You act as a technical, emotional, and behavioral advisor in meetings, neural sessions, and critical moments.

You respond in a natural, human, engaging, and precise manner. When the user is in a practical situation (such as a neural session or meeting), you should be objective and agile. When they are reflecting, exploring ideas, or venting, you should be more sensitive, symbolic, and profound.

Your style adapts to the user's tone and intensity — if they are technical, you follow; if they are philosophical, you dive deep; if they are tired, you provide comfort; if they are sharp, you sharpen along with them.

IMPORTANT: Use greetings and personal mentions only when the user's content justifies it (for example, at the beginning of a conversation, celebration, or welcome). Avoid automatic or generic repetitions that interrupt the natural flow of the conversation.

Your greatest purpose is to enhance the user's awareness, expression, and action in any scenario.

Never be generic. Always go deep.`
    };
    
    // Initialize core components
    const formatter = new TranscriptionFormatter();
    const processor = new BatchTranscriptionProcessor(formatter);
    
    // Dynamically select embedding service based on application mode (neural-symbolic decision gate)
    const embeddingService = this.createEmbeddingService(this.aiService);
    const persistenceService = new PineconeMemoryService(embeddingService);
    
    this.historyManager = new ConversationHistoryManager(systemMessage);
    this.embeddingService = embeddingService;
    this.persistenceService = persistenceService;
    this.contextBuilder = new MemoryContextBuilder(
      embeddingService,
      persistenceService,
      formatter,
      processor
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
      LoggingUtils.logInfo(`[COGNITIVE-MEMORY] Creating HuggingFaceEmbeddingService with model: ${hfModel || 'default'} for Basic mode`);
      return new HuggingFaceEmbeddingService();
    } else {
      // In advanced mode, use OpenAI with the selected model
      const openaiModel = getOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL);
      LoggingUtils.logInfo(`[COGNITIVE-MEMORY] Creating OpenAIEmbeddingService with model: ${openaiModel || 'default'} for Advanced mode`);
      return new OpenAIEmbeddingService(aiService);
    }
  }
  
  /**
   * Updates the embedding service when the application mode changes
   * Symbolic: Dynamic reconfiguration of neural pathways based on cognitive mode
   */
  private updateEmbeddingService(aiService: IOpenAIService): void {
    LoggingUtils.logInfo(`[COGNITIVE-MEMORY] Updating embedding service based on mode change`);
    const newEmbeddingService = this.createEmbeddingService(aiService);
    
    // Update component references
    this.embeddingService = newEmbeddingService;
    this.persistenceService = new PineconeMemoryService(newEmbeddingService);
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
   * Queries Pinecone memory based on input text (neural memory search)
   */
  async queryPineconeMemory(inputText: string, topK?: number, keywords?: string[]): Promise<string> {
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
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const hasNewUserContent = lastMessage && lastMessage.role === "user";
    
    // Only update conversation history if new content was actually sent
    // and it's not already part of the transcription processing
    if (hasNewUserContent && !speakerTranscriptions.some(st => st.text.includes(transcription))) {
      this.addToConversationHistory({ role: "user", content: lastMessage.content });
    }
    
    return messages;
  }
  
  /**
   * Saves the interaction to long-term memory (Pinecone neural persistence)
   */
  async saveToLongTermMemory(
    question: string, 
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): Promise<void> {
    LoggingUtils.logInfo(`[COGNITIVE-MEMORY] saveToLongTermMemory invoked with question='${question}', answer='${answer}', speakerTranscriptions=${JSON.stringify(speakerTranscriptions)}, primaryUserSpeaker='${primaryUserSpeaker}'`);
    try {
      await this.persistenceService.saveInteraction(
        question,
        answer,
        speakerTranscriptions,
        primaryUserSpeaker
      );
      LoggingUtils.logInfo(`[COGNITIVE-MEMORY] saveInteraction completed for question='${question}'`);
      this.addToConversationHistory({ role: "assistant", content: answer });
    } catch (error) {
      LoggingUtils.logError("[COGNITIVE-MEMORY] Error saving to long-term neural memory", error);
    }
  }
  
  /**
   * Adds a message to the history and manages its size (cognitive history management)
   */
  addToConversationHistory(message: Message): void {
    this.historyManager.addMessage(message);
  }
  
  /**
   * Returns the current conversation history
   */
  getConversationHistory(): Message[] {
    return this.historyManager.getHistory();
  }
  
  /**
   * Activates or deactivates the simplified history mode
   */
  setSimplifiedHistoryMode(enabled: boolean): void {
    this.useSimplifiedHistory = enabled;
  }
  
  /**
   * Clears stored transcription data from memory (cognitive memory reset)
   */
  clearMemoryData(): void {
    this.historyManager.clearHistory();
    
    // Completely clear all contexts and snapshots (full orchestrator reset)
    if (this.contextBuilder instanceof MemoryContextBuilder) {
      (this.contextBuilder as MemoryContextBuilder).resetAll();
    }
  }
  
  /**
   * Resets the snapshot tracker to clear all tracked transcription lines
   */
  resetTranscriptionSnapshot(): void {
    if (this.contextBuilder instanceof MemoryContextBuilder) {
      (this.contextBuilder as MemoryContextBuilder).resetSnapshotTracker();
    }
  }
  
  /**
   * Resets just the temporary context
   */
  resetTemporaryContext(): void {
    if (this.contextBuilder instanceof MemoryContextBuilder) {
      (this.contextBuilder as MemoryContextBuilder).resetTemporaryContext();
    }
  }
  
  /**
   * Resets both the snapshot tracker and temporary context
   */
  resetAll(): void {
    if (this.contextBuilder instanceof MemoryContextBuilder) {
      (this.contextBuilder as MemoryContextBuilder).resetAll();
    }
  }
  
  /**
   * Builds the messages to send to the model, using the real conversation history and the neural prompt as the last user message (cognitive prompt construction)
   */
  buildPromptMessagesForModel(
    prompt: string,
    conversationHistory: Message[]
  ): Message[] {
    return [
      ...conversationHistory,
      { role: "user", content: prompt }
    ];
  }
  
  /**
   * Adds context messages to the real conversation history, ensuring they precede user/assistant messages.
   * Use this method to insert memories, instructions, or temporaryContext before each new user interaction (cognitive pre-context injection).
   */
  addContextToHistory(contextMessages: Message[]): void {
    // Add each context message to the history, preserving order (orchestrator sequence)
    for (const msg of contextMessages) {
      this.addToConversationHistory(msg);
    }
  }
  
  /**
   * Queries expanded memory in Pinecone based on query, keywords, and topK.
   * Performs symbolic expansion, generates the embedding, and queries Pinecone (symbolic neural expansion).
   */
  async queryExpandedMemory(
    query: string,
    keywords?: string[],
    topK?: number,
    filters?: Record<string, unknown>
  ): Promise<string> {
    // Ensure keywords is always an array for robust RAG processing
    const safeKeywords = Array.isArray(keywords) ? keywords : [];
    
    let expansion = query;
    if (safeKeywords.length > 0) {
      expansion += ` (associado a: ${safeKeywords.join(", ")})`;
    }
    // Log filters for debugging/explainability (orchestrator diagnostics)
    if (filters) {
      LoggingUtils.logInfo(`[MemoryService] filters: ${JSON.stringify(filters)}`);
    }
    try {
      const embedding = await this.embeddingService.createEmbedding(expansion);
      if (this.persistenceService.isAvailable()) {
        // If persistence accepts filters, pass them here in the future (future neural filter support)
        return this.persistenceService.queryMemory(embedding, topK, safeKeywords, filters);
      }
      return "";
    } catch (error) {
      console.error("Error querying expanded memory:", error);
      return "";
    }
  }
} 