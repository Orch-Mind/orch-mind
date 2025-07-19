// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as fs from "fs/promises";
import * as path from "path";
import type { IAdapterInfo } from "../../../src/services/p2p/core/interfaces";

/**
 * AdapterRegistry - Manages adapter information and paths
 * Following SRP - only responsible for adapter registry operations
 */
export class AdapterRegistry {
  private adapters: Map<string, IAdapterInfo> = new Map();
  private pathCache: Map<string, string> = new Map(); // Cache para caminhos encontrados
  private preloadPromise: Promise<void> | null = null; // Track preload status

  constructor() {
    // Pré-carrega os caminhos dos adapters na inicialização (sem await para não bloquear)
    this.preloadPromise = this.preloadAdapterPaths().catch((err) => {
      console.warn(`[AdapterRegistry] Failed to preload adapter paths:`, err);
      this.preloadPromise = null; // Reset on error so it can be retried
    });
  }

  /**
   * Force preload adapter paths and wait for completion
   */
  async ensureAdaptersLoaded(): Promise<void> {
    // If preload is still in progress, wait for it
    if (this.preloadPromise) {
      console.log(
        `[AdapterRegistry] Waiting for initial preload to complete...`
      );
      await this.preloadPromise;
      return;
    }

    // If cache is empty (preload failed or not started), force reload
    if (this.pathCache.size === 0) {
      console.log(`[AdapterRegistry] Cache empty, forcing preload...`);
      this.preloadPromise = this.preloadAdapterPaths().finally(() => {
        this.preloadPromise = null;
      });
      await this.preloadPromise;
    }
  }

  /**
   * Get the correct project root directory
   */
  private getProjectRoot(): string {
    const { app } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const os = require("os");

    console.log(`[AdapterRegistry] 🔍 DEBUG Project Root Resolution:`);
    console.log(`[AdapterRegistry]   - app.isPackaged: ${app.isPackaged}`);
    console.log(`[AdapterRegistry]   - process.cwd(): ${process.cwd()}`);
    console.log(`[AdapterRegistry]   - __dirname: ${__dirname}`);
    console.log(`[AdapterRegistry]   - __filename: ${__filename}`);

    if (process.resourcesPath) {
      console.log(
        `[AdapterRegistry]   - process.resourcesPath: ${process.resourcesPath}`
      );
    } else {
      console.log(`[AdapterRegistry]   - process.resourcesPath: undefined`);
    }

    // CRITICAL FIX: Add userData directory path that matches Python's get_project_root()
    // Platform-specific paths to match Python's behavior
    let userDataDir: string;
    if (process.platform === "win32") {
      // Windows: Use AppData/Local/Programs/lora_adapters as reported by user
      userDataDir = path.join(os.homedir(), "AppData", "Local", "Programs");
    } else if (process.platform === "darwin") {
      // macOS: Use Library/Application Support/Orch-Mind
      userDataDir = path.join(os.homedir(), "Library", "Application Support", "Orch-Mind");
    } else {
      // Linux: Use .local/share/orch-mind
      userDataDir = path.join(os.homedir(), ".local", "share", "orch-mind");
    }

    // List of potential project root directories to try
    const potentialRoots = [
      // 1. PRIORITY: In development, check current working directory first
      process.cwd(),

      // 2. Check userData directory (matches Python production behavior)
      userDataDir,

      // 3. Go up from current file location (works in some Electron contexts)
      path.resolve(__dirname, "../../../.."),

      // 4. Use app.getAppPath() if available (Electron app path)
      app.getAppPath ? app.getAppPath() : null,

      // 5. Production: use parent of resources directory
      process.resourcesPath ? path.resolve(process.resourcesPath, "..") : null,

      // 6. Manual fallback to known project path (last resort)
      "/Users/guilhermeferraribrescia/orch-mind",
    ].filter(Boolean) as string[];

    console.log(
      `[AdapterRegistry]   - Potential roots to try: ${potentialRoots.length}`
    );
    console.log(
      `[AdapterRegistry]   - PRIORITY: Checking current working directory first in development: ${process.cwd()}`
    );

    // Try each potential root and find the one that contains lora_adapters
    for (const candidateRoot of potentialRoots) {
      try {
        const loraAdaptersPath = path.join(candidateRoot, "lora_adapters");

        // Check if this path has the lora_adapters directory
        if (fs.existsSync(loraAdaptersPath)) {
          console.log(
            `[AdapterRegistry] ✅ Found valid project root: ${candidateRoot}`
          );
          console.log(
            `[AdapterRegistry]   - Contains lora_adapters at: ${loraAdaptersPath}`
          );
          return candidateRoot;
        } else {
          console.log(
            `[AdapterRegistry]   - Rejected ${candidateRoot}: no lora_adapters directory`
          );
        }
      } catch (error) {
        console.log(
          `[AdapterRegistry]   - Error checking ${candidateRoot}: ${error}`
        );
      }
    }

    // If we get here, none of the candidates worked
    console.error(`[AdapterRegistry] ❌ Could not find valid project root!`);
    console.error(
      `[AdapterRegistry]   - Tried ${potentialRoots.length} candidates`
    );
    console.error(
      `[AdapterRegistry]   - Falling back to userData directory: ${userDataDir}`
    );

    // FALLBACK FIX: Create userData directory structure if it doesn't exist
    // This ensures consistency with Python behavior
    try {
      const loraAdaptersPath = path.join(userDataDir, "lora_adapters");
      fs.mkdirSync(path.join(loraAdaptersPath, "weights"), { recursive: true });
      fs.mkdirSync(path.join(loraAdaptersPath, "registry"), {
        recursive: true,
      });
      console.log(
        `[AdapterRegistry] ✅ Created userData directory structure: ${loraAdaptersPath}`
      );
    } catch (error) {
      console.error(
        `[AdapterRegistry] Failed to create userData directory: ${error}`
      );
    }

    return userDataDir;
  }

  /**
   * Pre-load adapter paths to cache for faster access
   */
  private async preloadAdapterPaths(): Promise<void> {
    try {
      console.log(`[AdapterRegistry] Starting preload of adapter paths...`);

      // Use the improved project root resolution
      const projectRoot = this.getProjectRoot();
      const adapterWeightsDir = path.join(
        projectRoot,
        "lora_adapters",
        "weights"
      );

      console.log(`[AdapterRegistry] Project root: ${projectRoot}`);
      console.log(
        `[AdapterRegistry] Scanning weights directory: ${adapterWeightsDir}`
      );

      if (!(await this.checkPathExists(adapterWeightsDir))) {
        console.log(
          `[AdapterRegistry] Weights directory not found, skipping preload`
        );
        return;
      }

      const adapterDirs = await fs.readdir(adapterWeightsDir);
      console.log(
        `[AdapterRegistry] Found ${adapterDirs.length} potential adapter directories`
      );

      let loadedCount = 0;
      for (const dirName of adapterDirs) {
        const adapterDir = path.join(adapterWeightsDir, dirName);

        try {
          const stat = await fs.stat(adapterDir);

          if (stat.isDirectory()) {
            // Try to find safetensors or bin files
            const safetensorsFiles = [
              "adapter_model.safetensors",
              "pytorch_model.safetensors",
              "model.safetensors",
            ];

            for (const filename of safetensorsFiles) {
              const safetensorsPath = path.join(adapterDir, filename);
              if (await this.checkPathExists(safetensorsPath)) {
                // ENHANCED: Cache comprehensive naming variations to handle localStorage/filesystem inconsistency
                // Example: "gemma3-adapter-1751636717504_adapter" (filesystem) needs to be found by "gemma3_adapter_1751636717504_adapter" (localStorage)

                const baseDirName = dirName.replace(/_adapter$/, "");
                const possibleNames = [
                  // 1. Original directory name
                  dirName,
                  baseDirName,

                  // 2. Convert hyphens to underscores (filesystem -> localStorage)
                  // "gemma3-adapter-1751636717504_adapter" -> "gemma3_adapter_1751636717504_adapter"
                  dirName.replace(/-/g, "_"),
                  baseDirName.replace(/-/g, "_"),

                  // 3. Convert underscores to hyphens (localStorage -> filesystem)
                  dirName.replace(/_/g, "-"),
                  baseDirName.replace(/_/g, "-"),

                  // 4. Handle specific pattern: "model-adapter-timestamp" -> "model_adapter_timestamp"
                  dirName.replace(
                    /^([^-]+)-adapter-(.+)_adapter$/,
                    "$1_adapter_$2_adapter"
                  ),
                  dirName.replace(
                    /^([^-]+)-adapter-(.+)_adapter$/,
                    "$1_adapter_$2"
                  ),
                  baseDirName.replace(
                    /^([^-]+)-adapter-(.+)$/,
                    "$1_adapter_$2"
                  ),

                  // 5. Handle reverse pattern: "model_adapter_timestamp" -> "model-adapter-timestamp"
                  dirName.replace(
                    /^([^_]+)_adapter_(.+)_adapter$/,
                    "$1-adapter-$2_adapter"
                  ),
                  dirName.replace(
                    /^([^_]+)_adapter_(.+)_adapter$/,
                    "$1-adapter-$2"
                  ),
                  baseDirName.replace(
                    /^([^_]+)_adapter_(.+)$/,
                    "$1-adapter-$2"
                  ),

                  // 6. Additional mixed patterns
                  dirName.replace(/-adapter$/, "_adapter"),
                  dirName.replace(/_adapter$/, "-adapter"),
                  baseDirName.replace(/-adapter$/, "_adapter"),
                  baseDirName.replace(/_adapter$/, "-adapter"),
                  baseDirName + "_adapter",
                  baseDirName + "-adapter",
                  baseDirName.replace(/-/g, "_") + "_adapter",
                  baseDirName.replace(/_/g, "-") + "-adapter",
                ];

                // Remove duplicates and cache all variations
                const uniqueNames = [...new Set(possibleNames)];
                for (const name of uniqueNames) {
                  this.pathCache.set(name, safetensorsPath);
                }

                console.log(
                  `[AdapterRegistry] ✓ Pre-cached adapter: ${dirName} -> ${safetensorsPath} (${uniqueNames.length} name variations)`
                );
                console.log(
                  `[AdapterRegistry]   Cached names: ${uniqueNames
                    .slice(0, 5)
                    .join(", ")}${uniqueNames.length > 5 ? "..." : ""}`
                );
                loadedCount++;
                break;
              }
            }
          }
        } catch (err) {
          console.warn(
            `[AdapterRegistry] Error processing directory ${dirName}:`,
            err
          );
        }
      }

      console.log(
        `[AdapterRegistry] ✓ Preload complete: ${loadedCount} adapters loaded, ${this.pathCache.size} total cache entries`
      );
    } catch (error) {
      console.error(
        `[AdapterRegistry] Failed to pre-load adapter paths:`,
        error
      );
      throw error; // Re-throw so caller knows it failed
    }
  }

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
   * Get LoRA adapter metadata from registry
   */
  async getAdapterMetadata(adapterName: string): Promise<any | null> {
    try {
      // Use the improved project root resolution
      const projectRoot = this.getProjectRoot();
      const adapterRegistryDir = path.join(
        projectRoot,
        "lora_adapters",
        "registry"
      );

      // Clean adapter name - remove _adapter suffix if present
      const cleanAdapterName = adapterName.replace(/_adapter$/, "");

      // ENHANCED: Handle localStorage/filesystem naming inconsistency for registry files
      // Example: "gemma3_adapter_1751636717504_adapter" (localStorage) -> "gemma3-adapter-1751636717504_adapter.json" (filesystem)

      // Try multiple possible registry file names with comprehensive naming conventions
      const possibleRegistryFiles = [
        // 1. Original naming
        path.join(adapterRegistryDir, `${adapterName}_adapter.json`),
        path.join(adapterRegistryDir, `${adapterName}.json`),

        // 2. Clean naming
        path.join(adapterRegistryDir, `${cleanAdapterName}_adapter.json`),
        path.join(adapterRegistryDir, `${cleanAdapterName}.json`),

        // 3. CRITICAL: Handle localStorage underscore -> filesystem hyphen conversion
        // "gemma3_adapter_1751636717504" -> "gemma3-adapter-1751636717504"
        path.join(
          adapterRegistryDir,
          `${cleanAdapterName.replace(/_/g, "-")}_adapter.json`
        ),
        path.join(
          adapterRegistryDir,
          `${cleanAdapterName.replace(/_/g, "-")}.json`
        ),

        // 4. Handle full name underscore -> hyphen conversion
        // "gemma3_adapter_1751636717504_adapter" -> "gemma3-adapter-1751636717504_adapter"
        path.join(
          adapterRegistryDir,
          `${adapterName.replace(/_/g, "-")}_adapter.json`
        ),
        path.join(adapterRegistryDir, `${adapterName.replace(/_/g, "-")}.json`),

        // 5. Handle specific pattern: "model_adapter_timestamp" -> "model-adapter-timestamp"
        path.join(
          adapterRegistryDir,
          `${cleanAdapterName.replace(
            /^([^_]+)_adapter_(.+)$/,
            "$1-adapter-$2"
          )}_adapter.json`
        ),
        path.join(
          adapterRegistryDir,
          `${cleanAdapterName.replace(
            /^([^_]+)_adapter_(.+)$/,
            "$1-adapter-$2"
          )}.json`
        ),

        // 6. Handle mixed patterns (common issue)
        path.join(
          adapterRegistryDir,
          `${adapterName.replace(/_adapter/g, "-adapter")}.json`
        ),
        path.join(
          adapterRegistryDir,
          `${cleanAdapterName.replace(/_/g, "-")}-adapter.json`
        ),
      ];

      console.log(
        `[AdapterRegistry] Searching for metadata in files:`,
        possibleRegistryFiles.slice(0, 3)
      );

      for (const registryPath of possibleRegistryFiles) {
        if (await this.checkPathExists(registryPath)) {
          console.log(`[AdapterRegistry] Found metadata: ${registryPath}`);

          const metadataContent = await fs.readFile(registryPath, "utf-8");
          const metadata = JSON.parse(metadataContent);

          return {
            ...metadata,
            registryPath,
            adapterName,
          };
        }
      }

      console.log(`[AdapterRegistry] No metadata found for: ${adapterName}`);
      console.log(
        `[AdapterRegistry] Searched registry files:`,
        possibleRegistryFiles.map((p) => path.basename(p)).slice(0, 5)
      );
      return null;
    } catch (error) {
      console.error(`[AdapterRegistry] Error reading metadata:`, error);
      return null;
    }
  }

  /**
   * Find LoRA adapter safetensors file in project directory
   */
  async findModelPath(adapterName: string): Promise<string | null> {
    console.log(`🔍 [ADAPTER-REGISTRY] Finding model path for: ${adapterName}`);

    try {
      // Ensure adapters are loaded first
      await this.ensureAdaptersLoaded();

      // Check cache first
      if (this.pathCache.has(adapterName)) {
        const cachedPath = this.pathCache.get(adapterName)!;
        console.log(`[AdapterRegistry] Found in cache: ${cachedPath}`);
        // Verify cached path still exists
        if (await this.checkPathExists(cachedPath)) {
          return cachedPath;
        } else {
          // Remove invalid cache entry
          this.pathCache.delete(adapterName);
        }
      }

      // Try to find by similar names in cache
      const cleanCacheName = adapterName.replace(/_adapter$/, "");
      const possibleCacheNames = [
        adapterName,
        cleanCacheName,
        cleanCacheName.replace(/_/g, "-"),
        cleanCacheName.replace(/_/g, "-") + "_adapter",
        cleanCacheName + "_adapter",
        // Add the pattern that works: underscores to hyphens for the full name
        adapterName.replace(/_/g, "-"),
        cleanCacheName.replace(/_/g, "-") + "-adapter",
      ];

      for (const cacheName of possibleCacheNames) {
        if (this.pathCache.has(cacheName)) {
          const cachedPath = this.pathCache.get(cacheName)!;
          console.log(
            `[AdapterRegistry] Found similar name in cache: ${cacheName} -> ${cachedPath}`
          );
          if (await this.checkPathExists(cachedPath)) {
            // Cache the original name too
            this.pathCache.set(adapterName, cachedPath);
            return cachedPath;
          }
        }
      }

      // Use the improved project root resolution
      const projectRoot = this.getProjectRoot();

      // Look for adapter in the LoRA adapters directory
      const adapterWeightsDir = path.join(
        projectRoot,
        "lora_adapters",
        "weights"
      );

      console.log(`[AdapterRegistry] Project root: ${projectRoot}`);
      console.log(
        `[AdapterRegistry] Looking in weights dir: ${adapterWeightsDir}`
      );

      // Clean adapter name - remove _adapter suffix if present
      const cleanAdapterName = adapterName.replace(/_adapter$/, "");

      // CRITICAL FIX: Handle the naming inconsistency between localStorage (underscores) and filesystem (hyphens)
      // Example: "gemma3_adapter_1751636717504_adapter" (localStorage) -> "gemma3-adapter-1751636717504_adapter" (filesystem)

      // Try multiple adapter directory names with comprehensive naming conventions
      const possibleAdapterDirs = [
        // 1. Original naming (with _adapter suffix)
        path.join(adapterWeightsDir, `${adapterName}_adapter`),
        path.join(adapterWeightsDir, adapterName),

        // 2. Clean naming (without _adapter suffix, then add _adapter)
        path.join(adapterWeightsDir, `${cleanAdapterName}_adapter`),
        path.join(adapterWeightsDir, cleanAdapterName),

        // 3. CRITICAL: Handle localStorage underscore -> filesystem hyphen conversion
        // "gemma3_adapter_1751636717504" -> "gemma3-adapter-1751636717504"
        path.join(
          adapterWeightsDir,
          `${cleanAdapterName.replace(/_/g, "-")}_adapter`
        ),
        path.join(adapterWeightsDir, cleanAdapterName.replace(/_/g, "-")),

        // 4. Handle full name underscore -> hyphen conversion
        // "gemma3_adapter_1751636717504_adapter" -> "gemma3-adapter-1751636717504_adapter"
        path.join(adapterWeightsDir, adapterName.replace(/_/g, "-")),
        path.join(
          adapterWeightsDir,
          `${adapterName.replace(/_/g, "-")}_adapter`
        ),

        // 5. Handle mixed patterns (common issue)
        path.join(
          adapterWeightsDir,
          `${adapterName.replace(/_adapter/g, "-adapter")}`
        ),
        path.join(
          adapterWeightsDir,
          `${cleanAdapterName.replace(/_/g, "-")}-adapter`
        ),

        // 6. SPECIFIC FIX: Handle the exact pattern we're seeing
        // "gemma3_adapter_1751636717504_adapter" -> "gemma3-adapter-1751636717504_adapter"
        // This handles cases where localStorage has "model_adapter_timestamp_adapter" format
        path.join(
          adapterWeightsDir,
          cleanAdapterName.replace(
            /^([^_]+)_adapter_(.+)$/,
            "$1-adapter-$2_adapter"
          )
        ),
        path.join(
          adapterWeightsDir,
          cleanAdapterName.replace(/^([^_]+)_adapter_(.+)$/, "$1-adapter-$2")
        ),
      ];

      console.log(
        `[AdapterRegistry] Searching for adapter in directories:`,
        possibleAdapterDirs
      );

      for (const adapterDir of possibleAdapterDirs) {
        if (await this.checkPathExists(adapterDir)) {
          console.log(
            `[AdapterRegistry] Found adapter directory: ${adapterDir}`
          );

          // Look for safetensors files first (preferred format)
          const safetensorsFiles = [
            "adapter_model.safetensors",
            "pytorch_model.safetensors",
            "model.safetensors",
          ];

          for (const filename of safetensorsFiles) {
            const safetensorsPath = path.join(adapterDir, filename);
            if (await this.checkPathExists(safetensorsPath)) {
              console.log(
                `[AdapterRegistry] Found safetensors file: ${safetensorsPath}`
              );
              // Cache the successful path
              this.pathCache.set(adapterName, safetensorsPath);
              return safetensorsPath;
            }
          }

          // Fallback to .bin files if no safetensors found
          const binFiles = ["adapter_model.bin", "pytorch_model.bin"];
          for (const filename of binFiles) {
            const binPath = path.join(adapterDir, filename);
            if (await this.checkPathExists(binPath)) {
              console.log(
                `[AdapterRegistry] Found bin file (fallback): ${binPath}`
              );
              // Cache the successful path
              this.pathCache.set(adapterName, binPath);
              return binPath;
            }
          }
        }
      }

      console.log(
        `[AdapterRegistry] Adapter weights not found for: ${adapterName}`
      );
      console.log(
        `[AdapterRegistry] Searched directories:`,
        possibleAdapterDirs
      );

      return null;
    } catch (error) {
      console.error(`[AdapterRegistry] Error finding adapter path:`, error);
      return null;
    }
  }

  /**
   * Check if a path exists
   */
  private async checkPathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
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
   * Clear all cached data and force reload
   */
  clear(): void {
    this.adapters.clear();
    this.pathCache.clear();
    this.preloadPromise = null;
    console.log(`[AdapterRegistry] Cleared all cached data`);
  }

  /**
   * Force refresh of adapter cache
   */
  async refreshCache(): Promise<void> {
    console.log(`[AdapterRegistry] Forcing cache refresh...`);
    this.pathCache.clear();
    this.preloadPromise = null;

    // Force preload with new paths
    this.preloadPromise = this.preloadAdapterPaths().finally(() => {
      this.preloadPromise = null;
    });

    await this.preloadPromise;
    console.log(`[AdapterRegistry] Cache refresh completed`);
  }
}
