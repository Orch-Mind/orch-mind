// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Single Responsibility Principle (SRP) - Interface focada apenas em validação de embeddings
 * Enhanced with additional validation methods
 */

export interface ValidationResult {
  isValid: boolean;
  cleanedValues?: number[];
  errors: string[];
  warnings: string[];
}

export interface EmbeddingStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  magnitude: number;
  sparsity: number; // Percentage of near-zero values
}

export interface IEmbeddingValidator {
  /**
   * Valida e limpa um array de embedding
   */
  validateAndClean(
    values: number[],
    expectedDimensions?: number,
    options?: any
  ): ValidationResult;

  /**
   * Verifica se um embedding tem valores válidos (sem NaN/Infinity)
   */
  hasValidValues(values: number[]): boolean;

  /**
   * Normaliza dimensões do embedding (padding/truncate)
   */
  normalizeDimensions(values: number[], targetDimensions: number): number[];

  /**
   * Limpa valores inválidos (NaN/Infinity) substituindo por 0.0
   */
  cleanInvalidValues(values: number[]): number[];

  /**
   * Verifica se o embedding é um vetor zero
   */
  isZeroVector(values: number[], tolerance?: number): boolean;

  /**
   * Calcula a magnitude do vetor (norma L2)
   */
  calculateMagnitude(values: number[]): number;

  /**
   * Normaliza vetor para comprimento unitário
   */
  normalizeToUnitLength(values: number[]): number[];

  /**
   * Obtém estatísticas do embedding para avaliação de qualidade
   */
  getEmbeddingStats(values: number[]): EmbeddingStats;
}
