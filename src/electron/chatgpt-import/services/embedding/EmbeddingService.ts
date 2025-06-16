// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IEmbeddingService } from "../../../../components/context/deepgram/interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../../../components/context/deepgram/interfaces/openai/IOpenAIService";
import { OllamaEmbeddingService } from "../../../../components/context/deepgram/services/ollama/OllamaEmbeddingService";
import { HuggingFaceEmbeddingService } from "../../../../services/huggingface/HuggingFaceEmbeddingService";
import { ModeService, OrchOSModeEnum } from "../../../../services/ModeService";
import { getOption, STORAGE_KEYS } from "../../../../services/StorageService";
import { getModelDimensions } from "../../../../utils/EmbeddingUtils";
import { MessageChunk, PineconeVector } from "../../interfaces/types";
import { Logger } from "../../utils/logging";
import { ProgressReporter } from "../../utils/progressReporter";

/**
 * Service for generating embeddings
 * Switches between Ollama (Advanced mode) and HuggingFace (Basic mode)
 * Both modes use DuckDB for storage
 */
export class EmbeddingService {
  private openAIService: IOpenAIService | null | undefined;
  private embeddingService: IEmbeddingService;
  private logger: Logger;
  private progressReporter?: ProgressReporter;
  private embeddingDimension: number = 1536; // Default dimension, will be updated dynamically
  private isBasicMode: boolean;

  constructor(
    openAIService: IOpenAIService | null | undefined,
    logger?: Logger,
    progressReporter?: ProgressReporter,
    applicationMode?: "basic" | "advanced"
  ) {
    this.openAIService = openAIService;
    this.logger = logger || new Logger("[EmbeddingService]");
    this.progressReporter = progressReporter;

    // Use provided applicationMode or detect from ModeService
    let currentMode: OrchOSModeEnum;
    if (applicationMode) {
      // Convert string to enum
      if (applicationMode.toLowerCase() === "basic") {
        currentMode = OrchOSModeEnum.BASIC;
      } else if (applicationMode.toLowerCase() === "advanced") {
        currentMode = OrchOSModeEnum.ADVANCED;
      } else {
        this.logger.warn(
          `🟡 [EmbeddingService] Unknown applicationMode: "${applicationMode}", falling back to ModeService`
        );
        currentMode = ModeService.getMode();
      }
      this.logger.info(
        `🔧 [EmbeddingService] Using applicationMode from IPC: "${applicationMode}" -> ${currentMode}`
      );
    } else {
      currentMode = ModeService.getMode();
      this.logger.info(
        `🔧 [EmbeddingService] No applicationMode provided, using ModeService: ${currentMode}`
      );
    }

    this.isBasicMode = currentMode === OrchOSModeEnum.BASIC;

    this.logger.info(`🔍 [EmbeddingService] === MODE DETECTION DEBUG ===`);
    this.logger.info(
      `🔍 [EmbeddingService] Input applicationMode: "${applicationMode}"`
    );
    this.logger.info(
      `🔍 [EmbeddingService] Resolved OrchOSModeEnum: "${currentMode}"`
    );
    this.logger.info(
      `🔍 [EmbeddingService] OrchOSModeEnum.BASIC: "${OrchOSModeEnum.BASIC}"`
    );
    this.logger.info(
      `🔍 [EmbeddingService] OrchOSModeEnum.ADVANCED: "${OrchOSModeEnum.ADVANCED}"`
    );
    this.logger.info(
      `🔍 [EmbeddingService] Final isBasicMode: ${this.isBasicMode}`
    );
    this.logger.info(
      `🔍 [EmbeddingService] Final selected mode: ${
        this.isBasicMode ? "BASIC (HuggingFace)" : "ADVANCED (Ollama)"
      }`
    );

    // Check storage for debugging
    const storageMode =
      typeof window !== "undefined"
        ? window.localStorage?.getItem("APPLICATION_MODE") || "undefined"
        : "not-available-in-main-process";
    this.logger.info(
      `🔍 [EmbeddingService] Storage APPLICATION_MODE: "${storageMode}"`
    );
    this.logger.info(`�� [EmbeddingService] === END MODE DEBUG ===`);

    this.embeddingService = this.createEmbeddingService();

    // Only subscribe to mode changes if no applicationMode was provided
    // (to avoid conflicts between IPC and ModeService)
    if (!applicationMode) {
      // Subscribe to mode changes to update embedding service when needed
      ModeService.onModeChange((newMode: OrchOSModeEnum) => {
        this.logger.info(
          `🔄 [EmbeddingService] Mode change detected: ${newMode}`
        );
        this.updateModeAndService(newMode);
      });
    } else {
      this.logger.info(
        `🔧 [EmbeddingService] Skipping ModeService listener (using IPC mode: ${applicationMode})`
      );
    }
  }

  /**
   * Updates the embedding dimension based on the embedding service
   * @param service The embedding service to get dimension from
   */
  private updateEmbeddingDimension(service: IEmbeddingService): void {
    // Check if the service has a method to get embedding dimension
    if (typeof (service as any).getEmbeddingDimension === "function") {
      try {
        this.embeddingDimension = (service as any).getEmbeddingDimension();
        this.logger.info(
          `Using dynamic embedding dimension from service: ${this.embeddingDimension}`
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to get embedding dimension dynamically: ${error}`
        );
      }
    }

    // If service doesn't provide the dimension or there was an error, use the utility function
    if (this.isBasicMode) {
      const defaultHFModelName =
        getOption(STORAGE_KEYS.HF_EMBEDDING_MODEL) || "";
      this.embeddingDimension = getModelDimensions(defaultHFModelName);
    } else {
      const defaultOllamaModel =
        getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL) || "";
      this.embeddingDimension = getModelDimensions(defaultOllamaModel);
    }

    this.logger.info(
      `Using embedding dimension from utility for mode ${
        this.isBasicMode ? "BASIC" : "ADVANCED"
      }: ${this.embeddingDimension}`
    );
  }

  /**
   * Creates the appropriate embedding service based on mode
   */
  private createEmbeddingService(): IEmbeddingService {
    if (this.isBasicMode) {
      this.logger.info(
        `[EmbeddingService] Creating HuggingFaceEmbeddingService for Basic mode`
      );
      const service = new HuggingFaceEmbeddingService();
      // Use the service's method to get the embedding dimension
      this.updateEmbeddingDimension(service);
      return service;
    } else {
      // In advanced mode, use Ollama with the selected model
      const ollamaModel = getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL);
      this.logger.info(
        `[EmbeddingService] Creating OllamaEmbeddingService with model: ${
          ollamaModel || "default"
        } for Advanced mode`
      );

      if (!this.openAIService) {
        this.logger.error(
          "[EmbeddingService] OpenAI service not available for OllamaEmbeddingService"
        );
        // Fallback to HuggingFace if Ollama service is not available
        const service = new HuggingFaceEmbeddingService();
        this.updateEmbeddingDimension(service);
        return service;
      }

      const service = new OllamaEmbeddingService(this.openAIService, {
        model: ollamaModel,
      });
      // Use the service's method to get the embedding dimension
      this.updateEmbeddingDimension(service);
      return service;
    }
  }

  /**
   * Initializes the embedding service (Ollama for Advanced mode, HuggingFace for Basic mode)
   */
  public async ensureOpenAIInitialized(): Promise<boolean> {
    if (this.isBasicMode) {
      this.logger.info(
        "✅ Basic mode detected - using HuggingFace embeddings (no Ollama required)"
      );
      return true; // In basic mode, we don't need Ollama
    }

    this.logger.info("Verifying Ollama service initialization...");

    if (!this.openAIService) {
      this.logger.error(
        "FATAL ERROR: Ollama service not provided - verify if the service is correctly injected"
      );
      return false;
    }

    // Verify if the service is already initialized
    const isInitialized = this.openAIService.isInitialized();
    this.logger.info(
      `Status of Ollama initialization: ${
        isInitialized ? "Already initialized" : "Not initialized"
      }`
    );

    if (isInitialized) {
      return true;
    }

    this.logger.warn(
      "Ollama client not initialized. Attempting to initialize via loadApiKey()..."
    );

    try {
      // Use the loadApiKey method from the service itself
      this.logger.info("Calling ollamaService.loadApiKey()...");
      await this.openAIService.loadApiKey();

      // Verify if it was initialized
      if (this.openAIService.isInitialized()) {
        this.logger.success(
          "Ollama client initialized successfully via loadApiKey()!"
        );
        return true;
      }

      // If it was not initialized, check if there is an ensureOpenAIClient method
      if (this.openAIService.ensureOpenAIClient) {
        this.logger.info(
          "Attempting to initialize via ensureOllamaClient()..."
        );
        const initialized = await this.openAIService.ensureOpenAIClient();
        if (initialized) {
          this.logger.success(
            "Ollama client initialized successfully via ensureOllamaClient()!"
          );
          return true;
        }
      }

      this.logger.error(
        "Failed to initialize Ollama client. Initialization attempts failed."
      );
      return false;
    } catch (error) {
      this.logger.error("Error initializing Ollama client:", error);
      return false;
    }
  }

  /**
   * Generates embeddings for text chunks using the appropriate service (Ollama or HuggingFace)
   */
  public async generateEmbeddingsForChunks(
    batches: MessageChunk[][],
    allMessageChunks: MessageChunk[]
  ): Promise<PineconeVector[]> {
    // Ensure we have the correct embedding dimension from the service
    this.updateEmbeddingDimension(this.embeddingService);

    // Start the progress of generating embeddings
    if (this.progressReporter) {
      this.progressReporter.startStage(
        "generating_embeddings",
        allMessageChunks.length
      );
    }

    // Verify if we have the embedding service available
    const embeddingInitialized = await this.ensureOpenAIInitialized();
    this.logger.info(
      `Status of embedding service for generation: ${
        embeddingInitialized ? "Initialized" : "Not initialized"
      }`
    );

    if (!embeddingInitialized) {
      if (this.isBasicMode) {
        throw new Error(
          "HuggingFace embedding service not initialized in Basic mode."
        );
      } else {
        throw new Error(
          "Ollama service not initialized. Ensure Ollama is running and properly configured."
        );
      }
    }

    const vectors: PineconeVector[] = [];
    let embeddingsProcessed = 0;

    let processedTotal = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.logger.info(
        `Processing batch ${batchIndex + 1}/${batches.length} with ${
          batch.length
        } messages`
      );

      // Prepare the texts for the current batch
      const batchTexts = batch.map((chunk) => chunk.content);

      // Generate embeddings for the entire batch using the appropriate service
      let batchEmbeddings: number[][] = [];

      try {
        if (this.isBasicMode) {
          // Use HuggingFace service for batch embeddings
          this.logger.info(
            `[BASIC MODE] Generating embeddings with HuggingFace for batch ${
              batchIndex + 1
            }`
          );
          batchEmbeddings = await this.embeddingService.createEmbeddings(
            batchTexts
          );
          this.logger.success(
            `✅ HuggingFace embeddings generated successfully for batch ${
              batchIndex + 1
            }/${batches.length}`
          );
        } else {
          // Use Ollama service for batch embeddings
          this.logger.info(
            `[ADVANCED MODE] Generating embeddings with Ollama for batch ${
              batchIndex + 1
            }`
          );
          if (this.openAIService && this.openAIService.createEmbeddings) {
            // If the API supports batch embeddings
            batchEmbeddings = await this.openAIService.createEmbeddings(
              batchTexts
            );
            this.logger.success(
              `✅ Ollama embeddings generated successfully for batch ${
                batchIndex + 1
              }/${batches.length}`
            );
          } else {
            // Fallback: generate embeddings one by one
            this.logger.warn(
              "API does not support batch embeddings, processing sequentially..."
            );
            batchEmbeddings = await Promise.all(
              batchTexts.map(async (text) => {
                try {
                  return await this.openAIService!.createEmbedding(text);
                } catch (err) {
                  this.logger.error(
                    `Error generating embedding for text: ${text.substring(
                      0,
                      50
                    )}...`,
                    err
                  );
                  throw new Error(
                    `Failed to generate embedding: ${
                      err instanceof Error ? err.message : String(err)
                    }`
                  );
                }
              })
            );
          }
        }
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
              imported_from: "chatgpt",
              imported_at: Date.now(),
              messageId: msg.id || vectorId, // Ensure it always has a valid messageId

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

      // Small pause to avoid API throttling
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

    this.logger.info(`Generated ${vectors.length} vectors with embeddings`);
    return vectors;
  }

  private updateModeAndService(newMode: OrchOSModeEnum): void {
    const oldMode = this.isBasicMode;
    this.isBasicMode = newMode === OrchOSModeEnum.BASIC;

    this.logger.info(`🔄 [EmbeddingService] === MODE UPDATE DEBUG ===`);
    this.logger.info(`🔄 [EmbeddingService] Previous isBasicMode: ${oldMode}`);
    this.logger.info(`🔄 [EmbeddingService] New mode from event: "${newMode}"`);
    this.logger.info(
      `🔄 [EmbeddingService] New isBasicMode: ${this.isBasicMode}`
    );
    this.logger.info(
      `🔄 [EmbeddingService] Mode actually changed: ${
        oldMode !== this.isBasicMode
      }`
    );
    this.logger.info(
      `🔄 [EmbeddingService] Final selected mode: ${
        this.isBasicMode ? "BASIC (HuggingFace)" : "ADVANCED (Ollama)"
      }`
    );

    if (oldMode !== this.isBasicMode) {
      this.logger.info(
        `🔄 [EmbeddingService] Creating new embedding service...`
      );
      this.embeddingService = this.createEmbeddingService();
      this.logger.info(
        `🔄 [EmbeddingService] New embedding service created successfully`
      );
    } else {
      this.logger.info(
        `🔄 [EmbeddingService] Mode unchanged, keeping existing service`
      );
    }

    this.logger.info(`🔄 [EmbeddingService] === END MODE UPDATE DEBUG ===`);
  }
}
