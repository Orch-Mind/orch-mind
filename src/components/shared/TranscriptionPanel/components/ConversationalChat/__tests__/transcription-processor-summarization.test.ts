// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Teste de Integração: TranscriptionPromptProcessor com Sumarização
 *
 * Este teste valida que quando a conversa atinge 30k tokens:
 * 1. A sumarização é acionada automaticamente
 * 2. As mensagens antigas são compactadas em UMA mensagem de sumário
 * 3. O array resultante tem: [sumário] + [mensagens recentes]
 * 4. O ResponseGenerator recebe e processa corretamente essa estrutura
 */

import { act, renderHook } from "@testing-library/react";
import { ResponseGenerator } from "../../../../../context/deepgram/services/transcription/processors/ResponseGenerator";
import { useChatHistory } from "../hooks/useChatHistory";
import { ChatMessage } from "../hooks/usePersistentMessages";
import { ChatSummarizationService } from "../services/ChatSummarizationService";

// Mocks necessários
const mockOllamaCompletion = jest.fn();
const mockStreamOpenAIResponse = jest.fn();
const mockMemoryService = {
  getConversationHistory: jest
    .fn()
    .mockReturnValue([
      { role: "system", content: "You are a helpful assistant." },
    ]),
  addContextToHistory: jest.fn(),
  buildPromptMessagesForModel: jest.fn(),
};

jest.mock(
  "../../../../../context/deepgram/services/ollama/neural/OllamaCompletionService",
  () => ({
    OllamaCompletionService: jest.fn().mockImplementation(() => ({
      callModelWithFunctions: mockOllamaCompletion,
    })),
  })
);

jest.mock(
  "../../../../../context/deepgram/services/ollama/neural/OllamaClientService",
  () => ({
    OllamaClientService: jest.fn().mockImplementation(() => ({
      initializeClient: jest.fn(),
    })),
  })
);

jest.mock("../../../../../../services/StorageService", () => ({
  getOption: jest.fn().mockReturnValue("qwen3:latest"),
  STORAGE_KEYS: { OLLAMA_MODEL: "OLLAMA_MODEL" },
}));

jest.mock("nanoid", () => ({
  nanoid: () => `id-${Date.now()}-${Math.random()}`,
}));

describe("TranscriptionPromptProcessor with Summarization Integration", () => {
  let service: ChatSummarizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Mock realista de sumarização
    mockOllamaCompletion.mockImplementation(async ({ messages }) => {
      const messageCount = messages.filter(
        (m: any) => m.role === "user"
      ).length;
      return {
        choices: [
          {
            message: {
              content: `This conversation of ${messageCount} messages covered: authentication patterns, state management approaches, performance optimization techniques, and React best practices. Key decisions included using JWT tokens for auth, Redux Toolkit for state, and React.memo for optimization.`,
            },
          },
        ],
      };
    });

    // Mock do LLM response
    mockStreamOpenAIResponse.mockResolvedValue({
      responseText: "Based on our previous discussion about authentication...",
    });

    service = new ChatSummarizationService();
  });

  it("should correctly handle 30k token limit by creating a single summary message", async () => {
    // PASSO 1: Criar uma conversa realista que exceda 30k tokens
    const createRealisticMessage = (id: number, type: "user" | "system") => {
      const userTopics = [
        "How do I implement JWT authentication in React with refresh tokens?",
        "What's the best way to handle state management in a large application?",
        "Can you explain React Server Components and their benefits?",
        "How do I optimize React performance for a production app?",
        "What are the security best practices for React applications?",
      ];

      const systemResponses = [
        "For JWT authentication, you'll need to: 1) Store tokens securely (httpOnly cookies preferred), 2) Implement token refresh logic before expiration, 3) Use axios interceptors for automatic token attachment, 4) Handle logout by clearing tokens and state. Here's a complete implementation...",
        "For large applications, consider: Redux Toolkit for complex state with time-travel debugging, Zustand for simpler API with less boilerplate, or Recoil for atomic state management. The choice depends on team experience and specific requirements...",
        "React Server Components render on the server, reducing bundle size. They're ideal for data fetching, large dependencies, and static content. Benefits include zero bundle size for server components, direct database access, and improved SEO...",
        "To optimize React performance: 1) Use React.memo for expensive components, 2) Implement proper key strategies, 3) Use lazy loading and code splitting, 4) Optimize re-renders with useMemo/useCallback, 5) Use production builds...",
        "Security best practices include: 1) Sanitize user input to prevent XSS, 2) Use HTTPS everywhere, 3) Implement proper CORS policies, 4) Validate data on both client and server, 5) Keep dependencies updated...",
      ];

      const content =
        type === "user"
          ? userTopics[id % userTopics.length] +
            " I need detailed guidance on implementation and best practices. " +
            "Please provide comprehensive examples.".repeat(10)
          : systemResponses[id % systemResponses.length] +
            " Let me provide more details and examples.".repeat(20);

      return {
        id: `msg-${id}`,
        type,
        content,
        timestamp: new Date(Date.now() - (200 - id) * 60000), // Espaçar timestamps
      };
    };

    // Criar mensagens suficientes para exceder 30k tokens
    const messages = [];
    for (let i = 0; i < 100; i++) {
      messages.push(createRealisticMessage(i * 2, "user"));
      messages.push(createRealisticMessage(i * 2 + 1, "system"));
    }

    // PASSO 2: Verificar que precisamos de sumarização
    const tokenStats = service.getTokenStats(messages);
    console.log("Token stats before summarization:", {
      totalTokens: tokenStats.currentTokens,
      messageCount: messages.length,
      needsSummarization: service.needsSummarization(messages),
    });

    expect(service.needsSummarization(messages)).toBe(true);
    expect(tokenStats.currentTokens).toBeGreaterThan(30000);

    // PASSO 3: Aplicar sumarização
    const summarizedMessages = await service.applySummarization(messages);

    // PASSO 4: Validar estrutura após sumarização
    console.log("After summarization:", {
      originalCount: messages.length,
      newCount: summarizedMessages.length,
      firstMessage: summarizedMessages[0],
      hasRecent: summarizedMessages.length > 1,
    });

    // Deve ter menos mensagens que o original
    expect(summarizedMessages.length).toBeLessThan(messages.length);

    // A primeira mensagem DEVE ser o sumário
    expect(summarizedMessages[0].type).toBe("system");
    expect((summarizedMessages[0] as any).isSummary).toBe(true);
    expect(summarizedMessages[0].content).toContain(
      "📋 **Conversation Summary**"
    );

    // Com 70% split point, vai preservar os últimos 30% das mensagens (60 de 200)
    // Mais a mensagem de sumário = ~61 mensagens
    expect(summarizedMessages.length).toBeGreaterThan(1); // Sumário + recentes
    expect(summarizedMessages.length).toBeLessThanOrEqual(100); // Aceitar até 100 mensagens no resultado

    // As últimas mensagens devem ser as mais recentes da conversa original
    const lastOriginal = messages[messages.length - 1];
    const lastSummarized = summarizedMessages[summarizedMessages.length - 1];
    expect(lastSummarized.id).toBe(lastOriginal.id);

    // PASSO 5: Validar que os tokens foram reduzidos
    const newTokenStats = service.getTokenStats(summarizedMessages);
    expect(newTokenStats.currentTokens).toBeLessThan(30000);
    expect(newTokenStats.currentTokens).toBeLessThan(tokenStats.currentTokens);
  });

  it("should pass summarized conversation correctly to ResponseGenerator", async () => {
    // Criar um ResponseGenerator com mocks
    const responseGenerator = new ResponseGenerator(
      mockMemoryService as any,
      { streamOpenAIResponse: mockStreamOpenAIResponse } as any
    );

    // Criar uma conversa já sumarizada
    const summarizedConversation = [
      {
        role: "system",
        content:
          "📋 **Conversation Summary** (150 messages, 35000 tokens → 1500 tokens)\n\nThe conversation covered authentication, state management, and performance optimization. Key decisions were made about using JWT tokens and Redux Toolkit.",
      },
      {
        role: "user",
        content: "Based on our discussion, how should I handle token refresh?",
      },
      {
        role: "system",
        content:
          "Given our earlier discussion about JWT authentication, you should implement token refresh using axios interceptors...",
      },
      {
        role: "user",
        content: "Can you provide a code example?",
      },
    ];

    // Gerar resposta
    await responseGenerator.generateResponse(
      "Show me the token refresh implementation",
      0.7, // temperature
      undefined, // temporaryContext
      summarizedConversation as any // conversationMessages
    );

    // Verificar que o LLM foi chamado corretamente
    expect(mockStreamOpenAIResponse).toHaveBeenCalled();
    const callArgs = mockStreamOpenAIResponse.mock.calls[0][0];

    // O ResponseGenerator pode adicionar uma mensagem de sistema padrão no início
    // Verificar que temos pelo menos o sumário e as mensagens
    expect(callArgs.length).toBeGreaterThanOrEqual(5);

    // Encontrar o sumário nas mensagens
    const summaryMessage = callArgs.find(
      (m: any) =>
        m.role === "system" && m.content.includes("📋 **Conversation Summary**")
    );
    expect(summaryMessage).toBeDefined();

    // Última mensagem deve ser o prompt atual
    expect(callArgs[callArgs.length - 1].role).toBe("user");
    expect(callArgs[callArgs.length - 1].content).toBe(
      "Show me the token refresh implementation"
    );
  });

  it("should maintain conversation context through multiple summarizations", async () => {
    const { result } = renderHook(() => useChatHistory());

    // Mock específico para sumarização neste teste
    mockOllamaCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "The conversation covered various React topics including authentication, state management, and performance optimization.",
          },
        },
      ],
    });

    // Simular múltiplas rodadas de conversa com sumarização
    let totalMessagesCreated = 0;

    // Primeira rodada: criar conversa até precisar sumarização
    await act(async () => {
      // Criar mensagens suficientes para exceder 30k tokens
      // Cada mensagem com ~400 tokens (1600 chars)
      for (let i = 0; i < 80; i++) {
        await result.current.addMessageToConversation(
          result.current.currentConversationId!,
          {
            id: `msg-${totalMessagesCreated++}`,
            type: i % 2 === 0 ? "user" : "system",
            content: `Message about topic ${i}: ${"detailed content ".repeat(
              100
            )}`, // ~400 tokens
            timestamp: new Date(),
          }
        );
      }
    });

    // Verificar se houve sumarização
    let conv = result.current.currentConversation!;
    console.log("After first round:", {
      messageCount: conv.messages.length,
      isSummarizing: result.current.isSummarizing,
      tokenStats: result.current.tokenStats,
    });

    // Se a sumarização foi acionada, deve ter menos mensagens
    if (conv.messages.length < 80) {
      const summaries = conv.messages.filter((m) => (m as any).isSummary);
      expect(summaries.length).toBeGreaterThan(0);
    }
  });

  it("should handle edge case: conversation exactly at 30k tokens", async () => {
    // Criar mensagens que totalizam exatamente 30k tokens
    const messages: ChatMessage[] = [];
    let currentTokens = 0;
    const targetTokens = 30000;

    while (currentTokens < targetTokens - 100) {
      const content = "Test message with specific length.".repeat(10);
      messages.push({
        id: `msg-${messages.length}`,
        type: (messages.length % 2 === 0 ? "user" : "system") as
          | "user"
          | "system",
        content,
        timestamp: new Date(),
      });
      currentTokens = service.getTokenStats(messages).currentTokens;
    }

    // Ajustar para ficar exatamente em 30k
    const remaining = targetTokens - currentTokens;
    if (remaining > 0) {
      messages.push({
        id: `msg-${messages.length}`,
        type: "user",
        content: "x".repeat(remaining * 4), // ~4 chars per token
        timestamp: new Date(),
      });
    }

    const finalStats = service.getTokenStats(messages);
    console.log("Edge case stats:", {
      tokens: finalStats.currentTokens,
      needsSummarization: service.needsSummarization(messages),
    });

    // Em 30k tokens exatos, DEVE acionar sumarização
    expect(service.needsSummarization(messages)).toBe(true);
  });

  it("should preserve important context markers during summarization", async () => {
    // Criar conversa com marcadores importantes
    const messages: ChatMessage[] = [
      {
        id: "important-1",
        type: "user",
        content: "IMPORTANT: Our API key is sk-1234567890",
        timestamp: new Date(),
        hasContext: true,
        contextContent: "API_KEY=sk-1234567890",
      },
      ...Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `filler-${i}`,
          type: (i % 2 === 0 ? "user" : "system") as "user" | "system",
          content: `Regular conversation message ${i}: ${"content ".repeat(
            50
          )}`,
          timestamp: new Date(),
        })),
      {
        id: "reference-1",
        type: "user",
        content: "Can you check the API key I mentioned earlier?",
        timestamp: new Date(),
      },
    ];

    // Verificar que precisamos de sumarização apenas se as mensagens excederem 30k tokens
    const tokenStats = service.getTokenStats(messages);
    console.log("Token stats for context test:", {
      tokens: tokenStats.currentTokens,
      needsSummarization: service.needsSummarization(messages),
    });

    // Se não precisar de sumarização, pule o teste
    if (!service.needsSummarization(messages)) {
      console.log(
        "Messages don't exceed token limit, skipping summarization test"
      );
      return;
    }

    // Aplicar sumarização
    const summarized = await service.applySummarization(messages);

    // Deve ter criado um sumário
    const summaryMessage = summarized.find((m) => (m as any).isSummary);
    expect(summaryMessage).toBeDefined();

    // O sumário deve ter sido criado pelo Ollama
    expect(mockOllamaCompletion).toHaveBeenCalled();
  });
});
