// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { PineconeVector } from '../../interfaces/types';
import { Logger } from '../../utils/logging';
import { ProgressReporter } from '../../utils/progressReporter';

/**
 * Interface for vector storage (abstraction for Pinecone/DuckDB)
 */
interface IVectorHelper {
  deleteAllUserVectors(): Promise<void>;
  saveToPinecone?(vectors: PineconeVector[]): Promise<{ success: boolean; error?: string }>;
  saveToDuckDB?(vectors: PineconeVector[]): Promise<{ success: boolean; error?: string }>;
}

/**
 * Service for storing vectors with abstraction between Pinecone and DuckDB
 */
export class VectorStorageService {
  private vectorHelper: IVectorHelper;
  private progressReporter: ProgressReporter;
  private logger: Logger;
  private isBasicMode: boolean;

  constructor(vectorHelper: IVectorHelper, progressReporter: ProgressReporter, logger?: Logger, isBasicMode?: boolean) {
    this.vectorHelper = vectorHelper;
    this.progressReporter = progressReporter;
    this.logger = logger || new Logger('[VectorStorageService]');
    this.isBasicMode = isBasicMode || false;
  }

  /**
   * Clears all existing data in overwrite mode
   */
  public async deleteExistingData(): Promise<void> {
    this.logger.info('OVERWRITE mode selected, clearing ALL existing primary user data...');
    
    if (this.vectorHelper.deleteAllUserVectors) {
      await this.vectorHelper.deleteAllUserVectors();
      this.logger.success('All existing primary user data cleared successfully in OVERWRITE mode');
    } else {
      this.logger.warn('deleteAllUserVectors method not available in vectorHelper');
    }
  }

  /**
   * Saves vectors using the appropriate storage service (Pinecone or DuckDB)
   */
  public async saveVectors(vectors: PineconeVector[]): Promise<{ success: boolean; error?: string }> {
    if (!vectors || vectors.length === 0) {
      this.logger.warn('No vectors to save');
      return { success: true };
    }

    const storageType = this.isBasicMode ? 'DuckDB' : 'Pinecone';
    this.logger.info(`Saving ${vectors.length} vectors to ${storageType}`);
    
    try {
      // Divide vectors into batches for better visual feedback and performance
      const BATCH_SIZE = 500; // Ideal batch size for both services
      const batches: PineconeVector[][] = [];
      
      // Divide into batches
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        batches.push(vectors.slice(i, i + BATCH_SIZE));
      }
      
      this.logger.info(`Saving ${vectors.length} vectors in ${batches.length} batches of up to ${BATCH_SIZE} vectors to ${storageType}`);
      
      let success = true;
      let error = '';
      let totalProcessed = 0;
      
      // Save by batches for better progress feedback
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.info(`Processing batch ${i+1}/${batches.length} with ${batch.length} vectors`);
        
        try {
          let batchResult: { success: boolean; error?: string };
          
          if (this.isBasicMode) {
            // Use DuckDB for basic mode
            if (this.vectorHelper.saveToDuckDB) {
              batchResult = await this.vectorHelper.saveToDuckDB(batch);
            } else {
              throw new Error('DuckDB save method not available');
            }
          } else {
            // Use Pinecone for advanced mode
            if (this.vectorHelper.saveToPinecone) {
              batchResult = await this.vectorHelper.saveToPinecone(batch);
            } else {
              throw new Error('Pinecone save method not available');
            }
          }
          
          if (!batchResult.success) {
            success = false;
            error = batchResult.error || 'Unknown error in batch ' + (i+1);
            this.logger.error(`Error in batch ${i+1}: ${error}`);
          }
          
          // Update progress
          totalProcessed += batch.length;
          this.progressReporter.updateProgress('saving', totalProcessed, vectors.length);
          
        } catch (batchError) {
          success = false;
          error = batchError instanceof Error ? batchError.message : 'Unknown error';
          this.logger.error(`Error in batch ${i+1}:`, batchError);
        }
        
        // Small pause to avoid overloading storage service
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Result final
      if (success) {
        this.logger.success(`Save operation completed successfully using ${storageType}!`);
      } else {
        this.logger.error(`Error in saving to ${storageType}: ${error}`);
      }
      
      return { success, error: error || undefined };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error saving vectors to ${storageType}:`, error);
      return { success: false, error: errorMsg };
    }
  }
}
