// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceEmbeddingService.ts
// Symbolic cortex: Provides local embeddings generation using HuggingFace models.
// Generates vector embeddings for Orch-OS in basic mode, without requiring cloud APIs.

import { pipeline } from "@huggingface/transformers";
import { MessageChunk, PineconeVector } from "../../electron/chatgpt-import/interfaces/types";
import { Logger } from "../../electron/chatgpt-import/utils/logging";
import { ProgressReporter } from "../../electron/chatgpt-import/utils/progressReporter";
import { STORAGE_KEYS } from "../StorageService";

/**
 * Symbolic: Supported browser models for feature-extraction/embeddings
 * Orch-OS supports the following models for local embedding generation
 * Apenas modelos verdadeiramente multilíngues com suporte a português e outras línguas
 */
export const SUPPORTED_HF_EMBEDDING_MODELS = [
  // ===== MODELOS MULTILÍNGUES PREMIUM (100+ idiomas) =====
  // Suporte avançado a português, espanhol, inglês e outros idiomas
  'Xenova/multilingual-e5-small',   // 384-dimensional, leve (~106MB), ideal para browsers
  'Xenova/multilingual-e5-base',    // 768-dimensional, melhor qualidade (~278MB)
  'Xenova/bge-small-m3',            // 1024-dimensional, excelente qualidade multilíngue (~165MB)
  'Xenova/bge-base-m3',             // 1024-dimensional, qualidade superior (~280MB)
  'intfloat/multilingual-e5-large', // 1024-dimensional, máxima qualidade multilíngue (~560MB)
  
  // ===== MODELOS LEVES COM BOM SUPORTE MULTILÍNGUE =====
  // Equilibram tamanho e performance para ambientes com recursos limitados
  'Xenova/all-MiniLM-L6-v2',        // 384-dimensional, extremamente leve (~33MB), suporte a +50 idiomas
  'Xenova/paraphrase-multilingual-MiniLM-L12-v2', // 384-dimensional, bom para detecção semântica (~120MB)
  'Xenova/all-mpnet-base-v2',       // 768-dimensional, bom equilíbrio tamanho/qualidade (~438MB)
];

/**
 * HuggingFace Embedding Service Options
 */
export type HuggingFaceEmbeddingOptions = {
  model?: string;
  device?: "cpu" | "webgpu";
  dtype?: "fp32" | "q8" | "q4";
};

/**
 * Service for generating embeddings using HuggingFace models locally in the browser
 * Symbolic: Neural vector encoder for symbolic memory system without external dependency
 * Usado no modo básico do Orch-OS para geração local de embeddings sem dependências externas
 */
export class HuggingFaceEmbeddingService {
  // Using 'any' to avoid TypeScript complexity with pipeline() typing
  private embeddingGenerator: any = null;
  private currentModel: string | null = null;
  private embeddingDimension: number = 384; // Default dimension for most embedding models
  private readonly logger: Logger;
  private progressReporter?: ProgressReporter;

  constructor(
    logger?: Logger,
    progressReporter?: ProgressReporter
  ) {
    this.logger = logger || new Logger('[HuggingFaceEmbeddingService]');
    this.progressReporter = progressReporter;
  }
  
  /**
   * Gets the default model ID to use for embeddings
   * Prioriza modelos multilíngues para melhor suporte a diversos idiomas
   * @returns ID do modelo HuggingFace a ser usado como padrão
   */
  private getDefaultModelId(storedModel?: string): string {
    // Verifica se há um modelo salvo nas configurações do usuário
    if (storedModel && SUPPORTED_HF_EMBEDDING_MODELS.includes(storedModel)) {
      return storedModel;
    }
    
    // Se não houver modelo definido pelo usuário, usa o primeiro modelo da lista
    // A lista já está organizada com modelos multilíngues no topo para priorização
    return SUPPORTED_HF_EMBEDDING_MODELS[0];
  }

  /**
   * Loads a supported embedding model for local inference with auto device/dtype fallback.
   * Symbolic: Tries WebGPU + quantized (q4), depois q8, depois fp32, depois CPU.
   * Maximizes browser compatibility and performance for Orch-OS.
   * 
   * @param modelId - ID do modelo HuggingFace a ser carregado, ou modelo padrão se não especificado
   */
  /**
   * Loads a supported embedding model for local inference with auto device/dtype fallback.
   * Symbolic: Tries WebGPU + quantized (q4), depois q8, depois fp32, depois CPU.
   * Maximizes browser compatibility and performance for Orch-OS.
   * 
   * @param modelId - ID do modelo HuggingFace a ser carregado, ou modelo padrão se não especificado
   */
  async loadModel(modelId: string = this.getDefaultModelId()): Promise<void> {
    if (this.currentModel === modelId && this.embeddingGenerator) return;
    
    // Determina a dimensionalidade do embedding com base no modelo carregado
    // Diferentes modelos multilíngues produzem embeddings de diferentes tamanhos
    if (
      modelId.includes('bge-m3') || 
      modelId.includes('multilingual-e5-large')
    ) {
      this.embeddingDimension = 1024; // Modelos multilíngues premium têm 1024 dimensões
    } else if (
      modelId.includes('mpnet') || 
      modelId.includes('bge-base') ||
      (modelId.includes('multilingual-e5') && modelId.includes('base'))
    ) {
      this.embeddingDimension = 768; // Modelos base geralmente têm 768 dimensões
    } else {
      this.embeddingDimension = 384; // Default para modelos small e MiniLM (384 dimensões)
    }
    
    this.logger.debug(`Embedding dimensionality set to ${this.embeddingDimension} for model ${modelId}`);
    
    let lastError: any = null;
    
    // Try WebGPU + q4
    try {
      this.logger.info(`Loading embedding model ${modelId} with WebGPU + q4...`);
      this.embeddingGenerator = await pipeline("feature-extraction", modelId, { device: "webgpu", dtype: "q4" });
      this.currentModel = modelId;
      this.logger.success(`Successfully loaded ${modelId} with WebGPU + q4`);
      return;
    } catch (e) { lastError = e; }
    
    // Try WebGPU + q8
    try {
      this.logger.info(`Loading embedding model ${modelId} with WebGPU + q8...`);
      this.embeddingGenerator = await pipeline("feature-extraction", modelId, { device: "webgpu", dtype: "q8" });
      this.currentModel = modelId;
      this.logger.success(`Successfully loaded ${modelId} with WebGPU + q8`);
      return;
    } catch (e) { lastError = e; }
    
    // Try WebGPU + fp32
    try {
      this.logger.info(`Loading embedding model ${modelId} with WebGPU + fp32...`);
      this.embeddingGenerator = await pipeline("feature-extraction", modelId, { device: "webgpu", dtype: "fp32" });
      this.currentModel = modelId;
      this.logger.success(`Successfully loaded ${modelId} with WebGPU + fp32`);
      return;
    } catch (e) { lastError = e; }
    
    // Fallback: CPU + q4
    try {
      this.logger.info(`Loading embedding model ${modelId} with CPU + q4...`);
      this.embeddingGenerator = await pipeline("feature-extraction", modelId, { device: "cpu", dtype: "q4" });
      this.currentModel = modelId;
      this.logger.success(`Successfully loaded ${modelId} with CPU + q4`);
      return;
    } catch (e) { lastError = e; }
    
    // Fallback: CPU + q8
    try {
      this.logger.info(`Loading embedding model ${modelId} with CPU + q8...`);
      this.embeddingGenerator = await pipeline("feature-extraction", modelId, { device: "cpu", dtype: "q8" });
      this.currentModel = modelId;
      this.logger.success(`Successfully loaded ${modelId} with CPU + q8`);
      return;
    } catch (e) { lastError = e; }
    
    // Fallback: CPU + fp32
    try {
      this.logger.info(`Loading embedding model ${modelId} with CPU + fp32...`);
      this.embeddingGenerator = await pipeline("feature-extraction", modelId, { device: "cpu", dtype: "fp32" });
      this.currentModel = modelId;
      this.logger.success(`Successfully loaded ${modelId} with CPU + fp32`);
      return;
    } catch (e) { lastError = e; }
    
    // If all attempts fail, throw last error
    throw new Error(`Failed to load embedding model ${modelId} on any supported device/dtype. Last error: ${lastError}`);
  }

  /**
   * Verifies if the service is initialized with a model
   */
  isInitialized(): boolean {
    return this.embeddingGenerator !== null;
  }

  /**
   * Ensures a model is loaded before generating embeddings
   */
  async ensureModelLoaded(options?: HuggingFaceEmbeddingOptions): Promise<boolean> {
    if (this.isInitialized()) return true;
    
    try {
      // Obtém o modelo das configurações do usuário ou usa o modelo padrão (multilíngue)
      let storedModel: string | undefined;
      try {
        // Usa localStorage com segurança, que pode não estar disponível em alguns ambientes
        storedModel = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.HF_EMBEDDING_MODEL) || undefined : undefined;
      } catch (e) {
        // Ignora erros de localStorage não disponível
        this.logger.debug('Não foi possível acessar localStorage para HF_EMBEDDING_MODEL');
      }
      const modelId = options?.model || this.getDefaultModelId(storedModel);
      await this.loadModel(modelId);
      return true;
    } catch (error) {
      this.logger.error('Failed to load embedding model:', error);
      return false;
    }
  }

  /**
   * Creates an embedding for a single text
   * @param text The text to create an embedding for
   */
  async createEmbedding(text: string): Promise<number[]> {
    await this.ensureModelLoaded();
    
    if (!this.embeddingGenerator) {
      throw new Error("Embedding model not loaded");
    }
    
    try {
      // Call the feature extraction pipeline
      const result = await this.embeddingGenerator(text, { 
        pooling: "mean", // Use mean pooling for sentence embeddings
        normalize: true  // Normalize the embeddings
      });
      
      // Convert to standard array format that matches OpenAI's embedding format
      // The embedding should be a flat array of numbers
      
      // Verificar se tolist está disponível (método recomendado pela documentação)
      if (typeof result.tolist === 'function') {
        // tolist() retorna um array aninhado, pegamos o primeiro elemento
        // e fazemos a conversão explícita para number[]
        return result.tolist()[0].map((val: unknown) => Number(val));
      } else {
        // Fallback para método alternativo se tolist não estiver disponível
        return Array.from(result.data).map(val => Number(val));
      }
    } catch (error) {
      this.logger.error(`Error generating embedding for text: ${text.substring(0, 50)}...`, error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates embeddings for multiple texts in batch
   * @param texts Array of texts to create embeddings for
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    await this.ensureModelLoaded();
    
    if (!this.embeddingGenerator) {
      throw new Error("Embedding model not loaded");
    }
    
    try {
      // Process texts in small batches to avoid memory issues
      const batchSize = 10;
      const results: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        this.logger.info(`Processing batch ${i/batchSize + 1}/${Math.ceil(texts.length/batchSize)}`);
        
        // Process each text in the batch
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            const result = await this.embeddingGenerator(text, {
              pooling: "mean",
              normalize: true
            });
            
            // Verificar se tolist está disponível (método recomendado pela documentação)
            if (typeof result.tolist === 'function') {
              return result.tolist()[0].map((val: unknown) => Number(val));
            } else {
              return Array.from(result.data).map(val => Number(val));
            }
          })
        );
        
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Error generating batch embeddings:`, error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates embeddings for text chunks - compatible with the EmbeddingService interface
   */
  public async generateEmbeddingsForChunks(
    batches: MessageChunk[][], 
    allMessageChunks: MessageChunk[]
  ): Promise<PineconeVector[]> {
    // Start the progress of generating embeddings
    if (this.progressReporter) {
      this.progressReporter.startStage('generating_embeddings', allMessageChunks.length);
    }
    
    // Verify if we have the model available
    const modelInitialized = await this.ensureModelLoaded();
    this.logger.info(`Status of embedding model: ${modelInitialized ? 'Initialized' : 'Not initialized'}`);
    
    if (!modelInitialized) {
      throw new Error('Embedding model not initialized. Check browser compatibility and try again.');
    }

    const vectors: PineconeVector[] = [];
    let embeddingsProcessed = 0;
    let processedTotal = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.logger.info(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} messages`);
      
      // Prepare the texts for the current batch
      const batchTexts = batch.map(chunk => chunk.content);
      
      // Generate embeddings for the entire batch
      let batchEmbeddings: number[][] = [];
      
      try {
        batchEmbeddings = await this.createEmbeddings(batchTexts);
        this.logger.success(`Embeddings generated successfully for batch ${batchIndex + 1}/${batches.length}`);
      } catch (batchError) {
        this.logger.error(`Error processing batch ${batchIndex + 1}:`, batchError);
        throw new Error(`Failed to process embeddings batch: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
      }
      
      // Create vectors from generated embeddings
      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];
        const embedding = batchEmbeddings[i];
        const msg = chunk.original;
        
        embeddingsProcessed++;
        
        try {
          // Create a unique ID for the vector - if it's part of a split message, add the part number
          const vectorId = chunk.part 
            ? `${msg.id || `msg_${Date.now()}`}_part${chunk.part}` 
            : (msg.id || `msg_${Date.now()}_${embeddingsProcessed}`);
          
          // Add the vector to the array
          vectors.push({
            id: vectorId,
            values: embedding,
            metadata: {
              // Original ChatGPT fields
              role: msg.role,
              content: chunk.content,
              timestamp: msg.timestamp || 0,
              session_title: msg.session_title || '',
              session_create_time: msg.session_create_time || 0,
              session_update_time: msg.session_update_time || 0,
              imported_from: 'local_huggingface', // Mark as local HuggingFace
              imported_at: Date.now(),
              messageId: msg.id || vectorId,
              
              // source field for compatibility with the transcription system
              source: msg.role,
              // Chunking metadata for split messages
              ...(chunk.part ? {
                chunking_part: chunk.part,
                chunking_total_parts: chunk.totalParts || 1,
                chunking_is_partial: true
              } : {})
            }
          });
        } catch (error) {
          this.logger.error(`Error processing chunk ${embeddingsProcessed}/${allMessageChunks.length}:`, error);
        }
      }
      
      // Update progress after each batch
      processedTotal += batch.length;
      if (this.progressReporter) {
        this.progressReporter.updateProgress('generating_embeddings', processedTotal, allMessageChunks.length);
      }
      
      // Small pause to avoid UI freezing
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Finalize the progress of generating embeddings
    if (this.progressReporter) {
      this.progressReporter.completeStage('generating_embeddings', allMessageChunks.length);
    }
    
    this.logger.info(`Generated ${vectors.length} vectors with embeddings (dimension: ${this.embeddingDimension})`);
    return vectors;
  }

  /**
   * Gets the dimension of the embeddings generated by the current model
   */
  public getEmbeddingDimension(): number {
    return this.embeddingDimension;
  }
}
