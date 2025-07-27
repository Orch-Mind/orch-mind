// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { LoggingUtils } from "../../../../utils/LoggingUtils";
import { IMemoryService } from "../../../../interfaces/memory/IMemoryService";
import { AgentAction } from "../types/AgentTypes";

/**
 * Agent Memory Manager - SRP: Handles agent memory and conversation history
 * 
 * Responsibilities:
 * - Manage conversation history
 * - Store and retrieve relevant memories
 * - Save agent interactions
 * - Handle action memories
 */
export class AgentMemoryManager {
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private readonly maxHistorySize = 50;

  constructor(private memoryService: IMemoryService) {}

  /**
   * Add message to conversation history
   * Based on SimplePromptProcessor pattern
   */
  addToHistory(role: string, content: string): void {
    // Use same pattern as SimplePromptProcessor
    this.memoryService.addToConversationHistory({ role: role as any, content });
    
    // Also keep local cache for compatibility
    this.conversationHistory.push({ role, content });
    
    // YAGNI: Simple history size management
    if (this.conversationHistory.length > this.maxHistorySize) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get relevant memories for a message
   * Based on SimplePromptProcessor pattern
   */
  async getRelevantMemories(message: string): Promise<string> {
    try {
      // Use same pattern as SimplePromptProcessor
      const contextResults = await this.memoryService.queryExpandedMemory(message, [], 5);
      if (contextResults?.trim()) {
        return contextResults;
      }
      return "";
    } catch (error) {
      LoggingUtils.logWarning("⚠️ Memory context unavailable");
      return "";
    }
  }

  /**
   * Save agent interaction to memory service
   * Based on SimplePromptProcessor pattern
   */
  async saveInteraction(
    prompt: string,
    response: string,
    speakerId?: string
  ): Promise<void> {
    try {
      // Use same pattern as SimplePromptProcessor
      await this.memoryService.saveDirectInteraction(
        prompt,
        response,
        speakerId || "user",
        true
      );
      
      LoggingUtils.logInfo("💾 Agent interaction saved to memory");
      
    } catch (error) {
      LoggingUtils.logWarning("⚠️ Could not save agent interaction");
    }
  }

  /**
   * Save action memory for executed actions
   * Based on SimplePromptProcessor pattern - using available IMemoryService methods
   */
  async saveActionMemory(
    prompt: string,
    actions: AgentAction[]
  ): Promise<void> {
    try {
      const actionSummary = actions
        .map(action => {
          // AgentAction only has: type, target, content, workingDir
          const actionInfo = action.target || action.content || 'unknown';
          return `${action.type}: ${actionInfo}`;
        })
        .join(", ");

      // Use saveDirectInteraction like SimplePromptProcessor since saveMemory doesn't exist in IMemoryService
      const actionMemoryContent = `Agent Actions Executed: ${actionSummary}\nUser Request: "${prompt}"`;
      
      await this.memoryService.saveDirectInteraction(
        `Agent executed: ${actionSummary}`,
        actionMemoryContent,
        "agent_system",
        true
      );
      
      LoggingUtils.logInfo(`💾 Action memory saved: ${actionSummary}`);
      
    } catch (error) {
      LoggingUtils.logWarning("⚠️ Could not save action memory");
    }
  }

  /**
   * Get conversation history
   * Based on SimplePromptProcessor pattern
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    // Use same pattern as SimplePromptProcessor
    return this.memoryService.getConversationHistory();
  }

  /**
   * Clear conversation history
   * YAGNI: Simple reset when needed
   */
  clearHistory(): void {
    this.conversationHistory = [];
    LoggingUtils.logInfo("🧹 Conversation history cleared");
  }

  /**
   * Get recent messages for context
   * DRY: Reusable recent message logic
   */
  getRecentMessages(count: number = 10): Array<{ role: string; content: string }> {
    return this.conversationHistory.slice(-count);
  }
}
