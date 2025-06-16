// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Single Responsibility Principle (SRP) - Interface focada apenas em construção de queries
 * Type Safety - Proper typing for SQL parameters
 */

export interface QueryComponents {
  sql: string;
  parameters?: (string | number | boolean | null)[];
}

export interface WhereClauseOptions {
  keywords?: string[];
  filters?: Record<string, unknown>;
  embeddingLength?: number;
}

export interface SearchableFields {
  content?: string;
  title?: string;
  text?: string;
  [key: string]: string | undefined;
}

export interface IQueryBuilder {
  /**
   * Constrói query de similaridade com cosine similarity usando prepared statements
   */
  buildSimilarityQuery(
    embedding: number[],
    topK: number,
    threshold: number,
    options?: WhereClauseOptions
  ): QueryComponents;

  /**
   * Constrói query de fallback usando VSS extension com prepared statements
   */
  buildFallbackQuery(
    embedding: number[],
    topK: number,
    threshold: number,
    options?: WhereClauseOptions
  ): QueryComponents;

  /**
   * Constrói query básica sem similaridade
   */
  buildBasicQuery(topK: number, options?: WhereClauseOptions): QueryComponents;

  /**
   * Constrói cláusula WHERE dinâmica com prepared statements
   */
  buildWhereClause(options?: WhereClauseOptions): {
    clause: string;
    parameters: (string | number | boolean | null)[];
  };

  /**
   * Constrói query de inserção com prepared statements
   */
  buildInsertQuery(): QueryComponents;

  /**
   * Constrói query de deleção para UPSERT behavior
   */
  buildDeleteQuery(): QueryComponents;

  /**
   * Configura campos pesquisáveis para keywords
   */
  setSearchableFields(fields: SearchableFields): void;
}
