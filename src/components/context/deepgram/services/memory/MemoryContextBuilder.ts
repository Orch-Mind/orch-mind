// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// MemoryContextBuilder.ts
// Implementation of IMemoryContextBuilder

import { IMemoryContextBuilder } from "../../interfaces/memory/IMemoryContextBuilder";
import { IPersistenceService } from "../../interfaces/memory/IPersistenceService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IBatchTranscriptionProcessor } from "../../interfaces/transcription/IBatchTranscriptionProcessor";
import { ITranscriptionFormatter } from "../../interfaces/transcription/ITranscriptionFormatter";
import {
    EXTERNAL_HEADER,
    EXTERNAL_SPEAKER_LABEL,
    INSTRUCTIONS_HEADER,
    MEMORY_EXTERNAL_HEADER,
    MEMORY_INSTRUCTIONS_HEADER,
    MEMORY_USER_HEADER,
    Message,
    SpeakerMemoryResults,
    SpeakerTranscription,
    USER_HEADER
} from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";

import { TranscriptionContextManager } from "../transcription/TranscriptionContextManager";
import { TranscriptionSnapshotTracker } from "../transcription/TranscriptionSnapshotTracker";

export class MemoryContextBuilder implements IMemoryContextBuilder {
  private embeddingService: IEmbeddingService;
  private persistenceService: IPersistenceService;
  private formatter: ITranscriptionFormatter;
  private processor: IBatchTranscriptionProcessor;
  private snapshotTracker: TranscriptionSnapshotTracker;
  private contextManager: TranscriptionContextManager;
  
  constructor(
    embeddingService: IEmbeddingService,
    persistenceService: IPersistenceService,
    formatter: ITranscriptionFormatter,
    processor: IBatchTranscriptionProcessor
  ) {
    this.embeddingService = embeddingService;
    this.persistenceService = persistenceService;
    this.formatter = formatter;
    this.processor = processor;
    this.snapshotTracker = new TranscriptionSnapshotTracker();
    this.contextManager = TranscriptionContextManager.getInstance();
  }
  
  /**
   * Retrieves contextual memory based on speakers
   */
  async fetchContextualMemory(
    userTranscriptions: SpeakerTranscription[],
    externalTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    temporaryContext?: string,
    topK: number = 5,
    keywords: string[] = []
  ): Promise<SpeakerMemoryResults> {
    const result: SpeakerMemoryResults = {
      userContext: "",
      speakerContexts: new Map<string, string>(),
      temporaryContext: ""
    };
    
    if (!this.embeddingService.isInitialized()) {
      return result;
    }
    
    try {
      // 1. Fetch context based on temporary context (instructions)
      // If we have a temporary context provided or already stored in the contextManager (cognitive context override)
      const effectiveTemporaryContext = temporaryContext !== undefined ? 
        temporaryContext : this.contextManager.getTemporaryContext();
      
      // Check if we have a non-empty temporary context after normalization (context integrity check)
      if (effectiveTemporaryContext && effectiveTemporaryContext.trim().length > 0) {
        // Check if the context has changed since the last query (context drift detection)
        const contextChanged = this.contextManager.hasTemporaryContextChanged(effectiveTemporaryContext);
        
        if (contextChanged) {
          // Only query Pinecone if the context is different from the last queried (avoid redundant neural queries)
          LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] Querying Pinecone for new temporary context: ${effectiveTemporaryContext.substring(0, 30)}...`);
          result.temporaryContext = await this.queryExternalMemory(effectiveTemporaryContext, topK, keywords);
          
          // Update the last queried context (context state update)
          this.contextManager.updateLastQueriedTemporaryContext(effectiveTemporaryContext);
          
          // Store the retrieved context memory in the contextManager (neural memory cache)
          if (result.temporaryContext) {
            this.contextManager.setTemporaryContextMemory(result.temporaryContext);
            LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] Temporary context retrieved: ${(result.temporaryContext ?? '').substring(0, 50)}...`);
          }
        } else {
          // If the context has not changed, use the already stored memory (cache hit)
          result.temporaryContext = this.contextManager.getTemporaryContextMemory();
          if (!result.temporaryContext || result.temporaryContext.trim() === "") {
            LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] No temporary context found in cache for: ${(effectiveTemporaryContext ?? '').substring(0, 50)}...`);
          } else {
            LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] Using cached temporary context (no neural query)`);
          }
        }
      }
      
      // 2. Fetch context for user transcriptions
      if (userTranscriptions.length > 0) {
        const userTranscriptText = userTranscriptions
          .map(st => st.text)
          .join("\n");
        
        // Check if we have valid user text (user context integrity check)
        if (userTranscriptText.trim()) {
          const userContext = await this.queryExternalMemory(userTranscriptText, topK, keywords);
          if (!userContext || userContext.trim() === "") {
            LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] No context found for user input: ${(userTranscriptText ?? '').substring(0, 50)}...`);
          } else {
            LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] User context retrieved: ${(userTranscriptText ?? '').substring(0, 50)}...`);
          }
          result.userContext = userContext;
        }
      }
      
      // 3. Fetch context for external speakers only if they've been detected (external neural context)
      if (detectedSpeakers.has("external")) {
        if (externalTranscriptions.length > 0) {
          const externalText = externalTranscriptions
            .map(st => st.text)
            .join("\n");
          
          // Check if we have valid text from external speakers (external speaker context integrity check)
          if (externalText.trim()) {
            const externalContext = await this.queryExternalMemory(externalText, topK, keywords);
            result.speakerContexts.set("external", externalContext);
            if (!externalContext || externalContext.trim() === "") {
              LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] No context found for external speaker input: ${(externalText ?? '').substring(0, 50)}...`);
            } else {
              LoggingUtils.logInfo(`[COGNITIVE-CONTEXT] External context retrieved: ${(externalText ?? '').substring(0, 50)}...`);
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      LoggingUtils.logError("[COGNITIVE-CONTEXT] Error fetching speaker contexts", error);
      return result;
    }
  }
  
  /**
   * Queries external memory system for relevant context
   */
  async queryExternalMemory(inputText: string, topK: number = 5, keywords: string[] = []): Promise<string> {
    if (!inputText?.trim() || !this.embeddingService.isInitialized()) {
      return "";
    }
    try {
      // Generate embedding for the context (neural vectorization)
      const embedding = await this.embeddingService.createEmbedding(inputText.trim());
      // Query persistence service (Pinecone) (neural memory search)
      if (this.persistenceService.isAvailable()) {
        return this.persistenceService.queryMemory(
          embedding,
          topK ?? 5,
          keywords ?? []
        );
      }
      return "";
    } catch (error) {
      LoggingUtils.logError("[COGNITIVE-CONTEXT] Error querying external context memory", error);
      return "";
    }
  }
  
  /**
   * Builds conversation messages with appropriate memory contexts
   */
  buildMessagesWithContext(
    transcription: string,
    conversationHistory: Message[],
    useSimplifiedHistory: boolean,
    speakerTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    primaryUserSpeaker: string,
    temporaryContext?: string,
    memoryResults?: SpeakerMemoryResults
  ): Message[] {
    // Update the temporary context in the manager (ensures cognitive context persistence across invocations)
    if (temporaryContext !== undefined) {
      this.contextManager.setTemporaryContext(temporaryContext);
    }
    
    // Use the context stored in the manager (persistent cognitive context)
    const persistentTemporaryContext = this.contextManager.getTemporaryContext();
    
    // If we have memoryResults with temporary context, store it in the contextManager (neural cache update)
    if (memoryResults?.temporaryContext) {
      this.contextManager.setTemporaryContextMemory(memoryResults.temporaryContext);
    }
    
    // Start with the system message (first item in conversation history, orchestrator initialization)
    const systemMessage = conversationHistory.length > 0 ? [conversationHistory[0]] : [];
    const messages: Message[] = [...systemMessage];
    
    // Add instructions (temporary cognitive context)
    this.addInstructionsToMessages(messages, persistentTemporaryContext, memoryResults);
    
    // Add memory context (if available, neural context enrichment)
    this.addMemoryContextToMessages(messages, memoryResults);

    // Add the remaining conversation history (excluding the system message, maintaining continuity)
    if (conversationHistory.length > 1) {
      messages.push(...conversationHistory.slice(1));
    }
    
    // Add transcriptions (simplified or full form) with deduplication (cognitive input stream)
    const hasMemoryContext = this.hasMemoryContext(memoryResults);
    
    useSimplifiedHistory && hasMemoryContext 
      ? this.addSimplifiedTranscriptions(messages, speakerTranscriptions, primaryUserSpeaker)
      : this.addFullTranscriptionsWithDeduplication(messages, transcription, speakerTranscriptions, detectedSpeakers, primaryUserSpeaker);
    
    return messages;
  }
  
  /**
   * Checks if there's any memory context available
   */
  private hasMemoryContext(memoryResults?: SpeakerMemoryResults): boolean {
    if (!memoryResults) return false;
    
    return !!(
      memoryResults.userContext || 
      memoryResults.temporaryContext || 
      (memoryResults.speakerContexts && memoryResults.speakerContexts.size > 0)
    );
  }
  
  /**
   * Adds instructions to the conversation messages
   */
  private addInstructionsToMessages(
    messages: Message[],
    temporaryContext?: string,
    memoryResults?: SpeakerMemoryResults
  ): void {
    if (!temporaryContext?.trim()) return;
    
    // Add instructions
    const instructionsContext = [
      INSTRUCTIONS_HEADER + ":",
      temporaryContext
    ].join("\n");
    
    messages.push({
      role: "system",
      content: instructionsContext
    });
    
    // Add memory related to instructions (orchestrator memory linkage)
    // Check if we have memoryResults, otherwise use the contextManager (fallback to neural cache)
    const memoryTemporaryContext = memoryResults?.temporaryContext || this.contextManager.getTemporaryContextMemory();
    
    if (memoryTemporaryContext) {
      messages.push({
        role: "system",
        content: `${MEMORY_INSTRUCTIONS_HEADER}:\n${memoryTemporaryContext}`
      });
    }
  }
  
  /**
   * Adds memory context to the conversation messages
   */
  private addMemoryContextToMessages(
    messages: Message[],
    memoryResults?: SpeakerMemoryResults
  ): void {
    if (!memoryResults) return;
    
    // User's context
    const userContext = memoryResults.userContext || "";
    let externalContext = "";
    
    // Add external speaker contexts
    if (memoryResults.speakerContexts && memoryResults.speakerContexts.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [_, context] of memoryResults.speakerContexts.entries()) {
        if (context) {
          externalContext += (externalContext ? "\n\n" : "") + context;
        }
      }
    }
    
    // Add primary user context only if not empty
    if (userContext.trim()) {
      messages.push({
        role: "system",
        content: `${MEMORY_USER_HEADER}:\n${userContext}`
      });
    }
    
    // Add external context only if not empty
    if (externalContext.trim()) {
      // Format external content to ensure correct prefixes
      const formattedExternalContext = this.formatter.formatExternalSpeakerContent(externalContext);
      
      messages.push({
        role: "system",
        content: `${MEMORY_EXTERNAL_HEADER} ${EXTERNAL_SPEAKER_LABEL}:\n${formattedExternalContext}`
      });
    }
  }
  
  /**
   * Adds simplified transcriptions to the conversation messages
   */
  private addSimplifiedTranscriptions(
    messages: Message[],
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): void {
    const lastMessages = this.processor.extractLastMessageBySpeaker(
      speakerTranscriptions,
      [primaryUserSpeaker, "external"]
    );
    
    // Add primary user's last message with deduplication
    const lastUserMessage = lastMessages.get(primaryUserSpeaker);
    if (lastUserMessage) {
      const userContent = `${USER_HEADER} (última mensagem):\n${lastUserMessage.text}`;
      const filteredUserContent = this.snapshotTracker.filterTranscription(userContent);
      
      if (filteredUserContent.trim()) {
        const userMessage: Message = {
          role: "user",
          content: filteredUserContent
        };
        
        messages.push(userMessage);
        this.snapshotTracker.updateSnapshot(filteredUserContent);
      }
    }
    
    // Add external speaker's last message with deduplication
    const lastExternalMessage = lastMessages.get("external");
    if (lastExternalMessage) {
      // Extract original label if available
      const originalLabel = lastExternalMessage.text.includes('[') ?
        lastExternalMessage.text.match(/^\[([^\]]+)\]/)?.[1] : null;
        
      // Use original label when available and contains "Speaker"
      const speakerLabel = originalLabel?.includes("Speaker") ?
        originalLabel : EXTERNAL_SPEAKER_LABEL;
        
      // Clean any existing speaker prefix
      const cleanText = lastExternalMessage.text.replace(/^\[[^\]]+\]\s*/, '');
      
      const externalContent = `${EXTERNAL_HEADER} ${speakerLabel} (última mensagem):\n[${speakerLabel}] ${cleanText}`;
      const filteredExternalContent = this.snapshotTracker.filterTranscription(externalContent);
      
      if (filteredExternalContent.trim()) {
        const externalMessage: Message = {
          role: "user",
          content: filteredExternalContent
        };
        
        messages.push(externalMessage);
        this.snapshotTracker.updateSnapshot(filteredExternalContent);
      }
    }
  }
  
  /**
   * Adds full transcriptions to the conversation messages with deduplication
   */
  private addFullTranscriptionsWithDeduplication(
    messages: Message[],
    transcription: string,
    speakerTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    primaryUserSpeaker: string
  ): void {
    // Process all transcriptions in chronological order
    const segments = this.processor.processTranscriptions(
      speakerTranscriptions,
      primaryUserSpeaker
    );
    
    // Combine segments into a coherent conversation
    const combinedConversation = this.formatter.buildConversationFromSegments(segments, true);
    
    let finalContent = '';
    
    // Filter the combined conversation through the snapshot tracker to remove duplicates
    if (combinedConversation) {
      finalContent = this.snapshotTracker.filterTranscription(combinedConversation);
    } else if (transcription) {
      // Fallback to raw transcription if processing failed
      finalContent = this.snapshotTracker.filterTranscription(transcription);
    }
    
    // Only add the message if there's new content after deduplication
    if (finalContent.trim()) {
      const userMessage: Message = {
        role: "user",
        content: finalContent
      };
      
      messages.push(userMessage);
      
      // Update the snapshot with content that was actually sent
      this.snapshotTracker.updateSnapshot(finalContent);
    }
  }
  
  /**
   * Resets the snapshot tracker to clear all tracked transcription lines
   */
  public resetSnapshotTracker(): void {
    this.snapshotTracker.reset();
    // Does not clear the temporary context when resetting the snapshot tracker (cognitive context remains)
    // To clear the temporary context, use resetTemporaryContext() (explicit cognitive context reset)
  }
  
  /**
   * Resets just the temporary context
   */
  public resetTemporaryContext(): void {
    this.contextManager.clearTemporaryContext();
  }
  
  /**
   * Resets both the snapshot tracker and temporary context
   */
  public resetAll(): void {
    this.snapshotTracker.reset();
    this.contextManager.clearTemporaryContext();
  }
  
  /**
   * The original method is kept for backward compatibility,
   * but now redirects to the deduplicated version
   */
  private addFullTranscriptions(
    messages: Message[],
    transcription: string,
    speakerTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    primaryUserSpeaker: string
  ): void {
    this.addFullTranscriptionsWithDeduplication(
      messages,
      transcription,
      speakerTranscriptions,
      detectedSpeakers,
      primaryUserSpeaker
    );
  }
} 