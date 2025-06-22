// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ChatMessage } from "../../hooks/usePersistentMessages";
import { ChatSummarizationService } from "../ChatSummarizationService";

// Simple mock for OllamaCompletionService
const mockOllamaCompletionService = {
  callModelWithFunctions: jest.fn(),
};

// Mock dependencies
jest.mock(
  "../../../../../../context/deepgram/services/ollama/neural/OllamaCompletionService",
  () => ({
    OllamaCompletionService: jest.fn(() => mockOllamaCompletionService),
  })
);

jest.mock(
  "../../../../../../context/deepgram/services/ollama/neural/OllamaClientService",
  () => ({
    OllamaClientService: jest.fn(() => ({
      initializeClient: jest.fn(),
    })),
  })
);

jest.mock("../../../../../../../services/StorageService", () => ({
  getOption: jest.fn(() => "qwen3:4b"),
  STORAGE_KEYS: { OLLAMA_MODEL: "OLLAMA_MODEL" },
}));

jest.mock("../../../../../../context/deepgram/utils/LoggingUtils", () => ({
  LoggingUtils: {
    logInfo: jest.fn(),
    logWarning: jest.fn(),
    logError: jest.fn(),
  },
}));

describe("ChatSummarizationService - Simple Tests", () => {
  let service: ChatSummarizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatSummarizationService();

    // Default mock behavior
    mockOllamaCompletionService.callModelWithFunctions.mockResolvedValue({
      choices: [
        {
          message: {
            content: "This is a test summary.",
          },
        },
      ],
    });
  });

  test("should detect when summarization is needed", () => {
    // Create messages that exceed 30k tokens
    const messages: ChatMessage[] = [];

    // Each message with 1200 chars = 300 tokens
    // Need 100+ messages to exceed 30k
    for (let i = 0; i < 105; i++) {
      messages.push({
        id: `msg-${i}`,
        type: i % 2 === 0 ? "user" : "system",
        content: "x".repeat(1200),
        timestamp: new Date(),
      });
    }

    const needsSummarization = service.needsSummarization(messages);
    expect(needsSummarization).toBe(true);
  });

  test("should not need summarization for small conversations", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        type: "user",
        content: "Hello",
        timestamp: new Date(),
      },
      {
        id: "2",
        type: "system",
        content: "Hi there!",
        timestamp: new Date(),
      },
    ];

    const needsSummarization = service.needsSummarization(messages);
    expect(needsSummarization).toBe(false);
  });

  test("should calculate token stats correctly", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        type: "user",
        content: "a".repeat(100), // 100 chars = 25 tokens
        timestamp: new Date(),
      },
      {
        id: "2",
        type: "system",
        content: "b".repeat(200), // 200 chars = 50 tokens
        timestamp: new Date(),
      },
    ];

    const stats = service.getTokenStats(messages);

    expect(stats.currentTokens).toBe(75);
    expect(stats.maxTokens).toBe(32000);
    expect(stats.percentageUsed).toBeCloseTo(0.234, 2);
    expect(stats.tokensUntilSummarization).toBe(29925);
  });

  it("should apply summarization when needed", async () => {
    // Create messages that exceed 30k tokens
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 125; i++) {
      messages.push({
        id: `msg-${i}`,
        type: (i % 2 === 0 ? "user" : "system") as "user" | "system",
        content: "x".repeat(1000), // 250 tokens each = 31,250 total
        timestamp: new Date(),
      });
    }

    // Mock summarization response
    mockOllamaCompletionService.callModelWithFunctions.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Summary of the conversation...",
          },
        },
      ],
    });

    const result = await service.applySummarization(messages);

    // Should have fewer messages after summarization
    expect(result.length).toBeLessThan(messages.length);

    // First message should be a summary
    const firstMessage = result[0] as any;
    expect(firstMessage.type).toBe("system");
    expect(firstMessage.isSummary).toBe(true);
    expect(firstMessage.content).toContain("📋 **Conversation Summary**");
  });

  test("should handle summarization failure", async () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 125; i++) {
      messages.push({
        id: `msg-${i}`,
        type: (i % 2 === 0 ? "user" : "system") as "user" | "system",
        content: "x".repeat(1000),
        timestamp: new Date(),
      });
    }

    // Mock LLM failure
    mockOllamaCompletionService.callModelWithFunctions.mockRejectedValueOnce(
      new Error("Ollama error")
    );

    const result = await service.applySummarization(messages);

    // Should return original messages on failure
    expect(result).toEqual(messages);
  });

  test("should include context in summary prompt", async () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        type: "user",
        content: "Analyze this code",
        timestamp: new Date(),
        hasContext: true,
        contextContent: "const x = 42;",
      },
      {
        id: "2",
        type: "system",
        content: "The code defines a constant",
        timestamp: new Date(),
      },
      {
        id: "3",
        type: "user",
        content: "What else?",
        timestamp: new Date(),
      },
      {
        id: "4",
        type: "system",
        content: "It has value 42",
        timestamp: new Date(),
      },
      {
        id: "5",
        type: "user",
        content: "Thanks",
        timestamp: new Date(),
      },
    ];

    await service.summarizeConversation(messages);

    // Verify context was included in prompt
    expect(
      mockOllamaCompletionService.callModelWithFunctions
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Context: const x = 42;"),
          }),
        ]),
      })
    );
  });
});
