// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Single Responsibility Principle (SRP) - Classe focada apenas em validação de embeddings
 * KISS (Keep It Simple, Stupid) - Lógica simples e direta
 * Enhanced validation with range checking for normalized embeddings
 */

import {
  IEmbeddingValidator,
  ValidationResult,
} from "../interfaces/IEmbeddingValidator";
import { VECTOR_CONSTANTS } from "../utils/VectorConstants";

export interface EmbeddingValidationOptions {
  expectedDimensions?: number;
  checkRange?: boolean;
  minValue?: number;
  maxValue?: number;
  allowNormalization?: boolean;
}

export class EmbeddingValidator implements IEmbeddingValidator {
  private readonly defaultOptions: EmbeddingValidationOptions = {
    expectedDimensions: VECTOR_CONSTANTS.EMBEDDING_DIMENSIONS,
    checkRange: true,
    minValue: -2.0, // Reasonable range for embeddings
    maxValue: 2.0,
    allowNormalization: true,
  };

  validateAndClean(
    values: number[],
    expectedDimensions = VECTOR_CONSTANTS.EMBEDDING_DIMENSIONS,
    options: Partial<EmbeddingValidationOptions> = {}
  ): ValidationResult {
    const opts = { ...this.defaultOptions, ...options, expectedDimensions };

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validação básica
    if (!values || !Array.isArray(values)) {
      result.isValid = false;
      result.errors.push("Embedding values must be a valid array");
      return result;
    }

    if (values.length === 0) {
      result.isValid = false;
      result.errors.push("Embedding array cannot be empty");
      return result;
    }

    // Limpar valores inválidos
    const cleanedValues = this.cleanInvalidValues(values);

    // Verificar se houve limpeza
    if (
      cleanedValues.length !== values.length ||
      cleanedValues.some((val, idx) => val !== values[idx])
    ) {
      result.warnings.push(
        "Invalid values (NaN/Infinity) were replaced with 0.0"
      );
    }

    // Validação de range (se habilitada)
    if (
      opts.checkRange &&
      opts.minValue !== undefined &&
      opts.maxValue !== undefined
    ) {
      const outOfRangeCount = cleanedValues.filter(
        (val) => val < opts.minValue! || val > opts.maxValue!
      ).length;

      if (outOfRangeCount > 0) {
        const percentage = (outOfRangeCount / cleanedValues.length) * 100;
        if (percentage > 10) {
          // More than 10% out of range is suspicious
          result.warnings.push(
            `${outOfRangeCount} values (${percentage.toFixed(
              1
            )}%) are outside expected range [${opts.minValue}, ${
              opts.maxValue
            }]`
          );
        }
      }
    }

    // Normalizar dimensões
    let normalizedValues = cleanedValues;
    if (opts.allowNormalization) {
      normalizedValues = this.normalizeDimensions(
        cleanedValues,
        expectedDimensions
      );

      // Verificar se houve normalização
      if (normalizedValues.length !== cleanedValues.length) {
        if (normalizedValues.length > cleanedValues.length) {
          result.warnings.push(
            `Embedding padded from ${cleanedValues.length} to ${expectedDimensions} dimensions`
          );
        } else {
          result.warnings.push(
            `Embedding truncated from ${cleanedValues.length} to ${expectedDimensions} dimensions`
          );
        }
      }
    } else if (cleanedValues.length !== expectedDimensions) {
      result.isValid = false;
      result.errors.push(
        `Embedding dimension mismatch: expected ${expectedDimensions}, got ${cleanedValues.length}`
      );
      return result;
    }

    // Verificar se o embedding é zero vector (pode indicar problema)
    if (this.isZeroVector(normalizedValues)) {
      result.warnings.push("Embedding appears to be a zero vector");
    }

    // Verificar magnitude do vetor (embeddings normalizados devem ter magnitude próxima de 1)
    if (opts.checkRange) {
      const magnitude = this.calculateMagnitude(normalizedValues);
      if (magnitude < 0.1) {
        result.warnings.push(
          `Embedding has very low magnitude: ${magnitude.toFixed(4)}`
        );
      } else if (magnitude > 10.0) {
        result.warnings.push(
          `Embedding has very high magnitude: ${magnitude.toFixed(4)}`
        );
      }
    }

    result.cleanedValues = normalizedValues;
    return result;
  }

  hasValidValues(values: number[]): boolean {
    return values.every((val) => Number.isFinite(val));
  }

  normalizeDimensions(values: number[], targetDimensions: number): number[] {
    if (values.length === targetDimensions) {
      return [...values]; // Retorna cópia
    }

    if (values.length < targetDimensions) {
      // Padding com zeros
      return [
        ...values,
        ...new Array(targetDimensions - values.length).fill(0.0),
      ];
    } else {
      // Truncate
      return values.slice(0, targetDimensions);
    }
  }

  /**
   * Public method for cleaning invalid values - now reusable
   */
  cleanInvalidValues(values: number[]): number[] {
    return values.map((val) => (Number.isFinite(val) ? val : 0.0));
  }

  /**
   * Check if embedding is a zero vector
   */
  isZeroVector(values: number[], tolerance = 1e-10): boolean {
    return values.every((val) => Math.abs(val) < tolerance);
  }

  /**
   * Calculate vector magnitude (L2 norm)
   */
  calculateMagnitude(values: number[]): number {
    const sumOfSquares = values.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sumOfSquares);
  }

  /**
   * Normalize vector to unit length
   */
  normalizeToUnitLength(values: number[]): number[] {
    const magnitude = this.calculateMagnitude(values);
    if (magnitude === 0) {
      return values.map(() => 0); // Return zero vector if magnitude is 0
    }
    return values.map((val) => val / magnitude);
  }

  /**
   * Validate embedding statistics for quality assessment
   */
  getEmbeddingStats(values: number[]): {
    mean: number;
    std: number;
    min: number;
    max: number;
    magnitude: number;
    sparsity: number; // Percentage of near-zero values
  } {
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const magnitude = this.calculateMagnitude(values);
    const nearZeroCount = values.filter((val) => Math.abs(val) < 1e-6).length;
    const sparsity = (nearZeroCount / n) * 100;

    return { mean, std, min, max, magnitude, sparsity };
  }
}
