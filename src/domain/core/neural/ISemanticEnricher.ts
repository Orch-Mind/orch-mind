// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ISemanticEnricher.ts
// Symbolic: Contract for semantic enrichment cortex

export interface ISemanticEnricher {
  /**
   * Batch semantic enrichment for multiple neural signals
   * Processes multiple signals in a single LLM call for improved efficiency
   * @param signals Array of signal data to enrich
   * @param language Language context for enrichment
   * @returns Array of enrichment results in the same order as input
   */
  enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>>;
}
