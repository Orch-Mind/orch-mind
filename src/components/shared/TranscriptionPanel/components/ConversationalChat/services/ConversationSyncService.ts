// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * ConversationSyncService
 *
 * Manages synchronization between persisted chat history and the TranscriptionPromptProcessor.
 * Ensures conversations (including summaries) are properly loaded and maintained across sessions.
 *
 * Based on best practices from Vercel AI SDK and avoids LangChain's BufferMemory issues.
 */

import { LoggingUtils } from "../../../../../context/deepgram/utils/LoggingUtils";
import { ChatConversation } from "../types/ChatHistoryTypes";
import { ChatMessage } from "../types/ChatTypes";

export interface ConversationState {
  conversationId: string;
  messages: ChatMessage[];
  lastSyncTime: Date;
  hasUnsyncedChanges: boolean;
}

export interface SyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
  onSyncComplete?: (state: ConversationState) => void;
  onSyncError?: (error: Error) => void;
}

export class ConversationSyncService {
  private currentState: ConversationState | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncOptions: Required<SyncOptions> = {
    autoSync: true,
    syncInterval: 5000, // 5 seconds
    onSyncComplete: () => {},
    onSyncError: () => {},
  };

  constructor(options?: SyncOptions) {
    if (options) {
      this.syncOptions = { ...this.syncOptions, ...options };
    }
  }

  /**
   * Initialize sync service with a conversation
   */
  async initialize(conversation: ChatConversation): Promise<ConversationState> {
    LoggingUtils.logInfo(
      `[ConversationSync] Initializing with conversation ${conversation.id}`
    );

    // Convert ChatConversation messages to ChatMessage format
    const messages = this.convertMessages(conversation.messages);

    this.currentState = {
      conversationId: conversation.id,
      messages,
      lastSyncTime: new Date(),
      hasUnsyncedChanges: false,
    };

    // Start auto-sync if enabled
    if (this.syncOptions.autoSync) {
      this.startAutoSync();
    }

    // Log summary information if present
    const summaries = messages.filter((m) => (m as any).isSummary);
    if (summaries.length > 0) {
      LoggingUtils.logInfo(
        `[ConversationSync] Loaded conversation with ${summaries.length} summaries`
      );
    }

    return this.currentState;
  }

  /**
   * Convert between message formats
   */
  private convertMessages(messages: any[]): ChatMessage[] {
    return messages.map((msg) => ({
      id: msg.id,
      type: msg.type as "user" | "system" | "error",
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      hasContext: msg.hasContext,
      contextContent: msg.contextContent,
      // For compatibility with ResponseGenerator, also include role
      role: msg.type as "user" | "system",
      // Preserve summary metadata if present
      ...(msg.isSummary && {
        isSummary: msg.isSummary,
        originalMessageCount: msg.originalMessageCount,
        originalTimeRange: msg.originalTimeRange,
        tokenCount: msg.tokenCount,
      }),
    }));
  }

  /**
   * Get current conversation messages for TranscriptionPromptProcessor
   */
  getMessagesForProcessor(): ChatMessage[] {
    if (!this.currentState) {
      LoggingUtils.logWarning(
        "[ConversationSync] No conversation loaded, returning empty array"
      );
      return [];
    }

    // Return a copy to prevent external modifications
    return [...this.currentState.messages];
  }

  /**
   * Update messages from external source (e.g., after summarization)
   */
  updateMessages(messages: ChatMessage[]): void {
    if (!this.currentState) {
      LoggingUtils.logWarning(
        "[ConversationSync] Cannot update messages without initialized conversation - ignoring update"
      );
      return;
    }

    // Validate messages array
    if (!Array.isArray(messages)) {
      LoggingUtils.logError(
        "[ConversationSync] Invalid messages array provided to updateMessages"
      );
      return;
    }

    const previousCount = this.currentState.messages.length;
    const newCount = messages.length;

    // Check if summarization occurred
    const hasSummary = messages.some((m) => (m as any).isSummary);
    if (hasSummary && newCount < previousCount) {
      LoggingUtils.logInfo(
        `[ConversationSync] Detected summarization: ${previousCount} → ${newCount} messages`
      );
    }

    this.currentState.messages = messages;
    this.currentState.hasUnsyncedChanges = true;
  }

  /**
   * Add a single message
   */
  addMessage(message: ChatMessage): void {
    if (!this.currentState) {
      LoggingUtils.logError(
        "[ConversationSync] Cannot add message without initialized conversation"
      );
      return;
    }

    this.currentState.messages.push(message);
    this.currentState.hasUnsyncedChanges = true;
  }

  /**
   * Perform manual sync
   */
  async sync(): Promise<void> {
    if (!this.currentState || !this.currentState.hasUnsyncedChanges) {
      return;
    }

    try {
      LoggingUtils.logInfo(
        `[ConversationSync] Syncing ${this.currentState.messages.length} messages`
      );

      // Here you would typically sync with your backend
      // For now, we'll just update the sync time
      this.currentState.lastSyncTime = new Date();
      this.currentState.hasUnsyncedChanges = false;

      this.syncOptions.onSyncComplete(this.currentState);
    } catch (error) {
      LoggingUtils.logError("[ConversationSync] Sync failed", error);
      this.syncOptions.onSyncError(error as Error);
    }
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(): void {
    this.stopAutoSync(); // Clear any existing timer

    this.syncTimer = setInterval(() => {
      if (this.currentState?.hasUnsyncedChanges) {
        this.sync();
      }
    }, this.syncOptions.syncInterval);

    LoggingUtils.logInfo(
      `[ConversationSync] Auto-sync started (interval: ${this.syncOptions.syncInterval}ms)`
    );
  }

  /**
   * Stop automatic synchronization
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      LoggingUtils.logInfo("[ConversationSync] Auto-sync stopped");
    }
  }

  /**
   * Get conversation state for persistence
   */
  getStateForPersistence(): any {
    if (!this.currentState) {
      return null;
    }

    return {
      conversationId: this.currentState.conversationId,
      messages: this.currentState.messages,
      lastSyncTime: this.currentState.lastSyncTime,
    };
  }

  /**
   * Load conversation from persisted state
   */
  static fromPersistedState(state: any): ConversationSyncService {
    const service = new ConversationSyncService();

    if (state) {
      service.currentState = {
        conversationId: state.conversationId,
        messages: state.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        lastSyncTime: new Date(state.lastSyncTime),
        hasUnsyncedChanges: false,
      };
    }

    return service;
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(): {
    totalMessages: number;
    summaryCount: number;
    hasActiveSummary: boolean;
    originalMessagesCompressed: number;
  } {
    if (!this.currentState) {
      return {
        totalMessages: 0,
        summaryCount: 0,
        hasActiveSummary: false,
        originalMessagesCompressed: 0,
      };
    }

    const messages = this.currentState.messages;
    const summaries = messages.filter((m) => (m as any).isSummary);
    const originalMessagesCompressed = summaries.reduce(
      (total, summary) => total + ((summary as any).originalMessageCount || 0),
      0
    );

    return {
      totalMessages: messages.length,
      summaryCount: summaries.length,
      hasActiveSummary: summaries.length > 0,
      originalMessagesCompressed,
    };
  }

  /**
   * Cleanup and stop all timers
   */
  dispose(): void {
    this.stopAutoSync();
    this.currentState = null;
    LoggingUtils.logInfo("[ConversationSync] Service disposed");
  }
}
