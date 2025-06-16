// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Single Responsibility Principle (SRP) - Classe focada apenas em construção de queries SQL
 * DRY (Don't Repeat Yourself) - Reutilização de componentes de query
 * KISS (Keep It Simple, Stupid) - Queries simples e diretas
 * SECURITY - Prepared statements para prevenir SQL injection
 * COMPATIBILITY - DuckDB-specific syntax and type handling
 */

import {
  IQueryBuilder,
  QueryComponents,
  SearchableFields,
  WhereClauseOptions,
} from "../interfaces/IQueryBuilder";
import { VECTOR_CONSTANTS } from "../utils/VectorConstants";

export class VectorQueryBuilder implements IQueryBuilder {
  private searchableFields: SearchableFields = {
    content: "content",
  };

  setSearchableFields(fields: SearchableFields): void {
    this.searchableFields = { ...fields };
  }

  buildSimilarityQuery(
    embedding: number[],
    topK: number,
    threshold: number,
    options?: WhereClauseOptions
  ): QueryComponents {
    const arrayLiteral = this.buildArrayLiteral(embedding);
    const whereClause = this.buildWhereClause(options);

    const sql = `
      SELECT 
        id,
        COALESCE(list_cosine_similarity(CAST(embedding AS ${VECTOR_CONSTANTS.SQL.ARRAY_TYPE}), ${arrayLiteral}), 0.0) AS similarity_score,
        metadata
      FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME}
      WHERE ${whereClause.clause}
        AND COALESCE(list_cosine_similarity(CAST(embedding AS ${VECTOR_CONSTANTS.SQL.ARRAY_TYPE}), ${arrayLiteral}), 0.0) >= ?
      ORDER BY similarity_score DESC
      LIMIT ?;
    `;

    return {
      sql,
      parameters: [...whereClause.parameters, threshold, topK],
    };
  }

  buildFallbackQuery(
    embedding: number[],
    topK: number,
    threshold: number,
    options?: WhereClauseOptions
  ): QueryComponents {
    const arrayLiteral = this.buildArrayLiteral(embedding);
    const whereClause = this.buildWhereClause(options);

    const sql = `
      SELECT 
        id,
        COALESCE(1.0 - array_cosine_distance(CAST(embedding AS ${VECTOR_CONSTANTS.SQL.ARRAY_TYPE}), ${arrayLiteral}), 0.0) AS similarity_score,
        metadata
      FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME}
      WHERE ${whereClause.clause}
        AND COALESCE(1.0 - array_cosine_distance(CAST(embedding AS ${VECTOR_CONSTANTS.SQL.ARRAY_TYPE}), ${arrayLiteral}), 0.0) >= ?
      ORDER BY similarity_score DESC
      LIMIT ?;
    `;

    return {
      sql,
      parameters: [...whereClause.parameters, threshold, topK],
    };
  }

  buildBasicQuery(topK: number, options?: WhereClauseOptions): QueryComponents {
    const whereClause = this.buildWhereClause(options);

    const sql = `
      SELECT id, metadata, 0.5 as similarity_score
      FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME}
      WHERE ${whereClause.clause}
      LIMIT ?;
    `;

    return {
      sql,
      parameters: [...whereClause.parameters, topK],
    };
  }

  buildWhereClause(options?: WhereClauseOptions): {
    clause: string;
    parameters: (string | number | boolean | null)[];
  } {
    let clause = "embedding IS NOT NULL";
    const parameters: (string | number | boolean | null)[] = [];

    // Adicionar filtros de metadata usando prepared statements
    if (options?.filters && Object.keys(options.filters).length > 0) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null && value !== "") {
          // Sanitizar key (apenas caracteres alfanuméricos e underscore)
          const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");
          if (sanitizedKey.length > 0) {
            clause += ` AND JSON_EXTRACT(metadata, ?) = ?`;
            // Type-safe parameter handling
            const paramValue =
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
                ? value
                : String(value);
            parameters.push(`$.${sanitizedKey}`, paramValue);
          }
        }
      }
    }

    // 🔧 CORREÇÃO: Simplificar busca por keywords para evitar erro "Failed to bind value"
    if (options?.keywords && options.keywords.length > 0) {
      const validKeywords = options.keywords.filter(
        (k) => k && k.trim().length > 0
      );

      if (validKeywords.length > 0) {
        console.log(
          `🔍 [VECTOR-QUERY] Searching for keywords: [${validKeywords.join(
            ", "
          )}] in fields: [${Object.values(this.searchableFields).join(", ")}]`
        );

        // 🔧 NOVA ABORDAGEM: Usar uma única condição OR com concatenação segura
        // ao invés de muitos prepared statements que causam erro de binding
        const keywordConditions: string[] = [];

        for (const keyword of validKeywords) {
          // Quebrar keywords compostas em palavras individuais
          const words = keyword
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2);

          // Se não conseguir quebrar, usar keyword original
          const searchTerms =
            words.length > 0 ? words : [keyword.toLowerCase()];

          for (const term of searchTerms) {
            // Sanitizar termo para evitar SQL injection
            const sanitizedTerm = term.replace(/[^a-zA-Z0-9\s]/g, "").trim();

            if (sanitizedTerm.length > 0) {
              // Buscar em cada campo configurável usando prepared statements corretos
              for (const [fieldKey, fieldName] of Object.entries(
                this.searchableFields
              )) {
                if (fieldName) {
                  // Sanitizar nome do campo
                  const sanitizedFieldName = fieldName.replace(
                    /[^a-zA-Z0-9_]/g,
                    ""
                  );

                  // Usar prepared statement com parâmetro nomeado (recomendado pelo DuckDB)
                  keywordConditions.push(
                    `LOWER(JSON_EXTRACT(metadata, ?)) LIKE LOWER(?)`
                  );
                  parameters.push(
                    `$.${sanitizedFieldName}`,
                    `%${sanitizedTerm}%`
                  );
                }
              }
            }
          }
        }

        if (keywordConditions.length > 0) {
          clause += ` AND (${keywordConditions.join(" OR ")})`;
          console.log(
            `🎯 [VECTOR-QUERY] Keywords clause: (${keywordConditions.length} conditions)`
          );
        }
      }
    }

    return { clause, parameters };
  }

  buildInsertQuery(): QueryComponents {
    // DuckDB doesn't support ON CONFLICT or INSERT OR REPLACE with PRIMARY KEY
    // Return just the INSERT query, UPSERT logic will be handled in the caller
    const sql = `
      INSERT INTO ${VECTOR_CONSTANTS.SQL.TABLE_NAME} (id, embedding, metadata) VALUES (?, ?, ?);
    `;

    return { sql, parameters: [] };
  }

  buildDeleteQuery(): QueryComponents {
    // Separate DELETE query for UPSERT behavior
    const sql = `
      DELETE FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME} WHERE id = ?;
    `;

    return { sql, parameters: [] };
  }

  private buildArrayLiteral(embedding: number[]): string {
    // Validar que todos os valores são números finitos
    const validEmbedding = embedding.map((val) =>
      Number.isFinite(val) ? val : 0.0
    );

    return `[${validEmbedding.join(", ")}]::${VECTOR_CONSTANTS.SQL.ARRAY_TYPE}`;
  }
}
