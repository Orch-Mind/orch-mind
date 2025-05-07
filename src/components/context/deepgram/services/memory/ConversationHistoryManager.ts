// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ConversationHistoryManager.ts
// Implementation of IConversationHistoryManager (cognitive history orchestrator)

import { IConversationHistoryManager } from "../../interfaces/memory/IConversationHistoryManager";
import { Message } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";

export class ConversationHistoryManager implements IConversationHistoryManager {
  private conversationHistory: Message[];
  private maxInteractions: number = 10;
  
  constructor(systemMessage: Message) {
    this.conversationHistory = [systemMessage];
  }
  
  /**
   * Adds a message to the conversation history and prunes if necessary (cognitive history management)
   */
  addMessage(message: Message): void {
    this.conversationHistory.push(message);
    this.pruneHistory();
  }
  
  /**
   * Gets the current conversation history (cognitive memory trace)
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }
  
  /**
   * Clears the conversation history but keeps the system message (orchestrator memory reset, preserve identity)
   */
  clearHistory(): void {
    const systemMessage = this.conversationHistory[0];
    this.conversationHistory = [systemMessage];
  }
  
  /**
   * Sets the maximum number of interactions to keep (cognitive memory span)
   */
  setMaxInteractions(max: number): void {
    this.maxInteractions = max;
  }
  
  /**
   * Prunes conversation history to maintain the maximum allowed interactions (cognitive pruning)
   */
  private pruneHistory(): void {
    const systemMessage = this.conversationHistory[0];
    
    if (this.conversationHistory.length > (this.maxInteractions * 2) + 1) {
      this.conversationHistory = [
        systemMessage,
        ...this.conversationHistory.slice(-(this.maxInteractions * 2))
      ];
      LoggingUtils.logInfo(`[COGNITIVE-HISTORY] History pruned to ${this.conversationHistory.length} messages (cognitive pruning)`);
    }
  }
} 