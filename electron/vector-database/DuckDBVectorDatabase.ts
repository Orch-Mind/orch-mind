// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * SOLID Principles Implementation:
 * - SRP: Classe orquestra operações, delegando responsabilidades específicas
 * - OCP: Extensível via interfaces e injeção de dependências
 * - LSP: Implementa IVectorDatabase, pode ser substituída por outras implementações
 * - ISP: Usa interfaces específicas para cada responsabilidade
 * - DIP: Depende de abstrações, não de implementações concretas
 *
 * DRY: Reutiliza componentes e elimina duplicação
 * KISS: Lógica simples e direta, métodos focados
 * YAGNI: Apenas funcionalidades necessárias, sem over-engineering
 * SECURITY: Prepared statements para prevenir SQL injection
 */

import { IEmbeddingValidator } from "./interfaces/IEmbeddingValidator";
import { IQueryBuilder, WhereClauseOptions } from "./interfaces/IQueryBuilder";
import {
  DuckDBMatch,
  IVectorDatabase,
  OperationResult,
  QueryOptions,
  VectorData,
} from "./interfaces/IVectorDatabase";
import {
  DatabaseConfig,
  DuckDBConnectionManager,
  DuckDBExtensionManager,
  DuckDBTableManager,
} from "./services/DuckDBConnection";
import {
  DynamicThresholdCalculator,
  ThresholdContext,
} from "./services/DynamicThresholdCalculator";
import { EmbeddingValidator } from "./services/EmbeddingValidator";
import { VectorQueryBuilder } from "./services/VectorQueryBuilder";
import {
  IVectorLogger,
  VECTOR_CONSTANTS,
  vectorLogger,
} from "./utils/VectorConstants";

export class DuckDBVectorDatabase implements IVectorDatabase {
  private connectionManager: DuckDBConnectionManager;
  private extensionManager: DuckDBExtensionManager;
  private tableManager: DuckDBTableManager;
  private embeddingValidator: IEmbeddingValidator;
  private queryBuilder: IQueryBuilder;
  private thresholdCalculator: DynamicThresholdCalculator;
  private logger: IVectorLogger;

  constructor(
    customPath?: string,
    embeddingValidator?: IEmbeddingValidator,
    queryBuilder?: IQueryBuilder,
    thresholdCalculator?: DynamicThresholdCalculator,
    logger?: IVectorLogger
  ) {
    // Dependency Injection (DIP) - permite substituir implementações
    this.connectionManager = new DuckDBConnectionManager(customPath);
    this.extensionManager = new DuckDBExtensionManager(this.connectionManager);
    this.tableManager = new DuckDBTableManager(this.connectionManager);
    this.embeddingValidator = embeddingValidator || new EmbeddingValidator();
    this.queryBuilder = queryBuilder || new VectorQueryBuilder();
    this.thresholdCalculator =
      thresholdCalculator || new DynamicThresholdCalculator(logger);
    this.logger = logger || vectorLogger;
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing DuckDB Vector Database...");

    // Initialize connection
    await this.connectionManager.initialize();

    // Apply performance configuration
    const config: DatabaseConfig = {
      maxThreads: VECTOR_CONSTANTS.PERFORMANCE.MAX_THREADS,
      memoryLimit: VECTOR_CONSTANTS.PERFORMANCE.MEMORY_LIMIT,
      preserveInsertionOrder: false,
    };
    await this.connectionManager.applyConfiguration(config);

    // Load VSS extension (optional)
    const vssLoaded = await this.extensionManager.loadVSSExtension();
    if (!vssLoaded) {
      this.logger.warn(
        "VSS extension not available, using fallback similarity functions"
      );
    }

    // Setup vector table
    await this.tableManager.setupVectorTable();

    this.logger.info("DuckDB Vector Database initialization completed");
  }

  async close(): Promise<void> {
    this.logger.info("Closing DuckDB Vector Database...");
    await this.connectionManager.close();
  }

  async isReady(): Promise<boolean> {
    try {
      const status = this.connectionManager.getStatus();
      return status.isConnected && status.isInitialized;
    } catch {
      return false;
    }
  }

  // Core Operations - KISS: Métodos simples e diretos

  async saveVectors(vectors: VectorData[]): Promise<OperationResult> {
    if (!this.connectionManager.isConnected()) {
      await this.initialize();
    }

    const connection = this.connectionManager.getConnection();
    const arrayValue = this.connectionManager.getArrayValue();

    if (!connection || !arrayValue) {
      return { success: false, error: "DuckDB connection not initialized" };
    }

    this.logger.info(`Saving ${vectors.length} vectors to DuckDB`);

    try {
      const insertQuery = this.queryBuilder.buildInsertQuery();
      const batches = this.createBatches(vectors, VECTOR_CONSTANTS.BATCH_SIZE);

      let allSuccess = true;
      let lastError = "";

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.debug(
          `Processing batch ${i + 1}/${batches.length} with ${
            batch.length
          } vectors`
        );

        try {
          for (const vector of batch) {
            const validationResult = this.embeddingValidator.validateAndClean(
              vector.values
            );

            if (!validationResult.isValid) {
              this.logger.warn(
                `Skipping vector ${vector.id} - validation failed:`,
                validationResult.errors
              );
              continue;
            }

            if (validationResult.warnings.length > 0) {
              this.logger.debug(
                `Vector ${vector.id} warnings:`,
                validationResult.warnings
              );
            }

            const embeddingArray = arrayValue(validationResult.cleanedValues!);

            // UPSERT behavior: DELETE existing record first, then INSERT
            const deleteQuery = this.queryBuilder.buildDeleteQuery();
            await connection.run(deleteQuery.sql, [vector.id]);

            await connection.run(insertQuery.sql, [
              vector.id,
              embeddingArray,
              JSON.stringify(vector.metadata),
            ]);
          }
        } catch (batchError) {
          this.logger.error(`Error saving batch ${i + 1}:`, batchError);
          allSuccess = false;
          lastError =
            batchError instanceof Error ? batchError.message : "Unknown error";
        }
      }

      const result: OperationResult = allSuccess
        ? { success: true }
        : { success: false, error: lastError };

      this.logger.info(
        `Vector save operation completed: ${
          allSuccess ? "success" : "partial failure"
        }`
      );
      return result;
    } catch (error) {
      this.logger.error("Error saving vectors to DuckDB:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async queryVectors(
    embedding: number[],
    options: QueryOptions = {}
  ): Promise<{ matches: DuckDBMatch[] }> {
    if (!this.connectionManager.isConnected()) {
      await this.initialize();
    }

    const connection = this.connectionManager.getConnection();
    if (!connection) {
      this.logger.error("DuckDB connection not initialized, cannot query");
      return { matches: [] };
    }

    // Validar embedding
    const validationResult =
      this.embeddingValidator.validateAndClean(embedding);
    if (!validationResult.isValid) {
      this.logger.error("Invalid embedding:", validationResult.errors);
      return { matches: [] };
    }

    const cleanEmbedding = validationResult.cleanedValues!;
    const topK = options.topK || 5;

    // Calcular threshold dinâmico
    const thresholdContext: ThresholdContext = {
      keywords: options.keywords,
      filters: options.filters,
      topK,
      requestedThreshold: options.threshold,
    };
    const threshold =
      this.thresholdCalculator.calculateOptimalThreshold(thresholdContext);

    // 🔍 DEBUG: Log detalhado da consulta
    this.logger.info(`🔍 [NEURAL-QUERY-DEBUG] === QUERY PARAMETERS ===`);
    this.logger.info(
      `📊 embedding[${cleanEmbedding.length}], topK=${topK}, threshold=${threshold}`
    );
    this.logger.info(`🏷️ keywords=${JSON.stringify(options.keywords || [])}`);
    this.logger.info(`🔧 filters=${JSON.stringify(options.filters || {})}`);

    // Executar query com fallbacks automáticos
    const result = await this.executeQueryWithFallbacks(
      cleanEmbedding,
      topK,
      threshold,
      options
    );

    // 🔍 DEBUG: Log resultado
    this.logger.info(
      `✅ [NEURAL-QUERY-RESULT] Found ${result.matches.length} matches`
    );
    if (result.matches.length > 0) {
      const scores = result.matches.map((m) => m.score.toFixed(4));
      this.logger.info(
        `📈 [NEURAL-QUERY-SCORES] Score range: ${Math.min(
          ...result.matches.map((m) => m.score)
        ).toFixed(4)} → ${Math.max(
          ...result.matches.map((m) => m.score)
        ).toFixed(4)}`
      );
    } else {
      this.logger.warn(
        `⚠️ [NEURAL-QUERY-EMPTY] No matches found with threshold ${threshold}. Consider lowering threshold or checking data.`
      );
    }

    return result;
  }

  // Utility Operations

  async getVectorCount(): Promise<number> {
    if (!this.connectionManager.isConnected()) {
      await this.initialize();
    }

    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error("DuckDB connection not initialized");
    }

    try {
      const result = await connection.runAndReadAll(
        `SELECT COUNT(*) as count FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME};`
      );
      const rowObjects = result.getRowObjectsJS();
      const count = rowObjects[0]?.count as number;
      return typeof count === "bigint" ? Number(count) : count || 0;
    } catch (error) {
      this.logger.error("Failed to get vector count:", error);
      return 0;
    }
  }

  async checkExistingIds(ids: string[]): Promise<string[]> {
    if (!ids || ids.length === 0) return [];

    if (!this.connectionManager.isConnected()) {
      await this.initialize();
    }

    const connection = this.connectionManager.getConnection();
    if (!connection) {
      this.logger.error(
        "DuckDB connection not initialized, cannot check existing IDs"
      );
      return [];
    }

    try {
      const batches = this.createBatches(
        ids,
        VECTOR_CONSTANTS.ID_CHECK_BATCH_SIZE
      );
      const existingIds: string[] = [];

      for (const batch of batches) {
        // Use prepared statements for security
        const placeholders = batch.map(() => "?").join(",");
        const checkSQL = `SELECT id FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME} WHERE id IN (${placeholders});`;

        const reader = await connection.runAndReadAll(checkSQL, batch);
        const rowObjects = reader.getRowObjectsJS();

        for (const row of rowObjects) {
          existingIds.push(row.id as string);
        }
      }

      this.logger.debug(
        `Found ${existingIds.length} existing IDs out of ${ids.length} checked`
      );
      return existingIds;
    } catch (error) {
      this.logger.error("Failed to check existing IDs:", error);
      return [];
    }
  }

  async deleteAllVectors(): Promise<void> {
    if (!this.connectionManager.isConnected()) {
      await this.initialize();
    }

    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error("DuckDB connection not initialized");
    }

    try {
      const countResult = await connection.runAndReadAll(
        `SELECT COUNT(*) as count FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME};`
      );
      const currentCount =
        (countResult.getRowObjectsJS()[0]?.count as number) || 0;

      this.logger.info(`Deleting all ${currentCount} vectors...`);
      await connection.run(`DELETE FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME};`);
      this.logger.info("All vectors deleted successfully!");
    } catch (error) {
      this.logger.error("Failed to delete all vectors:", error);
      throw error;
    }
  }

  // Legacy Compatibility Methods

  async storeVector(
    id: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): Promise<void> {
    const result = await this.saveVectors([
      { id, values: embedding, metadata },
    ]);
    if (!result.success) {
      throw new Error(result.error || "Failed to store vector");
    }
  }

  async findSimilarVectors(
    queryEmbedding: number[],
    limit: number = 5,
    threshold: number = -1.0,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<DuckDBMatch[]> {
    const options: QueryOptions = {
      topK: limit,
      threshold: threshold >= 0 ? threshold : undefined,
      keywords,
      filters,
    };

    const result = await this.queryVectors(queryEmbedding, options);
    return result.matches;
  }

  // Private Helper Methods - KISS: Métodos simples e focados

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async executeQueryWithFallbacks(
    embedding: number[],
    topK: number,
    threshold: number,
    options: QueryOptions
  ): Promise<{ matches: DuckDBMatch[] }> {
    const connection = this.connectionManager.getConnection()!;
    const whereOptions: WhereClauseOptions = {
      keywords: options.keywords,
      filters: options.filters,
      embeddingLength: embedding.length,
    };

    try {
      // Tentar query principal com list_cosine_similarity
      const similarityQuery = this.queryBuilder.buildSimilarityQuery(
        embedding,
        topK,
        threshold,
        whereOptions
      );
      this.logger.debug("Executing primary cosine similarity query");

      const result = await connection.runAndReadAll(
        similarityQuery.sql,
        similarityQuery.parameters
      );
      const matches = this.parseQueryResults(result.getRowObjectsJS());

      if (matches.length > 0) {
        this.logger.debug(
          `Found ${matches.length} similar vectors with native cosine similarity`
        );
        return { matches };
      }

      // Fallback 1: VSS extension
      this.logger.debug(
        "Trying VSS extension array_cosine_distance as fallback..."
      );
      const fallbackQuery = this.queryBuilder.buildFallbackQuery(
        embedding,
        topK,
        threshold,
        whereOptions
      );
      const fallbackResult = await connection.runAndReadAll(
        fallbackQuery.sql,
        fallbackQuery.parameters
      );
      const fallbackMatches = this.parseQueryResults(
        fallbackResult.getRowObjectsJS()
      );

      if (fallbackMatches.length > 0) {
        this.logger.debug(
          `VSS fallback query returned ${fallbackMatches.length} vectors`
        );
        return { matches: fallbackMatches };
      }

      // Fallback 2: Query básica
      this.logger.debug(
        "Using final fallback - basic query without similarity..."
      );
      const basicQuery = this.queryBuilder.buildBasicQuery(topK, whereOptions);
      const basicResult = await connection.runAndReadAll(
        basicQuery.sql,
        basicQuery.parameters
      );
      const basicMatches = this.parseQueryResults(
        basicResult.getRowObjectsJS()
      );

      this.logger.debug(
        `Basic fallback returned ${basicMatches.length} vectors`
      );
      return { matches: basicMatches };
    } catch (error) {
      this.logger.error("All query fallbacks failed:", error);
      return { matches: [] };
    }
  }

  private parseQueryResults(rowObjects: any[]): DuckDBMatch[] {
    return rowObjects.map((row: any) => ({
      id: row.id as string,
      score: Number(row.similarity_score) || 0,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata,
    }));
  }
}
