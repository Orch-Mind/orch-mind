// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OpenAIEmbeddingService.ts
// Implementation of IEmbeddingService using OpenAI

import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { getOption, STORAGE_KEYS } from "../../../../../services/StorageService";

/**
 * Modelos de embedding suportados pela OpenAI
 * Documentação: https://platform.openai.com/docs/guides/embeddings
 */
export const SUPPORTED_OPENAI_EMBEDDING_MODELS = [
  // Modelos de terceira geração (text-embedding-3)
  'text-embedding-3-small',  // 1536 dimensões, menor custo, melhor equilíbrio custo/performance
  'text-embedding-3-large',  // 3072 dimensões, máxima qualidade, performance superior
  
  // Modelo legado (mantido para compatibilidade)
  'text-embedding-ada-002',   // 1536 dimensões, modelo anterior
];

/**
 * Configurações para o serviço de embeddings da OpenAI
 */
export interface OpenAIEmbeddingOptions {
  model?: string;
}

export class OpenAIEmbeddingService implements IEmbeddingService {
  private openAIService: IOpenAIService;
  private options: OpenAIEmbeddingOptions;
  
  constructor(openAIService: IOpenAIService, options?: OpenAIEmbeddingOptions) {
    this.openAIService = openAIService;
    this.options = options || {};
  }
  
  /**
   * Obtém o modelo de embeddings configurado ou o padrão
   */
  private getEmbeddingModel(): string {
    // Prioridade: 1. Configuração via construtor, 2. Storage, 3. Padrão (text-embedding-3-large)
    return this.options.model || 
           getOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL) || 
           'text-embedding-3-large';
  }
  
  /**
   * Creates an embedding for the provided text using OpenAI
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!text?.trim()) {
      return [];
    }
    
    try {
      // Delegate to the OpenAI service with the selected model
      const model = this.getEmbeddingModel();
      return await this.openAIService.createEmbedding(text.trim(), model);
    } catch (error) {
      LoggingUtils.logError("Error creating embedding", error);
      return [];
    }
  }
  
  /**
   * Creates embeddings for a batch of texts using OpenAI
   * @param texts Array of texts to create embeddings for
   * @returns Array of embeddings (array of number arrays)
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts?.length) {
      return [];
    }
    
    try {
      // Get the selected model
      const model = this.getEmbeddingModel();
      
      // Check if the OpenAI service supports batch embeddings directly
      if (this.openAIService.createEmbeddings) {
        // Use the batch API if available
        return await this.openAIService.createEmbeddings(texts.map(text => text.trim()), model);
      } else {
        // Fallback: process embeddings one by one
        const embeddings = await Promise.all(
          texts.map(async (text) => {
            try {
              return await this.openAIService.createEmbedding(text.trim(), model);
            } catch (err) {
              LoggingUtils.logError(`Error generating embedding for text: ${text.substring(0, 50)}...`, err);
              return []; // Return empty array on error
            }
          })
        );
        
        return embeddings;
      }
    } catch (error) {
      LoggingUtils.logError("Error creating batch embeddings", error);
      return [];
    }
  }
  
  /**
   * Checks if the embedding service is initialized
   */
  isInitialized(): boolean {
    return this.openAIService.isInitialized();
  }
  
  /**
   * Initializes the embedding service
   */
  async initialize(config?: Record<string, any>): Promise<boolean> {
    if (!this.openAIService) {
      return false;
    }
    
    if (this.isInitialized()) {
      return true;
    }
    
    try {
      // If API key is provided in config, use it
      if (config?.apiKey) {
        this.openAIService.initializeOpenAI(config.apiKey);
        return this.isInitialized();
      }
      
      // Otherwise try to load from environment
      await this.openAIService.loadApiKey();
      return this.isInitialized();
    } catch (error) {
      LoggingUtils.logError("Error initializing embedding service", error);
      return false;
    }
  }
} 