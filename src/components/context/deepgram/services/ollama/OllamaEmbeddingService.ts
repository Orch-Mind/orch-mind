// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// OllamaEmbeddingService.ts
// Implementation of IEmbeddingService using Ollama

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { LoggingUtils } from "../../utils/LoggingUtils";

/**
 * Modelos de embedding suportados pelo Ollama
 * Documentação: https://ollama.ai/library
 */
export const SUPPORTED_OLLAMA_EMBEDDING_MODELS = [
  // Modelos de embedding populares no Ollama
  "bge-m3:latest", // Modelo multilíngue avançado com dense + sparse + multi-vector
  "nomic-embed-text:latest", // Modelo padrão para embeddings de texto
  "mxbai-embed-large:latest", // Modelo de alta qualidade
  "all-minilm:latest", // Modelo compacto e eficiente
  "snowflake-arctic-embed:latest", // Modelo Arctic da Snowflake
];

/**
 * Configurações para o serviço de embeddings do Ollama
 */
export interface OllamaEmbeddingOptions {
  model?: string;
}

export class OllamaEmbeddingService implements IEmbeddingService {
  private ollamaService: IOpenAIService;
  private options: OllamaEmbeddingOptions;

  constructor(ollamaService: IOpenAIService, options?: OllamaEmbeddingOptions) {
    this.ollamaService = ollamaService;
    this.options = options || {};
  }

  /**
   * Obtém o modelo de embeddings configurado ou o padrão
   */
  private getEmbeddingModel(): string {
    // Prioridade: 1. Configuração via construtor, 2. Storage, 3. Padrão (bge-m3:latest)
    const model =
      this.options.model ||
      getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL) ||
      "bge-m3:latest";

    // Log para diagnóstico
    console.log(`[OllamaEmbedding] Using embedding model: ${model}`);

    return model;
  }

  /**
   * Creates an embedding for the provided text using Ollama
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!text?.trim()) {
      return [];
    }

    try {
      // Garantir que o serviço está inicializado
      if (!this.isInitialized()) {
        LoggingUtils.logWarning(
          "[OllamaEmbedding] Service not initialized, attempting to initialize..."
        );
        const initialized = await this.initialize();
        if (!initialized) {
          LoggingUtils.logError(
            "[OllamaEmbedding] Failed to initialize service"
          );
          return [];
        }
      }

      // Delegate to the Ollama service with the selected model
      const model = this.getEmbeddingModel();
      return await this.ollamaService.createEmbedding(text.trim(), model);
    } catch (error) {
      LoggingUtils.logError("Error creating embedding", error);
      return [];
    }
  }

  /**
   * Creates embeddings for a batch of texts using Ollama
   * @param texts Array of texts to create embeddings for
   * @returns Array of embeddings (array of number arrays)
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts?.length) {
      return [];
    }

    try {
      // Garantir que o serviço está inicializado
      if (!this.isInitialized()) {
        LoggingUtils.logWarning(
          "[OllamaEmbedding] Service not initialized, attempting to initialize..."
        );
        const initialized = await this.initialize();
        if (!initialized) {
          LoggingUtils.logError(
            "[OllamaEmbedding] Failed to initialize service"
          );
          return [];
        }
      }

      // Get the selected model
      const model = this.getEmbeddingModel();

      // Check if the Ollama service supports batch embeddings directly
      if (this.ollamaService.createEmbeddings) {
        // Use the batch API if available
        return await this.ollamaService.createEmbeddings(
          texts.map((text) => text.trim()),
          model
        );
      } else {
        // Fallback: process embeddings one by one
        const embeddings = await Promise.all(
          texts.map(async (text) => {
            try {
              return await this.ollamaService.createEmbedding(
                text.trim(),
                model
              );
            } catch (err) {
              LoggingUtils.logError(
                `Error generating embedding for text: ${text.substring(
                  0,
                  50
                )}...`,
                err
              );
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
    return this.ollamaService.isInitialized();
  }

  /**
   * Initializes the embedding service
   */
  async initialize(config?: Record<string, any>): Promise<boolean> {
    if (!this.ollamaService) {
      return false;
    }

    if (this.isInitialized()) {
      return true;
    }

    try {
      // If base URL is provided in config, use it
      if (config?.baseUrl) {
        this.ollamaService.initializeOpenAI(config.baseUrl);
        return this.isInitialized();
      }

      // Otherwise try to load from environment
      await this.ollamaService.loadApiKey();
      return this.isInitialized();
    } catch (error) {
      LoggingUtils.logError("Error initializing embedding service", error);
      return false;
    }
  }
}
