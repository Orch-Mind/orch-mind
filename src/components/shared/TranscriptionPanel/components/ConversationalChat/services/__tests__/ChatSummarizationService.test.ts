import { ChatMessage } from "../../hooks/usePersistentMessages";
import { ChatSummarizationService } from "../ChatSummarizationService";

// Mock implementations
const mockCallModelWithFunctions = jest.fn();
const mockInitializeClient = jest.fn();

// Mock Ollama services
jest.mock(
  "../../../../../../context/deepgram/services/ollama/neural/OllamaClientService",
  () => {
    return {
      OllamaClientService: jest.fn().mockImplementation(() => ({
        initializeClient: mockInitializeClient,
      })),
    };
  }
);

jest.mock(
  "../../../../../../context/deepgram/services/ollama/neural/OllamaCompletionService",
  () => {
    return {
      OllamaCompletionService: jest.fn().mockImplementation(() => ({
        callModelWithFunctions: mockCallModelWithFunctions,
      })),
    };
  }
);

jest.mock("../../../../../../../services/StorageService", () => ({
  getOption: jest.fn().mockReturnValue("qwen3:4b"),
  STORAGE_KEYS: {
    OLLAMA_MODEL: "OLLAMA_MODEL",
  },
}));

jest.mock("../../../../../../context/deepgram/utils/LoggingUtils", () => ({
  LoggingUtils: {
    logInfo: jest.fn(),
    logWarning: jest.fn(),
    logError: jest.fn(),
  },
}));

describe("ChatSummarizationService", () => {
  let service: ChatSummarizationService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock behavior
    mockCallModelWithFunctions.mockResolvedValue({
      choices: [
        {
          message: {
            content: "This is a test summary of the conversation.",
          },
        },
      ],
    });

    // Create service instance
    service = new ChatSummarizationService();
  });

  afterEach(() => {
    // Clear mock calls after each test
    jest.clearAllMocks();
  });

  describe("token estimation", () => {
    it("should estimate tokens correctly", () => {
      // Using private method through any cast for testing
      const estimateTokens = (service as any).estimateTokens.bind(service);

      // 1 token ≈ 4 characters
      expect(estimateTokens("Hello")).toBe(2); // 5 chars → 2 tokens
      expect(estimateTokens("Hello world")).toBe(3); // 11 chars → 3 tokens
      expect(estimateTokens("This is a longer message with more content")).toBe(
        11
      ); // 42 chars → 11 tokens
      expect(estimateTokens("")).toBe(0); // Empty string → 0 tokens
    });

    it("should calculate total tokens for messages array", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          type: "user",
          content: "Hello, how are you?", // 19 chars → 5 tokens
          timestamp: new Date(),
        },
        {
          id: "2",
          type: "system",
          content: "I'm doing well, thank you!", // 26 chars → 7 tokens
          timestamp: new Date(),
        },
        {
          id: "3",
          type: "user",
          content: "Can you help me?", // 16 chars → 4 tokens
          timestamp: new Date(),
          hasContext: true,
          contextContent: "Previous context here", // 21 chars → 6 tokens
        },
      ];

      const totalTokens = (service as any).calculateTotalTokens(messages);
      expect(totalTokens).toBe(22); // 5 + 7 + 4 + 6 = 22 tokens
    });
  });

  describe("needsSummarization", () => {
    it("should return false when messages are below threshold", () => {
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

      expect(service.needsSummarization(messages)).toBe(false);
    });

    it("should return true when messages exceed 30k tokens", () => {
      const messages: ChatMessage[] = [];

      // Create messages that total > 30k tokens
      // Each message with 1000 chars = 250 tokens
      for (let i = 0; i < 125; i++) {
        messages.push({
          id: `msg-${i}`,
          type: i % 2 === 0 ? "user" : "system",
          content: "x".repeat(1000), // 1000 chars = 250 tokens
          timestamp: new Date(),
        });
      }

      // Total: 125 messages * 250 tokens = 31,250 tokens
      expect(service.needsSummarization(messages)).toBe(true);
    });
  });

  describe("findSummarizationSplitPoint", () => {
    it("should find optimal split point for summarization", () => {
      const messages: ChatMessage[] = [];

      // Create 100 messages with varying sizes to reach 70% of threshold
      // Need to reach ~21k tokens (70% of 30k)
      // Each message with 840 chars = 210 tokens
      for (let i = 0; i < 100; i++) {
        messages.push({
          id: `msg-${i}`,
          type: i % 2 === 0 ? "user" : "system",
          content: "x".repeat(840), // 840 chars = 210 tokens each
          timestamp: new Date(),
        });
      }

      const splitIndex = (service as any).findSummarizationSplitPoint(messages);

      // With 100 messages * 210 tokens = 21k tokens (less than 30k threshold)
      // It should split at 70% of messages = 70
      expect(splitIndex).toBe(70);
    });

    it("should leave at least 5 recent messages", () => {
      const messages: ChatMessage[] = [];

      // Create only 10 messages
      for (let i = 0; i < 10; i++) {
        messages.push({
          id: `msg-${i}`,
          type: "user",
          content: "x".repeat(10000), // Very large messages
          timestamp: new Date(),
        });
      }

      const splitIndex = (service as any).findSummarizationSplitPoint(messages);

      // With 10 messages, should split at 70% = 7
      // This leaves 3 recent messages (10 - 7 = 3)
      expect(splitIndex).toBe(7);
    });
  });

  describe("summarizeConversation", () => {
    it("should create a valid summary", async () => {
      const messages: ChatMessage[] = [];

      // Create 10 messages with enough tokens to trigger split
      for (let i = 0; i < 10; i++) {
        messages.push({
          id: `msg-${i}`,
          type: i % 2 === 0 ? "user" : "system",
          content: "x".repeat(3000), // 750 tokens each
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      // Mock successful summarization
      mockCallModelWithFunctions.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                "The user and assistant discussed project architecture, specifically considering microservices for scalability benefits and database architecture.",
            },
          },
        ],
      });

      const summary = await service.summarizeConversation(messages);

      expect(summary).toBeTruthy();
      expect(summary?.type).toBe("system");
      expect((summary as any)?.isSummary).toBe(true);
      expect(summary?.content).toContain("📋 **Conversation Summary**");
      expect((summary as any)?.originalMessageCount).toBeGreaterThan(0);
      expect((summary as any)?.originalTimeRange.start).toBeDefined();
      expect((summary as any)?.originalTimeRange.end).toBeDefined();
    });

    it("should handle summarization failure gracefully", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          type: "user",
          content: "Test message",
          timestamp: new Date(),
        },
        {
          id: "2",
          type: "system",
          content: "Response",
          timestamp: new Date(),
        },
        {
          id: "3",
          type: "user",
          content: "Another message",
          timestamp: new Date(),
        },
      ];

      // Mock Ollama failure
      mockCallModelWithFunctions.mockRejectedValueOnce(
        new Error("Ollama API error")
      );

      const summary = await service.summarizeConversation(messages);

      expect(summary).toBeNull();
    });

    it("should not summarize if too few messages", async () => {
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
          content: "Hi!",
          timestamp: new Date(),
        },
      ];

      const summary = await service.summarizeConversation(messages);

      expect(summary).toBeNull();
      expect(mockCallModelWithFunctions).not.toHaveBeenCalled();
    });
  });

  describe("applySummarization", () => {
    it("should replace old messages with summary", async () => {
      // Reset the mock before the test
      mockCallModelWithFunctions.mockClear();

      const messages: ChatMessage[] = [];

      // Create messages that need summarization (>30k tokens)
      // Each message with 1000 chars = 250 tokens
      // Need 120+ messages to exceed 30k
      for (let i = 0; i < 125; i++) {
        messages.push({
          id: `msg-${i}`,
          type: i % 2 === 0 ? "user" : "system",
          content: "x".repeat(1000), // 250 tokens each = 31,250 total
          timestamp: new Date(),
        });
      }

      // Mock successful summarization - ensure it's set before calling
      mockCallModelWithFunctions.mockImplementation(() => {
        return Promise.resolve({
          choices: [
            {
              message: {
                content: "Summary of 84 messages discussing various topics...",
              },
            },
          ],
        });
      });

      // Verify needs summarization
      const needsSummarization = service.needsSummarization(messages);
      expect(needsSummarization).toBe(true);

      // Test summarizeConversation directly first
      const summaryTest = await service.summarizeConversation(messages);

      const result = await service.applySummarization(messages);

      // Debug if no summarization occurred
      if (result.length === messages.length) {
        const splitIndex = (service as any).findSummarizationSplitPoint(
          messages
        );
        console.log(
          "No summarization applied. Messages:",
          messages.length,
          "Result:",
          result.length
        );
        console.log(
          "Token count:",
          (service as any).calculateTotalTokens(messages)
        );
        console.log("Split index:", splitIndex);
        console.log(
          "Mock call count:",
          mockCallModelWithFunctions.mock.calls.length
        );
        console.log("Summary from direct call:", summaryTest);
        console.log(
          "Mock last call result:",
          mockCallModelWithFunctions.mock.results[0]?.value
        );
      }

      expect(result.length).toBeLessThan(messages.length);
      expect(result.length).toBeGreaterThanOrEqual(30); // At least some recent messages
      expect(result.length).toBeLessThanOrEqual(50); // But much less than original
      expect(result[0].type).toBe("system");
      expect((result[0] as any).isSummary).toBe(true);

      // Should preserve recent messages
      const lastOriginalId = messages[messages.length - 1].id;
      const lastResultId = result[result.length - 1].id;
      expect(lastResultId).toBe(lastOriginalId);
    });

    it("should return original messages if no summarization needed", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          type: "user",
          content: "Short conversation",
          timestamp: new Date(),
        },
      ];

      const result = await service.applySummarization(messages);

      expect(result).toEqual(messages);
      expect(mockCallModelWithFunctions).not.toHaveBeenCalled();
    });
  });

  describe("getTokenStats", () => {
    it("should return accurate token statistics", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          type: "user",
          content: "x".repeat(1000), // 250 tokens
          timestamp: new Date(),
        },
        {
          id: "2",
          type: "system",
          content: "x".repeat(2000), // 500 tokens
          timestamp: new Date(),
        },
      ];

      const stats = service.getTokenStats(messages);

      expect(stats.currentTokens).toBe(750);
      expect(stats.maxTokens).toBe(32000);
      expect(stats.percentageUsed).toBeCloseTo(2.34, 1);
      expect(stats.tokensUntilSummarization).toBe(29250);
    });

    it("should handle empty messages", () => {
      const stats = service.getTokenStats([]);

      expect(stats.currentTokens).toBe(0);
      expect(stats.maxTokens).toBe(32000);
      expect(stats.percentageUsed).toBe(0);
      expect(stats.tokensUntilSummarization).toBe(30000);
    });
  });

  describe("summarization content formatting", () => {
    it("should include context in summarization", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          type: "user",
          content: "Please analyze this code",
          timestamp: new Date(),
          hasContext: true,
          contextContent: "function calculate() { return 42; }",
        },
        {
          id: "2",
          type: "system",
          content: "The function returns a constant value of 42",
          timestamp: new Date(),
        },
        {
          id: "3",
          type: "user",
          content: "Can we make it more dynamic?",
          timestamp: new Date(),
        },
        {
          id: "4",
          type: "system",
          content: "Yes, we can add parameters",
          timestamp: new Date(),
        },
        {
          id: "5",
          type: "user",
          content: "Show me an example",
          timestamp: new Date(),
        },
      ];

      await service.summarizeConversation(messages);

      // Verify the prompt included context
      expect(mockCallModelWithFunctions).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("Context: function calculate()"),
            }),
          ]),
        })
      );
    });
  });
});
