// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IEmbeddingService } from "../../components/context/deepgram/interfaces/openai/IEmbeddingService";
import { getOption, STORAGE_KEYS } from "../StorageService";

const ALLOWED_EMBEDDERS = [
  "onnx-community/Qwen3-Embedding-0.6B-ONNX",
  "onnx-community/gte-multilingual-base",
] as const;
type AllowedEmbedderId = (typeof ALLOWED_EMBEDDERS)[number];

export class HuggingFaceEmbeddingService implements IEmbeddingService {
  private embedder: any = null;
  private modelId: AllowedEmbedderId | null = null;
  private initialized = false;

  constructor() {
    // Initialize environment using centralized configuration
    this.initializeEnvironment().catch((error) => {
      console.error("[HFE] Environment initialization failed:", error);
    });
  }

  /**
   * Initialize transformers.js environment using centralized configuration
   */
  private async initializeEnvironment() {
    if (this.initialized) return;

    try {
      const { initializeTransformersEnvironment } = await import(
        "../../utils/transformersEnvironment"
      );
      await initializeTransformersEnvironment();

      this.initialized = true;
      console.log(
        "✅ [HFE] Environment initialized using centralized configuration"
      );
    } catch (error) {
      console.error(
        "❌ [HFE] Failed to initialize transformers environment:",
        error
      );
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.embedder !== null;
  }

  async initialize(config?: Record<string, any>): Promise<boolean> {
    await this.loadModel(
      getOption(STORAGE_KEYS.HF_EMBEDDING_MODEL) as AllowedEmbedderId
    );
    return true;
  }

  /** Carrega UM dos dois modelos de embedding permitidos */
  async loadModel(
    modelId: AllowedEmbedderId,
    device: "webgpu" | "wasm" = "webgpu"
  ) {
    // Ensure environment is initialized before loading models
    if (!this.initialized) {
      await this.initializeEnvironment();
    }

    if (!ALLOWED_EMBEDDERS.includes(modelId)) {
      throw new Error(`Embedder não suportado: ${modelId}`);
    }
    if (this.modelId === modelId && this.embedder) return;

    // Use centralized model loading configuration
    const { loadModelWithOptimalConfig } = await import(
      "../../utils/transformersEnvironment"
    );
    this.embedder = await loadModelWithOptimalConfig(
      modelId,
      "feature-extraction",
      {
        device,
        dtype: "fp32",
      }
    );
    this.modelId = modelId;
  }

  /** Gera embedding de um texto */
  async createEmbedding(text: string): Promise<number[]> {
    const modelId = this.modelId ?? ALLOWED_EMBEDDERS[0];
    await this.loadModel(modelId);
    const output = await this.embedder(text, { pooling: "mean" });
    return Array.isArray(output) ? (output[0] as number[]) : [];
  }

  /** Gera embeddings em batch */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const modelId = this.modelId ?? ALLOWED_EMBEDDERS[0];
    await this.loadModel(modelId);
    const outputs = await Promise.all(
      texts.map((t) => this.embedder(t, { pooling: "mean" }))
    );
    return outputs.map((o) => (Array.isArray(o) ? (o[0] as number[]) : []));
  }
}
