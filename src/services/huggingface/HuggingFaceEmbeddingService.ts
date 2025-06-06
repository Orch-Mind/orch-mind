// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceEmbeddingService.ts
// Symbolic cortex: Provides local embeddings generation using HuggingFace models.
// Generates vector embeddings for Orch-OS in basic mode, without requiring cloud APIs.

import { pipeline } from "@huggingface/transformers";
import { IEmbeddingService } from "../../components/context/deepgram/interfaces/openai/IEmbeddingService";
import { MessageChunk, PineconeVector } from "../../electron/chatgpt-import/interfaces/types";
import { Logger } from "../../electron/chatgpt-import/utils/logging";
import { ProgressReporter } from "../../electron/chatgpt-import/utils/progressReporter";
import { STORAGE_KEYS } from "../StorageService";

/**
 * Symbolic: Supported browser models for feature-extraction/embeddings
 * Orch-OS supports the following models for local embedding generation
 * Apenas modelos verdadeiramente multilíngues com suporte a português e outras línguas
 * 
 * IMPORTANTE: Esta lista é organizada em ordem de preferência/compatibilidade, com os
 * modelos mais confiáveis e otimizados para browsers no topo.
 * 
 * Modelos Xenova são geralmente mais otimizados para browsers que os modelos originais.
 */
export const SUPPORTED_HF_EMBEDDING_MODELS = [
  // ===== MODELOS PARA BROWSER OTIMIZADOS (XENOVA) =====
  // Melhor compatibilidade e performance no browser
  'Xenova/all-MiniLM-L6-v2',        // 384-dimensional, extremamente leve (~33MB), suporte a +50 idiomas, mais estável
  'Xenova/paraphrase-multilingual-MiniLM-L12-v2', // 384-dimensional, bom para detecção semântica (~120MB)
  'Xenova/all-mpnet-base-v2',       // 768-dimensional, bom equilíbrio tamanho/qualidade (~438MB)
  'Xenova/multilingual-e5-small',   // 384-dimensional, leve (~106MB), ideal para browsers
  'Xenova/multilingual-e5-base',    // 768-dimensional, melhor qualidade (~278MB)
  'Xenova/bge-m3',                  // 1024-dimensional, versão unificada do BGE-M3 (~165MB)
  
  // ===== MODELOS NÃO-XENOVA (COMPATIBILIDADE LIMITADA) =====
  // Podem ter problemas com arquivos de dados externos no browser
  // Descomente caso precise destes modelos específicos e entenda as limitações
  // 'intfloat/multilingual-e5-large', // 1024-dimensional, mas problemas de compatibilidade browser (~560MB)
];

/**
 * HuggingFace Embedding Service Options
 */
export type HuggingFaceEmbeddingOptions = {
  model?: string;
  device?: "wasm" | "webgpu";
  dtype?: "fp32" | "q8" | "q4";
};

/**
 * Service for generating embeddings using HuggingFace models locally in the browser
 * Symbolic: Neural vector encoder for symbolic memory system without external dependency
 * Usado no modo básico do Orch-OS para geração local de embeddings sem dependências externas
 * 
 * ONNX Runtime Notes:
 * - When loading models, you may see warnings like:
 *   "Some nodes were not assigned to the preferred execution providers"
 * - These warnings are normal and expected - they indicate that ONNX Runtime is
 *   intelligently distributing operations between CPU and GPU for optimal performance
 * - Shape-related operations are explicitly assigned to CPU by ONNX Runtime as this
 *   is typically faster than using GPU for these operations
 * - These warnings do not indicate errors and can be safely ignored
 */
export class HuggingFaceEmbeddingService implements IEmbeddingService {
  // Device and dtype options for model loading
  // Note: In Transformers.js v3, "cpu" is no longer a valid option, use "wasm" instead
  private static readonly DEVICE_OPTIONS = ["webgpu", "wasm"] as const;
  private static readonly DTYPE_OPTIONS = ["q4", "q8", "fp32"] as const;

  // Using 'any' to avoid TypeScript complexity with pipeline() typing
  private embeddingGenerator: any = null;
  private currentModel: string | null = null;
  private embeddingDimension: number = 384; // Default dimension for most embedding models
  private readonly logger: Logger;
  private progressReporter?: ProgressReporter;
  private initialized: boolean = false;

  constructor(
    modelId?: string,
    logger?: Logger,
    progressReporter?: ProgressReporter
  ) {
    this.logger = logger || new Logger('[HuggingFaceEmbeddingService]');
    this.progressReporter = progressReporter;
    
    // If model ID is provided, schedule initialization
    if (modelId) {
      // Schedule model loading without blocking constructor
      setTimeout(() => {
        this.loadModel(modelId).catch(err => {
          this.logger.error(`Failed to load model: ${modelId}`, err);
        });
      }, 0);
    }
  }
  
  /**
   * Gets the default model ID to use for embeddings
   * Prioritizes multilingual models for better support across languages
   * @returns HuggingFace model ID to be used as default
   */
  private getDefaultModelId(storedModel?: string): string {
    // Check if there's a model saved in user settings
    if (storedModel && SUPPORTED_HF_EMBEDDING_MODELS.includes(storedModel)) {
      return storedModel;
    }
    
    // If no user-defined model, use the first model in the list
    // The list is already organized with multilingual models at the top for prioritization
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
   * Determines which dtypes are compatible with a specific model ID
   * Some models don't have quantized versions available or have specific requirements
   * @param modelId The HuggingFace model ID
   * @returns Array of compatible dtypes in priority order
   */
  private getCompatibleDtypes(modelId: string): ("q4" | "q8" | "fp32")[] {
    // Handle non-Xenova models (typically don't have quantized versions)
    if (modelId.startsWith('intfloat/')) {
      // intfloat models like intfloat/multilingual-e5-large only work with fp32
      // they also often use external data files that might cause issues
      return ["fp32"];
    }
    
    // For the most stable models, start with fp32 to avoid JSON issues
    if (modelId === 'Xenova/all-MiniLM-L6-v2' || 
        modelId === 'Xenova/all-mpnet-base-v2') {
      // These models are very stable and work well with all dtypes
      return ["fp32", "q8", "q4"];
    }
    
    // For specific models that we know don't have q4 quantization
    if (modelId === 'Xenova/multilingual-e5-base') {
      // multilingual-e5-base doesn't have q4 version available
      return ["fp32", "q8"];
    } else if (modelId === 'Xenova/multilingual-e5-small') {
      // multilingual-e5-small sometimes has JSON loading issues with quantized versions
      // Start with fp32 for better compatibility
      return ["fp32", "q8"];
    } else if (modelId.includes('multilingual-e5')) {
      // Other multilingual-e5 variants - safer to avoid q4
      return ["fp32", "q8"];
    }
    
    // Default case - try all available dtypes with fp32 first for stability
    return ["fp32", "q8", "q4"];
  }

  /**
   * Verifies if a model is likely to be compatible with browser environment
   * @param modelId The model ID to check
   * @returns True if the model is likely to be compatible
   */
  private isModelBrowserCompatible(modelId: string): boolean {
    // Xenova models are specifically optimized for browser use
    if (modelId.startsWith('Xenova/')) {
      return true;
    }
    
    // Non-Xenova large models often have external data files that cause issues
    if (modelId.includes('large') || modelId.includes('-L') || 
        modelId.includes('base') && !modelId.startsWith('Xenova/')) {
      return false;
    }
    
    return true;
  }

  /**
   * Test network connectivity to HuggingFace model repository
   * This helps diagnose network issues that might cause JSON parsing errors
   */
  private async testHuggingFaceConnectivity(): Promise<boolean> {
    try {
      // Test connectivity by fetching a small model config file
      const response = await fetch(`https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json`);
      return response.ok;
    } catch (error) {
      this.logger.warn(`Network connectivity test to HuggingFace failed: ${error}`);
      return false;
    }
  }

  /**
   * Check if WebGPU is available in the current browser environment
   */
  private async isWebGPUAvailable(): Promise<boolean> {
    try {
      // Type assertion for WebGPU support (experimental feature)
      const gpu = (navigator as any).gpu;
      if (!gpu) {
        this.logger.debug('WebGPU not available: navigator.gpu is undefined');
        return false;
      }
      
      const adapter = await gpu.requestAdapter();
      if (!adapter) {
        this.logger.debug('WebGPU not available: no adapter found');
        return false;
      }
      
      this.logger.debug('WebGPU is available');
      return true;
    } catch (error) {
      this.logger.debug(`WebGPU availability check failed: ${error}`);
      return false;
    }
  }

  async loadModel(modelId?: string): Promise<void> {
    // Use the provided modelId or get the default one
    const actualModelId = modelId || this.getDefaultModelId();
    if (this.currentModel === actualModelId && this.embeddingGenerator) return;
    
    // Determine embedding dimensionality based on loaded model
    // Different multilingual models produce embeddings of different sizes
    if (
      actualModelId.includes('bge-m3') || 
      actualModelId.includes('multilingual-e5-large')
    ) {
      this.embeddingDimension = 1024; // Premium multilingual models have 1024 dimensions
    } else if (
      actualModelId.includes('mpnet') || 
      actualModelId.includes('bge-base') ||
      (actualModelId.includes('multilingual-e5') && actualModelId.includes('base'))
    ) {
      this.embeddingDimension = 768; // Base models typically have 768 dimensions
    } else {
      this.embeddingDimension = 384; // Default for small and MiniLM models (384 dimensions)
    }
    
    this.logger.debug(`Embedding dimensionality set to ${this.embeddingDimension} for model ${actualModelId}`);
    
    // Warn about potential compatibility issues with non-optimized models
    if (!this.isModelBrowserCompatible(actualModelId)) {
      this.logger.warn(`Model ${actualModelId} may have compatibility issues in browser environments. Xenova/* models are recommended.`);
    }
    
    let lastError: any = null;
    
    // Check WebGPU availability and adjust device options accordingly
    const webGPUAvailable = await this.isWebGPUAvailable();
    const deviceOptions = webGPUAvailable 
      ? HuggingFaceEmbeddingService.DEVICE_OPTIONS 
      : ["wasm"]; // Use only WASM if WebGPU is not available
    
    this.logger.info(`WebGPU available: ${webGPUAvailable}, using devices: ${deviceOptions.join(', ')}`);
    
    // Get compatible dtypes for this specific model
    const compatibleDtypes = this.getCompatibleDtypes(actualModelId);
    this.logger.info(`Using compatible dtypes for model ${actualModelId}: ${compatibleDtypes.join(', ')}`);
    
    // Try all combinations of device and compatible dtype
    for (const device of deviceOptions) {
      for (const dtype of compatibleDtypes) {
        try {
          this.logger.info(`Loading embedding model ${actualModelId} with ${device} + ${dtype}...`);
          
          // Note: ONNX Runtime warnings about execution providers are normal and expected
          // These warnings occur because ONNX Runtime intelligently assigns different operations
          // to different hardware (CPU vs GPU) for optimal performance
          this.logger.debug(`Note: ONNX Runtime warnings about execution providers are normal and can be safely ignored`); 
          
          

            // Configuração do pipeline com opções suportadas pelos tipos TypeScript
            // Mantemos apenas opções válidas para evitar erros de lint
            const pipelineConfig: any = {
              device,
              dtype,
              // Force local model usage when possible to avoid CSP issues
              local_files_only: false, // Allow download but prefer cache
              use_external_data_format: false, // Avoid external data dependencies
              // Add progress callback for debugging
              progress_callback: (data: any) => {
                if (data.status === 'progress') {
                  // Ensure progress is between 0-100% by clamping the value
                  const progressPercent = Math.min(Math.round((data.progress || 0) * 100), 100);
                  this.logger.debug(`Loading model progress: ${progressPercent}%`);
                } else if (data.status === 'done') {
                  this.logger.debug(`Model file loaded: ${data.file}`);
                }
              }
            };

            // Enhanced cache configuration for Electron environment
            if (typeof window !== 'undefined') {
              pipelineConfig.cache_dir = "./.cache";
              // Set environment variables for better HuggingFace behavior in Electron
              if (typeof process !== 'undefined' && process.env) {
                process.env.HF_HUB_DISABLE_TELEMETRY = '1';
                process.env.HF_HUB_OFFLINE = '0'; // Allow downloads but use cache aggressively
              }
            }

            this.embeddingGenerator = await pipeline("feature-extraction", actualModelId, pipelineConfig);
          
          this.currentModel = actualModelId;
          this.initialized = true;
          this.logger.success(`Successfully loaded ${actualModelId} with ${device} + ${dtype}`);
          return;
        } catch (e) { 
          lastError = e;
          this.logger.debug(`Failed to load model with ${device} + ${dtype}: ${e instanceof Error ? e.message : String(e)}`);
          
          // Check for specific error types and provide more helpful messages
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (errorMsg.includes('Module.MountedFiles is not available')) {
            this.logger.error(`This model uses external data files which aren't fully supported in browser environments. Consider using a Xenova/* model instead.`);
          } else if (errorMsg.includes('Could not locate file') && errorMsg.includes('404')) {
            this.logger.error(`The model file wasn't found (404 error). This model may not have a ${dtype} version available.`);
          } else if (errorMsg.includes('Unexpected token') && errorMsg.includes('<!DOCTYPE')) {
            this.logger.error(`Received HTML instead of model files - possible network issue or model not available. Trying next configuration...`);
          } else if (errorMsg.includes('SyntaxError') && errorMsg.includes('JSON')) {
            this.logger.error(`JSON parsing error when fetching model files. The model server may be returning an error page instead of the model data.`);
          }
        }
      }
    }
    
    // If all attempts fail, try fallback to a more stable model if we're not already using the most stable one
    if (actualModelId !== SUPPORTED_HF_EMBEDDING_MODELS[0] && 
        lastError && 
        String(lastError).includes('JSON')) {
      this.logger.warn(`Model ${actualModelId} failed to load due to JSON parsing issues. Trying fallback to more stable model: ${SUPPORTED_HF_EMBEDDING_MODELS[0]}`);
      try {
        return await this.loadModel(SUPPORTED_HF_EMBEDDING_MODELS[0]);
      } catch (fallbackError) {
        this.logger.error(`Fallback model also failed to load:`, fallbackError);
      }
    }
    
    // If all attempts fail, throw last error with helpful message
    this.initialized = false;
    throw new Error(`Failed to load embedding model ${actualModelId} on any supported device/dtype. ` +
      `Try using a Xenova/* model which is optimized for browsers. Last error: ${lastError}`);
  }

  /**
   * Verifies if the service is initialized with a model
   */
  isInitialized(): boolean {
    return this.initialized && this.embeddingGenerator !== null;
  }
  
  /**
   * Initializes the embedding service with a specified model
   * @param config Optional configuration object which can include modelId
   * @returns Promise resolving to true if initialization succeeded
   */
  async initialize(config?: Record<string, any>): Promise<boolean> {
    try {
      const requestedModelId = config?.modelId || 
                              (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.HF_EMBEDDING_MODEL) : null);
      
      const modelId = requestedModelId || this.getDefaultModelId();
      
      this.logger.info(`Initializing HuggingFace embedding service with model: ${modelId}`);
      
      // If a specific model was requested but fails, try the default stable model
      try {
        await this.loadModel(modelId);
        return true;
      } catch (modelError) {
        if (requestedModelId && requestedModelId !== SUPPORTED_HF_EMBEDDING_MODELS[0]) {
          this.logger.warn(`Requested model ${requestedModelId} failed to load. Trying default stable model.`);
          await this.loadModel(SUPPORTED_HF_EMBEDDING_MODELS[0]);
          return true;
        }
        throw modelError;
      }
    } catch (error) {
      this.logger.error('Failed to initialize HuggingFaceEmbeddingService', error);
      return false;
    }
  }

  /**
   * Ensures a model is loaded before generating embeddings
   */
  async ensureModelLoaded(options?: HuggingFaceEmbeddingOptions): Promise<boolean> {
    if (this.isInitialized()) return true;
    
    try {
      // Get model from user configurations or use default model (multilingual)
      let storedModel: string | undefined;
      try {
        // Safely use localStorage, which may not be available in some environments
        storedModel = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.HF_EMBEDDING_MODEL) || undefined : undefined;
      } catch (e) {
        // Ignore localStorage unavailable errors
        this.logger.debug('Could not access localStorage for HF_EMBEDDING_MODEL');
      }
      const modelId = options?.model || this.getDefaultModelId(storedModel);
      await this.loadModel(modelId);
      // Note: initialized is already set in loadModel() - no need to set again
      return true;
    } catch (error) {
      this.logger.error('Failed to load embedding model:', error);
      return false;
    }
  }

  /**
   * Creates an embedding for a single text
   * @param text The text to create an embedding for
   * @param model Optional model ID to use for embedding, falls back to stored preference or default
   */
  /**
   * Helper method to convert embedding results to standard number array format
   * Handles different result formats from HuggingFace transformers with NaN validation
   */
  private convertEmbeddingResult(result: any): number[] {
    let embedding: number[];
    
    // Check if tolist is available (recommended method in documentation)
    if (typeof result.tolist === 'function') {
      // tolist() returns a nested array, we take the first element
      // and explicitly convert to number[]
      embedding = result.tolist()[0].map((val: unknown) => Number(val));
    } else {
      // Fallback for when tolist is not available
      embedding = Array.from(result.data).map(val => Number(val));
    }
    
    // Critical: Validate embedding for NaN/Infinity values
    const hasInvalidValues = embedding.some(val => !Number.isFinite(val));
    if (hasInvalidValues) {
      this.logger.error("HuggingFace returned embedding with NaN/Infinity values - cleaning...");
      this.logger.error("Invalid values:", embedding.filter(val => !Number.isFinite(val)));
      
      // Clean the embedding by replacing invalid values with 0.0
      const cleanedEmbedding = embedding.map(val => Number.isFinite(val) ? val : 0.0);
      this.logger.warn("Cleaned embedding by replacing non-finite values with 0.0");
      return cleanedEmbedding;
    }
    
    return embedding;
  }

  async createEmbedding(text: string, model?: string): Promise<number[]> {
    // If a specific model was requested, check if it needs to be loaded
    if (model && this.currentModel !== model) {
      await this.loadModel(model);
    } else {
      await this.ensureModelLoaded();
    }
    
    this.logger.debug(`Generating embedding with HuggingFace model: ${this.currentModel}`);
    
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
      return this.convertEmbeddingResult(result);
    } catch (error) {
      this.logger.error(`Error generating embedding for text: ${text.substring(0, 50)}...`, error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates embeddings for multiple texts in batch
   * @param texts Array of texts to create embeddings for
   * @param model Optional model ID to use for embedding, falls back to stored preference or default
   */
  async createEmbeddings(texts: string[], model?: string): Promise<number[][]> {
    // If a specific model was requested, check if it needs to be loaded
    if (model && this.currentModel !== model) {
      await this.loadModel(model);
    } else {
      await this.ensureModelLoaded();
    }
    
    this.logger.debug(`Generating batch embeddings with HuggingFace model: ${this.currentModel}`);
    
    if (!this.embeddingGenerator) {
      throw new Error("Embedding model not loaded");
    }
    
    try {
      // Process texts in small batches to avoid memory issues
      const batchSize = 10;
      const results: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchNumber = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(texts.length/batchSize);
        this.logger.info(`Processing batch ${batchNumber}/${totalBatches}`);
        
        // Process each text in the batch
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            const result = await this.embeddingGenerator(text, {
              pooling: "mean",
              normalize: true
            });
            
            return this.convertEmbeddingResult(result);
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
    let processedTotal = 0; // Tracks progress for the progressReporter
    
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
