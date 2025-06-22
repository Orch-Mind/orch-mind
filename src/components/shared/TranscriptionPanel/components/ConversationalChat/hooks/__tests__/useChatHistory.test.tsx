// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { act, renderHook } from "@testing-library/react";
import { ChatSummarizationService } from "../../services/ChatSummarizationService";
import { useChatHistory } from "../useChatHistory";
import { ChatMessage } from "../usePersistentMessages";

// Mock nanoid
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => `test-id-${Date.now()}-${Math.random()}`),
}));

// Mock ChatSummarizationService
jest.mock("../../services/ChatSummarizationService");

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
} as Storage;

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("useChatHistory", () => {
  let mockSummarizationService: jest.Mocked<ChatSummarizationService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    (localStorageMock.getItem as jest.Mock).mockReturnValue(null);

    // Setup mock summarization service
    mockSummarizationService = {
      needsSummarization: jest.fn().mockReturnValue(false),
      applySummarization: jest.fn(),
      getTokenStats: jest.fn().mockReturnValue({
        currentTokens: 1000,
        maxTokens: 32000,
        percentageUsed: 3.125,
        tokensUntilSummarization: 29000,
      }),
    } as any;

    (ChatSummarizationService as jest.Mock).mockImplementation(
      () => mockSummarizationService
    );
  });

  describe("initialization", () => {
    it("should create initial conversation if none exist", () => {
      const { result } = renderHook(() => useChatHistory());

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0].title).toBe("New Chat");
      expect(result.current.currentConversationId).toBe(
        result.current.conversations[0].id
      );
    });

    it("should load conversations from localStorage", () => {
      const existingData = {
        conversations: [
          {
            id: "conv-1",
            title: "Existing Chat",
            lastMessage: "Hello",
            lastMessageTime: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            messages: [],
            isActive: true,
          },
        ],
        currentId: "conv-1",
      };

      (localStorageMock.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(existingData)
      );

      const { result } = renderHook(() => useChatHistory());

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0].title).toBe("Existing Chat");
      expect(result.current.currentConversationId).toBe("conv-1");
    });
  });

  describe("createNewConversation", () => {
    it("should create a new conversation and set it as current", () => {
      const { result } = renderHook(() => useChatHistory());

      const initialCount = result.current.conversations.length;

      act(() => {
        result.current.createNewConversation();
      });

      expect(result.current.conversations).toHaveLength(initialCount + 1);
      // New conversation is added at the beginning (index 0)
      expect(result.current.conversations[0].isActive).toBe(true);
      expect(result.current.conversations[1].isActive).toBe(false);
      // Current conversation should be the active one
      expect(result.current.currentConversationId).toBe(
        result.current.conversations[0].id
      );
    });
  });

  describe("selectConversation", () => {
    it("should switch to selected conversation", () => {
      const { result } = renderHook(() => useChatHistory());

      // Create a second conversation
      let secondId: string;
      act(() => {
        secondId = result.current.createNewConversation();
      });

      // Switch back to first
      act(() => {
        result.current.selectConversation(result.current.conversations[1].id);
      });

      expect(result.current.currentConversationId).toBe(
        result.current.conversations[1].id
      );
      expect(result.current.conversations[0].isActive).toBe(false);
      expect(result.current.conversations[1].isActive).toBe(true);
    });
  });

  describe("deleteConversation", () => {
    it("should delete conversation and switch to another", () => {
      const { result } = renderHook(() => useChatHistory());

      // Create additional conversations
      act(() => {
        result.current.createNewConversation();
        result.current.createNewConversation();
      });

      const firstId = result.current.conversations[2].id;
      const currentId = result.current.currentConversationId;

      act(() => {
        result.current.deleteConversation(currentId!);
      });

      expect(result.current.conversations).toHaveLength(2);
      expect(result.current.currentConversationId).not.toBe(currentId);
    });

    it("should create new conversation if all are deleted", () => {
      const { result } = renderHook(() => useChatHistory());

      const initialId = result.current.conversations[0].id;

      act(() => {
        result.current.deleteConversation(initialId);
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0].title).toBe("New Chat");
    });
  });

  describe("addMessageToConversation", () => {
    it("should add message to conversation", async () => {
      const { result } = renderHook(() => useChatHistory());

      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "Hello!",
        timestamp: new Date(),
      };

      await act(async () => {
        await result.current.addMessageToConversation(
          result.current.currentConversationId!,
          message
        );
      });

      expect(result.current.currentConversation?.messages).toHaveLength(1);
      expect(result.current.currentConversation?.lastMessage).toBe("Hello!");
    });

    it("should auto-generate title from first user message", async () => {
      const { result } = renderHook(() => useChatHistory());

      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "How do I implement authentication in React?",
        timestamp: new Date(),
      };

      await act(async () => {
        await result.current.addMessageToConversation(
          result.current.currentConversationId!,
          message
        );
      });

      expect(result.current.currentConversation?.title).toBe(
        "How do I implement authentication in React?"
      );
    });

    it("should trigger summarization when threshold is reached", async () => {
      const { result } = renderHook(() => useChatHistory());

      // Mock that summarization is needed
      mockSummarizationService.needsSummarization.mockReturnValue(true);
      mockSummarizationService.applySummarization.mockResolvedValue([
        {
          id: "summary-1",
          type: "system",
          content: "Summary of conversation",
          timestamp: new Date(),
          isSummary: true,
        } as any,
      ]);

      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "This message triggers summarization",
        timestamp: new Date(),
      };

      await act(async () => {
        await result.current.addMessageToConversation(
          result.current.currentConversationId!,
          message
        );
      });

      // Wait for async summarization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockSummarizationService.needsSummarization).toHaveBeenCalled();
      expect(mockSummarizationService.applySummarization).toHaveBeenCalled();
      expect(result.current.isSummarizing).toBe(false);
    });
  });

  describe("searchConversations", () => {
    it("should search by title", () => {
      const { result } = renderHook(() => useChatHistory());

      // Create conversations with different titles
      act(() => {
        // First conversation
        const id1 = result.current.createNewConversation();
        result.current.updateConversationTitle(id1, "React Authentication");

        // Second conversation
        const id2 = result.current.createNewConversation();
        result.current.updateConversationTitle(id2, "Node.js API");
      });

      // Now search
      act(() => {
        const searchResults = result.current.searchConversations("React");
        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].title).toBe("React Authentication");
      });
    });

    it("should search by message content", async () => {
      const { result } = renderHook(() => useChatHistory());

      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "Tell me about TypeScript interfaces",
        timestamp: new Date(),
      };

      await act(async () => {
        await result.current.addMessageToConversation(
          result.current.currentConversationId!,
          message
        );
      });

      const searchResults = result.current.searchConversations("TypeScript");
      expect(searchResults).toHaveLength(1);
    });
  });

  describe("clearConversationMessages", () => {
    it("should clear all messages from conversation", async () => {
      const { result } = renderHook(() => useChatHistory());

      // Add some messages
      await act(async () => {
        await result.current.addMessageToConversation(
          result.current.currentConversationId!,
          {
            id: "msg-1",
            type: "user",
            content: "Message 1",
            timestamp: new Date(),
          }
        );
      });

      act(() => {
        result.current.clearConversationMessages(
          result.current.currentConversationId!
        );
      });

      expect(result.current.currentConversation?.messages).toHaveLength(0);
      expect(result.current.currentConversation?.lastMessage).toBe("");
    });
  });

  describe("getTokenStats", () => {
    it("should return token statistics for current conversation", () => {
      const { result } = renderHook(() => useChatHistory());

      const stats = result.current.getTokenStats();

      expect(stats).toEqual({
        currentTokens: 1000,
        maxTokens: 32000,
        percentageUsed: 3.125,
        tokensUntilSummarization: 29000,
      });
    });

    it("should return token statistics for auto-created conversation", () => {
      const { result } = renderHook(() => useChatHistory());

      const stats = result.current.getTokenStats();

      // Even with no messages, it should return stats
      expect(stats).toEqual({
        currentTokens: 1000,
        maxTokens: 32000,
        percentageUsed: 3.125,
        tokensUntilSummarization: 29000,
      });
    });
  });

  describe("localStorage persistence", () => {
    it("should save to localStorage on changes", () => {
      const { result } = renderHook(() => useChatHistory());

      act(() => {
        result.current.createNewConversation();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orch-chat-history",
        expect.any(String)
      );
    });

    it("should handle localStorage errors gracefully", () => {
      (localStorageMock.setItem as jest.Mock).mockImplementation(() => {
        throw new Error("Storage full");
      });

      const { result } = renderHook(() => useChatHistory());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.createNewConversation();
        });
      }).not.toThrow();
    });
  });
});
