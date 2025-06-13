// services/huggingface/HuggingFaceClientService.ts
// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { HuggingFaceEmbeddingService } from "../../../../../../services/huggingface/HuggingFaceEmbeddingService";
import {
  HuggingFaceLocalService,
  SUPPORTED_HF_BROWSER_MODELS,
} from "../../../../../../services/huggingface/HuggingFaceLocalService";
import { IClientManagementService } from "../../../interfaces/openai/IClientManagementService";
import { LoggingUtils } from "../../../utils/LoggingUtils";
export class HuggingFaceClientService implements IClientManagementService {
  private huggingFaceLocal: HuggingFaceLocalService | null = null;
  private embeddingService: HuggingFaceEmbeddingService | null = null;
  private configuration: Record<string, any> = {};
  // Guard flags to prevent concurrent/double initialization
  private initializing = false;
  private initialized = false;

  initializeClient(_apiKey: string): void {
    // dispara a inicialização assíncrona mas não bloqueante
    this.initializeHuggingFaceClient().catch((err) => {
      LoggingUtils.logError(`Failed to initialize HuggingFace client: ${err}`);
    });
  }

  private async initializeHuggingFaceClient(config?: Record<string, any>) {
    this.configuration = config || {};

    LoggingUtils.logInfo(
      "🔧 [HFC] Initializing HuggingFace client with optimized configuration..."
    );

    //    await initializeTransformersEnvironment();

    // 1) cria o serviço local
    this.huggingFaceLocal = new HuggingFaceLocalService();

    // 2) carrega o modelo de texto com fallback para dtype disponível
    const textModel =
      getOption(STORAGE_KEYS.HF_MODEL) || SUPPORTED_HF_BROWSER_MODELS[0];

    // Validate that the model is supported
    if (!SUPPORTED_HF_BROWSER_MODELS.includes(textModel as any)) {
      LoggingUtils.logWarning(
        `[HFC] Model ${textModel} not in supported list, using default`
      );
      const defaultModel = SUPPORTED_HF_BROWSER_MODELS[0];
      LoggingUtils.logInfo(
        `[HFC] Using default supported model: ${defaultModel}`
      );
    }

    // Load model using default configuration - let model-specific configs handle optimization
    try {
      LoggingUtils.logInfo(
        `[HFC] Loading ${textModel} with model-specific configuration...`
      );

      await this.huggingFaceLocal.loadModel({
        modelId: textModel,
        device: "wasm", // Use wasm for better compatibility
        dtype: "fp32", // Use fp32 as default - model-specific configs will take precedence
      });

      LoggingUtils.logInfo(
        `✅ [HFC] Model loaded successfully with optimized configuration`
      );
    } catch (err) {
      LoggingUtils.logError(`❌ [HFC] Failed to load model: ${err}`);

      // Log specific error types for debugging
      if (err instanceof Error) {
        if (err.message.includes("<!DOCTYPE")) {
          LoggingUtils.logError(
            `[HFC] HTML response detected - likely network/CDN issue`
          );
        } else if (err.message.includes("CORS")) {
          LoggingUtils.logError(`[HFC] CORS issue detected`);
        } else if (err.message.includes("fetch")) {
          LoggingUtils.logError(`[HFC] Network fetch issue detected`);
        }
      }

      throw new Error(
        `Failed to load model ${textModel}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }

    // 3) inicializa o serviço de embeddings
    this.embeddingService = new HuggingFaceEmbeddingService();
    // (você pode chamar aqui this.embeddingService.initialize({ modelId: … }) se preciso)

    LoggingUtils.logInfo(
      `✅ [HFC] HuggingFace client initialized with text model ${textModel}`
    );
  }

  async loadApiKey(): Promise<string> {
    await this.loadConfiguration();
    return "huggingface-local";
  }

  private async loadConfiguration(): Promise<Record<string, any>> {
    const textModel = getOption(STORAGE_KEYS.HF_MODEL);
    const embedModel = getOption(STORAGE_KEYS.HF_EMBEDDING_MODEL);
    this.configuration = {
      defaultTextModel: textModel,
      defaultEmbeddingModel: embedModel,
    };
    return this.configuration;
  }

  async ensureClient(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initializing) {
      // Wait until current initialization finishes
      while (this.initializing) {
        await new Promise((res) => setTimeout(res, 100));
      }
      return this.initialized;
    }

    this.initializing = true;
    try {
      await this.loadConfiguration();
      await this.initializeHuggingFaceClient(this.configuration);
      this.initialized = true;
      return true;
    } catch (err) {
      LoggingUtils.logError(
        `❌ [HFC] Failed to ensure HuggingFace client: ${err}`
      );
      return false;
    } finally {
      this.initializing = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getClient(): HuggingFaceLocalService {
    if (!this.huggingFaceLocal) {
      throw new Error("HuggingFace client not initialized");
    }
    return this.huggingFaceLocal;
  }

  async createEmbedding(text: string): Promise<number[]> {
    await this.ensureClient();
    if (!this.embeddingService) {
      throw new Error("Embedding service not initialized");
    }
    return await this.embeddingService.createEmbedding(text);
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    await this.ensureClient();
    if (!this.embeddingService) {
      throw new Error("Embedding service not initialized");
    }
    return Promise.all(
      texts.map((t) => this.embeddingService!.createEmbedding(t))
    );
  }
}
