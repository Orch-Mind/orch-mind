// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IPersistenceService } from "../interfaces/memory/IPersistenceService";
import { IEmbeddingService } from "../interfaces/openai/IEmbeddingService";
import {
  Message,
  SpeakerMemoryResults,
  SpeakerTranscription
} from "../interfaces/transcription/TranscriptionTypes";
import { MemoryContextBuilder } from "../services/memory/MemoryContextBuilder";
import { BatchTranscriptionProcessor } from "../services/transcription/BatchTranscriptionProcessor";
import { TranscriptionFormatter } from "../services/transcription/TranscriptionFormatter";

// Mocks with proper interfaces
const mockEmbeddingService: IEmbeddingService = {
  isInitialized: jest.fn().mockReturnValue(true),
  createEmbedding: jest.fn().mockResolvedValue([]),
  initialize: jest.fn().mockResolvedValue(true)
};

// Fix persistence service mock to match the interface
const mockPersistenceService: IPersistenceService = {
  saveToPinecone: jest.fn(async () => ({ success: true })), // mock compatible

  isAvailable: jest.fn().mockReturnValue(true),
  saveInteraction: jest.fn().mockResolvedValue(undefined),
  createVectorEntry: jest.fn().mockReturnValue({}),
  queryMemory: jest.fn().mockResolvedValue("")
};

// Add a custom property for the queryMemory function used in MemoryContextBuilder
// This extends the mock object beyond the interface
(mockPersistenceService as any).queryMemory = jest.fn().mockReturnValue("");

describe("TranscriptionSnapshotTracker", () => {
  let memoryContextBuilder: MemoryContextBuilder;
  let formatter: TranscriptionFormatter;

  beforeEach(() => {
    formatter = new TranscriptionFormatter();
    const processor = new BatchTranscriptionProcessor(formatter);
    
    memoryContextBuilder = new MemoryContextBuilder(
      mockEmbeddingService,
      mockPersistenceService,
      formatter,
      processor
    );
    
    // Reset the snapshot tracker before each test
    memoryContextBuilder.resetSnapshotTracker();
  });

  test("New message is processed correctly without duplicates or context confusion", () => {
    // Arrange
    const conversationHistory: Message[] = [
      { role: "system", content: "📦 User relevant memory:\n[Guilherme] Hello, how are you?" },
      // Remove the user message from history - this would be handled by deduplication
      // { role: "user", content: "[Guilherme] Olá, tudo bem?" },
      { role: "assistant", content: "Hello, how are you?" }
    ];

    // Pre-populate the snapshot tracker with the existing transcription
    memoryContextBuilder.resetSnapshotTracker();
    memoryContextBuilder["snapshotTracker"].updateSnapshot("[Guilherme] Hello, how are you?");
    
    const novaMensagem = "[Guilherme] What do you think about this?";
    
    // Create speaker transcriptions that include both the old and new messages
    const transcricoesCompletas: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "Hello, how are you?", 
        timestamp: "2023-01-01T10:00:00Z" 
      },
      { 
        speaker: "Guilherme", 
        text: "What do you think about this?", 
        timestamp: "2023-01-01T10:01:00Z" 
      }
    ];

    const memoryResults: SpeakerMemoryResults = {
      userContext: "[Guilherme] Hello, how are you?",
      speakerContexts: new Map(),
      temporaryContext: ""
    };

    // Act
    const mensagensGeradas = memoryContextBuilder.buildMessagesWithContext(
      novaMensagem,
      conversationHistory,
      false, // sem simplified history
      transcricoesCompletas, // inclui a nova mensagem no fim
      new Set(["Guilherme"]),
      "Guilherme",
      undefined, // sem temporaryContext
      memoryResults
    );

    // Assert
    const ultimaMensagem = mensagensGeradas[mensagensGeradas.length - 1];
    expect(ultimaMensagem.role).toBe("user");
    expect(ultimaMensagem.content).toContain("What do you think about this?");
    expect(ultimaMensagem.content).not.toContain("Hello, how are you?");
    
    // Verify no duplicated content in the entire message array
    const userMessages = mensagensGeradas.filter(m => m.role === "user");
    expect(userMessages.length).toBe(1); // Should only have one user message after deduplication
    
    // Test that running it twice will not include any content (all filtered out)
    const secondRun = memoryContextBuilder.buildMessagesWithContext(
      novaMensagem,
      conversationHistory,
      false,
      transcricoesCompletas,
      new Set(["Guilherme"]),
      "Guilherme",
      undefined,
      memoryResults
    );
    
    // We expect the second run to not have any user messages
    const secondRunUserMessages = secondRun.filter(m => m.role === "user");
    expect(secondRunUserMessages.length).toBe(0);
  });

  test("Multiple messages are properly deduplicated", () => {
    // Arrange
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];

    const transcricoesCompletas: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "First message", 
        timestamp: "2023-01-01T10:00:00Z" 
      },
      { 
        speaker: "Guilherme", 
        text: "Second message", 
        timestamp: "2023-01-01T10:01:00Z" 
      },
      { 
        speaker: "Guilherme", 
        text: "Third message", 
        timestamp: "2023-01-01T10:02:00Z" 
      }
    ];

    // Resetar para começar limpo
    memoryContextBuilder.resetAll();
    
    // First run - should include all three messages
    const firstRun = memoryContextBuilder.buildMessagesWithContext(
      "First message\nSecond message\nThird message",
      conversationHistory,
      false,
      transcricoesCompletas,
      new Set(["Guilherme"]),
      "Guilherme",
      undefined, // Use undefined instead of null
      undefined  // Use undefined instead of null
    );

    // There should be 2 messages: system message + user message with all content
    expect(firstRun.length).toBe(2);
    expect(firstRun[1].role).toBe("user");
    expect(firstRun[1].content).toContain("First message");
    expect(firstRun[1].content).toContain("Second message");
    expect(firstRun[1].content).toContain("Third message");

    // Second run with partially new content
    const updatedTranscricoesCompletas: SpeakerTranscription[] = [
      ...transcricoesCompletas,
      { 
        speaker: "Guilherme", 
        text: "Fourth message", 
        timestamp: "2023-01-01T10:03:00Z" 
      }
    ];

    const secondRun = memoryContextBuilder.buildMessagesWithContext(
      "First message\nSecond message\nThird message\nFourth message",
      conversationHistory,
      false,
      updatedTranscricoesCompletas,
      new Set(["Guilherme"]),
      "Guilherme",
      undefined, // Use undefined instead of null
      undefined  // Use undefined instead of null
    );

    // There should be 2 messages: system message + user message with ONLY the new content
    expect(secondRun.length).toBe(2);
    expect(secondRun[1].role).toBe("user");
    expect(secondRun[1].content).not.toContain("First message");
    expect(secondRun[1].content).not.toContain("Second message");
    expect(secondRun[1].content).not.toContain("Third message");
    expect(secondRun[1].content).toContain("Fourth message");
  });

  test("Temporary context is deduplicated between executions", () => {
    // Arrange
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];

    const transcricoes: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "What is the initial question?", 
        timestamp: "2023-01-01T10:00:00Z" 
      }
    ];

    // Reset everything
    memoryContextBuilder.resetAll();
    
    // Temporary context that should persist
    const temporaryContext = "Instructions important";
    
    // First execution with temporary context
    const firstRun = memoryContextBuilder.buildMessagesWithContext(
      "What is the initial question?",
      conversationHistory,
      false,
      transcricoes, 
      new Set(["Guilherme"]),
      "Guilherme",
      temporaryContext,
      undefined
    );

    // Verify that the temporary context is present
    const developerMessages = firstRun.filter(m => m.role === "system");
    const hasTemporaryContext = developerMessages.some(m => 
      m.content.includes("Instructions important"));
    expect(hasTemporaryContext).toBe(true);
    
    console.log("First run developer messages:", 
      developerMessages.map(m => m.content.substring(0, 30) + "..."));

    // Second execution with new question but same temporary context
    const novaTranscricao: SpeakerTranscription[] = [
      ...transcricoes,
      { 
        speaker: "Guilherme", 
        text: "Second question?", 
        timestamp: "2023-01-01T10:01:00Z" 
      }
    ];
    
    const secondRun = memoryContextBuilder.buildMessagesWithContext(
      "Second question?",
      conversationHistory,
      false,
      novaTranscricao,
      new Set(["Guilherme"]),
      "Guilherme",
      temporaryContext, // Same temporary context
      undefined
    );
    
    // Verify that the temporary context IS STILL present in the second prompt
    const secondRunDeveloperMessages = secondRun.filter(m => m.role === "system");
    console.log("Second run developer messages:", 
      secondRunDeveloperMessages.map(m => m.content.substring(0, 30) + "..."));
    
    const stillHasTemporaryContext = secondRunDeveloperMessages.some(m => 
      m.content.includes("Instructions important"));
    expect(stillHasTemporaryContext).toBe(true);
    
    // Verify that the new question is present, but the old one is not
    const secondRunUserMessages = secondRun.filter(m => m.role === "user");
    expect(secondRunUserMessages.length).toBe(1);
    expect(secondRunUserMessages[0].content).toContain("Second question?");
    expect(secondRunUserMessages[0].content).not.toContain("What is the initial question?");
  });

  test("Temporary context with dynamically created objects", () => {
    // This test verifies if the use of dynamically created objects affects the temporary context
    
    // Resetting the initial tracker
    memoryContextBuilder.resetAll();
    
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];
    
    const transcricoes: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "What is the initial question?", 
        timestamp: "2023-01-01T10:00:00Z" 
      }
    ];
    
    // 1. Creating a dynamic context object (as it would be in production)
    const dynamicContext = {
      instructions: "Instructions important",
      get value() { return this.instructions; }
    };
    
    // 2. First run with dynamic context
    const firstRun = memoryContextBuilder.buildMessagesWithContext(
      "What is the initial question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      dynamicContext.value, // Using dynamic getter
      undefined
    );
    
    // Verify that the temporary context is present 
    const developerMessages = firstRun.filter(m => m.role === "system");
    const hasTemporaryContext = developerMessages.some(m => 
      m.content.includes("Instructions important"));
    expect(hasTemporaryContext).toBe(true);
    
    // 3. Modifying the dynamic object after the first call
    // (Simula situações onde o objeto pode mudar entre chamadas)
    dynamicContext.instructions = "Instructions modified after first call";
    
    // 4. Second run with the same object (now modified)
    const secondRun = memoryContextBuilder.buildMessagesWithContext(
      "What is the second question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      dynamicContext.value, // Using modified getter
      undefined
    );
    
    // 5. Verify the instructions in the developer messages
    const developerMessages2 = secondRun.filter(m => m.role === "system");
    console.log("Dynamic context developer messages:", 
      developerMessages2.map(m => m.content.substring(0, 50) + "..."));
    
    // Should not contain the original instructions
    const hasOriginalInstructions = developerMessages2.some(m => 
      m.content.includes("Instructions important"));
    expect(hasOriginalInstructions).toBe(false);
    
    // Should contain the new instructions
    const hasNewInstructions = developerMessages2.some(m => 
      m.content.includes("Instructions modified after first call"));
    expect(hasNewInstructions).toBe(true);
  });
}); 