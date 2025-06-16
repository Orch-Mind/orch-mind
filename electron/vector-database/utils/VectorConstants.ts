// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * DRY (Don't Repeat Yourself) - Constantes centralizadas
 * KISS (Keep It Simple, Stupid) - Configuração simples e clara
 * Enhanced with proper logging configuration
 */

export const VECTOR_CONSTANTS = {
  // Dimensões padrão para embeddings
  EMBEDDING_DIMENSIONS: 768,

  // Configurações de batch
  BATCH_SIZE: 100,
  ID_CHECK_BATCH_SIZE: 100,

  // Thresholds dinâmicos para RAG
  THRESHOLDS: {
    CRITICAL_CONTEXT: 0.8, // Busca específica com filtros + keywords
    RAG_BALANCED: 0.6, // Busca balanceada (padrão)
    EXPLORATORY: 0.05, // 🔧 TEMP DEBUG: Reduzido para 0.05 - busca exploratória máxima
    MINIMUM: 0.0, // Threshold mínimo
    MAXIMUM: 1.0, // Threshold máximo
  },

  // Configurações de performance
  PERFORMANCE: {
    MAX_THREADS: 4,
    MEMORY_LIMIT: "2GB",
    LARGE_DATASET_WARNING: 100000,
    MIN_EXPECTED_RESULTS: 3,
    HIGH_VOLUME_THRESHOLD: 20,
  },

  // Configurações de SQL
  SQL: {
    ARRAY_TYPE: "FLOAT[768]",
    TABLE_NAME: "vectors",
    INDEX_NAME: "idx_vectors_id",
  },

  // Configurações de logging
  LOGGING: {
    LEVELS: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
    },
    DEFAULT_LEVEL: 2, // INFO
    PREFIX: "[VECTOR-DB]",
    ENABLE_TIMESTAMPS: true,
    ENABLE_COLORS: true,
  },

  // Mensagens de log padronizadas
  LOG_MESSAGES: {
    INITIALIZATION: "DuckDBHelper: Initializing DuckDB Neo",
    CONNECTION_SUCCESS: "DuckDBHelper: DuckDB Neo connection test successful",
    TABLE_SETUP_COMPLETE:
      "DuckDBHelper: Vector table setup complete with optimizations",
    VSS_LOADED: "DuckDBHelper: VSS extension loaded successfully",
    BATCH_PROCESSING: "[DUCKDB] Processing batch",
    VECTOR_VALIDATION: "[DUCKDB] Vector validation",
    QUERY_EXECUTION:
      "DuckDBHelper: Executing DuckDB Neo cosine similarity query",
    SCHEMA_MIGRATION: "DuckDBHelper: Schema migration completed",
    TABLE_RECREATION: "DuckDBHelper: Table recreated with correct schema",
  },

  // Migration settings
  MIGRATION: {
    FORCE_SCHEMA_CHECK: true,
    BACKUP_OLD_TABLE: false, // Set to true if you want to backup data during migration
    MIGRATION_VERSION: "1.0.0",
  },
} as const;

export type ThresholdType = keyof typeof VECTOR_CONSTANTS.THRESHOLDS;
export type LogLevel = keyof typeof VECTOR_CONSTANTS.LOGGING.LEVELS;

/**
 * Simple logger interface for vector database operations
 * Replaces console.log with structured logging
 */
export interface IVectorLogger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
}

/**
 * Default logger implementation
 * Can be replaced with more sophisticated logging systems
 */
export class VectorLogger implements IVectorLogger {
  private currentLevel: number;
  private readonly prefix: string;
  private readonly enableTimestamps: boolean;
  private readonly enableColors: boolean;

  constructor(
    level: LogLevel = "INFO",
    prefix = VECTOR_CONSTANTS.LOGGING.PREFIX,
    enableTimestamps = VECTOR_CONSTANTS.LOGGING.ENABLE_TIMESTAMPS,
    enableColors = VECTOR_CONSTANTS.LOGGING.ENABLE_COLORS
  ) {
    this.currentLevel = VECTOR_CONSTANTS.LOGGING.LEVELS[level];
    this.prefix = prefix;
    this.enableTimestamps = enableTimestamps;
    this.enableColors = enableColors;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = VECTOR_CONSTANTS.LOGGING.LEVELS[level];
  }

  error(message: string, ...args: any[]): void {
    if (this.currentLevel >= VECTOR_CONSTANTS.LOGGING.LEVELS.ERROR) {
      this.log("ERROR", message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.currentLevel >= VECTOR_CONSTANTS.LOGGING.LEVELS.WARN) {
      this.log("WARN", message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.currentLevel >= VECTOR_CONSTANTS.LOGGING.LEVELS.INFO) {
      this.log("INFO", message, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.currentLevel >= VECTOR_CONSTANTS.LOGGING.LEVELS.DEBUG) {
      this.log("DEBUG", message, ...args);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = this.enableTimestamps ? new Date().toISOString() : "";

    const prefix = this.enableTimestamps
      ? `${timestamp} ${this.prefix} [${level}]`
      : `${this.prefix} [${level}]`;

    if (this.enableColors) {
      const colors = {
        ERROR: "\x1b[31m", // Red
        WARN: "\x1b[33m", // Yellow
        INFO: "\x1b[36m", // Cyan
        DEBUG: "\x1b[37m", // White
        RESET: "\x1b[0m",
      };

      const color = colors[level as keyof typeof colors] || colors.INFO;
      console.log(`${color}${prefix}${colors.RESET}`, message, ...args);
    } else {
      console.log(prefix, message, ...args);
    }
  }
}

// Global logger instance - can be replaced by dependency injection
export const vectorLogger = new VectorLogger();
