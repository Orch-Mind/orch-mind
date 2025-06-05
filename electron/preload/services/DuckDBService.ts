// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * DuckDB Neural Database Service - Electron Compatible
 * 
 * Implementation following DuckDB-WASM official documentation for Electron
 * @see https://duckdb.org/docs/stable/clients/wasm/instantiation.html
 */

import { ErrorHandler } from '../utils/ErrorHandler';
import { Logger } from '../utils/Logger';

// DuckDB-WASM types matching the actual library interface
interface NormalizedMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class DuckDBService {
  private static instance: DuckDBService | null = null;
  private logger: Logger;
  private db: any = null;
  private connection: any = null;
  private isInitialized = false;

  private constructor(logger: Logger, errorHandler: ErrorHandler) {
    this.logger = logger.createChild('DuckDB');
  }

  static getInstance(logger?: Logger, errorHandler?: ErrorHandler): DuckDBService {
    if (!DuckDBService.instance) {
      if (!logger || !errorHandler) {
        throw new Error('Logger and ErrorHandler required for first instance creation');
      }
      DuckDBService.instance = new DuckDBService(logger, errorHandler);
    }
    return DuckDBService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // DuckDB WASM is not recommended for Electron applications
    // This service is deprecated - use DuckDBHelper in main process instead
    this.logger.warn('DuckDBService: Deprecated for Electron - use main process DuckDBHelper instead');
    
    // Mark as "initialized" but non-functional to prevent loops
    this.isInitialized = false;
    
    // Return early without throwing to allow graceful fallback
    return;
  }

  async duckdbCommand(command: string, data: any): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // If still not initialized, return safe defaults
    if (!this.isInitialized) {
      return this.getFallbackResponse(command);
    }

    switch (command) {
      case 'query':
        return this.handleQuery(data);
      case 'save':
        return this.handleSave(data);
      case 'count':
        return this.handleCount();
      case 'debug':
        return this.handleDebug();
      case 'close':
        return this.handleClose();
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  private getFallbackResponse(command: string): any {
    switch (command) {
      case 'query':
        return { matches: [] };
      case 'save':
        return { success: false, error: 'Database not available' };
      case 'count':
        return { count: 0 };
      case 'debug':
        return { initialized: false, fallback: true };
      case 'close':
        return { success: true };
      default:
        return { error: 'Command not available in fallback mode' };
    }
  }

  private async handleQuery(params: any): Promise<{ matches: NormalizedMatch[] }> {
    if (!this.connection) {
      return { matches: [] };
    }

    try {
      const { embedding, topK = 5, namespace = 'default', keywords = [] } = params;
      
      if (!embedding || !Array.isArray(embedding)) {
        return { matches: [] };
      }

      // Store embedding as JSON string for Electron compatibility
      const embeddingStr = JSON.stringify(embedding);
      
      let sql = `
        SELECT 
          id, 
          metadata,
          1.0 as score
        FROM embeddings 
        WHERE namespace = ?
      `;
      
      const queryParams = [namespace];
      
      // Add keyword filtering if provided
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(() => 
          "metadata LIKE ?"
        ).join(' OR ');
        sql += ` AND (${keywordConditions})`;
        keywords.forEach((keyword: string) => queryParams.push(`%${keyword}%`));
      }
      
      sql += ` LIMIT ?`;
      queryParams.push(topK);
      
      // Use simple query for Electron compatibility
      const results = await this.connection.query(sql, queryParams);

      const matches = results.map((row: any) => ({
        id: row.id,
        score: Number(row.score) || 0,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));

      this.logger.info(`Query returned ${matches.length} matches`);
      return { matches };
    } catch (error) {
      this.logger.error('Query failed', error);
      return { matches: [] };
    }
  }

  private async handleSave(params: any): Promise<{ success: boolean; error?: string }> {
    if (!this.connection) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const { vectors, namespace = 'default' } = params;
      
      if (!Array.isArray(vectors) || vectors.length === 0) {
        return { success: false, error: 'No vectors provided' };
      }

      // Use simple insert approach for Electron compatibility
      for (const vector of vectors) {
        if (!vector.id || !vector.values || !Array.isArray(vector.values)) {
          continue;
        }
        
        const embeddingStr = JSON.stringify(vector.values);
        const metadataStr = JSON.stringify(vector.metadata || {});
        
        await this.connection.query(`
          INSERT OR REPLACE INTO embeddings (id, namespace, embedding, metadata)
          VALUES (?, ?, ?, ?)
        `, [vector.id, namespace, embeddingStr, metadataStr]);
      }
      
      this.logger.info(`Saved ${vectors.length} vectors successfully`);
      return { success: true };
    } catch (error) {
      this.logger.error('Save failed', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  private async handleCount(): Promise<{ count: number }> {
    if (!this.connection) {
      return { count: 0 };
    }

    try {
      const results = await this.connection.query(
        'SELECT COUNT(*) as count FROM embeddings'
      );
      return { count: Number(results[0]?.count) || 0 };
    } catch (error) {
      this.logger.error('Count query failed', error);
      return { count: 0 };
    }
  }

  private handleDebug(): any {
    return {
      initialized: this.isInitialized,
      hasConnection: !!this.connection,
      hasDatabase: !!this.db,
      crossOriginIsolated: crossOriginIsolated,
      version: 'DuckDB-WASM-Electron',
      environment: 'electron'
    };
  }

  private async handleClose(): Promise<{ success: boolean }> {
    try {
      await this.terminate();
      return { success: true };
    } catch (error) {
      this.logger.error('Close failed', error);
      return { success: false };
    }
  }

  async terminate(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      if (this.db) {
        await this.db.terminate();
        this.db = null;
      }
      this.isInitialized = false;
      this.logger.info('DuckDB connection terminated');
    } catch (error) {
      this.logger.warn('Error during termination', error);
    }
  }
}