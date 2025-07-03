// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import type { IAdapterInfo } from "../../../src/services/p2p/core/interfaces";

/**
 * AdapterRegistry - Manages adapter information and paths
 * Following SRP - only responsible for adapter registry operations
 */
export class AdapterRegistry {
  private adapters: Map<string, IAdapterInfo> = new Map();

  /**
   * Register an adapter
   */
  registerAdapter(adapter: IAdapterInfo): void {
    this.adapters.set(adapter.topic, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(topic: string): void {
    this.adapters.delete(topic);
  }

  /**
   * Get adapter by topic
   */
  getAdapter(topic: string): IAdapterInfo | undefined {
    return this.adapters.get(topic);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): IAdapterInfo[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Check if model exists in Ollama via API
   */
  private async checkModelExists(modelName: string): Promise<boolean> {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) {
        console.log(
          `[AdapterRegistry] Ollama API not available: ${response.status}`
        );
        return false;
      }

      const data = await response.json();
      const models = data.models || [];

      // Check if model exists in the list
      const modelExists = models.some((model: any) => model.name === modelName);

      if (!modelExists) {
        console.log(
          `[AdapterRegistry] Model ${modelName} not found in Ollama. Available models:`,
          models.map((m: any) => m.name)
        );
      }

      return modelExists;
    } catch (error) {
      console.error(`[AdapterRegistry] Error checking model existence:`, error);
      return false;
    }
  }

  /**
   * Find Ollama model path
   */
  async findModelPath(modelName: string): Promise<string | null> {
    try {
      // First, check if model exists in Ollama
      const modelExists = await this.checkModelExists(modelName);
      if (!modelExists) {
        console.log(
          `[AdapterRegistry] Model ${modelName} does not exist in Ollama`
        );
        return null;
      }

      // Determine Ollama home directory
      const platform = process.platform;
      let ollamaHome: string;

      if (platform === "win32") {
        ollamaHome =
          process.env.OLLAMA_HOME ||
          path.join(os.homedir(), "AppData", "Local", "Ollama");
      } else if (platform === "darwin") {
        ollamaHome =
          process.env.OLLAMA_HOME || path.join(os.homedir(), ".ollama");
      } else {
        ollamaHome =
          process.env.OLLAMA_HOME || path.join(os.homedir(), ".ollama");
      }

      // Look for model manifest
      const manifestPath = path.join(
        ollamaHome,
        "models",
        "manifests",
        "registry.ollama.ai",
        "library",
        modelName.replace(":", "/") // Handle model:tag format
      );

      console.log(`[AdapterRegistry] Looking for model at: ${manifestPath}`);

      try {
        await fs.access(manifestPath);
      } catch {
        console.log(`[AdapterRegistry] Manifest not found at ${manifestPath}`);

        // Try alternative paths for custom models
        const customManifestPath = path.join(
          ollamaHome,
          "models",
          "manifests",
          "localhost",
          modelName.replace(":", "/")
        );

        try {
          await fs.access(customManifestPath);
          console.log(
            `[AdapterRegistry] Found custom model manifest at: ${customManifestPath}`
          );
          return await this.extractModelPath(customManifestPath, ollamaHome);
        } catch {
          console.log(
            `[AdapterRegistry] Custom manifest not found at ${customManifestPath}`
          );
          return null;
        }
      }

      return await this.extractModelPath(manifestPath, ollamaHome);
    } catch (error) {
      console.error(`[AdapterRegistry] Error finding model path:`, error);
      return null;
    }
  }

  /**
   * Extract model path from manifest
   */
  private async extractModelPath(
    manifestPath: string,
    ollamaHome: string
  ): Promise<string | null> {
    try {
      // Read manifest to find model blob
      const manifestData = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestData);

      const layers = manifest.layers || [];

      // For LoRA adapters, find the adapter layer first
      const adapterLayer = layers.find(
        (layer: any) =>
          layer.mediaType === "application/vnd.ollama.adapter.lora" ||
          layer.mediaType === "application/vnd.ollama.image.adapter"
      );

      if (adapterLayer?.digest) {
        // Extract hash from digest (format: sha256:hash)
        const hash = adapterLayer.digest.split(":")[1];
        const blobPath = path.join(
          ollamaHome,
          "models",
          "blobs",
          `sha256-${hash}`
        );

        // Verify file exists
        try {
          await fs.access(blobPath);
          console.log(
            `[AdapterRegistry] Found LoRA adapter file at: ${blobPath}`
          );
          return blobPath;
        } catch {
          console.log(
            `[AdapterRegistry] LoRA adapter blob file not found at ${blobPath}`
          );
        }
      }

      // If not found as LoRA adapter, try as regular model (for custom/fine-tuned models)
      const modelLayer = layers.find(
        (layer: any) => layer.mediaType === "application/vnd.ollama.image.model"
      );

      if (modelLayer?.digest) {
        const hash = modelLayer.digest.split(":")[1];
        const blobPath = path.join(
          ollamaHome,
          "models",
          "blobs",
          `sha256-${hash}`
        );

        try {
          await fs.access(blobPath);
          console.log(`[AdapterRegistry] Found model file at: ${blobPath}`);
          return blobPath;
        } catch {
          console.log(
            `[AdapterRegistry] Model blob file not found at ${blobPath}`
          );
        }
      }

      // If still not found, try the first layer with a size > 1MB (likely the model)
      const largeLayer = layers.find(
        (layer: any) => layer.size && layer.size > 1024 * 1024 && layer.digest
      );

      if (largeLayer?.digest) {
        const hash = largeLayer.digest.split(":")[1];
        const blobPath = path.join(
          ollamaHome,
          "models",
          "blobs",
          `sha256-${hash}`
        );

        try {
          await fs.access(blobPath);
          console.log(
            `[AdapterRegistry] Found large layer file at: ${blobPath} (${largeLayer.mediaType})`
          );
          return blobPath;
        } catch {
          console.log(
            `[AdapterRegistry] Large layer blob file not found at ${blobPath}`
          );
        }
      }

      console.log(
        `[AdapterRegistry] No suitable model file found in manifest layers:`,
        layers.map((l: any) => ({ mediaType: l.mediaType, size: l.size }))
      );
      return null;
    } catch (error) {
      console.error(
        `[AdapterRegistry] Error extracting model path from manifest:`,
        error
      );
      return null;
    }
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
  }
}
