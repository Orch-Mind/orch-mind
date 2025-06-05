// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * DuckDB Helper for main process - Modern Implementation
 * Uses DuckDB Node Neo (@duckdb/node-api) for actual vector storage and similarity search
 */

import { app } from 'electron';
import path from 'path';

// Dynamic import types for better TypeScript support
type DuckDBConnection = import('@duckdb/node-api').DuckDBConnection;
type DuckDBInstance = import('@duckdb/node-api').DuckDBInstance;
type DuckDBArrayValue = import('@duckdb/node-api').DuckDBArrayValue;

export interface DuckDBMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Modern DuckDB Helper using DuckDB Node Neo
 * Implements vector storage with cosine similarity search
 */
export class DuckDBHelper {
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private isInitialized = false;
  private readonly dbPath: string;
  private arrayValue: ((items: readonly any[]) => DuckDBArrayValue) | null = null;
  
  // Performance optimizations - prepared statements cache
  private preparedStatements: Map<string, any> = new Map();
  private insertStmt: any = null;
  private similarityStmt: any = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'orch-os-vectors.db');
  }

  /**
   * Initialize DuckDB connection following DuckDB Neo best practices
   * Reference: https://duckdb.org/2024/12/18/duckdb-node-neo-client.html
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('DuckDBHelper: Already initialized, skipping...');
        return;
      }

      console.log(`DuckDBHelper: Initializing DuckDB Neo at: ${this.dbPath}`);
      
      // Dynamic import to avoid bundling issues with native modules
      // Using DuckDB Neo API for modern Promise-based approach
      const duckdb = await import('@duckdb/node-api');
      const { DuckDBInstance } = duckdb;
      this.arrayValue = duckdb.arrayValue;
      
      // Create DuckDB instance without problematic configuration options
      // Reference: https://duckdb.org/docs/stable/clients/node_neo/overview.html
      // Note: Avoiding config options that can cause "Failed to set config" errors
      this.instance = await DuckDBInstance.create(this.dbPath);
      this.connection = await this.instance.connect();
      
      // Apply performance optimizations using PRAGMA after connection
      // This is more reliable than passing config options during creation
      try {
        await this.connection.run(`PRAGMA threads=${Math.min(4, require('os').cpus().length)};`);
        await this.connection.run(`PRAGMA memory_limit='2GB';`);
        await this.connection.run(`PRAGMA preserve_insertion_order=false;`);
        console.log('DuckDBHelper: Performance optimizations applied via PRAGMA');
      } catch (pragmaError) {
        console.warn('DuckDBHelper: Some PRAGMA settings failed:', pragmaError);
        // Continue without some optimizations
      }
      
      // Install and load VSS extension for vector similarity functions
      // This is required for list_cosine_similarity function
      try {
        console.log('DuckDBHelper: Installing vss extension...');
        await this.connection.run('INSTALL vss;');
        await this.connection.run('LOAD vss;');
        console.log('DuckDBHelper: VSS extension loaded successfully');
      } catch (vssError) {
        console.warn('DuckDBHelper: VSS extension loading failed, using manual similarity:', vssError);
        // Continue without VSS - we'll fall back to manual calculation
      }
      
      // Test connection with DuckDB Neo API
      const result = await this.connection.run('SELECT 1 as test');
      console.log('DuckDBHelper: DuckDB Neo connection test successful');
      
      await this.setupVectorTable();
      this.isInitialized = true;
      
      console.log('DuckDBHelper: DuckDB Neo initialization completed');
    } catch (error) {
      console.error('DuckDBHelper: Failed to initialize DuckDB Neo:', error);
      throw error;
    }
  }

  /**
   * Create vectors table if it doesn't exist with performance optimizations
   */
  private async setupVectorTable(): Promise<void> {
    if (!this.connection) {
      throw new Error('DuckDB connection not initialized');
    }

    // Performance optimization: Use persistent database with compression
    // Reference: https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads.html#persistent-vs-in-memory-tables
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vectors (
        id VARCHAR PRIMARY KEY,
        embedding FLOAT[],
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.connection.run(createTableSQL);
      
      // Performance optimization: Create index for similarity searches
      // Reference: https://duckdb.org/docs/stable/guides/performance/indexing.html
      // Note: DuckDB doesn't support function-based indexes like len(embedding)
      // We'll use a basic index on id for primary key performance instead
      await this.connection.run(`
        CREATE INDEX IF NOT EXISTS idx_vectors_id 
        ON vectors (id);
      `);
      
      // Prepare commonly used statements for performance
      // Reference: https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads.html#prepared-statements
      await this.prepareCachedStatements();
      
      console.log('DuckDBHelper: Vector table setup complete with optimizations');
    } catch (error) {
      console.error('DuckDBHelper: Failed to setup vector table:', error);
      throw error;
    }
  }

  /**
   * Prepare frequently used statements for better performance
   * Note: Temporarily disabled due to parameter binding issues with DuckDB Node Neo
   * Reference: https://github.com/duckdb/duckdb/issues/13193
   */
  private async prepareCachedStatements(): Promise<void> {
    // Skip prepared statements for now due to parameter binding issues
    console.log('DuckDBHelper: Skipping prepared statements (using regular statements for compatibility)');
  }

  /**
   * Store vector embedding with metadata (single vector - legacy method)
   */
  async storeVector(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void> {
    const result = await this.saveToDuckDB([{ id, values: embedding, metadata }]);
    if (!result.success) {
      throw new Error(result.error || 'Failed to store vector');
    }
  }

  /**
   * Save vectors to DuckDB with support for batches (Pinecone-compatible interface)
   */
  async saveToDuckDB(vectors: Array<{ id: string, values: number[], metadata: Record<string, unknown> }>): Promise<{ success: boolean; error?: string }> {
    console.log('[DUCKDB][COGNITIVE-MEMORY] saveToDuckDB called! Vectors received for brain memory:', vectors.length);
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.connection || !this.arrayValue) {
      console.error("DuckDB connection not initialized, cannot save vectors");
      return { success: false, error: "DuckDB connection not initialized" };
    }

    try {
      const insertSQL = `
        INSERT OR REPLACE INTO vectors (id, embedding, metadata)
        VALUES (?, ?, ?);
      `;

      let allSuccess = true;
      let lastError = "";

      // Process vectors in batches for consistency with Pinecone behavior
      const BATCH_SIZE = 100;
      const batches = [];
      
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        batches.push(vectors.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`[DUCKDB] Dividing ${vectors.length} vectors into ${batches.length} batches of up to ${BATCH_SIZE} vectors`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[DUCKDB] Processing batch ${i+1}/${batches.length} with ${batch.length} vectors`);
        
                 try {
           // Use regular statements for now - prepared statements have parameter binding issues
           // Reference: https://github.com/duckdb/duckdb/issues/13193
           for (const vector of batch) {
             const embeddingArray = this.arrayValue!(vector.values);
             await this.connection!.run(insertSQL, [
               vector.id, 
               embeddingArray, 
               JSON.stringify(vector.metadata)
             ]);
           }
           console.log(`[DUCKDB] Batch ${i+1}/${batches.length} saved successfully!`);
        } catch (batchError) {
          console.error(`[DUCKDB] Error saving batch ${i+1}/${batches.length}:`, batchError);
          allSuccess = false;
          if (batchError instanceof Error) {
            lastError = batchError.message;
          } else {
            lastError = "Unknown error saving batch";
          }
        }
      }

      if (allSuccess) {
        console.log('[DUCKDB] All batches saved successfully! Total:', vectors.length);
        return { success: true };
      } else {
        console.error('[DUCKDB] Some batches failed during saving. Last error:', lastError);
        return { success: false, error: lastError };
      }
    } catch (error) {
      console.error("Error saving to DuckDB:", error);
      let errorMsg = "Unknown error";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Find similar vectors using cosine similarity (legacy method)
   */
  async findSimilarVectors(
    queryEmbedding: number[], 
    limit: number = 5, 
    threshold: number = -1.0  // Changed: Allow all similarities from -1 to 1
  ): Promise<DuckDBMatch[]> {
    const result = await this.queryDuckDB(queryEmbedding, limit, [], {});
    return result.matches.filter(match => (match.score || 0) >= threshold);
  }

  /**
   * Query DuckDB for vectors using native cosine similarity (DuckDB Neo optimized)
   * Reference: https://duckdb.org/2024/12/18/duckdb-node-neo-client.html
   */
  async queryDuckDB(
    embedding: number[],
    topK: number = 5,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<{ matches: DuckDBMatch[] }> {
    if (!this.isInitialized) {
      await this.initialize();
      if (!this.connection || !this.arrayValue) {
        console.error("DuckDB not initialized, cannot query");
        return { matches: [] };
      }
    }

    if (!this.connection || !this.arrayValue) {
      console.error("DuckDB connection not initialized, cannot query");
      return { matches: [] };
    }

    try {
      // DuckDB Neo approach: Build array literal directly in SQL to avoid parameter binding issues
      // Reference: https://duckdb.org/2024/05/03/vector-similarity-search-vss.html
      const arrayLiteral = `[${embedding.join(', ')}]::FLOAT[${embedding.length}]`;
      
      // Use list_cosine_similarity with proper array literal syntax
      // Handle cases where cosine similarity might be NULL (e.g., zero vectors)
      const searchSQL = `
        SELECT 
          id,
          COALESCE(list_cosine_similarity(embedding, ${arrayLiteral}), 0.0) AS similarity_score,
          metadata
        FROM vectors
        WHERE embedding IS NOT NULL 
          AND len(embedding) = ${embedding.length}
        ORDER BY similarity_score DESC
        LIMIT ${topK};
      `;

      console.log(`DuckDBHelper: Executing DuckDB Neo cosine similarity query for ${topK} vectors`);
      console.log(`DuckDBHelper: Query array literal: ${arrayLiteral}`);
      
      // Use DuckDB Neo runAndReadAll without parameter binding for arrays
      const result = await this.connection.runAndReadAll(searchSQL);
      const rowObjects = result.getRowObjectsJS();

      const matches: DuckDBMatch[] = rowObjects.map((row: any) => {
        const parsedMetadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        
        // Normalize metadata for consistency
        const normalizedMetadata = { ...parsedMetadata };
        if (!normalizedMetadata.content) {
          normalizedMetadata.content = "";
        }
        
        return {
          id: row.id as string,
          score: Number(row.similarity_score) || 0,
          metadata: normalizedMetadata
        };
      });

      console.log(`DuckDBHelper: Found ${matches.length} similar vectors with native cosine similarity`);
      return { matches };
    } catch (error) {
      console.error('DuckDBHelper: Failed to find similar vectors with DuckDB Neo:', error);
      
      // Fallback: Try using array_cosine_distance from VSS extension
      try {
        console.log('DuckDBHelper: Trying VSS extension array_cosine_distance as fallback...');
        const arrayLiteral = `[${embedding.join(', ')}]::FLOAT[${embedding.length}]`;
        
        const vssSQL = `
          SELECT 
            id,
            COALESCE(1.0 - array_cosine_distance(embedding, ${arrayLiteral}), 0.0) AS similarity_score,
            metadata
          FROM vectors
          WHERE embedding IS NOT NULL AND len(embedding) = ${embedding.length}
          ORDER BY similarity_score DESC
          LIMIT ${topK};
        `;
        
        const result = await this.connection.runAndReadAll(vssSQL);
        const rowObjects = result.getRowObjectsJS();
        
        const matches: DuckDBMatch[] = rowObjects.map((row: any) => ({
          id: row.id as string,
          score: Number(row.similarity_score) || 0,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }));
        
        console.log(`DuckDBHelper: VSS fallback query returned ${matches.length} vectors`);
        return { matches };
      } catch (fallbackError) {
        console.error('DuckDBHelper: VSS fallback also failed:', fallbackError);
        
        // Final fallback: Basic query without similarity scoring
        try {
          console.log('DuckDBHelper: Using final fallback - basic query without similarity...');
          const basicSQL = `
            SELECT id, metadata, 0.5 as similarity_score
            FROM vectors
            WHERE embedding IS NOT NULL AND len(embedding) = ${embedding.length}
            LIMIT ${topK};
          `;
          
          const result = await this.connection.runAndReadAll(basicSQL);
          const rowObjects = result.getRowObjectsJS();
          
          const matches: DuckDBMatch[] = rowObjects.map((row: any) => ({
            id: row.id as string,
            score: 0.5, // Neutral score since we can't calculate similarity
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          }));
          
          console.log(`DuckDBHelper: Basic fallback returned ${matches.length} vectors`);
          return { matches };
        } catch (basicError) {
          console.error('DuckDBHelper: All fallbacks failed:', basicError);
          return { matches: [] };
        }
      }
    }
  }

  /**
   * Check which IDs already exist in the database (Pinecone-compatible interface)
   */
  async checkExistingIds(idsToCheck: string[], onProgress?: (processed: number, total: number) => void): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
      if (!this.connection) {
        console.error("DuckDB not initialized, cannot check existing IDs");
        return [];
      }
    }
    
    if (!idsToCheck || idsToCheck.length === 0) {
      return [];
    }

    if (!this.connection) {
      console.error("DuckDB connection not initialized, cannot check existing IDs");
      return [];
    }

    try {
      console.log(`[DUCKDB] Checking ${idsToCheck.length} IDs for existence...`);
      
      // Process in batches to avoid SQL query length limits
      const BATCH_SIZE = 100;
      const existingIds: string[] = [];
      
      for (let i = 0; i < idsToCheck.length; i += BATCH_SIZE) {
        const batch = idsToCheck.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
        
        const checkSQL = `
          SELECT id FROM vectors 
          WHERE id IN (${placeholders});
        `;
        
        const reader = await this.connection.runAndReadAll(checkSQL);
        const rowObjects = reader.getRowObjectsJS();
        
        for (const row of rowObjects) {
          existingIds.push(row.id as string);
        }
        
        // Report progress
        if (onProgress) {
          onProgress(Math.min(i + BATCH_SIZE, idsToCheck.length), idsToCheck.length);
        }
      }
      
      console.log(`[DUCKDB] Found ${existingIds.length} existing IDs out of ${idsToCheck.length} checked`);
      return existingIds;
    } catch (error) {
      console.error('DuckDBHelper: Failed to check existing IDs:', error);
      return [];
    }
  }

  /**
   * Get vector count with enhanced error handling (DuckDB Neo optimized)
   * Reference: https://duckdb.org/2024/12/18/duckdb-node-neo-client.html
   */
  async getVectorCount(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.connection) {
      throw new Error('DuckDB connection not initialized');
    }

    try {
      // Use DuckDB Neo runAndReadAll for optimal performance
      const result = await this.connection.runAndReadAll('SELECT COUNT(*) as count FROM vectors;');
      const rowObjects = result.getRowObjectsJS();
      
      const count = rowObjects[0]?.count as number;
      
      // DuckDB might return BigInt, convert to number
      if (typeof count === 'bigint') {
        return Number(count);
      }
      
      return count || 0;
    } catch (error) {
      console.error('DuckDBHelper: Failed to get vector count with DuckDB Neo:', error);
      
      // Fallback: Try with table existence check
      try {
        const tableCheckResult = await this.connection.runAndReadAll(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_name = 'vectors';
        `);
        const tableCheckRows = tableCheckResult.getRowObjectsJS();
        const tableCount = tableCheckRows[0]?.count;
        const tableExists = tableCount && Number(tableCount) > 0;
        
        if (!tableExists) {
          console.log('DuckDBHelper: Vectors table does not exist, returning 0');
          return 0;
        }
        
        // Table exists but count failed - return -1 to indicate error
        console.warn('DuckDBHelper: Vectors table exists but count query failed');
        return -1;
      } catch (fallbackError) {
        console.error('DuckDBHelper: Fallback table check also failed:', fallbackError);
        return 0;
      }
    }
  }

  /**
   * Clear all vectors (legacy method)
   */
  async clearVectors(): Promise<void> {
    await this.deleteAllUserVectors();
  }

  /**
   * Delete all user vectors (Pinecone-compatible interface)
   */
  async deleteAllUserVectors(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.connection) {
      throw new Error('DuckDB connection not initialized');
    }

    try {
      const countResult = await this.connection.runAndReadAll('SELECT COUNT(*) as count FROM vectors;');
      const currentCount = countResult.getRowObjectsJS()[0]?.count as number || 0;
      
      console.log(`[DUCKDB] Deleting all ${currentCount} vectors...`);
      await this.connection.run('DELETE FROM vectors;');
      
      console.log('[DUCKDB] All vectors deleted successfully!');
    } catch (error) {
      console.error('DuckDBHelper: Failed to delete all vectors:', error);
      throw error;
    }
  }

  /**
   * Close connection and cleanup with proper prepared statement cleanup
   */
  async close(): Promise<void> {
    try {
      // Performance optimization: Clean up prepared statements
      // Reference: https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads.html#best-practices-for-using-connections
      if (this.insertStmt) {
        try {
          await this.insertStmt.finalize();
        } catch (e) {
          console.warn('DuckDBHelper: Failed to finalize insert statement:', e);
        }
        this.insertStmt = null;
      }
      
      if (this.similarityStmt) {
        try {
          await this.similarityStmt.finalize();
        } catch (e) {
          console.warn('DuckDBHelper: Failed to finalize similarity statement:', e);
        }
        this.similarityStmt = null;
      }
      
      this.preparedStatements.clear();
      
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
      console.log('DuckDBHelper: Connection closed with cleanup');
    } catch (error) {
      console.error('DuckDBHelper: Error closing connection:', error);
    }
  }
}
