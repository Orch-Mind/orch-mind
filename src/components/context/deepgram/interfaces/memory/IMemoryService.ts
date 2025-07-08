// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IMemoryService.ts
// Interface for the memory service

import {
  Message,
  SpeakerMemoryResults,
  SpeakerTranscription,
} from "../transcription/TranscriptionTypes";

export interface IMemoryService {
  /**
   * Retrieves contextual memory based on speakers
   */
  fetchContextualMemory(
    userTranscriptions: SpeakerTranscription[],
    externalTranscriptions: SpeakerTranscription[],
    detectedSpeakers: Set<string>,
    temporaryContext?: string
  ): Promise<SpeakerMemoryResults>;

  /**
   * Queries Pinecone memory based on input text
   */
  queryPineconeMemory(
    inputText: string,
    topK?: number,
    keywords?: string[]
  ): Promise<string>;

  /**
   * Saves interaction in long-term memory (Pinecone)
   */
  saveToLongTermMemory(
    question: string,
    answer: string,
    speakerTranscriptions: SpeakerTranscription[],
    primaryUserSpeaker: string
  ): Promise<void>;

  /**
   * Saves interaction directly to long-term memory bypassing buffer system
   * Ideal for SimplePromptProcessor and chat messages that need immediate persistence
   */
  saveDirectInteraction(
    question: string,
    answer: string,
    primaryUserSpeaker: string,
    forceSave?: boolean
  ): Promise<void>;

  /**
   * Builds messages for conversation with AI
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
  ): Message[];

  /**
   * Adds a message to the conversation history and manages its size
   */
  addToConversationHistory(message: Message): void;

  /**
   * Returns the current conversation history
   */
  getConversationHistory(): Message[];

  /**
   * Synchronizes conversation history with chat conversation messages
   * Used when switching between chat conversations to maintain consistency
   */
  syncConversationHistory(chatMessages: any[]): void;

  /**
   * Clears conversation history for new chat conversation
   * Used when creating a new conversation to start fresh
   */
  clearConversationHistory(): void;

  /**
   * Activates or deactivates the simplified history mode
   */
  setSimplifiedHistoryMode(enabled: boolean): void;

  /**
   * Clears the stored transcription data in memory
   */
  clearMemoryData(): void;

  /**
   * Resets the snapshot tracker to clear all tracked transcription lines
   */
  resetTranscriptionSnapshot(): void;

  /**
   * Resets just the temporary context
   */
  resetTemporaryContext(): void;

  /**
   * Resets both the snapshot tracker and temporary context
   */
  resetAll(): void;

  /**
   * Builds messages for sending to the model, using the real history and the neural prompt as the last user message
   */
  buildPromptMessagesForModel(
    prompt: string,
    conversationHistory: Message[]
  ): Message[];

  /**
   * Adds context messages to the real conversation history, ensuring they precede user/assistant messages.
   */
  addContextToHistory(contextMessages: Message[]): void;

  /**
   * Queries expanded memory in Pinecone based on query, keywords and topK.
   * Performs symbolic expansion, generates the embedding and queries Pinecone.
   */
  queryExpandedMemory(
    query: string,
    keywords?: string[],
    topK?: number,
    filters?: Record<string, unknown>
  ): Promise<string>;
}
