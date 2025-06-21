// SPDX-License-Identifier: MIT OR Apache-2.0
// Improved VllmManager with proper architecture and error handling
// Follows best practices from Ollama + Docker integration guides

import axios from "axios";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

import {
  getDisplayName,
  LocalModelMeta,
} from "../src/shared/constants/modelRegistry";
import { detectHardware, HardwareInfo } from "./HardwareDetector";
import { DockerRunner } from "./services/DockerRunner";
import { OllamaClient } from "./services/OllamaClient";

// Configuration interface for better maintainability
export interface VllmConfig {
  cacheDir: string;
  ollamaPort: number;
  vllmPort: number;
  dockerImage: string;
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

// Enhanced status with more detailed states
export interface ModelStatus {
  state:
    | "idle"
    | "initializing"
    | "downloading"
    | "pulling_image"
    | "starting"
    | "ready"
    | "error"
    | "stopping";
  progress?: number; // 0-100 while downloading
  message?: string;
  modelId?: string;
  error?: string;
  timestamp?: number;
}

// Model type used in Ollama library list
interface LibraryModel {
  name: string;
  label: string;
  size: string;
  tags: string[];
  isRecommended: boolean;
  isInstalled?: boolean;
  isCompatible?: boolean;
}

// Generation request/response types
export interface GenerationRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GenerationResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class VllmManager extends EventEmitter {
  /* ------------------- singleton pattern for compatibility ------------------- */
  private static instance: VllmManager;

  static getInstance(): VllmManager {
    if (!VllmManager.instance) {
      VllmManager.instance = new VllmManager();
    }
    return VllmManager.instance;
  }

  /* ------------------- configuration ------------------- */
  private readonly config: VllmConfig;

  /* ------------------- state ------------------- */
  private status: ModelStatus = { state: "idle", timestamp: Date.now() };
  private currentModel: LocalModelMeta | null = null;
  private hwInfo: HardwareInfo | null = null;
  private libraryCache: LibraryModel[] = [];
  private libraryCacheExpiry: number = 0;

  /* ------------------- dependencies ------------------- */
  private readonly ollamaClient: OllamaClient;
  private readonly docker: DockerRunner;

  /* ------------------- constructor ------------------- */
  constructor(config?: Partial<VllmConfig>) {
    super();

    // Default configuration with environment variable support
    this.config = {
      cacheDir:
        config?.cacheDir ||
        process.env.ORCH_MODEL_CACHE ||
        path.join(process.env.HOME || "~", ".orch-os", "models"),
      ollamaPort:
        config?.ollamaPort || parseInt(process.env.OLLAMA_PORT || "11434"),
      vllmPort: config?.vllmPort || parseInt(process.env.VLLM_PORT || "33220"),
      dockerImage:
        config?.dockerImage ||
        process.env.VLLM_IMAGE ||
        "ghcr.io/vllm/vllm-openai:latest",
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
      enableLogging: config?.enableLogging ?? true,
      ...config,
    };

    // Ensure cache directory exists
    this.ensureCacheDir();

    // Initialize dependencies with proper error handling
    this.ollamaClient = new OllamaClient(this.config.cacheDir, (partial) => {
      this.updateStatus(partial);
    });

    this.docker = new DockerRunner({
      image: this.config.dockerImage,
      port: this.config.vllmPort,
      enableGPU: true,
      gpuMemoryUtilization: 0.9,
      maxModelLen: 4096,
      huggingFaceToken: process.env.HUGGING_FACE_HUB_TOKEN,
    });

    // Log initialization
    this.log("VllmManager initialized", { config: this.config });
  }

  /* ------------------- public API ------------------- */

  getStatus(): ModelStatus {
    return { ...this.status };
  }

  getCurrentModel(): LocalModelMeta | null {
    return this.currentModel;
  }

  async getHardwareInfo(): Promise<HardwareInfo> {
    if (!this.hwInfo) {
      try {
        this.hwInfo = await detectHardware();
        this.log("Hardware detected", this.hwInfo);
      } catch (error) {
        this.logError("Failed to detect hardware", error);
        throw error;
      }
    }
    return this.hwInfo;
  }

  async downloadModelOnly(modelId: string): Promise<void> {
    const meta = await this.findMeta(modelId);
    this.updateStatus({
      state: "downloading",
      modelId,
      message: "Starting download...",
    });

    try {
      // Enhanced download with validation and error handling
      await this.ollamaClient.ensureWeights(meta);
      this.updateStatus({
        state: "idle",
        message: "Download completed successfully",
      });
      this.log("Model download completed", { modelId });
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Provide better error messages and suggestions
      let enhancedMessage = errorMessage;
      if (errorMessage.includes("not found")) {
        enhancedMessage +=
          "\n\nTip: Try using a different model or check available models in the Ollama library.";
      } else if (errorMessage.includes("Cannot connect")) {
        enhancedMessage +=
          "\n\nTip: Make sure Ollama is running. Try: 'ollama serve' in terminal.";
      }

      this.updateStatus({
        state: "error",
        error: enhancedMessage,
        message: "Download failed",
      });
      this.logError("Model download failed", error);
      throw new Error(enhancedMessage);
    }
  }

  async startModel(modelId: string): Promise<void> {
    if (this.status.state === "starting" || this.status.state === "ready") {
      this.log("Model already starting or ready", {
        modelId,
        currentState: this.status.state,
      });
      return;
    }

    const meta = await this.findMeta(modelId);
    this.log("Starting model", { modelId, meta });

    try {
      // Step 1: Download weights if needed with validation
      this.updateStatus({
        state: "downloading",
        modelId,
        message: "Ensuring model weights...",
      });

      // Use enhanced validation from OllamaClient
      await this.ollamaClient.ensureWeights(meta);

      // Step 2: Check if Ollama is running
      this.updateStatus({
        state: "initializing",
        message: "Checking Ollama service...",
      });
      const ollamaAlive = await this.ollamaClient.isServiceAlive();
      if (!ollamaAlive) {
        throw new Error(
          "Ollama service is not running. Please start Ollama first."
        );
      }

      // Check if we should use Apple Silicon compatibility mode
      const hwInfo = await this.getHardwareInfo();
      const isAppleSilicon =
        hwInfo.gpu?.vendor === "Apple" && !hwInfo.gpu?.cuda;

      if (isAppleSilicon) {
        this.log("Apple Silicon detected - using Ollama-only mode", {
          hardware: hwInfo,
        });

        this.updateStatus({
          state: "starting",
          message: "Starting model via Ollama (Apple Silicon mode)...",
          progress: 10,
        });

        // Simulate model loading progress for Apple Silicon
        for (let progress = 20; progress <= 90; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          this.updateStatus({
            progress,
            message: `Initializing ${meta.label || meta.id} (${progress}%)...`,
          });
        }

        // Final verification that model is actually available
        try {
          const response = await axios.get(
            `http://localhost:${this.config.ollamaPort}/api/tags`,
            { timeout: 5000 }
          );

          if (response.data && response.data.models) {
            const modelExists = response.data.models.some(
              (m: any) =>
                m.name === meta.repo || m.name.startsWith(meta.repo + ":")
            );

            if (!modelExists) {
              throw new Error(
                `Model ${meta.repo} not found in Ollama after download`
              );
            }
          }
        } catch (error) {
          throw new Error(
            `Failed to verify model availability: ${(error as Error).message}`
          );
        }

        // For Apple Silicon, use Ollama directly - it's much faster than vLLM
        this.currentModel = meta;
        this.updateStatus({
          state: "ready",
          modelId: meta.id,
          message: "Model ready via Ollama (optimized for Apple Silicon)",
          progress: 100,
        });
        this.log("Model started in Apple Silicon mode", { modelId });
        return;
      }

      // Step 3: For CUDA systems, use vLLM Docker container
      this.updateStatus({
        state: "pulling_image",
        message: "Preparing vLLM container...",
      });

      // Pass the model name to DockerRunner
      await this.docker.run(meta.repo);
      this.updateStatus({ progress: 100 });

      // Step 4: Start the model
      this.updateStatus({
        state: "starting",
        message: "Starting vLLM server...",
      });

      // Step 5: Wait for readiness
      const ready = await this.waitUntilReady(this.config.timeout);
      if (!ready) {
        await this.docker.stop();
        throw new Error(
          `vLLM server did not start within ${this.config.timeout / 1000}s`
        );
      }

      this.currentModel = meta;
      this.updateStatus({
        state: "ready",
        modelId: meta.id,
        message: "Model ready for inference",
      });
      this.log("Model started successfully", { modelId });
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Provide enhanced error messages based on error type
      let enhancedMessage = errorMessage;
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("manifest")
      ) {
        enhancedMessage =
          `Model '${modelId}' not found in Ollama registry. ` +
          `Try one of these working models instead: qwen3:4b, granite3.3:latest`;
      } else if (
        errorMessage.includes("Cannot connect") ||
        errorMessage.includes("ECONNREFUSED")
      ) {
        enhancedMessage =
          "Cannot connect to Ollama service.\n\n" +
          "Please ensure Ollama is running:\n" +
          "• Open terminal and run: ollama serve\n" +
          "• Or restart the Ollama application\n" +
          "• Check if port 11434 is available";
      } else if (errorMessage.includes("timeout")) {
        enhancedMessage =
          "Operation timed out.\n\n" +
          "This usually happens with:\n" +
          "• Large model downloads over slow connections\n" +
          "• System resource constraints\n" +
          "• Network instability\n\n" +
          "Try again or use a smaller model.";
      }

      this.updateStatus({
        state: "error",
        error: enhancedMessage,
        message: "Failed to start model",
      });
      this.logError("Failed to start model", error);
      throw new Error(enhancedMessage);
    }
  }

  async stopModel(): Promise<void> {
    if (this.status.state === "idle") {
      this.log("No model to stop");
      return;
    }

    try {
      this.updateStatus({ state: "stopping", message: "Stopping model..." });
      await this.docker.stop();
      this.currentModel = null;
      this.updateStatus({ state: "idle", message: "Model stopped" });
      this.log("Model stopped successfully");
    } catch (error) {
      this.updateStatus({ state: "error", error: (error as Error).message });
      this.logError("Failed to stop model", error);
      throw error;
    }
  }

  /** Enhanced generation with proper error handling and validation */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    if (this.status.state !== "ready") {
      throw new Error(`Model not ready (current state: ${this.status.state})`);
    }

    if (!this.currentModel) {
      throw new Error("No model loaded");
    }

    // Validate request
    if (!request.messages || request.messages.length === 0) {
      throw new Error("Messages array is required and cannot be empty");
    }

    const hwInfo = await this.getHardwareInfo();
    const isAppleSilicon = hwInfo.gpu?.vendor === "Apple" && !hwInfo.gpu?.cuda;

    try {
      this.log("Generating response", {
        model: request.model,
        messageCount: request.messages.length,
        mode: isAppleSilicon ? "Apple Silicon (Ollama)" : "vLLM",
      });

      if (isAppleSilicon) {
        // Use Ollama API directly for Apple Silicon
        const ollamaUrl = `http://localhost:${this.config.ollamaPort}/v1/chat/completions`;

        const { data } = await axios.post<GenerationResponse>(
          ollamaUrl,
          {
            ...request,
            model: this.currentModel.repo, // Use Ollama model name
          },
          {
            timeout: this.config.timeout,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        this.log("Generation completed via Ollama", {
          tokens: data.usage?.total_tokens || 0,
          model: data.model,
        });

        return data;
      } else {
        // Use vLLM for CUDA systems
        const vllmUrl = `http://localhost:${this.config.vllmPort}/v1/chat/completions`;

        const { data } = await axios.post<GenerationResponse>(
          vllmUrl,
          request,
          {
            timeout: this.config.timeout,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        this.log("Generation completed via vLLM", {
          tokens: data.usage?.total_tokens || 0,
          model: data.model,
        });

        return data;
      }
    } catch (error) {
      this.logError("Generation failed", error);
      throw new Error(`Generation failed: ${(error as Error).message}`);
    }
  }

  /** Enhanced library fetching with caching and error handling */
  async getOllamaLibrary(forceRefresh = false): Promise<LibraryModel[]> {
    // Check cache validity (5 minutes)
    if (
      !forceRefresh &&
      this.libraryCache.length > 0 &&
      Date.now() < this.libraryCacheExpiry
    ) {
      return this.libraryCache;
    }

    try {
      this.log("Fetching Ollama library");

      // 1. Fetch from official API if available, fallback to scraping
      let remote: LibraryModel[] = [];

      try {
        // Try official Ollama library API first
        const response = await axios.get("https://ollama.com/api/tags", {
          timeout: 10000,
          headers: { "User-Agent": "Orch-OS/1.0" },
        });

        if (response.data && Array.isArray(response.data.models)) {
          remote = response.data.models.map((model: any) => ({
            name: model.name,
            label: model.display_name || model.name,
            size: this.formatSize(model.size_bytes || 0),
            tags: model.tags || [],
            isRecommended: model.featured || false,
          }));
        }
      } catch (apiError) {
        this.log("Official API failed, falling back to scraping");
        // Fallback to scraping (existing implementation)
        remote = await this.scrapeOllamaLibrary();
      }

      if (remote.length === 0) {
        remote = this.getBasicPopularModels();
      }

      // 2. Annotate with installation status
      remote = await this.annotateInstalledModels(remote);

      // 3. Annotate with hardware compatibility
      remote = await this.annotateCompatibility(remote);

      this.libraryCache = remote;
      this.libraryCacheExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

      this.log("Library fetched successfully", { count: remote.length });
      return remote;
    } catch (error) {
      this.logError("Failed to fetch library", error);
      // Return cached data if available, otherwise basic models
      return this.libraryCache.length > 0
        ? this.libraryCache
        : this.getBasicPopularModels();
    }
  }

  /** Test connection to model endpoint */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    if (this.status.state !== "ready") {
      return {
        success: false,
        message: `Model not ready (state: ${this.status.state})`,
      };
    }

    const startTime = Date.now();
    const hwInfo = await this.getHardwareInfo();
    const isAppleSilicon = hwInfo.gpu?.vendor === "Apple" && !hwInfo.gpu?.cuda;

    try {
      if (isAppleSilicon) {
        // Test Ollama connection for Apple Silicon
        const url = `http://localhost:${this.config.ollamaPort}/api/tags`;
        await axios.get(url, { timeout: 5000 });
        const latency = Date.now() - startTime;

        return {
          success: true,
          message: "Ollama connection successful (Apple Silicon mode)",
          latency,
        };
      } else {
        // Test vLLM connection for CUDA systems
        const url = `http://localhost:${this.config.vllmPort}/v1/models`;
        await axios.get(url, { timeout: 5000 });
        const latency = Date.now() - startTime;

        return {
          success: true,
          message: "vLLM connection successful",
          latency,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${(error as Error).message}`,
      };
    }
  }

  /* ------------------- private helpers ------------------- */

  private updateStatus(partial: Partial<ModelStatus>): void {
    this.status = {
      ...this.status,
      ...partial,
      timestamp: Date.now(),
    };

    // Emit status change event
    this.emit("statusChange", this.status);

    if (this.config.enableLogging) {
      this.log("Status updated", this.status);
    }
  }

  private async findMeta(modelId: string): Promise<LocalModelMeta> {
    try {
      // Get available models dynamically from Ollama API
      const availableModels = await this.ollamaClient.getAvailableModels();
      const meta = availableModels.find((m) => m.id === modelId);

      if (meta) return meta;
      return {
        id: modelId,
        label: getDisplayName(modelId),
        repo: modelId,
        sizeGB: 4, // Default estimation
        family: "general",
        isInstalled: false,
      };
    } catch (error) {
      this.logError("Failed to find model meta", error);
      return {
        id: modelId,
        label: getDisplayName(modelId),
        repo: modelId,
        sizeGB: 4,
        family: "general",
        isInstalled: false,
      };
    }
  }

  private async waitUntilReady(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let attempts = 0;

    while (Date.now() < deadline) {
      attempts++;
      try {
        await axios.get(`http://localhost:${this.config.vllmPort}/v1/models`, {
          timeout: 5000,
        });
        this.log("vLLM server ready", {
          attempts,
          timeElapsed: timeoutMs - (deadline - Date.now()),
        });
        return true;
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    this.log("vLLM server readiness timeout", { attempts, timeoutMs });
    return false;
  }

  private async scrapeOllamaLibrary(): Promise<LibraryModel[]> {
    try {
      const { data: html } = await axios.get("https://ollama.com/library", {
        headers: { "User-Agent": "Orch-OS/1.0" },
        timeout: 10_000,
      });

      // Dynamic import to avoid build-time dependency
      const { load } = await import("cheerio");
      const $ = load(html);
      const seen = new Set<string>();
      const models: LibraryModel[] = [];

      $("a[href^='/library/']").each((_, el) => {
        const href = $(el).attr("href") || "";
        const name = href.replace("/library/", "").trim();
        if (!name || seen.has(name)) return;
        seen.add(name);

        const heading = $(el).find("h2, h3, h4, h5, h6").first().text().trim();
        const text = $(el).text();
        const sizeMatch = text.match(/(\d+(?:\.\d+)?[GM]B)/i);

        models.push({
          name,
          label: heading || name,
          size: sizeMatch ? sizeMatch[1] : "",
          tags: [],
          isRecommended: false,
        });
      });

      return models;
    } catch (error) {
      this.logError("Scraping failed", error);
      return [];
    }
  }

  private async annotateInstalledModels(
    models: LibraryModel[]
  ): Promise<LibraryModel[]> {
    try {
      const response = await axios.get(
        `http://localhost:${this.config.ollamaPort}/api/tags`,
        {
          timeout: 5000,
        }
      );

      if (response.data && response.data.models) {
        const installed: string[] = response.data.models.map(
          (m: any) => m.name
        );
        models.forEach((model) => {
          model.isInstalled = installed.includes(model.name);
        });
      }
    } catch (error) {
      this.log("Could not fetch installed models", {
        error: (error as Error).message,
      });
    }

    return models;
  }

  private async annotateCompatibility(
    models: LibraryModel[]
  ): Promise<LibraryModel[]> {
    try {
      const hardware = await this.getHardwareInfo();
      const vram = hardware.gpu?.vramGB ?? 0;
      const ram = hardware.ramGB || 0;
      const maxSize = vram > 0 ? Math.max(ram * 0.5, vram * 0.9) : ram * 0.5;

      models.forEach((model) => {
        const sizeGB = this.parseSizeToGB(model.size);
        model.isCompatible = sizeGB <= maxSize;
      });
    } catch (error) {
      this.log("Could not determine compatibility", {
        error: (error as Error).message,
      });
      // Mark all as compatible if we can't determine
      models.forEach((model) => {
        model.isCompatible = true;
      });
    }

    return models;
  }

  private getBasicPopularModels(): LibraryModel[] {
    return [
      {
        name: "qwen3:4b",
        label: "Qwen3 4B",
        size: "2.6GB",
        tags: ["tools", "reasoning"],
        isRecommended: true,
      },
      {
        name: "granite3.3:latest",
        label: "Granite 3.3 Latest",
        size: "4.9GB",
        tags: ["tools", "chat"],
        isRecommended: true,
      },
    ];
  }

  private ensureCacheDir(): void {
    try {
      if (!fs.existsSync(this.config.cacheDir)) {
        fs.mkdirSync(this.config.cacheDir, { recursive: true });
        this.log("Cache directory created", { path: this.config.cacheDir });
      }
    } catch (error) {
      this.logError("Failed to create cache directory", error);
      throw new Error(
        `Cannot create cache directory: ${(error as Error).message}`
      );
    }
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return "0B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  }

  private parseSizeToGB(sizeStr: string): number {
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case "TB":
        return value * 1024;
      case "GB":
        return value;
      case "MB":
        return value / 1024;
      case "KB":
        return value / (1024 * 1024);
      case "B":
        return value / (1024 * 1024 * 1024);
      default:
        return value;
    }
  }

  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[VllmManager] ${message}`, data || "");
    }
  }

  private logError(message: string, error: any): void {
    if (this.config.enableLogging) {
      console.error(`[VllmManager] ${message}:`, error);
    }
  }

  /* ------------------- cleanup ------------------- */

  async cleanup(): Promise<void> {
    try {
      await this.stopModel();
      this.removeAllListeners();
      this.log("Cleanup completed");
    } catch (error) {
      this.logError("Cleanup failed", error);
    }
  }
}

// Factory function for better testability
export function createVllmManager(config?: Partial<VllmConfig>): VllmManager {
  return new VllmManager(config);
}

// Default export for compatibility
export default VllmManager;
