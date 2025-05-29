// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { Pinecone } from "@pinecone-database/pinecone";
import { normalizeNamespace } from "../src/components/context/deepgram/services/memory/utils/namespace";
import { getPrimaryUser } from "../src/config/UserConfig";
import { STORAGE_KEYS } from "../src/services/StorageService";

/**
 * Pinecone metadata interface
 */
export interface PineconeMetadata {
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
 * Normalized Pinecone match interface
 */
export interface NormalizedPineconeMatch {
  id?: string;
  score?: number;
  values?: number[];
  sparseValues?: unknown;
  metadata: PineconeMetadata;
  [key: string]: unknown;
}

/**
 * Pinecone fetch response interface
 * Supports both old and new API
 */
export interface PineconeFetchResponse {
  vectors?: Record<string, unknown>;
  records?: Record<string, unknown>;
  namespace?: string;
  [key: string]: unknown;
}

/**
 * Helper class for Pinecone operations in the main process.
 * This prevents browser-side usage of the Pinecone SDK which is not recommended.
 */
export class PineconeHelper {
  private pinecone: Pinecone | null = null;
  private indexName: string = process.env.PINECONE_INDEX_NAME || "chat-index";
  private indexHost: string = process.env.PINECONE_HOST || "";
  private isInitialized: boolean = false;
  private namespace: string = normalizeNamespace(getPrimaryUser());

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the Pinecone client with API key from environment variables
   */
  private async initialize() {
    try {
      // Step 1: Try to get API key from environment
      let apiKey = process.env.PINECONE_API_KEY;
      // Step 2: If not found, try to get from user storage (electron-store)
      if (!apiKey) {
        try {
          // Dynamically import StorageService to avoid circular dependency
          const { getOption } = require('../src/services/StorageService');
          apiKey = getOption(STORAGE_KEYS.PINECONE_API_KEY);
          if (apiKey) {
            console.info('[PINECONE] Loaded API key from user storage (fallback)');
          }
        } catch (storageErr) {
          console.warn('[PINECONE] Could not load API key from storage:', storageErr);
        }
      }
      if (!apiKey) {
        console.warn("Pinecone API key not found in environment or user settings");
        return;
      }
      if (!this.indexHost) {
        throw new Error("Pinecone: defina PINECONE_HOST no .env");
      }
      this.pinecone = new Pinecone({ apiKey });
      this.isInitialized = true;
      console.log("✅ Pinecone initialized with host:", this.indexHost);
    } catch (error) {
      console.error("❌ Failed to initialize Pinecone:", error);
      this.pinecone = null;
      this.isInitialized = false;
    }
  }

  /**
   * Query Pinecone for vectors similar to the provided embedding
   */
  async queryPinecone(
    embedding: number[],
    topK: number = 5,
    keywords: string[] = [],
    filters?: Record<string, unknown>
  ): Promise<{ matches: NormalizedPineconeMatch[] }> {
    if (!this.pinecone || !this.isInitialized) {
      await this.initialize();
      if (!this.pinecone || !this.isInitialized) {
        console.error("Pinecone not initialized, cannot query");
        return { matches: [] };
      }
    }

    try {
      // Get the index and target the namespace
      const index = this.pinecone.index(this.indexName, this.indexHost).namespace(this.namespace);
      
      // Merge filters and keywords
      let mergedFilter: Record<string, unknown> = {};
      if (filters && typeof filters === 'object') {
        mergedFilter = { ...filters };
      }
      if (keywords && keywords.length > 0) {
        mergedFilter.keywords = { $in: keywords };
      }
      const filterToUse = Object.keys(mergedFilter).length > 0 ? mergedFilter : undefined;
      console.log('[PINECONE][QUERY] Using filter:', JSON.stringify(filterToUse));
      
      // Execute the query on the targeted namespace
      const queryResponse = await index.query({
        vector: embedding,
        topK,
        filter: filterToUse,
        includeMetadata: true
      });

      const normalizedMatches = (queryResponse.matches || []).map(match => {
        const normalizedMatch = { ...match } as NormalizedPineconeMatch;
        
        if (!normalizedMatch.metadata) {
          console.warn("[PINECONE][SANITIZE] Match without metadata found, normalizing for cognitive memory consistency...");
          normalizedMatch.metadata = { content: "" };
        } 
        
        else if (typeof normalizedMatch.metadata.content === 'undefined') {
          console.warn("[PINECONE][SANITIZE] Match without content found, normalizing for cognitive memory consistency...");
          normalizedMatch.metadata.content = "";
        }
        
        return normalizedMatch;
      });
      
      return { matches: normalizedMatches };
    } catch (error) {
      console.error("Error querying Pinecone:", error);
      return { matches: [] };
    }
  }

  /**
   * Save vectors to Pinecone with support for small batches
   * to avoid request size exceeded errors.
   * This operation is critical for persisting artificial brain memories in a scalable way.
   */
  async saveToPinecone(vectors: Array<{ id: string, values: number[], metadata: Record<string, string | number | boolean | string[]> }>): Promise<{ success: boolean; error?: string }> {
    console.log('[PINECONE][COGNITIVE-MEMORY] saveToPinecone called! Vectors received for brain memory:', vectors.length);
    if (!this.pinecone || !this.isInitialized) {
      await this.initialize();
      if (!this.pinecone || !this.isInitialized) {
        console.error("Pinecone not initialized, cannot save vectors");
        return { success: false, error: "Pinecone not initialized" };
      }
    }

    try {
      // Get the index and target the namespace
      const index = this.pinecone.index(this.indexName, this.indexHost).namespace(this.namespace);
      
      // Sanitize metadata before upsert
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
            // Remove invalid messageId field to ensure brain memory consistency
            delete meta.messageId;
            console.warn('[PINECONE][SANITIZE] Removing invalid messageId from vector for memory integrity:', val, 'in vector', v.id);
          }
        }
        // Reduce log verbosity - only log a sample for cognitive memory debugging
        if (Math.random() < 0.05) { // 5% de chance apenas
          console.log('[PINECONE][SANITIZE] Metadata final para vetor', v.id, ':', meta);
        }
        return { ...v, metadata: meta };
      });

      console.log(`[PINECONE] Connecting to index ${this.indexName} at host ${this.indexHost} for namespace ${this.namespace}`);
      
      // Split into mini-batches to avoid maximum size error
      // Pinecone has a 2MB limit per request and recommends up to 100 vectors per batch
      const MINI_BATCH_SIZE = 100; // Value recommended by Pinecone official documentation
      const miniBatches = [];
      
      for (let i = 0; i < sanitizedVectors.length; i += MINI_BATCH_SIZE) {
        miniBatches.push(sanitizedVectors.slice(i, i + MINI_BATCH_SIZE));
      }
      
      console.log(`[PINECONE] Dividing ${sanitizedVectors.length} vectors into ${miniBatches.length} mini-batches of up to ${MINI_BATCH_SIZE} vectors`);
      
      // Process each mini-batch separately
      let allSuccess = true;
      let lastError = "";
      
      for (let i = 0; i < miniBatches.length; i++) {
        const batch = miniBatches[i];
        console.log(`[PINECONE] Processing mini-batch ${i+1}/${miniBatches.length} with ${batch.length} vectors`);
        
        try {
          await index.upsert(batch);
          console.log(`[PINECONE] Mini-batch ${i+1}/${miniBatches.length} saved successfully!`);
        } catch (batchError) {
          console.error(`[PINECONE] Error saving mini-batch ${i+1}/${miniBatches.length}:`, batchError);
          allSuccess = false;
          if (batchError instanceof Error) {
            lastError = batchError.message;
          } else {
            lastError = "Unknown error saving mini-batch";
          }
        }
        
        // Small pause between batches to avoid overloading the API
        if (i < miniBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (allSuccess) {
        console.log('[PINECONE] All mini-batches saved successfully! Total:', sanitizedVectors.length);
        return { success: true };
      } else {
        console.error('[PINECONE] Some mini-batches failed during saving. Last error:', lastError);
        return { success: false, error: lastError };
      }
    } catch (error) {
      console.error("Error saving to Pinecone:", error);
      let errorMsg = "Unknown error";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      return { success: false, error: errorMsg };
    }
  }



  async checkExistingIds(idsToCheck: string[], onProgress?: (processed: number, total: number) => void): Promise<string[]> {
    // Define the namespace using getPrimaryUser
    this.namespace = normalizeNamespace(getPrimaryUser());
    if (!this.pinecone || !this.isInitialized) {
      await this.initialize();
      if (!this.pinecone || !this.isInitialized) {
        console.error("Pinecone not initialized, cannot check existing IDs");
        return [];
      }
    }
    
    // If there are no IDs to check, return an empty list
    if (!idsToCheck || idsToCheck.length === 0) {
      return [];
    }
    
    try {

      // Reduce batch size to avoid URI too large errors
      // Pinecone may have issues with very large URIs when too many IDs are sent
      const batchSize = 50; // Smaller batch size to avoid error 414 (URI Too Large)
      const existingIds: string[] = [];
      
      console.log(`[PINECONE] Verifying ${idsToCheck.length} IDs in Pinecone`);
      
      // Process in smaller batches to avoid overloading the API
      for (let i = 0; i < idsToCheck.length; i += batchSize) {
        const idsBatch = idsToCheck.slice(i, i + batchSize);
        
        // Use Pinecone index to check existing IDs
        const index = this.pinecone.index(this.indexName, this.indexHost).namespace(this.namespace);
        
        try {
          // Split into much smaller batches if necessary
          // It is recommended to fetch a few IDs at a time to avoid very large URLs
          console.log(`[PINECONE] Processing batch ${i / batchSize + 1} of ${Math.ceil(idsToCheck.length / batchSize)} (${idsBatch.length} IDs)`);
          
          // Update progress
          if (onProgress) {
            onProgress(Math.min(i + batchSize, idsToCheck.length), idsToCheck.length);
          }
          
          // For larger batches, divide into sub-batches to process
          // This avoids very large URLs that result in error 414 (URI Too Large)
          const subBatchSize = 10;
          const subBatchExistingIds: string[] = [];
          
          for (let j = 0; j < idsBatch.length; j += subBatchSize) {
            const subBatch = idsBatch.slice(j, j + subBatchSize);
            
            try {
              const response = await index.fetch(subBatch);

              // Na API Pinecone mais recente, a resposta vem em 'records' ou diretamente no objeto
              const typedResponse = response as PineconeFetchResponse;

              const vectors = typedResponse.vectors || typedResponse.records || {};
              if (vectors && Object.keys(vectors).length > 0) {
                const foundIds = Object.keys(vectors);
                console.log(`[PINECONE] ✅ Found ${foundIds.length} existing IDs in this sub-batch:`, foundIds);
                subBatchExistingIds.push(...foundIds);
              } else {
                console.log(`[PINECONE] ❌ No IDs found in this sub-batch`);
              }
            } catch (subError) {
              console.warn(`[PINECONE] Error fetching ID sub-batch (${j} to ${j + subBatchSize}):`, subError);
              // Continue with the next sub-batch, even if there is an error
            }
          }
          
          existingIds.push(...subBatchExistingIds);
        } catch (fetchError) {
          console.warn(`[PINECONE] Error processing ID batch (${i} to ${i + batchSize}):`, fetchError);
          // Continue with the next batch, even if there is an error
        }
      }
      
      
      console.log(`[PINECONE] Found ${existingIds.length} existing IDs of ${idsToCheck.length} checked`);
      console.log('[PINECONE][DEBUG] === END checkExistingIds ===');
      return existingIds;
    } catch (error) {
      console.error("[PINECONE] Error checking existing IDs:", error);
      return [];
    }
  }


  /**
   * Deletes all user vectors in Pinecone
   */
  async deleteAllUserVectors(): Promise<void> {
    if (!this.pinecone || !this.isInitialized) {
      await this.initialize();
      if (!this.pinecone || !this.isInitialized) {
        console.error("Pinecone not initialized, cannot delete user vectors");
        return;
      }
    }
    try {

      
      // Get the index and target the namespace
      const index = this.pinecone.index(this.indexName, this.indexHost).namespace(this.namespace);
      // Delete all vectors in the namespace
      await index.deleteAll();
      console.log(`Deleted all vectors in namespace ${this.namespace}`);
    } catch (error) {
      console.error("Error deleting user vectors from Pinecone:", error);
    }
  }
} 