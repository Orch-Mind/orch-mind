// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Single Responsibility Principle (SRP) - Classe focada APENAS em gerenciar conexão DuckDB
 * KISS (Keep It Simple, Stupid) - Configuração simples e direta
 * Separation of Concerns - Configuração, setup e performance separados
 */

import { app } from "electron";
import * as path from "path";
import { VECTOR_CONSTANTS } from "../utils/VectorConstants";

// Dynamic import types for better TypeScript support
type DuckDBConnection = import("@duckdb/node-api").DuckDBConnection;
type DuckDBInstance = import("@duckdb/node-api").DuckDBInstance;
type DuckDBArrayValue = import("@duckdb/node-api").DuckDBArrayValue;

export interface DatabaseConfig {
  maxThreads?: number;
  memoryLimit?: string;
  preserveInsertionOrder?: boolean;
}

export interface ConnectionStatus {
  isInitialized: boolean;
  isConnected: boolean;
  dbPath: string;
  lastError?: string;
}

/**
 * SRP: Responsável APENAS pela conexão com DuckDB
 */
export class DuckDBConnectionManager {
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private arrayValue: ((items: readonly any[]) => DuckDBArrayValue) | null =
    null;
  private isInitialized = false;
  private readonly dbPath: string;
  private lastError?: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = path.resolve(customPath, "orch-os-vectors.db");
    } else {
      const userDataPath = app.getPath("userData");
      this.dbPath = path.join(userDataPath, "orch-os-vectors.db");
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(
        VECTOR_CONSTANTS.LOG_MESSAGES.INITIALIZATION +
          " - Already initialized, skipping..."
      );
      return;
    }

    console.log(
      VECTOR_CONSTANTS.LOG_MESSAGES.INITIALIZATION + ` at: ${this.dbPath}`
    );

    try {
      // Dynamic import to avoid bundling issues
      const duckdb = await import("@duckdb/node-api");
      const { DuckDBInstance } = duckdb;
      this.arrayValue = duckdb.arrayValue;

      // Create instance and connection
      this.instance = await DuckDBInstance.create(this.dbPath);
      this.connection = await this.instance.connect();

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      this.lastError = undefined;
      console.log(
        "DuckDBConnectionManager: Connection established successfully"
      );
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      console.error("DuckDBConnectionManager: Failed to initialize:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.connection) {
        this.connection.closeSync();
        this.connection = null;
      }

      if (this.instance) {
        this.instance.closeSync();
        this.instance = null;
      }

      this.isInitialized = false;
      this.arrayValue = null;
      this.lastError = undefined;
      console.log("DuckDBConnectionManager: Connection closed with cleanup");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      console.error(
        "DuckDBConnectionManager: Error closing connection:",
        error
      );
    }
  }

  getConnection(): DuckDBConnection | null {
    return this.connection;
  }

  getArrayValue(): ((items: readonly any[]) => DuckDBArrayValue) | null {
    return this.arrayValue;
  }

  isConnected(): boolean {
    return this.isInitialized && this.connection !== null;
  }

  getStatus(): ConnectionStatus {
    return {
      isInitialized: this.isInitialized,
      isConnected: this.isConnected(),
      dbPath: this.dbPath,
      lastError: this.lastError,
    };
  }

  /**
   * Apply database configuration settings
   * SRP: Separated from initialization for better testability
   */
  async applyConfiguration(config: DatabaseConfig = {}): Promise<void> {
    if (!this.connection) {
      throw new Error("Connection not initialized");
    }

    try {
      const os = await import("os");
      const cpuCount = os.cpus().length;

      const maxThreads =
        config.maxThreads ||
        Math.min(VECTOR_CONSTANTS.PERFORMANCE.MAX_THREADS, cpuCount);
      const memoryLimit =
        config.memoryLimit || VECTOR_CONSTANTS.PERFORMANCE.MEMORY_LIMIT;
      const preserveOrder = config.preserveInsertionOrder ?? false;

      await this.connection.run(`PRAGMA threads=${maxThreads};`);
      await this.connection.run(`PRAGMA memory_limit='${memoryLimit}';`);
      await this.connection.run(
        `PRAGMA preserve_insertion_order=${preserveOrder};`
      );

      console.log(
        "DuckDBConnectionManager: Configuration applied successfully"
      );
    } catch (error) {
      console.warn(
        "DuckDBConnectionManager: Some configuration settings failed:",
        error
      );
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.connection) {
      throw new Error("Connection not available for testing");
    }

    try {
      await this.connection.run("SELECT 1 as test");
      console.log(VECTOR_CONSTANTS.LOG_MESSAGES.CONNECTION_SUCCESS);
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`);
    }
  }
}

/**
 * SRP: Responsável APENAS pela configuração de extensões
 */
export class DuckDBExtensionManager {
  constructor(private connectionManager: DuckDBConnectionManager) {}

  async loadVSSExtension(): Promise<boolean> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error("Connection not available");
    }

    try {
      console.log("DuckDBExtensionManager: Installing vss extension...");
      await connection.run("INSTALL vss;");
      await connection.run("LOAD vss;");
      console.log(VECTOR_CONSTANTS.LOG_MESSAGES.VSS_LOADED);
      return true;
    } catch (error) {
      console.warn(
        "DuckDBExtensionManager: VSS extension loading failed:",
        error
      );
      return false;
    }
  }
}

/**
 * SRP: Responsável APENAS pelo setup de tabelas e índices
 */
export class DuckDBTableManager {
  constructor(private connectionManager: DuckDBConnectionManager) {}

  async setupVectorTable(): Promise<void> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error("Connection not available");
    }

    try {
      // Check if table exists and has correct schema
      const tableInfo = await this.checkTableSchema(connection);

      if (tableInfo.needsRecreation) {
        console.log(
          "DuckDBTableManager: Recreating table with correct schema..."
        );
        await connection.run(
          `DROP TABLE IF EXISTS ${VECTOR_CONSTANTS.SQL.TABLE_NAME};`
        );
      }

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${VECTOR_CONSTANTS.SQL.TABLE_NAME} (
          id VARCHAR PRIMARY KEY,
          embedding ${VECTOR_CONSTANTS.SQL.ARRAY_TYPE} NOT NULL,
          metadata JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await connection.run(createTableSQL);

      // Create index
      await connection.run(`
        CREATE INDEX IF NOT EXISTS ${VECTOR_CONSTANTS.SQL.INDEX_NAME} 
        ON ${VECTOR_CONSTANTS.SQL.TABLE_NAME} (id);
      `);

      console.log(VECTOR_CONSTANTS.LOG_MESSAGES.TABLE_SETUP_COMPLETE);
    } catch (error) {
      console.error("DuckDBTableManager: Failed to setup vector table:", error);
      throw error;
    }
  }

  private async checkTableSchema(
    connection: any
  ): Promise<{ needsRecreation: boolean }> {
    try {
      // Check if table exists
      const tableCheck = await connection.runAndReadAll(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = '${VECTOR_CONSTANTS.SQL.TABLE_NAME}';
      `);

      const tableExists =
        (tableCheck.getRowObjectsJS()[0]?.count as number) > 0;

      if (!tableExists) {
        return { needsRecreation: false };
      }

      // Check column types
      const columnCheck = await connection.runAndReadAll(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${VECTOR_CONSTANTS.SQL.TABLE_NAME}' 
        AND column_name = 'embedding';
      `);

      const columns = columnCheck.getRowObjectsJS();
      const embeddingColumn = columns.find(
        (col: any) => col.column_name === "embedding"
      );

      // If embedding column is BLOB instead of FLOAT[768], we need to recreate
      if (embeddingColumn && embeddingColumn.data_type === "BLOB") {
        console.log(
          "DuckDBTableManager: Found BLOB embedding column, needs recreation"
        );
        return { needsRecreation: true };
      }

      return { needsRecreation: false };
    } catch (error) {
      console.warn("DuckDBTableManager: Could not check table schema:", error);
      return { needsRecreation: false };
    }
  }

  async getTableInfo(): Promise<{
    exists: boolean;
    rowCount?: number;
    indexExists?: boolean;
  }> {
    const connection = this.connectionManager.getConnection();
    if (!connection) {
      throw new Error("Connection not available");
    }

    try {
      // Check if table exists
      const tableCheck = await connection.runAndReadAll(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = '${VECTOR_CONSTANTS.SQL.TABLE_NAME}';
      `);

      const tableExists =
        (tableCheck.getRowObjectsJS()[0]?.count as number) > 0;

      if (!tableExists) {
        return { exists: false };
      }

      // Get row count
      const rowCountResult = await connection.runAndReadAll(`
        SELECT COUNT(*) as count FROM ${VECTOR_CONSTANTS.SQL.TABLE_NAME};
      `);
      const rowCount = rowCountResult.getRowObjectsJS()[0]?.count as number;

      // Check if index exists
      const indexCheck = await connection.runAndReadAll(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE index_name = '${VECTOR_CONSTANTS.SQL.INDEX_NAME}';
      `);
      const indexExists =
        (indexCheck.getRowObjectsJS()[0]?.count as number) > 0;

      return {
        exists: true,
        rowCount: typeof rowCount === "bigint" ? Number(rowCount) : rowCount,
        indexExists,
      };
    } catch (error) {
      console.error("DuckDBTableManager: Failed to get table info:", error);
      return { exists: false };
    }
  }
}
