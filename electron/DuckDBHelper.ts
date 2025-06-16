// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * DuckDB Helper - SOLID-Compliant Facade Implementation
 *
 * SOLID Principles Applied:
 * - SRP: Pure facade pattern - delegates without mixing responsibilities
 * - OCP: Extensible via dependency injection
 * - LSP: Consistent interface implementation with proper callback support
 * - ISP: Uses focused interfaces internally
 * - DIP: Depends on abstractions, not concrete implementations
 *
 * DRY: Eliminates code duplication through unified methods
 * KISS: Simple facade with clear delegation and consistent error handling
 * YAGNI: Removes unused features, focuses on essentials
 */

import { DuckDBVectorDatabase } from "./vector-database/DuckDBVectorDatabase";
import {
  DuckDBMatch,
  IVectorDatabase,
  QueryOptions,
  VectorData,
} from "./vector-database/interfaces/IVectorDatabase";

/**
 * DuckDB Helper - SOLID-Compliant Facade Pattern Implementation
 *
 * Maintains backward compatibility while using the new SOLID architecture internally.
 * This class acts as a pure facade that delegates all operations to the refactored components.
 */
export class DuckDBHelper {
  private vectorDatabase: IVectorDatabase;

  constructor(customPath?: string) {
    // Dependency Injection - uses the new refactored architecture
    this.vectorDatabase = new DuckDBVectorDatabase(customPath);
  }

  /**
   * Initialize DuckDB connection - delegates to new architecture
   */
  async initialize(): Promise<void> {
    await this.vectorDatabase.initialize();
  }

  /**
   * Store single vector embedding with metadata (legacy method)
   * Unified error handling - throws on failure for consistency
   */
  async storeVector(
    id: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): Promise<void> {
    const result = await this.vectorDatabase.saveVectors([
      { id, values: embedding, metadata },
    ]);

    if (!result.success) {
      throw new Error(result.error || "Failed to store vector");
    }
  }

  /**
   * Save vectors to DuckDB with support for batches (Pinecone-compatible interface)
   * Supports both VectorData[] and legacy format for backward compatibility
   */
  async saveToDuckDB(
    vectors:
      | VectorData[]
      | Array<{
          id: string;
          values: number[];
          metadata: Record<string, unknown>;
        }>
  ): Promise<{ success: boolean; error?: string }> {
    // Transform legacy format to VectorData if needed
    const vectorData: VectorData[] = vectors.map((v) => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata,
    }));

    return await this.vectorDatabase.saveVectors(vectorData);
  }

  /**
   * Find similar vectors using cosine similarity (legacy method)
   */
  async findSimilarVectors(
    queryEmbedding: number[],
    limit: number = 5,
    threshold: number = -1.0,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<DuckDBMatch[]> {
    return await this.vectorDatabase.findSimilarVectors(
      queryEmbedding,
      limit,
      threshold,
      keywords,
      filters
    );
  }

  /**
   * Query DuckDB for vectors using native cosine similarity (DuckDB Neo optimized)
   */
  async queryDuckDB(
    embedding: number[],
    topK: number = 5,
    keywords: string[] = [],
    filters?: Record<string, unknown>,
    threshold?: number
  ): Promise<{ matches: DuckDBMatch[] }> {
    const options: QueryOptions = {
      topK,
      keywords,
      filters,
      threshold,
    };

    return await this.vectorDatabase.queryVectors(embedding, options);
  }

  /**
   * Check which IDs already exist in the database with progress callback support
   * LSP Compliance: Properly implements onProgress callback at facade level
   */
  async checkExistingIds(
    idsToCheck: string[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<string[]> {
    if (!idsToCheck || idsToCheck.length === 0) {
      onProgress?.(0, 0);
      return [];
    }

    // If no progress callback, delegate directly
    if (!onProgress) {
      return await this.vectorDatabase.checkExistingIds(idsToCheck);
    }

    // Implement progress tracking at facade level
    const batchSize = 100; // Reasonable batch size for progress updates
    const batches: string[][] = [];

    // Create batches for progress tracking
    for (let i = 0; i < idsToCheck.length; i += batchSize) {
      batches.push(idsToCheck.slice(i, i + batchSize));
    }

    const existingIds: string[] = [];
    let processed = 0;

    // Process batches with progress callbacks
    for (const batch of batches) {
      const batchResults = await this.vectorDatabase.checkExistingIds(batch);
      existingIds.push(...batchResults);

      processed += batch.length;
      onProgress(processed, idsToCheck.length);
    }

    return existingIds;
  }

  /**
   * Get vector count with enhanced error handling
   */
  async getVectorCount(): Promise<number> {
    return await this.vectorDatabase.getVectorCount();
  }

  /**
   * Delete all user vectors (unified method - removes duplication)
   * Removed clearVectors() to follow DRY principle
   */
  async deleteAllUserVectors(): Promise<void> {
    await this.vectorDatabase.deleteAllVectors();
  }

  /**
   * Legacy alias for backward compatibility
   * @deprecated Use deleteAllUserVectors() instead
   */
  async clearVectors(): Promise<void> {
    console.warn(
      "clearVectors() is deprecated. Use deleteAllUserVectors() instead."
    );
    await this.deleteAllUserVectors();
  }

  /**
   * Close connection and cleanup
   */
  async close(): Promise<void> {
    await this.vectorDatabase.close();
  }

  // Additional utility methods for better facade completeness

  /**
   * Check if the database is initialized and ready
   */
  async isReady(): Promise<boolean> {
    try {
      await this.getVectorCount();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getStats(): Promise<{
    vectorCount: number;
    isInitialized: boolean;
  }> {
    const vectorCount = await this.getVectorCount();
    const isInitialized = await this.isReady();

    return {
      vectorCount,
      isInitialized,
    };
  }
}
