// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { OllamaClientService } from "../../../../../context/deepgram/services/ollama/neural/OllamaClientService";
import { OllamaCompletionService } from "../../../../../context/deepgram/services/ollama/neural/OllamaCompletionService";
import { LoggingUtils } from "../../../../../context/deepgram/utils/LoggingUtils";
import { ChatMessage } from "../hooks/usePersistentMessages";

export interface ChatSummary {
  id: string;
  type: "system";
  content: string;
  timestamp: Date;
  isSummary: true;
  originalMessageCount: number;
  originalTimeRange: {
    start: Date;
    end: Date;
  };
  tokenCount?: number;
}

export class ChatSummarizationService {
  private ollamaClient: OllamaClientService;
  private ollamaCompletion: OllamaCompletionService;

  // Token-based thresholds (for 32k model)
  private readonly MAX_CONTEXT_TOKENS = 32000;
  private readonly SUMMARIZATION_THRESHOLD = 30000; // Summarize at 30k tokens
  private readonly TARGET_SUMMARY_TOKENS = 2000; // Target size for summaries
  private readonly BUFFER_TOKENS = 2000; // Buffer for model response
  private readonly MIN_MESSAGES_TO_SUMMARIZE = 5; // Minimum messages to summarize

  constructor() {
    this.ollamaClient = new OllamaClientService();
    this.ollamaCompletion = new OllamaCompletionService(this.ollamaClient);
    this.ollamaClient.initializeClient();
  }

  /**
   * Estimate token count for a message
   * Using rough estimate: 1 token ≈ 4 characters (OpenAI standard)
   */
  private estimateTokens(text: string): number {
    // More accurate estimation based on common patterns
    // Average English word is ~4.7 characters + space = ~5.7 characters
    // Average token represents ~0.75 words
    // So roughly 1 token per 4 characters is a good estimate
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate total token count for messages
   */
  private calculateTotalTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      let messageTokens = this.estimateTokens(msg.content);
      if (msg.hasContext && msg.contextContent) {
        messageTokens += this.estimateTokens(msg.contextContent);
      }
      return total + messageTokens;
    }, 0);
  }

  /**
   * Check if the conversation needs summarization based on token count
   */
  needsSummarization(messages: ChatMessage[]): boolean {
    const totalTokens = this.calculateTotalTokens(messages);

    LoggingUtils.logInfo(
      `[ChatSummarization] Token count: ${totalTokens}/${this.SUMMARIZATION_THRESHOLD}`
    );

    return totalTokens >= this.SUMMARIZATION_THRESHOLD;
  }

  /**
   * Find the optimal split point for summarization
   * Returns the index where we should split messages for summarization
   */
  private findSummarizationSplitPoint(messages: ChatMessage[]): number {
    let tokenCount = 0;
    let splitIndex = 0;

    const totalTokens = this.calculateTotalTokens(messages);

    // Start from the beginning and accumulate tokens until we reach
    // a good amount to summarize (leaving recent messages intact)
    for (let i = 0; i < messages.length; i++) {
      const messageTokens =
        this.estimateTokens(messages[i].content) +
        (messages[i].hasContext && messages[i].contextContent
          ? this.estimateTokens(messages[i].contextContent!)
          : 0);

      tokenCount += messageTokens;

      // We want to summarize enough to bring us well below the threshold
      // For testing purposes, if total tokens is less than threshold,
      // split at 70% of messages
      if (totalTokens < this.SUMMARIZATION_THRESHOLD) {
        // For smaller conversations, summarize most but leave some recent
        if (i >= Math.floor(messages.length * 0.7)) {
          splitIndex = i;
          break;
        }
      } else {
        // For larger conversations, use token-based split
        if (tokenCount >= this.SUMMARIZATION_THRESHOLD * 0.7) {
          splitIndex = i + 1;
          break;
        }
      }
    }

    // Ensure we leave some recent messages (at least 5 or 20% of messages, whichever is smaller)
    const minRecentMessages = Math.min(5, Math.ceil(messages.length * 0.2));
    return Math.min(splitIndex, messages.length - minRecentMessages);
  }

  /**
   * Summarize the conversation messages based on token count
   */
  async summarizeConversation(
    messages: ChatMessage[]
  ): Promise<ChatMessage | null> {
    // Don't summarize if too few messages
    if (messages.length < this.MIN_MESSAGES_TO_SUMMARIZE) {
      LoggingUtils.logInfo(
        `[ChatSummarization] Not enough messages to summarize (${messages.length} < ${this.MIN_MESSAGES_TO_SUMMARIZE})`
      );
      return null;
    }

    try {
      const totalTokens = this.calculateTotalTokens(messages);

      LoggingUtils.logInfo(
        `[ChatSummarization] Starting summarization of ${messages.length} messages (${totalTokens} tokens)`
      );

      // Find the split point
      const splitIndex = this.findSummarizationSplitPoint(messages);

      if (splitIndex < 3) {
        LoggingUtils.logWarning(
          `[ChatSummarization] Not enough messages to summarize meaningfully`
        );
        return null;
      }

      // Messages to summarize
      const messagesToSummarize = messages.slice(0, splitIndex);
      const tokensToSummarize = this.calculateTotalTokens(messagesToSummarize);

      // Get time range
      const timeRange = {
        start: messagesToSummarize[0].timestamp,
        end: messagesToSummarize[messagesToSummarize.length - 1].timestamp,
      };

      // Calculate compression ratio first
      const compressionRatio = this.TARGET_SUMMARY_TOKENS / tokensToSummarize;

      // Build context for summarization
      const conversationText = messagesToSummarize
        .map((msg) => {
          const role = msg.type === "user" ? "User" : "Assistant";
          const contextInfo = msg.hasContext
            ? `\nContext: ${msg.contextContent}`
            : "";
          return `${role}: ${msg.content}${contextInfo}`;
        })
        .join("\n\n");

      // Create summarization prompt
      const systemPrompt = `You are the Memory Consolidation System of the Orch-OS architecture.

THEORETICAL FOUNDATION:
- Inspired by hippocampal memory consolidation during sleep
- Transforms episodic memories into semantic knowledge
- Preserves emotional valence and symbolic significance

YOUR MISSION: Consolidate this conversation into semantic memory while preserving critical episodic details.

CONSOLIDATION PRINCIPLES:
1. SEMANTIC EXTRACTION: Identify core concepts and relationships
2. EPISODIC PRESERVATION: Maintain key temporal sequences and specific decisions
3. EMOTIONAL TAGGING: Preserve the affective tone of important moments
4. SYMBOLIC COMPRESSION: Use archetypal patterns to compress meaning
5. FUTURE ACTIVATION: Structure the summary to facilitate future recall

COMPRESSION TARGET: Original ~${tokensToSummarize} tokens → ~${
        this.TARGET_SUMMARY_TOKENS
      } tokens (${(compressionRatio * 100).toFixed(1)}% ratio)

REMEMBER: This is not mere summarization—it's memory consolidation that transforms experience into knowledge while preserving the capacity for full recall when needed.`;

      const userPrompt = `Please summarize the following conversation. The original conversation is approximately ${tokensToSummarize} tokens, and your summary should be around ${
        this.TARGET_SUMMARY_TOKENS
      } tokens (compression ratio: ${(compressionRatio * 100).toFixed(1)}%).

Focus on:
1. The main topics discussed and key decisions made
2. Important context, facts, or data shared
3. Any unresolved questions or action items
4. The overall narrative arc of the conversation

Maintain chronological flow and preserve critical details that might be referenced later.

Conversation:
${conversationText}`;

      // Call Ollama to generate summary
      const response = await this.ollamaCompletion.callModelWithFunctions({
        model: getOption(STORAGE_KEYS.OLLAMA_MODEL) || "gemma3:latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: this.TARGET_SUMMARY_TOKENS + 500, // Allow some flexibility
      });

      const summaryContent =
        response.choices[0]?.message?.content?.trim() || "";

      if (!summaryContent) {
        LoggingUtils.logError(
          "[ChatSummarization] No summary content generated"
        );
        return null;
      }

      const summaryTokens = this.estimateTokens(summaryContent);

      // Create summary message
      const summary: ChatSummary = {
        id: `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "system",
        content: `📋 **Conversation Summary** (${messagesToSummarize.length} messages, ~${tokensToSummarize} tokens → ~${summaryTokens} tokens)\n\n${summaryContent}`,
        timestamp: new Date(),
        isSummary: true,
        originalMessageCount: messagesToSummarize.length,
        originalTimeRange: timeRange,
        tokenCount: summaryTokens,
      };

      LoggingUtils.logInfo(
        `[ChatSummarization] Successfully created summary: ${tokensToSummarize} tokens → ${summaryTokens} tokens (${(
          (summaryTokens / tokensToSummarize) *
          100
        ).toFixed(1)}% of original)`
      );

      return summary as any;
    } catch (error) {
      LoggingUtils.logError(
        `[ChatSummarization] Error during summarization: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Apply summarization to a conversation
   * Returns the new message array with summary replacing the summarized messages
   */
  async applySummarization(messages: ChatMessage[]): Promise<ChatMessage[]> {
    if (!this.needsSummarization(messages)) {
      return messages;
    }

    const summary = await this.summarizeConversation(messages);
    if (!summary) {
      return messages;
    }

    // Find split point again to ensure consistency
    const splitIndex = this.findSummarizationSplitPoint(messages);

    // Keep recent messages
    const remainingMessages = messages.slice(splitIndex);

    // Combine summary with remaining messages
    return [summary as any, ...remainingMessages];
  }

  /**
   * Get current token usage statistics
   */
  getTokenStats(messages: ChatMessage[]): {
    currentTokens: number;
    maxTokens: number;
    percentageUsed: number;
    tokensUntilSummarization: number;
  } {
    const currentTokens = this.calculateTotalTokens(messages);
    const percentageUsed = (currentTokens / this.MAX_CONTEXT_TOKENS) * 100;
    const tokensUntilSummarization = Math.max(
      0,
      this.SUMMARIZATION_THRESHOLD - currentTokens
    );

    return {
      currentTokens,
      maxTokens: this.MAX_CONTEXT_TOKENS,
      percentageUsed,
      tokensUntilSummarization,
    };
  }
}
