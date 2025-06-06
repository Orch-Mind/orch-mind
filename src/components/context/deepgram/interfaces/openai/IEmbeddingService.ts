// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// IEmbeddingService.ts
// Interface for embedding text services

export interface IEmbeddingService {
  /**
   * Creates an embedding for the provided text
   */
  createEmbedding(text: string): Promise<number[]>;
  
  /**
   * Creates embeddings for a batch of texts (batch processing)
   * @param texts Array of texts to generate embeddings for
   * @returns Array of arrays of numbers representing the embeddings
   */
  createEmbeddings(texts: string[]): Promise<number[][]>;
  
  /**
   * Checks if the embedding service is initialized
   */
  isInitialized(): boolean;
  
  /**
   * Initializes the embedding service
   */
  initialize(config?: Record<string, any>): Promise<boolean>;
} 