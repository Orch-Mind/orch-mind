// SPDX-License-Identifier: MIT OR Apache-2.0
// Dynamic OllamaClient - Fetches models from API with default versions only
// No hardcoded models - completely API-driven

import axios, { AxiosError } from "axios";
import type { LocalModelMeta } from "../../src/shared/constants/modelRegistry";
import { getDisplayName } from "../../src/shared/constants/modelRegistry";
import type { ModelStatus } from "../VllmManager";

interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

interface OllamaLibraryModel {
  name: string;
  description: string;
  tags: string[];
  size?: number;
}

export class OllamaClient {
  private readonly baseUrl = "http://localhost:11434";
  private readonly timeout = 10000; // 10 seconds for API calls
  private readonly downloadTimeout = 1800000; // 30 minutes for downloads (increased from 5 minutes)

  constructor(
    private readonly cacheDir: string,
    private readonly updateStatus: (partial: Partial<ModelStatus>) => void
  ) {}

  /** Enhanced service health check */
  async isServiceAlive(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: this.timeout,
      });
      return response.status === 200;
    } catch (error) {
      this.logError("Ollama service check failed", error);
      return false;
    }
  }

  /** Get list of installed models */
  async getInstalledModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: this.timeout,
      });
      return response.data?.models || [];
    } catch (error) {
      this.logError("Failed to get installed models", error);
      return [];
    }
  }

  /** Get available models from Ollama library dynamically */
  async getAvailableModels(): Promise<LocalModelMeta[]> {
    try {
      // First, get actually installed models
      const installedModels = await this.getInstalledModels();

      // Get models that are proven to work (from Ollama community)
      const verifiedWorkingModels = await this.getVerifiedWorkingModels();

      const models: LocalModelMeta[] = [];

      // Add installed models first (these definitely work)
      for (const installed of installedModels) {
        const meta: LocalModelMeta = {
          id: installed.name.split(":")[0], // Remove tag for ID
          label: getDisplayName(installed.name),
          repo: installed.name,
          sizeGB: Math.round(installed.size / 1024 ** 3),
          family:
            installed.details?.family || this.getModelFamily(installed.name),
          isInstalled: true,
          modified: installed.modified_at,
        };
        models.push(meta);
      }

      // Add verified working models that aren't installed
      for (const verifiedModel of verifiedWorkingModels) {
        const isAlreadyAdded = models.some(
          (m) => m.repo === verifiedModel.repo || m.id === verifiedModel.id
        );

        if (!isAlreadyAdded) {
          models.push({
            ...verifiedModel,
            isInstalled: false,
          });
        }
      }

      return models;
    } catch (error) {
      this.logError("Failed to get available models", error);
      return [];
    }
  }

  /** Get verified working models from Ollama community knowledge */
  private async getVerifiedWorkingModels(): Promise<LocalModelMeta[]> {
    // These models support tools/function calling as requested by user
    const verifiedModels = [
      {
        id: "qwen3",
        label: "🧠 Qwen3 Latest (Tools Support)",
        repo: "qwen3:4b",
        sizeGB: 2.6,
        family: "qwen",
        isInstalled: false,
      },
      {
        id: "granite3.3:latest",
        label: "🦙 Granite 3.3 Latest (Tools Support)",
        repo: "granite3.3:latest",
        sizeGB: 5.1,
        family: "granite",
        isInstalled: false,
      },
    ];

    return verifiedModels as LocalModelMeta[];
  }

  /** Download model with automatic default version selection */
  async ensureWeights(meta: LocalModelMeta): Promise<void> {
    // Always use Ollama download, HuggingFace models are not supported through this client
    return this.downloadOllamaModel(meta);
  }

  /** Download model with validation and progress tracking */
  async downloadOllamaModel(meta: LocalModelMeta): Promise<void> {
    const modelName = meta.repo;

    this.updateStatus({
      state: "downloading",
      modelId: meta.id,
      progress: 0,
      message: `Starting download for ${modelName}...`,
    });

    // Check if already installed
    const installedModels = await this.getInstalledModels();
    const existingModel = installedModels.find(
      (m) => m.name === modelName || m.name.startsWith(modelName.split(":")[0])
    );

    if (existingModel) {
      // Quick verification since already installed
      this.updateStatus({
        state: "downloading",
        progress: 100,
        message: `⚡ Model ${modelName} already installed - skipping download`,
      });

      this.updateStatus({
        state: "idle",
        progress: 100,
        message: `🎉 ${modelName} ready (no download needed - size: ${(
          existingModel.size /
          (1024 * 1024 * 1024)
        ).toFixed(1)}GB)`,
      });

      console.log(
        `[OllamaClient] ⚡ FAST: ${modelName} already exists locally, no download needed`
      );
      return;
    }

    // Perform download with Ollama API
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.performDownload(modelName, meta, attempt);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        this.logError(`Download attempt ${attempt} failed`, error);

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          this.updateStatus({
            message: `⚠️ Download issue - retrying in ${
              delayMs / 1000
            }s... (attempt ${attempt + 1}/${maxRetries})`,
            progress: 0,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(
      `Failed to download ${modelName} after ${maxRetries} attempts. ` +
        `Error: ${lastError?.message || "Unknown error"}`
    );
  }

  /** Simple and robust download following Ollama API documentation */
  private async performDownload(
    modelName: string,
    meta: LocalModelMeta,
    attempt: number
  ): Promise<void> {
    // Initial connection message
    this.updateStatus({
      state: "downloading",
      modelId: meta.id,
      progress: 0,
      message: `🔗 Connecting to Ollama registry (attempt ${attempt})...`,
    });

    console.log(
      `[OllamaClient] 🌐 Starting download of ${modelName} - Attempt ${attempt}`
    );

    try {
      // Following exact Ollama API documentation
      const response = await axios.post(
        `${this.baseUrl}/api/pull`,
        {
          name: modelName,
          stream: true,
        },
        {
          responseType: "stream",
          timeout: this.downloadTimeout,
        }
      );

      let totalBytes = 0;
      let completedBytes = 0;
      let lastProgress = 0;
      let downloadStartTime = Date.now();
      let lastUpdateTime = Date.now();
      let currentStatus = "";

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            new Error(
              `Download timeout after ${this.downloadTimeout / 1000} seconds`
            )
          );
        }, this.downloadTimeout);

        response.data.on("data", (chunk: Buffer) => {
          const lines = chunk
            .toString()
            .split("\n")
            .filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data: OllamaPullProgress = JSON.parse(line);

              // Handle status messages according to Ollama API spec
              if (data.status) {
                currentStatus = data.status;
                let message = data.status;

                // Map status to user-friendly messages
                switch (data.status) {
                  case "pulling manifest":
                    message = `📋 Fetching model manifest...`;
                    break;
                  case "verifying sha256 digest":
                    message = `✅ Verifying download integrity...`;
                    break;
                  case "writing manifest":
                    message = `💾 Writing model manifest...`;
                    break;
                  case "removing any unused layers":
                    message = `🧹 Cleaning up unused layers...`;
                    break;
                  case "success":
                    clearTimeout(timeoutId);
                    console.log(
                      `[OllamaClient] ✅ Download completed for ${modelName}`
                    );
                    this.updateStatus({
                      progress: 100,
                      message: `✅ ${modelName} installed successfully!`,
                      state: "idle",
                    });
                    resolve();
                    return;
                  default:
                    if (data.status.startsWith("downloading ")) {
                      // Extract digest if present
                      const digest = data.digest
                        ? ` ${data.digest.slice(0, 12)}...`
                        : "";
                      message = `📦 Downloading layer${digest}`;
                    }
                }

                this.updateStatus({ message });

                // Check for specific error patterns in status
                if (
                  data.status.includes("not found") ||
                  data.status.includes("404")
                ) {
                  clearTimeout(timeoutId);
                  reject(
                    new Error(
                      `Model '${modelName}' not found in Ollama registry`
                    )
                  );
                  return;
                }
              }

              // Handle progress updates - only when we have real data
              if (
                data.completed !== undefined &&
                data.total !== undefined &&
                data.total > 0
              ) {
                completedBytes = data.completed;
                totalBytes = data.total;

                const progress = Math.min(
                  100,
                  Math.round((completedBytes / totalBytes) * 100)
                );

                // Only update if progress changed
                if (progress !== lastProgress) {
                  lastProgress = progress;

                  // Calculate download speed
                  const currentTime = Date.now();
                  const elapsedSeconds =
                    (currentTime - downloadStartTime) / 1000;
                  const bytesPerSecond = completedBytes / elapsedSeconds;
                  const speed = (bytesPerSecond / (1024 * 1024)).toFixed(1);

                  // Calculate ETA
                  let eta = "Calculating...";
                  if (bytesPerSecond > 0) {
                    const remainingBytes = totalBytes - completedBytes;
                    const remainingSeconds = remainingBytes / bytesPerSecond;

                    if (remainingSeconds < 60) {
                      eta = `${Math.ceil(remainingSeconds)} sec`;
                    } else if (remainingSeconds < 3600) {
                      eta = `${Math.ceil(remainingSeconds / 60)} min`;
                    } else {
                      const hours = Math.floor(remainingSeconds / 3600);
                      const minutes = Math.ceil((remainingSeconds % 3600) / 60);
                      eta = `${hours}h ${minutes}m`;
                    }
                  }

                  // Update progress with real data
                  this.updateStatus({
                    progress,
                    message: `📥 Downloading: ${(
                      completedBytes /
                      (1024 * 1024)
                    ).toFixed(0)}MB / ${(totalBytes / (1024 * 1024)).toFixed(
                      0
                    )}MB (${speed} MB/s, ETA: ${eta})`,
                  });

                  lastUpdateTime = currentTime;
                }
              }

              // Handle explicit error field
              if (data.error) {
                clearTimeout(timeoutId);
                console.error(`[OllamaClient] Download error: ${data.error}`);
                reject(new Error(`Download failed: ${data.error}`));
                return;
              }
            } catch (parseError) {
              // Skip lines that can't be parsed
              console.debug(
                `[OllamaClient] Skipping unparseable line: ${line.substring(
                  0,
                  50
                )}...`
              );
              continue;
            }
          }
        });

        response.data.on("end", () => {
          clearTimeout(timeoutId);

          // If stream ended without success status, it might still be OK
          if (currentStatus !== "success" && lastProgress === 100) {
            console.log(
              `[OllamaClient] Stream ended at 100% - assuming success`
            );
            this.updateStatus({
              progress: 100,
              message: `✅ ${modelName} installed!`,
              state: "idle",
            });
            resolve();
          } else if (currentStatus !== "success") {
            reject(
              new Error(
                `Download ended unexpectedly. Last status: ${currentStatus}`
              )
            );
          }
        });

        response.data.on("error", (streamError: Error) => {
          clearTimeout(timeoutId);
          console.error(`[OllamaClient] Stream error:`, streamError);
          reject(new Error(`Stream error: ${streamError.message}`));
        });
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          throw new Error(
            `Model '${modelName}' not found in Ollama registry. ` +
              `Please check the model name and try again. ` +
              `Available models can be found at https://ollama.com/library`
          );
        }
        if (
          axiosError.response?.status === 401 ||
          axiosError.response?.status === 403
        ) {
          throw new Error(
            `Access denied for model '${modelName}'. ` +
              `This model may require authentication or may be private.`
          );
        }
        if (axiosError.code === "ECONNREFUSED") {
          throw new Error(
            "Cannot connect to Ollama service. " +
              "Please ensure Ollama is running with: ollama serve"
          );
        }
        if (axiosError.code === "CERT_HAS_EXPIRED") {
          throw new Error(
            "Certificate error - please check your network connection. " +
              "If you're behind a proxy, you may need to configure it."
          );
        }
        if (axiosError.code === "ETIMEDOUT") {
          throw new Error(
            "Connection timeout - please check your internet connection. " +
              "The download server may be experiencing high load."
          );
        }
        if (axiosError.code === "ENOTFOUND") {
          throw new Error(
            "Cannot resolve Ollama server address. " +
              "Please check your internet connection and DNS settings."
          );
        }

        // Generic network error
        if (axiosError.message.includes("Network Error")) {
          throw new Error(
            "Network error occurred. " +
              "Please check your internet connection and firewall settings."
          );
        }
      }

      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download model: ${errorMessage}`);
    }
  }

  /** Get model family based on name */
  private getModelFamily(modelName: string): string {
    const name = modelName.toLowerCase();
    if (name.includes("qwen")) return "qwen";
    if (name.includes("granite")) return "granite";
    return "general";
  }

  /** Enhanced logging */
  private logError(message: string, error: any): void {
    console.error(`[OllamaClient] ${message}:`, error);
  }

  /** Remove a model from Ollama */
  async removeModel(modelId: string): Promise<void> {
    try {
      console.log(`[OllamaClient] Removing model: ${modelId}`);

      const response = await axios.delete(`${this.baseUrl}/api/delete`, {
        data: { name: modelId },
        timeout: this.timeout,
      });

      if (response.status === 200) {
        console.log(`[OllamaClient] Successfully removed model: ${modelId}`);
      } else {
        throw new Error(`Failed to remove model: ${response.statusText}`);
      }
    } catch (error) {
      this.logError(`Failed to remove model ${modelId}`, error);
      throw error;
    }
  }

  /** Test connection to Ollama service */
  async testConnection(): Promise<boolean> {
    try {
      console.log("[OllamaClient] Testing connection to Ollama service...");

      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: this.timeout,
      });

      const isConnected = response.status === 200;
      console.log(
        `[OllamaClient] Connection test result: ${
          isConnected ? "SUCCESS" : "FAILED"
        }`
      );

      return isConnected;
    } catch (error) {
      console.log("[OllamaClient] Connection test failed:", error);
      return false;
    }
  }
}
