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
        const os = await import('os');
        const cpuCount = os.cpus().length;
        await this.connection.run(`PRAGMA threads=${Math.min(4, cpuCount)};`);
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
        
        // Test VSS functions availability
        await this.testVSSFunctions();
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
      // Note: DuckDB doesn't support HNSW indexes or function-based indexes like len(embedding)
      // This is a known limitation compared to specialized vector databases
      // Workarounds:
      // 1. Use smaller datasets or implement pagination
      // 2. Pre-filter data using metadata before similarity search
      // 3. Consider using DuckDB's VSS extension for better vector operations
      // 4. For production workloads with millions of vectors, consider specialized vector DBs
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
   * Check if the dataset size might cause performance issues
   */
  private async checkDatasetSize(): Promise<void> {
    try {
      const count = await this.getVectorCount();
      if (count > 100000) {
        console.warn(`DuckDBHelper: Warning - Dataset has ${count} vectors. Performance may degrade without HNSW indexes.`);
        console.warn(`DuckDBHelper: Consider using a specialized vector database for datasets over 100k vectors.`);
      }
    } catch (error) {
      // Ignore errors in size check
    }
  }

  /**
   * Build dynamic WHERE clause with filters and keywords
   * Reference: https://duckdb.org/docs/stable/clients/node_neo/overview.html
   */
  private buildWhereClause(
    embeddingLength: number,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): string {
    // Validate embedding length
    if (!embeddingLength || embeddingLength <= 0) {
      console.warn('DuckDBHelper: Invalid embedding length for WHERE clause:', embeddingLength);
      return 'embedding IS NOT NULL';
    }
    
    let whereClause = `embedding IS NOT NULL AND len(embedding) = ${embeddingLength}`;
    
    // Add metadata filters using JSON extraction
    if (filters && Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          // Sanitize key and value for SQL injection protection
          const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
          const escapedValue = typeof value === 'string' 
            ? `'${value.replace(/'/g, "''")}'` 
            : String(value);
          whereClause += ` AND JSON_EXTRACT(metadata, '$.${sanitizedKey}') = ${escapedValue}`;
        }
      }
    }
    
    // Add keyword search in metadata content fields
    if (keywords && keywords.length > 0) {
      const validKeywords = keywords.filter(k => k && k.trim().length > 0);
      if (validKeywords.length > 0) {
        const keywordConditions = validKeywords.map(keyword => {
          const escapedKeyword = keyword.trim().replace(/'/g, "''");
          return `(JSON_EXTRACT(metadata, '$.content') ILIKE '%${escapedKeyword}%' OR 
                   JSON_EXTRACT(metadata, '$.title') ILIKE '%${escapedKeyword}%' OR
                   JSON_EXTRACT(metadata, '$.text') ILIKE '%${escapedKeyword}%')`;
        }).join(' AND ');
        whereClause += ` AND (${keywordConditions})`;
      }
    }
    
    console.log(`DuckDBHelper: Built WHERE clause: ${whereClause.substring(0, 200)}${whereClause.length > 200 ? '...' : ''}`);
    return whereClause;
  }

  /**
   * Test which VSS functions are available
   */
  private async testVSSFunctions(): Promise<void> {
    if (!this.connection) return;
    
    try {
      // Test available vector functions
      const functionsSQL = `
        SELECT function_name, parameters 
        FROM duckdb_functions() 
        WHERE function_name IN ('list_cosine_similarity', 'array_cosine_distance', 'list_distance', 'array_distance')
        ORDER BY function_name;
      `;
      
      const result = await this.connection.runAndReadAll(functionsSQL);
      const functions = result.getRowObjectsJS();
      
      console.log(`DuckDBHelper: Available vector functions (${functions.length}):`);
      functions.forEach((func: any) => {
        console.log(`  - ${func.function_name}: ${func.parameters}`);
      });
      
      if (functions.length === 0) {
        console.warn('DuckDBHelper: No vector similarity functions found. Performance may be limited.');
      }
    } catch (error) {
      console.warn('DuckDBHelper: Could not query available functions:', error);
    }
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
          // Use DuckDB Neo parameter binding with proper array handling
          // Reference: https://duckdb.org/docs/stable/clients/node_neo/overview.html
          for (const vector of batch) {
            // Critical: Validate and clean embedding values before saving
            if (!vector.values || !Array.isArray(vector.values)) {
              console.warn(`[DUCKDB] Skipping vector ${vector.id} - invalid values array`);
              continue;
            }
            
            // Check for NaN or infinite values
            const hasInvalidValues = vector.values.some(val => !Number.isFinite(val));
            if (hasInvalidValues) {
              console.warn(`[DUCKDB] Vector ${vector.id} contains NaN/Infinity values - cleaning...`);
              console.warn('[DUCKDB] Invalid values:', vector.values.filter(val => !Number.isFinite(val)));
              
              // Clean the embedding by replacing invalid values with 0.0
              vector.values = vector.values.map(val => Number.isFinite(val) ? val : 0.0);
              console.warn(`[DUCKDB] Cleaned vector ${vector.id} by replacing non-finite values with 0.0`);
            }
            
            // Create array value using DuckDB's arrayValue function
            const embeddingArray = this.arrayValue!(vector.values);
            
            // Execute with parameter binding - DuckDB Neo supports this properly
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
   * Updated to support keywords and filters for enhanced search capabilities
   */
  async findSimilarVectors(
    queryEmbedding: number[], 
    limit: number = 5, 
    threshold: number = -1.0,  // Changed: Allow all similarities from -1 to 1
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<DuckDBMatch[]> {
    // Validate and sanitize threshold
    const validThreshold = (threshold !== undefined && threshold !== null && !isNaN(threshold)) 
      ? threshold 
      : -1.0;
    
    console.log(`DuckDBHelper: findSimilarVectors called with threshold=${validThreshold}, embedding dims=${queryEmbedding.length}`);
    
    const result = await this.queryDuckDB(queryEmbedding, limit, keywords, filters);
    
    const filteredMatches = result.matches.filter(match => (match.score || 0) >= validThreshold);
    console.log(`DuckDBHelper: Filtered ${result.matches.length} -> ${filteredMatches.length} matches with threshold ${validThreshold}`);
    
    return filteredMatches;
  }

  /**
   * Query DuckDB for vectors using native cosine similarity (DuckDB Neo optimized)
   * Enhanced with metadata filtering and keyword search capabilities
   * 
   * @param embedding - Query vector as number array
   * @param topK - Maximum number of results to return (default: 5)
   * @param keywords - Keywords to search in metadata content, title, and text fields
   * @param filters - Key-value pairs to filter metadata (e.g., {type: 'document', category: 'research'})
   * @param threshold - Minimum cosine similarity score (optional - uses dynamic threshold if not provided)
   * 
   * Threshold guidelines for RAG applications:
   * - 0.8-1.0: High precision, very relevant context only
   * - 0.6-0.8: Balanced precision/recall (recommended for most RAG)
   * - 0.3-0.6: High recall, may include less relevant context
   * - 0.0-0.3: Very permissive, mostly for debugging
   * 
   * Examples:
   * - Basic search: queryDuckDB([0.1, 0.2, 0.3]) // Uses dynamic threshold (0.6)
   * - High precision: queryDuckDB([0.1, 0.2, 0.3], 5, [], {}, 0.8) // Explicit threshold
   * - With keywords: queryDuckDB([0.1, 0.2, 0.3], 10, ['neural', 'network']) // Dynamic: 0.6
   * - With filters: queryDuckDB([0.1, 0.2, 0.3], 10, [], {category: 'research'}) // Dynamic: 0.6
   * - Combined: queryDuckDB([0.1, 0.2, 0.3], 10, ['AI'], {category: 'research'}) // Dynamic: 0.8
   * - Exploratory: queryDuckDB([0.1, 0.2, 0.3], 50) // High volume: Dynamic 0.3
   * 
   * Reference: https://duckdb.org/2024/12/18/duckdb-node-neo-client.html
   */
  async queryDuckDB(
    embedding: number[],
    topK: number = 5,
    keywords: string[] = [],
    filters?: Record<string, unknown>,
    threshold?: number  // Now optional - will be determined dynamically
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

    // Enhanced embedding validation with NaN detection
    if (!embedding || embedding.length === 0) {
      console.error('DuckDBHelper: Invalid embedding - empty or null');
      return { matches: [] };
    }
    
    // Critical: Check for NaN values in embedding array
    const hasNaN = embedding.some(val => !Number.isFinite(val));
    if (hasNaN) {
      console.error('DuckDBHelper: CRITICAL - Embedding contains NaN or infinite values. This will cause SQL errors.');
      console.error('DuckDBHelper: Problematic embedding values:', embedding.filter(val => !Number.isFinite(val)));
      
      // Attempt to clean the embedding by replacing NaN/Infinity with zeros
      const cleanedEmbedding = embedding.map(val => Number.isFinite(val) ? val : 0.0);
      console.warn('DuckDBHelper: Cleaned embedding by replacing non-finite values with 0.0');
      
      // Use cleaned embedding for query
      embedding = cleanedEmbedding;
    }
    
    // Ensure keywords is always an array for robust RAG processing
    const safeKeywords = Array.isArray(keywords) ? keywords : [];
    
    // Determine optimal threshold dynamically
    const optimalThreshold = this.determineOptimalThreshold(safeKeywords, filters, threshold, topK);
    
    console.log(`DuckDBHelper: queryDuckDB called with embedding[${embedding.length}], topK=${topK}, threshold=${optimalThreshold} (${threshold !== undefined ? 'explicit' : 'dynamic'}), keywords=[${safeKeywords.join(', ')}]`);
    
    // Check dataset size for performance warnings
    await this.checkDatasetSize();

    try {
      // DuckDB Neo approach: Build array literal without fixed size to match table definition
      // Reference: https://duckdb.org/docs/stable/clients/node_neo/overview.html
      const arrayLiteral = `[${embedding.join(', ')}]::FLOAT[]`;
      
      // First check if list_cosine_similarity function is available
      const functionCheckSQL = `
        SELECT COUNT(*) as func_exists
        FROM duckdb_functions()
        WHERE function_name = 'list_cosine_similarity';
      `;
      
      const funcCheckResult = await this.connection.runAndReadAll(functionCheckSQL);
      const funcCheckRows = funcCheckResult.getRowObjectsJS();
      const funcExists = funcCheckRows.length > 0 && Number(funcCheckRows[0]?.func_exists) > 0;
      
      if (funcExists) {
        // Build dynamic WHERE clause with filters and keywords using helper method
        const whereClause = this.buildWhereClause(embedding.length, safeKeywords, filters);
        
        // Use list_cosine_similarity with proper array literal syntax and improved filtering
        // Handle cases where cosine similarity might be NULL (e.g., zero vectors)
        const searchSQL = `
          SELECT 
            id,
            COALESCE(list_cosine_similarity(embedding, ${arrayLiteral}), 0.0) AS similarity_score,
            metadata
          FROM vectors
          WHERE ${whereClause}
            AND COALESCE(list_cosine_similarity(embedding, ${arrayLiteral}), 0.0) >= ${optimalThreshold}
          ORDER BY similarity_score DESC
          LIMIT ${topK};
        `;

        console.log(`DuckDBHelper: Executing DuckDB Neo cosine similarity query for ${topK} vectors`);
        if (safeKeywords.length > 0) {
          console.log(`DuckDBHelper: Applying keyword filters: ${safeKeywords.join(', ')}`);
        }
        if (filters && Object.keys(filters).length > 0) {
          console.log(`DuckDBHelper: Applying metadata filters:`, filters);
        }
        
        // Use adaptive query execution with automatic fallback
        const matches = await this.executeAdaptiveQuery(searchSQL, embedding, topK, optimalThreshold);

        console.log(`DuckDBHelper: Found ${matches.length} similar vectors with native cosine similarity`);
        if (matches.length === 0) {
          console.warn(`DuckDBHelper: No matches found for embedding[${embedding.length}] - check if vectors with same dimensions exist`);
          
          // Debug: Check available dimensions in database
          try {
            const dimCheckSQL = `
              SELECT len(embedding) as dimension, COUNT(*) as count 
              FROM vectors 
              WHERE embedding IS NOT NULL 
              GROUP BY len(embedding) 
              ORDER BY count DESC;
            `;
            const dimResult = await this.connection.runAndReadAll(dimCheckSQL);
            const dimRows = dimResult.getRowObjectsJS();
            console.log('DuckDBHelper: Available vector dimensions in database:', dimRows);
          } catch (dimError) {
            console.warn('DuckDBHelper: Could not check dimensions:', dimError);
          }
        } else {
          console.log(`DuckDBHelper: Score range: ${Math.min(...matches.map(m => m.score)).toFixed(4)} - ${Math.max(...matches.map(m => m.score)).toFixed(4)}`);
        }
        return { matches };
      } else {
        // list_cosine_similarity not available, throw error to trigger fallback
        throw new Error('list_cosine_similarity function not available');
      }
    } catch (error) {
      console.error('DuckDBHelper: Failed to find similar vectors with DuckDB Neo:', error);
      
      // Fallback: Try using array_cosine_distance from VSS extension
      try {
        console.log('DuckDBHelper: Trying VSS extension array_cosine_distance as fallback...');
        const arrayLiteral = `[${embedding.join(', ')}]::FLOAT[]`;
        
        // Build dynamic WHERE clause with filters and keywords using helper method
        const whereClause = this.buildWhereClause(embedding.length, safeKeywords, filters);
        
        const vssSQL = `
          SELECT 
            id,
            COALESCE(1.0 - array_cosine_distance(embedding, ${arrayLiteral}), 0.0) AS similarity_score,
            metadata
          FROM vectors
          WHERE ${whereClause}
            AND COALESCE(1.0 - array_cosine_distance(embedding, ${arrayLiteral}), 0.0) >= ${optimalThreshold}
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
          
          // Build dynamic WHERE clause with filters and keywords using helper method
          const whereClause = this.buildWhereClause(embedding.length, safeKeywords, filters);
          
          const basicSQL = `
            SELECT id, metadata, 0.5 as similarity_score
            FROM vectors
            WHERE ${whereClause}
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

  /**
   * Intelligently determine the optimal threshold based on query context
   * Reference: RAG best practices and dynamic threshold patterns
   */
  private determineOptimalThreshold(
    keywords: string[] = [],
    filters?: Record<string, unknown>,
    requestedThreshold?: number,
    topK: number = 5
  ): number {
    // If explicitly requested, respect it
    if (requestedThreshold !== undefined && requestedThreshold >= 0) {
      return requestedThreshold;
    }

    // Critical context search (specific filters + keywords)
    if (keywords.length > 0 && filters && Object.keys(filters).length > 0) {
      console.log('DuckDBHelper: Using CRITICAL_CONTEXT threshold (0.8) - specific search');
      return 0.8;
    }

    // Targeted search (either keywords or filters)
    if (keywords.length > 0 || (filters && Object.keys(filters).length > 0)) {
      console.log('DuckDBHelper: Using RAG_BALANCED threshold (0.6) - targeted search');
      return 0.6;
    }

    // High-volume exploratory search
    if (topK > 20) {
      console.log('DuckDBHelper: Using EXPLORATORY threshold (0.3) - high volume search');
      return 0.3;
    }

    // Default balanced RAG threshold
    console.log('DuckDBHelper: Using RAG_BALANCED threshold (0.6) - default');
    return 0.6;
  }

  /**
   * Execute query with automatic threshold adaptation
   * If not enough results, automatically retry with lower threshold
   */
  private async executeAdaptiveQuery(
    searchSQL: string,
    embedding: number[],
    topK: number,
    originalThreshold: number
  ): Promise<DuckDBMatch[]> {
    const result = await this.connection!.runAndReadAll(searchSQL);
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

    // If we got very few results and threshold is high, try with lower threshold
    const minExpectedResults = Math.min(3, topK);
    if (matches.length < minExpectedResults && originalThreshold > 0.3) {
      const fallbackThreshold = Math.max(0.3, originalThreshold - 0.2);
      console.log(`DuckDBHelper: Got ${matches.length}/${minExpectedResults} results, retrying with fallback threshold ${fallbackThreshold}`);
      
      // Rebuild query with lower threshold
      const arrayLiteral = `[${embedding.join(', ')}]::FLOAT[]`;
      const whereClause = this.buildWhereClause(embedding.length, [], {});
      
      const fallbackSQL = `
        SELECT 
          id,
          COALESCE(list_cosine_similarity(embedding, ${arrayLiteral}), 0.0) AS similarity_score,
          metadata
        FROM vectors
        WHERE ${whereClause}
          AND COALESCE(list_cosine_similarity(embedding, ${arrayLiteral}), 0.0) >= ${fallbackThreshold}
        ORDER BY similarity_score DESC
        LIMIT ${topK};
      `;
      
      const fallbackResult = await this.connection!.runAndReadAll(fallbackSQL);
      const fallbackRows = fallbackResult.getRowObjectsJS();
      
      const fallbackMatches: DuckDBMatch[] = fallbackRows.map((row: any) => ({
        id: row.id as string,
        score: Number(row.similarity_score) || 0,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));
      
      console.log(`DuckDBHelper: Fallback query returned ${fallbackMatches.length} results`);
      return fallbackMatches;
    }

    return matches;
  }
}
