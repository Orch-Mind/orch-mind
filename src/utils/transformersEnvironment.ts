// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { env, pipeline } from "@huggingface/transformers";

// TypeScript declarations for browser APIs that may not be available
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<any>;
    };
  }

  interface Performance {
    memory?: {
      totalJSHeapSize: number;
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  // Window interface extends the existing ElectronAPI declaration
}

/**
 * Centralized transformers.js environment configuration for Electron applications
 * Handles cache directories, offline support, and optimal model loading
 */
export async function initializeTransformersEnvironment(): Promise<void> {
  console.log(
    "🔧 [TransformersEnv] Initializing transformers.js environment for Electron..."
  );

  try {
    // Simplified environment configuration for Electron compatibility
    const isElectron = typeof window !== "undefined" && window.electronAPI;

    if (isElectron) {
      // Electron-specific configuration
      console.log("🗂️ [TransformersEnv] Configuring for Electron environment");

      // Use browser cache for models (simpler and more reliable)
      env.useBrowserCache = true;
      env.useFSCache = false; // Disable filesystem cache to avoid permission issues
      env.allowRemoteModels = true;
      env.allowLocalModels = true;

      // Configure remote model paths
      env.remoteHost = "https://huggingface.co";
      env.remotePathTemplate = "{model}/resolve/{revision}/";
    } else {
      // Web environment configuration
      console.log("🗂️ [TransformersEnv] Configuring for web environment");
      env.useBrowserCache = true;
      env.useFSCache = false;
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
    }

    // Simple fetch configuration without complex interception
    console.log(
      "✅ [TransformersEnv] Basic environment initialized successfully"
    );
  } catch (error) {
    console.error(
      "❌ [TransformersEnv] Environment initialization failed:",
      error
    );
    throw error;
  }
}

/**
 * Enhanced fetch interception for better model loading and caching
 */
function setupEnhancedFetchInterception(): void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();

    // Enhanced HuggingFace request handling
    if (url.includes("huggingface.co")) {
      console.log("🔄 [TransformersEnv] Processing HuggingFace request:", url);

      // Add proper headers for better compatibility
      const enhancedInit = {
        ...init,
        headers: {
          ...init?.headers,
          "User-Agent": "transformers.js/electron",
          Accept: "application/json, application/octet-stream, */*",
          "Cache-Control": "max-age=86400", // 24 hours cache
        },
      };

      // Try proxy first in development mode
      if (window.location.hostname === "localhost") {
        try {
          const proxiedUrl = url.replace(
            "https://huggingface.co",
            "/api/huggingface"
          );
          const response = await originalFetch(proxiedUrl, enhancedInit);

          if (response.ok) {
            console.log("✅ [TransformersEnv] Proxy request successful");
            return response;
          }
        } catch (proxyError) {
          console.warn("⚠️ [TransformersEnv] Proxy failed, trying direct");
        }
      }

      // Direct request with enhanced error handling
      try {
        const response = await originalFetch(input, enhancedInit);

        // Check for HTML responses (common error in model loading)
        if (response.headers.get("content-type")?.includes("text/html")) {
          console.error(
            "❌ [TransformersEnv] Received HTML instead of model data"
          );
          throw new Error(
            "Server returned HTML instead of model data. Check model availability and network connection."
          );
        }

        return response;
      } catch (networkError) {
        console.error("❌ [TransformersEnv] Network error:", networkError);
        throw new Error(
          `Failed to load model file: ${
            networkError instanceof Error
              ? networkError.message
              : "Unknown network error"
          }`
        );
      }
    }

    // Handle CDN requests similarly
    if (url.includes("cdn-lfs.huggingface.co")) {
      console.log("🔄 [TransformersEnv] Processing CDN request:", url);

      if (window.location.hostname === "localhost") {
        try {
          const proxiedUrl = url.replace(
            "https://cdn-lfs.huggingface.co",
            "/api/hf-cdn"
          );
          const response = await originalFetch(proxiedUrl, init);
          if (response.ok) return response;
        } catch (cdnError) {
          console.warn("⚠️ [TransformersEnv] CDN proxy failed");
        }
      }
    }

    // Default fetch with enhanced headers
    return originalFetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        "User-Agent": "transformers.js/electron",
      },
    });
  };
}

/**
 * Setup memory management for optimal performance
 */
function setupMemoryManagement(): void {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memoryInfo = (performance as any).memory;
    console.log(
      `🧠 [TransformersEnv] Available memory: ${Math.round(
        memoryInfo.totalJSHeapSize / 1024 / 1024
      )} MB`
    );
  }

  // Check for SharedArrayBuffer support
  if (typeof SharedArrayBuffer !== "undefined") {
    console.log("✅ [TransformersEnv] SharedArrayBuffer support detected");
  } else {
    console.warn(
      "⚠️ [TransformersEnv] SharedArrayBuffer not available - some optimizations disabled"
    );
  }
}

/**
 * Validate that the environment is properly configured
 */
async function validateEnvironmentSetup(): Promise<void> {
  // Check if cache directory is accessible
  if (env.cacheDir) {
    console.log(
      `🔍 [TransformersEnv] Cache directory configured: ${env.cacheDir}`
    );
  }

  // Check backend availability
  const capabilities = await checkTransformersCapabilities();
  console.log("🔧 [TransformersEnv] Capabilities:", capabilities);
}

/**
 * Check if the transformers environment is properly initialized
 */
export function checkTransformersEnvironment(): boolean {
  try {
    return !!(env.allowRemoteModels && env.cacheDir);
  } catch (error) {
    console.error("Environment check failed:", error);
    return false;
  }
}

/**
 * Get optimal device configuration based on available hardware
 */
export async function getOptimalDeviceConfig(): Promise<{
  device: "webgpu" | "wasm";
  dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
}> {
  try {
    // Check for WebGPU support
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log(
            "🎮 [TransformersEnv] WebGPU available, using GPU acceleration"
          );
          return { device: "webgpu", dtype: "fp16" };
        }
      } catch (error) {
        console.warn("⚠️ [TransformersEnv] WebGPU adapter request failed");
      }
    }

    // Fallback to WASM with quantization for better performance
    console.log("💻 [TransformersEnv] Using WASM with quantization");
    return { device: "wasm", dtype: "q4" };
  } catch (error) {
    console.error("Device config detection failed:", error);
    return { device: "wasm", dtype: "q4" };
  }
}

/**
 * Check available transformers.js capabilities
 */
export async function checkTransformersCapabilities(): Promise<{
  webgpu: boolean;
  webgl: boolean;
  sharedArrayBuffer: boolean;
  wasmThreads: boolean;
}> {
  const capabilities = {
    webgpu: false,
    webgl: false,
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    wasmThreads:
      typeof Worker !== "undefined" && navigator.hardwareConcurrency > 1,
  };

  // Check WebGPU
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      capabilities.webgpu = !!adapter;
    }
  } catch (error) {
    capabilities.webgpu = false;
  }

  // Check WebGL
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    capabilities.webgl = !!gl;
  } catch (error) {
    capabilities.webgl = false;
  }

  return capabilities;
}

/**
 * Load model with optimal configuration and enhanced error handling
 */
export async function loadModelWithOptimalConfig(
  modelId: string,
  task: string,
  additionalOptions: Record<string, any> = {}
): Promise<any> {
  console.log(
    `🚀 [TransformersEnv] Loading model: ${modelId} for task: ${task}`
  );

  try {
    // Ensure environment is initialized
    if (!checkTransformersEnvironment()) {
      await initializeTransformersEnvironment();
    }

    // Get optimal device configuration
    const optimalConfig = await getOptimalDeviceConfig();

    // Special configuration for Phi-3.5 models
    const isPhiModel = modelId.includes("Phi-3") || modelId.includes("phi-3");
    const isWebOptimizedOnnx =
      modelId.includes("onnx-web") || modelId.includes("onnx-community");
    let deviceConfig = optimalConfig;

    if (isPhiModel && isWebOptimizedOnnx) {
      // Phi-3.5 ONNX web models require specific WebGPU configuration
      deviceConfig = {
        device: "webgpu", // Force WebGPU for ONNX web models
        dtype: "q4f16" as const, // Use q4f16 as specified in HuggingFace docs
      };
      console.log(
        "🎯 [TransformersEnv] Using Phi-3.5 ONNX-web optimized configuration (WebGPU + q4f16)"
      );
    } else if (isWebOptimizedOnnx) {
      // Other ONNX web models also prefer WebGPU
      deviceConfig = {
        device: "webgpu",
        dtype: "q4f16" as const,
      };
      console.log(
        "🎯 [TransformersEnv] Using ONNX-web optimized configuration (WebGPU + q4f16)"
      );
    } else if (isPhiModel) {
      // Other Phi models work better with WASM
      deviceConfig = {
        device: "wasm", // Force WASM for regular Phi models
        dtype: "q4" as const, // Quantized for better performance
      };
      console.log(
        "🎯 [TransformersEnv] Using Phi-3.5 WASM optimized configuration"
      );
    }

    // Override device config if explicitly provided in additional options
    if (additionalOptions.device) {
      deviceConfig.device = additionalOptions.device;
      console.log(
        `🔧 [TransformersEnv] Device overridden to: ${additionalOptions.device}`
      );
    }
    if (additionalOptions.dtype) {
      deviceConfig.dtype = additionalOptions.dtype;
      console.log(
        `🔧 [TransformersEnv] Dtype overridden to: ${additionalOptions.dtype}`
      );
    }

    // Enhanced loading options with browser-compatible cache configuration
    const loadingOptions = {
      // Use optimal device configuration
      device: deviceConfig.device,
      dtype: deviceConfig.dtype,

      // Enhanced progress tracking
      progress_callback: (data: any) => {
        if (data.status === "progress") {
          console.log(
            `📥 [TransformersEnv] ${data.file}: ${Math.round(
              data.progress || 0
            )}%`
          );
        } else if (data.status === "downloading") {
          console.log(`⬇️ [TransformersEnv] Downloading: ${data.file}`);
        } else if (data.status === "loading") {
          console.log(`📋 [TransformersEnv] Loading: ${data.file}`);
        } else if (data.status === "ready") {
          console.log(`✅ [TransformersEnv] Ready: ${data.file || modelId}`);
        }
      },

      // Remove cache_dir to avoid filesystem cache issues
      local_files_only: false, // Allow downloading if not cached
      use_auth_token: false,

      // Specific configuration for ONNX models
      revision: additionalOptions.revision || "main",

      // Special handling for ONNX web models (onnx-community)
      ...(isWebOptimizedOnnx && {
        use_external_data_format: true, // Required for ONNX web models
      }),

      // Session options for better performance
      session_options: {
        logSeverityLevel: 3 as const, // Reduce logging noise
        graphOptimizationLevel: "all" as const,
        enableMemPattern: true,
        enableCpuMemArena: true,
        executionProviders:
          isPhiModel && isWebOptimizedOnnx
            ? ["webgpu"] // ONNX web models need WebGPU
            : isPhiModel
            ? ["wasm"] // Regular Phi models work better with WASM
            : ["webgpu", "webgl", "wasm"], // Preference order for other models
      },

      // Merge additional options (device and dtype will be overridden after)
      ...additionalOptions,
    };

    // Override critical configuration after merging to ensure they're not overwritten
    loadingOptions.device = deviceConfig.device;
    loadingOptions.dtype = deviceConfig.dtype;

    console.log(`🔧 [TransformersEnv] Loading with config:`, {
      modelId,
      device: loadingOptions.device,
      dtype: loadingOptions.dtype,
    });

    // Load the model with simplified error handling
    const model = await pipeline(task as any, modelId, loadingOptions);

    console.log(`✅ [TransformersEnv] Model loaded successfully: ${modelId}`);
    return model;
  } catch (error) {
    console.error(
      `❌ [TransformersEnv] Failed to load model ${modelId}:`,
      error
    );

    // Enhanced error messages for common issues
    if (error instanceof Error) {
      if (
        error.message.includes("<!DOCTYPE") ||
        error.message.includes("<html")
      ) {
        throw new Error(
          `Model loading failed: Server returned HTML instead of model data. Model "${modelId}" may not exist or there are network issues. Please verify the model ID is correct and accessible.`
        );
      } else if (error.message.includes("CORS")) {
        throw new Error(
          `CORS error loading model "${modelId}". Network configuration issue.`
        );
      } else if (
        error.message.includes("fetch") ||
        error.message.includes("404")
      ) {
        throw new Error(
          `Network error loading model "${modelId}". Check internet connection and verify the model exists on HuggingFace Hub.`
        );
      } else if (error.message.includes("cache")) {
        throw new Error(
          `Cache error loading model "${modelId}". Try clearing cache or checking disk space.`
        );
      } else if (
        error.message.includes("MountedFiles") ||
        error.message.includes("external data")
      ) {
        throw new Error(
          `ONNX model loading error for "${modelId}". This is likely a configuration issue with ONNX.js in the browser environment.`
        );
      }
    }

    throw new Error(
      `Failed to load model "${modelId}": ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
