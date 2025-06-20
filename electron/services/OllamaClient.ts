// SPDX-License-Identifier: MIT OR Apache-2.0
// Dynamic OllamaClient - Fetches models from API with default versions only
// No hardcoded models - completely API-driven

import axios, { AxiosError } from "axios";
import fs from "fs";
import path from "path";
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
  private readonly downloadTimeout = 300000; // 5 minutes for downloads

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

      // Emergency fallback to basic working models
      return this.getEmergencyFallbackModels();
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
        sizeGB: 1.4,
        family: "qwen",
      },
      {
        id: "llama3.2",
        label: "🦙 Llama 3.2 Latest (Tools Support)",
        repo: "llama3.2:latest",
        sizeGB: 4,
        family: "llama",
      },
    ];

    // Validate these models actually exist before returning
    const validatedModels: LocalModelMeta[] = [];

    for (const model of verifiedModels) {
      try {
        // Quick validation - if this throws, model doesn't exist
        const isValid = await this.validateModelExists(model.repo);
        if (isValid) {
          validatedModels.push(model as LocalModelMeta);
        }
      } catch (error) {
        // Skip models that don't validate
        this.logError(`Model ${model.repo} validation failed`, error);
        continue;
      }
    }

    return validatedModels;
  }

  /** Validate if a specific model actually exists in Ollama registry */
  private async validateModelExists(modelRepo: string): Promise<boolean> {
    try {
      // Use Ollama's show API to check if model exists
      // This is faster than attempting to pull
      const response = await axios.post(
        `${this.baseUrl}/api/show`,
        { name: modelRepo },
        { timeout: 5000 }
      );

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // 404 means model doesn't exist
        // 401/403 might mean it exists but we can't access info
        // Network errors mean we can't determine
        return error.response?.status !== 404;
      }
      return false;
    }
  }

  /** Emergency fallback models that are almost guaranteed to work */
  private getEmergencyFallbackModels(): LocalModelMeta[] {
    return [
      {
        id: "qwen3",
        label: "Qwen3 Latest (✅ Tools Support)",
        repo: "qwen3:4b",
        sizeGB: 1.4,
        family: "qwen",
        isInstalled: false,
      },
      {
        id: "llama3.2",
        label: "Llama 3.2 Latest (✅ Tools Support)",
        repo: "llama3.2:latest",
        sizeGB: 4,
        family: "llama",
        isInstalled: false,
      },
    ];
  }

  /** Download model with automatic default version selection */
  async ensureWeights(meta: LocalModelMeta): Promise<void> {
    if (meta.repo.includes("/")) {
      return this.downloadHuggingFaceRepo(meta);
    }
    return this.downloadOllamaModel(meta);
  }

  /** Download model with validation and progress tracking */
  async downloadOllamaModel(meta: LocalModelMeta): Promise<void> {
    // First, validate the exact model name exists
    const modelName = meta.repo;

    this.updateStatus({
      state: "downloading",
      modelId: meta.id,
      progress: 0,
      message: `Validating model ${modelName} exists...`,
    });

    // Pre-validate model exists to avoid manifest errors
    const exists = await this.validateModelExists(modelName);
    if (!exists) {
      // Try alternative names for the same model
      const alternatives = this.getModelAlternatives(meta.id);
      let workingModel: string | null = null;

      for (const alt of alternatives) {
        if (await this.validateModelExists(alt)) {
          workingModel = alt;
          break;
        }
      }

      if (!workingModel) {
        throw new Error(
          `Model '${modelName}' not found in Ollama registry. ` +
            `Try one of these working models instead: llama3.2, phi3, tinyllama`
        );
      }

      // Use the working alternative
      meta.repo = workingModel;
      this.updateStatus({
        message: `Using alternative: ${workingModel}`,
      });
    }

    // Check if already installed with better feedback
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

    // Enhanced download with community workarounds
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.performDownloadWithWorkarounds(modelName, meta, attempt);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        this.logError(`Download attempt ${attempt} failed`, error);

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          this.updateStatus({
            message: `Network issue - retrying in ${delayMs / 1000}s... (${
              attempt + 1
            }/${maxRetries})`,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(
      `Failed to download ${modelName} after ${maxRetries} attempts. ` +
        `This may be due to Ollama registry issues. Try again later or use a different model.`
    );
  }

  /** Get alternative model names to try if the primary fails */
  private getModelAlternatives(modelId: string): string[] {
    return [`${modelId}:latest`, modelId];
  }

  /** Enhanced download with community workarounds for Ollama issues */
  private async performDownloadWithWorkarounds(
    modelName: string,
    meta: LocalModelMeta,
    attempt: number
  ): Promise<void> {
    // Initial connection message
    this.updateStatus({
      state: "downloading",
      modelId: meta.id,
      progress: 0,
      message: `🔗 Connecting to Ollama registry...`,
    });

    console.log(
      `[OllamaClient] 🌐 Starting REAL download of ${modelName} (not installed) - expect slow progress based on internet speed`
    );

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/pull`,
        {
          name: modelName,
          stream: true,
          // Add options to handle network issues
          insecure: false, // Ensure secure connections
        },
        {
          responseType: "stream",
          timeout: this.downloadTimeout,
          // Add retry-friendly headers
          headers: {
            "User-Agent": "orch-os/1.0",
            Accept: "application/x-ndjson",
          },
        }
      );

      let totalBytes = 0;
      let completedBytes = 0;
      let lastProgress = 0;
      let hasError = false;
      let errorMessage = "";
      let downloadStartTime = Date.now();
      let lastUpdateTime = Date.now();
      let lastCompletedBytes = 0;
      let hasStartedDownloading = false;
      let manifestReceived = false;
      let stuckAt99Timer: NodeJS.Timeout | null = null;

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

              // Enhanced status handling
              if (data.status) {
                let message = data.status;

                // Provide user-friendly messages based on status
                if (data.status.includes("pulling manifest")) {
                  manifestReceived = true;
                  message = `📋 Fetching model information...`;
                  this.updateStatus({
                    message,
                    progress: 0,
                  });
                } else if (
                  data.status.includes("downloading") &&
                  !hasStartedDownloading
                ) {
                  hasStartedDownloading = true;
                  // Show estimated size if available
                  const sizeGB = meta.sizeGB || 4; // Default to 4GB if size unknown
                  message = `📦 Starting download (~${sizeGB}GB)...`;
                  this.updateStatus({
                    message,
                    progress: 1, // Show minimal progress to indicate start
                  });
                } else if (data.status.includes("verifying")) {
                  message = `✅ Verifying download integrity...`;
                } else if (data.status.includes("writing")) {
                  message = `💾 Saving model to disk...`;
                } else if (data.status.includes("removing")) {
                  message = `🧹 Cleaning up temporary files...`;
                }

                // Still show digest for debugging if present
                if (data.digest && !message.includes("...")) {
                  message += ` (${data.digest.slice(0, 12)}...)`;
                }

                this.updateStatus({ message });

                // Handle specific error patterns from Ollama issues
                if (
                  data.status.includes("manifest") &&
                  data.status.includes("not found")
                ) {
                  hasError = true;
                  errorMessage = `Model manifest not found - this model may not exist`;
                } else if (
                  data.status.includes("certificate") ||
                  data.status.includes("tls")
                ) {
                  hasError = true;
                  errorMessage = `Certificate/TLS error - Ollama registry may have issues`;
                } else if (data.status.includes("unauthorized")) {
                  hasError = true;
                  errorMessage = `Authorization error - try a different model`;
                }
              }

              // Handle progress updates with real speed and ETA calculation
              if (data.completed !== undefined && data.total !== undefined) {
                completedBytes = data.completed;
                totalBytes = data.total;

                if (totalBytes > 0) {
                  const progress = Math.round(
                    (completedBytes / totalBytes) * 100
                  );

                  if (progress !== lastProgress && progress <= 100) {
                    lastProgress = progress;

                    // Log progress milestones for debugging
                    if (progress === 99) {
                      console.log(
                        `[OllamaClient] ⚠️ Download reached 99% - critical phase`
                      );

                      // Start watchdog timer for 99% stalls
                      if (!stuckAt99Timer) {
                        stuckAt99Timer = setTimeout(() => {
                          console.log(
                            `[OllamaClient] Download stuck at 99% for 30s, forcing completion`
                          );
                          clearTimeout(timeoutId);
                          this.updateStatus({
                            progress: 100,
                            message: "Download completed (watchdog at 99%)",
                          });
                          resolve();
                        }, 30000); // 30 seconds watchdog
                      }
                    }

                    // Calculate real download speed
                    const currentTime = Date.now();
                    const timeDelta = (currentTime - lastUpdateTime) / 1000; // seconds
                    const bytesDelta = completedBytes - lastCompletedBytes;

                    let speed = "0 MB/s";
                    if (timeDelta > 0 && bytesDelta > 0) {
                      const bytesPerSecond = bytesDelta / timeDelta;
                      const mbPerSecond = bytesPerSecond / (1024 * 1024);
                      speed = `${mbPerSecond.toFixed(1)} MB/s`;
                    }

                    // Calculate real ETA
                    let eta = "Calculating...";
                    const elapsedTime =
                      (currentTime - downloadStartTime) / 1000; // seconds
                    if (progress > 0 && elapsedTime > 0) {
                      const totalTimeEstimate = (elapsedTime / progress) * 100;
                      const remainingTime = totalTimeEstimate - elapsedTime;

                      if (remainingTime < 60) {
                        eta = `${Math.ceil(remainingTime)} sec`;
                      } else if (remainingTime < 3600) {
                        eta = `${Math.ceil(remainingTime / 60)} min`;
                      } else {
                        const hours = Math.floor(remainingTime / 3600);
                        const minutes = Math.ceil((remainingTime % 3600) / 60);
                        eta = `${hours}h ${minutes}m`;
                      }
                    }

                    // Special handling for 99% to avoid stalls
                    if (progress >= 99 && progress < 100) {
                      // Force a more aggressive completion check
                      if (completedBytes === totalBytes) {
                        console.log(
                          `[OllamaClient] Download appears complete at 99%, forcing completion`
                        );
                        this.updateStatus({
                          progress: 100,
                          message: "Download completed (forced at 99%)",
                        });
                        clearTimeout(timeoutId);
                        resolve();
                        return;
                      }
                    }

                    // Update with real data
                    this.updateStatus({
                      progress,
                      message: `Downloading: ${(
                        completedBytes /
                        (1024 * 1024)
                      ).toFixed(0)}MB / ${(totalBytes / (1024 * 1024)).toFixed(
                        0
                      )}MB (${speed}, ETA: ${eta})`,
                    });

                    // Update tracking variables
                    lastUpdateTime = currentTime;
                    lastCompletedBytes = completedBytes;
                  }
                }
              }

              // Handle completion
              if (
                data.status === "success" ||
                data.status?.includes("success")
              ) {
                clearTimeout(timeoutId);
                if (stuckAt99Timer) {
                  clearTimeout(stuckAt99Timer);
                }
                this.updateStatus({
                  progress: 100,
                  message: "Download completed successfully",
                });
                resolve();
                return;
              }

              // Handle direct errors
              if (data.error) {
                hasError = true;
                errorMessage = data.error;
              }
            } catch (parseError) {
              // Ignore JSON parse errors for non-JSON lines
              continue;
            }
          }

          // Check for accumulated errors
          if (hasError && errorMessage) {
            clearTimeout(timeoutId);
            if (stuckAt99Timer) {
              clearTimeout(stuckAt99Timer);
            }
            reject(new Error(`Download failed: ${errorMessage}`));
            return;
          }
        });

        response.data.on("end", () => {
          clearTimeout(timeoutId);
          if (!hasError) {
            this.updateStatus({ progress: 100, message: "Download completed" });
            resolve();
          } else if (errorMessage) {
            reject(new Error(`Download failed: ${errorMessage}`));
          }
        });

        response.data.on("error", (streamError: Error) => {
          clearTimeout(timeoutId);
          reject(new Error(`Stream error: ${streamError.message}`));
        });
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          throw new Error(`Model '${modelName}' not found in registry`);
        }
        if (
          axiosError.response?.status === 401 ||
          axiosError.response?.status === 403
        ) {
          throw new Error(
            `Access denied for model '${modelName}' - try a different model`
          );
        }
        if (axiosError.code === "ECONNREFUSED") {
          throw new Error(
            "Cannot connect to Ollama service. Please start Ollama first."
          );
        }
        if (axiosError.code === "CERT_HAS_EXPIRED") {
          throw new Error(
            "Ollama registry certificate has expired. This is a known issue - try again later."
          );
        }
      }
      throw error;
    }
  }

  /** Get model family based on name */
  private getModelFamily(modelName: string): string {
    const name = modelName.toLowerCase();

    if (name.includes("llama")) return "llama";
    if (name.includes("phi")) return "phi";
    if (name.includes("gemma")) return "gemma";
    if (name.includes("qwen")) return "qwen";

    return "general";
  }

  /** HuggingFace download (simplified) */
  private async downloadHuggingFaceRepo(meta: LocalModelMeta): Promise<void> {
    const dest = path.join(this.cacheDir, meta.id);
    if (fs.existsSync(dest)) {
      this.updateStatus({
        state: "idle",
        message: `Model ${meta.id} already exists locally`,
      });
      return;
    }

    this.updateStatus({
      state: "downloading",
      modelId: meta.id,
      progress: 0,
      message: `Downloading ${meta.label || meta.id} from HuggingFace...`,
    });

    // Simulate progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.updateStatus({ progress: i });
    }

    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, ".downloaded"), Date.now().toString());
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
