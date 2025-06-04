// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as duckdb from '@duckdb/duckdb-wasm';
import { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import { normalizeNamespace } from "../src/components/context/deepgram/services/memory/utils/namespace";
import { getPrimaryUser } from "../src/config/UserConfig";

/**
 * DuckDB metadata interface (matches Pinecone's for compatibility)
 */
export interface DuckDBMetadata {
  content: string;
  source?: string;
  speakerName?: string;
  isSpeaker?: boolean;
  isUser?: boolean;
  messageCount?: number;
  speakerGroup?: string;
  timestamp?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Normalized DuckDB match interface (compatible with PineconeHelper)
 */
export interface NormalizedDuckDBMatch {
  id?: string;
  score?: number;
  values?: number[];
  metadata: DuckDBMetadata;
  [key: string]: unknown;
}

/**
 * Helper class for DuckDB operations in the browser using DuckDB-WASM.
 * This provides local persistence as an alternative to Pinecone for basic mode.
 * Following the same patterns and behavior as PineconeHelper for compatibility.
 * Uses DuckDB's native VSS extension and ARRAY type for optimal vector operations.
 */
export class DuckDBHelper {
  private db: AsyncDuckDB | null = null;
  private conn: AsyncDuckDBConnection | null = null;
  private isInitialized: boolean = false;
  private namespace: string = normalizeNamespace(getPrimaryUser());
  private vssExtensionLoaded: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the DuckDB database using AsyncDuckDB for browser
   */
  private async initialize() {
    try {
      console.log('[DUCKDB] Initializing DuckDB-WASM for browser...');
      
      // Get the best bundle for the current browser
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
      
      console.log('[DUCKDB] Selected bundle:', bundle);
      
      // Create worker and logger
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();
      
      // Initialize AsyncDuckDB
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      // Create connection
      this.conn = await this.db.connect();
      
      // Load VSS extension for vector operations
      await this.loadVSSExtension();
      
      // Create necessary tables for vector storage
      await this.createTablesIfNeeded();
      
      this.isInitialized = true;
      console.log("✅ DuckDB-WASM initialized successfully with VSS extension");
    } catch (error) {
      console.error("❌ Failed to initialize DuckDB-WASM:", error);
      this.db = null;
      this.conn = null;
      this.isInitialized = false;
    }
  }

  /**
   * Load the VSS extension for vector similarity search
   */
  private async loadVSSExtension() {
    if (!this.conn) return;

    try {
      console.log('[DUCKDB] Loading VSS extension...');
      
      // Install and load VSS extension
      await this.conn.query("INSTALL vss");
      await this.conn.query("LOAD vss");
      
      this.vssExtensionLoaded = true;
      console.log('[DUCKDB] VSS extension loaded successfully');
    } catch (error) {
      console.warn('[DUCKDB] VSS extension not available, falling back to manual similarity calculation:', error);
      this.vssExtensionLoaded = false;
    }
  }

  /**
   * Create the necessary tables for vector storage using ARRAY type
   */
  private async createTablesIfNeeded() {
    if (!this.conn) return;

    try {
      // Create embeddings table with ARRAY type for vectors
      await this.conn.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id VARCHAR PRIMARY KEY,
          namespace VARCHAR NOT NULL,
          embedding FLOAT[],  -- Native ARRAY type for vectors
          dimension INTEGER NOT NULL,
          metadata VARCHAR NOT NULL,   -- JSON string of metadata
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on namespace for faster filtering
      await this.conn.query(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_namespace 
        ON embeddings(namespace)
      `);

      // Create HNSW index if VSS extension is available
      if (this.vssExtensionLoaded) {
        try {
          await this.conn.query(`
            CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw 
            ON embeddings USING HNSW (embedding) 
            WITH (metric = 'cosine')
          `);
          console.log('[DUCKDB] HNSW index created for vector similarity search');
        } catch (indexError) {
          console.warn('[DUCKDB] Could not create HNSW index (using in-memory database):', indexError);
        }
      }

      console.log('[DUCKDB] Tables and indexes created successfully');
    } catch (error) {
      console.error('[DUCKDB] Error creating tables:', error);
    }
  }

  /**
   * Query DuckDB for vectors similar to the provided embedding
   * Mirrors PineconeHelper's queryPinecone method behavior
   */
  async queryDuckDB(
    embedding: number[],
    topK: number = 5,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<{ matches: NormalizedDuckDBMatch[] }> {
    if (!this.conn || !this.isInitialized) {
      await this.initialize();
      if (!this.conn || !this.isInitialized) {
        console.error("DuckDB not initialized, cannot query");
        return { matches: [] };
      }
    }

    try {
      console.log('[DUCKDB][QUERY] Executing vector similarity search...');
      
      // Escape namespace for SQL
      const escapedNamespace = this.namespace.replace(/'/g, "''");
      
      // Prepare query embedding as ARRAY literal
      const embeddingArray = `[${embedding.join(',')}]::FLOAT[${embedding.length}]`;
      let sql = '';

      // Use VSS extension if available, otherwise fall back to manual calculation
      if (this.vssExtensionLoaded) {
        sql = `
          SELECT 
            id,
            array_cosine_distance(embedding, ${embeddingArray}) as score,
            metadata
          FROM embeddings
          WHERE namespace = '${escapedNamespace}'
        `;
      } else {
        // Fallback to manual cosine similarity calculation
        sql = `
          WITH vector_similarities AS (
            SELECT 
              id,
              metadata,
              -- Manual cosine similarity calculation
              (1.0 - (
                list_aggregate(list_transform(list_zip(embedding, ${embeddingArray}), x -> x[1] * x[2]), 'sum') / 
                (sqrt(list_aggregate(list_transform(embedding, x -> x * x), 'sum')) * 
                 sqrt(list_aggregate(list_transform(${embeddingArray}, x -> x * x), 'sum')))
              )) as score
            FROM embeddings
            WHERE namespace = '${escapedNamespace}'
          )
          SELECT id, score, metadata
          FROM vector_similarities
          WHERE score IS NOT NULL
        `;
      }

      // Add keyword filtering if provided
      if (keywords && keywords.length > 0) {
        const keywordsLower = keywords.map(k => k.toLowerCase().replace(/'/g, "''"));
        const keywordConditions = keywordsLower.map(keyword => {
          return `LOWER(json_extract_string(metadata, '$.content')) LIKE '%${keyword}%'`;
        });
        
        sql += ` AND (${keywordConditions.join(" OR ")})`;
      }

      // Add custom filters if provided
      if (filters && typeof filters === 'object') {
        Object.keys(filters).forEach(key => {
          const value = filters[key];
          if (typeof value === 'string') {
            const escapedValue = value.replace(/'/g, "''");
            sql += ` AND json_extract_string(metadata, '$.${key}') = '${escapedValue}'`;
          } else if (typeof value === 'boolean' || typeof value === 'number') {
            sql += ` AND json_extract(metadata, '$.${key}') = '${value.toString()}'`;
          }
        });
      }

      // Complete the query with ordering and limit
      sql += `
        ORDER BY score ASC
        LIMIT ${topK}
      `;
      
      console.log('[DUCKDB][QUERY] Executing query with filters');
      
      // Execute the query using the correct DuckDB-WASM API
      const result = await this.conn.query(sql);
      
      // Convert Arrow table to array of objects
      const results = result.toArray().map(row => row.toJSON());
      
      // Format results to match the Pinecone response format
      const normalizedMatches = results.map(row => {
        let metadata: DuckDBMetadata;
        
        try {
          metadata = typeof row.metadata === 'string' 
            ? JSON.parse(row.metadata) 
            : row.metadata;
          
          if (!metadata.content) {
            console.warn("[DUCKDB][SANITIZE] Match without content found, normalizing for memory consistency");
            metadata.content = "";
          }
        } catch (e) {
          console.warn("[DUCKDB][SANITIZE] Error parsing metadata, normalizing", e);
          metadata = { content: "" };
        }
        
        return {
          id: row.id,
          score: 1.0 - row.score, // Convert distance to similarity score like Pinecone
          metadata
        } as NormalizedDuckDBMatch;
      });
      
      console.log(`[DUCKDB][QUERY] Found ${normalizedMatches.length} matches`);
      return { matches: normalizedMatches };
    } catch (error) {
      console.error("Error querying DuckDB:", error);
      return { matches: [] };
    }
  }

  /**
   * Save vectors to DuckDB with batching like PineconeHelper
   * Mirrors the PineconeHelper's saveToPinecone API for compatibility
   */
  async saveToDuckDB(vectors: Array<{ id: string, values: number[], metadata: Record<string, string | number | boolean | string[]> }>): Promise<{ success: boolean; error?: string }> {
    console.log('[DUCKDB][COGNITIVE-MEMORY] saveToDuckDB called! Vectors received for brain memory:', vectors.length);
    if (!this.conn || !this.isInitialized) {
      await this.initialize();
      if (!this.conn || !this.isInitialized) {
        console.error("DuckDB not initialized, cannot save vectors");
        return { success: false, error: "DuckDB not initialized" };
      }
    }

    try {
      // Sanitize metadata before insert (same as PineconeHelper)
      const sanitizedVectors = vectors.map(v => {
        const meta = { ...v.metadata };
        if (Object.prototype.hasOwnProperty.call(meta, 'messageId')) {
          const val = meta.messageId;
          const valid = (
            typeof val === 'string' ||
            typeof val === 'number' ||
            typeof val === 'boolean' ||
            (Array.isArray(val) && val.every(item => typeof item === 'string'))
          );
          if (!valid) {
            delete meta.messageId;
            console.warn('[DUCKDB][SANITIZE] Removing invalid messageId from vector for memory integrity:', val, 'in vector', v.id);
          }
        }
        // Reduce log verbosity - only log a sample for cognitive memory debugging
        if (Math.random() < 0.05) { // 5% chance only
          console.log('[DUCKDB][SANITIZE] Final metadata for vector', v.id, ':', meta);
        }
        return { ...v, metadata: meta };
      });

      console.log(`[DUCKDB] Processing ${sanitizedVectors.length} vectors for namespace ${this.namespace}`);
      
      // Split into mini-batches like PineconeHelper (avoid overwhelming the DB)
      const MINI_BATCH_SIZE = 100; // Same as PineconeHelper
      const miniBatches = [];
      
      for (let i = 0; i < sanitizedVectors.length; i += MINI_BATCH_SIZE) {
        miniBatches.push(sanitizedVectors.slice(i, i + MINI_BATCH_SIZE));
      }
      
      console.log(`[DUCKDB] Dividing ${sanitizedVectors.length} vectors into ${miniBatches.length} mini-batches of up to ${MINI_BATCH_SIZE} vectors`);
      
      // Process each mini-batch separately with transaction
      let allSuccess = true;
      let lastError = "";
      
      for (let i = 0; i < miniBatches.length; i++) {
        const batch = miniBatches[i];
        console.log(`[DUCKDB] Processing mini-batch ${i+1}/${miniBatches.length} with ${batch.length} vectors`);
        
        try {
          // Begin transaction for this batch
          await this.conn.query('BEGIN TRANSACTION');
          
          // Process each vector in the batch
          for (const vector of batch) {
            const { id, values, metadata } = vector;
            const dimension = values.length;
            
            // Convert values to ARRAY format for DuckDB
            const metadataStr = JSON.stringify(metadata);
            
            // Use INSERT OR REPLACE for upsert behavior with ARRAY type
            // Escape strings for SQL
            const escapedId = id.replace(/'/g, "''");
            const escapedNamespace = this.namespace.replace(/'/g, "''");
            const escapedMetadata = metadataStr.replace(/'/g, "''");
            const embeddingArray = `[${values.join(',')}]::FLOAT[${dimension}]`;
            
            await this.conn.query(`
              INSERT OR REPLACE INTO embeddings 
              (id, namespace, embedding, dimension, metadata)
              VALUES ('${escapedId}', '${escapedNamespace}', ${embeddingArray}, ${dimension}, '${escapedMetadata}')
            `);
          }
          
          // Commit the transaction
          await this.conn.query('COMMIT');
          console.log(`[DUCKDB] Mini-batch ${i+1}/${miniBatches.length} saved successfully!`);
        } catch (batchError) {
          try {
            await this.conn.query('ROLLBACK');
          } catch (rollbackError) {
            console.error(`[DUCKDB] Error during rollback for batch ${i+1}:`, rollbackError);
          }
          
          console.error(`[DUCKDB] Error saving mini-batch ${i+1}/${miniBatches.length}:`, batchError);
          allSuccess = false;
          if (batchError instanceof Error) {
            lastError = batchError.message;
          } else {
            lastError = "Unknown error saving mini-batch";
          }
        }
        
        // Small pause between batches like PineconeHelper
        if (i < miniBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (allSuccess) {
        console.log('[DUCKDB] All mini-batches saved successfully! Total:', sanitizedVectors.length);
        return { success: true };
      } else {
        console.error('[DUCKDB] Some mini-batches failed during saving. Last error:', lastError);
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
   * Check if vectors with given IDs already exist in DuckDB
   * Mirrors PineconeHelper's checkExistingIds behavior with batching
   */
  async checkExistingIds(idsToCheck: string[], onProgress?: (processed: number, total: number) => void): Promise<string[]> {
    // Define the namespace using getPrimaryUser (same as PineconeHelper)
    this.namespace = normalizeNamespace(getPrimaryUser());
    if (!this.conn || !this.isInitialized) {
      await this.initialize();
      if (!this.conn || !this.isInitialized) {
        console.error("DuckDB not initialized, cannot check existing IDs");
        return [];
      }
    }
    
    // If there are no IDs to check, return an empty list
    if (!idsToCheck || idsToCheck.length === 0) {
      return [];
    }
    
    try {
      // Use smaller batch size like PineconeHelper to avoid performance issues
      const batchSize = 50; // Same as PineconeHelper
      const existingIds: string[] = [];
      
      console.log(`[DUCKDB] Verifying ${idsToCheck.length} IDs in DuckDB`);
      
      // Process in smaller batches
      for (let i = 0; i < idsToCheck.length; i += batchSize) {
        const idsBatch = idsToCheck.slice(i, i + batchSize);
        
        try {
          console.log(`[DUCKDB] Processing batch ${i / batchSize + 1} of ${Math.ceil(idsToCheck.length / batchSize)} (${idsBatch.length} IDs)`);
          
          // Update progress
          if (onProgress) {
            onProgress(Math.min(i + batchSize, idsToCheck.length), idsToCheck.length);
          }
          
          // For larger batches, divide into sub-batches like PineconeHelper
          const subBatchSize = 10; // Same as PineconeHelper
          const subBatchExistingIds: string[] = [];
          
          for (let j = 0; j < idsBatch.length; j += subBatchSize) {
            const subBatch = idsBatch.slice(j, j + subBatchSize);
            
            try {
              // Create placeholders for the SQL IN clause
              const placeholders = subBatch.map(() => '?').join(',');
              
              // Query for existing IDs
              const escapedNamespace = this.namespace.replace(/'/g, "''");
              const escapedIds = subBatch.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
              const sql = `
                SELECT id
                FROM embeddings
                WHERE namespace = '${escapedNamespace}' AND id IN (${escapedIds})
              `;
              
              const result = await this.conn.query(sql);
              
              // Convert results to array
              const results = result.toArray().map(row => row.toJSON());
              
              if (results.length > 0) {
                const foundIds = results.map(row => row.id);
                console.log(`[DUCKDB] ✅ Found ${foundIds.length} existing IDs in this sub-batch:`, foundIds);
                subBatchExistingIds.push(...foundIds);
              } else {
                console.log(`[DUCKDB] ❌ No IDs found in this sub-batch`);
              }
            } catch (subError) {
              console.warn(`[DUCKDB] Error checking ID sub-batch (${j} to ${j + subBatchSize}):`, subError);
              // Continue with the next sub-batch, even if there is an error
            }
          }
          
          existingIds.push(...subBatchExistingIds);
        } catch (fetchError) {
          console.warn(`[DUCKDB] Error processing ID batch (${i} to ${i + batchSize}):`, fetchError);
          // Continue with the next batch, even if there is an error
        }
      }
      
      console.log(`[DUCKDB] Found ${existingIds.length} existing IDs of ${idsToCheck.length} checked`);
      console.log('[DUCKDB][DEBUG] === END checkExistingIds ===');
      return existingIds;
    } catch (error) {
      console.error("[DUCKDB] Error checking existing IDs:", error);
      return [];
    }
  }

  /**
   * Deletes all user vectors in DuckDB for the current namespace
   * Mirrors PineconeHelper's deleteAllUserVectors behavior
   */
  async deleteAllUserVectors(): Promise<void> {
    if (!this.conn || !this.isInitialized) {
      await this.initialize();
      if (!this.conn || !this.isInitialized) {
        console.error("DuckDB not initialized, cannot delete user vectors");
        return;
      }
    }
    
    try {
      // Delete all vectors for the current namespace
      const escapedNamespace = this.namespace.replace(/'/g, "''");
      await this.conn.query(`DELETE FROM embeddings WHERE namespace = '${escapedNamespace}'`);
      console.log(`[DUCKDB] Deleted all vectors in namespace ${this.namespace}`);
    } catch (error) {
      console.error("Error deleting user vectors from DuckDB:", error);
    }
  }
  
  /**
   * Closes the DuckDB connection
   */
  async close(): Promise<void> {
    try {
      if (this.conn) {
        await this.conn.close();
      }
      
      if (this.db) {
        await this.db.terminate();
      }
      
      this.conn = null;
      this.db = null;
      this.isInitialized = false;
      console.log('[DUCKDB] Connection closed');
    } catch (error) {
      console.error('[DUCKDB] Error closing connection:', error);
    }
  }
}
