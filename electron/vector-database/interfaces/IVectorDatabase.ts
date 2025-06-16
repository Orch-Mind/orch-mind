// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Interface Segregation Principle (ISP) - Interfaces específicas e focadas
 * Dependency Inversion Principle (DIP) - Abstração para diferentes implementações
 */

export interface DuckDBMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorData {
  id: string;
  values: number[];
  metadata: Record<string, unknown>;
}

export interface QueryOptions {
  topK?: number;
  keywords?: string[];
  filters?: Record<string, unknown>;
  threshold?: number;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

// ISP: Core vector operations interface
export interface IVectorOperations {
  saveVectors(vectors: VectorData[]): Promise<OperationResult>;
  queryVectors(
    embedding: number[],
    options?: QueryOptions
  ): Promise<{ matches: DuckDBMatch[] }>;
}

// ISP: Database management interface
export interface IDatabaseManagement {
  initialize(): Promise<void>;
  close(): Promise<void>;
  isReady(): Promise<boolean>;
}

// ISP: Utility operations interface
export interface IVectorUtilities {
  getVectorCount(): Promise<number>;
  checkExistingIds(ids: string[]): Promise<string[]>;
  deleteAllVectors(): Promise<void>;
}

// ISP: Legacy compatibility interface
export interface ILegacyVectorOperations {
  storeVector(
    id: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): Promise<void>;
  findSimilarVectors(
    queryEmbedding: number[],
    limit?: number,
    threshold?: number,
    keywords?: string[],
    filters?: Record<string, unknown>
  ): Promise<DuckDBMatch[]>;
}

// Main interface combining all focused interfaces
export interface IVectorDatabase
  extends IVectorOperations,
    IDatabaseManagement,
    IVectorUtilities,
    ILegacyVectorOperations {}
