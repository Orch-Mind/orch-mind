// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Integration test for Conversation Sync Service
 * Tests the complete flow of loading, syncing, and summarizing conversations
 */

import { ChatSummarizationService } from "../services/ChatSummarizationService";
import { ConversationSyncService } from "../services/ConversationSyncService";
import { ChatConversation } from "../types/ChatHistoryTypes";
import { ChatMessage } from "../types/ChatTypes";

// Mock the services
jest.mock(
  "../../../../../context/deepgram/services/ollama/neural/OllamaCompletionService"
);
jest.mock(
  "../../../../../context/deepgram/services/ollama/neural/OllamaClientService"
);
jest.mock("../../../../../../services/StorageService");
jest.mock("../../../../../context/deepgram/utils/LoggingUtils");

describe("Conversation Sync Integration", () => {
  const createTestMessage = (
    id: string,
    type: "user" | "system",
    content: string,
    extras?: any
  ): ChatMessage => ({
    id,
    type,
    content,
    timestamp: new Date(),
    ...extras,
  });

  const createTestConversation = (
    id: string,
    messages: ChatMessage[]
  ): ChatConversation => ({
    id,
    title: "Test Conversation",
    lastMessage: messages[messages.length - 1]?.content || "",
    lastMessageTime: new Date(),
    createdAt: new Date(),
    messages,
    isActive: true,
  });

  describe("Full Flow: Load → Sync → Summarize → Persist", () => {
    it("should handle the complete conversation lifecycle", async () => {
      // Step 1: Create a conversation with a summary from previous session
      const existingMessages: ChatMessage[] = [
        createTestMessage(
          "summary-1",
          "system",
          "📋 **Conversation Summary**\n\nPrevious discussion covered React authentication, state management, and performance optimization.",
          {
            isSummary: true,
            originalMessageCount: 50,
            originalTimeRange: {
              start: new Date("2024-01-01"),
              end: new Date("2024-01-02"),
            },
            tokenCount: 500,
          }
        ),
        createTestMessage(
          "msg-51",
          "user",
          "What about React Server Components?"
        ),
        createTestMessage(
          "msg-52",
          "system",
          "React Server Components allow you to render components on the server..."
        ),
      ];

      const conversation = createTestConversation("conv-1", existingMessages);

      // Step 2: Initialize sync service
      const syncService = new ConversationSyncService({
        autoSync: true,
        syncInterval: 1000,
        onSyncComplete: jest.fn(),
      });

      const state = await syncService.initialize(conversation);

      // Verify summary was loaded correctly
      expect(state.messages.length).toBe(3);
      expect(state.messages[0].isSummary).toBe(true);
      expect(state.conversationId).toBe("conv-1");

      // Check summary stats
      const stats = syncService.getSummaryStats();
      expect(stats).toEqual({
        totalMessages: 3,
        summaryCount: 1,
        hasActiveSummary: true,
        originalMessagesCompressed: 50,
      });

      // Step 3: Get messages for processor (should include summary)
      const processorMessages = syncService.getMessagesForProcessor();
      expect(processorMessages.length).toBe(3);
      expect(processorMessages[0].content).toContain("Conversation Summary");

      // Step 4: Add new messages until we need summarization
      const summaryService = new ChatSummarizationService();

      // Add many messages to trigger summarization
      // Create larger messages to accumulate more tokens
      for (let i = 0; i < 200; i++) {
        const newMessage = createTestMessage(
          `new-${i}`,
          i % 2 === 0 ? "user" : "system",
          `Message ${i}: This is a much longer message to accumulate tokens faster. We're discussing various React patterns and best practices. 
          Let's talk about hooks, context, state management, performance optimization, server-side rendering, 
          static site generation, incremental static regeneration, and all the modern React features. 
          This message needs to be long enough to actually accumulate meaningful tokens so our summarization logic triggers properly.
          React has evolved significantly over the years, introducing new concepts and patterns that help developers 
          build more efficient and maintainable applications. From class components to functional components with hooks,
          the paradigm shift has been remarkable. Let's explore these concepts in detail.`
        );
        syncService.addMessage(newMessage);
      }

      // Check if summarization is needed
      const currentMessages = syncService.getMessagesForProcessor();
      const needsSummarization =
        summaryService.needsSummarization(currentMessages);

      expect(needsSummarization).toBe(true);
      expect(currentMessages.length).toBe(203); // 3 original + 200 new

      // Step 5: Apply summarization
      if (needsSummarization) {
        // Mock the summarization service
        jest.spyOn(summaryService, "applySummarization").mockResolvedValueOnce([
          createTestMessage(
            "summary-new",
            "system",
            "📋 **Conversation Summary**\n\nRecent discussion covered various React patterns.",
            {
              isSummary: true,
              originalMessageCount: 50,
              tokenCount: 400,
            }
          ),
          ...currentMessages.slice(-10), // Keep last 10 messages
        ]);

        const summarizedMessages = await summaryService.applySummarization(
          currentMessages
        );

        // Update sync service with summarized messages
        syncService.updateMessages(summarizedMessages);

        // Verify summarization worked
        const newStats = syncService.getSummaryStats();
        expect(newStats.summaryCount).toBeGreaterThanOrEqual(1);
        expect(newStats.totalMessages).toBeLessThan(203);
      }

      // Step 6: Test persistence
      const persistedState = syncService.getStateForPersistence();
      expect(persistedState).toHaveProperty("conversationId", "conv-1");
      expect(persistedState).toHaveProperty("messages");
      expect(persistedState).toHaveProperty("lastSyncTime");

      // Step 7: Restore from persisted state
      const restoredService =
        ConversationSyncService.fromPersistedState(persistedState);
      const restoredMessages = restoredService.getMessagesForProcessor();

      expect(restoredMessages.length).toBe(
        syncService.getMessagesForProcessor().length
      );
      expect(restoredMessages[0].isSummary).toBe(true);

      // Cleanup
      syncService.dispose();
    });

    it("should maintain sync between UI and processor", async () => {
      // Simulate real-time sync scenario
      const messages: ChatMessage[] = [];
      const conversation = createTestConversation("conv-2", messages);

      const syncService = new ConversationSyncService({
        autoSync: true,
        syncInterval: 100, // Fast sync for testing
        onSyncComplete: jest.fn(),
      });

      await syncService.initialize(conversation);

      // Simulate user sending messages
      syncService.addMessage(createTestMessage("1", "user", "Hello"));
      syncService.addMessage(createTestMessage("2", "system", "Hi there!"));

      // Verify messages are available immediately
      const processorMessages = syncService.getMessagesForProcessor();
      expect(processorMessages.length).toBe(2);

      // Wait for auto-sync
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(syncService.syncOptions.onSyncComplete).toHaveBeenCalled();

      syncService.dispose();
    });

    it("should handle conversation switching correctly", async () => {
      // First conversation
      const conv1 = createTestConversation("conv-1", [
        createTestMessage("1", "user", "Conv 1 message"),
      ]);

      const syncService = new ConversationSyncService();
      await syncService.initialize(conv1);

      expect(syncService.getMessagesForProcessor().length).toBe(1);

      // Switch to second conversation
      const conv2 = createTestConversation("conv-2", [
        createTestMessage("2", "user", "Conv 2 message 1"),
        createTestMessage("3", "system", "Conv 2 response 1"),
      ]);

      // Dispose and reinitialize for new conversation
      syncService.dispose();
      await syncService.initialize(conv2);

      const messages = syncService.getMessagesForProcessor();
      expect(messages.length).toBe(2);
      expect(messages[0].content).toContain("Conv 2");
    });

    it("should format messages correctly for ResponseGenerator", async () => {
      const messages: ChatMessage[] = [
        createTestMessage("1", "user", "What is React?"),
        createTestMessage("2", "system", "React is a JavaScript library..."),
        createTestMessage(
          "summary",
          "system",
          "📋 **Conversation Summary**\n\nDiscussed React basics.",
          {
            isSummary: true,
            originalMessageCount: 10,
          }
        ),
        createTestMessage("3", "user", "Tell me more about hooks"),
      ];

      const conversation = createTestConversation("conv-3", messages);
      const syncService = new ConversationSyncService();
      await syncService.initialize(conversation);

      const processorMessages = syncService.getMessagesForProcessor();

      // Verify format matches what ResponseGenerator expects
      expect(processorMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "What is React?" }),
          expect.objectContaining({
            content: "React is a JavaScript library...",
          }),
          expect.objectContaining({
            content: expect.stringContaining("Conversation Summary"),
            isSummary: true,
          }),
          expect.objectContaining({ content: "Tell me more about hooks" }),
        ])
      );

      syncService.dispose();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing conversation gracefully", () => {
      const syncService = new ConversationSyncService();

      // Should return empty array when not initialized
      expect(syncService.getMessagesForProcessor()).toEqual([]);

      // Should not throw when adding message without initialization
      expect(() => {
        syncService.addMessage(createTestMessage("1", "user", "Test"));
      }).not.toThrow();
    });
  });
});
