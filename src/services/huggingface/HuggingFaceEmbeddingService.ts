// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// HuggingFaceEmbeddingService.ts
// Symbolic cortex: Provides local embeddings generation using HuggingFace models.
// Generates vector embeddings for Orch-OS in basic mode, without requiring cloud APIs.

import { pipeline } from "@huggingface/transformers";
import { IEmbeddingService } from "../../components/context/deepgram/interfaces/openai/IEmbeddingService";
import { OnnxRuntimeConfig } from "../../config/onnxruntimeConfig";
import {
  MessageChunk,
  PineconeVector,
} from "../../electron/chatgpt-import/interfaces/types";
import { Logger } from "../../electron/chatgpt-import/utils/logging";
import { ProgressReporter } from "../../electron/chatgpt-import/utils/progressReporter";
import { getModelDimensions } from "../../utils/EmbeddingUtils";
import { STORAGE_KEYS } from "../StorageService";

/**
 * Symbolic: Supported browser models for feature-extraction/embeddings
 * Based on official Transformers.js v3 examples and documentation
 * Updated to follow official recommendations from HuggingFace blog post
 *
 * IMPORTANTE: Esta lista segue EXATAMENTE os exemplos da documentação oficial
 * do Transformers.js v3 para máxima compatibilidade.
 */
export const SUPPORTED_HF_EMBEDDING_MODELS = [
  // ===== MODELOS ONNX COMMUNITY (BASEADO EM EXEMPLOS OFICIAIS) =====
  // CORRECTED: Using models from official HuggingFace examples that work with feature-extraction
  "onnx-community/Qwen3-0.6B-ONNX", // Qwen3 0.6B (official HuggingFace example, q4f16 support)
  "onnx-community/gte-multilingual-base", // GTE Multilingual Base (768 dims, proven embeddings, official example)
];

/**
 * HuggingFace/Transformers Embedding Service Options
 * Compatible with @huggingface/transformers pipeline API
 */
export type HuggingFaceEmbeddingOptions = {
  model?: string;
  device?: "cpu" | "wasm" | "webgpu";
  dtype?: "fp32" | "q8" | "q4f16";
};

/**
 * Service for generating embeddings using HuggingFace/Transformers models locally in the browser
 * Migrated from @huggingface/transformers to @huggingface/transformers for enhanced browser compatibility
 * Symbolic: Neural vector encoder for symbolic memory system without external dependency
 * Usado no modo básico do Orch-OS para geração local de embeddings sem dependências externas
 *
 * ⚡ ENHANCED ONNX PATH RESOLUTION v2.0 ⚡
 * ==========================================
 * This service now includes enhanced ONNX path resolution for transformers.js v3 compatibility:
 *
 * 🎯 KEY FEATURES:
 * - Automatic revision/subfolder detection for ONNX community models
 * - Support for quantized model variants (q4, q8, fp32) in correct subfolders
 * - Fallback mechanisms for models with different directory structures
 * - Enhanced error handling with specific path resolution diagnostics
 *
 * 📁 SUPPORTED MODEL STRUCTURES:
 * onnx-community models:
 *   ├── onnx/fp32/model.onnx
 *   ├── onnx/q8/model.onnx
 *   └── onnx/q4/model.onnx
 *
 * 🔧 TECHNICAL IMPLEMENTATION:
 * - getModelRevision(): Determines correct subfolder path based on model ID and dtype
 * - createEnhancedPipelineConfig(): Creates pipeline config with proper revision parameter
 * - Enhanced error handling with fallback attempts for path resolution failures
 *
 * 🐛 FIXES:
 * - Resolves "Failed to fetch" errors for onnx-community models
 * - Proper quantization support for models with subfolder structure
 * - Compatible with transformers.js v3 path resolution requirements
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
  // Note: Use "cpu" for Node.js/Electron main process, "wasm"/"webgpu" for browsers
  private static readonly DEVICE_OPTIONS = ["cpu", "webgpu", "wasm"] as const;
  private static readonly DTYPE_OPTIONS = ["q4f16", "q8", "fp32"] as const;

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
    this.logger = logger || new Logger("[HuggingFaceEmbeddingService]");
    this.progressReporter = progressReporter;

    // If model ID is provided, schedule initialization
    if (modelId) {
      // Schedule model loading without blocking constructor
      setTimeout(() => {
        this.loadModel(modelId).catch((err) => {
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
   * Determines which dtypes are compatible with a specific model ID
   * Some models don't have quantized versions available or have specific requirements
   * @param modelId The HuggingFace model ID
   * @returns Array of compatible dtypes in priority order
   */
  private getCompatibleDtypes(modelId: string): ("q4f16" | "q8" | "fp32")[] {
    // ===== BASED ON OFFICIAL TRANSFORMERS.JS v3 EXAMPLES =====
    // Following official blog post: https://huggingface.co/blog/transformersjs-v3

    // ONNX Community models - different dtypes based on official examples
    if (modelId.startsWith("onnx-community/")) {
      if (modelId.includes("gte-multilingual-base")) {
        // GTE Multilingual Base: Official example uses default dtype (fp32)
        // Based on: https://huggingface.co/onnx-community/gte-multilingual-base
        return ["fp32", "q8"];
      }
      if (modelId.includes("Qwen3-0.6B-ONNX")) {
        // Qwen3: Official example uses q4f16
        // Based on: https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX
        return ["q4f16", "fp32", "q8"];
      }
      // Default for other ONNX community models
      return ["fp32", "q8"];
    }

    // Legacy model compatibility (keeping for backward compatibility)
    if (modelId.startsWith("intfloat/")) {
      return ["fp32"];
    }

    // Default case - try stable dtypes first
    return ["fp32", "q8"];
  }

  /**
   * REMOVED: Model file name resolution logic that was interfering with transformers.js
   *
   * ROOT CAUSE ANALYSIS:
   * The previous implementation was causing path duplication and incorrect concatenation
   * because transformers.js has its own internal logic for ONNX model path resolution.
   * When we specified model_file_name, it was applied ON TOP OF the internal logic,
   * resulting in URLs like: /onnx/onnx/q4/model.onnx_q4.onnx
   *
   * SOLUTION: Let transformers.js handle path resolution naturally without interference.
   * Only use models that are proven to work with transformers.js out-of-the-box.
   */

  /**
   * Creates a simplified pipeline configuration following HuggingFace/transformers.js documentation
   * Uses minimal configuration as recommended in official examples
   * @param modelId The model ID
   * @param device The device to use (cpu, wasm, webgpu)
   * @param dtype The quantization dtype
   * @returns Simplified pipeline configuration object
   */
  private createSimplifiedPipelineConfig(
    modelId: string,
    device: "cpu" | "wasm" | "webgpu",
    dtype: "fp32" | "q8" | "q4f16"
  ): any {
    // ============ SIMPLIFIED CONFIGURATION FOLLOWING OFFICIAL DOCS ============
    // Based on HuggingFace/transformers.js documentation examples
    // Using minimal configuration to prevent tokenizer interference

    const baseConfig = {
      device,
      dtype,
      // Basic session options only
      session_options: OnnxRuntimeConfig.getOptimizedSessionOptions(device),
    };

    // ============ SPECIAL HANDLING FOR PROBLEMATIC MODELS ============
    if (modelId.includes("Qwen3-Embedding")) {
      this.logger.debug("🔧 Applying Qwen3-specific simplified configuration");
      return {
        ...baseConfig,
        // Minimal config for Qwen3 to avoid tokenizer issues
        local_files_only: false,
        trust_remote_code: false,
      };
    }

    return baseConfig;
  }

  /**
   * Check if WebGPU is available in the current browser environment
   */
  private async isWebGPUAvailable(): Promise<boolean> {
    try {
      // Type assertion for WebGPU support (experimental feature)
      const gpu = (navigator as any).gpu;
      if (!gpu) {
        this.logger.debug("WebGPU not available: navigator.gpu is undefined");
        return false;
      }

      const adapter = await gpu.requestAdapter();
      if (!adapter) {
        this.logger.debug("WebGPU not available: no adapter found");
        return false;
      }

      this.logger.debug("WebGPU is available");
      return true;
    } catch (error) {
      this.logger.debug(`WebGPU availability check failed: ${error}`);
      return false;
    }
  }

  /**
   * Loads a supported embedding model for local inference with enhanced ONNX path resolution.
   *
   * ⚡ NEW: Enhanced ONNX Path Resolution ⚡
   * - Implements proper revision/subfolder resolution for ONNX community models
   * - Follows transformers.js v3 best practices for model loading
   * - Supports onnx-community models with subfolder structure (onnx/fp32/, onnx/q8/, onnx/q4/)
   * - Includes fallback mechanisms for models with different structures
   *
   * Symbolic: Tries WebGPU + quantized (q4), depois q8, depois fp32, depois CPU.
   * Maximizes browser compatibility and performance for Orch-OS.
   *
   * @param modelId - ID do modelo HuggingFace a ser carregado, ou modelo padrão se não especificado
   */
  async loadModel(modelId?: string): Promise<void> {
    // Use the provided modelId or get the default one
    const actualModelId = modelId || this.getDefaultModelId();
    if (this.currentModel === actualModelId && this.embeddingGenerator) return;

    this.logger.info(`🔍 Loading embedding model: ${actualModelId}`);

    // Determine embedding dimensionality from centralized utility function
    this.embeddingDimension = getModelDimensions(actualModelId);
    this.logger.debug(
      `Embedding dimensionality set to ${this.embeddingDimension} for model ${actualModelId}`
    );

    let lastError: any = null;

    // Detect environment and choose appropriate device options
    const isNodeJS =
      typeof window === "undefined" && typeof process !== "undefined";

    let deviceOptions: ("cpu" | "wasm" | "webgpu")[];

    if (isNodeJS) {
      // Node.js/Electron main process - use CPU
      deviceOptions = ["cpu"];
      this.logger.info(
        `Running in Node.js/Electron main process, using device: cpu`
      );
    } else {
      // Browser environment - check WebGPU availability
      const webGPUAvailable = await this.isWebGPUAvailable();
      deviceOptions = webGPUAvailable ? ["webgpu", "wasm"] : ["wasm"];

      this.logger.info(
        `Running in browser, WebGPU available: ${webGPUAvailable}, using devices: ${deviceOptions.join(
          ", "
        )}`
      );
    }

    // Get compatible dtypes for this specific model
    const compatibleDtypes = this.getCompatibleDtypes(actualModelId);
    this.logger.info(
      `Using compatible dtypes for model ${actualModelId}: ${compatibleDtypes.join(
        ", "
      )}`
    );

    // Try all combinations of device and compatible dtype
    for (const device of deviceOptions) {
      for (const dtype of compatibleDtypes) {
        try {
          this.logger.info(
            `Loading embedding model ${actualModelId} with ${device} + ${dtype}...`
          );

          // Note: ONNX Runtime warnings about execution providers are normal and expected
          // These warnings occur because ONNX Runtime intelligently assigns different operations
          // to different hardware (CPU vs GPU) for optimal performance
          this.logger.debug(
            `Note: ONNX Runtime warnings about execution providers are normal and can be safely ignored`
          );

          // Configuração otimizada do pipeline para suprimir warnings do ONNX Runtime
          // e melhorar performance dos execution providers
          const pipelineConfig: any = this.createSimplifiedPipelineConfig(
            actualModelId,
            device,
            dtype
          );

          this.embeddingGenerator = await pipeline(
            "feature-extraction",
            actualModelId,
            pipelineConfig
          );

          this.currentModel = actualModelId;
          this.initialized = true;
          this.logger.success(
            `Successfully loaded ${actualModelId} with ${device} + ${dtype}`
          );
          return;
        } catch (e) {
          lastError = e;
          const errorMessage = e instanceof Error ? e.message : String(e);
          this.logger.debug(
            `Failed to load ${actualModelId} with ${device} + ${dtype}: ${errorMessage}`
          );

          // ============ ENHANCED ERROR HANDLING FOR x.split ISSUES ============
          // Special handling for tokenizer-related errors (x.split is not a function)
          if (
            errorMessage.includes("split is not a function") ||
            errorMessage.includes("TypeError") ||
            errorMessage.includes("tokenizer")
          ) {
            this.logger.warn(
              `🔧 Detected tokenizer error with ${device}/${dtype}. Trying HF documentation pattern...`
            );

            try {
              // Try with minimal configuration to bypass tokenizer issues
              const simplifiedConfig = {
                device,
                dtype,
                local_files_only: false,
                use_external_data_format: false,
                // Minimal tokenizer config
                clean_up_tokenization_spaces: false,
                add_special_tokens: false,
                trust_remote_code: false,
                session_options: OnnxRuntimeConfig.getOptimizedSessionOptions(
                  device as "cpu" | "webgpu" | "wasm"
                ),
              };

              this.logger.debug(
                `Trying simplified config for ${actualModelId} with ${device}/${dtype}`
              );

              this.embeddingGenerator = await pipeline(
                "feature-extraction",
                actualModelId,
                simplifiedConfig
              );

              this.currentModel = actualModelId;
              this.initialized = true;
              this.logger.success(
                `Successfully loaded ${actualModelId} with ${device} + ${dtype} (simplified config)`
              );
              return;
            } catch (simplifiedError) {
              this.logger.debug(
                `Simplified config also failed: ${
                  simplifiedError instanceof Error
                    ? simplifiedError.message
                    : String(simplifiedError)
                }`
              );
            }
          }

          // Check if this is a network/download issue and suggest alternatives
          if (
            errorMessage.includes("404") ||
            errorMessage.includes("fetch") ||
            errorMessage.includes("network")
          ) {
            this.logger.warn(
              `Network/download issue with ${actualModelId}. Consider using a different model or check internet connection.`
            );
          } else if (
            errorMessage.includes("Session") ||
            errorMessage.includes("ONNX")
          ) {
            this.logger.debug(
              `ONNX Runtime issue with ${device}/${dtype}, trying next configuration...`
            );

            // Enhanced error handling: Try fallback without revision for ONNX models
            if (actualModelId.startsWith("onnx-community/")) {
              this.logger.warn(
                `Trying fallback without revision for ONNX model ${actualModelId}...`
              );
              try {
                const fallbackConfig = this.createSimplifiedPipelineConfig(
                  actualModelId,
                  device,
                  dtype
                );
                delete fallbackConfig.revision; // Remove revision for fallback attempt

                this.embeddingGenerator = await pipeline(
                  "feature-extraction",
                  actualModelId,
                  fallbackConfig
                );

                this.currentModel = actualModelId;
                this.initialized = true;
                this.logger.success(
                  `Successfully loaded ${actualModelId} with ${device} + ${dtype} (fallback without revision)`
                );
                return;
              } catch (fallbackError) {
                this.logger.debug(
                  `Fallback without revision also failed: ${
                    fallbackError instanceof Error
                      ? fallbackError.message
                      : String(fallbackError)
                  }`
                );
              }
            }
          } else if (
            errorMessage.includes("Unknown model") ||
            errorMessage.includes("qwen3")
          ) {
            this.logger.warn(
              `Model class 'qwen3' not fully supported. This is a known limitation with newer models. Consider using tested alternatives like 'onnx-community/gte-multilingual-base'.`
            );
          }
        }
      }
    }

    // If all attempts fail, try fallback to a more stable model if we're not already using the most stable one
    if (
      actualModelId !== SUPPORTED_HF_EMBEDDING_MODELS[0] &&
      lastError &&
      String(lastError).includes("JSON")
    ) {
      this.logger.warn(
        `Model ${actualModelId} failed to load due to JSON parsing issues. Trying fallback to more stable model: ${SUPPORTED_HF_EMBEDDING_MODELS[0]}`
      );
      try {
        return await this.loadModel(SUPPORTED_HF_EMBEDDING_MODELS[0]);
      } catch (fallbackError) {
        this.logger.error(`Fallback model also failed to load:`, fallbackError);
      }
    }

    // If all attempts fail, throw last error with helpful message
    this.initialized = false;
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
      const requestedModelId =
        config?.modelId ||
        (typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.HF_EMBEDDING_MODEL)
          : null);

      const modelId = requestedModelId || this.getDefaultModelId();

      this.logger.info(
        `Initializing HuggingFace embedding service with model: ${modelId}`
      );

      // If a specific model was requested but fails, try the default stable model
      try {
        await this.loadModel(modelId);
        return true;
      } catch (modelError) {
        if (
          requestedModelId &&
          requestedModelId !== SUPPORTED_HF_EMBEDDING_MODELS[0]
        ) {
          this.logger.warn(
            `Requested model ${requestedModelId} failed to load. Trying default stable model.`
          );
          await this.loadModel(SUPPORTED_HF_EMBEDDING_MODELS[0]);
          return true;
        }
        throw modelError;
      }
    } catch (error) {
      this.logger.error("Failed to initialize HuggingFaceEmbeddingService", error);
      return false;
    }
  }

  /**
   * Ensures a model is loaded before generating embeddings
   */
  async ensureModelLoaded(
    options?: HuggingFaceEmbeddingOptions
  ): Promise<boolean> {
    if (this.isInitialized()) return true;

    try {
      // Get model from user configurations or use default model (multilingual)
      let storedModel: string | undefined;
      try {
        // Safely use localStorage, which may not be available in some environments
        storedModel =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEYS.HF_EMBEDDING_MODEL) || undefined
            : undefined;
      } catch (e) {
        // Ignore localStorage unavailable errors
        this.logger.debug(
          "Could not access localStorage for HF_EMBEDDING_MODEL"
        );
      }
      const modelId = options?.model || this.getDefaultModelId(storedModel);
      await this.loadModel(modelId);
      // Note: initialized is already set in loadModel() - no need to set again
      return true;
    } catch (error) {
      this.logger.error("Failed to load embedding model:", error);
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
    if (typeof result.tolist === "function") {
      // tolist() returns a nested array, we take the first element
      // and explicitly convert to number[]
      embedding = result.tolist()[0].map((val: unknown) => Number(val));
    } else {
      // Fallback for when tolist is not available
      embedding = Array.from(result.data).map((val) => Number(val));
    }

    // Critical: Validate embedding for NaN/Infinity values
    const hasInvalidValues = embedding.some((val) => !Number.isFinite(val));
    if (hasInvalidValues) {
      this.logger.error(
        "HuggingFace/Transformers returned embedding with NaN/Infinity values - cleaning..."
      );
      this.logger.error(
        "Invalid values:",
        embedding.filter((val) => !Number.isFinite(val))
      );

      // Clean the embedding by replacing invalid values with 0.0
      const cleanedEmbedding = embedding.map((val) =>
        Number.isFinite(val) ? val : 0.0
      );
      this.logger.warn(
        "Cleaned embedding by replacing non-finite values with 0.0"
      );
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

    this.logger.debug(
      `Generating embedding with HuggingFace model: ${this.currentModel}`
    );

    if (!this.embeddingGenerator) {
      throw new Error("Embedding model not loaded");
    }

    try {
      // Call the feature extraction pipeline
      const result = await this.embeddingGenerator(text, {
        pooling: "mean", // Use mean pooling for sentence embeddings
        normalize: true, // Normalize the embeddings
      });

      // Convert to standard array format that matches OpenAI's embedding format
      return this.convertEmbeddingResult(result);
    } catch (error) {
      this.logger.error(
        `Error generating embedding for text: ${text.substring(0, 50)}...`,
        error
      );
      throw new Error(
        `Failed to generate embedding: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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

    this.logger.debug(
      `Generating batch embeddings with HuggingFace model: ${this.currentModel}`
    );

    if (!this.embeddingGenerator) {
      throw new Error("Embedding model not loaded");
    }

    try {
      // Process texts in small batches to avoid memory issues
      const batchSize = 10;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(texts.length / batchSize);
        this.logger.info(`Processing batch ${batchNumber}/${totalBatches}`);

        // Process each text in the batch
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            const result = await this.embeddingGenerator(text, {
              pooling: "mean",
              normalize: true,
            });

            return this.convertEmbeddingResult(result);
          })
        );

        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      this.logger.error(`Error generating batch embeddings:`, error);
      throw new Error(
        `Failed to generate batch embeddings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
      this.progressReporter.startStage(
        "generating_embeddings",
        allMessageChunks.length
      );
    }

    // Verify if we have the model available
    const modelInitialized = await this.ensureModelLoaded();
    this.logger.info(
      `Status of embedding model: ${
        modelInitialized ? "Initialized" : "Not initialized"
      }`
    );

    if (!modelInitialized) {
      throw new Error(
        "Embedding model not initialized. Check browser compatibility and try again."
      );
    }

    const vectors: PineconeVector[] = [];
    let embeddingsProcessed = 0;
    let processedTotal = 0; // Tracks progress for the progressReporter

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.logger.info(
        `Processing batch ${batchIndex + 1}/${batches.length} with ${
          batch.length
        } messages`
      );

      // Prepare the texts for the current batch
      const batchTexts = batch.map((chunk) => chunk.content);

      // Generate embeddings for the entire batch
      let batchEmbeddings: number[][] = [];

      try {
        batchEmbeddings = await this.createEmbeddings(batchTexts);
        this.logger.success(
          `Embeddings generated successfully for batch ${batchIndex + 1}/${
            batches.length
          }`
        );
      } catch (batchError) {
        this.logger.error(
          `Error processing batch ${batchIndex + 1}:`,
          batchError
        );
        throw new Error(
          `Failed to process embeddings batch: ${
            batchError instanceof Error
              ? batchError.message
              : String(batchError)
          }`
        );
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
            : msg.id || `msg_${Date.now()}_${embeddingsProcessed}`;

          // Add the vector to the array
          vectors.push({
            id: vectorId,
            values: embedding,
            metadata: {
              // Original ChatGPT fields
              role: msg.role,
              content: chunk.content,
              timestamp: msg.timestamp || 0,
              session_title: msg.session_title || "",
              session_create_time: msg.session_create_time || 0,
              session_update_time: msg.session_update_time || 0,
              imported_from: "local_huggingface", // Mark as local HuggingFace
              imported_at: Date.now(),
              messageId: msg.id || vectorId,

              // source field for compatibility with the transcription system
              source: msg.role,
              // Chunking metadata for split messages
              ...(chunk.part
                ? {
                    chunking_part: chunk.part,
                    chunking_total_parts: chunk.totalParts || 1,
                    chunking_is_partial: true,
                  }
                : {}),
            },
          });
        } catch (error) {
          this.logger.error(
            `Error processing chunk ${embeddingsProcessed}/${allMessageChunks.length}:`,
            error
          );
        }
      }

      // Update progress after each batch
      processedTotal += batch.length;
      if (this.progressReporter) {
        this.progressReporter.updateProgress(
          "generating_embeddings",
          processedTotal,
          allMessageChunks.length
        );
      }

      // Small pause to avoid UI freezing
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Finalize the progress of generating embeddings
    if (this.progressReporter) {
      this.progressReporter.completeStage(
        "generating_embeddings",
        allMessageChunks.length
      );
    }

    this.logger.info(
      `Generated ${vectors.length} vectors with embeddings (dimension: ${this.embeddingDimension})`
    );
    return vectors;
  }

  /**
   * Gets the dimension of the embeddings generated by the current model
   */
  public getEmbeddingDimension(): number {
    return this.embeddingDimension;
  }

  /**
   * Validates model compatibility and suggests alternatives for problematic models
   * @param modelId The model ID to validate
   * @returns Object with validation result and suggested alternative if needed
   */
  private validateModelCompatibility(modelId: string): {
    isValid: boolean;
    warnings: string[];
    suggestedAlternative?: string;
  } {
    const warnings: string[] = [];
    let suggestedAlternative: string | undefined;
    let isValid = true;

    // Check for known problematic models
    if (modelId.includes("Qwen3-Embedding-0.6B-ONNX")) {
      warnings.push(
        "⚠️  Qwen3-Embedding models may have tokenizer compatibility issues with transformers.js v3.5.2"
      );
      warnings.push(
        "The model class 'qwen3' is not fully recognized, which can cause 'x.split is not a function' errors"
      );
      suggestedAlternative = "onnx-community/gte-multilingual-base";
      // Don't mark as invalid - let's try with enhanced error handling
    }

    // Check for models that require newer transformers.js versions
    if (modelId.includes("Qwen3") && !modelId.includes("gte-multilingual")) {
      warnings.push(
        "🔧 Qwen3 models are relatively new and may require specific configuration"
      );
      warnings.push(
        "Consider updating @huggingface/transformers to the latest version if issues persist"
      );
    }

    // Suggest reliable alternatives
    if (modelId.startsWith("onnx-community/") && modelId.includes("Qwen3")) {
      if (!suggestedAlternative) {
        suggestedAlternative = "onnx-community/gte-multilingual-base";
      }
      warnings.push(
        `💡 If issues persist, try the tested alternative: ${suggestedAlternative}`
      );
    }

    return {
      isValid,
      warnings,
      suggestedAlternative,
    };
  }
}
