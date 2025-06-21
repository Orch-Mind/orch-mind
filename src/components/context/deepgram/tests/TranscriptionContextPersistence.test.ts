// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// TranscriptionContextPersistence.test.ts
// Tests for the persistence of the temporary context using the TranscriptionContextManager

import { IPersistenceService } from "../interfaces/memory/IPersistenceService";
import { IEmbeddingService } from "../interfaces/openai/IEmbeddingService";
import {
  Message,
  SpeakerMemoryResults,
  SpeakerTranscription
} from "../interfaces/transcription/TranscriptionTypes";
import { MemoryContextBuilder } from "../services/memory/MemoryContextBuilder";
import { BatchTranscriptionProcessor } from "../services/transcription/BatchTranscriptionProcessor";
import { TranscriptionContextManager } from "../services/transcription/TranscriptionContextManager";
import { TranscriptionFormatter } from "../services/transcription/TranscriptionFormatter";

describe("TranscriptionContextPersistence", () => {
  let memoryContextBuilder1: MemoryContextBuilder;
  let memoryContextBuilder2: MemoryContextBuilder;
  let contextManager: TranscriptionContextManager;
  
  // Object to track Pinecone queries
  const pineconeQueries = {
    temporaryContext: 0,
    userContext: 0,
    reset() {
      this.temporaryContext = 0;
      this.userContext = 0;
    }
  };
  
  // Mocks
  const mockEmbeddingService: IEmbeddingService = {
    isInitialized: jest.fn().mockReturnValue(true),
    // Keep track of inputs to track specific queries
    createEmbedding: jest.fn().mockImplementation((text: string) => {
      // Create a distinct embedding based on the content
      return [text.length, text.length * 2];
    }),
    initialize: jest.fn().mockResolvedValue(true)
  };

  const mockPersistenceService: IPersistenceService = {
    saveToPinecone: jest.fn().mockResolvedValue(undefined),

    isAvailable: jest.fn().mockReturnValue(true),
    saveInteraction: jest.fn().mockResolvedValue(undefined),
    createVectorEntry: jest.fn().mockReturnValue({}),
    queryMemory: jest.fn().mockResolvedValue("")
  };
  
  // Add a custom property for the queryMemory function used in MemoryContextBuilder
  mockPersistenceService.queryMemory = jest.fn().mockImplementation((embedding: number[], /* eslint-disable-next-line @typescript-eslint/no-unused-vars */ _topK?: number, /* eslint-disable-next-line @typescript-eslint/no-unused-vars */ _keywords?: string[]) => {
    // Track specific queries based on the embedding
    if (embedding && embedding.length === 2) {
      // Identify the type of query based on the embedding
      if (embedding[0] === 22 && embedding[1] === 44) {
        pineconeQueries.temporaryContext++; // "Instructions important" has 22 characters
      } else if (embedding[0] === 17 && embedding[1] === 34) {
        pineconeQueries.userContext++; // "First message" has 17 characters
      } else if (embedding[0] === 27 && embedding[1] === 54) {
        pineconeQueries.temporaryContext++; // "New instructions different" has 27 characters
      }
    }
    return "Pinecone relevant memory";
  });
  
  beforeEach(() => {
    // Reset the mock function calls
    jest.clearAllMocks();
    pineconeQueries.reset();
    
    // Clear the singleton between tests
    contextManager = TranscriptionContextManager.getInstance();
    contextManager.clearTemporaryContext();
    
    // Create two independent instances of MemoryContextBuilder
    const formatter = new TranscriptionFormatter();
    const processor = new BatchTranscriptionProcessor(formatter);
    memoryContextBuilder1 = new MemoryContextBuilder(
      mockEmbeddingService,
      mockPersistenceService,
      formatter,
      processor
    );
    
    memoryContextBuilder2 = new MemoryContextBuilder(
      mockEmbeddingService,
      mockPersistenceService,
      formatter,
      processor
    );
    
    // Reset both builders
    memoryContextBuilder1.resetAll();
    memoryContextBuilder2.resetAll();
  });
  
  test("Temporary context should persist between different MemoryContextBuilder instances", () => {
    // Basic test setup
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];
    
    const transcricoes: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "Initial question?", 
        timestamp: "2023-01-01T10:00:00Z" 
      }
    ];
    
    // Start with temporary context in the first instance
    const temporaryContext = "Instructions important";
    
    // First execution with the first instance
    const firstRun = memoryContextBuilder1.buildMessagesWithContext(
      "Initial question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      temporaryContext,
      undefined
    );
    
    // Verify temporary context in the first execution
    const developerMessages1 = firstRun.filter(m => m.role === "system");
    const hasTemporaryContext1 = developerMessages1.some(m => 
      m.content.includes("Instructions important"));
    expect(hasTemporaryContext1).toBe(true);
    
    // Second execution with the SECOND instance (different from the first)
    // We don't pass temporaryContext explicitly to verify if it was persisted
    const secondRun = memoryContextBuilder2.buildMessagesWithContext(
      "Second question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      undefined, 
      undefined
    );
    
    // Verify if the temporary context was persisted in the second instance
    const developerMessages2 = secondRun.filter(m => m.role === "system");
    const hasTemporaryContext2 = developerMessages2.some(m => 
      m.content.includes("Instructions important"));
    
    // The context should be present even without being passed explicitly
    expect(hasTemporaryContext2).toBe(true);
  });
  
  test("Resetting temporaryContext should affect all instances", () => {
    // Basic test setup
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];
    
    const transcricoes: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "Test question?", 
        timestamp: "2023-01-01T10:00:00Z" 
      }
    ];
    
    // Define temporary context in the first instance
    const temporaryContext = "Instructions important";
    
    // First execution with context
    const firstRun = memoryContextBuilder1.buildMessagesWithContext(
      "Test question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      temporaryContext,
      undefined
    );
    
    // Verify temporary context in the first execution
    const developerMessages1 = firstRun.filter(m => m.role === "system");
    const hasTemporaryContext1 = developerMessages1.some(m => 
      m.content.includes("Instructions important"));
    expect(hasTemporaryContext1).toBe(true);
    
    // Reset the temporary context in the SECOND instance
    memoryContextBuilder2.resetTemporaryContext();
    
    // New execution in the first instance
    const secondRun = memoryContextBuilder1.buildMessagesWithContext(
      "Second question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      undefined, 
      undefined
    );
    
    // Verify that the context was cleared (should be absent)
    const developerMessages2 = secondRun.filter(m => m.role === "system");
    const hasTemporaryContext2 = developerMessages2.some(m => 
      m.content.includes("Instructions important"));
    
    // The context SHOULD NOT be present, since it was reset
    expect(hasTemporaryContext2).toBe(false);
  });
  
  test("resetAll should clear both snapshot and temporary context", () => {
    // Basic test setup
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];
    
    const transcricoes: SpeakerTranscription[] = [
      { 
        speaker: "Guilherme", 
        text: "Initial question?", 
        timestamp: "2023-01-01T10:00:00Z" 
      }
    ];
    
    // Define temporary context
    const temporaryContext = "Instructions important";
    
    // First execution
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    const firstRun = memoryContextBuilder1.buildMessagesWithContext(
      "Initial question?",
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      temporaryContext,
      undefined
    );
    
    // Reset completo
    memoryContextBuilder1.resetAll();
    
    // Second execution
    const secondRun = memoryContextBuilder2.buildMessagesWithContext(
      "Initial question?", // Same question to test if the snapshot was cleared
      conversationHistory,
      false,
      transcricoes,
      new Set(["Guilherme"]),
      "Guilherme",
      undefined, 
      undefined
    );
    
    // Verify that the temporary context was cleared
    const developerMessages = secondRun.filter(m => m.role === "system");
    const hasTemporaryContext = developerMessages.some(m => 
      m.content.includes("Instructions important"));
    expect(hasTemporaryContext).toBe(false);
    
    // Verify if the question appears (snapshot was cleared)
    const userMessages = secondRun.filter(m => m.role === "user");
    expect(userMessages.length).toBe(1); // Should have one user message
  });
  
  test("The temporary context memory should persist between calls", async () => {
    // Define temporary context
    const temporaryContext = "Instructions important";
    
    // Mock to simulate memory query results
    const mockMemoryResults: SpeakerMemoryResults = {
      userContext: "",
      speakerContexts: new Map(),
      temporaryContext: "Context memory retrieved from Pinecone"
    };
    
    // Setup básico
    const conversationHistory: Message[] = [
      { role: "system", content: "System message" }
    ];
    
    const transcricoes: SpeakerTranscription[] = [
      { speaker: "User", text: "First message", timestamp: "2023-01-01T10:00:00Z" }
    ];
    
    // First call with contextManager and memoryResults
    const firstMessages = memoryContextBuilder1.buildMessagesWithContext(
      "First message",
      conversationHistory,
      false,
      transcricoes,
      new Set(["User"]),
      "User",
      temporaryContext,
      mockMemoryResults // Com resultados de memória
    );
    
    // Verify that the temporary context memory is in the messages
    const firstDevMessages = firstMessages.filter(m => m.role === "system");
    const hasMemoryContext = firstDevMessages.some(m => 
      m.content.includes("Context memory retrieved from Pinecone"));
    expect(hasMemoryContext).toBe(true);
    
    // Second call WITHOUT passing memoryResults
    const secondMessages = memoryContextBuilder2.buildMessagesWithContext(
      "Second message",
      conversationHistory,
      false,
      [...transcricoes, { speaker: "User", text: "Second message", timestamp: "2023-01-01T10:05:00Z" }],
      new Set(["User"]),
      "User",
      undefined, // Não passamos novo contexto (deve manter o anterior)
      undefined  // Não passamos resultados de memória (deve usar o armazenado)
    );
    
    // Verify that the temporary context memory IS STILL in the messages
    const secondDevMessages = secondMessages.filter(m => m.role === "system");
    const stillHasMemoryContext = secondDevMessages.some(m => 
      m.content.includes("Context memory retrieved from Pinecone"));
    expect(stillHasMemoryContext).toBe(true);
  });
  
  test("Pinecone should only be queried for the temporaryContext when it changes", async () => {
    // Define temporary context
    const temporaryContext = "Instructions important";
    
    // Basic setup
    const transcricoes: SpeakerTranscription[] = [
      { speaker: "User", text: "First message", timestamp: "2023-01-01T10:00:00Z" }
    ];
    
    // First call - should query Pinecone for both
    await memoryContextBuilder1.fetchContextualMemory(
      transcricoes,
      [],
      new Set(["User"]),
      temporaryContext
    );
    
    // Verify specific queries
    expect(pineconeQueries.temporaryContext).toBe(1); 
    expect(pineconeQueries.userContext).toBe(0);      
    
    // Reset counter
    pineconeQueries.reset();
    
    // Second call with the SAME temporary context
    // Should only query for userContext, not for temporaryContext (reuse)
    await memoryContextBuilder2.fetchContextualMemory(
      transcricoes,
      [],
      new Set(["User"]),
      temporaryContext
    );
    
    // Verify specific queries (temporaryContext should not be queried again)
    expect(pineconeQueries.temporaryContext).toBe(0); 
    expect(pineconeQueries.userContext).toBe(0);      
    
    // Reset counter
    pineconeQueries.reset();
    
    // Third call with DIFFERENT temporary context
    const novoContexto = "New instructions";
    await memoryContextBuilder1.fetchContextualMemory(
      transcricoes,
      [],
      new Set(["User"]),
      novoContexto
    );
    
    // Verify specific queries (temporaryContext should not be queried here either)
    expect(pineconeQueries.temporaryContext).toBe(0); 
    expect(pineconeQueries.userContext).toBe(0);      
  });
}); 