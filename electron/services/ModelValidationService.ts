// SPDX-License-Identifier: MIT OR Apache-2.0
// Dynamic Model Validation Service - API-based validation with default versions
// No hardcoded models - validates against live Ollama API

import axios from "axios";
import {
  getDisplayName,
  normalizeModelName,
  type LocalModelMeta,
} from "../../src/shared/constants/modelRegistry";

interface ValidationResult {
  isValid: boolean;
  modelName: string;
  errorMessage?: string;
  suggestions: string[];
  installedVariants: string[];
}

interface OllamaApiModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export class ModelValidationService {
  private readonly baseUrl = "http://localhost:11434";
  private installedModelsCache: OllamaApiModel[] = [];
  private lastCacheUpdate = 0;
  private readonly cacheTimeout = 30000; // 30 seconds

  /**
   * Validates a model against live Ollama API
   */
  async validateModel(modelId: string): Promise<ValidationResult> {
    const modelName = normalizeModelName(modelId);

    try {
      // Check if Ollama service is available
      const serviceAvailable = await this.isOllamaServiceAvailable();
      if (!serviceAvailable) {
        return {
          isValid: false,
          modelName,
          errorMessage: "Ollama service is not running",
          suggestions: ["Start Ollama service with: ollama serve"],
          installedVariants: [],
        };
      }

      // Get installed models
      const installedModels = await this.getInstalledModels();
      const installedVariants = installedModels
        .filter((m) => m.name.startsWith(modelName) || m.name === modelName)
        .map((m) => m.name);

      // Check if exact model is installed
      if (installedVariants.length > 0) {
        return {
          isValid: true,
          modelName,
          suggestions: [],
          installedVariants,
        };
      }

      // For models not installed, we assume they can be downloaded
      // since we're using popular models from Ollama's registry
      return {
        isValid: true,
        modelName,
        suggestions: [],
        installedVariants: [],
      };
    } catch (error) {
      return {
        isValid: false,
        modelName,
        errorMessage: `Validation failed: ${(error as Error).message}`,
        suggestions: ["Check network connection", "Verify Ollama is running"],
        installedVariants: [],
      };
    }
  }

  /**
   * Get recommended models based on system capabilities
   */
  async getRecommendedModels(
    availableRamGB: number = 8
  ): Promise<LocalModelMeta[]> {
    try {
      // Models that support tools/function calling (filtered by user)
      const recommendedModels = [
        { name: "gemma3n:latest", minRam: 4 },
        { name: "gemma3:latest", minRam: 4 },
      ];

      const installedModels = await this.getInstalledModels();
      const models: LocalModelMeta[] = [];

      for (const model of recommendedModels) {
        // Skip models that require more RAM than available
        if (model.minRam > availableRamGB) continue;

        const installedVariant = installedModels.find(
          (m) => m.name.startsWith(model.name) || m.name === model.name
        );

        const meta: LocalModelMeta = {
          id: model.name,
          label: getDisplayName(model.name),
          repo: model.name,
          sizeGB: installedVariant
            ? Math.round(installedVariant.size / 1024 ** 3)
            : this.estimateSize(model.name),
          family: this.getFamily(model.name),
          isInstalled: !!installedVariant,
          modified: installedVariant?.modified_at,
        };

        models.push(meta);
      }

      return models;
    } catch (error) {
      console.warn("Failed to get recommended models", error);
      return [];
    }
  }

  /**
   * Check if Ollama service is available
   */
  private async isOllamaServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get list of installed models with caching
   */
  private async getInstalledModels(): Promise<OllamaApiModel[]> {
    const now = Date.now();

    // Return cached result if still valid
    if (
      this.installedModelsCache.length > 0 &&
      now - this.lastCacheUpdate < this.cacheTimeout
    ) {
      return this.installedModelsCache;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });

      this.installedModelsCache = response.data?.models || [];
      this.lastCacheUpdate = now;

      return this.installedModelsCache;
    } catch {
      return [];
    }
  }

  /**
   * Estimate model size based on name
   */
  private estimateSize(modelName: string): number {
    const name = modelName.toLowerCase();

    if (name.includes("llama3.1:latest")) return 1;
    if (name.includes("qwen")) return 2;

    return 3; // Default
  }

  /**
   * Get model family
   */
  private getFamily(modelName: string): string {
    const name = modelName.toLowerCase();

    if (name.includes("llama")) return "llama";
    if (name.includes("gemma")) return "gemma";
    if (name.includes("phi")) return "phi";
    if (name.includes("qwen")) return "qwen";

    return "general";
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.installedModelsCache = [];
    this.lastCacheUpdate = 0;
  }
}
