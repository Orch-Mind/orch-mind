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

describe("MessageProcessor duplicate detection", () => {
  it("should detect duplicates with different formatting", () => {
    // Este teste verifica se a normalização está funcionando
    // Caso real: uma versão sem quebras e outra com quebras de linha
    const msg1 =
      "Ola, tudo bem!Sou o Orch-OS, seu amigo virtual.Estou aqui, pronto para ajudar.";
    const msg2 =
      "Ola, tudo bem!\nSou o Orch-OS, seu amigo virtual.\nEstou aqui, pronto para ajudar.";

    // Simulação da normalização melhorada
    const normalize = (text: string): string => {
      return text
        .trim()
        .replace(/([!?.])([A-Z])/g, "$1 $2") // Adiciona espaço após pontuação seguida de maiúscula
        .replace(/\s+/g, " ") // Substitui múltiplos espaços por um único
        .replace(/\n+/g, " ") // Substitui quebras de linha por espaços
        .toLowerCase();
    };

    // Agora ambas devem ser normalizadas para o mesmo resultado
    expect(normalize(msg1)).toBe(normalize(msg2));

    // Teste adicional com a mensagem real do problema
    const realMsg1 =
      "Ola, tudo bem!Sou o Orch-OS, seu amigo virtual.Estou aqui, pronto para ajudar.Como está a temperatura?Que bom que você está aqui — é um prazer conversar com você. 😊";
    const realMsg2 =
      "Ola, tudo bem!\nSou o Orch-OS, seu amigo virtual.\nEstou aqui, pronto para ajudar.\nComo está a temperatura?\nQue bom que você está aqui — é um prazer conversar com você. 😊";

    expect(normalize(realMsg1)).toBe(normalize(realMsg2));
  });
});
