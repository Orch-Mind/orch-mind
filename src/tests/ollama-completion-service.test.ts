// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IClientManagementService } from "../components/context/deepgram/interfaces/openai/IClientManagementService";
import { OllamaCompletionService } from "../components/context/deepgram/services/ollama/neural/OllamaCompletionService";

// Mock fetch
global.fetch = jest.fn();

// Mock client management service
const mockClientService: IClientManagementService = {
  ensureClient: jest.fn().mockResolvedValue(true),
  initializeClient: jest.fn(),
  loadApiKey: jest.fn().mockResolvedValue("test-key"),
};

// Mock getOption
jest.mock("../services/StorageService", () => ({
  getOption: jest.fn().mockReturnValue("qwen3:latest"),
  STORAGE_KEYS: {
    OLLAMA_MODEL: "ollamaModel",
  },
}));

describe("OllamaCompletionService", () => {
  let service: OllamaCompletionService;

  beforeEach(() => {
    service = new OllamaCompletionService(mockClientService);
    jest.clearAllMocks();
  });

  describe("streamModelResponse", () => {
    it("should return the accumulated response text in responseText field", async () => {
      const mockResponse = "This is a test response from Ollama";
      const chunks = ["This is ", "a test ", "response from ", "Ollama"];

      // Mock streaming response
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify({ message: { content: chunks[0] } }) + "\n"
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify({ message: { content: chunks[1] } }) + "\n"
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify({ message: { content: chunks[2] } }) + "\n"
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify({ message: { content: chunks[3] }, done: true }) +
                "\n"
            ),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      // Track chunks received
      const receivedChunks: string[] = [];
      const onChunk = (chunk: string) => {
        receivedChunks.push(chunk);
      };

      const result = await service.streamModelResponse(
        [{ role: "user", content: "Hello" }],
        0.7,
        onChunk
      );

      // Verify the response
      expect(result.responseText).toBe(mockResponse);
      expect(result.responseText).not.toBe("");
      expect(result.isComplete).toBe(true);
      expect(result.isDone).toBe(true);

      // Verify chunks were sent
      expect(receivedChunks).toEqual(chunks);
    });

    it("should handle empty response gracefully", async () => {
      // Mock empty streaming response
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify({ message: { content: "" }, done: true }) + "\n"
            ),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const result = await service.streamModelResponse(
        [{ role: "user", content: "Hello" }],
        0.7
      );

      // Even with empty response, responseText should be empty string, not undefined
      expect(result.responseText).toBe("");
      expect(result.isComplete).toBe(true);
      expect(result.isDone).toBe(true);
    });
  });
});
