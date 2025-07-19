// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export interface AdapterMergeMetadata {
  sourceAdapters: Array<{
    id: string;
    name: string;
    baseModel: string;
    checksum: string;
    timestamp: string;
    author?: string;
    peers?: number;
  }>;
  mergeStrategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  mergeTimestamp: string;
  mergedBy: string;
  targetBaseModel: string;
  mergedAdapterPath: string;
  mergedChecksum: string;
}

export interface MergeRequest {
  adapters: Array<{
    name: string;
    path: string;
    baseModel: string;
    checksum: string;
    weight?: number; // Para weighted average
  }>;
  strategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  outputName: string;
  targetBaseModel: string;
}

export interface MergeResult {
  success: boolean;
  mergedAdapterPath?: string;
  metadata?: AdapterMergeMetadata;
  error?: string;
}

export class LoRAMergeService {
  private readonly mergeDir: string;
  private readonly pythonScriptPath: string;
  private readonly adapterRegistry: any;

  constructor() {
    const projectRoot = this.getProjectRoot();
    this.mergeDir = path.join(projectRoot, "adapters", "merged");

    // CRITICAL FIX: Use proper script path detection for production vs development
    this.pythonScriptPath = this.getMergeScriptPath();

    // Import AdapterRegistry for path resolution with fallback
    try {
      // Try different possible paths for AdapterRegistry
      let AdapterRegistry;
      try {
        // Development path
        AdapterRegistry =
          require("../../handlers/p2p/AdapterRegistry").AdapterRegistry;
      } catch {
        try {
          // Build path - try absolute from project root
          const registryPath = path.join(
            __dirname,
            "..",
            "..",
            "handlers",
            "p2p",
            "AdapterRegistry"
          );
          AdapterRegistry = require(registryPath).AdapterRegistry;
        } catch {
          // Fallback - create a minimal adapter registry
          console.warn(
            "[LoRAMergeService] AdapterRegistry not found, using fallback implementation"
          );
          AdapterRegistry = this.createFallbackAdapterRegistry();
        }
      }
      this.adapterRegistry = new AdapterRegistry();
    } catch (error) {
      console.warn(
        "[LoRAMergeService] Failed to initialize AdapterRegistry:",
        error instanceof Error ? error.message : "Unknown error"
      );
      const FallbackRegistry = this.createFallbackAdapterRegistry();
      this.adapterRegistry = new FallbackRegistry();
    }

    console.log(`[LoRAMergeService] Using project root: ${projectRoot}`);
    console.log(`[LoRAMergeService] Merge directory: ${this.mergeDir}`);
    console.log(`[LoRAMergeService] Python script: ${this.pythonScriptPath}`);
  }

  /**
   * Create a fallback adapter registry when the real one is not available
   * CRITICAL FIX: Use exact same logic as AdapterRegistry.findModelPath()
   */
  private createFallbackAdapterRegistry() {
    const self = this; // Capture 'this' context for use in the class
    
    return class FallbackAdapterRegistry {
      async findModelPath(adapterName: string): Promise<string | null> {
        console.log(`🔍 [FALLBACK-ADAPTER-REGISTRY] Finding model path for: ${adapterName}`);

        try {
          // Use the same project root resolution as the main service
          const projectRoot = self.getProjectRoot();
          
          // Look for adapter in the LoRA adapters directory
          const adapterWeightsDir = path.join(
            projectRoot,
            "lora_adapters",
            "weights"
          );

          console.log(`[FallbackAdapterRegistry] Project root: ${projectRoot}`);
          console.log(
            `[FallbackAdapterRegistry] Looking in weights dir: ${adapterWeightsDir}`
          );

          // Clean adapter name - remove _adapter suffix if present
          const cleanAdapterName = adapterName.replace(/_adapter$/, "");

          // CRITICAL FIX: Use EXACT same logic as AdapterRegistry.findModelPath()
          // Handle the naming inconsistency between localStorage (underscores) and filesystem (hyphens)
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
            `[FallbackAdapterRegistry] Searching for adapter in directories:`,
            possibleAdapterDirs
          );

          for (const adapterDir of possibleAdapterDirs) {
            try {
              await fs.access(adapterDir);
              console.log(
                `[FallbackAdapterRegistry] Found adapter directory: ${adapterDir}`
              );

              // Look for safetensors files first (preferred format) - SAME ORDER AS AdapterRegistry
              const safetensorsFiles = [
                "adapter_model.safetensors",
                "pytorch_model.safetensors",
                "model.safetensors",
              ];

              for (const filename of safetensorsFiles) {
                const safetensorsPath = path.join(adapterDir, filename);
                try {
                  await fs.access(safetensorsPath);
                  console.log(
                    `[FallbackAdapterRegistry] Found safetensors file: ${safetensorsPath}`
                  );
                  return safetensorsPath;
                } catch {
                  // Continue to next file
                }
              }

              // Fallback to .bin files if no safetensors found - SAME ORDER AS AdapterRegistry
              const binFiles = ["adapter_model.bin", "pytorch_model.bin"];
              for (const filename of binFiles) {
                const binPath = path.join(adapterDir, filename);
                try {
                  await fs.access(binPath);
                  console.log(
                    `[FallbackAdapterRegistry] Found bin file (fallback): ${binPath}`
                  );
                  return binPath;
                } catch {
                  // Continue to next file
                }
              }
            } catch {
              // Continue to next directory
            }
          }

          console.log(
            `[FallbackAdapterRegistry] Adapter weights not found for: ${adapterName}`
          );
          console.log(
            `[FallbackAdapterRegistry] Searched directories:`,
            possibleAdapterDirs
          );

          return null;
        } catch (error) {
          console.error(`[FallbackAdapterRegistry] Error finding adapter path:`, error);
          return null;
        }
      }
    };
  }

  /**
   * Get the path to the merge script (similar logic to LoRATrainingService)
   */
  private getMergeScriptPath(): string {
    const { app } = require("electron");

    // Try multiple possible locations for the merge script
    const possiblePaths = [
      // For packaged applications (Windows/macOS/Linux) - extraResources
      path.join(
        process.resourcesPath || path.dirname(process.execPath),
        "scripts",
        "python",
        "lora_training",
        "merge_lora.py"
      ),
      // For development mode
      path.join(
        process.cwd(),
        "scripts",
        "python",
        "lora_training",
        "merge_lora.py"
      ),
      // Alternative for packaged apps in app.asar
      path.join(
        app.getAppPath(),
        "scripts",
        "python",
        "lora_training",
        "merge_lora.py"
      ),
      // Alternative relative path from build directory
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "scripts",
        "python",
        "lora_training",
        "merge_lora.py"
      ),
    ];

    console.log(`[LoRAMergeService] Searching for merge script...`);
    console.log(
      `[LoRAMergeService] process.resourcesPath: ${process.resourcesPath}`
    );
    console.log(`[LoRAMergeService] process.execPath: ${process.execPath}`);
    console.log(`[LoRAMergeService] app.getAppPath(): ${app.getAppPath()}`);
    console.log(`[LoRAMergeService] process.cwd(): ${process.cwd()}`);
    console.log(`[LoRAMergeService] __dirname: ${__dirname}`);

    for (const scriptPath of possiblePaths) {
      try {
        console.log(`[LoRAMergeService] Trying path: ${scriptPath}`);
        // Synchronous check since we're in a loop
        require("fs").accessSync(scriptPath);
        console.log(`[LoRAMergeService] Found merge script at: ${scriptPath}`);
        return scriptPath;
      } catch (error) {
        console.log(`[LoRAMergeService] Path not found: ${scriptPath}`);
        // Continue to next path
      }
    }

    throw new Error(
      `Merge script not found. Tried paths: ${possiblePaths.join(", ")}`
    );
  }

  /**
   * Get the correct project root directory (EXACT same logic as AdapterRegistry)
   */
  private getProjectRoot(): string {
    const { app } = require("electron");
    const fs = require("fs");
    const os = require("os");

    console.log(`[LoRAMergeService] 🔍 DEBUG Project Root Resolution:`);
    console.log(`[LoRAMergeService]   - app.isPackaged: ${app.isPackaged}`);
    console.log(`[LoRAMergeService]   - process.cwd(): ${process.cwd()}`);
    console.log(`[LoRAMergeService]   - __dirname: ${__dirname}`);
    console.log(`[LoRAMergeService]   - __filename: ${__filename}`);

    if (process.resourcesPath) {
      console.log(
        `[LoRAMergeService]   - process.resourcesPath: ${process.resourcesPath}`
      );
    } else {
      console.log(`[LoRAMergeService]   - process.resourcesPath: undefined`);
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

    // CRITICAL FIX: Use EXACT same order as AdapterRegistry
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
      `[LoRAMergeService]   - Potential roots to try: ${potentialRoots.length}`
    );
    console.log(
      `[LoRAMergeService]   - PRIORITY: Checking current working directory first in development: ${process.cwd()}`
    );

    // Try each potential root and find the one that contains lora_adapters
    for (const candidateRoot of potentialRoots) {
      try {
        const loraAdaptersPath = path.join(candidateRoot, "lora_adapters");

        // Check if this path has the lora_adapters directory
        if (fs.existsSync(loraAdaptersPath)) {
          console.log(
            `[LoRAMergeService] ✅ Found valid project root: ${candidateRoot}`
          );
          console.log(
            `[LoRAMergeService]   - Contains lora_adapters at: ${loraAdaptersPath}`
          );
          return candidateRoot;
        } else {
          console.log(
            `[LoRAMergeService]   - Rejected ${candidateRoot}: no lora_adapters directory`
          );
        }
      } catch (error) {
        console.log(
          `[LoRAMergeService]   - Error checking ${candidateRoot}: ${error}`
        );
      }
    }

    // If we get here, none of the candidates worked
    console.error(`[LoRAMergeService] ❌ Could not find valid project root!`);
    console.error(
      `[LoRAMergeService]   - Tried ${potentialRoots.length} candidates`
    );
    console.error(
      `[LoRAMergeService]   - Falling back to userData directory: ${userDataDir}`
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
        `[LoRAMergeService] ✅ Created userData directory structure: ${loraAdaptersPath}`
      );
    } catch (error) {
      console.error(
        `[LoRAMergeService] Failed to create userData directory: ${error}`
      );
    }

    return userDataDir;
  }

  /**
   * Valida se todos os adapters são compatíveis para fusão
   */
  private async validateAdaptersForMerge(
    adapters: MergeRequest["adapters"]
  ): Promise<MergeRequest["adapters"]> {
    if (adapters.length < 2) {
      throw new Error("Pelo menos 2 adapters são necessários para fusão");
    }

    // Verificar se todos os adapters têm o mesmo base model
    const baseModel = adapters[0].baseModel;
    const incompatibleAdapters = adapters.filter(
      (adapter) => adapter.baseModel !== baseModel
    );

    if (incompatibleAdapters.length > 0) {
      throw new Error(
        `Adapters incompatíveis encontrados. Base model esperado: ${baseModel}. ` +
          `Incompatíveis: ${incompatibleAdapters
            .map((a) => `${a.name} (${a.baseModel})`)
            .join(", ")}`
      );
    }

    // Resolver caminhos reais dos adapters usando AdapterRegistry
    const resolvedAdapters = [];
    for (const adapter of adapters) {
      console.log(
        `🔍 [LoRAMergeService] Resolving path for adapter: ${adapter.name}`
      );

      // Use AdapterRegistry to find the real adapter path
      const adapterPath = await this.adapterRegistry.findModelPath(
        adapter.name
      );

      if (!adapterPath) {
        throw new Error(`Adapter não encontrado: ${adapter.name}`);
      }

      // Get the directory containing the adapter
      const adapterDir = path.dirname(adapterPath);

      // Verify adapter_config.json exists in the directory
      const configPath = path.join(adapterDir, "adapter_config.json");
      try {
        await fs.access(configPath);
        console.log(`✅ Adapter validated: ${adapter.name} at ${adapterDir}`);

        // Update adapter with resolved path
        resolvedAdapters.push({
          ...adapter,
          path: adapterDir,
        });
      } catch (error) {
        throw new Error(
          `Adapter configuration not found: ${adapter.name} (missing adapter_config.json)`
        );
      }
    }

    console.log(
      `🔍 All ${resolvedAdapters.length} adapters validated for base model: ${baseModel}`
    );

    return resolvedAdapters;
  }

  /**
   * Cria arquivo de configuração para o script Python de fusão
   */
  private async createMergeConfig(
    request: MergeRequest,
    outputPath: string
  ): Promise<string> {
    const adaptersConfig = request.adapters.map((adapter) => ({
      name: adapter.name,
      path: adapter.path,
      weight: adapter.weight || 1.0,
    }));

    const config = {
      adapters: adaptersConfig,
      strategy: request.strategy,
      timestamp: new Date().toISOString(),
    };

    const configPath = path.join(
      this.mergeDir,
      `merge_config_${request.outputName}.json`
    );
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return configPath;
  }

  /**
   * Executa a fusão de adapters LoRA
   */
  async mergeAdapters(request: MergeRequest): Promise<MergeResult> {
    console.log(`🔄 Starting LoRA adapter merge: ${request.outputName}`);

    try {
      // Validar adapters e resolver caminhos
      const resolvedAdapters = await this.validateAdaptersForMerge(
        request.adapters
      );

      // Update request with resolved paths
      const resolvedRequest = {
        ...request,
        adapters: resolvedAdapters,
      };

      // Criar diretório de saída
      await fs.mkdir(this.mergeDir, { recursive: true });

      const outputPath = path.join(this.mergeDir, request.outputName);
      await fs.mkdir(outputPath, { recursive: true });

      // Criar arquivo de configuração
      const configPath = await this.createMergeConfig(
        resolvedRequest,
        outputPath
      );

      // Executar script Python
      console.log(`🐍 Executing merge script with config: ${configPath}`);

      const result = await this.executeMergeScript(configPath, outputPath);

      if (!result.success) {
        throw new Error(result.error || "Merge script execution failed");
      }

      // Calcular checksum do adapter merged
      const mergedWeightsPath = path.join(outputPath, "adapter_model.bin");
      const mergedChecksum = await this.calculateFileChecksum(
        mergedWeightsPath
      );

      // Criar metadados de fusão
      const metadata: AdapterMergeMetadata = {
        sourceAdapters: resolvedRequest.adapters.map((adapter) => ({
          id: crypto.randomBytes(16).toString("hex"),
          name: adapter.name,
          baseModel: adapter.baseModel,
          checksum: adapter.checksum,
          timestamp: new Date().toISOString(),
        })),
        mergeStrategy: resolvedRequest.strategy,
        mergeTimestamp: new Date().toISOString(),
        mergedBy: "Orch-Mind",
        targetBaseModel: resolvedRequest.targetBaseModel,
        mergedAdapterPath: outputPath,
        mergedChecksum,
      };

      // Salvar metadados
      const metadataPath = path.join(outputPath, "orch_merge_metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // CRITICAL FIX: Register merged adapter in the main adapter system
      // This allows the deploy system to find the merged adapter
      await this.registerMergedAdapterInMainSystem(
        request.outputName,
        outputPath,
        metadata
      );

      console.log(`✅ LoRA merge completed: ${request.outputName}`);
      console.log(`📁 Output path: ${outputPath}`);
      console.log(`🔒 Checksum: ${mergedChecksum}`);

      return {
        success: true,
        mergedAdapterPath: outputPath,
        metadata,
      };
    } catch (error) {
      console.error(`❌ LoRA merge failed: ${error}`);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Executa script Python de fusão
   */
  private async executeMergeScript(
    configPath: string,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        // CRITICAL FIX: Use compatible Python with dependencies like LoRATrainingService
        const pythonCommand = await this.findCompatiblePython();
        console.log(`🐍 [LoRAMergeService] Using Python: ${pythonCommand}`);

        // CRITICAL FIX: Handle Python commands with arguments (like "py -3.11")
        const pythonParts = pythonCommand.split(' ');
        const pythonExe = pythonParts[0];
        const pythonArgs = pythonParts.slice(1);
        
        console.log(`🐍 [LoRAMergeService] Python executable: ${pythonExe}`);
        console.log(`🐍 [LoRAMergeService] Python args: ${pythonArgs.join(' ')}`);
        console.log(`🐍 [LoRAMergeService] Script: ${this.pythonScriptPath}`);
        console.log(`🐍 [LoRAMergeService] Config: ${configPath}`);
        console.log(`🐍 [LoRAMergeService] Output: ${outputPath}`);

        const allArgs = [
          ...pythonArgs,
          this.pythonScriptPath,
          "--config",
          configPath,
          "--output",
          outputPath,
        ];

        const python = spawn(pythonExe, allArgs, {
          shell: false,
          cwd: this.mergeDir,
        });

        let output = "";
        let errorOutput = "";

        python.stdout.on("data", (data) => {
          const message = data.toString();
          console.log(message);
          output += message;
        });

        python.stderr.on("data", (data) => {
          const error = data.toString();
          console.error(error);
          errorOutput += error;
        });

        python.on("close", (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: `Script exited with code ${code}. Error: ${errorOutput}`,
            });
          }
        });

        python.on("error", (error) => {
          resolve({
            success: false,
            error: `Failed to execute script: ${error.message}`,
          });
        });
      } catch (error) {
        resolve({
          success: false,
          error: `Failed to find compatible Python: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });
  }

  /**
   * Calcula checksum de um arquivo
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Register merged adapter in the main adapter system for deployment
   */
  private async registerMergedAdapterInMainSystem(
    adapterName: string,
    mergedPath: string,
    metadata: AdapterMergeMetadata
  ): Promise<void> {
    try {
      const projectRoot = this.getProjectRoot();

      // Create main adapter system directories
      const weightsDir = path.join(projectRoot, "lora_adapters", "weights");
      const registryDir = path.join(projectRoot, "lora_adapters", "registry");

      await fs.mkdir(weightsDir, { recursive: true });
      await fs.mkdir(registryDir, { recursive: true });

      // Create symlink or copy merged adapter to weights directory
      const targetWeightsDir = path.join(weightsDir, `${adapterName}_adapter`);

      // SECURITY FIX: Always copy instead of symlink to avoid "insecure path" errors
      // Symlinks can create relative paths that Ollama considers insecure
      try {
        // Check if target already exists and remove it
        try {
          await fs.access(targetWeightsDir);
          await fs.rm(targetWeightsDir, { recursive: true, force: true });
          console.log(
            `🗑️ Removed existing adapter directory: ${targetWeightsDir}`
          );
        } catch {
          // Directory doesn't exist, which is fine
        }

        // Always copy to ensure absolute paths and avoid symlink security issues
        await this.copyDirectory(mergedPath, targetWeightsDir);
        console.log(
          `📁 Copied merged adapter: ${mergedPath} → ${targetWeightsDir}`
        );
        console.log(
          `🔒 Using direct copy to avoid Ollama "insecure path" errors`
        );
      } catch (error) {
        console.error(`❌ Failed to copy merged adapter:`, error);
        throw error;
      }

      // Create registry metadata for the merged adapter
      const registryMetadata = {
        adapter_id: adapterName,
        adapter_name: `${adapterName}_adapter`,
        base_model: metadata.targetBaseModel,
        hf_model: metadata.targetBaseModel,
        adapter_path: targetWeightsDir,
        created_at: metadata.mergeTimestamp,
        enabled: false,
        training_method: "merged",
        status: "ready",
        file_type: "safetensors",

        // Merge-specific metadata
        source: "merged",
        merge_strategy: metadata.mergeStrategy,
        source_adapters: metadata.sourceAdapters.map((a) => a.name),
        merged_by: metadata.mergedBy,
        merged_checksum: metadata.mergedChecksum,
      };

      // Save registry file
      const registryFilePath = path.join(
        registryDir,
        `${adapterName}_adapter.json`
      );
      await fs.writeFile(
        registryFilePath,
        JSON.stringify(registryMetadata, null, 2)
      );

      console.log(
        `📋 Registered merged adapter in main system: ${registryFilePath}`
      );
      console.log(`🎯 Deploy system can now find: ${adapterName}_adapter`);
    } catch (error) {
      console.error(
        `❌ Failed to register merged adapter in main system:`,
        error
      );
      // Don't throw - merge was successful, just registration failed
    }
  }

  /**
   * Copy directory recursively (fallback for symlink)
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Lista adapters merged disponíveis
   */
  async listMergedAdapters(): Promise<
    Array<{
      name: string;
      path: string;
      metadata: AdapterMergeMetadata;
    }>
  > {
    try {
      const mergedDirs = await fs.readdir(this.mergeDir);
      const adapters = [];

      for (const dirName of mergedDirs) {
        const dirPath = path.join(this.mergeDir, dirName);
        const metadataPath = path.join(dirPath, "orch_merge_metadata.json");

        try {
          const metadataContent = await fs.readFile(metadataPath, "utf-8");
          const metadata = JSON.parse(metadataContent) as AdapterMergeMetadata;

          adapters.push({
            name: dirName,
            path: dirPath,
            metadata,
          });
        } catch (error) {
          console.warn(`⚠️ Could not read metadata for ${dirName}: ${error}`);
        }
      }

      return adapters;
    } catch (error) {
      console.error(`❌ Error listing merged adapters: ${error}`);
      return [];
    }
  }

  /**
   * Remove adapter merged
   */
  async removeMergedAdapter(
    adapterName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adapterPath = path.join(this.mergeDir, adapterName);
      await fs.rm(adapterPath, { recursive: true, force: true });

      console.log(`🗑️ Removed merged adapter: ${adapterName}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `❌ Failed to remove merged adapter ${adapterName}: ${errorMessage}`
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Find compatible Python for merge operations (same logic as LoRATrainingService)
   */
  private async findCompatiblePython(): Promise<string> {
    const { promisify } = require("util");
    const execAsync = promisify(require("child_process").exec);

    const isWindows = process.platform === "win32";
    const isMacOS = process.platform === "darwin";

    console.log(
      `[LoRAMergeService] Detecting Python on ${process.platform}...`
    );

    // First, try to use the local training venv from LoRATrainingService
    console.log(`[LoRAMergeService] Checking for local training venv...`);
    const localVenvPython = await this.checkLocalTrainingVenv();

    if (localVenvPython) {
      console.log(
        `[LoRAMergeService] ✅ Using local training venv: ${localVenvPython}`
      );
      return localVenvPython;
    }

    // If that fails, fall back to system Python
    console.log(
      `[LoRAMergeService] Virtual environment not found, falling back to system Python...`
    );

    // Define platform-specific Python candidates
    let pythonCandidates: string[] = [];

    if (isWindows) {
      // First try PATH-based commands
      pythonCandidates = [
        "py -3.11", // Python Launcher with specific version
        "py -3.10",
        "py -3.9",
        "py -3.12",
        "python", // Standard command
        "python3", // Sometimes available on Windows
        "py", // Python Launcher default
      ];

      // Then try common Windows installation paths
      const windowsPaths = [
        // Python.org installer locations
        "C:\\Python311\\python.exe",
        "C:\\Python310\\python.exe",
        "C:\\Python39\\python.exe",
        "C:\\Python312\\python.exe",
        // Microsoft Store installations
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python311\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python310\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python39\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312\\python.exe`,
        // User AppData installations
        `${process.env.APPDATA}\\Python\\Python311\\python.exe`,
        `${process.env.APPDATA}\\Python\\Python310\\python.exe`,
        `${process.env.APPDATA}\\Python\\Python39\\python.exe`,
        `${process.env.APPDATA}\\Python\\Python312\\python.exe`,
        // Program Files installations
        "C:\\Program Files\\Python311\\python.exe",
        "C:\\Program Files\\Python310\\python.exe",
        "C:\\Program Files\\Python39\\python.exe",
        "C:\\Program Files\\Python312\\python.exe",
        "C:\\Program Files (x86)\\Python311\\python.exe",
        "C:\\Program Files (x86)\\Python310\\python.exe",
        "C:\\Program Files (x86)\\Python39\\python.exe",
        "C:\\Program Files (x86)\\Python312\\python.exe",
      ];

      pythonCandidates = pythonCandidates.concat(windowsPaths);
    } else {
      // macOS/Linux Python commands (unified approach like LoRATrainingService)
      pythonCandidates = [
        "python3.11", // PRIORIDADE: Versão mais estável para treinamento LoRA
        "python3.10",
        "python3.9",
        "python3.12", // Pode ter problemas, mas ainda compatível
        "python3", // fallback Unix
        "python", // General fallback
      ];
    }

    console.log(
      `[LoRAMergeService] Trying ${pythonCandidates.length} Python candidates...`
    );

    for (const pythonCmd of pythonCandidates) {
      try {
        console.log(`[LoRAMergeService] Testing Python: ${pythonCmd}`);

        // For full paths on Windows, check if file exists first
        if (isWindows && pythonCmd.includes(":\\")) {
          try {
            await execAsync(`if exist "${pythonCmd}" echo exists`);
          } catch {
            console.log(`[LoRAMergeService] ❌ Path not found: ${pythonCmd}`);
            continue;
          }
        }

        // Check if this Python version exists and get its version
        const { stdout } = await execAsync(`"${pythonCmd}" --version`);

        // Parse version (e.g., "Python 3.12.10")
        const versionStr = stdout.trim().split(" ")[1];
        const [major, minor] = versionStr.split(".").map(Number);

        console.log(
          `[LoRAMergeService] Found Python version: ${major}.${minor} (${versionStr})`
        );

        // Check if it's in the compatible range
        if (major === 3 && minor >= 9 && minor <= 13) {
          // CRITICAL FIX: Verify that torch is actually available in this Python
          try {
            const { stdout: torchCheck } = await execAsync(
              `"${pythonCmd}" -c "import torch; print(f'torch-{torch.__version__}')"`
            );

            const torchVersion = torchCheck.trim();
            console.log(
              `[LoRAMergeService] ✅ Selected Python: ${pythonCmd} (version ${versionStr}) with ${torchVersion}`
            );

            return pythonCmd;
          } catch (torchError) {
            console.log(
              `[LoRAMergeService] ❌ ${pythonCmd} (${versionStr}) missing torch: ${torchError}`
            );
            continue; // Try next Python candidate
          }
        } else {
          console.log(
            `[LoRAMergeService] ⚠️ ${pythonCmd} version ${versionStr} not compatible (needs 3.9-3.13)`
          );
        }
      } catch (error) {
        console.log(
          `[LoRAMergeService] ❌ ${pythonCmd} failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        continue;
      }
    }

    throw new Error(
      `No compatible Python with torch found for LoRA merge operations. ` +
        `Please install torch in your Python environment: ` +
        `"python3 -m pip install torch --break-system-packages" or set up the LoRA training environment.`
    );
  }

  /**
   * Check if local training venv exists (shared with LoRATrainingService)
   */
  private async checkLocalTrainingVenv(): Promise<string | null> {
    try {
      const { promisify } = require("util");
      const execAsync = promisify(require("child_process").exec);
      const fs = require("fs").promises;

      // Get the path to the local training venv - same location as LoRATrainingService uses
      const projectRoot = this.getProjectRoot();
      const venvDir = path.join(projectRoot, "training_venv");

      const venvPaths = [
        // Unix-like systems (macOS, Linux)
        path.join(venvDir, "bin", "python"),
        // Windows
        path.join(venvDir, "Scripts", "python.exe"),
      ];

      for (const venvPath of venvPaths) {
        try {
          console.log(`[LoRAMergeService] Checking venv path: ${venvPath}`);

          // Check if the Python executable exists
          await fs.access(venvPath);

          // Check if torch is installed in this venv (required for merge operations)
          const torchCheck = await execAsync(
            `${venvPath} -c "import torch; print(f'torch:{torch.__version__}')"`
          );

          if (torchCheck.stdout.trim()) {
            console.log(
              `[LoRAMergeService] ✅ Found venv with torch: ${torchCheck.stdout.trim()}`
            );
            return venvPath;
          }
        } catch (error) {
          console.log(
            `[LoRAMergeService] ❌ Venv path failed: ${venvPath} - ${error}`
          );
          continue;
        }
      }

      return null;
    } catch (error) {
      console.log(`[LoRAMergeService] Failed to check local venv: ${error}`);
      return null;
    }
  }
}
