// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { getOption, STORAGE_KEYS } from "../StorageService";

// só os cinco modelos que você quer suportar
export const SUPPORTED_HF_BROWSER_MODELS = [
  "onnx-community/Llama-3.2-3B-Instruct-onnx-web",
  "onnx-community/Qwen3-1.7B-ONNX",
  "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
  "onnx-community/Phi-3.5-mini-instruct-onnx-web",
  "onnx-community/gemma-3-1b-it-ONNX",
] as const;

export type HuggingFaceLocalOptions = {
  model?: (typeof SUPPORTED_HF_BROWSER_MODELS)[number];
  maxTokens?: number;
  temperature?: number;
  dtype?: "q4" | "q4f16" | "q8" | "fp32" | "fp16"; // Ordered by performance vs. quality
  device?: "webgpu" | "wasm" | "auto";
  forceReload?: boolean; // Force reload model even if already loaded
};

export class HuggingFaceLocalService {
  private generator: any = null;
  private currentModel: string | null = null;
  private initialized = false;
  private isLoading = false;

  constructor() {
    // Initialize environment asynchronously
    this.initializeEnvironment().catch((error) => {
      console.error("[HFS] Environment initialization failed:", error);
    });
  }

  /**
   * Initialize transformers.js environment using centralized configuration
   */
  private async initializeEnvironment() {
    if (this.initialized) return;

    try {
      console.log("[HFS] Initializing transformers.js environment...");

      // Use the centralized transformers environment configuration
      const { initializeTransformersEnvironment } = await import(
        "../../utils/transformersEnvironment"
      );
      await initializeTransformersEnvironment();

      this.initialized = true;
      console.log("✅ [HFS] Environment initialized successfully");
    } catch (error) {
      console.error(
        "❌ [HFS] Failed to initialize transformers environment:",
        error
      );
      throw new Error(
        `Environment initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Load model using centralized configuration with enhanced error handling
   */
  async loadModel(opts: {
    modelId: string;
    device: HuggingFaceLocalOptions["device"];
    dtype: HuggingFaceLocalOptions["dtype"];
    forceReload?: boolean;
  }) {
    const { modelId, device, dtype, forceReload } = opts;

    // Prevent concurrent loading
    if (this.isLoading) {
      console.log("[HFS] Model loading already in progress, waiting...");
      return;
    }

    // Check if model is already loaded
    if (this.currentModel === modelId && this.generator && !forceReload) {
      console.log(`[HFS] Model ${modelId} already loaded`);
      return;
    }

    // Validate model is supported
    if (!SUPPORTED_HF_BROWSER_MODELS.includes(modelId as any)) {
      throw new Error(
        `Unsupported model: ${modelId}. Supported models: ${SUPPORTED_HF_BROWSER_MODELS.join(
          ", "
        )}`
      );
    }

    // Ensure environment is initialized
    if (!this.initialized) {
      await this.initializeEnvironment();
    }

    this.isLoading = true;
    console.log(
      `[HFS] Loading model: ${modelId} with device: ${device}, dtype: ${dtype}`
    );

    try {
      // Clean up previous model if exists
      if (this.generator && forceReload) {
        await this.dispose();
      }

      // Use loadModelWithOptimalConfig from centralized configuration
      const { loadModelWithOptimalConfig } = await import(
        "../../utils/transformersEnvironment"
      );

      const additionalOptions = {
        // Enhanced progress callback for better user feedback
        progress_callback: (data: any) => {
          if (data.status === "downloading") {
            console.log(
              `[HFS] Downloading: ${data.name || data.file} - ${Math.round(
                data.progress || 0
              )}%`
            );
          } else if (data.status === "loading") {
            console.log(`[HFS] Loading: ${data.name || data.file}`);
          } else if (data.status === "ready") {
            console.log(`[HFS] Ready: ${data.name || data.file}`);
          }
        },

        // Force specific device and dtype if provided
        ...(device !== "auto" && { device }),
        ...(dtype && { dtype }),

        // Enhanced session options for better performance
        session_options: {
          logSeverityLevel: 3, // Reduce logging noise
          graphOptimizationLevel: "all",
          enableMemPattern: true,
          enableCpuMemArena: true,
          // Execution providers in order of preference
          executionProviders:
            device === "webgpu" ? ["webgpu", "webgl", "wasm"] : ["wasm"],
        },

        // Cache configuration - allow downloads but prefer cache
        cache_dir: undefined, // Use environment default
        local_files_only: false, // Allow downloads if not in cache
        use_auth_token: false,

        // Retry configuration for network issues
        max_retries: 3,
        retry_delay: 1000, // 1 second delay between retries
      };

      console.log(`[HFS] Loading with configuration:`, {
        modelId,
        device,
        dtype,
        cache_dir: "using environment default",
        local_files_only: additionalOptions.local_files_only,
      });

      this.generator = await loadModelWithOptimalConfig(
        modelId,
        "text-generation",
        additionalOptions
      );

      this.currentModel = modelId;
      console.log(
        `[HFS] ✅ Model loaded successfully: ${modelId} (${device}/${dtype})`
      );
    } catch (error) {
      console.error(`[HFS] ❌ Failed to load model ${modelId}:`, error);

      // Enhanced error messages with specific guidance
      if (error instanceof Error) {
        if (error.message.includes("<!DOCTYPE")) {
          throw new Error(
            `Model loading failed: Server returned HTML instead of model files. ` +
              `This usually means:\n` +
              `1. The model "${modelId}" doesn't exist or isn't available\n` +
              `2. Network connectivity issues\n` +
              `3. HuggingFace server issues\n` +
              `Try a different model or check your internet connection.`
          );
        } else if (error.message.includes("CORS")) {
          throw new Error(
            `CORS error loading model ${modelId}. This may be due to:\n` +
              `1. Network configuration issues\n` +
              `2. Proxy server problems\n` +
              `3. Browser security settings\n` +
              `Try refreshing the application or check network settings.`
          );
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("NetworkError")
        ) {
          throw new Error(
            `Network error loading model ${modelId}. Please:\n` +
              `1. Check your internet connection\n` +
              `2. Verify the model exists on HuggingFace\n` +
              `3. Try again in a few moments\n` +
              `4. Consider using a smaller model for testing`
          );
        } else if (
          error.message.includes("quota") ||
          error.message.includes("storage")
        ) {
          throw new Error(
            `Storage error loading model ${modelId}. This may be due to:\n` +
              `1. Insufficient disk space\n` +
              `2. Cache directory permissions\n` +
              `3. Storage quota exceeded\n` +
              `Try clearing cache or freeing up disk space.`
          );
        }
      }

      throw new Error(
        `Failed to load model "${modelId}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate text with enhanced error handling and streaming support
   */
  async generate(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    opts: HuggingFaceLocalOptions = {}
  ): Promise<string> {
    const modelId =
      opts.model ||
      (getOption(STORAGE_KEYS.HF_MODEL) as string) ||
      SUPPORTED_HF_BROWSER_MODELS[0]; // Default to smallest model

    const device = opts.device || "auto";
    const dtype = opts.dtype || "q4"; // Default to best performance/quality balance

    console.log(`[HFS] Generating text with model: ${modelId}`);

    try {
      await this.loadModel({
        modelId,
        device,
        dtype,
        forceReload: opts.forceReload,
      });

      if (!this.generator) {
        throw new Error("Model not loaded properly");
      }

      // Enhanced generation parameters
      const generationOptions = {
        max_new_tokens: opts.maxTokens ?? 256, // Increased default for better responses
        temperature: opts.temperature ?? 0.7,
        return_full_text: false,
        do_sample: true,
        top_p: 0.9, // Add nucleus sampling for better quality
        repetition_penalty: 1.1, // Reduce repetitive outputs
        pad_token_id: 50256, // Common padding token
        eos_token_id: 50256, // End of sequence token
      };

      console.log(`[HFS] Generating with options:`, generationOptions);

      // Generate text with timeout protection
      const generateWithTimeout = (timeout: number = 30000) => {
        return Promise.race([
          this.generator(messages, generationOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Generation timeout")), timeout)
          ),
        ]);
      };

      const result: any[] = await generateWithTimeout();

      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error("No generation result received");
      }

      const generatedText = result[0]?.generated_text;
      if (typeof generatedText !== "string") {
        throw new Error("Invalid generation result format");
      }

      const cleanedText = generatedText.trim();
      console.log(`[HFS] ✅ Generated ${cleanedText.length} characters`);

      return cleanedText;
    } catch (error) {
      console.error(`[HFS] ❌ Generation error:`, error);

      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          throw new Error(
            "Text generation timed out. Try using a smaller model or reducing max_tokens."
          );
        } else if (
          error.message.includes("memory") ||
          error.message.includes("OOM")
        ) {
          throw new Error(
            "Out of memory during generation. Try using a quantized model (q4/q8) or reducing max_tokens."
          );
        }
      }

      throw new Error(
        `Text generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get current model status
   */
  getStatus(): {
    initialized: boolean;
    currentModel: string | null;
    isLoading: boolean;
  } {
    return {
      initialized: this.initialized,
      currentModel: this.currentModel,
      isLoading: this.isLoading,
    };
  }

  /**
   * Dispose of current model and free resources
   */
  async dispose() {
    console.log("[HFS] Disposing model and cleaning up resources...");

    if (this.generator?.dispose) {
      try {
        await this.generator.dispose();
        console.log("[HFS] ✅ Model disposed successfully");
      } catch (error) {
        console.warn("[HFS] ⚠️ Error disposing model:", error);
      }
    }

    this.generator = null;
    this.currentModel = null;
    this.isLoading = false;
  }

  /**
   * Force reload the current model (useful for troubleshooting)
   */
  async forceReload(): Promise<void> {
    if (this.currentModel) {
      const currentModelId = this.currentModel;
      await this.dispose();
      // Will reload on next generate() call
      console.log(`[HFS] Forced reload prepared for model: ${currentModelId}`);
    }
  }
}
