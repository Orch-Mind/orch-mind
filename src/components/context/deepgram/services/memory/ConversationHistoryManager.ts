// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ConversationHistoryManager.ts
// Implementation of IConversationHistoryManager (cognitive history orchestrator)

import { IConversationHistoryManager } from "../../interfaces/memory/IConversationHistoryManager";
import { Message } from "../../interfaces/transcription/TranscriptionTypes";
import { LoggingUtils } from "../../utils/LoggingUtils";

export class ConversationHistoryManager implements IConversationHistoryManager {
  private conversationHistory: Message[] = [];
  private maxInteractions: number = 10;

  constructor() {
    // No longer initializes with a system message.
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
   * Clears the conversation history (orchestrator memory reset)
   */
  clearHistory(): void {
    this.conversationHistory = [];
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
    if (this.conversationHistory.length > this.maxInteractions * 2) {
      this.conversationHistory = this.conversationHistory.slice(
        -(this.maxInteractions * 2)
      );
      LoggingUtils.logInfo(
        `[COGNITIVE-HISTORY] History pruned to ${this.conversationHistory.length} messages (cognitive pruning)`
      );
    }
  }
}
